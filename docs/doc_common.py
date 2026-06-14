# -*- coding: utf-8 -*-
"""Shared documentation toolkit for GoGlobal CRM v5 PDFs (June 2026 refresh).
One unified style for every guide: cover + TOC (clickable) + chapters + the v5
palette + drawn UI mock-ups (ui_mocks.Mock) + flow diagrams + styled tables/callouts."""
import os, re, sys, math
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, Image, Flowable)
from reportlab.platypus.tableofcontents import TableOfContents
from PIL import Image as PILImage

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from ui_mocks import Mock
SHOTS = os.path.join(HERE, "shots")

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", r"C:\Windows\Fonts\ariali.ttf"))

# ---------- palette (CRM v5 design system) ----------
C_BG      = colors.HexColor("#0b0c0f")
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
C_VIO     = colors.HexColor("#7c3aed")
C_VIO_LT  = colors.HexColor("#f5f3ff")
C_INK     = colors.HexColor("#1c1f26")
C_INK2    = colors.HexColor("#4f5560")
C_INK3    = colors.HexColor("#8a91a0")
C_LINE    = colors.HexColor("#dee1e6")
C_ROW     = colors.HexColor("#f7f8f9")

PAGE_W, PAGE_H = A4
M_L, M_R, M_T, M_B = 22*mm, 18*mm, 20*mm, 18*mm
CONTENT_W = PAGE_W - M_L - M_R

def st(name, **kw):
    base = dict(fontName="Arial", fontSize=10.5, leading=15.5, textColor=C_INK, spaceAfter=5)
    base.update(kw); return ParagraphStyle(name, **base)

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
S_BADP = st("BadP", fontSize=9.5, leading=13.5, textColor=C_INK2, backColor=C_BAD_LT,
            borderPadding=7, borderColor=C_BAD, borderWidth=0.7, borderRadius=4, spaceBefore=6, spaceAfter=8)

_EMOJI_MAP = {"✓": "√", "✔": "√", "✗": "x", "✅": "", "❌": "", "ⓘ": "(i)", "⚠": "!", "→": "->",
              "🔒": "", "✈": "", "👋": "", "🎉": "", "·": "·", "—": "—"}
# Arial has no emoji glyphs — strip them (after the map above replaces the few we keep).
_EMOJI_RE = re.compile(
    "[‍⁩︀-️←-⇿⌀-➿"
    "⤀-⥿⬀-⯿🀀-🫿]")
def sanitize(s):
    s = str(s)
    for k, v in _EMOJI_MAP.items(): s = s.replace(k, v)
    s = _EMOJI_RE.sub("", s)
    s = re.sub(r"  +", " ", s)
    s = re.sub(r"«\s+", "«", s); s = re.sub(r"\s+»", "»", s)
    return s

def P(text, style=S_BODY): return Paragraph(sanitize(text), style)
def B(text): return f"<b>{text}</b>"
def LI(text): return Paragraph(f"<bullet>•</bullet>{sanitize(text)}", S_LI)
def NOTE(text): return Paragraph(sanitize(text), S_NOTE)
def WARN(text): return Paragraph(sanitize(text), S_WARNP)
def OK(text): return Paragraph(sanitize(text), S_OKP)
def BAD(text): return Paragraph(sanitize(text), S_BADP)

class HRule(Flowable):
    def __init__(self, color=C_LINE, h=0.8, w=None):
        super().__init__(); self.color = color; self.h = h; self.w = w
    def wrap(self, aw, ah): self.aw = self.w or aw; return (self.aw, self.h + 2)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.h)
        self.canv.line(0, 1, self.aw, 1)

def shot(fname, caption, max_w=CONTENT_W, max_h=150*mm):
    path = os.path.join(SHOTS, fname)
    if not os.path.exists(path):
        return [P(f"<i>[скриншот {fname}]</i>", S_CAP)]
    iw, ih = PILImage.open(path).size
    scale = min(max_w / iw, max_h / ih)
    img = Image(path, width=iw*scale, height=ih*scale)
    t = Table([[img]], colWidths=[iw*scale + 4])
    t.setStyle(TableStyle([("BOX", (0,0), (-1,-1), 0.8, C_LINE), ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("TOPPADDING", (0,0), (-1,-1), 2), ("BOTTOMPADDING", (0,0), (-1,-1), 2),
        ("LEFTPADDING", (0,0), (-1,-1), 2), ("RIGHTPADDING", (0,0), (-1,-1), 2)]))
    wrap = Table([[t]], colWidths=[CONTENT_W]); wrap.setStyle(TableStyle([("ALIGN", (0,0), (-1,-1), "CENTER")]))
    return [wrap, P(caption, S_CAP)]

def mock(kind, h, caption):
    return [Spacer(1, 4), Mock(kind, h), P(caption, S_CAP)]

def tbl(data, widths, header=True, size=9):
    rows = []
    for ri, row in enumerate(data):
        cells = []
        for ci, c in enumerate(row):
            if isinstance(c, Paragraph): cells.append(c); continue
            if ri == 0 and header:
                cells.append(Paragraph(f"<b>{sanitize(str(c))}</b>", st("th", fontName="Arial-Bold",
                            fontSize=size-0.5, leading=size+2.5, textColor=colors.white)))
            else:
                cells.append(Paragraph(sanitize(str(c)), st("td", fontSize=size, leading=size+3.2, textColor=C_INK)))
        rows.append(cells)
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    style = [("GRID", (0,0), (-1,-1), 0.5, C_LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6)]
    if header:
        style += [("BACKGROUND", (0,0), (-1,0), C_ACCENT), ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, C_ROW])]
    else:
        style += [("ROWBACKGROUNDS", (0,0), (-1,-1), [colors.white, C_ROW])]
    t.setStyle(TableStyle(style)); return t

# ---------- flow diagrams ----------
class Diagram(Flowable):
    def __init__(self, kind, h=70*mm):
        super().__init__(); self.kind = kind; self.h = h
    def wrap(self, aw, ah): self.w = aw; return (aw, self.h)
    def box(self, x, y, w, h, label, sub=None, fill=colors.white, line=C_ACCENT, tcol=None, fs=9):
        c = self.canv; c.setFillColor(fill); c.setStrokeColor(line); c.setLineWidth(1.1)
        c.roundRect(x, y, w, h, 3*mm, stroke=1, fill=1)
        c.setFillColor(tcol or C_INK); c.setFont("Arial-Bold", fs)
        if sub:
            c.drawCentredString(x + w/2, y + h/2 + 1.5, sanitize(label))
            c.setFont("Arial", fs - 1.5); c.setFillColor(C_INK2)
            c.drawCentredString(x + w/2, y + h/2 - fs + 1.5, sanitize(sub))
        else:
            c.drawCentredString(x + w/2, y + h/2 - fs/2 + 1.5, sanitize(label))
    def arrow(self, x1, y1, x2, y2, color=C_INK3, label=None, dash=False):
        c = self.canv; c.setStrokeColor(color); c.setLineWidth(1.1)
        if dash: c.setDash(3, 3)
        c.line(x1, y1, x2, y2)
        if dash: c.setDash()
        ang = math.atan2(y2 - y1, x2 - x1)
        for da in (math.radians(155), math.radians(-155)):
            c.line(x2, y2, x2 + 7*math.cos(ang + da), y2 + 7*math.sin(ang + da))
        if label:
            c.setFont("Arial", 7.5); c.setFillColor(color)
            c.drawCentredString((x1 + x2)/2, (y1 + y2)/2 + 4, sanitize(label))
    def draw(self): getattr(self, "d_" + self.kind)()

    def d_arch(self):
        w = self.w; bw, bh = 46*mm, 17*mm; gap = (w - 3*bw) / 2; y_top = self.h - bh - 2
        labels = [("Сайт goglobal.kg", "клиенты оставляют заявки", C_TEAL),
                  ("Админка /admin300499", "настройки + аналитика", C_ACCENT),
                  ("CRM /lidy300499", "работа с лидами", C_OK)]
        for i, (l, s, col) in enumerate(labels):
            self.box(2 + i*(bw + gap), y_top, bw, bh, l, s, line=col)
        sw, sh = 86*mm, 15*mm; sx = (w - sw)/2; sy = 6
        self.box(sx, sy, sw, sh, "Один сервер + одна база (PostgreSQL)", "все части видят одни данные мгновенно",
                 line=C_INK3, fill=C_ROW)
        for i in range(3):
            self.arrow(2 + i*(bw + gap) + bw/2, y_top - 1, sx + sw*(0.25 + 0.25*i), sy + sh + 1)

    def d_leadflow(self):
        w = self.w; bw, bh = 30*mm, 15*mm; n = 5
        gap = (w - n*bw - 4) / (n - 1); y = self.h/2 - bh/2 + 4
        steps = [("Заявка", "сайт / партнёр / вручную", C_TEAL), ("Дедупликация", "тот же телефон?", C_INK3),
                 ("Распределение", "правила -> очередь", C_ACCENT), ("Менеджер", "push + SLA-таймер", C_OK),
                 ("Telegram", "уведомление команды", C_INK3)]
        for i, (l, s, col) in enumerate(steps):
            x = 2 + i*(bw + gap)
            self.box(x, y, bw, bh, l, s, line=col, fs=8.5)
            if i < n - 1: self.arrow(x + bw + 1, y + bh/2, x + bw + gap - 1, y + bh/2)
        c = self.canv; c.setFont("Arial", 8); c.setFillColor(C_INK2)
        c.drawCentredString(w/2, y - 7*mm, "Весь путь ~2 секунды. Если все офлайн — лид ждёт в очереди и раздаётся при выходе в сеть.")

    def d_roles(self):
        """Teamlead vs manager capability split."""
        w = self.w; c = self.canv
        colw = (w - 8*mm)/2
        # teamlead
        self.box(2, self.h - 12*mm, colw, 10*mm, "ТИМЛИД (РОП)", "руководитель отдела", line=C_VIO, fs=10)
        tl = ["Видит ВСЕ лиды команды", "Аналитика и Leaderboard", "Распределение и передачи",
              "Цели менеджеров", "Импорт CSV · Корзина", "Удаление лидов"]
        for i, l in enumerate(tl):
            self.box(2, self.h - 16*mm - (i+1)*7*mm, colw, 6*mm, l, line=C_VIO, fill=C_VIO_LT, fs=8)
        # manager
        self.box(2 + colw + 8*mm, self.h - 12*mm, colw, 10*mm, "МЕНЕДЖЕР", "продавец", line=C_OK, fs=10)
        mg = ["Видит СВОИ лиды", "Обработка: статусы, этапы", "Звонки, WhatsApp, шаблоны",
              "Задачи и встречи", "Сделки и скоринг", "Передать лид коллеге"]
        for i, l in enumerate(mg):
            self.box(2 + colw + 8*mm, self.h - 16*mm - (i+1)*7*mm, colw, 6*mm, l, line=C_OK, fill=C_OK_LT, fs=8)

    def d_dedupe(self):
        """Repeat enquiry -> duplicate lead linked to original."""
        w = self.w; bw, bh = 34*mm, 15*mm
        y = self.h - 22*mm
        self.box(2, y, bw, bh, "Новая заявка", "тот же телефон/email", line=C_TEAL)
        self.box(2 + (w-bw)/2, y, bw, bh, "Дедупликация", "ищем совпадение", line=C_INK3)
        self.box(2 + (w-bw), y, bw, bh, "Дубль", "статус «Дубль»", line=C_VIO, fill=C_VIO_LT)
        self.arrow(2 + bw + 1, y + bh/2, 2 + (w-bw)/2 - 1, y + bh/2)
        self.arrow(2 + (w-bw)/2 + bw + 1, y + bh/2, 2 + (w-bw) - 1, y + bh/2, label="совпало")
        self.box(2 + (w-bw), y - 22*mm, bw, bh, "Оригинал #21", "вся история тут", line=C_OK, fill=C_OK_LT)
        self.arrow(2 + (w-bw) + bw/2, y - 1, 2 + (w-bw) + bw/2, y - 22*mm + bh + 1, dash=True, color=C_VIO,
                   label="привязка")
        c = self.canv; c.setFont("Arial", 7.5); c.setFillColor(C_INK2)
        c.drawString(2, 4, "Повторное обращение не теряется и не путается: создаётся отдельная карточка «Дубль», "
                           "назначенная менеджеру оригинала, со ссылкой на исходную историю.")

    def d_backup(self):
        w = self.w; bw, bh = 40*mm, 15*mm; y = self.h/2 - bh/2 + 6
        steps = [("Кнопка в админке", "«Скачать полный дамп»", C_ACCENT),
                 ("Сервер собирает", "14 таблиц -> JSON", C_INK3),
                 ("ZIP-архив", "+ manifest + README", C_TEAL),
                 ("Скачивается к вам", "храните вне сервера", C_OK)]
        gap = (w - len(steps)*bw - 4)/(len(steps)-1)
        for i, (l, s, col) in enumerate(steps):
            x = 2 + i*(bw + gap)
            self.box(x, y, bw, bh, l, s, line=col, fs=8.5)
            if i < len(steps)-1: self.arrow(x + bw + 1, y + bh/2, x + bw + gap - 1, y + bh/2)

    def d_super(self):
        w = self.w; bw, bh = 38*mm, 15*mm; y = self.h/2 - bh/2 + 4
        steps = [("Действие", "сменить пароль / удалить", C_ACCENT),
                 ("Всплывает окно", "просит суперпароль", C_WARN),
                 ("Проверка", "верно?", C_INK3),
                 ("Выполнено", "иначе — отказ", C_OK)]
        gap = (w - len(steps)*bw - 4)/(len(steps)-1)
        for i, (l, s, col) in enumerate(steps):
            x = 2 + i*(bw + gap)
            self.box(x, y, bw, bh, l, s, line=col, fs=8.5)
            if i < len(steps)-1: self.arrow(x + bw + 1, y + bh/2, x + bw + gap - 1, y + bh/2)
        c = self.canv; c.setFont("Arial", 7.5); c.setFillColor(C_BAD)
        c.drawCentredString(2 + 2*(bw+gap) + bw/2, y - 7*mm, "неверно -> 403, ничего не меняется")

    def d_approval(self):
        w = self.w; bw, bh = 39*mm, 15*mm; y = self.h/2 - bh/2 + 6
        steps = [("Перевод на этап", "менеджер", C_ACCENT),
                 ("Гейт этапа", "файл и/или согласование", C_WARN),
                 ("Задача РОПу", "статус «ожидание»", C_VIO),
                 ("Подтвердил -> переход", "отказал -> остаётся", C_OK)]
        gap = (w - len(steps)*bw - 4)/(len(steps)-1)
        for i, (l, s, col) in enumerate(steps):
            x = 2 + i*(bw + gap)
            self.box(x, y, bw, bh, l, s, line=col, fs=8.5)
            if i < len(steps)-1: self.arrow(x + bw + 1, y + bh/2, x + bw + gap - 1, y + bh/2)
        c = self.canv; c.setFont("Arial", 7.5); c.setFillColor(C_BAD)
        c.drawCentredString(2 + 3*(bw+gap) + bw/2, y - 7*mm, "при отказе — обязательный комментарий")
        c.setFillColor(C_INK2)
        c.drawString(2, 4, "Если гейты у этапа выключены — переход мгновенный. Откат на предыдущий этап — только РОП/админ.")

    def d_tglink(self):
        w = self.w; bw, bh = 38*mm, 15*mm; y = self.h/2 - bh/2 + 4
        steps = [("Админ: код", "кнопка TG-код", C_ACCENT),
                 ("/start", "сотрудник в боте", C_TEAL),
                 ("логин + код", "бот проверяет", C_INK3),
                 ("Привязано", "личные алерты идут", C_OK)]
        gap = (w - len(steps)*bw - 4)/(len(steps)-1)
        for i, (l, s, col) in enumerate(steps):
            x = 2 + i*(bw + gap)
            self.box(x, y, bw, bh, l, s, line=col, fs=8.5)
            if i < len(steps)-1: self.arrow(x + bw + 1, y + bh/2, x + bw + gap - 1, y + bh/2)
        c = self.canv; c.setFont("Arial", 7.5); c.setFillColor(C_INK2)
        c.drawString(2, 4, "Новый код сбрасывает привязку; увольнение стирает её; /stop — отвязаться самому.")

    def d_sla(self):
        w = self.w; c = self.canv
        y = self.h - 16*mm; bw, bh = 42*mm, 12*mm
        self.box(2, y, bw, bh, "Лид получен", "стартует SLA-таймер", line=C_TEAL)
        self.box(2 + (w-bw)/2, y, bw, bh, "Первый ответ", "в срок?", line=C_INK3)
        self.arrow(2 + bw + 1, y + bh/2, 2 + (w-bw)/2 - 1, y + bh/2)
        self.box(2 + (w-bw)/2 - bw*0.55, y - 20*mm, bw*1.1, bh, "В срок -> зелёный", line=C_OK, fill=C_OK_LT, fs=8)
        self.box(2 + (w-bw), y - 20*mm, bw, bh, "Просрочка -> красный", line=C_BAD, fill=C_BAD_LT, fs=8)
        self.arrow(2 + (w-bw)/2 + bw/2, y - 1, 2 + (w-bw)/2, y - 20*mm + bh + 1, color=C_OK, label="да")
        self.arrow(2 + (w-bw)/2 + bw, y - 1, 2 + (w-bw) + bw/2, y - 20*mm + bh + 1, color=C_BAD, label="нет")
        c.setFont("Arial", 7.5); c.setFillColor(C_INK2)
        c.drawString(2, 4, "Срок (SLA) задаётся в админке: базовый, для горячих лидов и отдельно по источникам. "
                           "Таймер считает только рабочие часы. Просрочка = нет первого ответа вовремя.")


def diagram(kind, h, caption):
    return [Spacer(1, 4), Diagram(kind, h), P(caption, S_CAP)]

# ---------- document scaffolding ----------
class _Doc(BaseDocTemplate):
    def afterFlowable(self, fl):
        if isinstance(fl, Paragraph):
            if fl.style.name == "H1":
                txt = fl.getPlainText(); self.notify("TOCEntry", (0, txt, self.page))
                key = f"ch{self.page}-{txt[:18]}"; self.canv.bookmarkPage(key); self.canv.addOutlineEntry(txt, key, 0, 0)
            elif fl.style.name == "H2":
                self.notify("TOCEntry", (1, fl.getPlainText(), self.page))

def make_doc(out_path, title, running):
    """Return (doc, story). `running` is the small header label, e.g. 'Админка · июнь 2026'."""
    def hf(canv, d):
        canv.saveState()
        if d.page > 1:
            canv.setStrokeColor(C_LINE); canv.setLineWidth(0.6)
            canv.line(M_L, PAGE_H - 13*mm, PAGE_W - M_R, PAGE_H - 13*mm)
            canv.setFont("Arial-Bold", 8); canv.setFillColor(C_ACCENT)
            canv.drawString(M_L, PAGE_H - 11*mm, "GoGlobal")
            canv.setFont("Arial", 8); canv.setFillColor(C_INK3)
            canv.drawRightString(PAGE_W - M_R, PAGE_H - 11*mm, sanitize(running))
            canv.line(M_L, 12*mm, PAGE_W - M_R, 12*mm)
            canv.setFillColor(C_INK3); canv.setFont("Arial", 8)
            canv.drawCentredString(PAGE_W/2, 8*mm, str(d.page))
            canv.drawString(M_L, 8*mm, "goglobal.kg")
            canv.drawRightString(PAGE_W - M_R, 8*mm, "для внутреннего использования")
        canv.restoreState()
    doc = _Doc(out_path, pagesize=A4, leftMargin=M_L, rightMargin=M_R, topMargin=M_T, bottomMargin=M_B,
               title=title, author="GoGlobal")
    frame = Frame(M_L, M_B, CONTENT_W, PAGE_H - M_T - M_B, id="main")
    doc.addPageTemplates([PageTemplate(id="pt", frames=[frame], onPage=hf)])
    return doc, []

class _Cover(Flowable):
    def __init__(self, kicker, title, subtitle, tag):
        super().__init__(); self.kicker = kicker; self.title = title; self.subtitle = subtitle; self.tag = tag
    def wrap(self, aw, ah): self.w = aw; self.h = ah; return (aw, ah)
    def draw(self):
        c = self.canv; w, h = self.w, self.h
        c.setFillColor(C_BG); c.roundRect(0, 0, w, h, 5*mm, stroke=0, fill=1)
        # accent band
        c.setFillColor(C_ACCENT); c.roundRect(0, h - 4*mm, w, 4*mm, 0, stroke=0, fill=1)
        c.rect(0, h - 30*mm, w, 26*mm, stroke=0, fill=0)
        c.setFillColor(C_ACCENT2); c.setFont("Arial-Bold", 12)
        c.drawString(14*mm, h - 24*mm, "GoGlobal")
        c.setFillColor(C_INK3); c.setFont("Arial", 9)
        c.drawString(14*mm, h - 30*mm, sanitize(self.kicker))
        c.setFillColor(colors.white); c.setFont("Arial-Bold", 30)
        for i, line in enumerate(self.title.split("\n")):
            c.drawString(14*mm, h*0.56 - i*12*mm, sanitize(line))
        c.setFillColor(colors.HexColor("#c2c7d0")); c.setFont("Arial", 12)
        for i, line in enumerate(self.subtitle.split("\n")):
            c.drawString(14*mm, h*0.40 - i*7*mm, sanitize(line))
        # tag chip (auto-width to the text)
        c.setFont("Arial-Bold", 9)
        tagw = c.stringWidth(sanitize(self.tag), "Arial-Bold", 9) + 12*mm
        c.setFillColor(C_ACCENT); c.roundRect(14*mm, 16*mm, tagw, 9*mm, 4*mm, stroke=0, fill=1)
        c.setFillColor(colors.white)
        c.drawString(20*mm, 18.8*mm, sanitize(self.tag))
        c.setFillColor(C_INK3); c.setFont("Arial", 8)
        c.drawString(14*mm, 9*mm, "Обновлено: июнь 2026 · единый стиль · для внутреннего использования")

def cover(story, kicker, title, subtitle, tag):
    story.append(_Cover(kicker, title, subtitle, tag)); story.append(PageBreak())

def toc_page(story):
    story.append(P("Содержание", S_H1)); story.append(HRule(C_ACCENT, 2)); story.append(Spacer(1, 6))
    t = TableOfContents()
    t.levelStyles = [
        ParagraphStyle("toc0", fontName="Arial-Bold", fontSize=11.5, leading=20, textColor=C_INK, spaceAfter=2),
        ParagraphStyle("toc1", fontName="Arial", fontSize=9.5, leading=15, textColor=C_INK2, leftIndent=14),
    ]
    t.dotsMinLevel = 0
    story.append(t)
    story.append(P("Кликните пункт оглавления или закладку слева в PDF — перейдёте к разделу.", S_CAP))

_CH = [0]
def chapter(story, title):
    _CH[0] += 1
    story.append(PageBreak())
    story.append(P(f"РАЗДЕЛ {_CH[0]}", S_H1N))
    story.append(P(title, S_H1))
    story.append(HRule(C_ACCENT, 2.2))
    story.append(Spacer(1, 6))

def reset_chapters(): _CH[0] = 0

def build(doc, story):
    doc.multiBuild(story)
    return doc.filename
