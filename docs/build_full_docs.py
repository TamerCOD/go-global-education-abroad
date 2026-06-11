# -*- coding: utf-8 -*-
"""GoGlobal CRM v5 — полная документация (A4 PDF).
Каждый функционал: описание, примеры, скриншоты, схемы, таблицы."""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, Image, KeepTogether, Flowable)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage
import sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ui_mocks import Mock
SHOTS = os.path.join(HERE, "shots")
OUT = os.path.join(HERE, "goglobal-crm-documentation.pdf")

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", r"C:\Windows\Fonts\ariali.ttf"))

# ---------- palette (CRM v5 design system) ----------
C_BG      = colors.HexColor("#0b0c0f")
C_SURF    = colors.HexColor("#121419")
C_ACCENT  = colors.HexColor("#4f46e5")
C_ACCENT2 = colors.HexColor("#6366f1")
C_ACC_LT  = colors.HexColor("#eef2ff")
C_TEAL    = colors.HexColor("#0d9488")
C_OK      = colors.HexColor("#059669")
C_OK_LT   = colors.HexColor("#ecfdf5")
C_WARN    = colors.HexColor("#d97706")
C_WARN_LT = colors.HexColor("#fffbeb")
C_BAD     = colors.HexColor("#e11d48")
C_BAD_LT  = colors.HexColor("#fff1f2")
C_INK     = colors.HexColor("#1c1f26")
C_INK2    = colors.HexColor("#4f5560")
C_INK3    = colors.HexColor("#8a91a0")
C_LINE    = colors.HexColor("#dee1e6")
C_ROW     = colors.HexColor("#f7f8f9")

PAGE_W, PAGE_H = A4
M_L, M_R, M_T, M_B = 22*mm, 18*mm, 20*mm, 18*mm
CONTENT_W = PAGE_W - M_L - M_R

# ---------- styles ----------
def st(name, **kw):
    base = dict(fontName="Arial", fontSize=10.5, leading=15.5, textColor=C_INK, spaceAfter=5)
    base.update(kw)
    return ParagraphStyle(name, **base)

S_H1   = st("H1", fontName="Arial-Bold", fontSize=22, leading=26, textColor=C_ACCENT, spaceBefore=4, spaceAfter=10)
S_H1N  = st("H1N", fontName="Arial-Bold", fontSize=11, leading=13, textColor=C_INK3, spaceAfter=2)
S_H2   = st("H2", fontName="Arial-Bold", fontSize=14.5, leading=18, textColor=C_INK, spaceBefore=12, spaceAfter=6)
S_H3   = st("H3", fontName="Arial-Bold", fontSize=11.5, leading=15, textColor=C_ACCENT, spaceBefore=9, spaceAfter=4)
S_BODY = st("Body")
S_SM   = st("Small", fontSize=9, leading=12.5, textColor=C_INK2)
S_CAP  = st("Caption", fontSize=8.5, leading=11, textColor=C_INK3, alignment=TA_CENTER, spaceBefore=3, spaceAfter=10)
S_LI   = st("Li", leftIndent=14, bulletIndent=4, spaceAfter=3)
S_NOTE = st("Note", fontSize=9.5, leading=13.5, textColor=C_INK2, backColor=C_ACC_LT,
            borderPadding=7, borderColor=C_ACCENT2, borderWidth=0.7, borderRadius=4, spaceBefore=6, spaceAfter=8)
S_WARNP= st("WarnP", fontSize=9.5, leading=13.5, textColor=C_INK2, backColor=C_WARN_LT,
            borderPadding=7, borderColor=C_WARN, borderWidth=0.7, borderRadius=4, spaceBefore=6, spaceAfter=8)
S_OKP  = st("OkP", fontSize=9.5, leading=13.5, textColor=C_INK2, backColor=C_OK_LT,
            borderPadding=7, borderColor=C_OK, borderWidth=0.7, borderRadius=4, spaceBefore=6, spaceAfter=8)
S_TOCH = st("TOCH", fontName="Arial-Bold", fontSize=11, leading=20, textColor=C_INK)
S_TOC2 = st("TOC2", fontSize=9.5, leading=15, textColor=C_INK2, leftIndent=12)

import re
_EMOJI_MAP = {"✓": "√", "✔": "√", "✗": "x", "✅": "", "❌": "", "ⓘ": "(i)", "⚠": "!",
              "🔒": "", "✈": "", "👋": "", "🎉": "", "·": "·"}
_EMOJI_RE = re.compile("[\U0001F000-\U0001FAFF☀-⛿✀-➿️⬀-⯿Ⓚ-⓿←↩-⇿]")
def sanitize(s):
    for k, v in _EMOJI_MAP.items(): s = s.replace(k, v)
    s = _EMOJI_RE.sub("", s)
    s = re.sub(r"  +", " ", s)
    s = re.sub(r"«\s+", "«", s); s = re.sub(r"\s+»", "»", s)
    return s

def P(text, style=S_BODY): return Paragraph(sanitize(text), style)
def B(text): return f"<b>{text}</b>"
def LI(text): return Paragraph(f"<bullet>•</bullet>{sanitize(text)}", S_LI)

# ---------- doc template with header/footer + TOC ----------
class Doc(BaseDocTemplate):
    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph):
            if fl.style.name == "H1":
                txt = fl.getPlainText()
                self.notify("TOCEntry", (0, txt, self.page))
                key = f"ch{self.page}-{txt[:18]}"
                self.canv.bookmarkPage(key)
                self.canv.addOutlineEntry(txt, key, 0, 0)
            elif fl.style.name == "H2":
                txt = fl.getPlainText()
                self.notify("TOCEntry", (1, txt, self.page))

def header_footer(canv, doc):
    canv.saveState()
    if doc.page > 1:
        canv.setStrokeColor(C_LINE); canv.setLineWidth(0.6)
        canv.line(M_L, PAGE_H - 13*mm, PAGE_W - M_R, PAGE_H - 13*mm)
        canv.setFont("Arial-Bold", 8); canv.setFillColor(C_ACCENT)
        canv.drawString(M_L, PAGE_H - 11*mm, "GoGlobal CRM")
        canv.setFont("Arial", 8); canv.setFillColor(C_INK3)
        canv.drawRightString(PAGE_W - M_R, PAGE_H - 11*mm, "Документация v5 · июнь 2026")
        canv.line(M_L, 12*mm, PAGE_W - M_R, 12*mm)
        canv.setFillColor(C_INK3); canv.setFont("Arial", 8)
        canv.drawCentredString(PAGE_W/2, 8*mm, str(doc.page))
        canv.drawString(M_L, 8*mm, "goglobal.kg/lidy")
        canv.drawRightString(PAGE_W - M_R, 8*mm, "для внутреннего использования")
    canv.restoreState()

doc = Doc(OUT, pagesize=A4, leftMargin=M_L, rightMargin=M_R, topMargin=M_T, bottomMargin=M_B,
          title="GoGlobal CRM — документация v5", author="GoGlobal")
frame = Frame(M_L, M_B, CONTENT_W, PAGE_H - M_T - M_B, id="main")
doc.addPageTemplates([PageTemplate(id="pt", frames=[frame], onPage=header_footer)])

story = []

# ---------- helpers ----------
CH = [0]
def chapter(title):
    CH[0] += 1
    story.append(PageBreak())
    story.append(P(f"ГЛАВА {CH[0]}", S_H1N))
    story.append(P(title, S_H1))
    story.append(HRule(C_ACCENT, 2.2))
    story.append(Spacer(1, 6))

class HRule(Flowable):
    def __init__(self, color=C_LINE, h=0.8, w=None):
        super().__init__(); self.color = color; self.h = h; self.w = w
    def wrap(self, aw, ah): self.aw = self.w or aw; return (self.aw, self.h + 2)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.h)
        self.canv.line(0, 1, self.aw, 1)

def shot(fname, caption, max_w=CONTENT_W, max_h=150*mm, border=True):
    """Embed a screenshot if it exists; silently skip otherwise."""
    path = os.path.join(SHOTS, fname)
    if not os.path.exists(path):
        return [P(f"<i>[скриншот {fname} будет добавлен]</i>", S_CAP)]
    iw, ih = PILImage.open(path).size
    scale = min(max_w / iw, max_h / ih)
    img = Image(path, width=iw*scale, height=ih*scale)
    if border:
        t = Table([[img]], colWidths=[iw*scale + 4])
        t.setStyle(TableStyle([
            ("BOX", (0,0), (-1,-1), 0.8, C_LINE),
            ("ALIGN", (0,0), (-1,-1), "CENTER"),
            ("TOPPADDING", (0,0), (-1,-1), 2), ("BOTTOMPADDING", (0,0), (-1,-1), 2),
            ("LEFTPADDING", (0,0), (-1,-1), 2), ("RIGHTPADDING", (0,0), (-1,-1), 2),
        ]))
        wrap = Table([[t]], colWidths=[CONTENT_W])
        wrap.setStyle(TableStyle([("ALIGN", (0,0), (-1,-1), "CENTER")]))
        return [wrap, P(caption, S_CAP)]
    return [img, P(caption, S_CAP)]

def mock(kind, h, caption):
    return [Spacer(1, 4), Mock(kind, h), P(caption, S_CAP)]

def tbl(data, widths, header=True, size=9, align_map=None):
    rows = []
    for ri, row in enumerate(data):
        cells = []
        for ci, c in enumerate(row):
            if isinstance(c, Paragraph): cells.append(c); continue
            if ri == 0 and header:
                cells.append(Paragraph(f"<b>{sanitize(str(c))}</b>", st("th", fontName="Arial-Bold", fontSize=size-0.5,
                                                         leading=size+2.5, textColor=colors.white)))
            else:
                cells.append(Paragraph(sanitize(str(c)), st("td", fontSize=size, leading=size+3.2, textColor=C_INK)))
        rows.append(cells)
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [
        ("GRID", (0,0), (-1,-1), 0.5, C_LINE),
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6),
    ]
    if header:
        style += [("BACKGROUND", (0,0), (-1,0), C_ACCENT),
                  ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, C_ROW])]
    else:
        style += [("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.white, C_ROW])]
    t.setStyle(TableStyle(style))
    return t

# ---------- diagram primitives ----------
class Diagram(Flowable):
    """Hand-drawn flow diagrams on canvas."""
    def __init__(self, kind, h=70*mm):
        super().__init__(); self.kind = kind; self.h = h
    def wrap(self, aw, ah): self.w = aw; return (aw, self.h)
    def box(self, x, y, w, h, label, sub=None, fill=colors.white, line=C_ACCENT, tcol=None, fs=9):
        c = self.canv
        c.setFillColor(fill); c.setStrokeColor(line); c.setLineWidth(1.1)
        c.roundRect(x, y, w, h, 3*mm, stroke=1, fill=1)
        c.setFillColor(tcol or C_INK)
        c.setFont("Arial-Bold", fs)
        if sub:
            c.drawCentredString(x + w/2, y + h/2 + 1.5, label)
            c.setFont("Arial", fs - 1.5); c.setFillColor(C_INK2)
            c.drawCentredString(x + w/2, y + h/2 - fs + 1.5, sub)
        else:
            c.drawCentredString(x + w/2, y + h/2 - fs/2 + 1.5, label)
    def arrow(self, x1, y1, x2, y2, color=C_INK3, label=None, dash=False):
        c = self.canv
        c.setStrokeColor(color); c.setLineWidth(1.1)
        if dash: c.setDash(3, 3)
        c.line(x1, y1, x2, y2)
        if dash: c.setDash()
        import math
        ang = math.atan2(y2 - y1, x2 - x1)
        for da in (math.radians(155), math.radians(-155)):
            c.line(x2, y2, x2 + 7*math.cos(ang + da), y2 + 7*math.sin(ang + da))
        if label:
            c.setFont("Arial", 7.5); c.setFillColor(color)
            c.drawCentredString((x1 + x2)/2, (y1 + y2)/2 + 4, label)
    def draw(self):
        getattr(self, "d_" + self.kind)()

    def d_arch(self):
        w = self.w; c = self.canv
        bw, bh = 46*mm, 17*mm; gap = (w - 3*bw) / 2
        y_top = self.h - bh - 2
        labels = [("Сайт goglobal.kg", "клиенты оставляют заявки", C_TEAL),
                  ("Админ-панель /admin", "настройки + аналитика", C_ACCENT),
                  ("CRM /lidy", "работа с лидами", C_OK)]
        for i, (l, s, col) in enumerate(labels):
            self.box(2 + i*(bw + gap), y_top, bw, bh, l, s, line=col)
        sw, sh = 80*mm, 15*mm
        sx = (w - sw)/2; sy = 6
        self.box(sx, sy, sw, sh, "Один сервер + одна база данных (PostgreSQL)",
                 "все три части видят одни и те же данные мгновенно", line=C_INK3, fill=C_ROW)
        for i in range(3):
            bx = 2 + i*(bw + gap) + bw/2
            self.arrow(bx, y_top - 1, sx + sw*(0.25 + 0.25*i), sy + sh + 1)

    def d_leadflow(self):
        w = self.w
        bw, bh = 30*mm, 15*mm; n = 5
        gap = (w - n*bw - 4) / (n - 1)
        y = self.h/2 - bh/2 + 4
        steps = [("Заявка", "сайт / партнёр / вручную", C_TEAL),
                 ("Дедупликация", "тот же телефон?", C_INK3),
                 ("Распределение", "правила → очередь", C_ACCENT),
                 ("Менеджер", "push + SLA-таймер", C_OK),
                 ("Telegram", "уведомление команды", C_INK3)]
        for i, (l, s, col) in enumerate(steps):
            x = 2 + i*(bw + gap)
            self.box(x, y, bw, bh, l, s, line=col, fs=8.5)
            if i < n - 1:
                self.arrow(x + bw + 1, y + bh/2, x + bw + gap - 1, y + bh/2)
        c = self.canv
        c.setFont("Arial", 8); c.setFillColor(C_INK2)
        c.drawCentredString(w/2, y - 7*mm, "Весь путь занимает ~2 секунды. Если все менеджеры офлайн — лид ждёт в очереди и раздаётся, когда кто-то включит «В сети».")

    def d_coupling(self):
        """Status funnel → won → stage pipeline with lock/auto/rollback rules."""
        w = self.w; c = self.canv
        # left: status funnel
        sx, sy = 2, self.h - 14*mm
        sw_, sh_ = 40*mm, 9.5*mm
        statuses = [("Новый", C_ACCENT2), ("В работе", C_WARN), ("Перезвонить / Не ответил", C_WARN),
                    ("Подойдёт в офис", C_TEAL)]
        c.setFont("Arial-Bold", 9.5); c.setFillColor(C_INK)
        c.drawString(sx, sy + 4.5*mm, "ВОРОНКА 1 · Статусы обработки")
        for i, (l, col) in enumerate(statuses):
            self.box(sx, sy - (i+1)*(sh_ + 2.2) + 2, sw_, sh_, l, line=col, fs=8)
        ty = sy - len(statuses)*(sh_ + 2.2) - 8
        self.box(sx, ty - sh_, sw_*0.47, sh_, "Отказ (lost)", line=C_BAD, fill=C_BAD_LT, fs=8)
        self.box(sx + sw_*0.53, ty - sh_, sw_*0.47, sh_, "Закрыт (won)", line=C_OK, fill=C_OK_LT, fs=8)
        # right: stages
        gx = w - 62*mm; gy = self.h - 14*mm
        c.setFont("Arial-Bold", 9.5); c.setFillColor(C_INK)
        c.drawString(gx, gy + 4.5*mm, "ВОРОНКА 2 · Этапы ведения клиента")
        stages = ["1 Контракт подписан", "2 Оплата 1", "3 Сбор документов", "4 Языковой экзамен",
                  "5 Собеседование", "6 Зачисление", "7 Виза", "8 Окончательная оплата", "9 Отъезд / прибытие"]
        st_h = 6.4*mm
        for i, l in enumerate(stages):
            fill = C_OK_LT if i == 0 else colors.white
            self.box(gx, gy - (i+1)*(st_h + 1.6) + 2, 58*mm, st_h, l, line=C_OK if i == 0 else C_INK3,
                     fill=fill, fs=7.5)
        # arrows / rules
        won_right = sx + sw_
        won_cy = ty - sh_/2
        first_y = gy - (st_h + 1.6) + 2 + st_h/2
        mid_x = (won_right + gx) / 2
        # win arrow (upper)
        self.arrow(won_right + 1, won_cy + 2, gx - 2, first_y + 1, color=C_OK)
        c.setFont("Arial-Bold", 8); c.setFillColor(C_OK)
        c.drawCentredString(mid_x, first_y + 6, "ПОБЕДА: этап 1")
        c.drawCentredString(mid_x, first_y - 4, "ставится автоматически")
        # rollback arrow (lower, dashed)
        self.arrow(gx - 2, won_cy - 4, won_right + 1, won_cy - 8, color=C_BAD, dash=True)
        c.setFont("Arial", 7.5); c.setFillColor(C_BAD)
        c.drawCentredString(mid_x, won_cy - 20, "откат статуса — этап снимается")
        c.setFont("Arial", 7.5); c.setFillColor(C_INK2)
        c.drawCentredString(mid_x, won_cy - 32, "пока сделка не выиграна,")
        c.drawCentredString(mid_x, won_cy - 42, "этапы под замком")

    def d_transfer(self):
        w = self.w
        bw, bh = 40*mm, 14*mm
        y = self.h/2 - bh/2 + 6
        self.box(4, y, bw, bh, "Менеджер А", "передал лида", line=C_ACCENT, fs=9)
        self.box(w/2 - bw/2, y, bw, bh, "Ожидание · 10 минут", "лид подсвечен у обоих", line=C_WARN, fs=9)
        self.box(w - bw - 4, y, bw, bh, "Менеджер Б", "принял → лид его", line=C_OK, fs=9)
        self.arrow(4 + bw + 1, y + bh/2, w/2 - bw/2 - 1, y + bh/2)
        self.arrow(w/2 + bw/2 + 1, y + bh/2, w - bw - 5, y + bh/2, label="принять")
        self.arrow(w/2, y - 1, 4 + bw/2, y - 9*mm, color=C_BAD, dash=True,
                   label="не принял за 10 мин → лид вернулся")

    def d_sla(self):
        w = self.w; c = self.canv
        y = self.h/2 + 6
        x0, x1 = 6, w - 6
        c.setStrokeColor(C_INK3); c.setLineWidth(1.4); c.line(x0, y, x1, y)
        marks = [(0.04, "Заявка пришла", "таймер пошёл (только рабочие часы)", C_ACCENT),
                 (0.42, "Первый ответ", "звонок / WhatsApp / смена статуса — SLA выполнен ✓", C_OK),
                 (0.80, "3 рабочих часа", "не ответили → лид «просрочен», сигнал РОПу", C_BAD)]
        for pos, l, s, col in marks:
            x = x0 + (x1 - x0)*pos
            c.setStrokeColor(col); c.setLineWidth(1.4); c.line(x, y - 4, x, y + 4)
            c.setFont("Arial-Bold", 8.5); c.setFillColor(col)
            c.drawString(x - 4, y + 8, l)
            c.setFont("Arial", 7.5); c.setFillColor(C_INK2)
            c.drawString(x - 4, y - 14, s)
        c.setFont("Arial", 8); c.setFillColor(C_INK2)
        c.drawString(x0, y - 11*mm, "Заявка в 23:00 не «горит» ночью: дедлайн перенесётся на утро — до 12:00 следующего рабочего дня.")

# ════════════════════════════════════════════════════════════════
#  COVER
# ════════════════════════════════════════════════════════════════
story.append(Spacer(1, 40*mm))
story.append(P("GoGlobal CRM", st("cv1", fontName="Arial-Bold", fontSize=40, leading=46, textColor=C_ACCENT)))
story.append(P("Полная документация системы", st("cv2", fontSize=18, leading=24, textColor=C_INK2)))
story.append(Spacer(1, 6))
story.append(HRule(C_ACCENT, 2.5))
story.append(Spacer(1, 10))
story.append(P("Каждый функционал — с примерами, скриншотами и схемами.<br/>"
               "Дизайн-система v5 · связка «статусы → этапы» · подсказки и выпадающие списки.",
               st("cv3", fontSize=12, leading=18, textColor=C_INK2)))
story.append(Spacer(1, 70*mm))
meta = tbl([["Продукт", "CRM агентства образования за рубежом GoGlobal"],
            ["Адрес", "goglobal.kg/lidy (CRM) · goglobal.kg/admin (админ-панель)"],
            ["Версия", "v5 · 12 июня 2026"],
            ["Для кого", "менеджеры по продажам · руководитель отдела (РОП) · администратор"],
            ["Формат", "A4 · печать и экран"]],
           [35*mm, CONTENT_W - 35*mm], header=False, size=9.5)
story.append(meta)

# ════════════════════════════════════════════════════════════════
#  TOC
# ════════════════════════════════════════════════════════════════
story.append(PageBreak())
story.append(P("Содержание", st("toct", fontName="Arial-Bold", fontSize=20, leading=24, textColor=C_INK, spaceAfter=10)))
toc = TableOfContents()
toc.levelStyles = [
    ParagraphStyle("t1", fontName="Arial-Bold", fontSize=10.5, leading=16, textColor=C_INK, leftIndent=0),
    ParagraphStyle("t2", fontName="Arial", fontSize=9, leading=13, textColor=C_INK2, leftIndent=14),
]
toc.dotsMinLevel = 0
story.append(toc)

# ════════════════════════════════════════════════════════════════
#  CH 1 · СИСТЕМА В ЦЕЛОМ
# ════════════════════════════════════════════════════════════════
chapter("Система в целом")
story.append(P("Что такое GoGlobal CRM", S_H2))
story.append(P(
    "GoGlobal CRM — собственная система управления продажами агентства. Она ведёт клиента от первой заявки "
    "на сайте до отъезда на учёбу: хранит контакты и документы, подсказывает менеджеру следующий шаг, "
    "считает всю аналитику автоматически и защищает от типовых ошибок (потерянный лид, забытый звонок, спор «кто вёл клиента»)."))
story.append(P("Три части одной системы", S_H2))
story.append(Diagram("arch", h=62*mm))
story.append(P("Схема 1 · Архитектура: три «двери» в одну базу данных", S_CAP))
story.append(tbl([
    ["Часть", "Адрес", "Кто пользуется", "Зачем"],
    ["Сайт", "goglobal.kg", "Клиенты", "Витрина: страны, вузы, калькулятор, форма заявки"],
    ["Админ-панель", "goglobal.kg/admin", "Админ, РОП", "Настройки всего + 11 виджетов аналитики"],
    ["CRM", "goglobal.kg/lidy", "Менеджеры, РОП, партнёры", "Обработка лидов: статусы, задачи, документы, сделки"],
], [22*mm, 30*mm, 38*mm, CONTENT_W - 90*mm]))
story.append(P("Как заявка попадает в работу", S_H2))
story.append(Diagram("leadflow", h=48*mm))
story.append(P("Схема 2 · Путь заявки: от формы на сайте до менеджера за ~2 секунды", S_CAP))

# ════════════════════════════════════════════════════════════════
#  CH 2 · ДИЗАЙН-СИСТЕМА V5
# ════════════════════════════════════════════════════════════════
chapter("Дизайн-система v5")
story.append(P(
    "Интерфейс CRM построен по современным стандартам B2B-продуктов (Linear, Notion, Attio): тёмная нейтральная "
    "тема для долгой работы без усталости глаз, один спокойный акцентный цвет, цветовое кодирование строго по смыслу."))
story.append(P("Палитра", S_H2))
def sw(hexc, name, hexlabel, role):
    return [Paragraph(f'<font backColor="{hexc}" color="{hexc}">██████</font>', S_BODY), name, hexlabel, role]
story.append(tbl([
    ["Образец", "Название", "HEX", "Роль в интерфейсе"],
    sw("#0b0c0f", "Графит-фон", "#0B0C0F", "Фон всего приложения (нейтральный, не синюшный)"),
    sw("#15171c", "Поверхность", "#15171C", "Карточки, панели, таблицы"),
    sw("#23262e", "Граница", "#23262E", "Линии и рамки"),
    sw("#6366f1", "Индиго-акцент", "#6366F1", "Кнопки, активные элементы, выделение — единственный акцент"),
    sw("#2dd4bf", "Теал", "#2DD4BF", "Вторичный: встречи, визиты в офис"),
    sw("#10b981", "Изумруд", "#10B981", "Только успех: выиграно, обработано, WhatsApp"),
    sw("#f59e0b", "Янтарь", "#F59E0B", "Только внимание: открытые, «в работе»"),
    sw("#ef4444", "Роза", "#EF4444", "Только тревога: просрочки, отказы, ошибки"),
], [20*mm, 32*mm, 22*mm, CONTENT_W - 74*mm]))
story.append(P("Принципы", S_H2))
for li in [
    f"{B('Один акцент.')} Индиго — единственный «главный» цвет: всё, что им подсвечено, кликабельно или активно.",
    f"{B('Цвет = смысл.')} Красное требует действия сейчас, янтарное — внимания, зелёное — констатирует успех. Цвета не используются «для красоты».",
    f"{B('Подсказки везде.')} У каждой неочевидной цифры и переключателя — значок ⓘ: наведите курсор и получите объяснение в одно предложение.",
    f"{B('Выпадающие списки вместо рядов кнопок.')} Статус, профиль, фильтры — компактные дропдауны с описанием каждого пункта.",
    f"{B('Без неона и свечений.')} Плоские поверхности, мягкие тени — меньше нагрузка на глаза и на видеокарту слабых ноутбуков.",
]:
    story.append(LI(li))

# ════════════════════════════════════════════════════════════════
#  CH 3 · РОЛИ И ДОСТУПЫ
# ════════════════════════════════════════════════════════════════
chapter("Роли и доступы")
story.append(P(
    "В системе четыре роли. Каждый сотрудник входит в CRM под личным логином и видит ровно то, что положено его роли."))
Y_, N_ = "✓", "—"
story.append(tbl([
    ["Действие", "Админ", "РОП", "Менеджер", "Партнёр"],
    ["Вход в админ-панель", Y_, Y_, N_, N_],
    ["Вход в CRM", N_, Y_, Y_, Y_],
    ["Видеть все лиды", "через админку", Y_, "только свои", "только свои"],
    ["Создавать лидов вручную", N_, Y_, Y_, Y_],
    ["Менять статус и этап", N_, "любого лида", "своего лида", N_],
    ["Переназначать лиды", N_, Y_, "передача с согласием", N_],
    ["Удалять лиды", N_, Y_, N_, N_],
    ["Создавать сотрудников", Y_, N_, N_, N_],
    ["Менять контент сайта", Y_, N_, N_, N_],
    ["Настраивать воронку и шаблоны", Y_, N_, N_, N_],
    ["Смотреть аналитику", "вся", "вся", "свой «Мой день»", "своя комиссия"],
], [52*mm, 26*mm, 26*mm, 33*mm, CONTENT_W - 137*mm]))
story.append(P(
    "Пароли менеджерам выдаёт админ. Сессия CRM живёт 12 часов — хватает на рабочий день, утром новый вход. "
    "Уволенного сотрудника не удаляют, а архивируют: доступ закрывается мгновенно, история и статистика сохраняются.", S_NOTE))

# ════════════════════════════════════════════════════════════════
#  CH 4 · ВХОД И РАБОЧИЙ СТОЛ
# ════════════════════════════════════════════════════════════════
chapter("Вход и рабочий стол")
story.append(P("Экран входа", S_H2))
story.append(P(
    "Откройте goglobal.kg/lidy, введите личный логин и пароль. При ошибке появится понятное сообщение прямо под полем — "
    "экран никогда не «зависает». Сохранённые пароли браузера работают."))
story += mock("login", 68*mm, "Макет · Экран входа в CRM (дизайн v5)")
story.append(P("Рабочий стол: пять зон", S_H2))
story += mock("dashboard", 96*mm, "Макет · Рабочий стол менеджера: шапка, плитки-счётчики с ⓘ, «Мой день», карточки лидов")
story.append(tbl([
    ["Зона", "Что в ней", "Главное"],
    ["1 · Шапка", "Поиск, «В сети», автообновление, база знаний, + Лид, профиль", "Тумблер «В сети» — без него лиды не приходят"],
    ["2 · Плитки-счётчики", "Всего · Открытых · Просрочено · В очереди · Передачи мне", "у каждой плитки — подсказка ⓘ"],
    ["3 · «Мой день»", "Встречи, горячие, задачи, суммы в работе и прогноз", "личный план на день"],
    ["4 · Фильтры (слева)", "Быстрые фильтры, статус, источник, страна, даты, пресеты", "сохраняйте частые наборы"],
    ["5 · Список лидов", "5 видов: карточки, таблица, 2 канбана, календарь", "вид запоминается"],
], [30*mm, 72*mm, CONTENT_W - 102*mm]))
story.append(P("Плитки-счётчики и «Мой день»", S_H2))
for li in [
    f"{B('Горячие')} — лиды со скорингом 60+ из 100 (полная анкета + активность). Обрабатываются первыми.",
    f"{B('В работе')} — сумма открытых сделок менеджера (закрытые не считаются).",
    f"{B('Прогноз')} — та же сумма, но взвешенная на вероятность каждой сделки: реалистичная оценка выручки.",
]:
    story.append(LI(li))
story.append(P("Тумблер «В сети» — критичная привычка", S_H2))
story.append(P(
    "Новые лиды распределяются только между менеджерами «В сети». Выключен тумблер — лиды идут коллегам или в очередь. "
    "Утром включить · уходя на обед или встречу — выключить · вечером выключить. Подсказка на самом тумблере напоминает об этом.", S_WARNP))

# ════════════════════════════════════════════════════════════════
#  CH 5 · ПЯТЬ ВИДОВ СПИСКА
# ════════════════════════════════════════════════════════════════
chapter("Пять видов списка лидов")
story.append(P(
    "Один и тот же список лидов можно смотреть пятью способами — переключатель справа над списком. Выбор сохраняется: "
    "завтра CRM откроется в том же виде с теми же фильтрами."))
story.append(tbl([
    ["Вид", "Что показывает", "Когда удобен"],
    ["🪟 Карточки", "Крупные карточки с контактами, чипами SLA, суммой, метками", "обзор глазами, работа мышкой"],
    ["📋 Таблица", "Плотные строки: клиент, контакты, статус, источник, SLA", "много лидов, быстрый скан"],
    ["🎯 Воронка статусов", "Канбан-колонки по статусам, перетаскивание карточек", "управление потоком продаж"],
    ["🎓 Этапы клиентов", "Канбан только выигранных сделок по 9 этапам", "сопровождение после контракта"],
    ["📅 Календарь", "Назначенные визиты: список / неделя / месяц", "планирование встреч"],
], [30*mm, 78*mm, CONTENT_W - 108*mm]))
story += mock("kanban", 66*mm, "Макет · Канбан «Воронка статусов»: перетащите карточку — статус сменится (с теми же проверками)")
story.append(P(
    "Перетаскивание в канбане полностью равнозначно смене статуса в карточке: сработают те же проверки "
    "(дата визита, причина отказа) и та же автоматика этапов.", S_NOTE))

# ════════════════════════════════════════════════════════════════
#  CH 6 · КАРТОЧКА ЛИДА
# ════════════════════════════════════════════════════════════════
chapter("Карточка лида")
story.append(P(
    "Карточка — главный экран работы с клиентом. Открывается кликом по лиду; можно развернуть по центру или держать сбоку. "
    "Вверху — имя, бейджи статуса и SLA, кнопки связи; ниже — семь вкладок."))
story.append(P("Семь вкладок", S_H2))
story.append(tbl([
    ["Вкладка", "Что внутри", "Пример использования"],
    ["Обзор", "Статус (выпадающий список), этапы (степпер), анкета, передача", "сменить статус после звонка"],
    ["💰 Сделка", "Сумма, валюта, вероятность 0–100%, скоринг", "зафиксировать бюджет $15 000 × 70%"],
    ["📋 Задачи", "Напоминания с дедлайнами", "«перезвонить в среду 14:00»"],
    ["📎 Файлы", "Документы клиента до 25 МБ", "паспорт, аттестат, IELTS, контракт"],
    ["💬 Чат", "Внутренние комментарии команды (клиент не видит)", "«договорились на пятницу»"],
    ["🕒 Аудит", "Полная история: кто, что и когда менял", "разбор спорной ситуации"],
    ["🔗 Связанные", "Лиды с тем же телефоном/email", "клиент обращался в прошлом году"],
], [24*mm, 76*mm, CONTENT_W - 100*mm]))
story.append(P("Быстрые действия и касания", S_H2))
story.append(P(
    "Кнопки «💬 WhatsApp», «📞 Позвонить», «✉ Email» и «📨 Шаблон» — в шапке карточки. Каждый клик автоматически "
    "записывается как «касание клиента» и попадает в статистику активности менеджера. «Шаблон» открывает готовые "
    "тексты с автоподстановкой имени клиента — WhatsApp откроется с уже написанным сообщением."))
story += mock("deal", 58*mm, "Макет · Вкладка «Сделка»: сумма, вероятность (ползунок), pipeline / взвешенно / скоринг")

# ════════════════════════════════════════════════════════════════
#  CH 7 · СТАТУСЫ И ЭТАПЫ: ЛОГИКА СВЯЗИ
# ════════════════════════════════════════════════════════════════
chapter("Статусы и этапы: логика связи")
story.append(P(
    "Это сердце системы. Воронка состоит из двух частей: СТАТУСЫ отвечают на вопрос «купит или нет?», "
    "ЭТАПЫ — «всё ли готово к отъезду?». Они жёстко связаны правилами — ошибиться невозможно."))
story.append(Diagram("coupling", h=110*mm))
story.append(P("Схема 3 · Связь воронок: победа открывает этапы, откат — закрывает", S_CAP))
story.append(P("Статусы обработки (воронка 1)", S_H2))
story.append(tbl([
    ["Статус", "Что означает", "Что попросит система"],
    ["Новый", "Только поступил, не тронут", "—"],
    ["В работе", "Первый контакт состоялся", "—"],
    ["Перезвонить", "Клиент попросил связаться позже", "—"],
    ["Не ответил", "Не берёт трубку, не читает", "—"],
    ["Подойдёт в офис", "Назначена встреча", "дату и время визита (попадёт в календарь)"],
    ["Закрыт ✅ (won)", "Контракт подписан — сделка выиграна", "— · откроет этапы автоматически"],
    ["Отказ ❌ (lost)", "Клиент не купил", "причину отказа + категорию"],
], [34*mm, 64*mm, CONTENT_W - 98*mm]))
story.append(P("Статус меняется через выпадающий список — у каждого пункта подсказка, что произойдёт после выбора:", S_BODY))
story += mock("dropdown", 86*mm, "Макет · Выпадающий список статусов: цветовая точка + подсказка поведения у каждого пункта")
story.append(P("Этапы ведения клиента (воронка 2)", S_H2))
story.append(P(
    "Девять шагов от контракта до отъезда. В карточке отображаются степпером — нумерованным списком с прогрессом: "
    "пройденные шаги зелёные с галочкой, текущий выделен индиго, будущие серые."))
story.append(tbl([
    ["№", "Этап", "Суть"],
    ["1", "📜 Контракт подписан", "договор оформлен (ставится автоматически при победе)"],
    ["2", "💰 Оплата 1 (предоплата)", "первый платёж получен"],
    ["3", "📂 Сбор документов", "паспорт, аттестат, переводы, апостили"],
    ["4", "🇬🇧 Языковой экзамен", "IELTS / TOPIK / JLPT — подготовка и сдача"],
    ["5", "🎤 Собеседование", "интервью с вузом"],
    ["6", "🎓 Зачисление", "вуз подтвердил место"],
    ["7", "🛂 Виза", "подача и получение визы"],
    ["8", "💵 Окончательная оплата", "финальный платёж"],
    ["9", "✈️ Отъезд / прибытие", "билеты, жильё, клиент уехал учиться"],
], [10*mm, 56*mm, CONTENT_W - 66*mm]))
story.append(P("Правила связи (работают автоматически)", S_H2))
for li in [
    f"{B('Блокировка.')} Пока статус не «Закрыт ✅», этапы под замком 🔒 — в карточке вместо степпера подсказка, почему и что сделать.",
    f"{B('Автостарт.')} Перевели лида в «Закрыт ✅» — система сама ставит этап «1 · Контракт подписан» и пишет об этом в чат карточки.",
    f"{B('Откат.')} Вернули статус из «Закрыт ✅» в рабочий или «Отказ» — этап снимается автоматически, история сохраняется в аудите.",
    f"{B('Защита от обхода.')} Даже при попытке выставить этап через канбан или массовое действие не-выигранному лиду сервер откажет с понятным сообщением.",
]:
    story.append(LI(li))
story += mock("locked", 40*mm, "Макет · Этапы под замком: сделка ещё не выиграна — подсказка объясняет, что сделать")
story += mock("stepper", 86*mm, "Макет · Степпер этапов выигранной сделки: пройдено ✓ → текущий (индиго) → будущие")

# ════════════════════════════════════════════════════════════════
#  CH 8 · SLA И СКОРИНГ
# ════════════════════════════════════════════════════════════════
chapter("SLA и скоринг")
story.append(P("SLA: 3 рабочих часа на первый ответ", S_H2))
story.append(Diagram("sla", h=50*mm))
story.append(P("Схема 4 · SLA-таймер первого ответа", S_CAP))
story.append(P(
    "SLA закрывается ЛЮБЫМ первым действием по лиду: сменой статуса, касанием (звонок/WhatsApp/email из карточки) "
    "или комментарием. Чип на карточке показывает оставшееся время; после ответа — «✓ обработан», у закрытых — «— закрыт». "
    "Таймер учитывает рабочие часы: ночные заявки не «горят»."))
story.append(P("Скоринг: насколько горяч лид (0–100)", S_H2))
story.append(tbl([
    ["Фактор", "Вклад"],
    ["Заполненность анкеты (бюджет, уровень, вуз, сроки…)", "до ~60 баллов"],
    ["Активность: касания, комментарии, свежесть", "до ~40 баллов"],
    ["Порог «горячего»", "60+ — бейдж 🔥, приоритет в работе"],
], [110*mm, CONTENT_W - 110*mm]))
story.append(P(
    "Скоринг пересчитывается автоматически после каждого изменения. Хотите «подогреть» лида в списке приоритетов — "
    "заполните анкету после первого разговора.", S_OKP))

# ════════════════════════════════════════════════════════════════
#  CH 9 · СОЗДАНИЕ ЛИДА И ИСТОЧНИКИ
# ════════════════════════════════════════════════════════════════
chapter("Создание лида и источники")
story.append(P("Откуда появляются лиды", S_H2))
story.append(tbl([
    ["Канал", "Как попадает", "Пометка источника"],
    ["Форма на сайте", "клиент сам оставил заявку", "Сайт + UTM-метки рекламы"],
    ["Вручную менеджером", "кнопка «+ Лид»: звонок, визит в офис", "выбирается в форме"],
    ["Партнёр", "партнёр завёл реферала под своим логином", "«партнёр: имя»"],
    ["Событийная ссылка", "лендинг мероприятия", "метка события"],
], [36*mm, 66*mm, CONTENT_W - 102*mm]))
story += mock("create", 82*mm, "Макет · Форма «Создать лид вручную»: обязателен только источник, в полях подсказки-примеры")
story.append(P("Защита от дублей", S_H2))
story.append(P(
    "Если заявка приходит с телефоном или email, который уже есть в базе, новый лид НЕ создаётся: к существующей "
    "карточке добавляется комментарий «клиент обратился повторно», а менеджер получает уведомление. История клиента "
    "не размазывается по дублям; прошлые обращения видны во вкладке «Связанные»."))

# ════════════════════════════════════════════════════════════════
#  CH 10 · ПЕРЕДАЧА, ОЧЕРЕДЬ, МАССОВЫЕ ДЕЙСТВИЯ
# ════════════════════════════════════════════════════════════════
chapter("Передача, очередь и массовые действия")
story.append(P("Передача лида коллеге", S_H2))
story.append(Diagram("transfer", h=55*mm))
story.append(P("Схема 5 · Передача с согласием: 10 минут на принятие", S_CAP))
story.append(P(
    "Уходите в отпуск или клиент «не ваш» по языку/стране? В карточке выберите коллегу — у него лид подсветится "
    "фиолетовым с таймером. Принял — лид его (вся история сохранилась). Не принял за 10 минут — лид вернулся к вам, "
    "РОП увидит уведомление в Telegram. РОП может переназначать лидов и без согласия — мгновенно."))
story.append(P("Очередь нераспределённых", S_H2))
story.append(P(
    "Заявка пришла, когда все офлайн? Лид встаёт в очередь (плитка «В очереди» на рабочем столе). Как только "
    "кто-то включает «В сети», очередь раздаётся автоматически и менеджер получает push."))
story.append(P("Массовые действия", S_H2))
story.append(P(
    "Фильтр «☑️ Массовые действия» включает галочки на карточках. Выделите несколько лидов — снизу появится панель: "
    "сменить статус, перевести этап, переназначить менеджера (РОП), навесить/снять метку. Все правила связи статусов "
    "и этапов действуют и здесь: история пишется по каждому лиду."))

# ════════════════════════════════════════════════════════════════
#  CH 11 · ЗАДАЧИ, ФАЙЛЫ, ЧАТ, АУДИТ
# ════════════════════════════════════════════════════════════════
chapter("Задачи, файлы, чат и аудит")
story.append(P("Задачи", S_H2))
story.append(P(
    "Любое обещание клиенту превращайте в задачу с дедлайном: «отправить список вузов до пятницы». Просроченные задачи "
    "подсвечиваются красным на карточке, в списке и в «Моём дне». Выполнили — отметьте галочкой, это попадёт в аудит."))
story.append(P("Файлы", S_H2))
story.append(P(
    "Паспорт, аттестат, сертификаты, контракт — до 25 МБ на файл (фото, PDF, документы Office, архивы). Файлы видны "
    "всей команде в карточке: при передаче лида ничего пересылать не нужно."))
story.append(P("Чат (внутренние комментарии)", S_H2))
story.append(P(
    "Заметки для команды: о чём договорились, что обещали, нюансы клиента. Сюда же система пишет автокомментарии: "
    "причину отказа, дату визита, автo-открытие этапа после победы. Клиент этих записей не видит."))
story.append(P("Аудит", S_H2))
story.append(P(
    "Каждое действие фиксируется: кто и когда сменил статус, загрузил файл, передал лида, изменил сделку. Спор "
    "«кто упустил клиента» решается за минуту — откройте вкладку «Аудит» и посмотрите хронологию."))

# ════════════════════════════════════════════════════════════════
#  CH 12 · КАЛЕНДАРЬ И ВСТРЕЧИ
# ════════════════════════════════════════════════════════════════
chapter("Календарь и встречи")
story.append(P(
    "Статус «Подойдёт в офис» всегда спрашивает дату: точное время, интервал или «в течение дня». Встреча автоматически "
    "появляется в календаре (вид «📅 Календарь»: список, неделя или месяц) и в плитке «Встречи сегодня». Клик по встрече "
    "открывает карточку клиента. Отдельного «создания события» нет — календарь всегда синхронен воронке."))

# ════════════════════════════════════════════════════════════════
#  CH 13 · ШАБЛОНЫ И БАЗА ЗНАНИЙ
# ════════════════════════════════════════════════════════════════
chapter("Шаблоны ответов и база знаний")
story.append(P("Шаблоны быстрых ответов", S_H2))
story.append(P(
    "Готовые тексты сообщений (приветствие, напоминание о встрече, список документов…) настраивает админ. Менеджер "
    "нажимает «📨 Шаблон» в карточке — имя клиента подставляется автоматически, WhatsApp открывается с готовым текстом. "
    "Экономия: ~2 минуты на каждом сообщении, единый тон компании в переписке."))
story.append(P("База знаний", S_H2))
story.append(P(
    "Кнопка «📖» в шапке CRM. Статьи пишет РОП в админке: «Виза в Японию: чек-лист», «Возражение „дорого“: 5 ответов», "
    "«Как заполнять сделку». Поиск по заголовкам, чтение прямо в CRM. Новичок выходит на план без месяца наставничества."))

# ════════════════════════════════════════════════════════════════
#  CH 14 · АВТОМАТИЗАЦИЯ
# ════════════════════════════════════════════════════════════════
chapter("Автоматизация")
story.append(tbl([
    ["Механизм", "Когда срабатывает", "Что делает"],
    ["Авто-распределение", "новый лид", "правила «страна/источник → менеджер», иначе очередь по кругу среди «в сети»"],
    ["SLA-надзор", "нет ответа к дедлайну", "лид краснеет, РОПу сигнал в Telegram, минус в статистику"],
    ["Авто-сценарии (no-code)", "лид завис в статусе N часов / нет ответа N часов", "создать задачу менеджеру или уведомить РОПа — настраивается в админке"],
    ["Дедупликация", "повторная заявка", "комментарий к старой карточке вместо дубля"],
    ["Связка статус→этап", "победа / откат", "открывает или снимает этап (глава 7)"],
    ["Утренний дайджест", "каждый день 09:00", "сводка РОПу в Telegram: вчерашние лиды, победы, просрочки, кто офлайн"],
    ["Авто-бэкап", "ежедневно", "копия базы данных на стороне хостинга"],
], [40*mm, 52*mm, CONTENT_W - 92*mm]))
story.append(P(
    "Пример авто-сценария: ЕСЛИ лид в «Перезвонить» дольше 48 часов, ТО создать задачу «Срочно перезвонить — клиент ждёт». "
    "Настраивается в админке без программиста: триггер → действие.", S_NOTE))

# ════════════════════════════════════════════════════════════════
#  CH 15 · АНАЛИТИКА ДЛЯ РОПа
# ════════════════════════════════════════════════════════════════
chapter("Аналитика для РОПа")
story.append(P(
    "Вся аналитика живёт в админ-панели и считается сама — никто не заполняет Excel. Одиннадцать виджетов:"))
story.append(tbl([
    ["Виджет", "Отвечает на вопрос", "Пример вывода"],
    ["🚦 Здоровье продаж", "всё ли в порядке прямо сейчас?", "светофор: зелёный/жёлтый/красный + причины"],
    ["🏆 Leaderboard", "кто как работает?", "конверсия, выручка, скорость отклика, касания"],
    ["📋 1-on-1 отчёт", "о чём говорить на встрече с менеджером?", "готовая сводка за неделю"],
    ["⏱ Время в статусах", "где лиды зависают?", "«в Перезвонить сидят по 5 дней»"],
    ["⏲ Скорость отклика", "кто быстрый, кто тянет?", "P50/P90 до первого ответа"],
    ["🌡 Heatmap входящих", "когда приходят заявки?", "«пик — воскресенье 20:00, все офлайн»"],
    ["🚪 Причины отказов", "почему теряем клиентов?", "«42% — дорого → нужна рассрочка»"],
    ["📆 Когортный анализ", "конверсия растёт или падает?", "сравнение месяцев поступления"],
    ["💸 ROI источников", "какая реклама окупается?", "Instagram $500 → $12 000"],
    ["📈 Дашборд CRM", "общая картина за период?", "динамика, прогноз выручки, экспорт Excel"],
    ["👁 Посещения сайта", "сколько людей заходит?", "трафик по дням"],
], [38*mm, 56*mm, CONTENT_W - 94*mm]))
story.append(P(
    "Светофор «Здоровье продаж»: 🟢 SLA ≥ 80% и конверсия ≥ 15% — работаем; 🟡 — открыть детали, найти узкое место; "
    "🔴 SLA < 60% или конверсия < 10% — разбираться немедленно. Под светофором система называет конкретную причину.", S_OKP))

# ════════════════════════════════════════════════════════════════
#  CH 16 · АДМИН-ПАНЕЛЬ
# ════════════════════════════════════════════════════════════════
chapter("Админ-панель (кратко)")
story.append(P(
    "Полная инструкция администратора — в «Базе знаний» (40 стр.). Здесь — карта разделов, влияющих на CRM:"))
story.append(tbl([
    ["Раздел", "Что настраивает"],
    ["🧑‍💼 Менеджеры", "сотрудники: логины, роли, рабочие часы, архивация при увольнении"],
    ["🎯 Статусы лидов", "воронка: добавить/переименовать статусы, флаги «требует причину/дату», этапы"],
    ["🏷 Метки клиентов", "цветные ярлыки: Hot, VIP, Грант, Повторный…"],
    ["📨 Шаблоны ответов", "тексты быстрых сообщений с плейсхолдерами"],
    ["🤖 Авто-распределение", "правила «страна/источник → менеджер»"],
    ["🤖 Авто-сценарии", "триггер → действие (раз в минуту)"],
    ["🚪 Причины отказов", "категории для closed_lost"],
    ["📖 База знаний", "статьи для менеджеров"],
    ["💵 Комиссии", "процент/фикс с выигранных сделок, расчёт выплат"],
    ["🕒 Журнал аудита", "все действия всех сотрудников"],
    ["🛠 Утилиты и бэкапы", "полный дамп данных одной кнопкой"],
], [48*mm, CONTENT_W - 48*mm]))

# ════════════════════════════════════════════════════════════════
#  CH 17 · СЦЕНАРИИ РАБОТЫ
# ════════════════════════════════════════════════════════════════
chapter("Сквозные сценарии работы")
story.append(P("Сценарий 1 · От заявки до отъезда", S_H2))
story.append(tbl([
    ["Шаг", "Действие", "Что делает система"],
    ["День 0", "Айгуль оставила заявку «Япония» на сайте", "дедуп → правило «Япония → Анна» → push Анне, SLA-таймер"],
    ["+20 мин", "Анна: WhatsApp-шаблон «Приветствие», статус «В работе»", "касание записано, SLA ✓, скоринг ↑"],
    ["День 2", "Статус «Подойдёт в офис» + дата", "встреча в календаре, автокомментарий"],
    ["День 3", "Паспорт в «Файлы», сделка $15 000 × 70%", "прогноз Анны +$10 500"],
    ["День 7", "Статус «Закрыт ✅»", "этап «Контракт подписан» открыт автоматически 🎉"],
    ["Месяцы 1–6", "Анна двигает степпер: оплата → документы → экзамен → виза…", "канбан этапов показывает прогресс РОПу"],
    ["Месяц 6", "Этап «Отъезд ✈»", "клиентка в Японии, карточка остаётся в истории"],
], [20*mm, 62*mm, CONTENT_W - 82*mm]))
story.append(P("Сценарий 2 · Отказ с пользой", S_H2))
story.append(P(
    "Клиент выбрал конкурента. Менеджер ставит «Отказ ❌» → система просит причину текстом и категорию "
    "(дорого / передумал / конкурент / не отвечает…). РОП в конце квартала видит сводку: «42% отказов — дорого» — "
    "и добавляет рассрочку в скрипты. Отказ — это данные, а не просто минус."))
story.append(P("Сценарий 3 · Менеджер заболел", S_H2))
story.append(P(
    "РОП открывает фильтр по менеджеру → «Массовые действия» → выделяет горячих → «Переназначить» Анне. 30 секунд, "
    "вся история и файлы уже у Анны. Авто-сценарий дополнительно следит, чтобы ни один лид болеющего не завис."))

# ════════════════════════════════════════════════════════════════
#  CH 18 · ЧЕК-ЛИСТЫ И FAQ
# ════════════════════════════════════════════════════════════════
chapter("Чек-листы и FAQ")
story.append(P("Ритуал менеджера (день)", S_H2))
for li in ["09:00 — открыть CRM, включить «🟢 В сети»", "Просмотреть «Мой день»: просроченные задачи → горячие → встречи",
           "Включить «Inbox 0» и обнулить список действий", "Новым лидам — ответ в течение 15 минут (шаблоны!)",
           "Суммы сделок заполнять сразу после разговора о бюджете", "Обед/встреча — «не в сети», вернулись — обратно",
           "18:00 — Inbox 0 пуст, «не в сети», домой"]:
    story.append(LI(li))
story.append(P("Ритуал РОПа (неделя)", S_H2))
for li in ["Ежедневно 09:00 — Telegram-дайджест, при 🟡/🔴 — в админку за причиной",
           "Понедельник — Leaderboard за неделю, раздать зависших",
           "Среда — 1-on-1 по готовым отчётам", "Пятница — причины отказов + ROI источников"]:
    story.append(LI(li))
story.append(P("Частые вопросы", S_H2))
story.append(tbl([
    ["Вопрос", "Ответ"],
    ["Забыл пароль?", "Админ выдаст новый через раздел «Менеджеры». Самосброса нет — так безопаснее."],
    ["Лид никому не пришёл?", "Все были офлайн. Включите «В сети» — очередь раздастся автоматически."],
    ["Можно с телефона?", "Да: CRM ставится на главный экран как приложение, push приходят туда же."],
    ["Почему этапы серые?", "Сделка ещё не выиграна. Этапы откроются при статусе «Закрыт ✅» (глава 7)."],
    ["Передал лида, коллега молчит?", "Через 10 минут лид вернётся к вам автоматически."],
    ["Клиент пришёл повторно?", "Система сама привяжет заявку к старой карточке — смотрите «Связанные»."],
    ["Случайно сменил статус?", "Верните прежний — всё видно в «Аудите», ничего не теряется."],
], [52*mm, CONTENT_W - 52*mm]))

story.append(Spacer(1, 14))
story.append(HRule(C_ACCENT, 2))
story.append(P("GoGlobal CRM · документация v5 · обновляется вместе с системой", S_CAP))

doc.multiBuild(story)
print("OK:", OUT)
