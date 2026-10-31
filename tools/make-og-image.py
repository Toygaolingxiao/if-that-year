#!/usr/bin/env python3
# 《如果那年》社交分享预览图（og:image）生成脚本 —— 程序化生成，保证可复现。
# 用法：python3 tools/make-og-image.py  →  写出仓库根目录 og.png（1200×630）
# 视觉语言与站内一致：暖纸底 #FAF8F4、松绿 #2F4A3C、衬线标题；左侧 motif 为结算纵轴立轴图的简化形——
# 中央实线是走过的一生，自上而下；两侧灰绿虚线是没选的支流，向上淡去（结局无尊卑，只表示时间与分岔）。
# 文案全部取自项目既有文案（og:title / og:description），本脚本不新写文案。
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PAPER = (250, 248, 244)        # #FAF8F4
PINE = (47, 74, 60)            # #2F4A3C
FADE = (122, 132, 113)         # 灰绿，支流与副行
SERIF_BOLD = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc"
SERIF = "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"

img = Image.new("RGB", (W, H), PAPER)
ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(ov)

# ---- 左侧立轴 motif ----
cx = 225                      # 脊线 x
top, bot = 80, 550            # 22 岁在上、80 岁在下
d.line([(cx, top), (cx, bot)], fill=PINE + (255,), width=6)
d.ellipse([cx - 9, top - 9, cx + 9, top + 9], fill=PINE + (255,))   # 起点
d.ellipse([cx - 9, bot - 9, cx + 9, bot + 9], fill=PINE + (255,))   # 终点

def dashed_branch(x0, y0, x1, y1, fade_to=40):
    """从脊线分出的未选支流：虚线，向上渐淡。"""
    import math
    length = math.hypot(x1 - x0, y1 - y0)
    dash, gap = 14, 10
    t = 0.0
    while t < length:
        t2 = min(t + dash, length)
        a = int(200 - (200 - fade_to) * (t / length))
        xa, ya = x0 + (x1 - x0) * t / length, y0 + (y1 - y0) * t / length
        xb, yb = x0 + (x1 - x0) * t2 / length, y0 + (y1 - y0) * t2 / length
        d.line([(xa, ya), (xb, yb)], fill=FADE + (a,), width=5)
        t = t2 + gap

dashed_branch(cx, 235, cx - 115, 115)   # 左支流
dashed_branch(cx, 395, cx + 115, 275)   # 右支流

img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
d = ImageDraw.Draw(img)

# ---- 右侧文字 ----
tx = 440
title = ImageFont.truetype(SERIF_BOLD, 104)
title2 = ImageFont.truetype(SERIF_BOLD, 56)
sub = ImageFont.truetype(SERIF, 37)
d.text((tx, 128), "如果那年", font=title, fill=PINE)
d.text((tx, 268), "另一条路", font=title2, fill=PINE)
d.text((tx, 372), "同样的运气，不同的选择。", font=sub, fill=FADE)

img.save("og.png", optimize=True)
print("og.png written:", img.size)
