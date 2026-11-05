import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_ui_mockup_og(output_paths):
    width = 1200
    height = 630

    # 1. Base Canvas - Deep modern dark studio backdrop (#080a0f)
    base_color = (8, 10, 15)
    img = Image.new("RGBA", (width, height), base_color)

    # Ambient backdrop glows (indigo top-left, cyan bottom-right, purple center)
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_layer)
    g_draw.ellipse([60, -140, 700, 380], fill=(99, 102, 241, 115))    # Indigo
    g_draw.ellipse([640, 160, 1280, 680], fill=(56, 189, 248, 90))    # Cyan
    g_draw.ellipse([320, 60, 960, 560], fill=(168, 85, 247, 55))     # Purple center
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=95))
    img = Image.alpha_composite(img, glow_layer)

    # 2. Window Frame Geometry
    win_x = 60
    win_y = 42
    win_w = 1080
    win_h = 546

    # Outer Drop Shadow for Realistic 3D Elevation
    shadow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    s_draw.rounded_rectangle(
        [win_x + 6, win_y + 16, win_x + win_w + 6, win_y + win_h + 26],
        radius=22,
        fill=(0, 0, 0, 175)
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=30))
    img = Image.alpha_composite(img, shadow_layer)

    # 3. Window Container
    win_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(win_layer)
    w_draw.rounded_rectangle(
        [win_x, win_y, win_x + win_w, win_y + win_h],
        radius=18,
        fill=(14, 17, 25, 252),
        outline=(255, 255, 255, 34),
        width=1
    )

    # Window Titlebar (macOS Style)
    titlebar_h = 44
    w_draw.rounded_rectangle(
        [win_x, win_y, win_x + win_w, win_y + titlebar_h],
        radius=18,
        fill=(20, 24, 36, 255)
    )
    # Square bottom of titlebar
    w_draw.rectangle([win_x, win_y + 20, win_x + win_w, win_y + titlebar_h], fill=(20, 24, 36, 255))
    w_draw.line([(win_x, win_y + titlebar_h), (win_x + win_w, win_y + titlebar_h)], fill=(255, 255, 255, 20), width=1)

    # Window traffic lights
    dot_y = win_y + (titlebar_h // 2)
    w_draw.ellipse([win_x + 18, dot_y - 6, win_x + 30, dot_y + 6], fill=(255, 95, 87, 255))   # Red
    w_draw.ellipse([win_x + 38, dot_y - 6, win_x + 50, dot_y + 6], fill=(254, 188, 46, 255))  # Yellow
    w_draw.ellipse([win_x + 58, dot_y - 6, win_x + 70, dot_y + 6], fill=(40, 200, 64, 255))   # Green

    # Window URL pill
    url_pill_w = 360
    url_pill_h = 26
    url_pill_x = win_x + (win_w // 2) - (url_pill_w // 2)
    url_pill_y = win_y + (titlebar_h // 2) - (url_pill_h // 2)
    w_draw.rounded_rectangle(
        [url_pill_x, url_pill_y, url_pill_x + url_pill_w, url_pill_y + url_pill_h],
        radius=13,
        fill=(11, 13, 20, 240),
        outline=(255, 255, 255, 18),
        width=1
    )

    # Small vector lock icon inside URL pill
    lock_cx = url_pill_x + 22
    lock_cy = url_pill_y + 13
    # Lock body
    w_draw.rounded_rectangle([lock_cx - 4, lock_cy - 2, lock_cx + 4, lock_cy + 5], radius=2, fill=(160, 165, 180, 255))
    # Lock shackle
    w_draw.arc([lock_cx - 3, lock_cy - 7, lock_cx + 3, lock_cy - 1], start=180, end=0, fill=(160, 165, 180, 255), width=1)

    # Sidebar background
    sidebar_w = 275
    body_y = win_y + titlebar_h
    body_h = win_h - titlebar_h
    w_draw.rectangle(
        [win_x, body_y, win_x + sidebar_w, win_y + win_h - 1],
        fill=(17, 21, 31, 255)
    )
    w_draw.line(
        [(win_x + sidebar_w, body_y), (win_x + sidebar_w, win_y + win_h - 1)],
        fill=(255, 255, 255, 20),
        width=1
    )

    img = Image.alpha_composite(img, win_layer)
    draw = ImageDraw.Draw(img)

    # Fonts
    font_bold = "C:/Windows/Fonts/segoeuib.ttf"
    font_regular = "C:/Windows/Fonts/segoeui.ttf"
    font_mono = "C:/Windows/Fonts/cour.ttf" if os.path.exists("C:/Windows/Fonts/cour.ttf") else font_regular

    f_url = ImageFont.truetype(font_mono, 12)
    f_logo = ImageFont.truetype(font_bold, 18)
    f_badge = ImageFont.truetype(font_bold, 11)
    f_label = ImageFont.truetype(font_bold, 12)
    f_doc = ImageFont.truetype(font_bold, 13)
    f_meta = ImageFont.truetype(font_regular, 11)
    f_msg_user = ImageFont.truetype(font_regular, 15)
    f_msg_ai = ImageFont.truetype(font_regular, 14)
    f_msg_ai_bold = ImageFont.truetype(font_bold, 14)
    f_citation = ImageFont.truetype(font_bold, 11)

    # Draw URL pill text
    url_text = "rag-chatbot-nine-taupe.vercel.app"
    draw.text((url_pill_x + 36, url_pill_y + 5), url_text, font=f_url, fill=(175, 180, 195, 230))

    # --- SIDEBAR CONTENTS ---
    sb_left = win_x + 20
    sb_y = body_y + 22

    # 1. Logo Orb + Brand Name
    logo_size = 36
    logo_img = Image.new("RGBA", (logo_size, logo_size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(logo_img)
    ld.rounded_rectangle([0, 0, logo_size, logo_size], radius=11, fill=(139, 92, 246, 255))
    ld.ellipse([9, 12, 14, 17], fill=(255, 255, 255, 255))
    ld.ellipse([22, 12, 27, 17], fill=(255, 255, 255, 255))
    ld.arc([10, 16, 26, 27], start=20, end=160, fill=(255, 255, 255, 255), width=2)
    img.paste(logo_img, (sb_left, sb_y), logo_img)

    draw.text((sb_left + 46, sb_y + 2), "RAG Intelligence", font=f_logo, fill=(255, 255, 255, 255))
    draw.text((sb_left + 46, sb_y + 22), "DOCUMENT CHATBOT", font=f_badge, fill=(165, 170, 190, 200))

    # 2. Model Selector Box
    sb_y += 60
    draw.text((sb_left, sb_y), "ACTIVE MODEL", font=f_label, fill=(130, 135, 155, 240))
    sb_y += 18
    draw.rounded_rectangle(
        [sb_left, sb_y, sb_left + sidebar_w - 40, sb_y + 38],
        radius=9,
        fill=(26, 31, 46, 255),
        outline=(255, 255, 255, 28),
        width=1
    )
    # Small bolt icon
    bx = sb_left + 16
    by = sb_y + 19
    draw.polygon([(bx, by-6), (bx+4, by-6), (bx+1, by-1), (bx+5, by-1), (bx-3, by+7), (bx-1, by+1), (bx-4, by+1)], fill=(251, 146, 60, 255))
    draw.text((sb_left + 28, sb_y + 10), "GPT OSS 120B / Gemini", font=f_doc, fill=(240, 242, 250, 255))

    # 3. Active Documents Section
    sb_y += 56
    draw.text((sb_left, sb_y), "KNOWLEDGE BASE (3 FILES)", font=f_label, fill=(130, 135, 155, 240))
    sb_y += 20

    # Doc 1: Active
    draw.rounded_rectangle(
        [sb_left, sb_y, sb_left + sidebar_w - 40, sb_y + 54],
        radius=11,
        fill=(99, 102, 241, 45),
        outline=(99, 102, 241, 150),
        width=1
    )
    # PDF Badge
    draw.rounded_rectangle([sb_left + 10, sb_y + 12, sb_left + 42, sb_y + 32], radius=5, fill=(239, 68, 68, 230))
    draw.text((sb_left + 16, sb_y + 14), "PDF", font=f_badge, fill=(255, 255, 255, 255))
    draw.text((sb_left + 50, sb_y + 10), "research_rag_specs.pdf", font=f_doc, fill=(255, 255, 255, 255))
    draw.text((sb_left + 50, sb_y + 29), "Doc ID: 1  •  Indexed (96 chunks)", font=f_meta, fill=(170, 185, 230, 240))

    # Doc 2
    sb_y += 62
    draw.rounded_rectangle(
        [sb_left, sb_y, sb_left + sidebar_w - 40, sb_y + 52],
        radius=11,
        fill=(24, 29, 43, 220),
        outline=(255, 255, 255, 20),
        width=1
    )
    draw.rounded_rectangle([sb_left + 10, sb_y + 11, sb_left + 48, sb_y + 31], radius=5, fill=(59, 130, 246, 220))
    draw.text((sb_left + 14, sb_y + 13), "DOCX", font=f_badge, fill=(255, 255, 255, 255))
    draw.text((sb_left + 56, sb_y + 9), "system_architecture.docx", font=f_doc, fill=(220, 225, 235, 240))
    draw.text((sb_left + 56, sb_y + 28), "Doc ID: 2  •  Indexed (42 chunks)", font=f_meta, fill=(135, 140, 160, 200))

    # Sidebar Bottom Status
    draw.line([(sb_left, win_y + win_h - 48), (sb_left + sidebar_w - 40, win_y + win_h - 48)], fill=(255, 255, 255, 18), width=1)
    draw.ellipse([sb_left + 6, win_y + win_h - 32, sb_left + 14, win_y + win_h - 24], fill=(34, 197, 94, 255))
    draw.text((sb_left + 22, win_y + win_h - 35), "Vector Store Ready (ChromaDB)", font=f_meta, fill=(150, 155, 175, 240))

    # --- MAIN CHAT PANEL ---
    chat_x = win_x + sidebar_w + 28
    chat_y = body_y + 18
    chat_w = win_w - sidebar_w - 56

    # Top Header in Chat Area
    draw.text((chat_x, chat_y), "Conversational Document Analysis", font=f_doc, fill=(250, 250, 255, 255))
    draw.text((chat_x, chat_y + 18), "Ask any question — answered with semantic citations & grounded memory", font=f_meta, fill=(140, 145, 165, 240))
    
    # Model Pill on right
    pill_r_x = win_x + win_w - 180
    draw.rounded_rectangle([pill_r_x, chat_y + 2, pill_r_x + 155, chat_y + 28], radius=13, fill=(99, 102, 241, 40), outline=(99, 102, 241, 110), width=1)
    draw.ellipse([pill_r_x + 12, chat_y + 12, pill_r_x + 18, chat_y + 18], fill=(34, 197, 94, 255))
    draw.text((pill_r_x + 26, chat_y + 7), "Groq / Gemini LPU", font=f_badge, fill=(225, 230, 255, 250))

    draw.line([(chat_x, chat_y + 42), (win_x + win_w - 28, chat_y + 42)], fill=(255, 255, 255, 20), width=1)

    # 1. User Message (Right Aligned Bubble)
    user_bubble_y = chat_y + 56
    user_bubble_w = 460
    user_bubble_h = 56
    user_bubble_x = win_x + win_w - user_bubble_w - 32

    draw.rounded_rectangle(
        [user_bubble_x, user_bubble_y, user_bubble_x + user_bubble_w, user_bubble_y + user_bubble_h],
        radius=16,
        fill=(79, 70, 229, 255)
    )
    draw.text(
        (user_bubble_x + 18, user_bubble_y + 10),
        "Summarize the key architectural takeaways and",
        font=f_msg_user,
        fill=(255, 255, 255, 255)
    )
    draw.text(
        (user_bubble_x + 18, user_bubble_y + 30),
        "vector retrieval benchmarks for this document.",
        font=f_msg_user,
        fill=(255, 255, 255, 255)
    )

    # 2. Assistant Response Card (Left Aligned Card)
    ai_y = user_bubble_y + 72
    ai_w = chat_w - 10
    ai_h = 224

    draw.rounded_rectangle(
        [chat_x, ai_y, chat_x + ai_w, ai_y + ai_h],
        radius=16,
        fill=(23, 27, 40, 245),
        outline=(255, 255, 255, 24),
        width=1
    )

    # Assistant Avatar & Title
    draw.rounded_rectangle([chat_x + 16, ai_y + 14, chat_x + 44, ai_y + 42], radius=8, fill=(139, 92, 246, 255))
    draw.text((chat_x + 23, ai_y + 17), "AI", font=f_badge, fill=(255, 255, 255, 255))
    draw.text((chat_x + 54, ai_y + 18), "RAG Assistant", font=f_doc, fill=(255, 255, 255, 255))
    draw.text((chat_x + 155, ai_y + 20), "• 280ms inference  •  research_rag_specs.pdf", font=f_meta, fill=(145, 150, 172, 220))

    # Bullet points of AI response
    lines_y = ai_y + 54
    bullet_items = [
        ("• Grounded Accuracy (94.2%):", " All answers derived directly from retrieved document chunks without hallucinations."),
        ("• Vector Search Depth (k=6):", " ChromaDB uses dense FastEmbed ONNX vectors for precise semantic hit rate."),
        ("• Sub-Second Turnaround:", " Groq LPU acceleration executes conversational answers in ~280ms.")
    ]

    for title_part, desc_part in bullet_items:
        draw.text((chat_x + 20, lines_y), title_part, font=f_msg_ai_bold, fill=(226, 217, 204, 255))
        t_w = f_msg_ai_bold.getbbox(title_part)[2] - f_msg_ai_bold.getbbox(title_part)[0]
        draw.text((chat_x + 24 + t_w, lines_y), desc_part, font=f_msg_ai, fill=(215, 220, 235, 240))
        lines_y += 30

    # Source citation pill inside AI response
    lines_y += 12
    draw.rounded_rectangle([chat_x + 20, lines_y, chat_x + 240, lines_y + 26], radius=6, fill=(15, 45, 45, 255), outline=(45, 212, 191, 140), width=1)
    draw.text((chat_x + 30, lines_y + 6), "SOURCES: Page 1, 3 (Chunks #4, #12)", font=f_citation, fill=(45, 212, 191, 255))

    draw.rounded_rectangle([chat_x + 252, lines_y, chat_x + 360, lines_y + 26], radius=6, fill=(35, 40, 58, 255), outline=(255, 255, 255, 30), width=1)
    draw.text((chat_x + 268, lines_y + 6), "Copy Response", font=f_citation, fill=(210, 215, 235, 230))

    # 3. Chat Input Box (Bottom)
    input_y = win_y + win_h - 66
    input_w = chat_w
    draw.rounded_rectangle(
        [chat_x, input_y, chat_x + input_w, input_y + 46],
        radius=12,
        fill=(11, 14, 22, 255),
        outline=(99, 102, 241, 130),
        width=1
    )
    draw.text((chat_x + 18, input_y + 14), "Ask anything about your uploaded documents...", font=f_msg_user, fill=(125, 130, 155, 230))

    # Send button
    send_btn_w = 76
    send_btn_x = chat_x + input_w - send_btn_w - 6
    draw.rounded_rectangle(
        [send_btn_x, input_y + 6, send_btn_x + send_btn_w, input_y + 40],
        radius=8,
        fill=(99, 102, 241, 255)
    )
    draw.text((send_btn_x + 18, input_y + 12), "Send", font=f_label, fill=(255, 255, 255, 255))

    # Save to all target paths
    final_rgb = img.convert("RGB")
    for path in output_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        final_rgb.save(path, "PNG", optimize=True)
        print(f"Saved Realistic UI Mockup OG Image to: {path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets = [
        os.path.join(base_dir, "public", "og-image.png"),
        os.path.join(base_dir, "frontend", "public", "og-image.png"),
        os.path.join(base_dir, "frontend", "app", "opengraph-image.png"),
        os.path.join(base_dir, "frontend", "og-image.png")
    ]
    create_ui_mockup_og(targets)
