#!/usr/bin/env bash
# Financing Bot media ingest.
# Watches /home/claude/financing-bot/assets/incoming/ (or the folder given as $1)
# for the four hero loop clips and the eleven photographs, then writes the exact
# public paths the pages reference:
#
#   public/assets/video/V-01-overnight-shift.mp4      12 s, h264 yuv420p 1080p, four 3 s trims, hard cuts, clean loop point
#   public/assets/video/V-01-overnight-shift-720.mp4  the mobile encode
#   public/assets/video/V-01-overnight-shift.webm     VP9
#   public/assets/video/V-01-poster.webp (+ .jpg)     the first frame
#   public/assets/photo/PH-NN.webp                    2560 wide, the slot's crop (21:9 -> 2560x1097, 2:1 -> 2560x1280)
#   public/assets/photo/PH-NN-1280.webp               1280 wide
#   public/assets/photo/PH-NN.jpg                     JPEG fallback at 2560
#
# Accepted incoming names (any of): clip1.mp4 .. clip4.mp4, V-01a.mp4 .. V-01d.mp4,
# financingbot-clip2.mp4 .., PH-01.png|jpg|webp .. PH-11.*, financingbot-PH-01.png ..
# Run with --provisional to build a temporary V-01 from clip1 alone (looped) when
# clips 2 to 4 have not arrived; the full build overwrites it later.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
IN="${1:-/home/claude/financing-bot/assets/incoming}"
[[ "$IN" == "--provisional" ]] && IN="/home/claude/financing-bot/assets/incoming"
PROVISIONAL=0; for a in "$@"; do [[ "$a" == "--provisional" ]] && PROVISIONAL=1; done
ALT_VIDEO="/home/claude/financing-bot/assets/video"
OUTV="$ROOT/public/assets/video"; OUTP="$ROOT/public/assets/photo"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUTV" "$OUTP"

find_clip() { # $1 = index 1..4
  local i="$1"; local letters=(a b c d); local L="${letters[$((i-1))]}"
  for c in "$IN/clip$i.mp4" "$IN/V-01$L.mp4" "$IN/financingbot-clip$i.mp4" "$ALT_VIDEO/clip$i.mp4" "$ALT_VIDEO/V-01$L.mp4"; do
    [[ -f "$c" ]] && { echo "$c"; return 0; }
  done
  return 1
}
find_photo() { # $1 = NN
  local n="$1"
  for c in "$IN/PH-$n.png" "$IN/PH-$n.jpg" "$IN/PH-$n.jpeg" "$IN/PH-$n.webp" "$IN/financingbot-PH-$n.png" "$IN/financingbot-PH-$n.jpg" "$IN/financingbot-PH-$n.webp"; do
    [[ -f "$c" ]] && { echo "$c"; return 0; }
  done
  return 1
}

# ---------------------------------------------------------------- V-01
clips=(); missing=0
for i in 1 2 3 4; do
  if c="$(find_clip $i)"; then clips+=("$c"); else missing=1; echo "V-01: clip $i not in $IN yet"; fi
done
build_v01() {
  local parts=("$@"); local n=${#parts[@]}; local list="$TMP/list.txt"; : > "$list"
  for k in "${!parts[@]}"; do
    # trim 3 s from each clip, scale to 1920x1080, constant frame rate, no audio
    ffmpeg -v error -y -ss 0.5 -t 3 -i "${parts[$k]}" -an -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 16 "$TMP/part$k.mp4"
    echo "file 'part$k.mp4'" >> "$list"
  done
  # hard cuts, concatenated; the loop point is the cut from clip 4 back to clip 1, so no fade is added
  ffmpeg -v error -y -f concat -safe 0 -i "$list" -c copy "$TMP/V-01-raw.mp4"
  ffmpeg -v error -y -i "$TMP/V-01-raw.mp4" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 20 -movflags +faststart -g 30 "$OUTV/V-01-overnight-shift.mp4"
  ffmpeg -v error -y -i "$TMP/V-01-raw.mp4" -an -vf "scale=1280:720" -c:v libx264 -profile:v main -pix_fmt yuv420p -preset slow -crf 23 -movflags +faststart "$OUTV/V-01-overnight-shift-720.mp4"
  ffmpeg -v error -y -i "$TMP/V-01-raw.mp4" -an -c:v libvpx-vp9 -pix_fmt yuv420p -b:v 0 -crf 34 -row-mt 1 -deadline good "$OUTV/V-01-overnight-shift.webm"
  ffmpeg -v error -y -i "$TMP/V-01-raw.mp4" -frames:v 1 -q:v 2 "$OUTV/V-01-poster.jpg"
  ffmpeg -v error -y -i "$TMP/V-01-raw.mp4" -frames:v 1 -c:v libwebp -quality 82 "$OUTV/V-01-poster.webp"
  echo "V-01 written: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUTV/V-01-overnight-shift.mp4") s"
}
if [[ $missing -eq 0 ]]; then
  build_v01 "${clips[@]}"
elif [[ $PROVISIONAL -eq 1 && ${#clips[@]} -ge 1 ]]; then
  echo "V-01: provisional loop from ${clips[0]} (replace when clips 2 to 4 arrive)"
  build_v01 "${clips[0]}" "${clips[0]}" "${clips[0]}" "${clips[0]}"
fi

# ---------------------------------------------------------------- photographs
# slot crops from the asset slot contract: PH-06 to PH-09 are 2:1, every other slot 21:9
declare -A W2560; declare -A W1280
for n in 01 02 03 04 05 10 11; do W2560[$n]="2560:1097"; W1280[$n]="1280:549"; done
for n in 06 07 08 09; do W2560[$n]="2560:1280"; W1280[$n]="1280:640"; done
for n in 01 02 03 04 05 06 07 08 09 10 11; do
  if src="$(find_photo $n)"; then
    big="${W2560[$n]}"; small="${W1280[$n]}"
    # centre crop to the slot ratio, then scale; ungraded master (the grade is CSS in the build)
    ffmpeg -v error -y -i "$src" -vf "scale=${big}:force_original_aspect_ratio=increase,crop=${big}" -c:v libwebp -quality 84 "$OUTP/PH-$n.webp"
    ffmpeg -v error -y -i "$src" -vf "scale=${small}:force_original_aspect_ratio=increase,crop=${small}" -c:v libwebp -quality 82 "$OUTP/PH-$n-1280.webp"
    ffmpeg -v error -y -i "$src" -vf "scale=${big}:force_original_aspect_ratio=increase,crop=${big}" -q:v 3 "$OUTP/PH-$n.jpg"
    echo "PH-$n written from $(basename "$src") at ${big/:/x}"
  else
    echo "PH-$n: not in $IN yet"
  fi
done
echo "done. Update MEDIA_MANIFEST.json and qa/PENDING_MEDIA.md if a slot changed."
