"""もしも南海トラフ（昼・47秒）：BGM＋効果音。ナレーションなし。実在の警報音は使わない"""
import numpy as np
from scipy.signal import butter, sosfilt
from scipy.io import wavfile
SR=48000;DUR=46.0;N=int(SR*DUR);t=np.arange(N)/SR;rng=np.random.default_rng(5)
def filt(x,f,k='low',o=2):return sosfilt(butter(o,f,btype=k,fs=SR,output='sos'),x)
def sm(a,b,x):k=np.clip((x-a)/(b-a),0,1);return k*k*(3-2*k)
def tt(d):return np.arange(int(d*SR))/SR
def nz(n):return rng.standard_normal(n)
L=np.zeros(N);R=np.zeros(N);BL=np.zeros(N);BR=np.zeros(N)
def place(s,at,g=1,pan=0,bgm=False):
    a=int(at*SR);e=min(N,a+len(s))
    if e<=a:return
    l,r=(BL,BR) if bgm else (L,R);l[a:e]+=s[:e-a]*g*np.sqrt((1-pan)/2)*1.414;r[a:e]+=s[:e-a]*g*np.sqrt((1+pan)/2)*1.414
def add(x,g=1,bgm=False):
    l,r=(BL,BR) if bgm else (L,R);l+=x*g;r+=x*g
def seg(a,b,fi=0.15,fo=0.15):return sm(a-fi,a,t)*(1-sm(b,b+fo,t))
def band(lo,hi):x=filt(nz(N),[lo,hi],'band');return x/np.abs(x).max()
def low(f):x=filt(nz(N),f,'low',3);return x/np.abs(x).max()
def burst(d,lo,hi,dec):x=tt(d);return filt(nz(len(x)),[lo,hi],'band')*np.exp(-x*dec)
def thud(f=60,d=0.4):x=tt(d);return np.sin(2*np.pi*np.cumsum(f*(1+np.exp(-x*20)))/SR)*np.exp(-x*9)+filt(nz(len(x)),500)*np.exp(-x*30)*0.4
def crash(d=0.6):x=tt(d);return filt(nz(len(x)),[200,6000],'band')*np.exp(-x*8)+np.sin(2*np.pi*70*x)*np.exp(-x*14)*0.6
def whoosh(d=0.5):x=tt(d);return filt(nz(len(x)),[300,3000],'band')*np.sin(np.pi*x/d)**2
def pop():x=tt(0.12);return np.sin(2*np.pi*np.cumsum(900-500*x/0.12)/SR)*np.exp(-x*30)
def bell(f,d=2.5):x=tt(d);return sum(a*np.sin(2*np.pi*f*r*x)*np.exp(-x*k) for a,r,k in [(1,1,1.2),(0.5,2.76,2.5),(0.3,5.4,4),(0.2,8.9,6)])
def tone(f,d):x=tt(d);return (np.sin(2*np.pi*f*x)+0.35*np.sin(2*np.pi*2*f*x)+0.15*np.sin(2*np.pi*3*f*x))*np.minimum(x/0.004,1)*np.minimum((d-x)/0.01,1)
def siren(d,f0,f1,rate):x=tt(d);return np.sin(2*np.pi*np.cumsum(f0+(f1-f0)*(0.5+0.5*np.sin(2*np.pi*rate*x)))/SR)*np.minimum(x/0.5,1)*np.minimum((d-x)/0.5,1)
CUTS=[0,3,6,10,13,17,21,25,29,33,37,41,45,46]
# ===== BGM（Dm、BPM76。災害の場面で厚く、被災地の空撮で静かに、最後に上がる） =====
def mtof(m):return 440*2**((m-69)/12)
BPM=76;B=60/BPM;CH=[[50,57,62,65],[46,53,58,62],[48,55,60,64],[45,52,57,61]]
for i in range(int(DUR/(B*8))+1):
    T0=i*B*8;ch=CH[i%4];x=tt(B*8+1.5);s=np.zeros(len(x))
    for m in ch:
        for dt in(-0.08,0.08):f=mtof(m)*2**(dt/12);s+=2*((x*f)%1)-1
    env=np.minimum(x/1.2,1)*np.minimum((len(x)/SR-x)/1.0,1);place(filt(s,1100)*env/len(ch)/2,T0,1.0,bgm=True)
    place(np.sin(2*np.pi*mtof(ch[0]-12)*x)*env*0.5,T0,0.5,bgm=True)
padL=np.interp(t,[0,3,6,13,25,29,37,37.6,41,45,46],[0.25,0.35,0.55,0.8,0.7,0.5,0.45,0.25,0.4,0.85,0.6]);BL*=padL;BR*=padL
for i in range(int(DUR/B)):
    T0=i*B
    if 6<=T0<25 or 41<=T0<45:place(thud(48,0.6),T0,0.35 if i%2==0 else 0.18,bgm=True)
    if 13<=T0<25 and i%2==1:place(burst(0.08,2000,8000,40),T0,0.06,bgm=True)
PENT=[62,65,67,69,72,74]
for i in range(int(DUR/(B/2))):
    T0=i*B/2
    if not(29<=T0<37 or 41<=T0<45) or rng.random()>0.45:continue
    m=PENT[int(rng.random()*len(PENT))];x=tt(1.6);place(np.sin(2*np.pi*mtof(m)*x)*np.exp(-x*3)*(1+0.3*np.sin(2*np.pi*mtof(m)*2*x)),T0,0.18,rng.uniform(-.5,.5),bgm=True)
for T0 in [37.3,38.9,40.5]:place(bell(mtof(62),3.0),T0,0.12,bgm=True)
# ===== 効果音 =====
add(band(250,2200)*seg(0,3.05,0.01,0.3)*0.10);add(band(60,500)*seg(0,3.05,0.01,0.4)*0.12)
for T0 in np.arange(0.05,3.0,0.36):x=tt(0.07);place(np.sin(2*np.pi*140*x)*np.exp(-x*60)+filt(nz(len(x)),[800,3000],'band')*np.exp(-x*80)*0.4,T0,0.10,0.1)
for T0 in [0,1,2]:
    x=tt(0.5);place(np.sin(2*np.pi*np.cumsum(55*(1+np.exp(-x*20)))/SR)*np.exp(-x*7),T0,0.55);x=tt(0.05);place(np.sin(2*np.pi*2400*x)*np.exp(-x*120),T0,0.10)
x=tt(3.0);place(np.sin(2*np.pi*np.cumsum(90+260*(x/3)**2)/SR)*(x/3)**1.5*0.6+filt(nz(len(x)),[1000,6000],'band')*(x/3)**3*0.25,0,0.35)
for k,T0 in enumerate(np.arange(3.0,5.95,0.2)):place(tone(1046 if k%2==0 else 784,0.17),T0,0.16)
for j,dl in enumerate([0.07,0.13,0.21,0.29]):
    for k,T0 in enumerate(np.arange(3.0+dl,5.95,0.2)):place(tone((1046 if k%2==0 else 784)*(1+0.004*(j+1)),0.17),T0,0.05,[-0.8,0.7,-0.4,0.5][j])
x=tt(1.2);place(np.sin(2*np.pi*np.cumsum(40+30*np.exp(-x*3))/SR)*np.exp(-x*2.5)+filt(nz(len(x)),400)*np.exp(-x*6)*0.6,3.0,0.6)
add(band(250,2200)*seg(3,6)*0.04)
# 6-10 揺れ：地鳴り・ガラスが割れて降る・歩道が割れる
add(low(110)*seg(5.9,10,0.1,0.3)*0.9*(0.6+0.4*np.sin(2*np.pi*3.3*t)))
for T0 in [6.2,6.7,7.3,8.0,8.6]:x=tt(0.9);place(filt(nz(len(x)),[2500,9000],'band')*np.exp(-x*5)+np.sin(2*np.pi*3200*x)*np.exp(-x*9)*0.3,T0,0.30,rng.uniform(-.7,.7))
for T0 in np.sort(rng.uniform(6.3,9.9,160)):x=tt(0.06);place(np.sin(2*np.pi*rng.uniform(3000,6500)*x)*np.exp(-x*70),T0,0.05+rng.random()*0.05,rng.uniform(-.9,.9))
for T0 in [6.4,7.1,7.9,8.7,9.3]:x=tt(0.35);place(filt(nz(len(x)),[150,1500],'band')*np.exp(-x*14)+np.sin(2*np.pi*90*x)*np.exp(-x*20)*0.6,T0,0.28,rng.uniform(-.5,.5))
place(crash(1.2),7.0,0.3);add(band(400,1800)*seg(6.3,10)*0.06)
# 10-13 避難
for T0 in np.arange(10.05,13,0.17):place(thud(160,0.06),T0,0.06,rng.uniform(-.5,.5))
place(siren(3.0,560,760,0.25),10,0.05);add(band(300,1500)*seg(10,13)*0.05)
# 13-17 津波の空撮：巨大な轟音と砕ける音
add(band(50,900)*seg(12.9,17,0.2,0.3)*0.75*(0.75+0.25*np.sin(2*np.pi*0.8*t)));add(low(90)*seg(13,17,0.3,0.3)*0.8)
for T0 in np.sort(rng.uniform(13.2,16.9,70)):place(crash(0.4),T0,0.07+rng.random()*0.12,rng.uniform(-.9,.9))
x=tt(2.0);place(np.sin(2*np.pi*np.cumsum(45*np.exp(-x*0.6))/SR)*np.exp(-x*1.2),13.0,0.7)
# 17-21 東京の街に流れ込む：濁流・ぶつかる車・車の警報
add(band(100,3500)*seg(17,21)*0.45*(0.8+0.2*np.sin(2*np.pi*1.3*t)));add(low(160)*seg(17,21)*0.5)
for T0 in np.sort(rng.uniform(17.2,20.9,40)):place(crash(0.45),T0,0.1+rng.random()*0.12,rng.uniform(-.8,.8))
for T0 in np.arange(17.5,20.9,0.5):place(tone(1400,0.12),T0,0.025,0.6)
# 21-25 都会の火災
add(band(300,1800)*seg(21,25)*0.16*(0.6+0.4*np.sin(2*np.pi*7*t)));add(low(200)*seg(21,25)*0.35)
for T0 in np.sort(rng.uniform(21.1,24.9,90)):place(burst(0.04,1500,6000,80),T0,0.07+rng.random()*0.08,rng.uniform(-.8,.8))
place(siren(4.0,700,950,0.6),21.05,0.045)
# 25-29 被災した街
add(band(150,900)*seg(25,29)*0.12*(0.6+0.4*np.sin(2*np.pi*0.3*t)))
heli=np.sign(np.sin(2*np.pi*11*t))*0.5+0.5;add(filt(nz(N),[80,600],'band')*heli*seg(25,29)*0.08)
for T0 in [25.8,27.3,28.4]:place(burst(0.6,200,1200,5),T0,0.08,rng.uniform(-.6,.6))
# 29-33 避難所
add(band(250,1600)*seg(29,33)*0.16*(0.8+0.2*np.sin(2*np.pi*0.5*t)));add(band(1200,3000)*seg(29,33)*0.03*(0.5+0.5*np.sin(2*np.pi*1.7*t)))
# 33-37 給水
add(band(800,5000)*seg(33.3,36.8)*0.10*(0.7+0.3*np.sin(2*np.pi*6*t)))
for T0 in np.arange(33.3,36.9,0.9):place(thud(220,0.12),T0,0.08,0.3)
add(band(250,1400)*seg(33,37)*0.06)
# 37-41 空撮：風・カモメ
add(band(120,700)*seg(37.4,41,0.4,0.2)*0.10)
for T0 in [38.4,39.6]:x=tt(0.5);place(np.sin(2*np.pi*np.cumsum(1600+500*np.sin(2*np.pi*3*x)*np.exp(-x*3))/SR)*np.exp(-x*5)*0.5,T0,0.04,rng.uniform(-.6,.6))
# 41-45 ニュース
for k,T0 in enumerate([41.15,41.35,41.55]):place(tone([880,1175,1568][k],0.16),T0,0.09)
add(band(250,2000)*seg(41,45)*0.08)
# 45-46 締め
place(bell(mtof(81),1.0),45.0,0.22);place(pop(),45.05,0.14)
# 場面頭の whoosh と見出しの pop
for c in CUTS[2:-2]:place(whoosh(0.45),c-0.22,0.16)
for c in CUTS[1:-2]:place(pop(),c+0.27,0.11)
# 無音の演出：発生直前と空撮直前
duck=1-sm(2.82,2.92,t)*(1-sm(2.99,3.01,t));duck*=1-sm(36.85,36.95,t)*(1-sm(37.3,37.5,t))
L*=duck;R*=duck
S=np.stack([L,R],1);Bm=np.stack([BL,BR],1);S=filt(S.T,30,'high').T;Bm=filt(Bm.T,30,'high').T
S=S/np.abs(S).max()*0.62;Bm=Bm/np.abs(Bm).max()*0.55;mix=S+Bm
mix=np.tanh(mix/np.abs(mix).max()*1.3)/np.tanh(1.3)*0.89;mix*=np.minimum(1,(DUR-t)/0.25)[:,None]*np.minimum(1,t/0.03)[:,None]
wavfile.write('audio.wav',SR,(mix*32767).astype(np.int16))
for s0 in range(0,46,2):seg2=mix[s0*SR:(s0+2)*SR];print(s0,round(20*np.log10(np.sqrt((seg2**2).mean())+1e-9),1),end='|')
