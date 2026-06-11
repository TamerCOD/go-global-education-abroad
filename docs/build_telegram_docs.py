# -*- coding: utf-8 -*-
"""GoGlobal — документация Telegram-бота (A4 PDF).
Все типы уведомлений: когда отправляются, какие данные содержат, с примерами «как в Telegram»."""
import os, re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer,
                                Table, TableStyle, PageBreak, Flowable, KeepTogether)

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "goglobal-telegram-bot.pdf")

pdfmetrics.registerFont(TTFont("Arial", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", r"C:\Windows\Fonts\arialbd.ttf"))
pdfmetrics.registerFont(TTFont("Emoji", r"C:\Windows\Fonts\seguiemj.ttf"))

# palette (doc style = v5)
C_ACCENT = colors.HexColor("#4f46e5")
C_INK    = colors.HexColor("#1c1f26")
C_INK2   = colors.HexColor("#4f5560")
C_INK3   = colors.HexColor("#8a91a0")
C_LINE   = colors.HexColor("#dee1e6")
C_ROW    = colors.HexColor("#f7f8f9")
C_ACC_LT = colors.HexColor("#eef2ff")
C_WARN_LT= colors.HexColor("#fffbeb")
C_WARN   = colors.HexColor("#d97706")
# telegram dark theme
TG_BG    = colors.HexColor("#0e1621")
TG_BUB   = colors.HexColor("#182533")
TG_TEXT  = colors.HexColor("#e9eef4")
TG_DIM   = colors.HexColor("#7d8b99")
TG_LINK  = colors.HexColor("#6ab3f3")
TG_NAME  = colors.HexColor("#8774e1")

PAGE_W, PAGE_H = A4
M_L, M_R, M_T, M_B = 20*mm, 18*mm, 20*mm, 16*mm
CONTENT_W = PAGE_W - M_L - M_R

def st(name, **kw):
    base = dict(fontName="Arial", fontSize=10.5, leading=15.5, textColor=C_INK, spaceAfter=5)
    base.update(kw); return ParagraphStyle(name, **base)

S_H1 = st("H1", fontName="Arial-Bold", fontSize=20, leading=24, textColor=C_ACCENT, spaceBefore=4, spaceAfter=8)
S_H2 = st("H2", fontName="Arial-Bold", fontSize=14, leading=18, textColor=C_INK, spaceBefore=12, spaceAfter=6)
S_H3 = st("H3", fontName="Arial-Bold", fontSize=11.5, leading=15, textColor=C_ACCENT, spaceBefore=10, spaceAfter=3)
S_B  = st("B")
S_SM = st("SM", fontSize=9, leading=12.5, textColor=C_INK2)
S_CAP= st("CAP", fontSize=8.5, leading=11, textColor=C_INK3, alignment=1, spaceBefore=3, spaceAfter=10)
S_LI = st("LI", leftIndent=13, bulletIndent=3, spaceAfter=3)
S_NOTE = st("NOTE", fontSize=9.5, leading=13.5, textColor=C_INK2, backColor=C_ACC_LT,
            borderPadding=7, borderColor=C_ACCENT, borderWidth=0.7, borderRadius=4, spaceBefore=6, spaceAfter=8)
S_WARNP = st("WARNP", fontSize=9.5, leading=13.5, textColor=C_INK2, backColor=C_WARN_LT,
             borderPadding=7, borderColor=C_WARN, borderWidth=0.7, borderRadius=4, spaceBefore=6, spaceAfter=8)

def P(t, s=S_B): return Paragraph(t, s)
def LI(t): return Paragraph(f"<bullet>•</bullet>{t}", S_LI)

class HRule(Flowable):
    def __init__(self, color=C_ACCENT, h=2):
        super().__init__(); self.color = color; self.h = h
    def wrap(self, aw, ah): self.aw = aw; return (aw, self.h + 2)
    def draw(self):
        self.canv.setStrokeColor(self.color); self.canv.setLineWidth(self.h)
        self.canv.line(0, 1, self.aw, 1)

class Doc(BaseDocTemplate):
    pass

def hf(canv, doc):
    canv.saveState()
    if doc.page > 1:
        canv.setStrokeColor(C_LINE); canv.setLineWidth(0.6)
        canv.line(M_L, PAGE_H - 13*mm, PAGE_W - M_R, PAGE_H - 13*mm)
        canv.setFont("Arial-Bold", 8); canv.setFillColor(C_ACCENT)
        canv.drawString(M_L, PAGE_H - 11*mm, "GoGlobal · Telegram-бот")
        canv.setFont("Arial", 8); canv.setFillColor(C_INK3)
        canv.drawRightString(PAGE_W - M_R, PAGE_H - 11*mm, "документация · июнь 2026")
        canv.line(M_L, 11*mm, PAGE_W - M_R, 11*mm)
        canv.setFont("Arial", 8); canv.setFillColor(C_INK3)
        canv.drawCentredString(PAGE_W/2, 7.5*mm, str(doc.page))
    canv.restoreState()

doc = Doc(OUT, pagesize=A4, leftMargin=M_L, rightMargin=M_R, topMargin=M_T, bottomMargin=M_B,
          title="GoGlobal — Telegram-бот: документация", author="GoGlobal")
doc.addPageTemplates([PageTemplate(id="pt", frames=[Frame(M_L, M_B, CONTENT_W, PAGE_H - M_T - M_B)], onPage=hf)])

def tbl(data, widths, size=9, header=True):
    rows = []
    for ri, row in enumerate(data):
        cells = []
        for c in row:
            if ri == 0 and header:
                cells.append(Paragraph(f"<b>{c}</b>", st("th", fontName="Arial-Bold", fontSize=size-0.5,
                                                         leading=size+2.5, textColor=colors.white)))
            else:
                cells.append(Paragraph(str(c), st("td", fontSize=size, leading=size+3.2)))
        rows.append(cells)
    t = Table(rows, colWidths=widths, repeatRows=1 if header else 0)
    sty = [("GRID", (0,0), (-1,-1), 0.5, C_LINE), ("VALIGN", (0,0), (-1,-1), "TOP"),
           ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
           ("LEFTPADDING", (0,0), (-1,-1), 6), ("RIGHTPADDING", (0,0), (-1,-1), 6)]
    if header:
        sty += [("BACKGROUND", (0,0), (-1,0), C_ACCENT),
                ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, C_ROW])]
    t.setStyle(TableStyle(sty)); return t

# ─────────────────────────────────────────────────────────────
#  Telegram bubble flowable
#  lines: list of segments-lists; segment = (text, kind)
#  kind: 'e' emoji · 'n' normal · 'b' bold · 'l' link · 'd' dim
# ─────────────────────────────────────────────────────────────
_FONTS = {'e': ("Emoji", TG_TEXT), 'n': ("Arial", TG_TEXT), 'b': ("Arial-Bold", TG_TEXT),
          'l': ("Arial", TG_LINK), 'd': ("Arial", TG_DIM)}
EMOJI_RE = re.compile("([\U0001F000-\U0001FAFF←-⇿⌀-➿⬀-⯿✀-➿]+️?\\s*)")

def L(*segs):
    """Build a line, auto-splitting leading emoji of plain strings."""
    out = []
    for s in segs:
        if isinstance(s, tuple): out.append(s); continue
        pos = 0
        for m in EMOJI_RE.finditer(s):
            if m.start() > pos: out.append((s[pos:m.start()], 'n'))
            out.append((m.group(0), 'e'))
            pos = m.end()
        if pos < len(s): out.append((s[pos:], 'n'))
    return out

class TgMsg(Flowable):
    FS = 8.6; LH = 13.0
    def __init__(self, lines, time="09:00"):
        super().__init__(); self.lines = lines; self.time = time
    def wrap(self, aw, ah):
        self.w = aw
        self.h = (len(self.lines)) * self.LH + 30
        return (aw, self.h)
    def draw(self):
        c = self.canv
        # chat background
        c.setFillColor(TG_BG); c.roundRect(0, 0, self.w, self.h, 3*mm, stroke=0, fill=1)
        # bubble
        pad = 8; bx, bw = 10*mm, self.w - 20*mm
        bh = self.h - 12
        c.setFillColor(TG_BUB); c.roundRect(bx, 6, bw, bh, 2.6*mm, stroke=0, fill=1)
        # bot name
        c.setFont("Arial-Bold", 8); c.setFillColor(TG_NAME)
        c.drawString(bx + pad, 6 + bh - 12, "GoGlobal CRM Bot")
        # lines
        y = 6 + bh - 12 - self.LH
        for line in self.lines:
            x = bx + pad
            for txt, kind in line:
                font, col = _FONTS[kind]
                c.setFont(font, self.FS); c.setFillColor(col)
                c.drawString(x, y, txt)
                x += c.stringWidth(txt, font, self.FS)
            y -= self.LH
        # time
        c.setFont("Arial", 7); c.setFillColor(TG_DIM)
        c.drawRightString(bx + bw - pad, 10, self.time)

def msg_block(title, when, fields, lines, time, note=None):
    out = [Paragraph(title, S_H3),
           P(f"{'<b>Когда отправляется:</b> ' + when}", S_SM),
           P(f"<b>Какие данные содержит:</b> {fields}", S_SM),
           Spacer(1, 3), TgMsg(lines, time), P("Пример сообщения", S_CAP)]
    if note: out.append(P(note, S_NOTE))
    return [KeepTogether(out)]

story = []

# ───────── заголовок ─────────
story.append(Spacer(1, 2))
story.append(P("Telegram-бот GoGlobal", st("t1", fontName="Arial-Bold", fontSize=26, leading=30, textColor=C_ACCENT)))
story.append(P("Что приходит в чат отдела, в каких случаях и какие данные содержит каждое сообщение",
               st("t2", fontSize=12, leading=17, textColor=C_INK2)))
story.append(HRule()); story.append(Spacer(1, 6))

# ───────── как устроено ─────────
story.append(P("Как это устроено", S_H2))
story.append(P(
    "Бот — <b>односторонний информатор</b>: сервер GoGlobal отправляет сообщения в <b>один групповой чат отдела продаж</b> "
    "через официальный Telegram Bot API. Бот не принимает команды и не отвечает на сообщения — его задача в том, "
    "чтобы вся команда мгновенно видела важные события, даже когда CRM не открыта."))
for li in [
    "<b>Откуда берутся события:</b> заявки с сайта, действия менеджеров в CRM, ежеминутные проверки сервера (SLA, задачи, передачи, авто-сценарии) и ежедневный дайджест.",
    "<b>Куда приходят:</b> в один общий чат (ID чата задаётся в настройках). Личных сообщений бот не пишет — персональное внимание достигается @упоминанием менеджера.",
    "<b>@Упоминания:</b> если у менеджера в админке заполнен Telegram-тег, бот добавляет @username — Telegram присылает человеку персональное уведомление.",
    "<b>Ссылки:</b> почти каждое сообщение заканчивается ссылкой «открыть в CRM» — один тап, и вы в системе. В сообщениях о лидах телефон содержит прямую ссылку «открыть WhatsApp».",
    "<b>Формат:</b> HTML-разметка (жирный, ссылки), предпросмотр ссылок отключён, чтобы не засорять чат.",
]:
    story.append(LI(li))
story.append(P(
    "Если переменные бота не заданы, система просто пишет предупреждение в журнал сервера и продолжает работать — "
    "ни одна функция CRM от Telegram не зависит.", S_NOTE))

# ───────── настройка ─────────
story.append(P("Настройка (один раз)", S_H2))
story.append(tbl([
    ["Шаг", "Что сделать", "Где"],
    ["1", "Создать бота у @BotFather, получить токен", "Telegram"],
    ["2", "Добавить бота в групповой чат отдела и узнать ID чата", "Telegram"],
    ["3", "Прописать TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID", "переменные окружения сервера (Railway)"],
    ["4", "Заполнить Telegram-теги менеджеров (для @упоминаний)", "админка → «Менеджеры»"],
    ["5", "Нажать «Тест» — в чат придёт проверочное сообщение", "админка → «Telegram-уведомления»"],
], [12*mm, 86*mm, CONTENT_W - 98*mm]))

# ───────── сводная таблица ─────────
story.append(P("Все сообщения бота — сводная таблица", S_H2))
story.append(tbl([
    ["Сообщение", "Когда отправляется", "Кого упоминает"],
    ["1 · Новый лид", "заявка с сайта / от партнёра / с событийной страницы", "назначенного менеджера"],
    ["2 · Лид создан вручную", "менеджер нажал «+ Лид» в CRM", "назначенного менеджера"],
    ["3 · Повторное обращение", "заявка с уже известным телефоном/email — дубль не создан", "—"],
    ["4 · Распределена очередь", "менеджер вышел в сеть и забрал ожидавших лидов", "получивших менеджеров"],
    ["5 · SLA нарушен", "лиду не ответили дольше SLA (раз в минуту проверка; шлётся один раз)", "виновного менеджера"],
    ["6 · Просроченная задача", "дедлайн задачи прошёл, задача не закрыта (шлётся один раз)", "исполнителя"],
    ["7 · Утренний дайджест", "каждый день в 09:00 (местное время)", "—"],
    ["8 · Передача лида", "менеджер передал лида коллеге", "обоих"],
    ["9 · Лид принят", "коллега принял передачу", "обоих"],
    ["10 · Передача истекла", "10 минут прошло без ответа — лид вернулся", "обоих"],
    ["11 · Передача отменена", "автор передумал и отозвал передачу", "автора"],
    ["12 · Лид переназначен", "РОП переназначил лида без согласия", "старого и нового"],
    ["13 · Менеджер не в сети", "менеджер выключил тумблер «В сети»", "—"],
    ["14 · Авто-сценарий", "сработало правило «уведомить РОПа» из админки", "—"],
    ["15 · Лид удалён", "РОП или админ удалил лида", "—"],
    ["16 · Тест", "кнопка «Тест» в админке", "—"],
], [34*mm, 92*mm, CONTENT_W - 126*mm], size=8.5))

# ═════════ ГРУППА: ЛИДЫ ═════════
story.append(PageBreak())
story.append(P("Сообщения о лидах", S_H1))
story.append(HRule())

story += msg_block(
    "1 · Новый лид",
    "сразу после заявки с сайта, от партнёра или с событийной страницы (~2 секунды после отправки формы).",
    "номер лида (ссылкой на CRM), бейдж источника, событие (если лид с ивент-ссылки), имя, телефон со ссылкой "
    "в WhatsApp, email, страна, желаемый вуз, уровень и срок поступления, комментарий клиента, назначенный менеджер "
    "с @тегом (или предупреждение, что все офлайн), дедлайн SLA, ссылка на CRM. Пустые поля не показываются.",
    [
        L("🆕 ", ("Новый лид #1247", 'b'), ("  ", 'd'), ("🌐", 'e'), (" Сайт", 'd')),
        L("👤 Айгуль Токтосунова"),
        L("📞 +996 700 123 456 ", ("· открыть WhatsApp", 'l')),
        L("✉️ ", ("aigul@example.com", 'l')),
        L("🌍 Япония"),
        L("🎓 Toyo University"),
        L("📚 Бакалавриат, Осень 2026"),
        L("💬 Хочу узнать про гранты"),
        L("👨‍💼 Назначен: ", ("Анна Иванова", 'b'), (" (anna) ", 'n'), ("@anna_gg", 'l')),
        L("⏱ SLA до 2026-06-12 15:30 UTC"),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "12:28",
    note="Если в момент заявки все менеджеры офлайн, вместо строки «Назначен» придёт: "
         "«Нет онлайн-менеджеров! Лид в очереди до выхода кого-то в сеть» — и чат сразу видит, что лид ничей.")

story += msg_block(
    "2 · Лид создан вручную",
    "менеджер или РОП нажал «+ Лид» в CRM (звонок, визит в офис, рекомендация).",
    "номер лида, бейдж источника, кто создал (имя и логин), контакты и данные клиента (как в «Новом лиде»), "
    "кому назначен с @тегом, ссылка на CRM.",
    [
        L("📞 ", ("Лид #1248 создан вручную", 'b'), ("  · ", 'd'), ("💬", 'e'), (" WhatsApp", 'd')),
        L("Кем: Анна Иванова (anna)"),
        L("👤 Бакыт Асанов"),
        L("📞 +996 555 887 766 ", ("· WhatsApp", 'l')),
        L("🌍 Корея"),
        L("👨‍💼 Назначен: ", ("Анна Иванова", 'b'), (" ", 'n'), ("@anna_gg", 'l')),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "14:05")

story += msg_block(
    "3 · Повторное обращение (создан дубль)",
    "пришла заявка, телефон или email которой уже есть в базе. Создаётся отдельный лид со статусом «Дубль», "
    "назначенный менеджеру оригинала (если он работает; иначе — в очередь). В обеих карточках появляются "
    "перекрёстные комментарии со ссылками друг на друга.",
    "номер нового лида-дубля (ссылкой), бейдж источника, номер оригинального лида, имя клиента, "
    "кому назначен с @тегом, ссылка на CRM.",
    [
        L("🔁 ", ("Повторное обращение — дубль #1253", 'b'), ("  ", 'd'), ("🌐", 'e'), (" Сайт", 'd')),
        L("Оригинал: лид #1247"),
        L("👤 Айгуль Токтосунова"),
        L("👨‍💼 Назначен: ", ("Анна Иванова", 'b'), (" ", 'n'), ("@anna_gg", 'l')),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "16:42",
    note="В CRM дубли видны быстрым фильтром «Дубли» и отдельной колонкой в воронке. История, файлы и "
         "сделка остаются в оригинальном лиде — дубль это сигнал «клиент вернулся».")

story += msg_block(
    "4 · Распределены ожидавшие лиды",
    "лиды копились в очереди (все были офлайн), и менеджер включил «В сети» — сервер раздал очередь.",
    "кто вышел в сеть (если распределение вызвано этим), список «номер лида + имя клиента → менеджер с @тегом», "
    "ссылка на CRM.",
    [
        L("✅ ", ("Распределены ожидавшие лиды", 'b'), (" (после выхода в сеть: anna)", 'n')),
        L("• #1250 Чолпон Дуйшеева → ", ("Анна Иванова", 'b'), (" ", 'n'), ("@anna_gg", 'l')),
        L("• #1251 Темир Калыков → ", ("Анна Иванова", 'b'), (" ", 'n'), ("@anna_gg", 'l')),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "09:01")

# ═════════ ГРУППА: КОНТРОЛЬ СРОКОВ ═════════
story.append(PageBreak())
story.append(P("Контроль сроков", S_H1))
story.append(HRule())

story += msg_block(
    "5 · SLA нарушен",
    "лиду никто не ответил дольше SLA (3 рабочих часа). Сервер проверяет раз в минуту; по каждому лиду сообщение "
    "уходит только один раз. Параллельно виновному менеджеру летит push на телефон.",
    "номер лида, ответственный менеджер с логином и @тегом (или «лид без менеджера!»), когда лид получен, "
    "когда был дедлайн, на сколько просрочен (часы и минуты), ссылка на CRM.",
    [
        L("⏰ ", ("SLA нарушен по лиду #1252", 'b')),
        L("Менеджер: ", ("Дамир Садыков", 'b'), (" (damir) ", 'n'), ("@damir_gg", 'l')),
        L("Получен: 2026-06-12 09:10 UTC"),
        L("Дедлайн был: 2026-06-12 12:10 UTC"),
        L("Просрочен на: ", ("1ч 25м", 'b')),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "13:35",
    note="Это же событие красит лида в красный в CRM и отнимает балл в статистике менеджера. "
         "Если лид в очереди без менеджера — вместо имени будет «Лид без назначенного менеджера!».")

story += msg_block(
    "6 · Просроченная задача",
    "дедлайн задачи прошёл, а она не отмечена выполненной. По каждой задаче — одно напоминание.",
    "название задачи, исполнитель с @тегом, по какому лиду (имя и номер), когда был дедлайн, ссылка на CRM.",
    [
        L("⏰ ", ("Просроченная задача", 'b')),
        L("📋 Отправить список вузов"),
        L("👨‍💼 Анна Иванова ", ("@anna_gg", 'l')),
        L("📞 По лиду: ", ("Айгуль Токтосунова", 'b'), (" (#1247)", 'n')),
        L("⏱ Дедлайн был: 2026-06-12 10:00 UTC"),
        L(("🔗 ", 'e'), ("открыть CRM", 'l')),
    ], "10:01")

story += msg_block(
    "7 · Утренний дайджест",
    "каждый день в 09:00 по местному времени офиса — автоматическая сводка для РОПа и команды.",
    "итоги вчерашнего дня: всего лидов, выиграно (с суммой выручки), проиграно; открытые нарушения SLA; "
    "просроченные задачи; менеджеры офлайн больше 24 часов; ссылки на админку и CRM. "
    "Строки с нулями не показываются.",
    [
        L("📊 ", ("GoGlobal — утренний дайджест", 'b')),
        L("Вчера: ", ("23", 'b'), (" лидов, ", 'n'), ("3", 'b'), (" won ($12 500), ", 'n'), ("1", 'b'), (" lost", 'n')),
        L("⚠️ Открытых с нарушением SLA: ", ("2", 'b')),
        L("📋 Просроченных задач: ", ("4", 'b')),
        L("⚪ Оффлайн >24ч: Дамир Садыков"),
        L(("→ ", 'n'), ("админка", 'l'), (" · ", 'd'), ("CRM", 'l')),
    ], "09:00")

# ═════════ ГРУППА: ПЕРЕДАЧИ И КОМАНДА ═════════
story.append(PageBreak())
story.append(P("Передачи лидов и команда", S_H1))
story.append(HRule())

story += msg_block(
    "8 · Передача лида",
    "менеджер в карточке выбрал коллегу и нажал «Передать». У получателя есть 10 минут на принятие "
    "(ему дополнительно приходит push).",
    "номер лида, кто передаёт (с @тегом), кому (с @тегом), сколько минут на принятие, ссылка на CRM.",
    [
        L("🤝 ", ("Передача лида #1247", 'b')),
        L("От: ", ("Анна Иванова", 'b'), (" ", 'n'), ("@anna_gg", 'l')),
        L("Кому: ", ("Гулжан Тен", 'b'), (" ", 'n'), ("@gulzhan_gg", 'l'), (" — ждём принятия (10 мин)", 'n')),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "15:20")

story += msg_block(
    "9 · Лид принят",
    "получатель нажал «Принять» — лид перешёл к нему, SLA пересчитан под его рабочие часы.",
    "номер лида, у кого был, у кого теперь (оба с @тегами).",
    [
        L("✅ ", ("Лид #1247 принят", 'b')),
        L("Был у: Анна Иванова ", ("@anna_gg", 'l')),
        L("Теперь у: ", ("Гулжан Тен", 'b'), (" ", 'n'), ("@gulzhan_gg", 'l')),
    ], "15:24")

story += msg_block(
    "10 · Передача истекла",
    "получатель не отреагировал за 10 минут — сервер автоматически вернул лида автору.",
    "номер лида, кто не принял, кому возвращён (оба с @тегами).",
    [
        L("⌛ ", ("Передача лида #1247 истекла", 'b')),
        L("Не принята: Гулжан Тен ", ("@gulzhan_gg", 'l')),
        L("Возвращён: Анна Иванова ", ("@anna_gg", 'l')),
    ], "15:31")

story += msg_block(
    "11 · Передача отменена",
    "автор передачи передумал и отозвал её до ответа получателя (или получатель отклонил).",
    "номер лида и кто отменил.",
    [
        L("↩️ Передача лида #1247 отменена (Анна Иванова)"),
    ], "15:27")

story += msg_block(
    "12 · Лид переназначен (РОП)",
    "руководитель отдела переназначил лида другому менеджеру без процедуры согласия — например, при болезни "
    "или увольнении. Массовое переназначение даёт одно сообщение на каждого лида.",
    "номер лида, имя клиента, у кого был (с @тегом), у кого теперь (с @тегом), кто из тимлидов это сделал, ссылка на CRM.",
    [
        L("🔄 ", ("Лид #1252", 'b'), (" переназначен", 'n')),
        L("👤 Нурай Сапарова"),
        L("Был у: ", ("Дамир Садыков", 'b'), (" ", 'n'), ("@damir_gg", 'l')),
        L("Теперь у: ", ("Анна Иванова", 'b'), (" ", 'n'), ("@anna_gg", 'l')),
        L("Тимлид: Бакыт Орозов"),
        L(("→ ", 'n'), ("открыть в CRM", 'l')),
    ], "09:25")

story += msg_block(
    "13 · Менеджер не в сети",
    "менеджер выключил тумблер «В сети» (обед, встреча, конец дня). Обратное включение отдельного сообщения "
    "не даёт — но если в очереди ждали лиды, придёт сообщение №4 о распределении.",
    "имя и логин менеджера.",
    [
        L("💤 ", ("Анна Иванова", 'b'), (" (anna) — не в сети", 'n')),
    ], "13:00")

# ═════════ ГРУППА: СЛУЖЕБНЫЕ ═════════
story.append(PageBreak())
story.append(P("Служебные сообщения", S_H1))
story.append(HRule())

story += msg_block(
    "14 · Авто-сценарий",
    "сработало правило автоматизации с действием «уведомить РОПа» (настраивается в админке: например, "
    "«лид завис в Перезвонить дольше 48 часов»). Текст задаёт админ при настройке правила.",
    "текст из настроек правила + номер лида. По каждому лиду правило срабатывает один раз.",
    [
        L("🤖 Лид завис в «Перезвонить» дольше 48 часов — проверьте (лид #1249)"),
    ], "11:30")

story += msg_block(
    "15 · Лид удалён",
    "РОП удалил лида из CRM или админ — из админки. Удаление необратимо, поэтому чат уведомляется всегда.",
    "номер лида и кто удалил (тимлид по имени / админ).",
    [
        L("🗑 Лид #1199 удалён тимлидом Бакыт Орозов"),
    ], "17:45")

story += msg_block(
    "16 · Тест",
    "админ нажал «Тест» в разделе «Telegram-уведомления» — проверка, что токен и ID чата настроены верно.",
    "пометка Test и текущее время сервера.",
    [
        L("🧪 ", ("Test", 'b')),
        L("GoGlobal admin → Telegram check 2026-06-12T09:15:00.000Z"),
    ], "15:15")

# ───────── что НЕ отправляется ─────────
story.append(P("Чего бот не отправляет (намеренно)", S_H2))
story.append(P(
    "Чтобы чат не превратился в шум, рутинные события в Telegram не дублируются: смена статуса и этапа, "
    "комментарии в карточке, загрузка файлов, изменение сделки, создание задач (придёт только просрочка), "
    "вход и выход из CRM (кроме «не в сети»). Всё это видно в самой CRM и в журнале аудита."))
story.append(P(
    "Частые вопросы: «Почему менеджера не упомянуло?» — у него не заполнен Telegram-тег в админке. "
    "«Почему сообщение не пришло?» — проверьте кнопкой «Тест»; если тест молчит, неверны токен или ID чата.", S_WARNP))

story.append(Spacer(1, 10)); story.append(HRule())
story.append(P("GoGlobal · Telegram-бот · документация обновляется вместе с системой", S_CAP))

doc.build(story)
print("OK:", OUT)
