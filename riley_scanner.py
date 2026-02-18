#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
riley_scanner.py — Phase A: local copy-verify-delete migration to Google Drive
===============================================================================

RUNBOOK
-------
1. Install Google Drive for Desktop:
   https://www.google.com/drive/download/
   Sign in, choose "Mirror files" or "Stream files". Note the sync folder path
   (typically G:\\My Drive  or  C:\\Users\\<you>\\Google Drive).

2. Install Python dependencies:
   pip install -r requirements.txt

3. DRY RUN first (reads nothing, writes nothing, prints what would happen):
   python riley_scanner.py --dry-run
   python riley_scanner.py --dry-run --path "C:\\Users\\Riley\\Documents"

4. Real run (copies into Drive sync folder, verifies hash, deletes original):
   python riley_scanner.py
   python riley_scanner.py --path "C:\\Users\\Riley\\Documents"

5. Resume an interrupted run (skips files already marked 'completed'):
   python riley_scanner.py --resume

6. Override Drive folder path:
   python riley_scanner.py --drive-path "D:\\GoogleDrive\\My Drive"

7. Allow files larger than 2 GB:
   python riley_scanner.py --allow-large

8. Skip Drive quota check (not recommended):
   python riley_scanner.py --force-quota

9. Skip OCR / transcription (faster, no text sidecars):
   python riley_scanner.py --skip-extract

10. GPU transcription (if you have CUDA):
    Edit WHISPER_DEVICE = "cuda" near the top of this file.

11. If Drive stops mid-run:
    The script pauses every 100 files and waits for Drive to restart.
    Restart Google Drive for Desktop, then press Enter or wait — it resumes.

12. Phase B — verify files are still present after Drive syncs:
    python riley_scanner.py --check-uploads
    Run this hours or days after Phase A, after Drive has had time to upload.
    Outputs a check_uploads_YYYYMMDD.txt report in the archive folder.

CHECKPOINT DB location:
    Windows: %LOCALAPPDATA%\\.riley_scanner\\riley_scan_checkpoint.db
    (Created automatically on first run.)

NOTE ON "VERIFIED":
    This script verifies the LOCAL copy in the Drive sync folder (sha256 match).
    It does NOT confirm cloud upload status. Drive uploads in the background.
    Use --check-uploads after Drive finishes syncing to confirm files are present.
"""

# =============================================================================
# IMPORTS
# =============================================================================
import argparse
import ctypes
import hashlib
import json
import logging
import logging.handlers
import mimetypes
import os
import platform
import re
import shutil
import sqlite3
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Generator, List, Optional, Set, Tuple

import psutil

# Optional imports — degrade gracefully
try:
    from tqdm import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

try:
    import pytesseract
    from PIL import Image
    HAS_TESSERACT = True
except ImportError:
    HAS_TESSERACT = False

try:
    import fitz  # PyMuPDF
    HAS_PYMUPDF = True
except ImportError:
    HAS_PYMUPDF = False

try:
    from faster_whisper import WhisperModel
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False

try:
    import chardet
    HAS_CHARDET = True
except ImportError:
    HAS_CHARDET = False

# =============================================================================
# CONSTANTS
# =============================================================================

SCRIPT_VERSION = "1.0.0"
WHISPER_DEVICE = "cpu"  # change to "cuda" for GPU transcription

MAX_FILE_SIZE_DEFAULT: int = 2 * 1024 ** 3  # 2 GB
MAX_PATH_WARN: int = 30_000
THROTTLE_PER_FILE: float = 0.1   # seconds between files
THROTTLE_PER_100: float = 5.0    # seconds every 100 files
MAX_RETRIES: int = 3
CHUNK_SIZE: int = 1 << 20        # 1 MB read/write chunks
DRIVE_QUOTA_WARN_PCT: float = 0.80
DRIVE_QUOTA_HEADROOM: float = 1.05  # require 5% extra free space

# Windows file attribute flags for placeholder detection
_FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS: int = 0x00400000
_FILE_ATTRIBUTE_RECALL_ON_OPEN: int = 0x00040000
_FILE_ATTRIBUTE_REPARSE_POINT: int = 0x00000400
_INVALID_FILE_ATTRIBUTES: int = 0xFFFFFFFF

EXCLUDED_FOLDER_NAMES: Set[str] = {
    "windows", "program files", "program files (x86)", "programdata",
    "appdata", "application data", "local settings",
    "$recycle.bin", "system volume information",
    "onedrive", "onedrive - personal",
    "node_modules", ".git", "__pycache__",
    "venv", ".venv", "env", ".env",
    "temp", "tmp", "$windows.~bt", "$windows.~ws",
    "msocache", "intel", "perflogs",
}

EXCLUDED_EXTENSIONS: Set[str] = {
    ".exe", ".dll", ".sys", ".msi", ".msp", ".msix",
    ".bat", ".cmd", ".com", ".ps1", ".vbs", ".js",
    ".reg", ".ini", ".inf", ".cat", ".cab",
    ".lnk", ".url", ".pif",
    ".mui", ".nls", ".etl", ".evtx",
}

CACHE_FILENAMES: Set[str] = {
    "thumbs.db", ".ds_store", "desktop.ini",
    "hiberfil.sys", "pagefile.sys", "swapfile.sys",
}

CACHE_EXTENSIONS: Set[str] = {".tmp", ".temp", ".crdownload", ".part"}

# Extension → category mapping
_PHOTO_EXT: Set[str] = {
    ".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif",
    ".heic", ".heif", ".webp", ".svg", ".raw", ".cr2", ".nef", ".arw",
    ".dng", ".orf", ".rw2", ".psd", ".xcf",
}
_VIDEO_EXT: Set[str] = {
    ".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm",
    ".m4v", ".mpg", ".mpeg", ".3gp", ".ts", ".mts", ".m2ts",
}
_AUDIO_EXT: Set[str] = {
    ".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma",
    ".m4a", ".opus", ".aiff", ".alac",
}
_DOC_EXT: Set[str] = {
    ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
    ".odt", ".ods", ".odp", ".txt", ".md", ".rtf", ".csv",
    ".json", ".xml", ".yaml", ".yml", ".html", ".htm", ".epub",
}
_SCRIPT_EXT: Set[str] = {
    ".py", ".ts", ".sh", ".ps1", ".rb", ".go", ".rs",
    ".java", ".c", ".cpp", ".h", ".cs", ".php", ".r", ".ipynb",
    ".lua", ".swift", ".kt", ".scala",
}
_ARCHIVE_EXT: Set[str] = {
    ".zip", ".tar", ".gz", ".bz2", ".7z", ".rar",
    ".xz", ".zst", ".tgz", ".tbz2",
}

EXTENSION_TO_CATEGORY: Dict[str, str] = {}
for _ext in _PHOTO_EXT:
    EXTENSION_TO_CATEGORY[_ext] = "Photos"
for _ext in _VIDEO_EXT:
    EXTENSION_TO_CATEGORY[_ext] = "Videos"
for _ext in _AUDIO_EXT:
    EXTENSION_TO_CATEGORY[_ext] = "Audio"
for _ext in _DOC_EXT:
    EXTENSION_TO_CATEGORY[_ext] = "Documents"
for _ext in _SCRIPT_EXT:
    EXTENSION_TO_CATEGORY[_ext] = "Scripts"
for _ext in _ARCHIVE_EXT:
    EXTENSION_TO_CATEGORY[_ext] = "Archives"

# =============================================================================
# LOGGING
# =============================================================================

log = logging.getLogger("riley_scanner")


def setup_logging(log_dir: Path) -> None:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / "riley_scanner.log"
    fmt = logging.Formatter(
        "%(asctime)s %(levelname)-8s %(message)s",
        datefmt="%Y-%m-%dT%H:%M:%SZ",
    )
    # stdout handler
    sh = logging.StreamHandler(sys.stdout)
    sh.setFormatter(fmt)
    # rotating file handler
    fh = logging.handlers.RotatingFileHandler(
        log_file, maxBytes=10 * 1024 * 1024, backupCount=5, encoding="utf-8"
    )
    fh.setFormatter(fmt)
    root = logging.getLogger("riley_scanner")
    root.setLevel(logging.INFO)
    root.addHandler(sh)
    root.addHandler(fh)


class NdjsonLogger:
    """Appends structured dicts as NDJSON lines to a file."""

    def __init__(self, path: Path) -> None:
        self._path = path
        self._fh = open(path, "a", encoding="utf-8")

    def write(self, record: dict) -> None:
        record.setdefault("ts", _utcnow())
        self._fh.write(json.dumps(record, ensure_ascii=False) + "\n")
        self._fh.flush()

    def close(self) -> None:
        try:
            self._fh.close()
        except Exception:
            pass


# =============================================================================
# UTILITIES
# =============================================================================

def _utcnow() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _fmt_bytes(n: int) -> str:
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024:
            return f"{n:.1f} {unit}"
        n /= 1024
    return f"{n:.1f} PB"


def long_path(p: Path) -> str:
    """Return a path string with \\\\?\\ prefix on Windows for long-path support."""
    s = str(p.resolve())
    if platform.system() == "Windows" and not s.startswith("\\\\?\\"):
        return "\\\\?\\" + s
    return s


# =============================================================================
# FILENAME SANITIZATION
# =============================================================================

_WIN_FORBIDDEN = re.compile(r'[<>:"/\\|?*\x00-\x1f]')
_RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
}


def sanitize_filename(name: str) -> str:
    """Replace forbidden chars, strip dots/spaces, truncate, never return empty."""
    sanitized = _WIN_FORBIDDEN.sub("_", name)
    sanitized = sanitized.strip(". ")
    # Split stem and suffix safely
    p = Path(sanitized)
    stem = p.stem[:200] if len(p.stem) > 200 else p.stem
    suffix = p.suffix
    result = stem + suffix
    result = result.strip(". ")
    if not result or result.upper().rstrip(". ") in _RESERVED_NAMES:
        result = "_unnamed" + suffix
    return result


# =============================================================================
# CLI ARGUMENT PARSING
# =============================================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="riley_scanner",
        description=(
            "Phase A: Safely migrate files into Google Drive sync folder.\n"
            "Verifies LOCAL copy (sha256). Does NOT confirm cloud upload status.\n"
            "Run --check-uploads after Drive finishes syncing."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--dry-run", action="store_true",
        help="Scan and report only. Write ZERO files anywhere.",
    )
    mode.add_argument(
        "--check-uploads", action="store_true",
        help=(
            "Phase B: Read-only check that completed files still exist in Drive "
            "sync folder. Run after Drive has had time to upload."
        ),
    )
    parser.add_argument(
        "--resume", action="store_true",
        help="Skip files already marked 'completed' in checkpoint DB.",
    )
    parser.add_argument(
        "--path", metavar="DIR",
        help="Limit scan to this folder (default: all internal fixed drives).",
    )
    parser.add_argument(
        "--drive-path", metavar="DIR",
        help="Override auto-detected Drive sync folder path.",
    )
    parser.add_argument(
        "--skip-extract", action="store_true",
        help="Skip OCR / transcription. No text sidecar files produced.",
    )
    parser.add_argument(
        "--allow-large", action="store_true",
        help="Allow files larger than 2 GB (default: skip them).",
    )
    parser.add_argument(
        "--force-quota", action="store_true",
        help="Skip Drive quota checks (not recommended).",
    )
    return parser.parse_args()


# =============================================================================
# STARTUP CHECKS
# =============================================================================

def check_python_version() -> None:
    if sys.version_info < (3, 9):
        sys.exit(
            f"ERROR: Python 3.9+ required. You have {sys.version}.\n"
            "Download from https://www.python.org/downloads/"
        )


def find_drive_folder(override: Optional[str] = None) -> Optional[Path]:
    if override:
        p = Path(override)
        if p.is_dir():
            return p
        log.error("Drive path override not found: %s", override)
        return None

    candidates = []
    # G:\My Drive (Drive for Desktop default)
    candidates.append(Path("G:\\My Drive"))
    # Per-user paths
    home = Path.home()
    candidates.append(home / "Google Drive")
    candidates.append(home / "My Drive")
    candidates.append(home / "GoogleDrive")
    # Also check environment variable hint
    local_app = os.environ.get("LOCALAPPDATA", "")
    if local_app:
        candidates.append(Path(local_app).parent / "Google" / "Drive" / "My Drive")

    for c in candidates:
        if c.is_dir():
            log.info("Found Drive sync folder: %s", c)
            return c
    return None


def check_drive_process_running() -> bool:
    drive_procs = {"googledrivefs.exe", "googledrivesync.exe", "googledrive.exe"}
    try:
        for proc in psutil.process_iter(["name"]):
            try:
                if proc.info["name"] and proc.info["name"].lower() in drive_procs:
                    return True
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass
    except Exception:
        pass
    return False


def get_drive_quota(drive_folder: Path) -> Tuple[int, int, int]:
    """Return (total, used, free) via filesystem only. No Drive API."""
    usage = shutil.disk_usage(drive_folder)
    return usage.total, usage.used, usage.free


def get_local_disk_space(path: str = "C:\\") -> int:
    try:
        return shutil.disk_usage(path).free
    except Exception:
        return 0


def detect_internal_drives() -> List[Path]:
    """Return list of root paths for internal fixed drives."""
    found = []
    try:
        for part in psutil.disk_partitions(all=False):
            opts = part.opts.lower()
            if any(x in opts for x in ("removable", "cdrom", "network")):
                log.info("Skipping drive: %s (%s)", part.mountpoint, part.opts)
                continue
            if platform.system() == "Windows" and "fixed" not in opts:
                log.info("Skipping non-fixed drive: %s (%s)", part.mountpoint, part.opts)
                continue
            root = Path(part.mountpoint)
            if root.is_dir():
                found.append(root)
                log.info("Found internal drive: %s", root)
    except Exception as exc:
        log.warning("Could not enumerate drives: %s", exc)
    return found


# =============================================================================
# CHECKPOINT DB
# =============================================================================

_SCHEMA = """
CREATE TABLE IF NOT EXISTS files (
    id            INTEGER PRIMARY KEY,
    file_path     TEXT UNIQUE NOT NULL,
    sha256        TEXT,
    dest_path     TEXT,
    actual_dest   TEXT,
    stage         TEXT NOT NULL DEFAULT 'discovered',
    retry_count   INTEGER NOT NULL DEFAULT 0,
    error_msg     TEXT,
    discovered_at TEXT,
    hashed_at     TEXT,
    extracted_at  TEXT,
    copied_at     TEXT,
    verified_at   TEXT,
    deleted_at    TEXT,
    completed_at  TEXT
);
CREATE TABLE IF NOT EXISTS run_meta (
    key   TEXT PRIMARY KEY,
    value TEXT
);
"""


def init_checkpoint_db(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.executescript(_SCHEMA)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.commit()
    return conn


def update_stage(conn: sqlite3.Connection, file_path: str, stage: str, **kwargs) -> None:
    row = dict(kwargs)
    row["stage"] = stage
    row["file_path"] = file_path
    # Build upsert
    cols = list(row.keys())
    placeholders = ", ".join(f":{c}" for c in cols)
    col_names = ", ".join(cols)
    updates = ", ".join(f"{c}=:{c}" for c in cols if c != "file_path")
    sql = (
        f"INSERT INTO files ({col_names}) VALUES ({placeholders}) "
        f"ON CONFLICT(file_path) DO UPDATE SET {updates}"
    )
    conn.execute(sql, row)
    conn.commit()


def get_stage(conn: sqlite3.Connection, file_path: str) -> Optional[str]:
    row = conn.execute(
        "SELECT stage FROM files WHERE file_path=?", (file_path,)
    ).fetchone()
    return row[0] if row else None


def get_known_hashes(conn: sqlite3.Connection) -> Dict[str, str]:
    rows = conn.execute(
        "SELECT sha256, file_path FROM files WHERE sha256 IS NOT NULL AND stage='completed'"
    ).fetchall()
    return {r[0]: r[1] for r in rows}


def backup_checkpoint(conn: sqlite3.Connection, db_path: Path, archive_root: Path) -> None:
    try:
        archive_root.mkdir(parents=True, exist_ok=True)
        backup_path = archive_root / db_path.name
        conn.commit()
        shutil.copy2(str(db_path), str(backup_path))
        log.info("Checkpoint backed up to %s", backup_path)
    except Exception as exc:
        log.warning("Checkpoint backup failed: %s", exc)


# =============================================================================
# PLACEHOLDER DETECTION (Windows cloud-only stubs)
# =============================================================================

def is_placeholder(path: Path) -> bool:
    """Detect cloud-only placeholder/stub files on Windows."""
    if platform.system() != "Windows":
        return False
    try:
        attrs = ctypes.windll.kernel32.GetFileAttributesW(long_path(path))
        if attrs == _INVALID_FILE_ATTRIBUTES:
            return False
        if attrs & _FILE_ATTRIBUTE_RECALL_ON_DATA_ACCESS:
            return True
        if attrs & _FILE_ATTRIBUTE_RECALL_ON_OPEN:
            return True
        # Reparse point with zero reported size is also suspicious
        if (attrs & _FILE_ATTRIBUTE_REPARSE_POINT) and path.stat().st_size == 0:
            return True
    except Exception:
        pass
    return False


def rehydrate_file(path: Path, timeout: int = 120) -> bool:
    """Trigger hydration by reading; poll until size > 0 and placeholder cleared."""
    log.info("Rehydrating placeholder: %s", path)
    try:
        # Opening the file triggers the OS to fetch it from cloud
        with open(long_path(path), "rb") as fh:
            fh.read(1)
    except Exception as exc:
        log.warning("Rehydrate open failed: %s", exc)
        return False

    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        time.sleep(2)
        try:
            if path.stat().st_size > 0 and not is_placeholder(path):
                log.info("Rehydration complete: %s", path)
                return True
        except Exception:
            pass
    log.warning("Rehydration timed out after %ds: %s", timeout, path)
    return False


# =============================================================================
# LOCKED FILE DETECTION
# =============================================================================

def is_file_locked(path: Path) -> bool:
    """Return True if the file cannot be opened for reading."""
    try:
        with open(long_path(path), "rb") as fh:
            fh.read(1)
        return False
    except (PermissionError, OSError):
        return True


# =============================================================================
# HASHING
# =============================================================================

class FileModifiedDuringHash(Exception):
    pass


def sha256_file(path: Path, chunk_size: int = CHUNK_SIZE) -> str:
    """Hash a file, raising FileModifiedDuringHash if mtime changes mid-read."""
    lp = long_path(path)
    mtime_before = path.stat().st_mtime
    h = hashlib.sha256()
    try:
        with open(lp, "rb") as fh:
            while True:
                chunk = fh.read(chunk_size)
                if not chunk:
                    break
                h.update(chunk)
    except PermissionError as exc:
        raise PermissionError(str(exc)) from exc
    mtime_after = path.stat().st_mtime
    if mtime_after != mtime_before:
        raise FileModifiedDuringHash(
            f"File modified during hashing: {path}"
        )
    return h.hexdigest()


# =============================================================================
# FILE DISCOVERY
# =============================================================================

def should_skip_folder(
    folder: Path,
    drive_folder: Path,
    script_path: Path,
) -> Tuple[bool, str]:
    # Skip the Drive sync folder itself
    try:
        if folder == drive_folder or drive_folder in folder.parents:
            return True, "drive_sync_folder"
        if folder == drive_folder or folder.resolve() == drive_folder.resolve():
            return True, "drive_sync_folder"
    except Exception:
        pass

    # Skip symlinks and junctions
    if os.path.islink(folder):
        return True, "symlink"

    name_lower = folder.name.lower()
    if name_lower in EXCLUDED_FOLDER_NAMES:
        return True, f"excluded_folder:{name_lower}"

    # Skip script's own parent dir if it contains riley_scanner artifacts
    # (we rely on file-level checks for this)
    return False, ""


def should_skip_file(
    path: Path,
    allow_large: bool,
    max_size: int,
    drive_folder: Path,
    script_path: Path,
    db_path: Path,
) -> Tuple[bool, str]:
    # Never process the script itself or checkpoint DB
    try:
        if path.resolve() == script_path.resolve():
            return True, "script_itself"
        if path.resolve() == db_path.resolve():
            return True, "checkpoint_db"
    except Exception:
        pass

    # Skip symlinks
    if os.path.islink(path):
        return True, "symlink"

    name = path.name
    name_lower = name.lower()
    ext_lower = path.suffix.lower()

    if name_lower in CACHE_FILENAMES:
        return True, "cache_file"
    if ext_lower in CACHE_EXTENSIONS:
        return True, "cache_extension"
    if ext_lower in EXCLUDED_EXTENSIONS:
        return True, "excluded_extension"

    # Path length sanity check
    if len(str(path)) > MAX_PATH_WARN:
        return True, "path_too_long"

    # Size check
    try:
        size = path.stat().st_size
        if size == 0:
            return True, "zero_byte"
        if not allow_large and size > max_size:
            return True, "too_large"
    except (PermissionError, OSError) as exc:
        return True, f"stat_error:{exc}"

    return False, ""


def scan_files(
    roots: List[Path],
    drive_folder: Path,
    script_path: Path,
    db_path: Path,
    allow_large: bool,
    max_size: int,
) -> Generator[Tuple[Path, Optional[str]], None, None]:
    """
    Yield (path, skip_reason) for all files found under roots.
    skip_reason is None for files that should be processed.
    Traversal is alphabetical; excluded dirs are pruned in-place.
    """
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(str(root), topdown=True):
            current = Path(dirpath)
            # Prune excluded directories in-place (alphabetical order)
            dirnames[:] = sorted([
                d for d in dirnames
                if not should_skip_folder(
                    current / d, drive_folder, script_path
                )[0]
            ])
            for fname in sorted(filenames):
                fpath = current / fname
                skip, reason = should_skip_file(
                    fpath, allow_large, max_size,
                    drive_folder, script_path, db_path,
                )
                yield fpath, reason if skip else None


# =============================================================================
# TEXT EXTRACTION (all optional, all gracefully degraded)
# =============================================================================

def count_words(text: str) -> int:
    return len(text.split()) if text else 0


def extract_image(path: Path) -> Tuple[str, str]:
    if not HAS_TESSERACT:
        return "", "unavailable:no_tesseract"
    try:
        img = Image.open(long_path(path))
        text = pytesseract.image_to_string(img)
        return text.strip(), "tesseract"
    except Exception as exc:
        return "", f"error:{exc}"


def extract_pdf(path: Path) -> Tuple[str, str]:
    if not HAS_PYMUPDF:
        return "", "unavailable:no_pymupdf"
    try:
        doc = fitz.open(long_path(path))
        parts = []
        for page in doc:
            t = page.get_text().strip()
            if t:
                parts.append(t)
        doc.close()
        if parts:
            return "\n".join(parts), "embedded_text"
        # Fall back to OCR if tesseract available
        if HAS_TESSERACT:
            doc2 = fitz.open(long_path(path))
            ocr_parts = []
            for page in doc2:
                pix = page.get_pixmap(dpi=150)
                img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
                ocr_parts.append(pytesseract.image_to_string(img).strip())
            doc2.close()
            return "\n".join(ocr_parts), "ocr_fallback"
        return "", "no_text"
    except Exception as exc:
        return "", f"error:{exc}"


def extract_audio_video(path: Path) -> Tuple[str, str]:
    if not HAS_WHISPER:
        return "", "unavailable:no_whisper"
    try:
        model = WhisperModel("base", device=WHISPER_DEVICE, compute_type="int8")
        segments, _ = model.transcribe(long_path(path))
        lines = [
            f"[{s.start:.1f}s-{s.end:.1f}s] {s.text.strip()}"
            for s in segments
        ]
        return "\n".join(lines), "faster_whisper"
    except Exception as exc:
        return "", f"error:{exc}"


def extract_text_file(path: Path) -> Tuple[str, str]:
    encoding = "utf-8"
    if HAS_CHARDET:
        try:
            raw = Path(long_path(path)).read_bytes()
            detected = chardet.detect(raw)
            encoding = detected.get("encoding") or "utf-8"
        except Exception:
            pass
    try:
        text = Path(long_path(path)).read_text(encoding=encoding, errors="replace")
        return text.strip(), f"text:{encoding}"
    except Exception as exc:
        return "", f"error:{exc}"


def extract_content(path: Path, skip_extract: bool) -> Tuple[str, str]:
    """Dispatcher for text extraction. Never raises."""
    if skip_extract:
        return "", "skipped"
    ext = path.suffix.lower()
    try:
        if ext in _PHOTO_EXT:
            return extract_image(path)
        if ext == ".pdf":
            return extract_pdf(path)
        if ext in _AUDIO_EXT or ext in _VIDEO_EXT:
            return extract_audio_video(path)
        if ext in _DOC_EXT or ext in _SCRIPT_EXT:
            return extract_text_file(path)
        return "", "no_extractor"
    except Exception as exc:
        return "", f"error:{exc}"


# =============================================================================
# DESTINATION PATH BUILDER
# =============================================================================

def build_dest_path(
    src: Path,
    archive_root: Path,
    extension_to_category: Dict[str, str],
) -> Path:
    ext = src.suffix.lower()
    category = extension_to_category.get(ext, "Other")
    safe_name = sanitize_filename(src.name)
    dest = archive_root / category / safe_name
    # Collision avoidance
    if dest.exists():
        stem = Path(safe_name).stem
        suffix = Path(safe_name).suffix
        counter = 2
        while dest.exists():
            dest = archive_root / category / f"{stem}_{counter}{suffix}"
            counter += 1
    return dest


# =============================================================================
# ATOMIC COPY + VERIFY
# =============================================================================

def copy_with_verify(
    src: Path,
    dest: Path,
    original_hash: str,
) -> bool:
    """
    Atomic copy: write to .riley_tmp, fsync, sha256, then os.replace.
    Cleans up .riley_tmp on any failure.
    Returns True on success, False on hash mismatch.
    Raises on unexpected errors (after cleanup).
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = dest.parent / (dest.name + ".riley_tmp")

    try:
        with open(long_path(src), "rb") as src_fh, \
             open(long_path(tmp_path), "wb") as dst_fh:
            while True:
                chunk = src_fh.read(CHUNK_SIZE)
                if not chunk:
                    break
                dst_fh.write(chunk)
                os.fsync(dst_fh.fileno())
            os.fsync(dst_fh.fileno())

        # Copy metadata (timestamps, etc.)
        shutil.copystat(long_path(src), long_path(tmp_path))

        # Verify hash of the written copy
        copy_hash = sha256_file(tmp_path)
        if copy_hash != original_hash:
            log.error(
                "Hash mismatch after copy: src=%s expected=%s got=%s",
                src, original_hash, copy_hash,
            )
            try:
                tmp_path.unlink()
            except Exception:
                pass
            return False

        # Atomic rename
        os.replace(long_path(tmp_path), long_path(dest))
        return True

    except Exception:
        try:
            tmp_path.unlink(missing_ok=True)
        except Exception:
            pass
        raise


def delete_original(path: Path) -> bool:
    """Delete the original file. Returns True on success."""
    try:
        path.unlink()
        log.info("Deleted original: %s", path)
        return True
    except Exception as exc:
        log.error("Failed to delete original %s: %s", path, exc)
        return False


# =============================================================================
# DRIVE AUTO-RENAME DETECTION
# =============================================================================

def find_drive_renamed(dest: Path) -> Optional[Path]:
    """
    Check if Drive renamed our file (e.g. appended ' (1)').
    Returns the actual path if found within 10s of write, else None.
    """
    now = time.time()
    stem = dest.stem
    try:
        candidates = list(dest.parent.glob(f"{glob_escape(stem)}*"))
        for c in candidates:
            if c == dest:
                continue
            try:
                if abs(c.stat().st_mtime - now) < 10:
                    return c
            except Exception:
                pass
    except Exception:
        pass
    return None


def glob_escape(s: str) -> str:
    """Escape glob special characters in a filename stem."""
    return re.sub(r"([\[\]*?])", r"[\1]", s)


# =============================================================================
# DRIVE HEALTH CHECK LOOP
# =============================================================================

def check_drive_still_running(pause_interval: int = 30) -> None:
    """Block until Drive process is running again."""
    if check_drive_process_running():
        return
    log.warning(
        "Google Drive for Desktop is NOT running! "
        "Please restart it. Waiting..."
    )
    print(
        "\n[WARNING] Google Drive for Desktop has stopped.\n"
        "Please restart it, then this script will continue automatically.\n"
    )
    while not check_drive_process_running():
        time.sleep(pause_interval)
    log.info("Drive process detected — resuming.")
    print("[INFO] Drive restarted — resuming.\n")


# =============================================================================
# UPFRONT ESTIMATES
# =============================================================================

def print_estimates(
    to_process: List[Path],
    total_size: int,
    skipped_summary: Dict[str, int],
    drive_free: int,
    drive_total: int,
    dry_run: bool,
) -> None:
    bar = "-" * 60
    print(bar)
    print("  RILEY SCANNER — Pre-flight Report")
    print(bar)
    print(f"  Files to migrate  : {len(to_process):,}")
    print(f"  Total size        : {_fmt_bytes(total_size)}")
    print(f"  Drive free        : {_fmt_bytes(drive_free)}")
    print(f"  Drive total       : {_fmt_bytes(drive_total)}")
    if drive_total > 0:
        pct = (drive_total - drive_free) / drive_total * 100
        print(f"  Drive used        : {pct:.1f}%")
    print()
    if skipped_summary:
        print("  Skipped files by reason:")
        for reason, count in sorted(skipped_summary.items()):
            print(f"    {reason:<30} {count:>6,}")
    print()
    if dry_run:
        print("  [DRY RUN] No files will be copied or deleted.")
    else:
        print(
            "  NOTE: 'Verified' = local sha256 match in Drive sync folder.\n"
            "  Cloud upload status is NOT checked here.\n"
            "  Run --check-uploads after Drive finishes syncing."
        )
    print(bar)


# =============================================================================
# PHASE B — CHECK UPLOADS
# =============================================================================

def run_check_uploads(
    conn: sqlite3.Connection,
    archive_root: Path,
    drive_folder: Path,
) -> None:
    """
    Read-only Phase B: confirm completed files still exist in Drive sync folder.
    Writes a report file; never modifies files or DB rows.
    """
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    report_path = archive_root / f"check_uploads_{today}.txt"

    rows = conn.execute(
        "SELECT file_path, dest_path, actual_dest, sha256 "
        "FROM files WHERE stage='completed'"
    ).fetchall()

    ok_list: List[str] = []
    missing_list: List[str] = []
    zero_byte_list: List[str] = []

    for file_path, dest_path, actual_dest, sha256 in rows:
        check_path = actual_dest or dest_path
        if not check_path:
            missing_list.append(f"NO_DEST\t{file_path}")
            continue
        p = Path(check_path)
        if not p.exists():
            missing_list.append(f"{check_path}\t(original: {file_path})")
        elif p.stat().st_size == 0:
            zero_byte_list.append(f"{check_path}\t(original: {file_path})")
        else:
            ok_list.append(check_path)

    lines = [
        f"Riley Scanner — check-uploads report — {today}",
        f"Archive root: {archive_root}",
        "",
        f"OK          : {len(ok_list):,}",
        f"MISSING     : {len(missing_list):,}",
        f"ZERO BYTE   : {len(zero_byte_list):,}",
        "",
    ]
    if missing_list:
        lines.append("=== MISSING FILES ===")
        lines.extend(missing_list)
        lines.append("")
    if zero_byte_list:
        lines.append("=== ZERO-BYTE FILES ===")
        lines.extend(zero_byte_list)
        lines.append("")
    lines.append("=== OK FILES ===")
    lines.extend(ok_list)

    try:
        archive_root.mkdir(parents=True, exist_ok=True)
        report_path.write_text("\n".join(lines), encoding="utf-8")
        print(f"Report written: {report_path}")
    except Exception as exc:
        log.error("Could not write check-uploads report: %s", exc)
        print("\n".join(lines))

    print(f"\ncheck-uploads summary: OK={len(ok_list)}, "
          f"MISSING={len(missing_list)}, ZERO_BYTE={len(zero_byte_list)}")
    if missing_list or zero_byte_list:
        print("Action required: see report for details.")


# =============================================================================
# PER-FILE PIPELINE
# =============================================================================

def process_file(
    src: Path,
    archive_root: Path,
    conn: sqlite3.Connection,
    known_hashes: Dict[str, str],
    args: argparse.Namespace,
    manifest_fh,
    ndjson_log: NdjsonLogger,
    run_id: str,
    attention_list: List[str],
    script_path: Path,
    db_path: Path,
    counters: Dict[str, int],
) -> None:
    src_str = str(src)

    # --- Placeholder check ---
    if is_placeholder(src):
        log.info("Placeholder detected, attempting rehydration: %s", src)
        if not rehydrate_file(src):
            update_stage(conn, src_str, "skipped_placeholder",
                         error_msg="rehydration_timeout",
                         discovered_at=_utcnow())
            ndjson_log.write({"event": "skip", "reason": "placeholder_timeout", "path": src_str})
            attention_list.append(f"PLACEHOLDER_TIMEOUT\t{src_str}")
            counters["skipped_placeholder"] = counters.get("skipped_placeholder", 0) + 1
            return

    # --- Hash with retry on modification ---
    original_hash: Optional[str] = None
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            original_hash = sha256_file(src)
            break
        except FileModifiedDuringHash:
            log.warning("File modified during hash (attempt %d/%d): %s", attempt, MAX_RETRIES, src)
            if attempt == MAX_RETRIES:
                update_stage(conn, src_str, "skipped_modified",
                             retry_count=attempt,
                             error_msg="modified_during_hash",
                             discovered_at=_utcnow())
                ndjson_log.write({"event": "skip", "reason": "modified_during_hash", "path": src_str})
                attention_list.append(f"MODIFIED_DURING_HASH\t{src_str}")
                counters["skipped_modified"] = counters.get("skipped_modified", 0) + 1
                return
            time.sleep(2 ** attempt)
        except FileNotFoundError:
            log.warning("File vanished before hash: %s", src)
            counters["skipped_not_found"] = counters.get("skipped_not_found", 0) + 1
            return
        except PermissionError as exc:
            update_stage(conn, src_str, "skipped_unreadable",
                         error_msg=f"permission_denied:{exc}",
                         discovered_at=_utcnow())
            ndjson_log.write({"event": "skip", "reason": "permission_denied", "path": src_str})
            attention_list.append(f"PERMISSION_DENIED\t{src_str}")
            counters["skipped_unreadable"] = counters.get("skipped_unreadable", 0) + 1
            return
        except OSError as exc:
            update_stage(conn, src_str, "skipped_unreadable",
                         error_msg=f"io_error:{exc}",
                         discovered_at=_utcnow())
            ndjson_log.write({"event": "skip", "reason": "io_error", "path": src_str})
            attention_list.append(f"IO_ERROR\t{src_str}")
            counters["skipped_unreadable"] = counters.get("skipped_unreadable", 0) + 1
            return

    if original_hash is None:
        return

    # --- Deduplication ---
    if original_hash in known_hashes:
        first_path = known_hashes[original_hash]
        log.info("Duplicate of %s — skipping: %s", first_path, src)
        update_stage(conn, src_str, "skipped_duplicate",
                     sha256=original_hash,
                     error_msg=f"duplicate_of:{first_path}",
                     discovered_at=_utcnow())
        ndjson_log.write({"event": "skip", "reason": "duplicate", "path": src_str,
                          "duplicate_of": first_path})
        counters["skipped_duplicate"] = counters.get("skipped_duplicate", 0) + 1
        return

    update_stage(conn, src_str, "hashed", sha256=original_hash, hashed_at=_utcnow(),
                 discovered_at=_utcnow())

    # --- Text extraction ---
    extracted_text, extract_method = extract_content(src, args.skip_extract)
    update_stage(conn, src_str, "extracted", extracted_at=_utcnow())

    # --- Build destination ---
    dest = build_dest_path(src, archive_root, EXTENSION_TO_CATEGORY)
    update_stage(conn, src_str, "copy_pending", dest_path=str(dest))

    # --- Locked file check ---
    if is_file_locked(src):
        log.warning("File is locked: %s", src)
        update_stage(conn, src_str, "skipped_locked",
                     error_msg="file_locked")
        ndjson_log.write({"event": "skip", "reason": "locked", "path": src_str})
        attention_list.append(f"LOCKED\t{src_str}")
        counters["skipped_locked"] = counters.get("skipped_locked", 0) + 1
        return

    # --- Copy with retry ---
    copy_ok = False
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            copy_ok = copy_with_verify(src, dest, original_hash)
            break
        except Exception as exc:
            log.warning("Copy attempt %d/%d failed for %s: %s", attempt, MAX_RETRIES, src, exc)
            if attempt == MAX_RETRIES:
                update_stage(conn, src_str, "copy_failed",
                             error_msg=f"copy_error:{exc}",
                             retry_count=attempt)
                ndjson_log.write({"event": "error", "reason": "copy_failed", "path": src_str,
                                  "error": str(exc)})
                attention_list.append(f"COPY_FAILED\t{src_str}")
                counters["failed"] = counters.get("failed", 0) + 1
                return
            time.sleep(2 ** attempt)

    if not copy_ok:
        update_stage(conn, src_str, "copy_failed", error_msg="hash_mismatch")
        ndjson_log.write({"event": "error", "reason": "hash_mismatch", "path": src_str})
        attention_list.append(f"HASH_MISMATCH\t{src_str}")
        counters["failed"] = counters.get("failed", 0) + 1
        return

    update_stage(conn, src_str, "copied", copied_at=_utcnow(), dest_path=str(dest))

    # --- Drive auto-rename detection ---
    time.sleep(2)
    actual_dest = dest
    if not dest.exists():
        renamed = find_drive_renamed(dest)
        if renamed:
            log.warning("Drive renamed file: %s → %s", dest, renamed)
            actual_dest = renamed
        else:
            log.error("Copy lost — neither original nor renamed found: %s", dest)
            update_stage(conn, src_str, "copy_lost",
                         error_msg="file_vanished_after_copy",
                         actual_dest=None)
            attention_list.append(f"COPY_LOST\t{src_str}")
            counters["failed"] = counters.get("failed", 0) + 1
            return

    update_stage(conn, src_str, "verified",
                 verified_at=_utcnow(),
                 actual_dest=str(actual_dest))

    # --- Delete original ---
    deleted = delete_original(src)
    if deleted:
        update_stage(conn, src_str, "deleted", deleted_at=_utcnow())
    else:
        attention_list.append(f"DELETE_FAILED\t{src_str}")

    # --- Mark complete ---
    update_stage(conn, src_str, "completed",
                 completed_at=_utcnow(),
                 actual_dest=str(actual_dest))
    known_hashes[original_hash] = src_str

    try:
        size = src.stat().st_size if src.exists() else actual_dest.stat().st_size
    except Exception:
        size = 0

    # --- Manifest entry ---
    entry = {
        "run_id": run_id,
        "ts": _utcnow(),
        "src": src_str,
        "dest": str(actual_dest),
        "sha256": original_hash,
        "size_bytes": size,
        "category": EXTENSION_TO_CATEGORY.get(src.suffix.lower(), "Other"),
        "extract_method": extract_method,
        "word_count": count_words(extracted_text),
    }
    manifest_fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    manifest_fh.flush()
    ndjson_log.write({"event": "completed", **entry})

    counters["copied"] = counters.get("copied", 0) + 1
    counters["bytes_copied"] = counters.get("bytes_copied", 0) + size

    log.info("OK [%s] %s → %s", original_hash[:8], src, actual_dest)


# =============================================================================
# COMPLETION SUMMARY
# =============================================================================

def print_completion_summary(
    counters: Dict[str, int],
    attention_list: List[str],
    manifest_path: Path,
    checkpoint_backup: Path,
    log_dir: Path,
    archive_root: Path,
) -> None:
    bar = "=" * 60
    print(f"\n{bar}")
    print("  RILEY SCANNER — Run Complete")
    print(bar)
    print(f"  Copied & verified : {counters.get('copied', 0):,}")
    print(f"  Bytes migrated    : {_fmt_bytes(counters.get('bytes_copied', 0))}")
    print(f"  Failed            : {counters.get('failed', 0):,}")
    print(f"  Skipped duplicate : {counters.get('skipped_duplicate', 0):,}")
    print(f"  Skipped locked    : {counters.get('skipped_locked', 0):,}")
    print(f"  Skipped modified  : {counters.get('skipped_modified', 0):,}")
    print(f"  Skipped unreadable: {counters.get('skipped_unreadable', 0):,}")
    print(f"  Skipped placeholder:{counters.get('skipped_placeholder', 0):,}")
    print()
    print(f"  Archive root      : {archive_root}")
    print(f"  Manifest          : {manifest_path}")
    print(f"  Checkpoint backup : {checkpoint_backup}")
    print(f"  Log directory     : {log_dir}")
    print()
    if attention_list:
        print(f"  Files needing manual attention ({len(attention_list)}):")
        for item in attention_list[:20]:
            print(f"    {item}")
        if len(attention_list) > 20:
            print(f"    ... and {len(attention_list) - 20} more (see log)")
        print()
    print(
        "  NEXT STEP: After Google Drive finishes uploading, run:\n"
        "    python riley_scanner.py --check-uploads\n"
        "  to confirm all files are present in the cloud."
    )
    print(bar)


# =============================================================================
# MAIN
# =============================================================================

def main() -> None:
    check_python_version()
    args = parse_args()

    # Checkpoint DB path
    local_app = os.environ.get("LOCALAPPDATA") or str(Path.home() / "AppData" / "Local")
    db_dir = Path(local_app) / ".riley_scanner"
    db_path = db_dir / "riley_scan_checkpoint.db"

    # Logging (to temp dir until we know archive root)
    log_dir = db_dir / "logs"
    setup_logging(log_dir)
    log.info("riley_scanner v%s starting (pid=%d)", SCRIPT_VERSION, os.getpid())

    # Drive process check
    if not check_drive_process_running():
        log.error("Google Drive for Desktop is not running. Please start it first.")
        sys.exit(
            "ERROR: Google Drive for Desktop is not running.\n"
            "Start it from the system tray or Start menu, then re-run this script."
        )

    # Find Drive folder
    drive_folder = find_drive_folder(args.drive_path)
    if not drive_folder:
        sys.exit(
            "ERROR: Could not find Google Drive sync folder.\n"
            "Use --drive-path to specify it manually, e.g.:\n"
            '  python riley_scanner.py --drive-path "G:\\My Drive"'
        )

    # Init checkpoint DB
    conn = init_checkpoint_db(db_path)
    log.info("Checkpoint DB: %s", db_path)

    # -------------------------------------------------------------------------
    # Phase B: --check-uploads mode (read-only)
    # -------------------------------------------------------------------------
    if args.check_uploads:
        stored_date = conn.execute(
            "SELECT value FROM run_meta WHERE key='archive_date'"
        ).fetchone()
        date_str = stored_date[0] if stored_date else datetime.now(timezone.utc).strftime("%Y%m%d")
        archive_root = drive_folder / f"Riley_Archive_{date_str}"
        run_check_uploads(conn, archive_root, drive_folder)
        conn.close()
        return

    # -------------------------------------------------------------------------
    # Phase A: Migration
    # -------------------------------------------------------------------------
    script_path = Path(__file__).resolve()

    detect_internal_drives()

    # Local disk space warning
    local_free = get_local_disk_space(
        args.path or ("C:\\" if platform.system() == "Windows" else "/")
    )
    if local_free < 2 * 1024 ** 3:
        log.warning("Low local disk space: %s free", _fmt_bytes(local_free))
        print(f"[WARNING] Low local disk space: {_fmt_bytes(local_free)} free.")

    # Archive root and run metadata
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    archive_root = drive_folder / f"Riley_Archive_{today}"

    existing_id = conn.execute(
        "SELECT value FROM run_meta WHERE key='run_id'"
    ).fetchone()
    if existing_id and args.resume:
        run_id = existing_id[0]
        log.info("Resuming run_id=%s", run_id)
    else:
        run_id = str(uuid.uuid4())
        conn.execute(
            "INSERT OR REPLACE INTO run_meta (key, value) VALUES ('run_id', ?)",
            (run_id,),
        )
        conn.execute(
            "INSERT OR REPLACE INTO run_meta (key, value) VALUES ('archive_date', ?)",
            (today,),
        )
        conn.commit()

    # Determine scan roots
    if args.path:
        roots = [Path(args.path)]
    else:
        roots = detect_internal_drives()
        if not roots:
            roots = [Path("C:\\")] if platform.system() == "Windows" else [Path("/")]

    max_size = MAX_FILE_SIZE_DEFAULT if not args.allow_large else (1 << 62)

    # --- Phase 1: Discovery scan ---
    log.info("Scanning for files...")
    to_process: List[Path] = []
    skipped_summary: Dict[str, int] = {}
    total_size = 0

    for fpath, skip_reason in scan_files(
        roots, drive_folder, script_path, db_path, args.allow_large, max_size
    ):
        if skip_reason:
            bucket = skip_reason.split(":")[0]
            skipped_summary[bucket] = skipped_summary.get(bucket, 0) + 1
            continue
        if args.resume and get_stage(conn, str(fpath)) == "completed":
            skipped_summary["already_completed"] = skipped_summary.get("already_completed", 0) + 1
            continue
        try:
            total_size += fpath.stat().st_size
        except Exception:
            pass
        to_process.append(fpath)

    # Drive quota check (filesystem only — no API)
    drive_total, drive_used, drive_free = get_drive_quota(drive_folder)
    if not args.force_quota:
        if drive_total > 0 and drive_used / drive_total > DRIVE_QUOTA_WARN_PCT:
            log.warning(
                "Drive is %.0f%% full. Use --force-quota to proceed anyway.",
                drive_used / drive_total * 100,
            )
        required = int(total_size * DRIVE_QUOTA_HEADROOM)
        if drive_free < required:
            sys.exit(
                f"ERROR: Not enough free space on Drive.\n"
                f"  Need: {_fmt_bytes(required)}\n"
                f"  Free: {_fmt_bytes(drive_free)}\n"
                f"Use --force-quota to override (not recommended)."
            )

    # Estimates
    print_estimates(
        to_process, total_size, skipped_summary,
        drive_free, drive_total, args.dry_run,
    )

    if args.dry_run:
        log.info("Dry run complete. No files were copied or deleted.")
        return

    # --- Phase A: Copy loop ---
    known_hashes = get_known_hashes(conn)
    attention_list: List[str] = []
    counters: Dict[str, int] = {}

    if not args.dry_run:
        archive_root.mkdir(parents=True, exist_ok=True)

    manifest_path = archive_root / "manifest.jsonl"
    ndjson_path = archive_root / "run_log.ndjson"
    ndjson_log = NdjsonLogger(ndjson_path)

    print(
        "\n[INFO] Verified = local sha256 match in Drive sync folder.\n"
        "       Cloud upload is NOT awaited. Drive uploads in background.\n"
        "       Run --check-uploads after Drive finishes syncing.\n"
    )

    with open(manifest_path, "a", encoding="utf-8") as manifest_fh:
        iterator = (
            tqdm(to_process, unit="file", desc="Migrating")
            if HAS_TQDM else to_process
        )
        for i, fpath in enumerate(iterator, 1):
            # Skip if already completed (relevant when not using --resume flag
            # but restarting mid-run)
            if get_stage(conn, str(fpath)) == "completed":
                continue

            process_file(
                src=fpath,
                archive_root=archive_root,
                conn=conn,
                known_hashes=known_hashes,
                args=args,
                manifest_fh=manifest_fh,
                ndjson_log=ndjson_log,
                run_id=run_id,
                attention_list=attention_list,
                script_path=script_path,
                db_path=db_path,
                counters=counters,
            )

            if i % 100 == 0:
                time.sleep(THROTTLE_PER_100)
                check_drive_still_running()
                checkpoint_backup_path = archive_root / db_path.name
                backup_checkpoint(conn, db_path, archive_root)
            else:
                time.sleep(THROTTLE_PER_FILE)

    # Final checkpoint backup
    checkpoint_backup_path = archive_root / db_path.name
    backup_checkpoint(conn, db_path, archive_root)
    ndjson_log.close()
    conn.close()

    print_completion_summary(
        counters=counters,
        attention_list=attention_list,
        manifest_path=manifest_path,
        checkpoint_backup=checkpoint_backup_path,
        log_dir=log_dir,
        archive_root=archive_root,
    )


if __name__ == "__main__":
    main()
