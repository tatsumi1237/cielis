"""もしもこの世から人間が消えたら：BGM＋効果音（ナレーションなし）"""
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR = 48000; DUR = 54.0; N = int(SR*DUR); t = np.arange(N)/SR
rng = np.random.default_rng(11)
def filt(x, f, kind='low', o=2): return sosfilt(butter(o, f, btype=kind, fs=SR, output='sos'), x)
def sm(a, b, x): k = np.clip((x-a)/(b-a), 0, 1); return k*k*(3-2*k)
def tt(d): return np.arange(int(d*SR))/SR
def nz(n): return rng.standard_normal(n)
def lvl(pts): xs, ys = zip(*pts); return np.interp(t, xs, ys)
def win(a, b, fa=0.3, fb=0.3): return sm(a-fa, a, t)*(1-sm(b, b+fb, t))
class Bus:
    def __init__(s): s.L = np.zeros(N); s.R = np.zeros(N)
    def place(s, snd, at, g=1.0, pan=0.0):
        a = int(at*SR); e = min(N, a+len(snd))
        if a >= N or e <= a or a < 0: return
        s.L[a:e] += snd[:e-a]*g*np.sqrt((1-pan)/2)*1.414; s.R[a:e] += snd[:e-a]*g*np.sqrt((1+pan)/2)*1.414
    def add(s, x, g=1.0): s.L += x*g; s.R += x*g
sfx = Bus(); bgm = Bus()
def mtof(m): return 440*2**((m-69)/12)
def norm(x): return x/(np.abs(x).max()+1e-9)
def thud(f=60, d=0.35): x = tt(d); return np.sin(2*np.pi*np.cumsum(f*(1+np.exp(-x*20)))/SR)*np.exp(-x*12)+filt(nz(len(x)), 500)*np.exp(-x*30)*0.4
def crash(d=1.5, f=300): x = tt(d); return filt(nz(len(x)), [80, f*6], 'band')*np.exp(-x*3)+thud(45, d)*0.8
def whoosh(d=0.7): x = tt(d); return filt(nz(len(x)), [300, 3000], 'band')*np.sin(np.pi*x/d)**2
def pop(): x = tt(0.12); return np.sin(2*np.pi*np.cumsum(900-500*x/0.12)/SR)*np.exp(-x*30)
def bell(f, d=3.0):
    x = tt(d); return sum(a*np.sin(2*np.pi*f*r*x)*np.exp(-x*k) for a, r, k in [(1, 1, 1.2), (0.5, 2.76, 2.5), (0.3, 5.4, 4), (0.2, 8.9, 6)])
def piano(f, d=2.5):
    x = tt(d); s = sum(a*np.sin(2*np.pi*f*h*x)*np.exp(-x*(1.5+h*0.8)) for h, a in [(1, 1), (2, 0.45), (3, 0.2), (4, 0.1)]); return s*np.minimum(x/0.004, 1)
def padchord(notes, d, cut=1100):
    x = tt(d); s = np.zeros(len(x))
    for m in notes:
        for dt in (-0.08, 0.08): f = mtof(m)*2**(dt/12); s += 2*((x*f) % 1)-1
    env = np.minimum(x/2.0, 1)*np.minimum((d-x)/1.2, 1); return filt(s, cut)*env/len(notes)/2
def chirp_bird():
    x = tt(0.18); f = 3000+1500*np.sin(np.pi*x/0.18); return np.sin(2*np.pi*np.cumsum(f)/SR)*np.sin(np.pi*x/0.18)**2
# ---------- BGM（Aマイナー、BPM72。人が消えてから始まる） ----------
B = 60/72; BAR = B*4
CH = [[45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [43, 50, 55, 59]]  # Am F C G
for i in range(int(DUR/(BAR))+1):
    T0 = 3.0+i*BAR
    if T0 >= DUR: break
    bgm.place(padchord(CH[i % 4], BAR+1.6), T0, 1.0)
MEL = [69, 72, 76, 74, 72, 69, 67, 64]
for i in range(int(DUR/(B))):
    T0 = 4.0+i*B
    if T0 >= 51: break
    if rng.random() < (0.35 if T0 < 23 else 0.55):
        bgm.place(piano(mtof(MEL[i % len(MEL)]+(12 if T0 > 41 else 0)), 2.5), T0, 0.28, rng.uniform(-.4, .4))
padL = lvl([(0, 0), (3.0, 0), (3.4, 0.5), (11, 0.55), (23, 0.65), (35, 0.75), (41, 0.85), (47, 0.95), (51, 0.9), (52, 0.6), (53.2, 0.5), (54, 0)])
bgm.L *= padL; bgm.R *= padL
for T0 in [47.0, 48.5, 50.0]: bgm.place(bell(mtof(81), 3.0), T0, 0.22); bgm.place(bell(mtof(69), 3.5), T0, 0.15)
# ---------- 効果音 ----------
# 0〜3：街のざわめき・車・横断歩道の誘導音、3秒で無音に
city = filt(nz(N), [150, 2500], 'band'); city = norm(city); sfx.add(city*win(0, 3.0, 0.05, 0.02)*0.28)
for T0 in np.arange(0.1, 3.0, 0.5): x = tt(0.12); sfx.place(np.sin(2*np.pi*(2400 if int(T0*2) % 2 else 1900)*x)*np.exp(-x*10), T0, 0.06, 0.4)
for T0 in np.arange(0.0, 3.0, 0.21): sfx.place(thud(180, 0.06), T0+rng.uniform(0, .1), 0.05, rng.uniform(-.7, .7))
for k in range(3): x = tt(0.05); sfx.place(np.sin(2*np.pi*1800*x)*np.exp(-x*80), k*1.0+0.02, 0.18)
x = tt(1.6); sfx.place(np.sin(2*np.pi*np.cumsum(900*np.exp(-x*2.2)+60)/SR)*np.exp(-x*1.8), 3.0, 0.25)  # 「スッ」と消える
sfx.place(whoosh(1.0), 2.8, 0.3)
# 風（人が消えた後ずっと）
wind = norm(filt(nz(N), [150, 900], 'band')); sfx.add(wind*(sm(3.2, 4.5, t)*0.25+0.15*win(23, 35))*(0.7+0.3*np.sin(2*np.pi*0.21*t))*(1-sm(10.8, 11.1, t)*(1-sm(16.8, 17.1, t)))*0.5)
# 3カット目：電気が落ちる音
for T0 in [5.6, 7.0, 8.3, 9.4]: x = tt(1.4); sfx.place(np.sin(2*np.pi*np.cumsum(120*np.exp(-x*1.5)+30)/SR)*np.exp(-x*2), T0, 0.18, rng.uniform(-.5, .5)); sfx.place(thud(90, 0.2), T0, 0.15)
hum = np.sin(2*np.pi*50*t)+0.4*np.sin(2*np.pi*100*t); sfx.add(hum*win(5, 9.5)*(1-sm(5, 10, t))*0.04)
# 4カット目：水が流れ込む音・しずく・警報
water = norm(filt(nz(N), [100, 1800], 'band')); sfx.add(water*win(11, 17)*(0.3+0.7*sm(11, 16.5, t))*0.3)
for T0 in rng.uniform(11, 17, 40): x = tt(0.07); sfx.place(np.sin(2*np.pi*np.cumsum(700*(1+x*25))/SR)*np.exp(-x*45), T0, 0.06, rng.uniform(-.6, .6))
for T0 in np.arange(12.5, 17, 0.8): x = tt(0.35); sfx.place(np.sin(2*np.pi*880*x)*(x < 0.3), T0, 0.03, -0.3)
# 5カット目：鳥と足音
for T0 in rng.uniform(17, 23, 22): sfx.place(chirp_bird(), T0, 0.07, rng.uniform(-.8, .8))
for T0 in np.arange(17.2, 23, 0.5): sfx.place(thud(220, 0.05), T0, 0.06, 0.2)
# 6カット目：虫の声
x = t; crick = np.sin(2*np.pi*4200*x)*(np.sin(2*np.pi*28*x) > 0.3)*(np.sin(2*np.pi*0.8*x) > 0); sfx.add(crick*win(23, 29)*0.02)
# 7カット目：家がきしみ、崩れる
for T0 in [30.2, 31.4, 32.5, 33.6, 34.4]: sfx.place(crash(1.2, 250), T0, 0.22, rng.uniform(-.6, .6))
# 8カット目：鉄がきしみ、タワーが倒れる
x = tt(3.5); creak = filt(np.sign(np.sin(2*np.pi*np.cumsum(80+30*np.sin(2*np.pi*0.7*x))/SR)), [200, 1500], 'band')*np.sin(np.pi*x/3.5); sfx.place(creak, 35.4, 0.12)
sfx.place(crash(3.0, 400), 39.3, 0.55); sfx.place(thud(35, 2.0), 39.3, 0.5)
# 9カット目：橋が崩れて海へ
sea = norm(filt(nz(N), [120, 1500], 'band')); sfx.add(sea*(0.6+0.4*np.sin(2*np.pi*0.16*t))*win(41, 47)*0.18)
for T0 in [42.5, 43.4, 44.1, 44.8, 45.6]: sfx.place(crash(1.6, 350), T0, 0.3, rng.uniform(-.5, .5)); sfx.place(filt(nz(int(1.2*SR)), [400, 5000], 'band')*np.exp(-tt(1.2)*3), T0+0.4, 0.15)
# 10カット目：砂漠の風
sfx.add(wind*win(47, 51.5)*0.12)
# 場面の頭の whoosh と見出しの pop
for T0 in [5, 11, 17, 23, 29, 35, 41, 47]: sfx.place(whoosh(0.7), T0-0.35, 0.2)
for T0 in [3.2, 5.3, 11.3, 17.3, 23.3, 29.3, 35.3, 41.3, 47.2]: sfx.place(pop(), T0, 0.1)
for T0 in [52.1]: sfx.place(pop(), T0, 0.15)
# ---------- ミックス ----------
def st(b): return np.stack([b.L, b.R], 1)
S = filt(st(sfx).T, 30, 'high').T; Bm = filt(st(bgm).T, 30, 'high').T
S = S/np.abs(S).max()*0.65; Bm = Bm/np.abs(Bm).max()*0.6
mix = S+Bm
mix *= np.minimum(1, (DUR-t)/0.8)[:, None]*np.minimum(1, t/0.05)[:, None]
peak = np.abs(mix).max(); mix = np.tanh(mix/peak*1.3)/np.tanh(1.3)*0.89
wavfile.write('audio.wav', SR, (mix*32767).astype(np.int16))
bgm.place(bell(mtof(76), 3.0), 52.1, 0.25); bgm.place(bell(mtof(81), 3.0), 52.35, 0.2)
for s0 in range(0, 54, 4):
    seg = mix[int(s0*SR):int((s0+4)*SR)]; print(s0, round(20*np.log10(np.sqrt((seg**2).mean())+1e-9), 1), end=' | ')
print('ok')
