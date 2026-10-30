### 手取り計算（参考：給与所得者・協会けんぽ東京・2025年度）
```python
def calc(inc, age40=False):
    monthly=inc/12; std=min(monthly,1390000); pen_std=min(monthly,650000)
    sha=std*(0.0991+(0.0159 if age40 else 0))/2*12 + pen_std*0.183/2*12 + inc*0.0055
    if inc<=1_900_000: k=650000
    elif inc<=3_600_000: k=inc*0.3+80000
    elif inc<=6_600_000: k=inc*0.2+440000
    elif inc<=8_500_000: k=inc*0.1+1100000
    else: k=1950000
    kyuyo=inc-k
    kiso=950000 if kyuyo<=1_320_000 else 880000 if kyuyo<=3_360_000 else 680000 if kyuyo<=4_890_000 else 630000 if kyuyo<=6_550_000 else 580000
    tx=max(0,kyuyo-sha-kiso)
    for lim,r,d in [(1950000,.05,0),(3300000,.10,97500),(6950000,.20,427500),(9000000,.23,636000),(18000000,.33,1536000),(40000000,.40,2796000),(1e12,.45,4796000)]:
        if tx<=lim: it=(tx*r-d)*1.021; break
    jumin=max(0,kyuyo-sha-430000)*0.10+5000
    return inc-sha-it-jumin   # 手取り（概算）
```
料率・控除は年度で変わるので、使う前に最新値を確認すること。

---

