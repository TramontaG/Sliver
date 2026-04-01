#!/usr/bin/env bash

set -euo pipefail

artifacts_root="${PLAYWRIGHT_RUNS_ROOT:-playwright-artifacts}"
video_port="${PLAYWRIGHT_VIDEO_PORT:-9325}"
viewer_dir="${artifacts_root}/.last-video-viewer"
pid_file="${viewer_dir}/server.pid"
log_file="${viewer_dir}/server.log"

humanize_video_label() {
  local relative_path="$1"
  local value="${relative_path}"

  if [[ "${value}" == */video.webm ]]; then
    value="$(basename "$(dirname "${value}")")"
  else
    value="${value%.webm}"
    value="${value##*/}"
  fi

  value="${value#canvas-}"
  value="${value%--chromium}"
  value="${value%-chromium}"
  value="$(printf '%s' "${value}" | sed -E 's/-[a-f0-9]{5,}-/-/g')"

  case "${value}" in
    *from-the-browser-runtime*)
      value="Canvas instrumentation: reads gameplay snapshot"
      ;;
    *without-dom-based-assertions*)
      value="Canvas instrumentation: deterministic spawn helper"
      ;;
    customer-seating-flow-*browser-clicks-1-customers*)
      value="Seat flow: browser clicks, 1 customer"
      ;;
    customer-seating-flow-*browser-clicks-2-customers*)
      value="Seat flow: browser clicks, 2 customers"
      ;;
    customer-seating-flow-*browser-clicks-4-customers*)
      value="Seat flow: browser clicks, 4 customers"
      ;;
    customer-seating-flow-*to-reception-1-customers*)
      value="Seat flow: reception, 1 customer"
      ;;
    customer-seating-flow-*to-reception-2-customers*)
      value="Seat flow: reception, 2 customers"
      ;;
    customer-seating-flow-*to-reception-4-customers*)
      value="Seat flow: reception, 4 customers"
      ;;
    *)
      value="${value//-/ }"
      value="$(printf '%s' "${value}" | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"
      ;;
  esac

  printf '%s' "${value}"
}

if [ ! -d "${artifacts_root}" ]; then
  echo "No Playwright artifacts found under ${artifacts_root}."
  exit 1
fi

last_run_dir="$(
  find "${artifacts_root}" -mindepth 1 -maxdepth 1 -type d ! -name '.last-video-viewer' -printf '%f\n' \
    | sort -r \
    | head -n1
)"

if [ -z "${last_run_dir}" ]; then
  echo "No Playwright run found under ${artifacts_root}."
  exit 1
fi

run_dir="${artifacts_root}/${last_run_dir}"
video_root="${run_dir}"

mapfile -t run_videos < <(
  find "${run_dir}" -name 'canvas-*.webm' -printf '%P\n' | sort
)

if [ "${#run_videos[@]}" -eq 0 ]; then
  video_root="${run_dir}/test-results"
  mapfile -t run_videos < <(
    find "${video_root}" -name 'video.webm' -printf '%P\n' | sort
  )
fi

if [ "${#run_videos[@]}" -eq 0 ]; then
  echo "No Playwright video found under ${run_dir}."
  exit 1
fi

mkdir -p "${viewer_dir}"

find "${viewer_dir}" -mindepth 1 -maxdepth 1 ! -name 'server.pid' ! -name 'server.log' -exec rm -rf {} +

video_json="["

for index in "${!run_videos[@]}"; do
  relative_path="${run_videos[$index]}"
  source_path="${video_root}/${relative_path}"
  target_name="$(printf '%02d-%s' "$((index + 1))" "$(echo "${relative_path}" | tr '/ ' '__')")"
  cp -f "${source_path}" "${viewer_dir}/${target_name}"

  readable_label="$(humanize_video_label "${relative_path}")"
  escaped_label="$(printf '%s' "${readable_label}" | sed 's/\\/\\\\/g; s/"/\\"/g')"
  escaped_file="$(printf '%s' "${target_name}" | sed 's/\\/\\\\/g; s/"/\\"/g')"

  if [ "${index}" -gt 0 ]; then
    video_json="${video_json},"
  fi

  video_json="${video_json}{\"label\":\"${escaped_label}\",\"file\":\"${escaped_file}\"}"
done

video_json="${video_json}]"

cat > "${viewer_dir}/index.html" <<'HTML'
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Latest Playwright Video</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: system-ui, sans-serif;
        background: #0f1115;
        color: #f5f7fa;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background:
          radial-gradient(circle at top, rgba(85, 155, 255, 0.18), transparent 35%),
          linear-gradient(180deg, #0f1115, #08090c);
      }

      main {
        width: min(1400px, calc(100vw - 32px));
        padding: 24px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }

      p {
        margin: 0 0 16px;
        color: #b7c0cc;
      }

      .layout {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 20px;
        align-items: start;
      }

      video {
        width: 100%;
        border-radius: 14px;
        background: #000;
        box-shadow: 0 18px 48px rgba(0, 0, 0, 0.5);
      }

      .playlist {
        display: grid;
        gap: 10px;
        max-height: calc(100vh - 180px);
        overflow: auto;
      }

      .playlist button {
        width: 100%;
        text-align: left;
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(255, 255, 255, 0.05);
        color: inherit;
        border-radius: 10px;
        padding: 12px 14px;
        cursor: pointer;
      }

      .playlist button.is-active {
        border-color: rgba(85, 155, 255, 0.65);
        background: rgba(85, 155, 255, 0.16);
      }

      .meta {
        color: #8c97a5;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Latest Playwright Video</h1>
      <p>The playlist below contains every video from the latest Playwright run. The player starts automatically and advances to the next recording when one ends.</p>
      <div class="layout">
        <section>
          <video id="player" controls autoplay muted playsinline></video>
          <p id="current-label" class="meta"></p>
        </section>
        <aside class="playlist" id="playlist"></aside>
      </div>
    </main>
    <script>
      const videos = __VIDEO_LIST__;
      const player = document.getElementById("player");
      const playlist = document.getElementById("playlist");
      const currentLabel = document.getElementById("current-label");
      let currentIndex = 0;

      const renderPlaylist = () => {
        playlist.innerHTML = "";
        videos.forEach((video, index) => {
          const button = document.createElement("button");
          button.textContent = `${index + 1}. ${video.label}`;
          if (index === currentIndex) {
            button.classList.add("is-active");
          }
          button.addEventListener("click", () => loadVideo(index, true));
          playlist.appendChild(button);
        });
      };

      const loadVideo = (index, shouldPlay) => {
        currentIndex = index;
        player.src = `./${videos[index].file}`;
        currentLabel.textContent = videos[index].label;
        renderPlaylist();
        if (shouldPlay) {
          player.play().catch(() => {});
        }
      };

      player.addEventListener("ended", () => {
        const nextIndex = (currentIndex + 1) % videos.length;
        loadVideo(nextIndex, true);
      });

      loadVideo(0, true);
    </script>
  </body>
</html>
HTML

python3 - <<PY
from pathlib import Path

index_path = Path("${viewer_dir}") / "index.html"
content = index_path.read_text(encoding="utf-8")
content = content.replace("__VIDEO_LIST__", """${video_json}""")
index_path.write_text(content, encoding="utf-8")
PY

if [ -f "${pid_file}" ]; then
  old_pid="$(cat "${pid_file}")"
  if kill -0 "${old_pid}" >/dev/null 2>&1; then
    kill "${old_pid}" >/dev/null 2>&1 || true
  fi
fi

nohup python3 -m http.server "${video_port}" --bind 0.0.0.0 --directory "${viewer_dir}" > "${log_file}" 2>&1 &
server_pid=$!
echo "${server_pid}" > "${pid_file}"

viewer_url="http://127.0.0.1:${video_port}"

if [ -n "${DISPLAY:-}" ] && command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${viewer_url}" >/dev/null 2>&1 || true
elif [ -n "${WAYLAND_DISPLAY:-}" ] && command -v xdg-open >/dev/null 2>&1; then
  xdg-open "${viewer_url}" >/dev/null 2>&1 || true
elif command -v open >/dev/null 2>&1; then
  open "${viewer_url}" >/dev/null 2>&1 || true
fi

echo "Latest Playwright run: ${run_dir}"
echo "Video viewer running at ${viewer_url}"
echo "If you are on a remote server, forward port ${video_port} and open the forwarded URL locally."
