#!/usr/bin/env bash
# Ingests phone photos of the printed clean documents into dossiers/field-capture.
# Usage: ./scripts/ingest-field-capture.sh <photo-for-lc> <photo-for-invoice> <photo-for-packing> <photo-for-bol>
# Accepts HEIC/JPEG/PNG in any order matching the arguments; outputs normalized JPEGs.
set -euo pipefail

DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$DIR/dossiers/field-capture"
NAMES=(lc invoice packing-list bol)

if [ "$#" -ne 4 ]; then
  echo "usage: $0 <lc-photo> <invoice-photo> <packing-photo> <bol-photo>" >&2
  exit 1
fi

for i in 1 2 3 4; do
  src="${!i}"
  name="${NAMES[$((i-1))]}"
  sips -s format jpeg -Z 2000 "$src" --out "$OUT/$name.jpg" >/dev/null
  echo "ok $name.jpg <- $(basename "$src")"
done
echo "done — run: npm run coteja -- dossiers/field-capture"
