#!/usr/bin/env bash
#
# record-demo.sh — Record demo GIFs and videos from the running dev server.
#
# Usage:
#   ./scripts/record-demo.sh gif              # Record a GIF (default 10s)
#   ./scripts/record-demo.sh gif 15           # Record a 15-second GIF
#   ./scripts/record-demo.sh video            # Record an MP4 video (default 15s)
#   ./scripts/record-demo.sh video 30         # Record a 30-second MP4
#   ./scripts/record-demo.sh screenshot       # Take a single screenshot
#
# Requirements:
#   - ffmpeg (recording + GIF conversion)
#   - gifsicle (GIF optimization, optional)
#   - xdotool (for getting window geometry on X11, optional)
#
# Output: files saved to ./demos/ directory
#

set -euo pipefail

# --- Configuration ---
OUTPUT_DIR="./demos"
DEV_URL="http://localhost:3100"
DEFAULT_GIF_DURATION=10
DEFAULT_VIDEO_DURATION=15
FRAMERATE=30
GIF_FRAMERATE=15
GIF_WIDTH=800           # Width for GIF output (height auto-scaled)
VIDEO_RESOLUTION=""     # Empty = capture native resolution

# --- Helpers ---
info()  { echo -e "\033[1;34m[info]\033[0m  $*"; }
ok()    { echo -e "\033[1;32m[ok]\033[0m    $*"; }
warn()  { echo -e "\033[1;33m[warn]\033[0m  $*"; }
err()   { echo -e "\033[1;31m[error]\033[0m $*" >&2; }

check_deps() {
  local missing=()
  for cmd in "$@"; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    echo ""
    echo "Install on Ubuntu/Debian:"
    echo "  sudo apt-get install ffmpeg gifsicle"
    echo ""
    echo "Install on macOS:"
    echo "  brew install ffmpeg gifsicle"
    exit 1
  fi
}

timestamp() {
  date +"%Y%m%d_%H%M%S"
}

ensure_output_dir() {
  mkdir -p "$OUTPUT_DIR"
}

# --- Detect recording method ---
# Prefer wf-recorder (Wayland), fall back to ffmpeg x11grab (X11),
# fall back to ffmpeg avfoundation (macOS)
detect_recorder() {
  if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "macos"
  elif [[ -n "${WAYLAND_DISPLAY:-}" ]] && command -v wf-recorder &>/dev/null; then
    echo "wayland"
  elif [[ -n "${DISPLAY:-}" ]]; then
    echo "x11"
  else
    err "No display server detected. Run this on a machine with a GUI."
    exit 1
  fi
}

# --- Get screen/window dimensions ---
get_screen_geometry() {
  local method
  method=$(detect_recorder)

  case "$method" in
    macos)
      # Use system_profiler to get main display resolution
      local res
      res=$(system_profiler SPDisplaysDataType 2>/dev/null | grep -i resolution | head -1 | grep -oE '[0-9]+ x [0-9]+' || echo "1920 x 1080")
      echo "${res// /}"
      ;;
    x11)
      if command -v xdpyinfo &>/dev/null; then
        xdpyinfo 2>/dev/null | grep dimensions | head -1 | awk '{print $2}'
      else
        echo "1920x1080"
      fi
      ;;
    wayland)
      echo "1920x1080"
      ;;
  esac
}

# --- Recording functions ---

record_screen_to_file() {
  local output_file="$1"
  local duration="$2"
  local method
  method=$(detect_recorder)

  info "Recording ${duration}s of screen to ${output_file}..."
  info "Recording method: ${method}"
  echo ""
  echo "  >>> Recording starts in 3 seconds — switch to your browser! <<<"
  sleep 3

  case "$method" in
    macos)
      ffmpeg -y \
        -f avfoundation \
        -framerate "$FRAMERATE" \
        -i "1:none" \
        -t "$duration" \
        -c:v libx264 \
        -pix_fmt yuv420p \
        -preset fast \
        "$output_file" \
        2>/dev/null
      ;;
    x11)
      local geometry
      geometry=$(get_screen_geometry)
      ffmpeg -y \
        -f x11grab \
        -framerate "$FRAMERATE" \
        -video_size "$geometry" \
        -i "${DISPLAY:-:0}" \
        -t "$duration" \
        -c:v libx264 \
        -pix_fmt yuv420p \
        -preset fast \
        "$output_file" \
        2>/dev/null
      ;;
    wayland)
      wf-recorder \
        -f "$output_file" \
        -d "/dev/dri/renderD128" \
        &
      local pid=$!
      sleep "$duration"
      kill -INT "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      ;;
  esac
}

take_screenshot() {
  local output_file="$1"
  local method
  method=$(detect_recorder)

  info "Taking screenshot in 3 seconds — switch to your browser!"
  sleep 3

  case "$method" in
    macos)
      screencapture -x "$output_file"
      ;;
    x11)
      if command -v import &>/dev/null; then
        import -window root "$output_file"
      elif command -v scrot &>/dev/null; then
        scrot "$output_file"
      else
        ffmpeg -y \
          -f x11grab \
          -video_size "$(get_screen_geometry)" \
          -i "${DISPLAY:-:0}" \
          -frames:v 1 \
          "$output_file" \
          2>/dev/null
      fi
      ;;
    wayland)
      if command -v grim &>/dev/null; then
        grim "$output_file"
      else
        err "Install 'grim' for Wayland screenshots"
        exit 1
      fi
      ;;
  esac
}

# --- Commands ---

cmd_gif() {
  local duration="${1:-$DEFAULT_GIF_DURATION}"
  local ts
  ts=$(timestamp)
  local tmpfile="${OUTPUT_DIR}/tmp_${ts}.mp4"
  local outfile="${OUTPUT_DIR}/demo_${ts}.gif"

  check_deps ffmpeg
  ensure_output_dir

  record_screen_to_file "$tmpfile" "$duration"

  info "Converting to GIF..."
  # Two-pass for better quality: generate palette, then use it
  ffmpeg -y -i "$tmpfile" \
    -vf "fps=${GIF_FRAMERATE},scale=${GIF_WIDTH}:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
    "$outfile" \
    2>/dev/null

  # Optimize with gifsicle if available
  if command -v gifsicle &>/dev/null; then
    info "Optimizing GIF with gifsicle..."
    gifsicle -O3 --lossy=80 "$outfile" -o "$outfile" 2>/dev/null
  fi

  rm -f "$tmpfile"

  local size
  size=$(du -h "$outfile" | cut -f1)
  ok "GIF saved: ${outfile} (${size})"

  # Warn if too large for Twitter (15MB limit for GIFs)
  local bytes
  bytes=$(stat -f%z "$outfile" 2>/dev/null || stat -c%s "$outfile" 2>/dev/null || echo 0)
  if [[ "$bytes" -gt 15728640 ]]; then
    warn "GIF is over 15MB — may be too large for Twitter. Try shorter duration or smaller resolution."
  fi
}

cmd_video() {
  local duration="${1:-$DEFAULT_VIDEO_DURATION}"
  local ts
  ts=$(timestamp)
  local outfile="${OUTPUT_DIR}/demo_${ts}.mp4"

  check_deps ffmpeg
  ensure_output_dir

  record_screen_to_file "$outfile" "$duration"

  local size
  size=$(du -h "$outfile" | cut -f1)
  ok "Video saved: ${outfile} (${size})"
}

cmd_screenshot() {
  local ts
  ts=$(timestamp)
  local outfile="${OUTPUT_DIR}/screenshot_${ts}.png"

  ensure_output_dir
  take_screenshot "$outfile"

  local size
  size=$(du -h "$outfile" | cut -f1)
  ok "Screenshot saved: ${outfile} (${size})"
}

cmd_help() {
  echo "Usage: $0 <command> [options]"
  echo ""
  echo "Commands:"
  echo "  gif [duration]         Record a GIF (default: ${DEFAULT_GIF_DURATION}s)"
  echo "  video [duration]       Record an MP4 video (default: ${DEFAULT_VIDEO_DURATION}s)"
  echo "  screenshot             Take a PNG screenshot"
  echo "  help                   Show this help message"
  echo ""
  echo "Output is saved to ${OUTPUT_DIR}/"
  echo ""
  echo "Examples:"
  echo "  $0 gif                 # 10-second GIF"
  echo "  $0 gif 20              # 20-second GIF"
  echo "  $0 video 30            # 30-second MP4"
  echo "  $0 screenshot          # Single PNG"
  echo ""
  echo "Tips:"
  echo "  - Start the dev server first: npm run dev"
  echo "  - Open ${DEV_URL} in your browser"
  echo "  - Run this script, then switch to the browser window"
  echo "  - GIFs are auto-optimized with gifsicle (if installed)"
}

# --- Main ---
case "${1:-help}" in
  gif)        cmd_gif "${2:-}" ;;
  video)      cmd_video "${2:-}" ;;
  screenshot) cmd_screenshot ;;
  help|--help|-h) cmd_help ;;
  *)
    err "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac
