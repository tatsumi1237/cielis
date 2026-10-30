"""Continue black_cat_sunset.mp4 with Seedance 2.0 image-to-video, starting from its last frame."""
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = "https://api.higgsfield.ai"
HERE = os.path.dirname(os.path.abspath(__file__))
FFMPEG = os.environ.get("FFMPEG", "ffmpeg")  # PATH 上の ffmpeg（別の場所なら環境変数 FFMPEG）
ENV = os.path.join(HERE, ".env")


def load_key():
    if os.environ.get("HF_API_KEY"):
        return os.environ["HF_API_KEY"].strip()
    if os.path.exists(ENV):
        for line in open(ENV, encoding="utf-8"):
            if line.startswith("HF_API_KEY="):
                return line.split("=", 1)[1].strip()
    sys.exit("HF_API_KEY not found (環境変数、または .env に設定)")


def call(method, url, key, body=None, idem=False):
    headers = {"Authorization": f"Key {key}", "Content-Type": "application/json",
               "Accept": "application/json", "User-Agent": "hf-continue/1.0"}
    if idem:
        headers["Idempotency-Key"] = str(uuid.uuid4())
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode(errors='replace')[:800]}")


def upload(path, key):
    info = call("POST", f"{BASE}/files/generate-upload-url", key, {"content_type": "image/png"})
    with open(path, "rb") as f:
        req = urllib.request.Request(info["upload_url"], data=f.read(), method="PUT",
                                     headers=info.get("upload_headers", {"Content-Type": "image/png"}))
    urllib.request.urlopen(req, timeout=120).read()
    return info["public_url"]


def main():
    key = load_key()
    src = os.path.join(HERE, "black_cat_sunset.mp4")
    frame = os.path.join(HERE, "last_frame.png")
    subprocess.run([FFMPEG, "-y", "-sseof", "-0.1", "-i", src, "-update", "1", "-frames:v", "1", frame],
                   check=True, capture_output=True)
    image_url = upload(frame, key)
    print("uploaded last frame")

    payload = {
        "image_url": image_url,
        "prompt": ("Seamless continuation of the same shot. The black cat keeps walking slowly along the "
                   "sandy beach at sunset, and the camera continues its smooth slow orbit around the cat "
                   "at the same speed and direction. Same warm golden-hour light, glowing orange and pink "
                   "sky, gentle waves, soft rim light on the fur, dreamy fantastical atmosphere with "
                   "floating light particles, film-like color grading, movie scene."),
        "duration": 5,
        "resolution": "480p",
        "generate_audio": False,
    }
    res = call("POST", f"{BASE}/bytedance/seedance-2.0/image-to-video", key, payload, idem=True)
    print("submitted:", res.get("request_id"))
    while True:
        time.sleep(5)
        st = call("GET", res["status_url"], key)
        print("status:", st.get("status"))
        if st.get("status") not in ("queued", "in_progress"):
            print(json.dumps(st, ensure_ascii=False, indent=2))
            return


if __name__ == "__main__":
    main()
