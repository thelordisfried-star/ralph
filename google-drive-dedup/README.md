# Google Drive Deduplication Script

A free-to-use Python script that finds and removes duplicate files in your Google Drive.

## Features

- Scans your entire Google Drive (or a specific folder)
- Identifies duplicates using MD5 checksums (100% accurate)
- Multiple deletion strategies (keep oldest or newest file)
- Dry-run mode to preview before deleting
- Interactive mode for manual confirmation
- Moves files to trash by default (recoverable)
- Optional permanent deletion
- JSON report export
- Progress tracking

## Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

Or manually:

```bash
pip install google-auth google-auth-oauthlib google-auth-httplib2 google-api-python-client
```

### 2. Set Up Google Drive API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Go to **APIs & Services** > **Library**
4. Search for "Google Drive API" and **Enable** it
5. Go to **APIs & Services** > **Credentials**
6. Click **Create Credentials** > **OAuth client ID**
7. Select **Desktop application**
8. Download the JSON file
9. Save it as `credentials.json` in this directory

### 3. Run the Script

```bash
# Preview duplicates without deleting (recommended first run)
python dedup.py --dry-run

# Delete duplicates (moves to trash)
python dedup.py

# Interactive mode - confirm each deletion
python dedup.py --interactive
```

## Usage

```
python dedup.py [OPTIONS]

Options:
  --dry-run              Preview duplicates without deleting anything
  --keep {oldest,newest} Which copy to keep (default: oldest)
  --folder FOLDER_ID     Only scan files in a specific folder
  --interactive, -i      Confirm each deletion
  --permanent            Permanently delete files (skip trash)
  --report FILE          Save duplicate report to JSON file
```

## Examples

```bash
# See what duplicates exist
python dedup.py --dry-run

# Keep the newest version of duplicates
python dedup.py --keep newest

# Scan only a specific folder
python dedup.py --folder 1ABC123xyz789

# Save a report and delete with confirmation
python dedup.py --interactive --report duplicates.json

# Permanently delete duplicates (cannot be recovered!)
python dedup.py --permanent
```

## How It Works

1. **Authentication**: Uses OAuth2 to securely access your Google Drive
2. **Scanning**: Retrieves all files with their MD5 checksums
3. **Analysis**: Groups files by identical checksums
4. **Selection**: Chooses which file to keep based on your preference
5. **Cleanup**: Moves duplicates to trash (or permanently deletes)

## Notes

- **Google Workspace files** (Docs, Sheets, Slides, etc.) are automatically skipped since they don't have traditional file checksums
- **Shared files**: The script will find duplicates across your entire Drive including shared files
- **Trash**: By default, deleted files go to trash and can be recovered for 30 days
- **First run**: Always use `--dry-run` first to see what will be deleted
- **Credentials**: Your `token.pickle` stores your login session locally - keep it private

## Finding a Folder ID

To get a folder ID:
1. Open Google Drive in your browser
2. Navigate to the folder
3. The URL will look like: `https://drive.google.com/drive/folders/1ABC123xyz789`
4. The folder ID is: `1ABC123xyz789`

## License

MIT License - Free to use, modify, and distribute.

## Troubleshooting

**"credentials.json not found"**
- Follow the setup steps above to create OAuth credentials

**"Access denied" or "Insufficient permissions"**
- Delete `token.pickle` and re-authenticate
- Make sure you enabled the Google Drive API

**"Quota exceeded"**
- Google limits API requests; wait a few minutes and try again

**"File not found" errors during deletion**
- The file may have been moved or deleted by another process
- This is normal and the script will continue
