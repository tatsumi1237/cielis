"""Regenerate cut 8 (team group shot): Seedance 2.0 image-to-video from the sharp still frame6.png, 720p."""
import json
import os
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = "https://api.higgsfield.ai"
HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.path.join(os.path.dirname(HERE), ".env")

PROMPT = ("Keep this exact group photo as the first frame. Six Japanese mechanics in navy uniforms stand calmly "
          "in front of the store at dusk. Extremely subtle motion only: very slow, steady, stabilized camera "
          "push-in; the people stay almost still with natural breathing and a slight confident smile; hair and "
          "clothes move very slightly in a light breeze. All faces stay sharp, stable and perfectly consistent "
          "with the first frame: no face morphing, no warping, no blur, no changes in identity or expression. "
          "Keep the upper third of the frame as clean sky with no text, no logo, no signs. "
          "AUDIO: only a soft, warm orchestral music tail. No voice, no speech.")


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
               "Accept": "application/json", "User-Agent": "hf-video/1.0"}
    if idem:
        headers["Idempotency-Key"] = str(uuid.uuid4())
    data = json.dumps(body).encode() if body is not None else None
    try:
        with urllib.request.urlopen(urllib.request.Request(url, data=data, headers=headers, method=method),
                                    timeout=60) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode(errors='replace')[:800]}")


def main():
    key = load_key()
    info = call("POST", f"{BASE}/files/generate-upload-url", key, {"content_type": "image/png"})
    with open(os.path.join(HERE, "frame6.png"), "rb") as f:
        urllib.request.urlopen(urllib.request.Request(info["upload_url"], data=f.read(), method="PUT",
                               headers=info.get("upload_headers", {"Content-Type": "image/png"})), timeout=120).read()
    payload = {"image_url": info["public_url"], "prompt": PROMPT, "duration": 4, "resolution": "720p",
               "generate_audio": True}
    res = call("POST", f"{BASE}/bytedance/seedance-2.0/image-to-video", key, payload, idem=True)
    print("cut8: submitted", res.get("request_id"))
    while True:
        time.sleep(8)
        st = call("GET", res["status_url"], key)
        if st.get("status") not in ("queued", "in_progress"):
            break
    url = (st.get("video") or {}).get("url")
    if not url:
        sys.exit(json.dumps(st, ensure_ascii=False)[:800])
    urllib.request.urlretrieve(url, os.path.join(HERE, "cut8_new.mp4"))
    print("cut8: saved", st.get("status"))


if __name__ == "__main__":
    main()
