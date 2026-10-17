import math
import os
from PIL import Image, ImageDraw, ImageFont

output_dir = '/home/administrator/web/riverly/apps/web/public/brand'
os.makedirs(output_dir, exist_ok=True)

width, height = 720, 240
num_frames = 40
frames = []

# Basic, muted, calming palette
bg = (20, 28, 33)           # #141c21 - soft calming dark slate
wave_base = (32, 45, 52)    # #202d34 - soft background swell
river_calm = (64, 110, 118)  # #406e76 - muted river teal
river_soft = (118, 168, 175) # #76a8af - soft light sage/cyan
text_col = (235, 240, 242)   # #ebf0f2 - calm off-white
sub_col = (140, 165, 172)    # #8ca5ac - muted calm gray-cyan

for f in range(num_frames):
    t = f / float(num_frames)
    img = Image.new('RGB', (width, height), bg)
    draw = ImageDraw.Draw(img)
    
    # 1. Very slow, gentle background swell
    pts_bg = []
    base_y_bg = height // 2 + 40
    for x in range(0, width + 10, 10):
        y = base_y_bg + math.sin(x * 0.007 + t * 2 * math.pi) * 8 + math.cos(x * 0.003 - t * 2 * math.pi * 0.5) * 4
        pts_bg.append((x, y))
    fill_poly = [(0, height)] + pts_bg + [(width, height)]
    draw.polygon(fill_poly, fill=wave_base)
    
    # 2. Main calm river wave line (slow, low amplitude)
    pts_main = []
    base_y = height // 2 + 28
    for x in range(0, width + 10, 8):
        y = base_y + math.sin(x * 0.009 + t * 2 * math.pi) * 8
        pts_main.append((x, y))
    draw.line(pts_main, fill=river_calm, width=2, joint='curve')
    
    # 3. Soft gentle crest line
    pts_crest = []
    for x in range(0, width + 10, 8):
        y = base_y - 8 + math.sin(x * 0.011 + t * 2 * math.pi * 0.8) * 5
        pts_crest.append((x, y))
    draw.line(pts_crest, fill=river_soft, width=1, joint='curve')

    # 4. Minimal Riverly Emblem (Left aligned or centered)
    emblem_x = width // 2 - 110
    emblem_y = height // 2 - 20
    
    # Subtle icon
    draw.rounded_rectangle([emblem_x - 22, emblem_y - 22, emblem_x + 22, emblem_y + 22], radius=8, fill=(26, 37, 43), outline=river_calm, width=1)
    
    # Slow breathing roofline
    roof_offset = math.sin(t * 2 * math.pi) * 1.5
    draw.line([emblem_x - 12, emblem_y + 2, emblem_x, emblem_y - 10 + roof_offset, emblem_x + 12, emblem_y + 2], fill=text_col, width=2, joint='curve')
    draw.line([emblem_x - 6, emblem_y + 8, emblem_x, emblem_y + 3, emblem_x + 6, emblem_y + 8], fill=river_soft, width=2, joint='curve')
    
    # 5. Clean, calm brand typography
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 10)
    except Exception:
        font = ImageFont.load_default()
        sub_font = ImageFont.load_default()
    
    draw.text((emblem_x + 36, emblem_y - 16), "R I V E R L Y", fill=text_col, font=font)
    draw.text((emblem_x + 38, emblem_y + 10), "S A L E S   C O M M A N D", fill=sub_col, font=sub_font)

    frames.append(img)

gif1 = os.path.join(output_dir, 'company-animated.gif')
gif2 = os.path.join(output_dir, 'riverly-welcome.gif')

frames[0].save(gif1, save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=True)
frames[0].save(gif2, save_all=True, append_images=frames[1:], duration=80, loop=0, optimize=True)

dist_dir = '/home/administrator/web/riverly/apps/web/dist/brand'
os.makedirs(dist_dir, exist_ok=True)
os.system(f'cp {gif1} {gif2} {dist_dir}/')

print(f"Generated calm GIF: {gif1} ({os.path.getsize(gif1)} bytes)")
