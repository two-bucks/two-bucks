# iMessage Thread Exporter

A shell script that extracts a single iMessage conversation thread and saves it as **plain text (TXT)** and/or **PDF** using [`imessage-exporter`](https://github.com/ReagentX/imessage-exporter).

## Prerequisites

**macOS only** — iMessage data lives in `~/Library/Messages/chat.db`.

1. **imessage-exporter**
   ```bash
   brew install imessage-exporter
   ```

2. **Full Disk Access for Terminal** (required to read the iMessage database)
   - System Preferences → Privacy & Security → Full Disk Access → enable Terminal

3. **PDF renderer** (only needed for PDF output — any one of):
   ```bash
   brew install --cask google-chrome   # recommended
   brew install chromium
   brew install wkhtmltopdf
   ```

## Usage

```bash
./export_thread.sh <contact> [OPTIONS]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<contact>` | Contact name, phone number (`+15551234567`), or email address |

### Options

| Option | Description |
|--------|-------------|
| `--txt` | Export plain text only |
| `--pdf` | Export PDF only |
| `--both` | Export both TXT and PDF **(default)** |
| `--output <dir>` | Output directory (default: `~/Desktop/<contact>_imessage/`) |
| `-h, --help` | Show usage |

## Examples

```bash
# Export both TXT and PDF for a contact by name
./export_thread.sh "Jane Smith"

# Export TXT only for a phone number
./export_thread.sh "+15551234567" --txt

# Export PDF only for an email
./export_thread.sh "user@example.com" --pdf

# Export to a specific folder
./export_thread.sh "Jane Smith" --output ~/Desktop/jane_export
```

## Output

Files are saved to `~/Desktop/<contact>_imessage/` by default:

```
~/Desktop/Jane_Smith_imessage/
├── Jane Smith.txt      # plain text conversation
└── Jane Smith.pdf      # PDF version
```

The TXT file contains the full conversation with timestamps, reactions, and message metadata. The PDF preserves the same content in a printable, shareable format.

## Notes

- **Group chats**: The `-t` filter matches any conversation containing the contact identifier. Group chats including that contact will also be exported.
- **Multiple files**: If a contact has multiple separate threads, each will export as a separate file.
- **Attachments**: Attachments are referenced by path in TXT; in PDF they may render inline depending on whether attachment files are accessible.
