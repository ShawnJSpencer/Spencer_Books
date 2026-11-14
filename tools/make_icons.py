# Draws the app icon: a row of book spines on a wood background.
from PIL import Image, ImageDraw
import random, os
def icon(size):
    S = 1024
    im = Image.new('RGB', (S, S), '#2a1c13'); d = ImageDraw.Draw(im)
    rnd = random.Random(4)
    for x in range(0, S, 9):  # wood grain
        d.line([(x + rnd.randint(-3, 3), 0), (x + rnd.randint(-3, 3), S)], fill=(46 + rnd.randint(-6, 6), 31 + rnd.randint(-4, 4), 21), width=5)
    d.rounded_rectangle([150, 760, 874, 800], 8, fill='#d4a95a')          # shelf
    books = [(190, 95, 520, '#2f5d50'), (295, 80, 470, '#c86a3c'), (385, 110, 560, '#3f5e86'), (505, 72, 500, '#e9dcc0'), (587, 100, 540, '#7a2e2a')]
    for x, w, h, c in books:
        d.rounded_rectangle([x, 760 - h, x + w - 8, 760], 10, fill=c)
        d.rectangle([x + 14, 760 - h + 60, x + w - 22, 760 - h + 76], fill='#d4a95a')
        d.rectangle([x + 14, 760 - 90, x + w - 22, 760 - 74], fill='#d4a95a')
    d.polygon([(700, 760), (780, 300), (860, 318), (786, 760)], fill='#d8b04f')  # leaning book
    return im.resize((size, size), Image.LANCZOS)
out = os.path.join(os.path.dirname(__file__), '..', 'icons')
for s in (32, 180, 192, 512, 1024): icon(s).save(os.path.join(out, f'icon-{s}.png'))
