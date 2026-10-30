"""冒頭6秒：街の環境音→カウントダウン→スマホの警告音（汎用の電子音。実在の緊急地震速報チャイムは使わない）"""
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR=48000;DUR=6.0;N=int(SR*DUR);t=np.arange(N)/SR;rng=np.random.default_rng(3)
def filt(x,f,k='low',o=2):return sosfilt(butter(o,f,btype=k,fs=SR,output='sos'),x)
def sm(a,b,x):k=np.clip((x-a)/(b-a),0,1);return k*k*(3-2*k)
def tt(d):return np.arange(int(d*SR))/SR
L=np.zeros(N);R=np.zeros(N)
def place(s,at,g=1,pan=0):
    global L,R;a=int(at*SR);e=min(N,a+len(s));L[a:e]+=s[:e-a]*g*np.sqrt((1-pan)/2)*1.414;R[a:e]+=s[:e-a]*g*np.sqrt((1+pan)/2)*1.414
def add(x,g=1):
    global L,R;L+=x*g;R+=x*g
# 街のざわめき（帯域ノイズ＋声っぽい揺らぎ）・車の走行音
crowd=filt(rng.standard_normal(N),[250,2200],'band');crowd/=np.abs(crowd).max()
mod=0.6+0.4*filt(rng.standard_normal(N),3,'low',1)*40
add(crowd*np.clip(mod,0.2,1.2)*0.10*(1-0.6*sm(3.0,3.6,t)))
traffic=filt(rng.standard_normal(N),[60,500],'band');traffic/=np.abs(traffic).max();add(traffic*0.12*(0.7+0.3*np.sin(2*np.pi*0.4*t))*(1-0.5*sm(3,3.5,t)))
for T0 in [0.6,2.2]:x=tt(2.2);place(filt(rng.standard_normal(len(x)),[200,1400],'band')*np.sin(np.pi*x/2.2)**2,T0,0.12,-0.6+T0*0.4)
# 足音（主人公）
for T0 in np.arange(0.05,3.0,0.36):x=tt(0.07);place(np.sin(2*np.pi*140*x)*np.exp(-x*60)+filt(rng.standard_normal(len(x)),[800,3000],'band')*np.exp(-x*80)*0.4,T0,0.11,0.1)
# カウントダウン：毎秒の低い鼓動＋時計の音＋上昇する緊張音
for T0 in [0.0,1.0,2.0]:
    x=tt(0.5);place(np.sin(2*np.pi*np.cumsum(55*(1+np.exp(-x*20)))/SR)*np.exp(-x*7),T0,0.55)
    x=tt(0.05);place(np.sin(2*np.pi*2400*x)*np.exp(-x*120),T0,0.10)
x=tt(3.0);place(np.sin(2*np.pi*np.cumsum(90+260*(x/3)**2)/SR)*(x/3)**1.5*0.6+filt(rng.standard_normal(len(x)),[1000,6000],'band')*(x/3)**3*0.25,0,0.35)
# 直前の無音（2.85〜3.0）
duck=1-sm(2.82,2.92,t)*(1-sm(2.99,3.01,t))
# 3.0 スマホの警告音（汎用：2音交互のパルス）＋バイブ＋周囲の端末の重なり
def tone(f,d):x=tt(d);return (np.sin(2*np.pi*f*x)+0.35*np.sin(2*np.pi*2*f*x)+0.15*np.sin(2*np.pi*3*f*x))*np.minimum(x/0.004,1)*np.minimum((d-x)/0.01,1)
for k,T0 in enumerate(np.arange(3.0,5.9,0.2)):place(tone(1046 if k%2==0 else 784,0.17),T0,0.16)
for j,dl in enumerate([0.07,0.13,0.21,0.29]):
    for k,T0 in enumerate(np.arange(3.0+dl,5.9,0.2)):place(tone((1046 if k%2==0 else 784)*(1+0.004*(j+1)),0.17),T0,0.05,[-0.8,0.7,-0.4,0.5][j])
vib=np.sin(2*np.pi*165*t)*(np.sin(2*np.pi*2.5*t)>0)*filt(rng.standard_normal(N),40,'low')*0;add(np.sign(np.sin(2*np.pi*165*t))*0.5*filt(np.abs(np.sin(2*np.pi*1.25*t)),20,'low')*sm(3,3.05,t)*0.05)
x=tt(1.2);place(np.sin(2*np.pi*np.cumsum(40+30*np.exp(-x*3))/SR)*np.exp(-x*2.5)+filt(rng.standard_normal(len(x)),400)*np.exp(-x*6)*0.6,3.0,0.6)
x=tt(0.5);place(filt(rng.standard_normal(len(x)),[300,3000],'band')*np.sin(np.pi*x/0.5)**2,2.8,0.25)
# 不穏なパッド（Dm）
pad=sum(np.sin(2*np.pi*f*t+np.sin(2*np.pi*0.3*t)) for f in [73.4,110,146.8,174.6])/4;add(filt(pad,900)*0.12*sm(0,1.5,t)*(0.7+0.6*sm(3,3.5,t)))
L*=duck;R*=duck
mix=np.stack([L,R],1);mix=filt(mix.T,30,'high').T;mix/=np.abs(mix).max();mix=np.tanh(mix*1.4)/np.tanh(1.4)*0.89
mix*=np.minimum(1,(DUR-t)/0.15)[:,None]
wavfile.write('audio.wav',SR,(mix*32767).astype(np.int16))
for s0 in range(6):seg=mix[s0*SR:(s0+1)*SR];print(s0,round(20*np.log10(np.sqrt((seg**2).mean())+1e-9),1),end=' | ')
