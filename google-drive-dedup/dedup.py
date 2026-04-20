#!/usr/bin/env python3
"""
Google Drive Deduplication Script
==================================
A free-to-use script that finds and removes duplicate files in your Google Drive.

Usage:
    python dedup.py [--dry-run] [--folder FOLDER_ID] [--keep oldest|newest]

Requirements:
    pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client

Setup:
    1. Go to https://console.cloud.google.com/
    2. Create a new project (or select existing)
    3. Enable the Google Drive API
    4. Create OAuth 2.0 credentials (Desktop application)
    5. Download credentials.json to this directory
    6. Run the script - it will open a browser for authentication

License: MIT - Free to use, modify, and distribute
"""

import os
import sys
import json
import argparse
import pickle
from collections import defaultdict
from datetime import datetime
from pathlib import Path

try:
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow
    from googleapiclient.discovery import build
    from googleapiclient.errors import HttpError
except ImportError:
    print("Required packages not installed. Run:")
    print("  pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client")
    sys.exit(1)

# If modifying these scopes, delete the token.pickle file
SCOPES = ['https://www.googleapis.com/auth/drive']

# Files to exclude from deduplication (Google Workspace files don't have md5)
EXCLUDED_MIMETYPES = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.spreadsheet',
    'application/vnd.google-apps.presentation',
    'application/vnd.google-apps.form',
    'application/vnd.google-apps.drawing',
    'application/vnd.google-apps.site',
    'application/vnd.google-apps.folder',
    'application/vnd.google-apps.shortcut',
]


def get_credentials():
    """Get valid user credentials from storage or initiate OAuth2 flow."""
    creds = None
    token_path = Path(__file__).parent / 'token.pickle'
    credentials_path = Path(__file__).parent / 'credentials.json'

    # Load existing token if available
    if token_path.exists():
        with open(token_path, 'rb') as token:
            creds = pickle.load(token)

    # If no valid credentials, let user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            print("Refreshing expired credentials...")
            creds.refresh(Request())
        else:
            if not credentials_path.exists():
                print("\nError: credentials.json not found!")
                print("\nTo set up Google Drive API access:")
                print("1. Go to https://console.cloud.google.com/")
                print("2. Create a new project (or select existing)")
                print("3. Go to 'APIs & Services' > 'Library'")
                print("4. Search for 'Google Drive API' and enable it")
                print("5. Go to 'APIs & Services' > 'Credentials'")
                print("6. Click 'Create Credentials' > 'OAuth client ID'")
                print("7. Select 'Desktop application'")
                print("8. Download the JSON file and save it as 'credentials.json' in this directory")
                sys.exit(1)

            print("Opening browser for authentication...")
            flow = InstalledAppFlow.from_client_secrets_file(credentials_path, SCOPES)
            creds = flow.run_local_server(port=0)

        # Save credentials for next run
        with open(token_path, 'wb') as token:
            pickle.dump(creds, token)
        print("Credentials saved for future use.")

    return creds


def get_all_files(service, folder_id=None, show_progress=True):
    """Retrieve all files from Google Drive with their metadata."""
    files = []
    page_token = None
    count = 0

    # Build query
    query_parts = []
    for mimetype in EXCLUDED_MIMETYPES:
        query_parts.append(f"mimeType != '{mimetype}'")
    query = ' and '.join(query_parts)
    query += " and trashed = false"

    if folder_id:
        query += f" and '{folder_id}' in parents"

    print("\nScanning Google Drive for files...")

    while True:
        try:
            results = service.files().list(
                q=query,
                spaces='drive',
                fields='nextPageToken, files(id, name, size, md5Checksum, createdTime, modifiedTime, parents, mimeType)',
                pageToken=page_token,
                pageSize=1000,
                supportsAllDrives=True,
                includeItemsFromAllDrives=True
            ).execute()

            batch = results.get('files', [])
            files.extend(batch)
            count += len(batch)

            if show_progress:
                print(f"  Found {count} files...", end='\r')

            page_token = results.get('nextPageToken')
            if not page_token:
                break

        except HttpError as error:
            print(f"\nError retrieving files: {error}")
            break

    if show_progress:
        print(f"  Found {count} files total.     ")

    return files


def get_folder_path(service, file_id, cache=None):
    """Get the full folder path for a file."""
    if cache is None:
        cache = {}

    if file_id in cache:
        return cache[file_id]

    try:
        file = service.files().get(
            fileId=file_id,
            fields='name, parents'
        ).execute()

        name = file.get('name', '')
        parents = file.get('parents', [])

        if parents:
            parent_path = get_folder_path(service, parents[0], cache)
            path = f"{parent_path}/{name}" if parent_path else name
        else:
            path = name

        cache[file_id] = path
        return path

    except HttpError:
        return ""


def find_duplicates(files):
    """Find duplicate files based on MD5 checksum."""
    # Group files by MD5 checksum
    by_hash = defaultdict(list)
    skipped = 0

    for file in files:
        md5 = file.get('md5Checksum')
        if md5:
            by_hash[md5].append(file)
        else:
            skipped += 1

    # Filter to only groups with duplicates
    duplicates = {k: v for k, v in by_hash.items() if len(v) > 1}

    return duplicates, skipped


def format_size(size_bytes):
    """Format file size in human-readable format."""
    if size_bytes is None:
        return "Unknown"

    size = int(size_bytes)
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size < 1024:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size:.1f} PB"


def choose_file_to_keep(files, keep_strategy='oldest'):
    """Choose which file to keep based on strategy."""
    if keep_strategy == 'oldest':
        # Keep the oldest file (first created)
        files_sorted = sorted(files, key=lambda x: x.get('createdTime', ''))
        return files_sorted[0], files_sorted[1:]
    else:
        # Keep the newest file (most recently modified)
        files_sorted = sorted(files, key=lambda x: x.get('modifiedTime', ''), reverse=True)
        return files_sorted[0], files_sorted[1:]


def delete_file(service, file_id):
    """Move a file to trash."""
    try:
        service.files().update(
            fileId=file_id,
            body={'trashed': True}
        ).execute()
        return True
    except HttpError as error:
        print(f"  Error deleting file: {error}")
        return False


def permanently_delete_file(service, file_id):
    """Permanently delete a file (cannot be recovered)."""
    try:
        service.files().delete(fileId=file_id).execute()
        return True
    except HttpError as error:
        print(f"  Error permanently deleting file: {error}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description='Find and remove duplicate files in Google Drive',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python dedup.py --dry-run              # Preview duplicates without deleting
  python dedup.py --keep newest          # Keep the most recently modified copy
  python dedup.py --folder FOLDER_ID     # Only scan a specific folder
  python dedup.py --interactive          # Confirm each deletion
  python dedup.py --permanent            # Permanently delete (skip trash)
  python dedup.py --report duplicates.json  # Save report to file
        """
    )
    parser.add_argument('--dry-run', action='store_true',
                        help='Preview duplicates without deleting anything')
    parser.add_argument('--keep', choices=['oldest', 'newest'], default='oldest',
                        help='Which copy to keep (default: oldest)')
    parser.add_argument('--folder', type=str,
                        help='Only scan files in a specific folder ID')
    parser.add_argument('--interactive', '-i', action='store_true',
                        help='Confirm each deletion')
    parser.add_argument('--permanent', action='store_true',
                        help='Permanently delete files instead of moving to trash')
    parser.add_argument('--report', type=str,
                        help='Save duplicate report to JSON file')

    args = parser.parse_args()

    print("=" * 60)
    print("Google Drive Deduplication Script")
    print("=" * 60)

    # Authenticate
    print("\nAuthenticating with Google Drive...")
    creds = get_credentials()
    service = build('drive', 'v3', credentials=creds)
    print("Authentication successful!")

    # Get all files
    files = get_all_files(service, folder_id=args.folder)

    if not files:
        print("\nNo files found in your Drive.")
        return

    # Find duplicates
    print("\nAnalyzing files for duplicates...")
    duplicates, skipped = find_duplicates(files)

    if skipped > 0:
        print(f"  Skipped {skipped} files without checksums (Google Workspace files)")

    if not duplicates:
        print("\nNo duplicate files found!")
        return

    # Calculate statistics
    total_duplicate_sets = len(duplicates)
    total_duplicate_files = sum(len(v) - 1 for v in duplicates.values())
    total_wasted_space = sum(
        sum(int(f.get('size', 0)) for f in files[1:])
        for files in [choose_file_to_keep(v, args.keep)[1] for v in duplicates.values()]
    )

    print(f"\nFound {total_duplicate_sets} sets of duplicate files")
    print(f"Total duplicate files: {total_duplicate_files}")
    print(f"Potential space savings: {format_size(total_wasted_space)}")

    # Build folder path cache
    folder_cache = {}

    # Process duplicates
    print("\n" + "-" * 60)

    deleted_count = 0
    deleted_size = 0

    for i, (md5, file_group) in enumerate(duplicates.items(), 1):
        keep_file, delete_files = choose_file_to_keep(file_group, args.keep)

        print(f"\n[{i}/{total_duplicate_sets}] Duplicate set (MD5: {md5[:8]}...)")
        print(f"  File: {keep_file['name']}")
        print(f"  Size: {format_size(keep_file.get('size'))}")
        print(f"  Copies: {len(file_group)}")

        # Show all files in the group
        print(f"\n  KEEPING ({args.keep}):")
        parent_id = keep_file.get('parents', [''])[0]
        if parent_id:
            path = get_folder_path(service, parent_id, folder_cache)
            print(f"    - {path}/{keep_file['name']}")
        else:
            print(f"    - {keep_file['name']}")
        print(f"      Created: {keep_file.get('createdTime', 'Unknown')[:10]}")

        print(f"\n  TO DELETE:")
        for df in delete_files:
            parent_id = df.get('parents', [''])[0]
            if parent_id:
                path = get_folder_path(service, parent_id, folder_cache)
                print(f"    - {path}/{df['name']}")
            else:
                print(f"    - {df['name']}")
            print(f"      Created: {df.get('createdTime', 'Unknown')[:10]}")

        if args.dry_run:
            print("  [DRY RUN - No files deleted]")
            continue

        # Interactive confirmation
        if args.interactive:
            response = input("\n  Delete duplicates? [y/N/q]: ").strip().lower()
            if response == 'q':
                print("\nQuitting...")
                break
            if response != 'y':
                print("  Skipped.")
                continue

        # Delete duplicate files
        for df in delete_files:
            if args.permanent:
                success = permanently_delete_file(service, df['id'])
                action = "Permanently deleted"
            else:
                success = delete_file(service, df['id'])
                action = "Moved to trash"

            if success:
                deleted_count += 1
                deleted_size += int(df.get('size', 0))
                print(f"  {action}: {df['name']}")

    # Save report if requested
    if args.report:
        report = {
            'timestamp': datetime.now().isoformat(),
            'total_duplicate_sets': total_duplicate_sets,
            'total_duplicate_files': total_duplicate_files,
            'potential_space_savings': total_wasted_space,
            'deleted_count': deleted_count,
            'deleted_size': deleted_size,
            'duplicates': [
                {
                    'md5': md5,
                    'files': [
                        {
                            'id': f['id'],
                            'name': f['name'],
                            'size': f.get('size'),
                            'created': f.get('createdTime'),
                            'modified': f.get('modifiedTime')
                        }
                        for f in files
                    ]
                }
                for md5, files in duplicates.items()
            ]
        }

        with open(args.report, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\nReport saved to: {args.report}")

    # Summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    if args.dry_run:
        print(f"Duplicate files found: {total_duplicate_files}")
        print(f"Potential space savings: {format_size(total_wasted_space)}")
        print("\nRun without --dry-run to delete duplicates.")
    else:
        print(f"Files deleted: {deleted_count}")
        print(f"Space recovered: {format_size(deleted_size)}")

    print("\nDone!")


if __name__ == '__main__':
    main()
