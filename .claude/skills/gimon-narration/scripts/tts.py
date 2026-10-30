"""ElevenLabs でナレーションを生成する。

usage: python -I tts.py --text-file 台本.txt --voice <voice_id> --out out.mp3
                       [--model eleven_multilingual_v2] [--stability 0.5] [--similarity 0.75] [--style 0.0]

キーは環境変数 ELEVENLABS_API_KEY（無ければ Windows のユーザー環境変数）から読む。値は表示しない。
"""
import argparse, json, os, subprocess, sys, urllib.request, urllib.error


def get_key():
    k = os.environ.get('ELEVENLABS_API_KEY')
    if not k and os.name == 'nt':
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as h:
                k = winreg.QueryValueEx(h, 'ELEVENLABS_API_KEY')[0]
        except OSError:
            k = None
    return k


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--text-file', required=True)
    # 既定は、ユーザーが聞き比べて決めた設定（eleven_v3・Will）
    p.add_argument('--voice', default='bIHbv24MWmeRgasZH58o')
    p.add_argument('--out', required=True)
    p.add_argument('--model', default='eleven_v3')
    p.add_argument('--stability', type=float, default=0.5)
    p.add_argument('--similarity', type=float, default=0.75)
    p.add_argument('--style', type=float, default=0.0)
    a = p.parse_args()

    key = get_key()
    if not key:
        sys.exit('ELEVENLABS_API_KEY が未設定です（環境変数に設定してください。Windows は setx のあと、ターミナルを開き直す）')
    if not key.startswith('sk_') or len(key) < 40:
        sys.exit('ELEVENLABS_API_KEY の形式が違います（sk_ で始まる約51文字のはずです）')

    with open(a.text_file, encoding='utf-8') as f:
        text = f.read().strip()
    print('chars:', len(text))

    body = json.dumps({
        'text': text,
        'model_id': a.model,
        'voice_settings': {'stability': a.stability, 'similarity_boost': a.similarity, 'style': a.style, 'use_speaker_boost': True},
    }).encode('utf-8')
    url = f'https://api.elevenlabs.io/v1/text-to-speech/{a.voice}?output_format=mp3_44100_128'
    req = urllib.request.Request(url, data=body, method='POST', headers={'xi-api-key': key, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r, open(a.out, 'wb') as o:
            o.write(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f'HTTP {e.code}: {e.read().decode("utf-8", "replace")[:400]}')

    print('saved:', a.out, os.path.getsize(a.out), 'bytes')
    try:
        d = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.out], capture_output=True, text=True).stdout.strip()
        print('duration(s):', d)
    except FileNotFoundError:
        pass


if __name__ == '__main__':
    main()
