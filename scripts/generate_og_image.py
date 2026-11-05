import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

def create_light_ui_mockup_og(output_paths):
    width = 1200
    height = 630

    # 1. Base Canvas - Crisp, ultra-clean light modern studio backdrop (#f4f6fa)
    base_color = (244, 246, 250)
    img = Image.new("RGBA", (width, height), base_color)

    # Ambient soft pastel gradient glow in background (soft violet, sky blue, warm peach)
    glow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    g_draw = ImageDraw.Draw(glow_layer)
    g_draw.ellipse([60, -140, 680, 360], fill=(167, 139, 250, 90))   # Soft Purple
    g_draw.ellipse([640, 160, 1260, 660], fill=(56, 189, 248, 80))   # Sky Blue
    g_draw.ellipse([800, -80, 1300, 350], fill=(251, 146, 60, 60))   # Soft Peach/Orange
    g_draw.ellipse([150, 250, 750, 700], fill=(45, 212, 191, 55))    # Soft Teal
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(radius=105))
    img = Image.alpha_composite(img, glow_layer)

    # 2. Window Frame Geometry
    win_x = 60
    win_y = 42
    win_w = 1080
    win_h = 546

    # Soft Elevated Studio Shadow
    shadow_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    s_draw = ImageDraw.Draw(shadow_layer)
    s_draw.rounded_rectangle(
        [win_x + 4, win_y + 14, win_x + win_w + 4, win_y + win_h + 24],
        radius=22,
        fill=(15, 23, 42, 38)
    )
    s_draw.rounded_rectangle(
        [win_x + 2, win_y + 6, win_x + win_w + 2, win_y + win_h + 10],
        radius=20,
        fill=(15, 23, 42, 28)
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(radius=28))
    img = Image.alpha_composite(img, shadow_layer)

    # 3. Window Container (Clean White Card)
    win_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    w_draw = ImageDraw.Draw(win_layer)
    w_draw.rounded_rectangle(
        [win_x, win_y, win_x + win_w, win_y + win_h],
        radius=18,
        fill=(255, 255, 255, 255),
        outline=(226, 232, 240, 255),
        width=1
    )

    # Window Titlebar (Clean macOS Style)
    titlebar_h = 44
    w_draw.rounded_rectangle(
        [win_x, win_y, win_x + win_w, win_y + titlebar_h],
        radius=18,
        fill=(248, 250, 252, 255)
    )
    w_draw.rectangle([win_x, win_y + 20, win_x + win_w, win_y + titlebar_h], fill=(248, 250, 252, 255))
    w_draw.line([(win_x, win_y + titlebar_h), (win_x + win_w, win_y + titlebar_h)], fill=(226, 232, 240, 255), width=1)

    # Traffic lights (macOS buttons)
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
        fill=(255, 255, 255, 255),
        outline=(203, 213, 225, 255),
        width=1
    )

    # Small vector lock icon
    lock_cx = url_pill_x + 22
    lock_cy = url_pill_y + 13
    w_draw.rounded_rectangle([lock_cx - 4, lock_cy - 2, lock_cx + 4, lock_cy + 5], radius=2, fill=(100, 116, 139, 255))
    w_draw.arc([lock_cx - 3, lock_cy - 7, lock_cx + 3, lock_cy - 1], start=180, end=0, fill=(100, 116, 139, 255), width=1)

    # Sidebar background
    sidebar_w = 275
    body_y = win_y + titlebar_h
    body_h = win_h - titlebar_h
    w_draw.rectangle(
        [win_x, body_y, win_x + sidebar_w, win_y + win_h - 1],
        fill=(248, 250, 252, 255)
    )
    w_draw.line(
        [(win_x + sidebar_w, body_y), (win_x + sidebar_w, win_y + win_h - 1)],
        fill=(226, 232, 240, 255),
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
    f_label = ImageFont.truetype(font_bold, 11)
    f_doc = ImageFont.truetype(font_bold, 13)
    f_meta = ImageFont.truetype(font_regular, 11)
    f_msg_user = ImageFont.truetype(font_regular, 15)
    f_msg_ai = ImageFont.truetype(font_regular, 14)
    f_msg_ai_bold = ImageFont.truetype(font_bold, 14)
    f_citation = ImageFont.truetype(font_bold, 11)

    # URL Text
    url_text = "rag-chatbot-nine-taupe.vercel.app"
    draw.text((url_pill_x + 36, url_pill_y + 5), url_text, font=f_url, fill=(71, 85, 105, 255))

    # --- SIDEBAR CONTENTS (Light) ---
    sb_left = win_x + 20
    sb_y = body_y + 22

    # 1. Logo Orb + Brand Name
    logo_size = 36
    logo_img = Image.new("RGBA", (logo_size, logo_size), (0, 0, 0, 0))
    ld = ImageDraw.Draw(logo_img)
    ld.rounded_rectangle([0, 0, logo_size, logo_size], radius=11, fill=(99, 102, 241, 255))
    ld.ellipse([9, 12, 14, 17], fill=(255, 255, 255, 255))
    ld.ellipse([22, 12, 27, 17], fill=(255, 255, 255, 255))
    ld.arc([10, 16, 26, 27], start=20, end=160, fill=(255, 255, 255, 255), width=2)
    img.paste(logo_img, (sb_left, sb_y), logo_img)

    draw.text((sb_left + 46, sb_y + 2), "RAG Intelligence", font=f_logo, fill=(15, 23, 42, 255))
    draw.text((sb_left + 46, sb_y + 22), "DOCUMENT CHATBOT", font=f_badge, fill=(99, 102, 241, 255))

    # 2. Model Selector Box
    sb_y += 60
    draw.text((sb_left, sb_y), "AI ENGINE", font=f_label, fill=(100, 116, 139, 255))
    sb_y += 18
    draw.rounded_rectangle(
        [sb_left, sb_y, sb_left + sidebar_w - 40, sb_y + 38],
        radius=9,
        fill=(255, 255, 255, 255),
        outline=(203, 213, 225, 255),
        width=1
    )
    # Small bolt icon
    bx = sb_left + 16
    by = sb_y + 19
    draw.polygon([(bx, by-6), (bx+4, by-6), (bx+1, by-1), (bx+5, by-1), (bx-3, by+7), (bx-1, by+1), (bx-4, by+1)], fill=(245, 158, 11, 255))
    draw.text((sb_left + 28, sb_y + 10), "GPT OSS 120B / Gemini", font=f_doc, fill=(30, 41, 59, 255))

    # 3. Active Documents Section
    sb_y += 56
    draw.text((sb_left, sb_y), "KNOWLEDGE BASE (3 FILES)", font=f_label, fill=(100, 116, 139, 255))
    sb_y += 20

    # Doc 1: Active
    draw.rounded_rectangle(
        [sb_left, sb_y, sb_left + sidebar_w - 40, sb_y + 54],
        radius=11,
        fill=(238, 242, 255, 255),
        outline=(199, 210, 254, 255),
        width=1
    )
    # PDF Badge
    draw.rounded_rectangle([sb_left + 10, sb_y + 12, sb_left + 42, sb_y + 32], radius=5, fill=(239, 68, 68, 255))
    draw.text((sb_left + 16, sb_y + 14), "PDF", font=f_badge, fill=(255, 255, 255, 255))
    draw.text((sb_left + 50, sb_y + 10), "research_rag_specs.pdf", font=f_doc, fill=(15, 23, 42, 255))
    draw.text((sb_left + 50, sb_y + 29), "Doc ID: 1  •  Indexed (96 chunks)", font=f_meta, fill=(79, 70, 229, 255))

    # Doc 2
    sb_y += 62
    draw.rounded_rectangle(
        [sb_left, sb_y, sb_left + sidebar_w - 40, sb_y + 52],
        radius=11,
        fill=(255, 255, 255, 255),
        outline=(226, 232, 240, 255),
        width=1
    )
    draw.rounded_rectangle([sb_left + 10, sb_y + 11, sb_left + 48, sb_y + 31], radius=5, fill=(59, 130, 246, 255))
    draw.text((sb_left + 14, sb_y + 13), "DOCX", font=f_badge, fill=(255, 255, 255, 255))
    draw.text((sb_left + 56, sb_y + 9), "system_architecture.docx", font=f_doc, fill=(51, 65, 85, 255))
    draw.text((sb_left + 56, sb_y + 28), "Doc ID: 2  •  Indexed (42 chunks)", font=f_meta, fill=(100, 116, 139, 255))

    # Sidebar Bottom Status
    draw.line([(sb_left, win_y + win_h - 48), (sb_left + sidebar_w - 40, win_y + win_h - 48)], fill=(226, 232, 240, 255), width=1)
    draw.ellipse([sb_left + 6, win_y + win_h - 32, sb_left + 14, win_y + win_h - 24], fill=(34, 197, 94, 255))
    draw.text((sb_left + 22, win_y + win_h - 35), "Vector Store Ready (ChromaDB)", font=f_meta, fill=(71, 85, 105, 255))

    # --- MAIN CHAT PANEL (Light) ---
    chat_x = win_x + sidebar_w + 28
    chat_y = body_y + 18
    chat_w = win_w - sidebar_w - 56

    # Top Header in Chat Area
    draw.text((chat_x, chat_y), "Conversational Document Analysis", font=f_doc, fill=(15, 23, 42, 255))
    draw.text((chat_x, chat_y + 18), "Ask any question — answered with semantic citations & grounded memory", font=f_meta, fill=(100, 116, 139, 255))

    # Model Pill on right
    pill_r_x = win_x + win_w - 180
    draw.rounded_rectangle([pill_r_x, chat_y + 2, pill_r_x + 155, chat_y + 28], radius=13, fill=(238, 242, 255, 255), outline=(199, 210, 254, 255), width=1)
    draw.ellipse([pill_r_x + 12, chat_y + 12, pill_r_x + 18, chat_y + 18], fill=(34, 197, 94, 255))
    draw.text((pill_r_x + 26, chat_y + 7), "Groq / Gemini LPU", font=f_badge, fill=(79, 70, 229, 255))

    draw.line([(chat_x, chat_y + 42), (win_x + win_w - 28, chat_y + 42)], fill=(226, 232, 240, 255), width=1)

    # 1. User Message (Right Aligned Bubble - Vibrant Indigo)
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

    # 2. Assistant Response Card (Left Aligned Card - Crisp White with subtle border)
    ai_y = user_bubble_y + 72
    ai_w = chat_w - 10
    ai_h = 224

    draw.rounded_rectangle(
        [chat_x, ai_y, chat_x + ai_w, ai_y + ai_h],
        radius=16,
        fill=(255, 255, 255, 255),
        outline=(226, 232, 240, 255),
        width=1
    )

    # Assistant Avatar & Title
    draw.rounded_rectangle([chat_x + 16, ai_y + 14, chat_x + 44, ai_y + 42], radius=8, fill=(99, 102, 241, 255))
    draw.text((chat_x + 23, ai_y + 17), "AI", font=f_badge, fill=(255, 255, 255, 255))
    draw.text((chat_x + 54, ai_y + 18), "RAG Assistant", font=f_doc, fill=(15, 23, 42, 255))
    draw.text((chat_x + 155, ai_y + 20), "• 280ms inference  •  research_rag_specs.pdf", font=f_meta, fill=(100, 116, 139, 255))

    # Bullet points of AI response
    lines_y = ai_y + 54
    bullet_items = [
        ("• Grounded Accuracy (94.2%):", " All answers derived directly from retrieved document chunks without hallucinations."),
        ("• Vector Search Depth (k=6):", " ChromaDB uses dense FastEmbed ONNX vectors for precise semantic hit rate."),
        ("• Sub-Second Turnaround:", " Groq LPU acceleration executes conversational answers in ~280ms.")
    ]

    for title_part, desc_part in bullet_items:
        draw.text((chat_x + 20, lines_y), title_part, font=f_msg_ai_bold, fill=(67, 56, 202, 255))
        t_w = f_msg_ai_bold.getbbox(title_part)[2] - f_msg_ai_bold.getbbox(title_part)[0]
        draw.text((chat_x + 24 + t_w, lines_y), desc_part, font=f_msg_ai, fill=(30, 41, 59, 255))
        lines_y += 30

    # Source citation pill inside AI response
    lines_y += 12
    draw.rounded_rectangle([chat_x + 20, lines_y, chat_x + 245, lines_y + 26], radius=6, fill=(240, 253, 250, 255), outline=(94, 234, 212, 255), width=1)
    draw.text((chat_x + 28, lines_y + 6), "SOURCES: Page 1, 3 (Chunks #4, #12)", font=f_citation, fill=(13, 148, 136, 255))

    draw.rounded_rectangle([chat_x + 258, lines_y, chat_x + 368, lines_y + 26], radius=6, fill=(248, 250, 252, 255), outline=(226, 232, 240, 255), width=1)
    draw.text((chat_x + 274, lines_y + 6), "Copy Response", font=f_citation, fill=(71, 85, 105, 255))

    # 3. Chat Input Box (Bottom)
    input_y = win_y + win_h - 66
    input_w = chat_w
    draw.rounded_rectangle(
        [chat_x, input_y, chat_x + input_w, input_y + 46],
        radius=12,
        fill=(255, 255, 255, 255),
        outline=(199, 210, 254, 255),
        width=1
    )
    draw.text((chat_x + 18, input_y + 14), "Ask anything about your uploaded documents...", font=f_msg_user, fill=(148, 163, 184, 255))

    # Send button
    send_btn_w = 76
    send_btn_x = chat_x + input_w - send_btn_w - 6
    draw.rounded_rectangle(
        [send_btn_x, input_y + 6, send_btn_x + send_btn_w, input_y + 40],
        radius=8,
        fill=(79, 70, 229, 255)
    )
    draw.text((send_btn_x + 18, input_y + 12), "Send", font=f_label, fill=(255, 255, 255, 255))

    # Save to all target paths
    final_rgb = img.convert("RGB")
    for path in output_paths:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        final_rgb.save(path, "PNG", optimize=True)
        print(f"Saved Light UI Mockup OG Image to: {path}")

if __name__ == "__main__":
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    targets = [
        os.path.join(base_dir, "public", "og-image.png"),
        os.path.join(base_dir, "frontend", "public", "og-image.png"),
        os.path.join(base_dir, "frontend", "app", "opengraph-image.png"),
        os.path.join(base_dir, "frontend", "og-image.png")
    ]
    create_light_ui_mockup_og(targets)
