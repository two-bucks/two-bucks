#!/usr/bin/env bash
# export_thread.sh — Export a single iMessage thread to TXT and/or PDF
#
# Usage:
#   ./export_thread.sh "Contact Name"
#   ./export_thread.sh "+15551234567" --txt
#   ./export_thread.sh "user@email.com" --pdf
#   ./export_thread.sh "Contact Name" --both --output ~/Desktop/export
#
# Prerequisites:
#   - macOS with iMessage data in ~/Library/Messages/chat.db
#   - imessage-exporter: brew install imessage-exporter
#   - Full Disk Access granted to Terminal (System Preferences > Privacy)
#   - For PDF: Chrome, Chromium, or wkhtmltopdf installed

set -euo pipefail

# ── Helpers ──────────────────────────────────────────────────────────────────

usage() {
  cat <<EOF
Usage: $(basename "$0") <contact> [OPTIONS]

Arguments:
  <contact>        Contact name, phone number (+15551234567), or email

Options:
  --txt            Export plain text only
  --pdf            Export PDF only
  --both           Export both TXT and PDF (default)
  --output <dir>   Output directory (default: ~/Desktop/<contact>_imessage)
  -h, --help       Show this help

Examples:
  ./export_thread.sh "Jane Smith"
  ./export_thread.sh "+15551234567" --txt
  ./export_thread.sh "user@example.com" --pdf --output ~/exports
EOF
  exit 0
}

die() { echo "Error: $*" >&2; exit 1; }
info() { echo "→ $*"; }

# ── Argument parsing ──────────────────────────────────────────────────────────

CONTACT=""
MODE="both"
OUTPUT_DIR=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage ;;
    --txt)    MODE="txt"; shift ;;
    --pdf)    MODE="pdf"; shift ;;
    --both)   MODE="both"; shift ;;
    --output) OUTPUT_DIR="$2"; shift 2 ;;
    -*) die "Unknown option: $1" ;;
    *)
      [[ -z "$CONTACT" ]] && CONTACT="$1" || die "Unexpected argument: $1"
      shift ;;
  esac
done

[[ -z "$CONTACT" ]] && die "A contact name, phone number, or email is required.\nRun with --help for usage."

# ── Dependency checks ─────────────────────────────────────────────────────────

command -v imessage-exporter &>/dev/null \
  || die "imessage-exporter not found. Install with: brew install imessage-exporter"

# Find a PDF renderer (only needed if exporting PDF)
PDF_CMD=""
if [[ "$MODE" == "pdf" || "$MODE" == "both" ]]; then
  for candidate in chromium "google-chrome" "Google Chrome" wkhtmltopdf; do
    if command -v "$candidate" &>/dev/null; then
      PDF_CMD="$candidate"
      break
    fi
    # macOS app bundle fallback for Chrome
    if [[ "$candidate" == "Google Chrome" ]] && \
       [[ -x "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]]; then
      PDF_CMD="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      break
    fi
  done
  [[ -z "$PDF_CMD" ]] && die "No PDF renderer found. Install one of:\n  brew install --cask google-chrome\n  brew install chromium\n  brew install wkhtmltopdf"
fi

# ── Setup ─────────────────────────────────────────────────────────────────────

# Sanitize contact name for use in filenames
SAFE_CONTACT="${CONTACT//[^a-zA-Z0-9._@+-]/_}"

if [[ -z "$OUTPUT_DIR" ]]; then
  OUTPUT_DIR="$HOME/Desktop/${SAFE_CONTACT}_imessage"
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$OUTPUT_DIR"

info "Contact:    $CONTACT"
info "Output dir: $OUTPUT_DIR"
info "Mode:       $MODE"
echo ""

# ── TXT Export ───────────────────────────────────────────────────────────────

if [[ "$MODE" == "txt" || "$MODE" == "both" ]]; then
  info "Exporting conversation as TXT..."
  TXT_TMP="$TMP_DIR/txt"
  mkdir -p "$TXT_TMP"

  imessage-exporter -f txt -t "$CONTACT" -o "$TXT_TMP"

  # Find exported txt files (imessage-exporter may produce one or more)
  TXT_FILES=("$TXT_TMP"/*.txt)
  if [[ ${#TXT_FILES[@]} -eq 0 || ! -f "${TXT_FILES[0]}" ]]; then
    die "No TXT files were exported. Check that '$CONTACT' matches a conversation in your iMessage database."
  fi

  # Copy to output dir
  for f in "${TXT_FILES[@]}"; do
    cp "$f" "$OUTPUT_DIR/"
    info "  Saved: $OUTPUT_DIR/$(basename "$f")"
  done
fi

# ── HTML Export + PDF Conversion ──────────────────────────────────────────────

if [[ "$MODE" == "pdf" || "$MODE" == "both" ]]; then
  info "Exporting conversation as HTML (for PDF conversion)..."
  HTML_TMP="$TMP_DIR/html"
  mkdir -p "$HTML_TMP"

  # -l disables lazy image loading, which improves PDF rendering
  imessage-exporter -f html -l -t "$CONTACT" -o "$HTML_TMP"

  HTML_FILES=("$HTML_TMP"/*.html)
  if [[ ${#HTML_FILES[@]} -eq 0 || ! -f "${HTML_FILES[0]}" ]]; then
    die "No HTML files were exported. Check that '$CONTACT' matches a conversation in your iMessage database."
  fi

  info "Converting HTML to PDF..."
  for html_file in "${HTML_FILES[@]}"; do
    base="$(basename "$html_file" .html)"
    pdf_out="$OUTPUT_DIR/${base}.pdf"

    if [[ "$PDF_CMD" == *"wkhtmltopdf"* ]]; then
      wkhtmltopdf "$html_file" "$pdf_out"
    else
      # Chrome/Chromium headless
      "$PDF_CMD" \
        --headless \
        --disable-gpu \
        --no-sandbox \
        --print-to-pdf="$pdf_out" \
        --print-to-pdf-no-header \
        "file://$html_file" \
        2>/dev/null
    fi

    info "  Saved: $pdf_out"
  done
fi

echo ""
echo "Done. Files saved to: $OUTPUT_DIR"
