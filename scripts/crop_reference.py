import os
from PIL import Image

im = Image.open('artwork/biyoo/source/E-expressions.png')
w, h = im.size
cw = w / 3.0
ch = h / 3.0

os.makedirs('public/biyoo/reference', exist_ok=True)

# 3x3 layout
for r in range(3):
    for c in range(3):
        # Slightly inset by 18px top to avoid leakage from previous row, inset left/right
        left = int(c * cw + 10)
        top = int(r * ch + 20)
        right = int((c + 1) * cw - 10)
        bottom = int((r + 1) * ch - 5)
        
        cropped = im.crop((left, top, right, bottom))
        out_path = f'public/biyoo/reference/cell_{r}_{c}.png'
        cropped.save(out_path)
        print(f'Saved {out_path} ({cropped.size})')

