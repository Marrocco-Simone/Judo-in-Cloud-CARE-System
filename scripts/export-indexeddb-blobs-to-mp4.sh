#!/usr/bin/env bash

set -euo pipefail

usage() {
  printf 'Usage: %s <app-data-folder-or-indexeddb-blob-folder> <output.mp4>\n' "$0" >&2
  printf '\nExamples:\n' >&2
  printf '  %s /Volumes/T9/tatami1 /Volumes/T9/tatami1.mp4\n' "$0" >&2
  printf '  %s /Volumes/T9/tatami3 /Volumes/T9/tatami3.mp4\n' "$0" >&2
  printf '  %s /Volumes/T9/tatami1/IndexedDB/file__0.indexeddb.blob /Volumes/T9/tatami1.mp4\n' "$0" >&2
}

max_blob_duration=10
while [ "$#" -gt 0 ]; do
  case "${1:-}" in
    --help|-h)
      usage
      exit 0
      ;;
    --*)
      printf 'Unknown option: %s\n' "$1" >&2
      usage
      exit 2
      ;;
    *)
      break
      ;;
  esac
done

if [ "$#" -ne 2 ]; then
  usage
  exit 2
fi

input_path=${1%/}
output_path=$2

if [ ! -d "$input_path" ]; then
  printf 'Input folder does not exist: %s\n' "$input_path" >&2
  exit 1
fi

if ! command -v perl >/dev/null 2>&1; then
  printf 'perl was not found in PATH. It is needed to sort IndexedDB blob paths.\n' >&2
  exit 1
fi

blob_root=""
case "$input_path" in
  *.indexeddb.blob)
    blob_root=$input_path
    ;;
  *)
    indexeddb_dir="$input_path/IndexedDB"
    if [ ! -d "$indexeddb_dir" ]; then
      printf 'Could not find IndexedDB folder under: %s\n' "$input_path" >&2
      printf 'Pass either the copied app-data folder or the *.indexeddb.blob folder directly.\n' >&2
      exit 1
    fi

    for candidate in "$indexeddb_dir"/*.indexeddb.blob; do
      if [ -d "$candidate" ]; then
        if [ -n "$blob_root" ]; then
          printf 'Found multiple *.indexeddb.blob folders under: %s\n' "$indexeddb_dir" >&2
          printf 'Pass the intended *.indexeddb.blob folder directly.\n' >&2
          exit 1
        fi
        blob_root=$candidate
      fi
    done
    ;;
esac

if [ -z "$blob_root" ] || [ ! -d "$blob_root" ]; then
  printf 'Could not locate a *.indexeddb.blob folder in: %s\n' "$input_path" >&2
  exit 1
fi

output_dir=$(dirname "$output_path")
if [ ! -d "$output_dir" ]; then
  printf 'Output folder does not exist: %s\n' "$output_dir" >&2
  exit 1
fi

concat_list="$output_path.ffconcat"
sorted_files="$output_path.files.txt"
validated_files="$output_path.valid-files.txt"
damaged_files="$output_path.damaged-files.txt"
rejected_files="$output_path.rejected-files.txt"

printf 'Input: %s\n' "$input_path"
printf 'Blob folder: %s\n' "$blob_root"
printf 'Output: %s\n' "$output_path"
printf 'Concat list: %s\n' "$concat_list"

find "$blob_root" -type f -print | perl -MFile::Spec -e '
  my $root = shift;
  $root =~ s{/+$}{};
  while (my $path = <STDIN>) {
    chomp $path;
    my $relative = File::Spec->abs2rel($path, $root);
    my @parts = split m{/}, $relative;
    my @key = map { /^[0-9a-fA-F]+$/ ? sprintf("%08x", hex($_)) : $_ } @parts;
    print join("/", @key), "\t", $path, "\n";
  }
' "$blob_root" | LC_ALL=C sort | perl -ne 's/^.*?\t//; print' > "$sorted_files"

file_count=$(wc -l < "$sorted_files" | tr -d ' ')
if [ "$file_count" -eq 0 ]; then
  printf 'No blob files found under: %s\n' "$blob_root" >&2
  exit 1
fi

printf 'Found %s blob files.\n' "$file_count"

if ! command -v ffmpeg >/dev/null 2>&1; then
  printf 'ffmpeg was not found in PATH. Install ffmpeg and try again.\n' >&2
  exit 1
fi

if ! command -v ffprobe >/dev/null 2>&1; then
  printf 'ffprobe was not found in PATH. Install ffmpeg and try again.\n' >&2
  exit 1
fi

: > "$validated_files"
: > "$damaged_files"
: > "$rejected_files"

printf 'Validating blobs and rejecting damaged or oversized chunks. This can take a while.\n'
printf 'Maximum accepted blob duration: %ss\n' "$max_blob_duration"
current=0
while IFS= read -r file_path; do
  current=$((current + 1))
  if [ $((current % 500)) -eq 0 ]; then
    printf 'Validated %s/%s blobs...\n' "$current" "$file_count"
  fi

  duration=$(ffprobe -v error -select_streams v:0 -show_packets -show_entries packet=pts_time -of csv=p=0 "$file_path" 2>/dev/null | LC_ALL=C sort -n | tail -1 || true)
  duration=${duration:-0}

  if ! awk -v duration="$duration" -v max="$max_blob_duration" 'BEGIN { exit !(duration <= max) }'; then
    printf '%s\tduration=%s\n' "$file_path" "$duration" >> "$rejected_files"
  elif ffmpeg -v error -xerror -i "$file_path" -map 0:v:0 -an -f null - >/dev/null 2>/dev/null; then
    printf '%s\n' "$file_path" >> "$validated_files"
  else
    printf '%s\n' "$file_path" >> "$damaged_files"
  fi
done < "$sorted_files"

valid_count=$(wc -l < "$validated_files" | tr -d ' ')
damaged_count=$(wc -l < "$damaged_files" | tr -d ' ')
rejected_count=$(wc -l < "$rejected_files" | tr -d ' ')
if [ "$valid_count" -eq 0 ]; then
  printf 'No valid blobs remained after validation. Damaged file list: %s\n' "$damaged_files" >&2
  exit 1
fi

printf 'Validation complete: %s valid, %s damaged skipped, %s oversized rejected.\n' "$valid_count" "$damaged_count" "$rejected_count"
printf 'Damaged file list: %s\n' "$damaged_files"
printf 'Rejected file list: %s\n' "$rejected_files"

{
  printf 'ffconcat version 1.0\n'
  while IFS= read -r file_path; do
    case "$file_path" in
      *"'"*)
        printf 'Cannot write ffconcat safely for a path containing a single quote: %s\n' "$file_path" >&2
        exit 1
        ;;
    esac
    printf "file '%s'\n" "$file_path"
  done < "$validated_files"
} > "$concat_list"

printf 'Starting ffmpeg export. This can take a long time for full-day recordings.\n'

ffmpeg \
  -hide_banner \
  -fflags +discardcorrupt \
  -err_detect ignore_err \
  -f concat \
  -safe 0 \
  -i "$concat_list" \
  -an \
  -c:v libx264 \
  -preset slow \
  -crf 16 \
  -movflags +faststart \
  "$output_path"

printf 'Export complete: %s\n' "$output_path"
printf 'Generated helper files can be removed if you do not need them:\n'
printf '  %s\n' "$sorted_files"
printf '  %s\n' "$validated_files"
printf '  %s\n' "$damaged_files"
printf '  %s\n' "$rejected_files"
printf '  %s\n' "$concat_list"
