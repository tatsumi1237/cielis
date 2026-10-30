"""効果音とBGMを合成する。usage: python audio.py <out.wav> [duration=30.3]"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile

SR = 48000
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 30.3
N = int(SR * DUR)
rng = np.random.default_rng(7)
t = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo, hi], btype='band', fs=SR, output='sos'), x)


def lp(x, f, order=2):
    return sosfilt(butter(order, f, btype='low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, btype='high', fs=SR, output='sos'), x)


def env(n, a, d):
    e = np.ones(n)
    na, nd = int(a * SR), int(d * SR)
    if na: e[:na] = np.linspace(0, 1, na)
    if nd: e[-nd:] *= np.linspace(1, 0, nd)
    return e


def place(sig, at, gain=1.0, pan=0.0):
    i = int(at * SR)
    if i >= N: return
    s = sig[:N - i] * gain
    L[i:i + len(s)] += s * np.sqrt((1 - pan) / 2)
    R[i:i + len(s)] += s * np.sqrt((1 + pan) / 2)


def seg(a, b):
    return slice(int(a * SR), min(N, int(b * SR)))


def ease(k):
    k = np.clip(k, 0, 1)
    return np.where(k < .5, 4 * k ** 3, 1 - (-2 * k + 2) ** 3 / 2)


def pluck(freq, dur, bright=0.5):
    # Karplus-Strong（弦をはじいた音）
    n = int(dur * SR); p = int(SR / freq)
    buf = rng.uniform(-1, 1, p); out = np.empty(n)
    for i in range(n):
        j = i % p
        out[i] = buf[j]
        buf[j] = 0.996 * 0.5 * (buf[j] + buf[(j + 1) % p])
    return lp(out, 2500 + 4000 * bright) * env(n, 0.002, dur * 0.6)


def svf_bp(x, fc, damp=0.9):
    # 中心周波数が時間で変わるバンドパス（状態変数フィルター）
    f = 2 * np.sin(np.pi * np.clip(fc, 20, SR / 6) / SR)
    low = band = 0.0; out = np.empty_like(x)
    for i in range(len(x)):
        high = x[i] - low - damp * band
        band += f[i] * high; low += f[i] * band
        out[i] = band
    return out


def bell(freq, dur):
    n = int(dur * SR); tt = np.arange(n) / SR; s = np.zeros(n)
    for m, a, dk in [(1, 1, 2.2), (2.01, .45, 3.2), (3.03, .25, 4.5), (4.2, .15, 6), (5.4, .08, 8)]:
        s += a * np.sin(2 * np.pi * freq * m * tt) * np.exp(-dk * tt)
    return s * env(n, 0.003, 0.2)


def saw(freq, n):
    ph = (np.arange(n) * freq / SR) % 1.0
    return 2 * ph - 1


def whoosh(dur, f0, f1, rev=False):
    n = int(dur * SR); x = rng.standard_normal(n)
    out = svf_bp(x, np.geomspace(f0, f1, n)) * 0.6
    e = np.sin(np.linspace(0, np.pi, n)) ** 2
    return out * (e[::-1] if rev else e)


def thump(freq=60, dur=0.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * freq * tt * (1 + 0.6 * np.exp(-tt * 25))) * np.exp(-tt * 9)


# ---------------- 交差点（0〜3.32） ----------------
CT0, CT1 = 0.55, 2.75
rem = 1 - ease((t - CT0) / (CT1 - CT0))
babble = bp(rng.standard_normal(N), 250, 2200)
am = lp(np.abs(rng.standard_normal(N)), 6) * 4
crowd = babble * (0.55 + am) * rem * 0.11
traffic = lp(rng.standard_normal(N), 180) * 0.25
city = (crowd + traffic * (0.4 + 0.6 * rem)) * (t < 3.32)
city *= np.clip((3.32 - t) / 0.05, 0, 1) * np.clip(t / 0.15, 0, 1)
L += city; R += city * 0.96
# 消える瞬間の「キラッ」（消える人数の多い時間ほど密に）
u = rng.uniform(0, 1, 260)
lo, hi = 0.0, 1.0
times = []
for v in u:
    a, b = 0.0, 1.0
    for _ in range(30):
        m = (a + b) / 2
        if float(ease(np.array([m]))[0]) < v: a = m
        else: b = m
    times.append(CT0 + (CT1 - CT0) * (a + b) / 2)
for tm in times:
    f = rng.uniform(2600, 5200); n = int(0.09 * SR); tt = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 55) + 0.4 * np.sin(2 * np.pi * f * 1.5 * tt) * np.exp(-tt * 70)
    place(s, tm, 0.022, rng.uniform(-.8, .8))
# 吸い込まれる上昇音と、100人になった瞬間の鐘
rise = whoosh(2.3, 300, 6000) * np.linspace(0.2, 1, int(2.3 * SR)) ** 2
place(rise, 0.5, 0.10)
place(bell(1046.5, 2.0), CT1, 0.16, -0.1); place(bell(1568, 1.6), CT1 + 0.01, 0.07, 0.15)
place(thump(55, 0.6), CT1, 0.3)

# ---------------- 場面転換 ----------------
place(whoosh(0.55, 4000, 250), 3.32 - 0.3, 0.16)
place(whoosh(0.6, 3000, 300), 8.25 - 0.32, 0.13)

# ---------------- 日本地図（3.32〜8.25） ----------------
place(thump(48, 0.9), 3.36, 0.35)
place(bell(523.25, 1.2) * 0.6, 3.36, 0.08)
for i, (tm, f) in enumerate([(5.75 + .25, 659.25), (6.0 + .25, 783.99), (6.25 + .25, 1046.5)]):
    place(whoosh(0.32, 2500, 600), tm - 0.32, 0.05, (-.4, .4, 0)[i])
    place(thump(70, 0.35), tm, 0.22)
    place(pluck(f, 0.9, 0.3), tm, 0.22, (-.3, .3, 0)[i])

# ---------------- 草原（8.25〜） ----------------
wind = lp(rng.standard_normal(N), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.23 * t + 1) ** 2)
wind = hp(wind, 120) * 0.11 * np.clip((t - 8.2) / 0.4, 0, 1) * np.clip((12.3 - t) / 0.15, 0, 1)
L += wind; R += lp(wind, 600) * 1.05
for tm in [8.9, 9.25, 10.4, 10.62, 11.5]:
    n = int(rng.uniform(0.08, 0.16) * SR); tt = np.arange(n) / SR
    f0 = rng.uniform(3200, 4600); f = f0 + 900 * np.sin(2 * np.pi * rng.uniform(18, 30) * tt)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2
    place(s, tm, 0.035, rng.uniform(-.7, .7))
    place(s, tm + 0.16, 0.025, rng.uniform(-.7, .7))

# ---------------- BGM ----------------
def pad(freqs, a, b, gain, cutoff):
    s = seg(a, b); n = s.stop - s.start; x = np.zeros(n)
    for f in freqs:
        for d in (-0.08, 0, 0.07):
            x += saw(f * (1 + d / 100), n)
    x = lp(x, cutoff, 2) / (len(freqs) * 3)
    x *= env(n, 0.35, 0.3)
    L[s] += x * gain; R[s] += np.roll(x, 240) * gain

# 0〜3.32：張りつめた持続音（Am系）＋刻み
pad([110, 164.81, 220, 261.63], 0.0, 3.4, 0.10, 900)
for k in range(13):
    tm = 0.25 * k + 0.1; n = int(0.05 * SR); tt = np.arange(n) / SR
    place(np.sin(2 * np.pi * 1760 * tt) * np.exp(-tt * 90), tm, 0.02 + 0.015 * (k / 12), 0.3 if k % 2 else -0.3)
# 3.32〜8.25：明るい分散和音（C → G → Am → F）
bpm = 104; beat = 60 / bpm
chords = [[261.63, 329.63, 392.0, 523.25], [196.0, 246.94, 293.66, 392.0], [220.0, 261.63, 329.63, 440.0], [174.61, 220.0, 261.63, 349.23]]
pad([130.81, 196.0, 261.63], 3.32, 8.35, 0.06, 1400)
k = 0; tm = 3.32
while tm < 8.2:
    ch = chords[int((tm - 3.32) / (beat * 4)) % 4]
    place(pluck(ch[k % 4], 0.7, 0.4), tm, 0.06, (-.35, .35)[k % 2]); k += 1; tm += beat / 2
# 8.25〜：ひらけた明るい持続音（F→C）＋きらめき
pad([174.61, 261.63, 349.23, 440.0], 8.25, 10.3, 0.07, 2200)
pad([130.81, 261.63, 329.63, 392.0], 10.2, 12.3, 0.07, 2200)
for i, f in enumerate([1046.5, 1318.5, 1568.0, 2093.0, 1568.0, 1318.5]):
    place(bell(f, 1.2) * 0.5, 8.4 + i * 0.6, 0.035, (-.5, .5)[i % 2])

# ================= 12.3〜30.3：住宅街・海・ゴルフ場・道路・夕暮れの交差点 =================
if DUR > 12.3:
    # 場面転換の風切り音
    for tc in (12.3, 21.45, 22.2, 23.15):
        place(whoosh(0.45, 3500, 400), tc - 0.25, 0.11)
    # 明るい曲（12.3〜25.95）：分散和音＋持続音＋軽い刻み
    k = 0; tm = 12.3
    while tm < 25.85:
        ch = chords[int((tm - 12.3) / (beat * 4)) % 4]
        place(pluck(ch[k % 4], 0.7, 0.45), tm, 0.055, (-.35, .35)[k % 2])
        if k % 2 == 0: place(pluck(ch[0] / 2, 0.9, 0.2), tm, 0.05)
        n = int(0.03 * SR); place(hp(rng.standard_normal(n), 6000) * np.exp(-np.arange(n) / SR * 120), tm + beat / 4, 0.018, .4)
        k += 1; tm += beat / 2
    for a, b, fr in ((12.3, 16.9, [130.81, 196.0, 261.63, 329.63]), (16.8, 21.5, [174.61, 220.0, 261.63, 349.23]), (21.4, 26.0, [196.0, 246.94, 293.66, 392.0])):
        pad(fr, a, b, 0.05, 1600)
    # 住宅街：ピンが立つ「ポッ」（波紋のように広がる時間に合わせて密に）
    for i in range(70):
        tm = 13.3 + rng.gamma(2.0, 0.28)
        if tm > 15.2: continue
        f = rng.uniform(700, 1400); n = int(0.07 * SR); tt = np.arange(n) / SR
        s = np.sin(2 * np.pi * f * (1 + 0.6 * np.exp(-tt * 60)) * tt) * np.exp(-tt * 45)
        place(s, tm, 0.03, rng.uniform(-.7, .7))
    # 金のピン（17.9）と「家賃0円」（19.05）
    place(bell(1318.5, 1.8), 17.9, 0.12, 0.1); place(bell(1975.5, 1.4), 17.95, 0.06, -0.1)
    for i, f in enumerate([2093.0, 2637.0, 3136.0, 4186.0]):
        place(bell(f, 0.6) * 0.6, 17.95 + i * 0.07, 0.04, (-.4, .4)[i % 2])
    for i in range(6):
        place(bell(2600 + i * 180, 0.35), 19.05 + i * 0.045, 0.045, rng.uniform(-.5, .5))
    place(thump(90, 0.3), 19.05, 0.18)
    # 海：寄せる波
    seg_n = int(0.9 * SR); x = lp(rng.standard_normal(seg_n), 1800) * np.sin(np.linspace(0, np.pi, seg_n)) ** 1.5
    place(x, 21.4, 0.22); place(lp(rng.standard_normal(seg_n), 500) * np.sin(np.linspace(0, np.pi, seg_n)), 21.4, 0.15)
    # 海：カモメ
    for tm in (21.6, 21.95):
        n = int(0.25 * SR); tt = np.arange(n) / SR; f = 1500 + 700 * np.exp(-tt * 10) - 300 * tt
        place(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) * (1 + .3 * np.sin(2 * np.pi * 30 * tt)), tm, 0.025, rng.uniform(-.6, .6))
    # ゴルフ場：鳥とそよ風、芝を踏む足音（歩く周期 0.95Hz → 1歩およそ0.53秒）
    for tm in (22.35, 22.62, 22.9):
        n = int(0.12 * SR); tt = np.arange(n) / SR; f = 3800 + 900 * np.sin(2 * np.pi * 24 * tt)
        place(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / tt[-1]) ** 2, tm, 0.03, rng.uniform(-.6, .6))
    for tm in (22.2 + 0.11, 22.2 + 0.64):
        n = int(0.14 * SR); tt = np.arange(n) / SR
        step = bp(rng.standard_normal(n), 300, 2500) * np.exp(-tt * 38) + 0.5 * np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 45)
        place(step, tm, 0.09, (-.1, .1)[int(tm * 10) % 2])
    # 道路：猛スピードのスーパーカー（エンジンの唸り＋風切り＋追い越していく音）
    sl = seg(23.15, 25.95); n = sl.stop - sl.start; tt = np.arange(n) / SR
    rpm = 95 + 40 * np.clip(tt / 0.6, 0, 1) + 6 * np.sin(2 * np.pi * 0.7 * tt)        # エンジンの基本周波数（Hz）
    ph = 2 * np.pi * np.cumsum(rpm) / SR
    eng = sum(np.sin(ph * h) / h ** 0.8 for h in range(1, 9)) + 0.4 * np.sign(np.sin(ph * 2)) * 0.3
    eng = lp(np.tanh(eng * 1.6), 3200)
    near = np.exp(-((tt - 0.85) / 0.45) ** 2)                                         # カメラの横を抜ける瞬間がいちばん大きい
    vol = 0.05 + 0.2 * near + 0.06 * np.clip(1 - (tt - 1.3) / 1.4, 0, 1) * (tt > 1.3)
    eng *= vol * env(n, 0.03, 0.3)
    pan = np.clip((tt - 0.85) * 1.2, -1, 1)
    L[sl] += eng * np.sqrt((1 - pan) / 2) * 1.2; R[sl] += eng * np.sqrt((1 + pan) / 2) * 1.2
    rw = hp(lp(rng.standard_normal(n), 1400), 150) * (0.05 + 0.12 * near) * env(n, 0.05, 0.3); L[sl] += rw; R[sl] += rw * 0.95
    place(whoosh(0.7, 5000, 300), 23.15 + 0.55, 0.16)
    # 夕暮れの交差点（25.95〜）：曲を止め、沈む音と低いドーン、暗い持続音、心臓の鼓動のような低音
    place(whoosh(0.9, 2500, 120), 25.95 - 0.7, 0.14)
    place(thump(38, 2.2), 26.0, 0.3)
    place(bell(220, 3.0) * 0.5, 26.0, 0.06)
    E7 = min(DUR, 30.45)
    pad([55.0, 110.0, 130.81, 164.81], 26.0, E7, 0.11, 600)
    hb = 27.2
    while hb < E7 - 0.4:
        place(thump(50, 0.25), hb, 0.22); place(thump(46, 0.25), hb + 0.22, 0.15); hb += 1.05
    sl = seg(25.95, E7); n = sl.stop - sl.start
    amb = lp(rng.standard_normal(n), 220) * 0.18 * env(n, 0.5, 0.3); L[sl] += amb; R[sl] += amb

# ================= 30.3〜54.4：電気・病院・医師・手術室 =================
if DUR > 30.3:
    E = min(DUR, 54.4)
    for tc in (32.0, 37.6, 41.9, 44.5, 48.95):
        place(whoosh(0.4, 2500, 300), tc - 0.22, 0.07)
    # 全体を通す、静かで張りつめた短調の旋律と持続音
    # 心電図が止まる瞬間（53.35秒）に音楽も止め、「ピー」だけを残す
    pad([55.0, 110.0, 164.81, 220.0], 30.3, min(E, 53.45), 0.07, 700)
    motif = [440.0, 523.25, 493.88, 392.0, 440.0, 349.23, 329.63, 392.0]
    tm, i = 30.5, 0
    while tm < min(E - 0.5, 52.3):
        place(pluck(motif[i % len(motif)], 1.4, 0.25), tm, 0.045, (-.3, .3)[i % 2]); i += 1; tm += 1.2
    # 夜の住宅街：虫の声
    for k in range(40):
        tm = rng.uniform(30.3, 32.0); n = int(0.05 * SR); tt = np.arange(n) / SR
        place(np.sin(2 * np.pi * 4300 * tt) * (np.sin(2 * np.pi * 60 * tt) > 0) * np.sin(np.pi * tt / tt[-1]), tm, 0.012, rng.uniform(-.8, .8))
    # 送電線：電線のうなり → 火花 → 電源が落ちる下降音
    sl = seg(32.0, 37.6); n = sl.stop - sl.start; tt = np.arange(n) / SR
    hum = sum(np.sin(2 * np.pi * 50 * h * tt) / h for h in (1, 2, 3, 5, 7)) * (0.6 + 0.4 * np.clip(tt / 3.7, 0, 1))
    hum *= np.where(tt < 3.75, 1, np.clip(1 - (tt - 3.75) / 0.6, 0, 1)) * env(n, 0.3, 0.1) * 0.05
    L[sl] += hum; R[sl] += hum
    for k in range(14):
        n2 = int(rng.uniform(.02, .06) * SR); place(hp(rng.standard_normal(n2), 2000) * np.exp(-np.arange(n2) / SR * 60), 35.75 + rng.uniform(0, .35), 0.12, rng.uniform(-.5, .5))
    n2 = int(1.2 * SR); tt2 = np.arange(n2) / SR
    place(np.sin(2 * np.pi * np.cumsum(np.geomspace(320, 40, n2)) / SR) * np.exp(-tt2 * 2.5), 35.8, 0.14)
    place(thump(45, 0.9), 35.8, 0.25)
    # 明かりが消える：ブレーカーの「カチッ」が波のように続く
    for k in range(16):
        tm = 38.3 + k * 0.13 + rng.uniform(0, .06); n2 = int(0.03 * SR); tt2 = np.arange(n2) / SR
        place(bp(rng.standard_normal(n2), 1200, 6000) * np.exp(-tt2 * 160) + 0.6 * np.sin(2 * np.pi * 180 * tt2) * np.exp(-tt2 * 90), tm, 0.06 * (1 - k / 22), rng.uniform(-.6, .6))
    sl = seg(37.6, 44.5); n = sl.stop - sl.start
    wd = lp(rng.standard_normal(n), 400) * 0.12 * env(n, 1.0, 0.4); L[sl] += wd; R[sl] += lp(wd, 300)
    # 1000人の図：並ぶ音、医師が光る音
    for k in range(12):
        n2 = int(0.05 * SR); tt2 = np.arange(n2) / SR
        place(np.sin(2 * np.pi * (500 + k * 40) * tt2) * np.exp(-tt2 * 70), 44.5 + k * 0.07, 0.025, rng.uniform(-.5, .5))
    place(bell(1567.98, 1.6), 45.95, 0.1, -0.25); place(bell(2093.0, 1.4), 46.1, 0.08, 0.25)
    # 手術室：心電図の「ピッ」（画面の波形と同じ周期）→ 53.35秒で止まり「ピー」と鳴り続ける
    FLAT_T = 53.35
    k = int(48.95 * 1.15)
    while True:
        tm = (k + 0.3) / 1.15; k += 1
        if tm >= FLAT_T: break
        if tm < 48.95: continue
        n2 = int(0.09 * SR); tt2 = np.arange(n2) / SR
        place(np.sin(2 * np.pi * 980 * tt2) * env(n2, 0.004, 0.02), tm, 0.06, 0.2)
    if E > FLAT_T:
        n2 = int((E - FLAT_T) * SR); tt2 = np.arange(n2) / SR
        place(np.sin(2 * np.pi * 980 * tt2) * env(n2, 0.004, 0.08), FLAT_T, 0.075, 0.2)
        place(thump(42, 1.0), FLAT_T, 0.15)
    sl = seg(48.95, E); n = sl.stop - sl.start; tt = np.arange(n) / SR
    air = (hp(lp(rng.standard_normal(n), 1500), 200) * 0.05 + np.sin(2 * np.pi * 100 * tt) * 0.01) * env(n, 0.3, 0.3); L[sl] += air; R[sl] += air

# ================= 54.4〜87.2：缶詰・畑・種の存続・たき火・オチ =================
if DUR > 54.4:
    E = DUR
    for tc in (54.4, 58.9, 64.4, 73.3, 74.8, 77.6):
        place(whoosh(0.4, 2600, 300), tc - 0.22, 0.06)
    # 明るさが戻る曲（54.4〜64.4）
    k = 0; tm = 54.55
    while tm < 64.3:
        ch = chords[int((tm - 54.55) / (beat * 4)) % 4]
        place(pluck(ch[k % 4], 0.7, 0.4), tm, 0.045, (-.35, .35)[k % 2]); k += 1; tm += beat / 2
    pad([130.81, 196.0, 261.63], 54.4, 64.5, 0.045, 1300)
    # スーパー：店内のざわめき（空調）とカートの車輪
    sl = seg(54.4, 58.9); n = sl.stop - sl.start
    air = hp(lp(rng.standard_normal(n), 900), 120) * 0.04 * env(n, 0.2, 0.2); L[sl] += air; R[sl] += air
    tm = 54.5
    while tm < 58.85:
        n2 = int(0.02 * SR); place(bp(rng.standard_normal(n2), 1500, 5000) * np.exp(-np.arange(n2) / SR * 200), tm, 0.025, rng.uniform(-.2, .2)); tm += rng.uniform(.05, .11)
    # 畑：鳥、牛の声、風
    for tm in (59.4, 60.3, 62.1, 63.4):
        n2 = int(0.12 * SR); tt2 = np.arange(n2) / SR; f = 3600 + 800 * np.sin(2 * np.pi * 22 * tt2)
        place(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt2 / tt2[-1]) ** 2, tm, 0.03, rng.uniform(-.6, .6))
    n2 = int(1.3 * SR); tt2 = np.arange(n2) / SR; f0 = 160 - 40 * tt2 / 1.3
    moo = sum(np.sin(2 * np.pi * np.cumsum(f0 * h) / SR) / h for h in range(1, 7)); moo = bp(moo, 200, 1400) * np.sin(np.pi * tt2 / tt2[-1]) ** .7
    place(moo, 61.2, 0.12, 0.5)
    sl = seg(58.9, 64.4); n = sl.stop - sl.start; wd = hp(lp(rng.standard_normal(n), 700), 100) * 0.06 * env(n, 0.3, 0.3); L[sl] += wd; R[sl] += wd
    # 種の存続：張りつめた持続音、影の人が並ぶ「ポポポ」
    pad([73.42, 146.83, 174.61, 220.0], 64.4, 70.5, 0.08, 800)
    # 1人から100人へ増える「ポポポ」（画面と同じ時刻：最初の1人のあと加速）
    G0, G1 = 64.55, 66.2
    for n in range(0, 100, 3):
        tm = G0 if n == 0 else G0 + .45 + (G1 - G0 - .45) * (n / 99) ** .7
        n2 = int(0.045 * SR); tt2 = np.arange(n2) / SR
        place(np.sin(2 * np.pi * (520 + n * 9) * tt2) * np.exp(-tt2 * 70), tm, 0.03, rng.uniform(-.5, .5))
    place(bell(1318.5, 1.2), G1, 0.07)
    for k in range(18):
        n2 = int(0.05 * SR); tt2 = np.arange(n2) / SR
        place(np.sin(2 * np.pi * (300 + k * 15) * tt2) * np.exp(-tt2 * 60), 66.4 + k * 0.06, 0.016, rng.uniform(-.6, .6))
    # たき火（70.4〜）：パチパチ＋ゴーという炎の音
    sl = seg(70.4, E); n = sl.stop - sl.start
    roar = lp(rng.standard_normal(n), 350) * 0.09 * env(n, 0.6, 0.6); L[sl] += roar; R[sl] += roar * .95
    tm = 70.5
    while tm < E - 0.3:
        n2 = int(rng.uniform(.004, .015) * SR); place(hp(rng.standard_normal(n2), 1800) * np.exp(-np.arange(n2) / SR * 300), tm, rng.uniform(.03, .1), rng.uniform(-.7, .7)); tm += rng.exponential(.09)
    # 集まってくる足音（70.4〜73.3）
    for k in range(50):
        tm = rng.uniform(70.5, 73.2); n2 = int(0.08 * SR); tt2 = np.arange(n2) / SR
        place(bp(rng.standard_normal(n2), 200, 2000) * np.exp(-tt2 * 45), tm, 0.025, rng.uniform(-.8, .8))
    # あたたかい曲（Am → F → C → G）がだんだん広がり、最後に大きな和音で終わる
    prog = [[220.0, 261.63, 329.63, 440.0], [174.61, 220.0, 261.63, 349.23], [130.81, 196.0, 261.63, 329.63], [196.0, 246.94, 293.66, 392.0]]
    k = 0; tm = 70.6; bt = 60 / 92
    while tm < 84.1:
        ch = prog[int((tm - 70.6) / (bt * 4)) % 4]; g = 0.035 + 0.03 * (tm - 70.6) / 13.5
        place(pluck(ch[k % 4], 1.0, 0.35), tm, g, (-.4, .4)[k % 2]); k += 1; tm += bt / 2
    for i, fr in enumerate(prog):
        a = 70.6 + i * bt * 4
        while a < 84.1:
            pad([f / 2 for f in fr[:3]], a, min(a + bt * 4 + .1, 84.2), 0.05, 1400); a += bt * 16
    # 焼き網のジューッ（74.8〜76.2）、ギターのストローク（76.2〜77.6）、流れ星（84.7）
    sl = seg(74.8, 76.2); n = sl.stop - sl.start
    sz = hp(rng.standard_normal(n), 3000) * (0.6 + 0.4 * np.abs(lp(rng.standard_normal(n), 8)) * 3) * 0.035 * env(n, 0.1, 0.15); L[sl] += sz; R[sl] += sz
    tm = 76.2
    while tm < 77.55:
        ch = prog[int((tm - 70.6) / (bt * 4)) % 4]
        for j, f in enumerate(ch): place(pluck(f, 0.8, 0.55), tm + j * 0.012, 0.03, 0.2)
        tm += bt / 2
    for i in range(10):
        place(bell(2600 + i * 220, 0.5) * 0.5, 84.7 + i * 0.06, 0.03, -.6 + i * .12)
    pad([130.81, 196.0, 261.63, 329.63, 392.0], 84.21, E, 0.1, 2400)
    place(bell(1046.5, 3.0), 84.21, 0.1, -0.15); place(bell(1567.98, 2.6), 84.25, 0.07, 0.15); place(thump(55, 1.4), 84.21, 0.2)

# ---------------- 書き出し ----------------
mix = np.stack([L, R], 1)
mix *= np.clip((DUR - t) / 0.25, 0, 1)[:, None]
peak = np.max(np.abs(mix)); mix = mix / max(peak, 1e-6) * 0.5  # ナレーションと混ぜるため控えめに
wavfile.write(sys.argv[1], SR, (mix * 32767).astype(np.int16))
print('ok', DUR, 'peak normalized to -6 dB')
