import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_editorial_og_image(output_paths):
    width = 1200
    height = 630

    # Base background: Dark Obsidian (#090b0f)
    base_color = (9, 11, 15)
    img = Image.new("RGBA", (width, height), base_color)

    # Ambient radial backdrops matching style.css:
    # indigo (#6366f1) top-left, sky blue (#38bdf8) center, amber (#e2d9cc) bottom-right
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow_layer)

    glow_draw.ellipse([-80, -100, 550, 420], fill=(99, 102, 241, 75))   # Indigo
    glow_draw.ellipse([650, -80, 1250, 450], fill=(56, 189, 248, 55))    # Sky Blue
    glow_draw.ellipse([750, 220, 1320, 720], fill=(226, 217, 204, 45))   # Warm Amber
    glow_draw.ellipse([-100, 300, 400, 720], fill=(99, 102, 241, 40))   # Violet glow

    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=110))
    img = Image.alpha_composite(img, glow_layer)

    # Main Card Container: High-taste elevated editorial panel
    card_margin_x = 52
    card_margin_y = 44
    card_w = width - (card_margin_x * 2)
    card_h = height - (card_margin_y * 2)

    card_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    card_draw = ImageDraw.Draw(card_layer)

    card_rect = [card_margin_x, card_margin_y, card_margin_x + card_w, card_margin_y + card_h]
    card_draw.rounded_rectangle(
        card_rect,
        radius=28,
        fill=(18, 21, 29, 225),
        outline=(255, 255, 255, 24),
        width=1
    )
    
    # Subtle inner top highlight border
    card_draw.line(
        [(card_margin_x + 28, card_margin_y + 1), (card_margin_x + card_w - 28, card_margin_y + 1)],
        fill=(255, 255, 255, 45),
        width=1
    )
    img = Image.alpha_composite(img, card_layer)

    draw = ImageDraw.Draw(img)

    # Fonts
    font_serif = "C:/Windows/Fonts/georgiab.ttf" if os.path.exists("C:/Windows/Fonts/georgiab.ttf") else "C:/Windows/Fonts/segoeuib.ttf"
    font_sans_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_sans = "C:/Windows/Fonts/segoeui.ttf"
    font_mono = "C:/Windows/Fonts/cour.ttf" if os.path.exists("C:/Windows/Fonts/cour.ttf") else font_sans

    title_font = ImageFont.truetype(font_serif, 62)
    tagline_font = ImageFont.truetype(font_sans, 23)
    pill_font = ImageFont.truetype(font_sans_bold, 13)
    badge_font = ImageFont.truetype(font_sans_bold, 16)
    meta_font = ImageFont.truetype(font_sans, 15)

    left = card_margin_x + 58
    top = card_margin_y + 50

    # 1. Editorial Category Pill
    pill_text = "EDITORIAL WORKSPACE  •  RAG INTELLIGENCE"
    pill_bbox = pill_font.getbbox(pill_text)
    pw = (pill_bbox[2] - pill_bbox[0]) + 28
    ph = (pill_bbox[3] - pill_bbox[1]) + 16

    draw.rounded_rectangle(
        [left, top, left + pw, top + ph],
        radius=ph // 2,
        fill=(226, 217, 204, 25),
        outline=(226, 217, 204, 75),
        width=1
    )
    draw.text(
        (left + 14, top + 7),
        pill_text,
        font=pill_font,
        fill=(235, 228, 218, 250)
    )

    # 2. Main Title in Editorial Display Typography
    title_y = top + ph + 24
    draw.text(
        (left, title_y),
        "RAG Intelligence Chatbot",
        font=title_font,
        fill=(244, 239, 232, 255)
    )

    # 3. Descriptive Tagline
    tagline_y = title_y + 82
    draw.text(
        (left, tagline_y),
        "Conversational AI that reads your documents and answers questions instantly.",
        font=tagline_font,
        fill=(205, 208, 218, 255)
    )
    draw.text(
        (left, tagline_y + 36),
        "Semantic vector search, exact citations, and multi-turn research intelligence.",
        font=tagline_font,
        fill=(150, 155, 168, 255)
    )

    # 4. Feature Badges (Pills)
    features = [
        ("PDF · DOCX · HTML", (56, 189, 248)),    # Sky blue
        ("Semantic Retrieval", (99, 102, 241)),  # Indigo
        ("Grounded Citations", (226, 217, 204)), # Warm Amber
        ("Instant AI Inference", (45, 212, 191)) # Teal
    ]

    feat_x = left
    feat_y = tagline_y + 96

    for label, color in features:
        bbox = badge_font.getbbox(label)
        bw = (bbox[2] - bbox[0]) + 38
        bh = (bbox[3] - bbox[1]) + 20

        r, g, b = color
        draw.rounded_rectangle(
            [feat_x, feat_y, feat_x + bw, feat_y + bh],
            radius=12,
            fill=(r, g, b, 24),
            outline=(r, g, b, 90),
            width=1
        )
        # Small accent bullet dot
        dot_cy = feat_y + (bh // 2)
        draw.ellipse([feat_x + 14, dot_cy - 3, feat_x + 20, dot_cy + 3], fill=(r, g, b, 255))

        draw.text(
            (feat_x + 27, feat_y + 9),
            label,
            font=badge_font,
            fill=(245, 245, 248, 250)
        )
        feat_x += bw + 14

    # 5. Bottom Divider & Footer
    bottom_y = card_margin_y + card_h - 66
    draw.line(
        [(left, bottom_y), (card_margin_x + card_w - 58, bottom_y)],
        fill=(255, 255, 255, 20),
        width=1
    )

    domain_text = "https://rag-chatbot-nine-taupe.vercel.app"
    draw.text((left, bottom_y + 20), domain_text, font=meta_font, fill=(160, 165, 178, 240))

    tech_text = "TypeScript  •  Express  •  Google Gemini  •  Vercel"
    t_bbox = meta_font.getbbox(tech_text)
    t_w = t_bbox[2] - t_bbox[0]
    draw.text((card_margin_x + card_w - 58 - t_w, bottom_y + 20), tech_text, font=meta_font, fill=(130, 135, 148, 200))

    # Save to all required destinations
    final_rgb = img.convert("RGB")
    for path in output_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        final_rgb.save(path, "PNG", optimize=True)
        print(f"Generated 1200x630 Open Graph image: {path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets = [
        os.path.join(base_dir, "public", "og-image.png"),
        os.path.join(base_dir, "frontend", "public", "og-image.png"),
        os.path.join(base_dir, "frontend", "app", "opengraph-image.png"),
        os.path.join(base_dir, "frontend", "og-image.png")
    ]
    create_editorial_og_image(targets)
