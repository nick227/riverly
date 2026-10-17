import math
import os
from PIL import Image, ImageDraw, ImageFont

output_dir = "/home/administrator/web/riverly/apps/web/public/brand"
os.makedirs(output_dir, exist_ok=True)

width, height = 720, 360
frames = []
num_frames = 36

# Colors
bg_color = (13, 27, 34)       # #0d1b22
river_dark = (31, 111, 122)   # #1f6f7a
river_light = (108, 195, 204) # #6cc3cc
gold = (217, 147, 74)         # #d9934a
white = (255, 255, 255)

for f in range(num_frames):
    t = f / num_frames
    img = Image.new('RGB', (width, height), bg_color)
    draw = ImageDraw.Draw(img)
    
    # 1. Ambient radial background glow
    glow_cx, glow_cy = width // 2, height // 2
    for r in range(160, 40, -10):
        alpha = (1.0 - r / 160.0) * 0.4
        r_col = (
            int(bg_color[0] + (river_dark[0] - bg_color[0]) * alpha),
            int(bg_color[1] + (river_dark[1] - bg_color[1]) * alpha),
            int(bg_color[2] + (river_dark[2] - bg_color[2]) * alpha)
        )
        draw.ellipse([glow_cx - r * 1.8, glow_cy - r, glow_cx + r * 1.8, glow_cy + r], fill=r_col)
    
    # 2. Dynamic flowing sine waves (River stream)
    waves = [
        (24, 0.012, 1.0, (26, 85, 95), 4),
        (32, 0.016, -1.2, (31, 111, 122), 5),
        (20, 0.022, 1.5, (108, 195, 204), 3),
        (15, 0.018, -0.8, (217, 147, 74), 2),
    ]
    for wave_idx, (amp, freq, speed, col, w) in enumerate(waves):
        pts = []
        phase = t * 2 * math.pi * speed
        base_y = height // 2 + 50 + wave_idx * 12
        for x in range(0, width + 10, 8):
            y = base_y + math.sin(x * freq + phase) * amp + math.cos(x * 0.008 + phase * 0.5) * (amp * 0.4)
            pts.append((x, y))
        draw.line(pts, fill=col, width=w, joint='curve')
    
    # 3. Floating energy nodes
    for p_idx in range(6):
        node_t = (t + p_idx / 6.0) % 1.0
        node_x = int(node_t * (width - 80)) + 40
        node_y = int(height // 2 + 50 + math.sin(node_x * 0.016 - t * 2 * math.pi * 1.2) * 32)
        node_r = 3 + int(math.sin(t * 2 * math.pi + p_idx) * 1.5)
        draw.ellipse([node_x - node_r, node_y - node_r, node_x + node_r, node_y + node_r], fill=white)
        draw.ellipse([node_x - node_r - 3, node_y - node_r - 3, node_x + node_r + 3, node_y + node_r + 3], outline=river_light, width=1)

    # 4. Central Riverly Modern Emblem
    emblem_cx = width // 2
    emblem_cy = height // 2 - 38
    emblem_size = 54
    
    draw.rounded_rectangle(
        [emblem_cx - emblem_size, emblem_cy - emblem_size, emblem_cx + emblem_size, emblem_cy + emblem_size],
        radius=16,
        fill=(19, 39, 48),
        outline=(52, 138, 149),
        width=2
    )
    
    pulse = math.sin(t * 2 * math.pi) * 3
    # Upper roof chevron
    draw.line([emblem_cx - 26, emblem_cy - 4, emblem_cx, emblem_cy - 26 + pulse * 0.5, emblem_cx + 26, emblem_cy - 4], fill=white, width=4, joint='curve')
    # Lower gold chevron
    draw.line([emblem_cx - 16, emblem_cy + 14, emblem_cx, emblem_cy + 2, emblem_cx + 16, emblem_cy + 14], fill=gold, width=4, joint='curve')
    # Chimney
    draw.line([emblem_cx + 14, emblem_cy - 24, emblem_cx + 14, emblem_cy - 16], fill=white, width=3)
    
    # 5. Crisp Modern Brand Lettering "R I V E R L Y"
    text = "R I V E R L Y"
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    except:
        font = ImageFont.load_default()
    
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, emblem_cy + emblem_size + 14), text, fill=white, font=font)

    # Subtitle tag
    sub_text = "SALES COMMAND CENTER"
    try:
        sub_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 11)
    except:
        sub_font = ImageFont.load_default()
    sub_bbox = draw.textbbox((0, 0), sub_text, font=sub_font)
    sub_tw = sub_bbox[2] - sub_bbox[0]
    draw.text(((width - sub_tw) // 2, emblem_cy + emblem_size + 42), sub_text, fill=river_light, font=sub_font)

    frames.append(img)

gif_path = os.path.join(output_dir, "company-animated.gif")
frames[0].save(
    gif_path,
    save_all=True,
    append_images=frames[1:],
    duration=50,
    loop=0,
    optimize=True
)

gif_path2 = os.path.join(output_dir, "riverly-welcome.gif")
frames[0].save(
    gif_path2,
    save_all=True,
    append_images=frames[1:],
    duration=50,
    loop=0,
    optimize=True
)

print(f"Generated {gif_path} ({os.path.getsize(gif_path)} bytes)")
