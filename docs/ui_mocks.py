# -*- coding: utf-8 -*-
"""Vector UI mock-ups of GoGlobal CRM v5 for the documentation PDF.
Drawn 1:1 in the real design-system palette — crisp at any print resolution."""
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Flowable

# v5 palette
BG    = colors.HexColor("#0b0c0f")
SURF  = colors.HexColor("#15171c")
SURF2 = colors.HexColor("#1c1f26")
EDGE  = colors.HexColor("#23262e")
EDGE2 = colors.HexColor("#363b45")
INK   = colors.HexColor("#e7e9ee")
INK2  = colors.HexColor("#9aa1ae")
INK3  = colors.HexColor("#6e7582")
ACC   = colors.HexColor("#6366f1")
ACC2  = colors.HexColor("#818cf8")
TEAL  = colors.HexColor("#2dd4bf")
OK    = colors.HexColor("#10b981")
OKL   = colors.HexColor("#86efac")
WARN  = colors.HexColor("#f59e0b")
WARNL = colors.HexColor("#fde68a")
BAD   = colors.HexColor("#ef4444")
BADL  = colors.HexColor("#fda4af")
VIO   = colors.HexColor("#a78bfa")
WHITE = colors.white

def _mix(c, alpha, base=SURF):
    return colors.Color(c.red*alpha + base.red*(1-alpha),
                        c.green*alpha + base.green*(1-alpha),
                        c.blue*alpha + base.blue*(1-alpha))

class Mock(Flowable):
    PAD = 0
    def __init__(self, kind, h):
        super().__init__(); self.kind = kind; self.h = h
    def wrap(self, aw, ah):
        self.w = aw; return (aw, self.h)
    # ---- primitives ----
    def rr(self, x, y, w, h, fill=SURF, line=EDGE, r=2.2*mm, lw=0.8):
        c = self.canv
        c.setFillColor(fill); c.setStrokeColor(line); c.setLineWidth(lw)
        c.roundRect(x, y, w, h, r, stroke=1, fill=1)
    def txt(self, x, y, s, size=8, color=INK, bold=False, center_w=None):
        c = self.canv
        c.setFont("Arial-Bold" if bold else "Arial", size)
        c.setFillColor(color)
        if center_w is not None: c.drawCentredString(x + center_w/2, y, s)
        else: c.drawString(x, y, s)
    def rtxt(self, x, y, s, size=8, color=INK, bold=False):
        c = self.canv
        c.setFont("Arial-Bold" if bold else "Arial", size); c.setFillColor(color)
        c.drawRightString(x, y, s)
    def dot(self, x, y, r, color):
        c = self.canv; c.setFillColor(color); c.setStrokeColor(color)
        c.circle(x, y, r, stroke=0, fill=1)
    def chip(self, x, y, label, color, size=6.5, pad=2.6*mm):
        c = self.canv
        tw = c.stringWidth(label, "Arial-Bold", size)
        w = tw + pad*2
        self.rr(x, y, w, 4.6*mm, fill=_mix(color, 0.16), line=_mix(color, 0.45), r=2.2*mm, lw=0.7)
        self.txt(x + pad, y + 1.4*mm, label, size, color, bold=True)
        return w
    def btn(self, x, y, w, label, fill=SURF2, line=EDGE2, tcol=INK, size=7.5, h=6.5*mm, bold=True):
        self.rr(x, y, w, h, fill=fill, line=line, r=1.8*mm)
        self.txt(x, y + h/2 - size/2 + 0.6, label, size, tcol, bold=bold, center_w=w)
    def ihint(self, x, y):
        c = self.canv
        self.dot(x, y, 1.7*mm, SURF2)
        c.setStrokeColor(EDGE2); c.setLineWidth(0.6); c.circle(x, y, 1.7*mm, stroke=1, fill=0)
        self.txt(x - 0.65, y - 1.05*mm, "i", 5.5, INK2, bold=True)
    def frame(self, title="goglobal.kg/lidy"):
        """Browser frame around the whole drawing area; returns content box (x,y,w,h)."""
        c = self.canv
        self.rr(0, 0, self.w, self.h, fill=BG, line=EDGE2, r=2.6*mm, lw=1)
        bar_h = 7*mm
        c.setFillColor(SURF2)
        c.roundRect(0, self.h - bar_h, self.w, bar_h, 2.6*mm, stroke=0, fill=1)
        c.rect(0, self.h - bar_h, self.w, 3*mm, stroke=0, fill=1)
        for i, col in enumerate([BAD, WARN, OK]):
            self.dot(5*mm + i*4.2*mm, self.h - bar_h/2, 1.25*mm, col)
        self.txt(18*mm, self.h - bar_h/2 - 1.05*mm, title, 6.5, INK3)
        return (1.5*mm, 1.5*mm, self.w - 3*mm, self.h - bar_h - 3*mm)
    def draw(self):
        getattr(self, "m_" + self.kind)()

    # ════════ LOGIN ════════
    def m_login(self):
        x0, y0, w, h = self.frame()
        cw, ch = 64*mm, 46*mm
        cx, cy = x0 + (w - cw)/2, y0 + (h - ch)/2
        self.rr(cx, cy, cw, ch, fill=SURF, line=EDGE, r=3*mm)
        self.txt(cx + 6*mm, cy + ch - 8*mm, "GoGlobal CRM", 10, INK, bold=True)
        self.txt(cx + 6*mm, cy + ch - 12.5*mm, "Вход для менеджеров", 7, INK2)
        self.canv.setStrokeColor(EDGE); self.canv.setLineWidth(0.7)
        self.canv.line(cx + 6*mm, cy + ch - 15*mm, cx + cw - 6*mm, cy + ch - 15*mm)
        self.txt(cx + 6*mm, cy + ch - 20*mm, "Логин", 7, INK2, bold=True)
        self.rr(cx + 6*mm, cy + ch - 27*mm, cw - 12*mm, 6*mm, fill=SURF2, line=EDGE2, r=1.6*mm)
        self.txt(cx + 8*mm, cy + ch - 25*mm, "anna", 7.5, INK)
        self.txt(cx + 6*mm, cy + ch - 31.5*mm, "Пароль", 7, INK2, bold=True)
        self.rr(cx + 6*mm, cy + ch - 38.5*mm, cw - 12*mm, 6*mm, fill=SURF2, line=EDGE2, r=1.6*mm)
        self.txt(cx + 8*mm, cy + ch - 36.5*mm, "•••••••••", 7.5, INK)
        self.btn(cx + 6*mm, cy + 3*mm, cw - 12*mm, "Войти", fill=ACC, line=ACC, tcol=WHITE)

    # ════════ DASHBOARD ════════
    def m_dashboard(self):
        x0, y0, w, h = self.frame()
        # header
        hd_h = 8*mm
        self.rr(x0, y0 + h - hd_h, w, hd_h, fill=SURF, line=EDGE, r=1.5*mm)
        self.txt(x0 + 3*mm, y0 + h - hd_h + 2.8*mm, "GoGlobal CRM", 7.5, INK, bold=True)
        self.rr(x0 + 34*mm, y0 + h - hd_h + 1.5*mm, w*0.34, 5*mm, fill=SURF2, line=EDGE, r=2.4*mm)
        self.txt(x0 + 37*mm, y0 + h - hd_h + 3.1*mm, "Поиск по имени, телефону, email...", 6, INK3)
        rx = x0 + w - 3*mm
        self.dot(rx - 2*mm, y0 + h - hd_h/2, 2.2*mm, _mix(VIO, 0.5)); self.txt(rx - 3.4*mm, y0 + h - hd_h/2 - 1*mm, "АИ", 5, WHITE, bold=True)
        bw = 12*mm
        self.btn(rx - 6*mm - bw, y0 + h - hd_h + 1.6*mm, bw, "+ Лид", fill=ACC, line=ACC, tcol=WHITE, size=6.5, h=5*mm)
        ow = 16*mm
        self.rr(rx - 8*mm - bw - ow, y0 + h - hd_h + 1.6*mm, ow, 5*mm, fill=_mix(OK, 0.13), line=_mix(OK, 0.4), r=1.6*mm)
        self.dot(rx - 8*mm - bw - ow + 3*mm, y0 + h - hd_h + 4.1*mm, 0.9*mm, OK)
        self.txt(rx - 8*mm - bw - ow + 5*mm, y0 + h - hd_h + 3.2*mm, "В сети", 6, OKL, bold=True)
        # sidebar
        sb_w = 30*mm; sb_y = y0; sb_h = h - hd_h - 2*mm
        self.rr(x0, sb_y, sb_w, sb_h, fill=SURF, line=EDGE, r=1.5*mm)
        self.txt(x0 + 2.5*mm, sb_y + sb_h - 5*mm, "БЫСТРЫЕ ФИЛЬТРЫ", 5.5, INK3, bold=True)
        items = [("Inbox 0 (требует действий)", ACC), ("Просроченные", BAD), ("Горячие (скоринг 60+)", WARN), ("Перезвонить", VIO), ("Дубли", VIO), ("Закрытые", OK)]
        for i, (l, col) in enumerate(items):
            yy = sb_y + sb_h - 11*mm - i*6.5*mm
            self.rr(x0 + 2*mm, yy, sb_w - 4*mm, 5.5*mm, fill=_mix(col, 0.10) if i == 0 else SURF2, line=_mix(col, 0.35) if i == 0 else EDGE, r=1.6*mm, lw=0.6)
            self.txt(x0 + 3.5*mm, yy + 1.8*mm, l, 5.5, INK if i == 0 else INK2)
        self.txt(x0 + 2.5*mm, sb_y + sb_h - 40*mm, "СТАТУС", 5.5, INK3, bold=True)
        self.rr(x0 + 2*mm, sb_y + sb_h - 47*mm, sb_w - 4*mm, 5.5*mm, fill=SURF2, line=EDGE2, r=1.6*mm, lw=0.6)
        self.txt(x0 + 3.5*mm, sb_y + sb_h - 45.2*mm, "Все статусы            ▼", 5.5, INK2)
        # KPI tiles
        cx0 = x0 + sb_w + 2*mm; cw = w - sb_w - 2*mm
        tile_w = (cw - 8*mm)/5
        kpis = [("АКТИВНЫЕ", "11", INK), ("БЕЗ ОТВЕТА", "2", WARNL), ("ПРОСРОЧЕНО", "0", INK), ("В ОЧЕРЕДИ", "0", colors.HexColor("#fdba74")), ("ПЕРЕДАЧИ МНЕ", "0", INK)]
        for i, (l, v, col) in enumerate(kpis):
            tx = cx0 + i*(tile_w + 2*mm)
            ty = y0 + h - hd_h - 14*mm
            self.rr(tx, ty, tile_w, 12*mm, fill=SURF, line=EDGE, r=2*mm)
            self.txt(tx + 2.5*mm, ty + 8*mm, l, 5, INK2, bold=True)
            self.ihint(tx + 2.5*mm + self.canv.stringWidth(l, "Arial-Bold", 5) + 3*mm, ty + 8.8*mm)
            self.txt(tx + 2.5*mm, ty + 2.5*mm, v, 11, col, bold=True)
        # Мой день
        md_y = y0 + h - hd_h - 32*mm
        self.rr(cx0, md_y, cw, 16*mm, fill=SURF, line=EDGE, r=2.4*mm)
        self.canv.setFillColor(ACC); self.canv.rect(cx0, md_y, 1.2*mm, 16*mm, stroke=0, fill=1)
        self.txt(cx0 + 4*mm, md_y + 11.5*mm, "ПЯТНИЦА, 12 ИЮНЯ · МОЙ ДЕНЬ", 5.5, ACC2, bold=True)
        self.txt(cx0 + 4*mm, md_y + 6.5*mm, "Доброго дня, Анна!", 9.5, INK, bold=True)
        mds = [("ВСТРЕЧИ", "3"), ("ГОРЯЧИХ", "5"), ("ЗАДАЧ", "11"), ("В РАБОТЕ", "$67k"), ("ПРОГНОЗ", "$31k")]
        seg = cw*0.55/5
        for i, (l, v) in enumerate(mds):
            sx = cx0 + cw*0.42 + i*seg
            self.txt(sx, md_y + 9.5*mm, l, 4.8, OKL if l == "ПРОГНОЗ" else INK3, bold=True)
            self.txt(sx, md_y + 4*mm, v, 8.5, OKL if l == "ПРОГНОЗ" else INK, bold=True)
        # lead cards row
        card_w = (cw - 4*mm)/3
        for i, (name, status, scol, extra) in enumerate([
                ("Айгуль Токтосунова", "Новый", ACC2, "2ч 41м до SLA"),
                ("Бакыт Асанов", "В работе", WARN, "обработан"),
                ("Чолпон Дуйшеева", "Закрыт (won)", OK, "Этап 4 · Языковой экзамен")]):
            cx = cx0 + i*(card_w + 2*mm); cy2 = y0 + 1*mm; chh = md_y - y0 - 3*mm
            self.rr(cx, cy2, card_w, chh, fill=SURF, line=EDGE, r=2.2*mm)
            self.dot(cx + 5*mm, cy2 + chh - 5.5*mm, 2.6*mm, _mix([ACC, TEAL, VIO][i], 0.5))
            self.txt(cx + 9*mm, cy2 + chh - 4.6*mm, name, 6.5, INK, bold=True)
            self.txt(cx + 9*mm, cy2 + chh - 7.6*mm, f"#{124 + i} · 17 мая", 5, INK3)
            self.chip(cx + card_w - 18*mm, cy2 + chh - 7*mm, status, scol)
            self.txt(cx + 3*mm, cy2 + chh - 12.5*mm, "+996 700 123 456", 5.5, INK2)
            self.txt(cx + 3*mm, cy2 + chh - 16*mm, "Япония · Toyo University", 5.5, INK2)
            xx = cx + 3*mm
            xx += self.chip(xx, cy2 + chh - 22*mm, "WhatsApp", OK) + 1.5*mm
            xx += self.chip(xx, cy2 + chh - 22*mm, extra, ACC2 if i == 0 else (OK if i == 1 else TEAL)) + 1.5*mm
            bw2 = (card_w - 8*mm)/2
            self.btn(cx + 3*mm, cy2 + 2.5*mm, bw2, "WhatsApp", fill=_mix(OK, 0.12), line=_mix(OK, 0.4), tcol=OKL, size=6, h=5.5*mm)
            self.btn(cx + 5*mm + bw2, cy2 + 2.5*mm, bw2, "Открыть →", size=6, h=5.5*mm)

    # ════════ STATUS DROPDOWN ════════
    def m_dropdown(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · карточка лида")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 6*mm, "СТАТУС ОБРАБОТКИ", 6.5, INK2, bold=True)
        self.ihint(px + 34*mm, y0 + h - 5.2*mm)
        # closed dropdown button
        self.rr(px, y0 + h - 14*mm, 56*mm, 6.5*mm, fill=SURF2, line=EDGE2, r=1.8*mm)
        self.dot(px + 3.5*mm, y0 + h - 10.8*mm, 1.1*mm, WARN)
        self.txt(px + 6*mm, y0 + h - 12.9*mm, "В работе", 7.5, INK, bold=True)
        self.txt(px + 50*mm, y0 + h - 12.9*mm, "▲", 7, INK3)
        # open list
        ly = y0 + 4*mm; lw_ = 88*mm; lh = h - 20*mm
        self.rr(px, ly, lw_, lh, fill=colors.HexColor("#15171c"), line=EDGE2, r=2.4*mm, lw=1)
        rows = [
            ("Новый", "Рабочий статус — лид остаётся в воронке", ACC2, False),
            ("В работе  · текущий", "Рабочий статус — лид остаётся в воронке", WARN, True),
            ("Перезвонить", "Рабочий статус — лид остаётся в воронке", VIO, False),
            ("Не ответил", "Рабочий статус — лид остаётся в воронке", INK3, False),
            ("Подойдёт в офис", "Попросит дату и время визита в офис", TEAL, False),
            ("Закрыт (won)", "Сделка выиграна — откроются этапы ведения клиента", OK, False),
            ("Отказ (lost)", "Закрывает лида — попросит причину отказа", BAD, False),
        ]
        rh = lh/7
        for i, (l, sub, col, cur) in enumerate(rows):
            ry = ly + lh - (i+1)*rh
            if cur:
                self.rr(px + 1.5*mm, ry + 0.5*mm, lw_ - 3*mm, rh - 1*mm, fill=SURF2, line=SURF2, r=1.6*mm, lw=0.4)
            self.dot(px + 5*mm, ry + rh/2 + 1*mm, 1.1*mm, col)
            self.txt(px + 8*mm, ry + rh/2 + 0.8*mm, l, 7, INK, bold=True)
            self.txt(px + 8*mm, ry + rh/2 - 2.6*mm, sub, 5.5, INK3)

    # ════════ STEPPER (won) ════════
    def m_stepper(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · карточка лида · сделка выиграна")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 6*mm, "ЭТАПЫ ВЕДЕНИЯ КЛИЕНТА", 6.5, INK2, bold=True)
        self.ihint(px + 42*mm, y0 + h - 5.2*mm)
        self.rtxt(x0 + w - 5*mm, y0 + h - 6*mm, "× снять этап", 6, INK3)
        stages = [("Контракт подписан", "done"), ("Оплата 1 (предоплата)", "done"), ("Сбор документов", "done"),
                  ("Языковой экзамен", "current"), ("Собеседование", "next"), ("Зачисление", "next"),
                  ("Виза", "next"), ("Окончательная оплата", "next"), ("Отъезд / прибытие", "next")]
        top = y0 + h - 10*mm
        rh = (top - y0 - 2*mm)/9
        for i, (l, stt) in enumerate(stages):
            ry = top - (i+1)*rh
            ccx = px + 4*mm; ccy = ry + rh/2
            if i < 8:
                self.canv.setStrokeColor(_mix(OK, 0.5) if stt == "done" else EDGE2); self.canv.setLineWidth(0.8)
                self.canv.line(ccx, ccy - rh/2 - 0.4*mm, ccx, ccy - rh + 2.2*mm + rh/2)
            if stt == "current":
                self.rr(px + 8.5*mm, ry + 0.4*mm, w - 22*mm, rh - 0.8*mm, fill=_mix(ACC, 0.12), line=_mix(ACC, 0.3), r=1.6*mm, lw=0.6)
            fill = _mix(OK, 0.15) if stt == "done" else (ACC if stt == "current" else SURF2)
            line = _mix(OK, 0.5) if stt == "done" else (ACC if stt == "current" else EDGE2)
            self.dot(ccx, ccy, 2.5*mm, fill)
            self.canv.setStrokeColor(line); self.canv.setLineWidth(0.8); self.canv.circle(ccx, ccy, 2.5*mm, stroke=1, fill=0)
            self.txt(ccx - 1.1*mm if stt != "done" else ccx - 1.3*mm, ccy - 1.1*mm, "√" if stt == "done" else str(i+1), 6, OKL if stt == "done" else (WHITE if stt == "current" else INK3), bold=True)
            tcol = INK2 if stt == "done" else (INK if stt == "current" else INK3)
            self.txt(px + 11*mm, ccy - 1.2*mm, l, 7, tcol, bold=(stt == "current"))
            if stt == "current":
                self.txt(px + 11*mm + self.canv.stringWidth(l, "Arial-Bold", 7) + 3*mm, ccy - 1.1*mm, "СЕЙЧАС", 5, ACC2, bold=True)

    # ════════ STEPPER LOCKED ════════
    def m_locked(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · карточка лида · сделка ещё не выиграна")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 7*mm, "ЭТАПЫ ВЕДЕНИЯ КЛИЕНТА", 6.5, INK2, bold=True)
        self.ihint(px + 42*mm, y0 + h - 6.2*mm)
        self.rr(px, y0 + 4*mm, w - 12*mm, h - 16*mm, fill=SURF2, line=EDGE2, r=2*mm, lw=0.7)
        self.txt(px + 4*mm, y0 + h/2 - 1*mm, "ЗАМОК: этапы откроются после статуса «Закрыт» (won).", 7.5, INK2, bold=True)
        self.txt(px + 4*mm, y0 + h/2 - 6*mm, "Когда сделка выиграна, лид автоматически попадает в воронку", 6.5, INK3)
        self.txt(px + 4*mm, y0 + h/2 - 10*mm, "сопровождения — начиная с этапа «Контракт подписан».", 6.5, INK3)

    # ════════ KANBAN ════════
    def m_kanban(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · воронка статусов")
        cols = [("Новый", ACC2, ["Айгуль Т.", "Бакыт А."]), ("В работе", WARN, ["Чолпон Д."]),
                ("Перезвонить", VIO, ["Темир К."]), ("Подойдёт в офис", TEAL, []), ("Закрыт (won)", OK, ["Нурай С."])]
        cw = (w - 4*mm - 4*2*mm)/5
        for i, (l, col, cards) in enumerate(cols):
            cx = x0 + 2*mm + i*(cw + 2*mm)
            self.rr(cx, y0 + 2*mm, cw, h - 6*mm, fill=SURF, line=EDGE, r=2*mm)
            self.dot(cx + 3*mm, y0 + h - 8*mm, 1*mm, col)
            self.txt(cx + 5*mm, y0 + h - 9*mm, l, 6, INK, bold=True)
            self.rtxt(cx + cw - 2.5*mm, y0 + h - 9*mm, str(len(cards)), 6, INK3)
            for j, nm in enumerate(cards):
                cy2 = y0 + h - 16*mm - j*11*mm
                self.rr(cx + 2*mm, cy2 - 8*mm, cw - 4*mm, 9*mm, fill=SURF2, line=EDGE, r=1.6*mm, lw=0.6)
                self.txt(cx + 3.5*mm, cy2 - 3*mm, nm, 6, INK, bold=True)
                self.txt(cx + 3.5*mm, cy2 - 6.4*mm, "Япония · $15k", 5, INK3)
            if not cards:
                self.canv.setStrokeColor(EDGE2); self.canv.setDash(2, 2); self.canv.setLineWidth(0.6)
                self.canv.roundRect(cx + 2*mm, y0 + h - 25*mm, cw - 4*mm, 9*mm, 1.6*mm, stroke=1, fill=0)
                self.canv.setDash()
                self.txt(cx + 2*mm, y0 + h - 21*mm, "пусто", 5.5, INK3, center_w=cw - 4*mm)
        # drag ghost
        self.rr(x0 + 2*mm + 1.55*(cw + 2*mm), y0 + 12*mm, cw - 4*mm, 9*mm, fill=_mix(ACC, 0.18), line=ACC, r=1.6*mm, lw=1)
        self.txt(x0 + 3.5*mm + 1.55*(cw + 2*mm), y0 + 17*mm, "Айгуль Т.  →", 6, INK, bold=True)
        self.txt(x0 + 3.5*mm + 1.55*(cw + 2*mm), y0 + 13.6*mm, "перетаскивание = смена статуса", 4.8, ACC2)

    # ════════ CREATE LEAD FORM ════════
    def m_create(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · создать лид вручную")
        fw, fh = 96*mm, h - 8*mm
        fx, fy = x0 + (w - fw)/2, y0 + 4*mm
        self.rr(fx, fy, fw, fh, fill=SURF, line=EDGE2, r=2.6*mm, lw=1)
        self.txt(fx + 5*mm, fy + fh - 7*mm, "Создать лид вручную", 8.5, INK, bold=True)
        fields = [("Имя", "Айбек"), ("Телефон", "+996…"), ("Email", "mail@…"), ("Страна", "США"),
                  ("Желаемый ВУЗ", ""), ("Когда поступает", "Осень 2026"), ("Бюджет", "$15k–30k"), ("Английский", "B2 / IELTS 6.5")]
        colw = (fw - 15*mm)/2
        for i, (l, ph) in enumerate(fields):
            cx = fx + 5*mm + (i % 2)*(colw + 5*mm)
            cy2 = fy + fh - 16*mm - (i // 2)*11*mm
            self.txt(cx, cy2 + 5.6*mm, l, 5.5, INK2, bold=True)
            self.rr(cx, cy2, colw, 5.2*mm, fill=SURF2, line=EDGE2, r=1.4*mm, lw=0.6)
            if ph: self.txt(cx + 2*mm, cy2 + 1.7*mm, ph, 5.5, INK3)
        cy3 = fy + fh - 16*mm - 4*11*mm
        self.txt(fx + 5*mm, cy3 + 5.6*mm, "Источник *", 5.5, INK2, bold=True)
        self.rr(fx + 5*mm, cy3, fw - 10*mm, 5.2*mm, fill=SURF2, line=EDGE2, r=1.4*mm, lw=0.6)
        self.txt(fx + 7*mm, cy3 + 1.7*mm, "WhatsApp                                                            ▼", 5.5, INK)
        self.btn(fx + fw - 24*mm, fy + 3*mm, 19*mm, "Создать", fill=ACC, line=ACC, tcol=WHITE, size=6.5, h=5.5*mm)
        self.txt(fx + 5*mm, fy + 4.6*mm, "Отмена", 6.5, INK2)

    # ════════ DEAL TAB ════════
    def m_deal(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · карточка лида · вкладка «Сделка»")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 7*mm, "СДЕЛКА", 6.5, INK2, bold=True)
        labels = ["Сумма сделки", "Валюта", "Вероятность 70%"]
        colw = (w - 22*mm)/3
        vals = ["15 000", "$ USD  ▼", ""]
        for i, l in enumerate(labels):
            cx = px + i*(colw + 5*mm)
            self.txt(cx, y0 + h - 13*mm, l, 5.5, INK2, bold=True)
            self.rr(cx, y0 + h - 19.5*mm, colw, 5.4*mm, fill=SURF2, line=EDGE2, r=1.5*mm, lw=0.6)
            if vals[i]: self.txt(cx + 2*mm, y0 + h - 17.7*mm, vals[i], 6, INK)
        # probability slider
        sx = px + 2*(colw + 5*mm)
        self.canv.setStrokeColor(EDGE2); self.canv.setLineWidth(1.4)
        self.canv.line(sx + 2*mm, y0 + h - 16.8*mm, sx + colw - 2*mm, y0 + h - 16.8*mm)
        self.canv.setStrokeColor(ACC)
        self.canv.line(sx + 2*mm, y0 + h - 16.8*mm, sx + 2*mm + (colw - 4*mm)*0.7, y0 + h - 16.8*mm)
        self.dot(sx + 2*mm + (colw - 4*mm)*0.7, y0 + h - 16.8*mm, 1.6*mm, ACC2)
        cards = [("PIPELINE", "$15 000", INK), ("ВЗВЕШЕННО", "$10 500", ACC2), ("СКОРИНГ", "78/100", OKL)]
        cw2 = (w - 22*mm)/3
        for i, (l, v, col) in enumerate(cards):
            cx = px + i*(cw2 + 5*mm)
            self.rr(cx, y0 + 12*mm, cw2, 13*mm, fill=SURF2 if i == 0 else _mix(ACC if i == 1 else OK, 0.10), line=EDGE if i == 0 else _mix(ACC if i == 1 else OK, 0.35), r=2*mm, lw=0.7)
            self.txt(cx, y0 + 20.5*mm, l, 5.5, INK3 if i == 0 else (ACC2 if i == 1 else OKL), bold=True, center_w=cw2)
            self.txt(cx, y0 + 14.5*mm, v, 10, col, bold=True, center_w=cw2)
        self.btn(x0 + w - 38*mm, y0 + 4*mm, 32*mm, "Сохранить сделку", fill=ACC, line=ACC, tcol=WHITE, size=6, h=5.5*mm)
        self.txt(px, y0 + 5.5*mm, "МЕТКИ:   VIP  ·  Hot  ·  Grant-track  ·  Referral", 6, INK2)

    # ════════ HISTORY TIMELINE (merged Чат + Аудит) ════════
    def m_history(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · карточка лида · вкладка «История»")
        px = x0 + 6*mm
        tabs = ["Обзор", "Сделка", "Задачи", "Файлы", "История", "Связанные"]
        tx = px
        for i, t in enumerate(tabs):
            cur = (t == "История")
            tw = self.canv.stringWidth(t, "Arial-Bold", 6.5) + 5*mm
            if cur:
                self.canv.setStrokeColor(ACC); self.canv.setLineWidth(1.2)
                self.canv.line(tx, y0 + h - 9*mm, tx + tw, y0 + h - 9*mm)
            self.txt(tx + 2*mm, y0 + h - 7.5*mm, t, 6.5, ACC2 if cur else INK2, bold=cur)
            tx += tw
        self.txt(px, y0 + h - 14*mm, "ИСТОРИЯ — СООБЩЕНИЯ И СОБЫТИЯ", 6, INK2, bold=True)
        feed = [("event", "Тимур Лидов", "status.change", "9 мин"),
                ("event", "Система", "lead.duplicate", "12 июн"),
                ("comment", "Анна", "Созвонились, клиент думает. Перезвонить в пятницу.", "13 июн"),
                ("event", "Анна", "task.create — перезвонить", "13 июн")]
        yy = y0 + h - 20*mm
        for kind, who, body, when in feed:
            if kind == "comment":
                self.dot(px + 2.5*mm, yy + 1*mm, 2.2*mm, _mix(ACC, 0.5))
                self.txt(px + 1.3*mm, yy + 0.1*mm, who[0], 5.5, WHITE, bold=True)
            else:
                self.rr(px + 0.4*mm, yy - 1.6*mm, 4.2*mm, 4.2*mm, fill=SURF2, line=EDGE2, r=1*mm, lw=0.6)
                self.txt(px + 1.3*mm, yy - 0.3*mm, "*", 7, INK2, bold=True)
            self.txt(px + 7*mm, yy + 1.4*mm, who, 6.5, INK, bold=True)
            self.rtxt(x0 + w - 5*mm, yy + 1.4*mm, when, 5.5, INK3)
            self.txt(px + 7*mm, yy - 2.2*mm, body, 5.8, INK2 if kind == "comment" else ACC2, bold=(kind == "event"))
            yy -= 9.5*mm
        self.rr(px, y0 + 3*mm, w - 30*mm, 7*mm, fill=SURF2, line=EDGE2, r=1.6*mm, lw=0.6)
        self.txt(px + 2*mm, y0 + 5.2*mm, "Оставить комментарий...", 6, INK3)
        self.btn(x0 + w - 23*mm, y0 + 3*mm, 17*mm, "Отправить", fill=ACC, line=ACC, tcol=WHITE, size=6.5, h=7*mm)

    # ════════ КОРЗИНА (restore) ════════
    def m_trash(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · Корзина")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 7*mm, "КОРЗИНА — удалённые лиды можно восстановить", 7.5, INK, bold=True)
        self.txt(px, y0 + h - 11.5*mm, "«Восстановить» вернёт лид в работу; «Навсегда» — удалит безвозвратно.", 6, INK3)
        rows = [("Айбек Жумаев", "+996 700 555 111", "удалён 2ч назад"),
                ("Тест Дубля", "+996 700 999 888", "удалён вчера")]
        for i, (nm, ph, when) in enumerate(rows):
            ry = y0 + h - 18*mm - i*12*mm
            self.rr(px, ry - 9*mm, w - 12*mm, 10*mm, fill=SURF, line=EDGE, r=1.8*mm)
            self.dot(px + 5*mm, ry - 4*mm, 2.4*mm, _mix(INK3, 0.5))
            self.txt(px + 9*mm, ry - 2.5*mm, nm, 6.5, INK, bold=True)
            self.txt(px + 9*mm, ry - 6*mm, ph + " · " + when, 5.5, INK3)
            self.btn(x0 + w - 50*mm, ry - 8*mm, 28*mm, "Восстановить", fill=_mix(OK, 0.14), line=_mix(OK, 0.4), tcol=OKL, size=6, h=6.5*mm)
            self.btn(x0 + w - 20*mm, ry - 8*mm, 8*mm, "x", fill=_mix(BAD, 0.10), line=_mix(BAD, 0.3), tcol=BADL, size=7, h=6.5*mm)

    # ════════ ИМПОРТ CSV ════════
    def m_csv(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · импорт лидов из CSV")
        fw, fh = 104*mm, h - 8*mm
        fx, fy = x0 + (w - fw)/2, y0 + 4*mm
        self.rr(fx, fy, fw, fh, fill=SURF, line=EDGE2, r=2.6*mm, lw=1)
        self.txt(fx + 5*mm, fy + fh - 7*mm, "Импорт лидов из CSV", 8.5, INK, bold=True)
        self.txt(fx + 5*mm, fy + fh - 12*mm, "1. Выберите файл — колонки сопоставятся автоматически", 6, INK2)
        self.btn(fx + 5*mm, fy + fh - 19*mm, 28*mm, "Выберите файл", fill=ACC, line=ACC, tcol=WHITE, size=6.5, h=6*mm)
        self.txt(fx + 36*mm, fy + fh - 17*mm, "leads.csv — строк: 240", 6, TEAL)
        self.txt(fx + 5*mm, fy + fh - 25*mm, "2. Сопоставление колонок", 6, INK2, bold=True)
        maps = [("Имя", "-> Имя"), ("Телефон", "-> Телефон"), ("e-mail", "-> Email"), ("страна", "-> Страна")]
        for i, (a, b) in enumerate(maps):
            cx = fx + 5*mm + (i % 2)*(fw/2 - 4*mm); cy = fy + fh - 31*mm - (i // 2)*7*mm
            self.txt(cx, cy, a, 6, INK3)
            self.rr(cx + 18*mm, cy - 1.5*mm, 26*mm, 5*mm, fill=SURF2, line=EDGE2, r=1.4*mm, lw=0.6)
            self.txt(cx + 20*mm, cy, b, 5.8, INK)
        self.txt(fx + 5*mm, fy + 16*mm, "3. Назначить: Авто (по правилам/очереди)", 6, INK2)
        self.rr(fx + 5*mm, fy + 9*mm, 5*mm, 5*mm, fill=ACC, line=ACC, r=1*mm); self.txt(fx + 6*mm, fy + 10.4*mm, "√", 6, WHITE, bold=True)
        self.txt(fx + 12*mm, fy + 10.4*mm, "Пропускать дубли (по телефону/email)", 6, INK2)
        self.btn(fx + fw - 40*mm, fy + 3*mm, 35*mm, "Импортировать 240", fill=ACC, line=ACC, tcol=WHITE, size=6.5, h=6*mm)

    # ════════ АДМИНКА: разделы ════════
    def m_admin_groups(self):
        x0, y0, w, h = self.frame("goglobal.kg/admin300499")
        self.rr(x0, y0 + h - 8*mm, w, 8*mm, fill=SURF, line=EDGE, r=1.5*mm)
        self.txt(x0 + 3*mm, y0 + h - 5.2*mm, "ADMIN", 8, INK, bold=True)
        self.btn(x0 + w - 26*mm, y0 + h - 7*mm, 22*mm, "Сохранить", fill=ACC, line=ACC, tcol=WHITE, size=6.5, h=6*mm)
        sb_w = 46*mm
        groups = [("Контент сайта", "тексты, страны, отзывы", False),
                  ("Аналитика продаж", "дашборды и отчёты", False),
                  ("Настройки CRM", "менеджеры, статусы, правила", False),
                  ("Система", "бэкапы, аудит, Telegram, админы", True)]
        for i, (l, s, cur) in enumerate(groups):
            gy = y0 + h - 22*mm - i*13*mm
            self.rr(x0, gy, sb_w, 11*mm, fill=_mix(ACC, 0.12) if cur else SURF, line=_mix(ACC, 0.4) if cur else EDGE, r=2*mm)
            self.txt(x0 + 3*mm, gy + 6.2*mm, l, 7, INK if cur else INK2, bold=True)
            self.txt(x0 + 3*mm, gy + 2.4*mm, s, 5.2, INK3)
        cx = x0 + sb_w + 3*mm; cw = w - sb_w - 3*mm
        cards = [("Журнал аудита", "кто что менял"), ("Утилиты и бэкапы", "ZIP-дамп БД"),
                 ("Администраторы", "входы с логином + суперпароль"), ("Telegram-бот", "токен, тест")]
        for i, (l, s) in enumerate(cards):
            cy = y0 + h - 18*mm - i*11*mm
            self.rr(cx, cy, cw, 9*mm, fill=SURF, line=EDGE, r=2*mm)
            self.txt(cx + 3*mm, cy + 4.8*mm, l, 6.8, INK, bold=True)
            self.rtxt(cx + cw - 3*mm, cy + 4.8*mm, s, 5.5, INK3)

    # ════════ ЦЕЛИ МЕНЕДЖЕРОВ ════════
    def m_goals(self):
        x0, y0, w, h = self.frame("goglobal.kg/lidy · Команда — 30 дней")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 7*mm, "КОМАНДА — 30 ДНЕЙ", 7, INK2, bold=True)
        cols = ["Менеджер", "Всего", "Открыто", "Закрыто", "SLAx", "Цель / мес"]
        cxs = [px, px + 60*mm, px + 78*mm, px + 96*mm, px + 114*mm, px + 130*mm]
        for c, cx in zip(cols, cxs):
            self.txt(cx, y0 + h - 13*mm, c, 5.5, INK3, bold=True)
        team = [("Менеджер Один", "5", "3", "3", "0", 1, 3),
                ("Менеджер Два", "5", "5", "0", "1", 0, 0),
                ("Анна Петрова", "8", "4", "4", "0", 4, 5)]
        for i, (nm, tot, op, cl, sla, won, goal) in enumerate(team):
            ry = y0 + h - 19*mm - i*9*mm
            self.dot(px + 2.5*mm, ry + 1*mm, 2.2*mm, _mix([ACC, TEAL, VIO][i % 3], 0.5))
            self.txt(px + 6*mm, ry + 0.2*mm, nm, 6, INK, bold=True)
            for v, cx in zip([tot, op, cl, sla], cxs[1:5]):
                self.txt(cx, ry + 0.2*mm, v, 6, INK2)
            if goal:
                pct = min(1.0, won/goal)
                self.txt(cxs[5], ry + 2.2*mm, f"{won} / {goal}", 5.5, OKL if won >= goal else INK, bold=True)
                self.rr(cxs[5], ry - 0.8*mm, 24*mm, 1.6*mm, fill=EDGE2, line=EDGE2, r=0.8*mm, lw=0)
                self.canv.setFillColor(OK if won >= goal else ACC)
                self.canv.roundRect(cxs[5], ry - 0.8*mm, 24*mm*pct, 1.6*mm, 0.8*mm, stroke=0, fill=1)
            else:
                self.txt(cxs[5], ry + 0.2*mm, "+ цель", 5.5, ACC2)

    # ════════ АДМИН-АККАУНТЫ + СУПЕРПАРОЛЬ ════════
    def m_admins(self):
        x0, y0, w, h = self.frame("goglobal.kg/admin300499 · Система · Администраторы")
        px = x0 + 6*mm
        self.txt(px, y0 + h - 7*mm, "АДМИНИСТРАТОРЫ (входы с логином)", 7, INK, bold=True)
        for i, lg in enumerate(["admin1", "admin2", "admin3"]):
            ry = y0 + h - 14*mm - i*8.5*mm
            self.rr(px, ry - 6.5*mm, w*0.6, 7.5*mm, fill=SURF, line=EDGE, r=1.6*mm)
            self.txt(px + 2.5*mm, ry - 4*mm, lg, 6.5, INK, bold=True)
            self.txt(px + 18*mm, ry - 4*mm, f"Администратор {i+1}", 5.5, INK3)
            self.btn(px + w*0.6 - 26*mm, ry - 6*mm, 12*mm, "Сменить", fill=_mix(ACC, 0.14), line=_mix(ACC, 0.4), tcol=ACC2, size=5.5, h=6*mm)
            self.btn(px + w*0.6 - 13*mm, ry - 6*mm, 7*mm, "Выкл", size=5.5, h=6*mm)
        mw, mh = 62*mm, 40*mm
        mx, my = x0 + w - mw - 6*mm, y0 + (h - mh)/2
        self.rr(mx, my, mw, mh, fill=colors.HexColor("#15171c"), line=ACC, r=2.6*mm, lw=1.2)
        self.txt(mx + 5*mm, my + mh - 8*mm, "Подтверждение", 8, INK, bold=True)
        self.txt(mx + 5*mm, my + mh - 13*mm, "Сменить пароль для «admin2»", 6.5, INK2)
        self.txt(mx + 5*mm, my + mh - 19*mm, "Введите суперпароль", 5.5, INK3)
        self.rr(mx + 5*mm, my + mh - 26*mm, mw - 10*mm, 6*mm, fill=SURF2, line=EDGE2, r=1.6*mm)
        self.txt(mx + 7*mm, my + mh - 24*mm, "••••••••••••", 7, INK)
        self.btn(mx + mw - 44*mm, my + 4*mm, 18*mm, "Отмена", size=6, h=6*mm)
        self.btn(mx + mw - 24*mm, my + 4*mm, 18*mm, "Подтвердить", fill=ACC, line=ACC, tcol=WHITE, size=6, h=6*mm)
