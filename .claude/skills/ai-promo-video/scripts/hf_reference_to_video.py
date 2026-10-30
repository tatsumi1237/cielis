"""AUTO VIXS: generate the two 10s halves with Seedance 2.0 reference-to-video.
Usage: python hf_generate.py 1   (cuts 1-5)   /   python hf_generate.py 2   (cuts 6-8)
Key is read from ../.env (HF_API_KEY=ID:SECRET).
"""
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

COMMON = ("Vertical 9:16 cinematic Japanese corporate recruiting commercial for a car maintenance company. "
          "Realistic, warm, trustworthy. Hard cuts between shots exactly at the listed times. Keep every person, "
          "the navy uniform with emerald-green accents, the family and the cars identical to the reference images. "
          "AUDIO: only realistic sound effects and a gentle cinematic piano + strings score. "
          "ABSOLUTELY NO voice, NO narration, NO dialogue, NO singing, NO vocals. No on-screen text or subtitles. ")

PARTS = {
    1: {
        "images": ["frame1.png", "frame2.png", "frame7.png", "frame3.png", "frame4.png"],
        "prompt": COMMON + (
            "Shot list (10 seconds): "
            "0.0-2.4s [Image 1]: extreme close-up of gloved hands tightening a wheel nut with a torque wrench, "
            "slow push-in; sound: a crisp torque-wrench click, low soft piano note begins. "
            "2.4-4.9s [Image 2]: close-up of the young mechanic looking up under a car on a lift, focused, slight "
            "low angle, subtle handheld; sound: low hum of the lift. "
            "4.9-6.2s [Image 3]: high-angle overhead wide shot of the large bright service center, many mechanics "
            "working in sync, camera glides slowly forward; strings enter softly. "
            "6.2-7.4s [Image 4]: extreme close-up, no face, a flashlight beam sweeps across a brake disc, slight "
            "lateral move; sound: flashlight click. "
            "7.4-10.0s [Image 5]: at the bright bay exit the same mechanic gently hands the car key to the family; "
            "the little girl takes it with a big smile, static camera; sound: soft key jingle, music turns warm."),
    },
    2: {
        "images": ["frame8.png", "frame5.png", "frame6.png"],
        "prompt": COMMON + (
            "Shot list (10 seconds): "
            "0.0-1.7s [Image 1]: inside the car, the father fastens his smiling daughter's child-seat belt, they "
            "smile at each other, soft backlight; sound: seatbelt buckle click. "
            "1.7-5.2s [Image 2]: dynamic aerial drone shot at golden hour: the white family car drives out of the "
            "AUTO VIXS store onto the road while mechanics wave from the service bays; the drone follows the car "
            "and sweeps up in a wide arc; keep the store design, rooftop sign and pylon sign as in the reference; "
            "sound: gentle engine, music swells to its peak. "
            "5.2-10.0s [Image 3]: the team of mechanics standing proudly in front of the store at dusk, main "
            "mechanic in the center, very slow push-in, calm and confident; music resolves and fades with a long "
            "gentle tail. Leave the upper third of the frame clean (sky) for text added later."),
    },
}


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


def upload(name, key):
    info = call("POST", f"{BASE}/files/generate-upload-url", key, {"content_type": "image/png"})
    with open(os.path.join(HERE, name), "rb") as f:
        req = urllib.request.Request(info["upload_url"], data=f.read(), method="PUT",
                                     headers=info.get("upload_headers", {"Content-Type": "image/png"}))
    urllib.request.urlopen(req, timeout=120).read()
    return info["public_url"]


def main():
    n = int(sys.argv[1])
    part, key = PARTS[n], load_key()
    urls = [upload(img, key) for img in part["images"]]
    print(f"part{n}: uploaded {len(urls)} images")
    payload = {"prompt": part["prompt"], "image_urls": urls, "duration": 10,
               "resolution": "480p", "aspect_ratio": "9:16", "generate_audio": True}
    res = call("POST", f"{BASE}/bytedance/seedance-2.0/reference-to-video", key, payload, idem=True)
    print(f"part{n}: submitted {res.get('request_id')}")
    while True:
        time.sleep(8)
        st = call("GET", res["status_url"], key)
        if st.get("status") not in ("queued", "in_progress"):
            break
    print(f"part{n}: {st.get('status')}")
    url = (st.get("video") or {}).get("url")
    if not url:
        sys.exit(json.dumps(st, ensure_ascii=False)[:800])
    out = os.path.join(HERE, f"part{n}.mp4")
    urllib.request.urlretrieve(url, out)
    print(f"part{n}: saved {out}")


if __name__ == "__main__":
    main()
