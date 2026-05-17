# -*- coding: utf-8 -*-
"""
GoGlobal CRM — 4 supplementary docs:
  1. manager-card.pdf — quick-start for managers (2 pp)
  2. teamlead-card.pdf — quick-start for teamleads (2 pp)
  3. admin-setup.pdf — deployment & env setup guide (3 pp)
  4. onboarding-checklist.pdf — new manager onboarding (2 pp)
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, ListFlowable, ListItem
)
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.platypus.frames import Frame
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily

# Fonts
pdfmetrics.registerFont(TTFont('Arial', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFont(TTFont('Arial-Italic', 'C:/Windows/Fonts/ariali.ttf'))
pdfmetrics.registerFont(TTFont('Arial-BI', 'C:/Windows/Fonts/arialbi.ttf'))
registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-BI')

# Palette
COL_PRIMARY = colors.HexColor('#0ea5e9')
COL_PRIMARY_DARK = colors.HexColor('#0369a1')
COL_ACCENT = colors.HexColor('#06b6d4')
COL_DARK = colors.HexColor('#0f172a')
COL_DARK_EXTRA = colors.HexColor('#020617')
COL_TEXT = colors.HexColor('#1e293b')
COL_MUTED = colors.HexColor('#64748b')
COL_LIGHT = colors.HexColor('#f1f5f9')
COL_BORDER = colors.HexColor('#cbd5e1')
COL_OK = colors.HexColor('#10b981')
COL_WARN = colors.HexColor('#f59e0b')
COL_BAD = colors.HexColor('#ef4444')
COL_VIOLET = colors.HexColor('#a855f7')
COL_AMBER = colors.HexColor('#fbbf24')
COL_TEAL = colors.HexColor('#14b8a6')

# Styles
styles = getSampleStyleSheet()
H1 = ParagraphStyle('H1', fontName='Arial-Bold', fontSize=22, leading=28, textColor=COL_DARK, spaceAfter=8)
H2 = ParagraphStyle('H2', fontName='Arial-Bold', fontSize=14, leading=18, textColor=COL_PRIMARY_DARK, spaceBefore=10, spaceAfter=4)
H3 = ParagraphStyle('H3', fontName='Arial-Bold', fontSize=11, leading=14, textColor=COL_PRIMARY, spaceBefore=6, spaceAfter=2)
body = ParagraphStyle('body', fontName='Arial', fontSize=9.5, leading=13, textColor=COL_TEXT, alignment=TA_LEFT, spaceAfter=2)
small = ParagraphStyle('small', fontName='Arial', fontSize=8.5, leading=11, textColor=COL_TEXT, alignment=TA_LEFT)
note = ParagraphStyle('note', fontName='Arial-Italic', fontSize=8.5, leading=11, textColor=COL_MUTED, alignment=TA_LEFT)
code = ParagraphStyle('code', fontName='Courier', fontSize=8, leading=10, backColor=colors.HexColor('#e0f2fe'),
                       textColor=COL_DARK, borderColor=COL_BORDER, borderWidth=0.5, borderPadding=3,
                       leftIndent=2, rightIndent=2)
white = ParagraphStyle('white', fontName='Arial-Bold', fontSize=11, leading=14, textColor=colors.white, alignment=TA_CENTER)

def P(t, st=body): return Paragraph(t, st)
def Sp(h=4): return Spacer(1, h)

def bullets(items, color=COL_PRIMARY):
    return ListFlowable(
        [ListItem(Paragraph(it, small), leftIndent=10, bulletColor=color) for it in items],
        bulletType='bullet', leftIndent=12, bulletFontSize=8, spaceBefore=1, spaceAfter=4
    )

def numlist(items):
    return ListFlowable(
        [ListItem(Paragraph(it, small), leftIndent=12) for it in items],
        bulletType='1', leftIndent=14, bulletFontSize=8, spaceBefore=1, spaceAfter=4
    )

def hero_band(title_main, title_sub, color=COL_PRIMARY):
    cell_data = [[
        Paragraph(f'<font color="white" size="20"><b>{title_main}</b></font>',
                  ParagraphStyle('h', fontName='Arial-Bold', fontSize=20, leading=24, textColor=colors.white)),
        Paragraph(f'<font color="white" size="9">{title_sub}</font>',
                  ParagraphStyle('hs', fontName='Arial', fontSize=9, leading=12, textColor=colors.white, alignment=2)),
    ]]
    t = Table(cell_data, colWidths=[12*cm, 5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), color),
        ('LEFTPADDING', (0, 0), (-1, -1), 14),
        ('RIGHTPADDING', (0, 0), (-1, -1), 14),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    return t

def callout(title, body_text, color=COL_PRIMARY):
    inner = []
    inner.append(Paragraph(f'<font color="white"><b>{title}</b></font>',
                            ParagraphStyle('co', fontName='Arial-Bold', fontSize=9.5, leading=12, textColor=colors.white)))
    inner.append(Spacer(1, 3))
    inner.append(Paragraph(body_text, small))
    t = Table([[inner]], colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
        ('LINEABOVE', (0, 0), (-1, 0), 2.5, color),
        ('BOX', (0, 0), (-1, -1), 0.4, COL_BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    return t

def two_col_table(rows, hdr_left='Что', hdr_right='Где / как'):
    data = [[Paragraph(f'<b>{hdr_left}</b>', small), Paragraph(f'<b>{hdr_right}</b>', small)]]
    for k, v in rows:
        data.append([Paragraph(k, small), Paragraph(v, small)])
    t = Table(data, colWidths=[5.5*cm, 11*cm], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COL_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Arial-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.3, COL_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 5),
        ('RIGHTPADDING', (0, 0), (-1, -1), 5),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    return t

def checklist(items):
    """Items: list of (text, optional sub-note). Adds a checkbox square."""
    data = []
    for it in items:
        if isinstance(it, tuple):
            text, note_text = it
        else:
            text, note_text = it, None
        cell = [Paragraph(text, small)]
        if note_text:
            cell.append(Paragraph(f'<font color="#64748b" size="8"><i>{note_text}</i></font>', small))
        data.append(['☐', cell])
    t = Table(data, colWidths=[0.8*cm, 15.7*cm])
    t.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (0, -1), 14),
        ('TEXTCOLOR', (0, 0), (0, -1), COL_PRIMARY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (0, 0), (-1, -2), 0.3, COL_BORDER),
    ]))
    return t

class CardDoc(BaseDocTemplate):
    def __init__(self, filename, header_title, header_color=COL_DARK, **kw):
        BaseDocTemplate.__init__(self, filename, pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm, topMargin=1.8*cm, bottomMargin=1.5*cm, **kw)
        self.header_title = header_title
        self.header_color = header_color
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height,
                      id='normal', topPadding=6, bottomPadding=4)
        self.addPageTemplates([PageTemplate(id='normal', frames=[frame], onPage=self._page)])

    def _page(self, canv, doc):
        canv.saveState()
        canv.setFillColor(self.header_color)
        canv.rect(0, A4[1] - 1*cm, A4[0], 1*cm, fill=1, stroke=0)
        canv.setFillColor(COL_PRIMARY)
        canv.rect(0, A4[1] - 1.05*cm, A4[0], 0.05*cm, fill=1, stroke=0)
        canv.setFont('Arial-Bold', 9)
        canv.setFillColor(colors.white)
        canv.drawString(2*cm, A4[1] - 0.65*cm, self.header_title)
        canv.setFont('Arial', 8)
        canv.setFillColor(colors.HexColor('#94a3b8'))
        canv.drawRightString(A4[0] - 2*cm, A4[1] - 0.65*cm, 'GoGlobal CRM v4 · goglobal.kg')
        canv.setFillColor(COL_MUTED)
        canv.setFont('Arial', 7.5)
        canv.drawCentredString(A4[0]/2, 0.8*cm, f'стр. {doc.page}  ·  © GoGlobal Education Abroad  ·  май 2026')
        canv.restoreState()


OUT_DIR = 'C:/Users/ishem/Downloads/go-global---education-abroad/docs'

# ════════════════════════════════════════════════════════════════════════════
# 1.  MANAGER QUICK-START CARD
# ════════════════════════════════════════════════════════════════════════════
def build_manager_card():
    doc = CardDoc(f'{OUT_DIR}/manager-quickstart.pdf',
                   header_title='👨‍💼 Шпаргалка менеджера', header_color=COL_DARK)
    s = []
    s.append(hero_band('Менеджер · быстрый старт', 'GoGlobal CRM · /lidy'))
    s.append(Sp(8))
    s.append(P('<font color="#0369a1" size="9">Войдите в систему по адресу <b>goglobal.kg/lidy</b>. '
               'Логин выдаёт администратор, пароль <b>qwe123!@#</b>.</font>', body))
    s.append(Sp(6))

    s.append(P('1.  Утренний старт', H2))
    s.append(bullets([
        'Откройте <b>goglobal.kg/lidy</b> → войдите → переключите <b>🟢 «В сети»</b> в шапке.',
        'Включите <b>📥 Inbox 0</b> в боковой панели — видны только лиды, требующие действия (новые, просроченные, с задачами).',
        'Проверьте виджет <b>«Мой день»</b> наверху: встречи сегодня, горячие лиды, открытые задачи.',
        'Передачи лидов от коллег — <b>розовая пульсирующая плашка «Передачи мне»</b> (10 минут на решение).',
    ]))

    s.append(P('2.  Работа с лидом', H2))
    s.append(two_col_table([
        ('📞 Клик на «Позвонить»', 'Открывает приложение телефона. Автоматически фиксирует касание.'),
        ('💬 Клик на «WhatsApp»', 'Открывает чат с предзаполненным приветствием.'),
        ('📨 Шаблон ▾', 'Список готовых сообщений с подстановкой имени клиента.'),
        ('Смена статуса', 'Кнопки 🎯 «Обработка лида» в драуере. Цветная — текущий.'),
        ('📅 Запланировать визит', 'Статус "Запись в офис" → откроется выбор даты и времени.'),
        ('❌ Не отвечает / отказался', 'Закройте с причиной (выбор категории + опц. комментарий).'),
        ('Создать задачу', 'Вкладка 📋 Задачи → текст + дедлайн → «+ Добавить».'),
        ('Загрузить документ', 'Вкладка 📎 Файлы → «⬆ Загрузить» (PDF/JPG/HEIC до 25 МБ).'),
    ]))

    s.append(P('3.  Канбан с drag&drop', H2))
    s.append(P('Включите вид <b>«🎯 Воронка статусов»</b> или <b>«🎓 Этапы клиентов»</b> в переключателе. Тащите карточку из колонки в колонку — статус меняется автоматически.', small))
    s.append(P('<b>Особые случаи:</b>', small))
    s.append(bullets([
        '<b>Drop в "Запись в офис"</b> → откроется драуер для указания даты встречи.',
        '<b>Drop в "Отказ"</b> → запросит причину текстом.',
        'Чужие лиды перетащить нельзя (если вы не тимлид).',
    ]))

    s.append(P('4.  Сделка и скоринг', H2))
    s.append(two_col_table([
        ('💰 Вкладка «Сделка»', 'Введите сумму + валюту + % вероятности → «Сохранить»'),
        ('🔥 Score 0–100', 'Авто-рассчитывается. Заполните больше полей (бюджет, ВУЗ, тест) → score растёт.'),
        ('Прогноз в "Моём дне"', '<b>В работе</b> = Σ сделок. <b>Прогноз</b> = взвешенно (× вероятность).'),
    ]))

    s.append(PageBreak())

    s.append(P('5.  Передача и переназначение', H2))
    s.append(two_col_table([
        ('🤝 Передать коллеге', 'Драуер → раздел "Передача лида" → выбрать → «Передать». Коллега должен принять за 10 мин, иначе лид вернётся.'),
        ('✓ Принять переданное', 'В уведомлении сверху драуера — «Принять» или «Отказать».'),
        ('↩ Отменить свою передачу', 'Вы можете отозвать лид до решения коллеги.'),
    ]))

    s.append(P('6.  Быстрые фильтры (сайдбар)', H2))
    s.append(two_col_table([
        ('📥 Inbox 0', 'Только то, что требует действия (новые / просрочки / с задачами).'),
        ('⏰ Просроченные', 'Только с истёкшим SLA.'),
        ('📂 Показать закрытые', 'Включает won/lost в выборку.'),
        ('☑️ Массовые действия', 'Чекбоксы на карточках + плавающая панель внизу.'),
        ('💾 Мои фильтры', 'Сохранение текущего набора одним кликом.'),
    ]))

    s.append(P('7.  Знай свои метрики', H2))
    s.append(bullets([
        '<b>Score &lt; 30 ❄</b> — холодный, может стоит закрыть.',
        '<b>Score 30–60 🌡</b> — тёплый, нужна работа.',
        '<b>Score 60–85 🔥</b> — горячий, приоритет.',
        '<b>Score 85+ 🚀</b> — обязательно довести до win.',
    ]))

    s.append(P('8.  Что вы НЕ можете', H2))
    s.append(bullets([
        'Удалять лиды (только тимлид может).',
        'Менять чужие лиды (только тимлид).',
        'Видеть лиды других менеджеров.',
        'Менять статусы / шаблоны / автоматизации (это в админке).',
    ], color=COL_BAD))

    s.append(Sp(6))
    s.append(callout('💡 Совет дня',
        'Если работаете с мобильного — добавьте /lidy на главный экран через меню браузера. '
        'Получите PWA-приложение с push-уведомлениями о новых лидах.',
        color=COL_OK))

    s.append(Sp(8))
    s.append(callout('📞 Помощь',
        'База знаний — кнопка <b>📖</b> в шапке CRM. Технические вопросы — пишите тимлиду или администратору.',
        color=COL_PRIMARY))

    doc.build(s)


# ════════════════════════════════════════════════════════════════════════════
# 2.  TEAMLEAD QUICK-START CARD
# ════════════════════════════════════════════════════════════════════════════
def build_teamlead_card():
    doc = CardDoc(f'{OUT_DIR}/teamlead-quickstart.pdf',
                   header_title='👑 Шпаргалка тимлида', header_color=COL_PRIMARY_DARK)
    s = []
    s.append(hero_band('Тимлид · продвинутые операции', 'GoGlobal CRM · /lidy + /admin', color=COL_PRIMARY_DARK))
    s.append(Sp(8))
    s.append(P('<font color="#0369a1" size="9">У вас две точки входа: <b>/lidy</b> (видите ВСЕ лиды команды) и <b>/admin</b> '
               '(управление настройками + полная аналитика).</font>'))
    s.append(Sp(6))

    s.append(P('1.  Ежедневная рутина (10 минут)', H2))
    s.append(numlist([
        'Откройте <b>/admin</b> → раздел <b>🚦 Здоровье продаж</b> (открыт по умолчанию).',
        'Если 🟢 — всё хорошо, можно идти заниматься клиентами.',
        'Если 🟡 / 🔴 — изучите "причины" в светофоре и устраните.',
        'Проверьте список оффлайн-менеджеров — пнуть в Telegram если кто-то не вошёл.',
        'Просмотрите <b>Telegram-дайджест</b> в боте (приходит в 09:00 локально).',
    ]))

    s.append(P('2.  Управление командой', H2))
    s.append(two_col_table([
        ('🏆 Leaderboard', '/admin → "Leaderboard менеджеров". Рейтинг по выручке. Top-3 получают медали.'),
        ('📋 1-on-1 отчёт', 'Перед встречей с менеджером выберите его в "1-on-1 отчёт". Готовый KPI-доклад за неделю.'),
        ('⏱ Время в статусах', '"Время в статусах + зависшие" — где тормозят лиды. Список stuck >72ч с именем менеджера.'),
        ('⏲ Скорость отклика', 'P50/P90 у каждого. Кто долго отвечает — на ревью.'),
        ('🌡 Heatmap', 'Когда приходят лиды по дню недели × часу. Сравните с графиком онлайна команды.'),
    ]))

    s.append(P('3.  Работа с проблемными лидами в /lidy', H2))
    s.append(two_col_table([
        ('Переключатель "Все/Мои"', 'В шапке сайдбара. "Все" — все лиды компании.'),
        ('Фильтр по менеджеру', 'Сайдбар → "Менеджер" → выбрать конкретного — увидите его пайплайн.'),
        ('Взять лид себе', 'Драуер чужого лида → "👤 Взять лид себе".'),
        ('Переназначить', 'Драуер → "Переназначить" → выбрать другого менеджера (без подтверждения).'),
        ('🗑 Удалить', 'Драуер → внизу. Только тимлид может, с подтверждением.'),
    ]))

    s.append(P('4.  Bulk-операции', H2))
    s.append(P('Сайдбар → ☑️ "Массовые действия" → выберите N лидов чекбоксами → используйте плавающую панель внизу:', small))
    s.append(bullets([
        '<b>Сменить статус</b> для всех выбранных.',
        '<b>Этап клиента</b> — массово переместить по post-win пайплайну.',
        '<b>Метка</b> — добавить или снять (например, всем "VIP").',
        '<b>Переназначить</b> — массово отдать другому менеджеру.',
    ]))

    s.append(PageBreak())

    s.append(P('5.  Анализ и оптимизация (еженедельно)', H2))
    s.append(two_col_table([
        ('📆 Когортный анализ', 'Видите конверсию по месяцам поступления — есть сезонность? Январь vs Май.'),
        ('💸 ROI по источникам', 'Введите CPL (Cost-per-Lead) для каждого источника. ROI &lt; 1x = убыточный канал.'),
        ('🚪 Анализ отказов', 'Что главная причина closed_lost? Если "Слишком дорого" преобладает — пересмотрите прайс.'),
        ('📈 Дашборд CRM', 'Sales Forecast (pipeline, weighted, won MTD) + воронка + нагрузка менеджеров.'),
    ]))

    s.append(P('6.  Автоматизации = меньше микро-менеджмента', H2))
    s.append(P('<b>/admin → "Авто-сценарии"</b>. Создайте правила КОГДА → ТОГДА. Примеры:', small))
    s.append(bullets([
        '<b>КОГДА</b> лид в статусе "new" &gt; 4ч → <b>ТОГДА</b> создать задачу "Срочно перезвонить".',
        '<b>КОГДА</b> нет ответа &gt; 24ч → <b>ТОГДА</b> уведомить меня в Telegram.',
        '<b>КОГДА</b> лид в "callback" &gt; 7 дней → <b>ТОГДА</b> сменить на "no_response".',
        '<b>КОГДА</b> сделка &gt;$30k и в "in_progress" &gt; 3 дня → <b>ТОГДА</b> добавить метку "VIP-внимание".',
    ]))

    s.append(P('7.  Routing rules — авто-распределение', H2))
    s.append(P('/admin → "🤖 Авто-распределение лидов". Примеры правил:', small))
    s.append(bullets([
        'Страна = Япония → менеджер X (специалист по Японии).',
        'Источник = Реклама → senior-менеджер (горячие конвертим сразу).',
        'Уровень = "PhD" → топ-менеджер.',
        'min_english = "B2" → senior (могут с акцентом).',
    ]))
    s.append(P('Если ни одно правило не подходит — round-robin.', note))

    s.append(P('8.  Knowledge Base — снижение нагрузки', H2))
    s.append(P('/admin → "📖 База знаний". Добавляйте статьи: "Виза Япония — процедура", "Список аккредитованных вузов Кореи". '
               'Менеджеры открывают через 📖 в шапке /lidy — меньше вопросов вам.', small))

    s.append(P('9.  Комиссии (раз в месяц)', H2))
    s.append(P('/admin → "💵 Комиссии и выплаты":', small))
    s.append(bullets([
        'Настройте % правил (global или per manager).',
        'Кнопка "30 дней" → видите кому сколько начислено.',
        'Итого внизу — общая сумма к выплате за месяц.',
    ]))

    s.append(Sp(6))
    s.append(callout('🚨 Когда вмешиваться',
        'Если у менеджера: 3+ зависших лида &gt;72ч ИЛИ среднее время отклика &gt;2 часов — пора на 1-on-1. '
        'Если SLA упал ниже 60% по команде — экстренная встреча, что-то фундаментально не работает.',
        color=COL_BAD))

    s.append(Sp(6))
    s.append(callout('💾 Регулярно',
        'Раз в неделю — скачайте бэкап БД (/admin → "Утилиты"). Файл .json со ВСЕМИ таблицами.',
        color=COL_TEAL))

    doc.build(s)


# ════════════════════════════════════════════════════════════════════════════
# 3.  ADMIN / DEVOPS SETUP GUIDE
# ════════════════════════════════════════════════════════════════════════════
def build_admin_setup():
    doc = CardDoc(f'{OUT_DIR}/admin-setup-guide.pdf',
                   header_title='🛡️ Гид администратора · DevOps', header_color=COL_DARK_EXTRA)
    s = []
    s.append(hero_band('Развёртывание и настройка', 'GoGlobal CRM · Railway + Postgres', color=COL_DARK_EXTRA))
    s.append(Sp(8))

    s.append(P('1.  Архитектура', H2))
    s.append(two_col_table([
        ('Frontend', 'React 19 + Vite + Tailwind. Билдится в <font face="Courier">dist/</font>.'),
        ('Backend', 'Node 20 + Express 5 + TypeScript (через tsx).'),
        ('БД', 'PostgreSQL (Railway managed plugin).'),
        ('Деплой', 'Railway → GitHub auto-deploy на push в main.'),
        ('Домены', 'Прод: <b>goglobal.kg</b> (через Cloudflare → Railway).'),
        ('Хранилище', 'Файлы — Railway Volume (/uploads). Бэкап БД через JSON-дамп.'),
    ], hdr_left='Компонент', hdr_right='Что использует'))

    s.append(P('2.  Environment Variables (Railway)', H2))
    s.append(P('Обязательные:', small))
    s.append(two_col_table([
        ('DATABASE_URL', 'Auto от Postgres-плагина Railway.'),
        ('ADMIN_PASSWORD', 'Пароль для /admin. <b>Смените сразу.</b>'),
        ('JWT_SECRET', 'Случайная строка 32+ символов для JWT.'),
        ('PORT', '3000 (Railway проксирует).'),
    ], hdr_left='Переменная', hdr_right='Назначение'))

    s.append(P('Опциональные (рекомендуется):', small))
    s.append(two_col_table([
        ('TELEGRAM_BOT_TOKEN', 'Бот для уведомлений (создать через @BotFather).'),
        ('TELEGRAM_CHAT_ID', 'ID чата куда шлёт. Создайте чат, добавьте бота, узнайте chat_id.'),
        ('VAPID_PUBLIC_KEY', 'Для браузерных push (см. ниже).'),
        ('VAPID_PRIVATE_KEY', 'То же. Хранить в секрете!'),
        ('VAPID_SUBJECT', 'mailto:admin@goglobal.kg'),
        ('LEAD_SLA_HOURS', 'Сколько часов SLA. По умолчанию 3.'),
        ('PUBLIC_BASE_URL', 'https://goglobal.kg (для ссылок в Telegram).'),
        ('LEAD_INTAKE_SECRET', 'Если хотите защитить API создания лидов.'),
    ], hdr_left='Переменная', hdr_right='Назначение'))

    s.append(P('3.  Генерация VAPID ключей (для push)', H2))
    s.append(Paragraph('Запустите в любом терминале с Node:', small))
    s.append(Paragraph('npx web-push generate-vapid-keys', code))
    s.append(P('Получите 2 строки — публичный и приватный ключи. Вставьте в Railway → Variables.', small))

    s.append(P('4.  Telegram-бот пошагово', H2))
    s.append(numlist([
        'В Telegram найдите <b>@BotFather</b> → /newbot → дайте имя.',
        'Получите <b>BOT_TOKEN</b> вида <font face="Courier">1234567890:ABC...</font>',
        'Создайте групповой чат "GoGlobal CRM Alerts" + добавьте бота.',
        'Дайте боту права администратора (можно ограниченные).',
        'Узнайте chat_id через <b>@getidsbot</b> (добавьте в чат, /id).',
        'В Railway → Variables: <font face="Courier">TELEGRAM_BOT_TOKEN</font> + <font face="Courier">TELEGRAM_CHAT_ID</font>',
        'Перезапустите сервис в Railway (Deployments → Restart).',
    ]))

    s.append(PageBreak())

    s.append(P('5.  Первичный запуск', H2))
    s.append(numlist([
        'Зайдите в Railway → проект → добавьте Postgres плагин.',
        'Сервис web автоматически подхватит DATABASE_URL.',
        'Установите ADMIN_PASSWORD + JWT_SECRET в Variables.',
        'Дождитесь деплоя (npm install + vite build + tsx server.ts).',
        'Откройте <b>goglobal.kg/admin</b> → войдите с ADMIN_PASSWORD.',
        'Создайте первого менеджера: /admin → "🧑‍💼 Менеджеры" → "+ Создать". Логин на латинице.',
        'Зайдите в /lidy под этим менеджером (пароль qwe123!@#).',
        'Создайте тестовый лид → проверьте Telegram-уведомление.',
    ]))

    s.append(P('6.  Регулярные операции', H2))
    s.append(two_col_table([
        ('💾 Бэкап БД', '/admin → "Утилиты и бэкапы" → "Скачать полный дамп". <b>Раз в неделю.</b>'),
        ('🕒 Аудит-лог', '/admin → "Журнал аудита". Проверяйте подозрительную активность раз в месяц.'),
        ('🚦 Здоровье', '/admin → "Здоровье продаж" — каждое утро.'),
        ('Обновления', 'git push → Railway автоматически деплоит.'),
        ('Restart БД', 'Railway → Postgres → Deployments → Restart (если нужно).'),
        ('Логи', 'Railway → web service → Deployments → View Logs.'),
    ], hdr_left='Задача', hdr_right='Что делать'))

    s.append(P('7.  Аварийное восстановление', H2))
    s.append(P('<b>Сценарий: БД упала.</b>', small))
    s.append(numlist([
        'Railway → Postgres → Backups → восстановите последний backup (Railway хранит сам).',
        'Если backup Railway недоступен — используйте свой JSON-дамп: новая БД + восстановление таблицы за таблицей.',
        'Сервис web автоматически переподключится.',
    ]))

    s.append(P('<b>Сценарий: GitHub-приложение отвалилось от Railway.</b>', small))
    s.append(numlist([
        'Railway → web → Settings → Source → Disconnect.',
        'Connect снова, выберите тот же репозиторий.',
        'Авторизуйте GitHub App.',
        'Запустите Deploy → последний коммит подхватится.',
    ]))

    s.append(P('<b>Сценарий: переезд с Railway на другую платформу.</b>', small))
    s.append(numlist([
        'Скачайте полный JSON-дамп через /admin.',
        'На новой платформе: Postgres + Node 20+ + переменные env.',
        'Загрузите дамп через скрипт миграции (нужно написать).',
        '/uploads — копируйте через Railway CLI: <font face="Courier">railway run "tar czf - uploads"</font>',
    ]))

    s.append(P('8.  Безопасность', H2))
    s.append(bullets([
        '<b>Сразу смените ADMIN_PASSWORD</b> после деплоя.',
        '<b>JWT_SECRET</b> — никому не показывайте, иначе кто угодно подделает сессию.',
        '<b>VAPID_PRIVATE_KEY</b> — секретный, в публичном репо НЕ должен быть.',
        '<b>TELEGRAM_BOT_TOKEN</b> — если утёк, бот можно использовать злонамеренно. Reset через BotFather.',
        '<b>Cloudflare</b> перед Railway — даёт DDoS-защиту + SSL.',
        '<b>HTTPS only</b> — куки HttpOnly + Secure flags автоматически в production.',
        '<b>Все пароли менеджеров</b> сейчас одинаковые (<font face="Courier">qwe123!@#</font>). Это упрощает админство, но снижает security. Хотите разные — потребуется доработка.',
    ], color=COL_BAD))

    s.append(Sp(6))
    s.append(callout('🚨 Перед каждым большим релизом',
        'Скачайте бэкап БД. После деплоя — откройте /admin → "Здоровье продаж": если 🔴 — откатить через '
        'Railway Deployments → выберите предыдущую успешную → Redeploy.',
        color=COL_BAD))

    doc.build(s)


# ════════════════════════════════════════════════════════════════════════════
# 4.  ONBOARDING CHECKLIST FOR NEW MANAGER
# ════════════════════════════════════════════════════════════════════════════
def build_onboarding():
    doc = CardDoc(f'{OUT_DIR}/manager-onboarding-checklist.pdf',
                   header_title='✅ Онбординг нового менеджера', header_color=COL_OK)
    s = []
    s.append(hero_band('Чек-лист онбординга', 'Первая неделя в GoGlobal CRM', color=COL_OK))
    s.append(Sp(8))
    s.append(P('<font color="#0369a1" size="9">Заполняет: тимлид совместно с новым менеджером в первый день. '
               'Каждый пункт отмечается ☑ когда сделан. На вторую неделю — review.</font>'))
    s.append(Sp(6))

    s.append(P('📋 День 1 — учётка и доступ', H2))
    s.append(checklist([
        ('Создал учётку в /admin → "Менеджеры" → "+ Создать пользователя"', 'Тимлид. Логин латиницей.'),
        ('Дал логин менеджеру, объяснил что пароль qwe123!@#', None),
        ('Менеджер успешно вошёл в /lidy', None),
        ('Объяснил тумблер 🟢/⚪ "В сети"', 'Влияет на распределение лидов'),
        ('Включил автообновление списка (🔄)', None),
        ('Дал телефон @username в Telegram', 'Для алертов о новых лидах'),
        ('Указал Telegram-тег в карточке менеджера в админке', 'Чтобы тегало в уведомлениях'),
    ]))

    s.append(P('📚 День 1 — изучение системы', H2))
    s.append(checklist([
        ('Прошёл по всем 5 видам: Карточки / Таблица / Воронка статусов / Этапы / Календарь', None),
        ('Открыл базу знаний (📖) — почитал основные статьи', 'Тимлид должен добавить статьи заранее'),
        ('Изучил все вкладки драуера (Обзор / Сделка / Задачи / Файлы / Чат / Аудит / Связанные)', 'Откройте любой тестовый лид'),
        ('Понял разницу между статусом и этапом клиента', 'Статус — обработка ДО win. Этап — после win.'),
        ('Знает как создать задачу с дедлайном', None),
        ('Знает как создать сделку (сумма + вероятность)', None),
        ('Понял систему скоринга (❄ 🌡 🔥 🚀)', None),
    ]))

    s.append(P('🎯 День 1 — первые лиды', H2))
    s.append(checklist([
        ('Получил первый тестовый лид (тимлид создаёт вручную или через сайт)', None),
        ('Прошёл flow: открыл драуер → позвонил/написал → поменял статус', None),
        ('Загрузил тестовый файл (PDF/JPG) во вкладку Файлы', None),
        ('Использовал хотя бы один шаблон быстрого ответа (📨)', None),
        ('Добавил комментарий в чат лида', None),
    ]))

    s.append(PageBreak())

    s.append(P('🚀 День 2–3 — продвинутое', H2))
    s.append(checklist([
        ('Попробовал drag&drop карточки между колонками в Воронке', None),
        ('Понял как работают передачи (10 минут на принятие)', 'Тимлид может симулировать передачу'),
        ('Сохранил свой первый фильтр в "💾 Мои фильтры"', None),
        ('Включил режим Inbox 0 и работал в нём весь день', None),
        ('Попробовал bulk-режим (выделил 2-3 лида, изменил статус разом)', None),
        ('Установил CRM как PWA на телефон', 'Меню браузера → "Добавить на главный экран"'),
        ('Дал разрешение на push-уведомления', 'Нужны VAPID_KEY в env'),
        ('Получил первое push-уведомление о новом лиде', None),
    ]))

    s.append(P('💎 День 4–5 — практика', H2))
    s.append(checklist([
        ('Обработал минимум 10 реальных лидов', None),
        ('Закрыл минимум 2 лида (win или lost)', None),
        ('При первом lost — выбрал категорию отказа (важно для аналитики)', None),
        ('Создал минимум 3 задачи с напоминаниями', None),
        ('Использовал шаблоны хотя бы 5 раз', None),
        ('Загрузил минимум 1 документ клиента', None),
        ('Открыл "Мой день" — проверил свои метрики в конце дня', None),
    ]))

    s.append(P('🎓 Неделя 2 — Review (тимлид)', H2))
    s.append(checklist([
        ('Сгенерировал 1-on-1 отчёт по новому менеджеру в /admin', None),
        ('Обсудил его метрики: время отклика, конверсия, активность (касания)', None),
        ('Проверил нет ли зависших лидов >48ч у него', None),
        ('Дал обратную связь по работе с возражениями (если был closed_lost — почему?)', None),
        ('Поставил месячные KPI (number of won, revenue target)', None),
        ('Объяснил систему комиссии (если применимо)', None),
    ]))

    s.append(Sp(6))
    s.append(callout('🎯 Цель первого месяца',
        'Минимум <b>30 обработанных лидов</b>, конверсия <b>≥ 10%</b>, среднее время отклика <b>&lt; 1 часа</b>, '
        'SLA соблюдён <b>≥ 80%</b>. Если ниже — обсудите с тимлидом что мешает.',
        color=COL_PRIMARY))

    s.append(Sp(6))
    s.append(callout('🛟 Когда обращаться',
        '<b>К коллегам</b> — за процедурными вопросами (как заполнить документ X для Кореи?). '
        '<b>К тимлиду</b> — за сложными решениями (передавать лид? отказать? как просить предоплату?). '
        '<b>К администратору</b> — техпроблемы (не могу загрузить файл, не приходят push).',
        color=COL_TEAL))

    doc.build(s)


# Build all
build_manager_card()
build_teamlead_card()
build_admin_setup()
build_onboarding()
print("All 4 docs generated")
