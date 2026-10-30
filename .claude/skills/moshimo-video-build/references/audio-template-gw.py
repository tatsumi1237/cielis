"""万里の長城：BGM＋効果音（ナレーションなし。すべて数式で合成）"""
import numpy as np
from scipy.signal import butter, sosfilt, lfilter
from scipy.io import wavfile
SR = 48000; DUR = 60.0; N = int(SR*DUR); t = np.arange(N)/SR
rng = np.random.default_rng(7)
def filt(x, f, kind='low', o=2): return sosfilt(butter(o, f, btype=kind, fs=SR, output='sos'), x)
def sm(a, b, x): k = np.clip((x-a)/(b-a), 0, 1); return k*k*(3-2*k)
def tt(d): return np.arange(int(d*SR))/SR
def nz(n): return rng.standard_normal(n)
def lvl(pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
class Bus:
    def __init__(s): s.L = np.zeros(N); s.R = np.zeros(N)
    def place(s, snd, at, g=1.0, pan=0.0):
        a = int(at*SR); e = min(N, a+len(snd))
        if a >= N or e <= a: return
        s.L[a:e] += snd[:e-a]*g*np.sqrt((1-pan)/2)*1.414; s.R[a:e] += snd[:e-a]*g*np.sqrt((1+pan)/2)*1.414
    def add(s, x, g=1.0): s.L += x*g; s.R += x*g
sfx = Bus(); bgm = Bus()
def mtof(m): return 440*2**((m-69)/12)
# ---------- 楽器 ----------
def pluck(f, d=1.6, bright=0.5):  # 古箏風（Karplus-Strong）
    L = max(2, int(SR/f)); n = int(d*SR); x = np.zeros(n); x[:L] = filt(nz(L), 2000+bright*5000)
    a = np.zeros(L+2); a[0] = 1; a[L] = -0.497; a[L+1] = -0.497
    y = lfilter([1], a, x); env = np.minimum(np.arange(n)/(0.002*SR), 1)
    return y/np.abs(y).max()*env*np.exp(-np.arange(n)/SR*1.2)
def taiko(d=0.9, f=55):
    x = tt(d); return np.sin(2*np.pi*np.cumsum(f*(1+1.5*np.exp(-x*18)))/SR)*np.exp(-x*5)+filt(nz(len(x)), 300)*np.exp(-x*30)*0.5
def rim(): x = tt(0.08); return filt(nz(len(x)), [1500, 5000], 'band')*np.exp(-x*60)
def bell(f, d=3.0):
    x = tt(d); return sum(a*np.sin(2*np.pi*f*r*x)*np.exp(-x*k) for a, r, k in [(1, 1, 1.2), (0.5, 2.76, 2.5), (0.3, 5.4, 4), (0.2, 8.9, 6)])
def padchord(notes, d, cut=1200):
    x = tt(d); s = np.zeros(len(x))
    for m in notes:
        for dt in (-0.1, 0.1): f = mtof(m)*2**(dt/12); s += 2*((x*f) % 1)-1
    env = np.minimum(x/1.5, 1)*np.minimum((d-x)/1.0, 1); return filt(s, cut)*env/len(notes)/2
def whoosh(d=0.6):
    x = tt(d); return filt(nz(len(x)), [300, 3000], 'band')*np.sin(np.pi*x/d)**2
def pop(): x = tt(0.12); return np.sin(2*np.pi*np.cumsum(900-500*x/0.12)/SR)*np.exp(-x*30)
def thud(f=60, d=0.35): x = tt(d); return np.sin(2*np.pi*np.cumsum(f*(1+np.exp(-x*20)))/SR)*np.exp(-x*12)+filt(nz(len(x)), 500)*np.exp(-x*30)*0.4
# ---------- BGM（Dマイナー・ペンタトニック、BPM84） ----------
BPM = 84; B = 60/BPM
PENT = [62, 65, 67, 69, 72, 74, 77, 79, 81]
CH = [[50, 57, 62, 65], [46, 53, 58, 62], [48, 55, 60, 64], [45, 52, 57, 60]]  # Dm Bb C Am
BAR = B*4
for i in range(int(DUR/(BAR*2))+1):
    T0 = i*BAR*2; ch = CH[i % 4]
    bgm.place(padchord(ch, BAR*2+1.2, 1400 if T0 < 59 else 2200), T0, 1.0)
padL = lvl([(0, 0.45), (4, 0.55), (10, 0.5), (16, 0.6), (42, 0.6), (55, 0.8), (58.5, 0.8), (60, 0)])
bgm.L *= padL; bgm.R *= padL
mel = Bus()
step = B/2
for i in range(int(DUR/step)):
    T0 = i*step
    dens = 0.35 if T0 < 4 else (0.75 if T0 < 55 else 0.55)
    if rng.random() > dens: continue
    ch = CH[int(T0//(BAR*2)) % 4]
    cand = [m for m in PENT if (m % 12) in [c % 12 for c in ch] or rng.random() < 0.3]
    m = cand[int(rng.random()*len(cand))]
    mel.place(pluck(mtof(m), 1.8, 0.4+rng.random()*0.4), T0, 0.32 if T0 < 55 else 0.38, rng.uniform(-.5, .5))
# 太鼓：蒙恬と兵の場面（16〜30）
for i in range(int(DUR/B)):
    T0 = i*B
    if 22 <= T0 < 34 or 48 <= T0 < 55:
        mel.place(taiko(0.9, 50), T0, 0.55 if i % 4 == 0 else 0.35)
        if i % 2: mel.place(rim(), T0+B/2, 0.12, 0.3)
    if 55 <= T0 < 59 and i % 2 == 0: mel.place(taiko(1.2, 46), T0, 0.35)
# 一人の将軍：鐘
# 締め：鐘と上がる和音
mel.place(bell(mtof(74), 5.0), 55.5, 0.22); mel.place(bell(mtof(69), 5.0), 57.2, 0.18)
bgm.L += mel.L; bgm.R += mel.R
# ---------- 効果音 ----------
wind = filt(nz(N), [150, 900], 'band'); wind /= np.abs(wind).max()
wl = 0.5*sm(-1, 0.3, t)*(1-sm(3.8, 4.2, t)) + 0.35*sm(16, 16.4, t)*(1-sm(21.8, 22.2, t)) + 0.4*sm(28, 28.4, t)*(1-sm(33.8, 34.2, t)) + 0.45*sm(42, 42.4, t)*(1-sm(54.8, 55.2, t))
sfx.add(wind*wl*(0.7+0.3*np.sin(2*np.pi*0.23*t))*0.3)
waves = filt(nz(N), [120, 1500], 'band'); waves /= np.abs(waves).max(); sfx.add(waves*(0.6+0.4*np.sin(2*np.pi*0.16*t))*sm(54.8, 55.5, t)*0.22)
# スカイツリーが積み上がる「ガコン」（だんだん速く）
k = 0; T0 = 4.3
while T0 < 9.8: sfx.place(thud(110+k*2, 0.25), T0, 0.18, 0.3); k += 1; T0 += max(0.08, 0.6*0.86**k)
x = tt(5.6); sfx.place(np.sin(2*np.pi*np.cumsum(120+500*(x/5.6)**2)/SR)*np.sin(np.pi*x/5.6)**1.5, 4.2, 0.10)
# 宇宙：低いうなり＋線が伸びる音
drone = np.sin(2*np.pi*42*t)+0.5*np.sin(2*np.pi*63.3*t); sfx.add(drone*sm(10, 10.5, t)*(1-sm(15.6, 16.1, t))*0.05)
x = tt(5.2); sfx.place(np.sin(2*np.pi*np.cumsum(300+600*x/5.2)/SR)*0.5*np.minimum(x/0.3, 1)*np.minimum((5.2-x)/0.3, 1), 10.4, 0.06)
# 歩く足音
for T0 in np.arange(16.2, 22, 0.42): sfx.place(thud(180, 0.07), T0, 0.12, rng.uniform(-.2, .2))
for T0 in [17.2, 19.6]: sfx.place(whoosh(1.2), T0, 0.12)
# レンガが落ちる音
for T0 in np.sort(rng.uniform(22.1, 28, 160)): x = tt(0.09); sfx.place(filt(nz(len(x)), [600, 4000], 'band')*np.exp(-x*45), T0, 0.06+rng.random()*0.08, rng.uniform(-.7, .7))
for T0 in np.arange(22.2, 28, 0.5): sfx.place(thud(70, 0.3), T0, 0.12)
# 年表：時計の針の音＋目印のチャイム
for T0 in np.arange(34.1, 42, 0.5): sfx.place(np.sin(2*np.pi*1800*tt(0.025))*np.exp(-tt(0.025)*180), T0, 0.08)
for T0 in [34.4, 36.0, 38.2, 40.6]: sfx.place(bell(mtof(81), 1.5), T0, 0.06)
# カレンダーが舞う紙の音
paper = filt(nz(N), [1500, 6000], 'band'); paper /= np.abs(paper).max(); sfx.add(paper*(0.5+0.5*np.abs(np.sin(2*np.pi*3.1*t)))*sm(42, 42.4, t)*(1-sm(47.7, 48.1, t))*0.07)
# レンガを手渡しする音
for T0 in np.arange(48.2, 55, 0.83): x = tt(0.06); sfx.place(filt(nz(len(x)), [800, 3000], 'band')*np.exp(-x*60), T0, 0.15, rng.uniform(-.4, .4))
# 場面の頭の whoosh と見出しの pop
for T0 in [4, 10, 16, 22, 28, 34, 42, 48, 55]: sfx.place(whoosh(0.7), T0-0.35, 0.22)
for T0 in [4.4, 10.4, 16.4, 22.4, 28.4, 34.4, 42.4, 48.4, 55.6]: sfx.place(pop(), T0, 0.12)
for k in range(4): sfx.place(np.sin(2*np.pi*2200*tt(0.03))*np.exp(-tt(0.03)*150), 0.05+k, 0.12)
# ---------- ミックス ----------
def st(b): return np.stack([b.L, b.R], 1)
S = filt(st(sfx).T, 30, 'high').T; Bm = filt(st(bgm).T, 30, 'high').T
S = S/np.abs(S).max()*0.6; Bm = Bm/np.abs(Bm).max()*0.7
mix = S+Bm
mix *= np.minimum(1, (DUR-t)/2.0)[:, None]*np.minimum(1, t/0.05)[:, None]
peak = np.abs(mix).max(); mix = np.tanh(mix/peak*1.3)/np.tanh(1.3)*0.89
wavfile.write('audio2.wav', SR, (mix*32767).astype(np.int16))
for s0 in range(0, 60, 5):
    seg = mix[int(s0*SR):int((s0+5)*SR)]; print(s0, round(20*np.log10(np.sqrt((seg**2).mean())+1e-9), 1), end=' | ')
print('ok')
