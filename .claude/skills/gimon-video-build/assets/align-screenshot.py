"""スクリーンショット（Instagram の再生画面）と、同じ瞬間の元コマを位置合わせして、表示の拡大率とずれを求める。"""
import sys
import numpy as np
from PIL import Image
from scipy.signal import fftconvolve

shot = Image.open(sys.argv[1]).convert('L')
frame = Image.open(sys.argv[2]).convert('L')
SW, SH = shot.size
FW, FH = frame.size
print('screenshot', SW, SH, 'frame', FW, FH)

D = 4  # スクリーンショットを 1/4 にして照合
sd = shot.resize((SW // D, SH // D), Image.LANCZOS)
sa = np.asarray(sd, dtype=np.float64)
# 照合に使う領域（タイトル・ラベル・数字を含む中央付近。UIボタンの少ない左側寄り）
X0, Y0, X1, Y1 = 60, 600, 760, 1300
tpl = sa[Y0 // D:Y1 // D, X0 // D:X1 // D]
th, tw = tpl.shape
tpl0 = tpl - tpl.mean()
tsum2 = (tpl0 ** 2).sum()
ones = np.ones_like(tpl)


def zncc(img):
    num = fftconvolve(img, tpl0[::-1, ::-1], mode='valid')
    si = fftconvolve(img, ones[::-1, ::-1], mode='valid')
    si2 = fftconvolve(img ** 2, ones[::-1, ::-1], mode='valid')
    var = np.maximum(si2 - si ** 2 / (th * tw), 1e-9)
    return num / np.sqrt(var * tsum2 + 1e-9)


best = None
for g in np.arange(0.20, 0.50, 0.004):
    w, h = int(round(FW * g)), int(round(FH * g))
    if w < tw or h < th:
        continue
    img = np.asarray(frame.resize((w, h), Image.LANCZOS), dtype=np.float64)
    z = zncc(img)
    iy, ix = np.unravel_index(np.argmax(z), z.shape)
    v = z[iy, ix]
    if best is None or v > best[0]:
        best = (v, g, ix, iy)
v, g, px, py = best
# 細かく再探索
for g2 in np.arange(g - 0.006, g + 0.0061, 0.0005):
    w, h = int(round(FW * g2)), int(round(FH * g2))
    img = np.asarray(frame.resize((w, h), Image.LANCZOS), dtype=np.float64)
    z = zncc(img)
    iy, ix = np.unravel_index(np.argmax(z), z.shape)
    if z[iy, ix] > best[0]:
        best = (z[iy, ix], g2, ix, iy)
v, g, px, py = best
s = D * g                       # 表示倍率（スクリーンショットの1pxあたり、動画の何px分か）
ox = X0 - D * px                # 動画の左端（u=0）がスクリーンショット上のどこに来るか
oy = Y0 - D * py
print('best correlation %.3f' % v)
print('display scale s = %.4f  (cover-fit by height would be %.4f)' % (s, SH / FH))
print('video left edge at X=%.1f, top edge at Y=%.1f (screenshot px)' % (ox, oy))
print('shown video size = %.0f x %.0f (screen %d x %d)' % (FW * s, FH * s, SW, SH))
left_crop_video_px = -ox / s
right_crop_video_px = (FW * s + ox - SW) / s
print('cropped on left = %.1f video px, on right = %.1f video px' % (left_crop_video_px, right_crop_video_px))
print('visible video x-range = %.1f .. %.1f of 0..%d' % (left_crop_video_px, FW - right_crop_video_px, FW))
top_crop = -oy / s
print('video top edge offset = %.1f video px (negative: cropped at top)' % (-top_crop if top_crop > 0 else -top_crop))
