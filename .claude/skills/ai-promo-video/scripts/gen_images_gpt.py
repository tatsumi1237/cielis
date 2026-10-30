"""Recruiting video storyboard frames via OpenAI gpt-image-2.
Usage: python gen_images.py 2          -> frame2.png (main mechanic, used as character reference)
       python gen_images.py 1 3 4 5 6  -> other frames (3, 4, 6 use frame2.png as reference)
"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.environ.get("OPENAI_ENV_FILE") or os.path.join(os.path.dirname(HERE), ".env")  # 環境変数 OPENAI_API_KEY があればそれを優先
MODEL = "gpt-image-2"
SIZE = "1024x1536"

STYLE = (" Vertical 9:16 composition, cinematic Japanese corporate recruiting commercial, realistic photography, "
         "natural skin, shallow depth of field, warm and trustworthy mood, clean modern auto service center. "
         "Uniform: dark navy work jumpsuit with emerald-green accent stripes and a small plain green circular "
         "emblem on the chest (no readable text, no real brand logos). No text overlays anywhere.")

SAME = (" The mechanic must be the exact same person as in the reference image (same face, hairstyle, "
        "age, and navy uniform with green accents).")

FRAMES = {
    1: ("Extreme close-up of a mechanic's hands in black work gloves tightening a wheel nut with a torque "
        "wrench on a car wheel, sparks of light from the shop's overhead LEDs, metallic details, strong "
        "focus on hands and tool."),
    2: ("Medium close-up of a Japanese male mechanic in his late 20s, short black hair, serious and focused "
        "expression, looking up at the underside of a car raised on a lift, inside a bright clean auto "
        "service bay, soft light falling on his face."),
    3: ("Extreme close-up detail shot, no face visible: a gloved hand holds a small flashlight whose bright beam "
        "rakes across a brake disc and brake caliper behind a car wheel, revealing the metal surface texture; "
        "shallow depth of field, dark background, the beam is the main light source. Only the gloved hand and "
        "the navy sleeve with a green accent stripe are visible."),
    4: ("At the exit of a bright auto service bay, the same mechanic, smiling gently, hands car keys to a young "
        "Japanese family: father, mother, and a small daughter about 5 years old who smiles up at him. "
        "Warm afternoon sunlight from the open bay door." + SAME),
    5: ("Dynamic aerial drone shot at golden hour, high above and slightly behind: a white family hatchback "
        "pulls out of a large, realistic Japanese roadside car maintenance and car-parts megastore onto a "
        "suburban arterial road. The store is detailed and lively, NOT plain: a wide two-story building with a "
        "large glass storefront showing tire racks and car accessories inside; a big illuminated rooftop sign "
        "with the brand name 'AUTO VIXS' in bold white letters next to an emerald-green circular emblem on a "
        "dark-navy panel; a tall roadside pylon sign with the same 'AUTO VIXS' logo; a row of six numbered "
        "service bays with open shutters and cars on lifts inside; green and navy promotional flags along the "
        "edge of a spacious parking lot with customers' cars parked; a tire storage area and a canopy over the "
        "drop-off lane. Several small mechanics in navy uniforms wave from the bay entrance. Color scheme: navy, "
        "white, emerald green only (no orange). Long warm shadows, sweeping cinematic perspective, hopeful mood."),
    6: ("Group shot of six diverse Japanese mechanics (men and women of various ages) standing confidently "
        "side by side in front of a modern auto service center at dusk, all in the same navy uniform with "
        "green accents, the main mechanic from the reference stands in the center, warm lights glowing "
        "inside the building. Leave clear empty space in the upper third of the frame for text added later."
        + SAME),
    7: ("High-angle wide shot looking down from near the ceiling of a large, bright, spotless modern auto "
        "service center: several cars raised on lifts in neat rows, many mechanics in the same navy uniform "
        "working in sync; people appear small in the frame, no close-up faces. Geometric, orderly composition "
        "that shows scale and teamwork."),
    8: ("Inside a family car parked at a service center, the father from the reference image (same face, "
        "wearing his casual beige button-up shirt, NOT a work uniform) gently fastens the seatbelt of his "
        "smiling daughter from the reference image (same face and beige overalls) in a child seat in the back. "
        "Warm soft afternoon light through the window, close and tender moment, shot from inside the car. "
        "No mechanic in this shot."),
}


def key():
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"].strip()
    if os.path.exists(ENV):
        for line in open(ENV, encoding="utf-8"):
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip().strip('"').strip("'")
    sys.exit("OPENAI_API_KEY not found (環境変数、または OPENAI_ENV_FILE / ../.env に設定)")


def save(resp, name):
    with open(os.path.join(HERE, name), "wb") as f:
        f.write(base64.b64decode(resp["data"][0]["b64_json"]))
    print("saved", name)


def generate(prompt, name):
    body = json.dumps({"model": MODEL, "prompt": prompt, "size": SIZE, "quality": "high", "n": 1}).encode()
    req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=body, method="POST",
                                 headers={"Authorization": "Bearer " + key(), "Content-Type": "application/json"})
    save(json.load(urllib.request.urlopen(req, timeout=600)), name)


def edit(prompt, ref, name):
    boundary = uuid.uuid4().hex
    parts = []
    for k, v in (("model", MODEL), ("prompt", prompt), ("size", SIZE), ("quality", "high"), ("n", "1")):
        parts.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{k}"\r\n\r\n{v}\r\n'.encode())
    with open(os.path.join(HERE, ref), "rb") as f:
        img = f.read()
    parts.append((f'--{boundary}\r\nContent-Disposition: form-data; name="image[]"; filename="{ref}"\r\n'
                  f'Content-Type: image/png\r\n\r\n').encode() + img + b"\r\n")
    parts.append(f"--{boundary}--\r\n".encode())
    req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=b"".join(parts), method="POST",
                                 headers={"Authorization": "Bearer " + key(),
                                          "Content-Type": f"multipart/form-data; boundary={boundary}"})
    save(json.load(urllib.request.urlopen(req, timeout=600)), name)


def main():
    for n in [int(a) for a in sys.argv[1:]]:
        prompt = FRAMES[n] + STYLE
        if n == 8:
            edit(FRAMES[n] + " Vertical 9:16 composition, cinematic realistic photography, warm and trustworthy "
                 "mood. No text overlays.", "frame4.png", f"frame{n}.png")
        elif n in (3, 4, 6, 7):  # uniform/character reference
            edit(prompt, "frame2.png", f"frame{n}.png")
        else:
            generate(prompt, f"frame{n}.png")


if __name__ == "__main__":
    try:
        main()
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code}: {e.read().decode(errors='replace')[:800]}")
