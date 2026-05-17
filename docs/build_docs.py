# -*- coding: utf-8 -*-
"""
GoGlobal CRM — generate professional PDF user manual (Russian).
Covers Admin Panel (/admin) and CRM (/lidy) — all sections, buttons, behaviors.
"""
import os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, ListFlowable, ListItem, Image
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus.doctemplate import PageTemplate, BaseDocTemplate
from reportlab.platypus.frames import Frame
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

# ─── Fonts (Cyrillic-capable) ───
FONT_REG = 'C:/Windows/Fonts/arial.ttf'
FONT_BOLD = 'C:/Windows/Fonts/arialbd.ttf'
FONT_ITAL = 'C:/Windows/Fonts/ariali.ttf'
FONT_BI = 'C:/Windows/Fonts/arialbi.ttf'
pdfmetrics.registerFont(TTFont('Arial', FONT_REG))
pdfmetrics.registerFont(TTFont('Arial-Bold', FONT_BOLD))
pdfmetrics.registerFont(TTFont('Arial-Italic', FONT_ITAL))
pdfmetrics.registerFont(TTFont('Arial-BI', FONT_BI))
from reportlab.pdfbase.pdfmetrics import registerFontFamily
registerFontFamily('Arial', normal='Arial', bold='Arial-Bold', italic='Arial-Italic', boldItalic='Arial-BI')

# ─── Palette (matches the dark hi-tech CRM theme) ───
COL_PRIMARY = colors.HexColor('#0ea5e9')      # sky-500
COL_PRIMARY_DARK = colors.HexColor('#0369a1')  # sky-700
COL_ACCENT = colors.HexColor('#06b6d4')        # cyan-500
COL_DARK = colors.HexColor('#0f172a')          # slate-900
COL_DARK_EXTRA = colors.HexColor('#020617')    # slate-950
COL_TEXT = colors.HexColor('#1e293b')          # slate-800
COL_MUTED = colors.HexColor('#64748b')         # slate-500
COL_LIGHT = colors.HexColor('#f1f5f9')         # slate-100
COL_BORDER = colors.HexColor('#cbd5e1')        # slate-300
COL_OK = colors.HexColor('#10b981')            # emerald
COL_WARN = colors.HexColor('#f59e0b')          # amber
COL_BAD = colors.HexColor('#ef4444')           # rose
COL_VIOLET = colors.HexColor('#a855f7')

# ─── Styles ───
styles = getSampleStyleSheet()

title_style = ParagraphStyle('Title', parent=styles['Title'], fontName='Arial-Bold',
    fontSize=28, leading=34, alignment=TA_CENTER, textColor=COL_DARK, spaceAfter=8)
subtitle_style = ParagraphStyle('Subtitle', parent=styles['Title'], fontName='Arial',
    fontSize=14, leading=20, alignment=TA_CENTER, textColor=COL_MUTED, spaceAfter=24)
h1_style = ParagraphStyle('H1', parent=styles['Heading1'], fontName='Arial-Bold',
    fontSize=22, leading=28, textColor=COL_PRIMARY_DARK, spaceBefore=24, spaceAfter=14,
    borderPadding=(0, 0, 6, 0))
h2_style = ParagraphStyle('H2', parent=styles['Heading2'], fontName='Arial-Bold',
    fontSize=15, leading=20, textColor=COL_DARK, spaceBefore=18, spaceAfter=8)
h3_style = ParagraphStyle('H3', parent=styles['Heading3'], fontName='Arial-Bold',
    fontSize=12, leading=16, textColor=COL_PRIMARY, spaceBefore=12, spaceAfter=4)
h4_style = ParagraphStyle('H4', parent=styles['Heading4'], fontName='Arial-Bold',
    fontSize=11, leading=14, textColor=COL_TEXT, spaceBefore=8, spaceAfter=2)
body = ParagraphStyle('Body', parent=styles['BodyText'], fontName='Arial',
    fontSize=10, leading=14, textColor=COL_TEXT, alignment=TA_JUSTIFY, spaceAfter=4)
body_left = ParagraphStyle('BodyL', parent=body, alignment=TA_LEFT)
note = ParagraphStyle('Note', parent=body, fontName='Arial-Italic',
    fontSize=9, leading=12, textColor=COL_MUTED, alignment=TA_LEFT, spaceBefore=2, spaceAfter=2)
small = ParagraphStyle('Small', parent=body, fontSize=8.5, leading=11, alignment=TA_LEFT)
code = ParagraphStyle('Code', parent=body, fontName='Courier', fontSize=8.5, leading=11,
    backColor=colors.HexColor('#e0f2fe'), textColor=COL_DARK, borderColor=COL_BORDER,
    borderWidth=0.5, borderPadding=4, leftIndent=4, rightIndent=4)
toc_h1 = ParagraphStyle('TOC1', parent=body, fontName='Arial-Bold', fontSize=12, leading=18,
    textColor=COL_PRIMARY_DARK, leftIndent=0)
toc_h2 = ParagraphStyle('TOC2', parent=body, fontName='Arial', fontSize=10, leading=14,
    textColor=COL_TEXT, leftIndent=14)
toc_h3 = ParagraphStyle('TOC3', parent=body, fontName='Arial', fontSize=9, leading=12,
    textColor=COL_MUTED, leftIndent=28)

def H1(text):
    p = Paragraph(text, h1_style)
    return p
def H2(text):
    return Paragraph(text, h2_style)
def H3(text):
    return Paragraph(text, h3_style)
def H4(text):
    return Paragraph(text, h4_style)
def P(text):
    return Paragraph(text, body)
def PL(text):
    return Paragraph(text, body_left)
def N(text):
    return Paragraph('💡 <i>' + text + '</i>', note)
def Sp(h=6):
    return Spacer(1, h)

def bullet_list(items):
    return ListFlowable(
        [ListItem(Paragraph(it, body_left), leftIndent=12, bulletColor=COL_PRIMARY) for it in items],
        bulletType='bullet', leftIndent=14, bulletFontSize=8, spaceBefore=2, spaceAfter=6
    )

def chip(text, color):
    """Inline colored badge as a single-cell mini-table."""
    return Table([[Paragraph(f'<font color="white"><b>{text}</b></font>', small)]],
                 colWidths=[None], style=TableStyle([
                     ('BACKGROUND', (0, 0), (-1, -1), color),
                     ('LEFTPADDING', (0, 0), (-1, -1), 4),
                     ('RIGHTPADDING', (0, 0), (-1, -1), 4),
                     ('TOPPADDING', (0, 0), (-1, -1), 1),
                     ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                     ('ROUNDEDCORNERS', [4, 4, 4, 4]),
                 ]))

def action_table(rows):
    """Two-column table: 'Действие' / 'Что происходит'."""
    data = [[Paragraph('<b>Кнопка / поле</b>', body_left),
             Paragraph('<b>Что происходит</b>', body_left)]]
    for k, v in rows:
        data.append([Paragraph(k, body_left), Paragraph(v, body_left)])
    t = Table(data, colWidths=[5.5*cm, 11*cm], repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), COL_PRIMARY),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Arial-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.4, COL_BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8fafc')]),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    return t

def info_box(title, content, color=COL_PRIMARY):
    inner = [
        Paragraph(f'<font color="white"><b>{title}</b></font>',
                  ParagraphStyle('boxhead', fontName='Arial-Bold', fontSize=10, leading=14, textColor=colors.white)),
        Spacer(1, 4),
    ]
    if isinstance(content, str):
        inner.append(Paragraph(content, body_left))
    else:
        inner.extend(content)
    t = Table([[inner]], colWidths=[16.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f0f9ff')),
        ('LINEABOVE', (0, 0), (-1, 0), 3, color),
        ('BOX', (0, 0), (-1, -1), 0.5, COL_BORDER),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t

# ─── Custom Doc with Page Number + Header ───
class MyDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kw):
        BaseDocTemplate.__init__(self, filename, **kw)
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height,
                      id='normal', topPadding=12, bottomPadding=6)
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[frame], onPage=self._cover_page),
            PageTemplate(id='normal', frames=[frame], onPage=self._normal_page),
        ])
        self.toc_entries = []

    def _normal_page(self, canv, doc):
        canv.saveState()
        # Header bar
        canv.setFillColor(COL_DARK)
        canv.rect(0, A4[1] - 1.2*cm, A4[0], 1.2*cm, fill=1, stroke=0)
        canv.setFillColor(COL_PRIMARY)
        canv.rect(0, A4[1] - 1.25*cm, A4[0], 0.05*cm, fill=1, stroke=0)
        canv.setFont('Arial-Bold', 9)
        canv.setFillColor(colors.white)
        canv.drawString(2*cm, A4[1] - 0.75*cm, 'GoGlobal CRM — Руководство пользователя')
        canv.setFont('Arial', 8)
        canv.setFillColor(colors.HexColor('#cbd5e1'))
        canv.drawRightString(A4[0] - 2*cm, A4[1] - 0.75*cm, 'goglobal.kg')
        # Footer
        canv.setFillColor(COL_MUTED)
        canv.setFont('Arial', 8)
        canv.drawCentredString(A4[0] / 2, 1*cm, f'— стр. {doc.page} —')
        canv.setFont('Arial', 7)
        canv.drawString(2*cm, 1*cm, f'© GoGlobal Education Abroad')
        canv.drawRightString(A4[0] - 2*cm, 1*cm, 'Версия 4.0 · май 2026')
        canv.restoreState()

    def _cover_page(self, canv, doc):
        canv.saveState()
        # Full gradient-ish dark cover
        canv.setFillColor(COL_DARK_EXTRA)
        canv.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        # Diagonal accent
        canv.setFillColor(COL_PRIMARY)
        canv.rect(0, A4[1] - 4*cm, A4[0], 0.15*cm, fill=1, stroke=0)
        canv.setFillColor(COL_ACCENT)
        canv.rect(0, 4*cm, A4[0], 0.15*cm, fill=1, stroke=0)
        # Watermark
        canv.setFillColor(colors.HexColor('#1e293b'))
        canv.setFont('Arial-Bold', 200)
        canv.drawCentredString(A4[0] / 2, A4[1] / 2 - 4*cm, '⚡')
        canv.restoreState()

doc = MyDocTemplate(
    'C:/Users/ishem/Downloads/go-global---education-abroad/docs/goglobal-crm-manual.pdf',
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2*cm, bottomMargin=2*cm,
    title='GoGlobal CRM — Руководство пользователя',
    author='GoGlobal',
)

# ─── Story ───
story = []

# ═══════════════ COVER ═══════════════
cover = []
cover.append(Spacer(1, 6*cm))
cover.append(Paragraph('<font color="#38bdf8" size="48"><b>GoGlobal</b></font>',
    ParagraphStyle('cov', fontName='Arial-Bold', alignment=TA_CENTER, fontSize=48,
        textColor=COL_PRIMARY, leading=54)))
cover.append(Spacer(1, 4))
cover.append(Paragraph('<font color="#67e8f9" size="22">CRM Система</font>',
    ParagraphStyle('cov2', fontName='Arial', alignment=TA_CENTER, fontSize=22,
        textColor=COL_ACCENT, leading=28)))
cover.append(Spacer(1, 2*cm))
cover.append(Paragraph('<font color="white" size="32"><b>Руководство пользователя</b></font>',
    ParagraphStyle('cov3', fontName='Arial-Bold', alignment=TA_CENTER, fontSize=32,
        textColor=colors.white, leading=38)))
cover.append(Spacer(1, 1*cm))
cover.append(Paragraph('<font color="#94a3b8" size="14">Полная инструкция по работе с админ-панелью и CRM</font>',
    ParagraphStyle('cov4', fontName='Arial', alignment=TA_CENTER, fontSize=14,
        textColor=colors.HexColor('#94a3b8'), leading=20)))
cover.append(Spacer(1, 3*cm))
cover.append(Paragraph('<font color="#64748b" size="11">Версия 4.0   ·   май 2026</font>',
    ParagraphStyle('cov5', fontName='Arial', alignment=TA_CENTER, fontSize=11,
        textColor=COL_MUTED, leading=14)))
story.extend(cover)
story.append(PageBreak())

# ═══════════════ INTRO ═══════════════
story.append(H1('Введение'))
story.append(P('Документ описывает полный функционал системы <b>GoGlobal CRM</b>, '
    'предназначенной для управления заявками клиентов на обучение за рубежом. '
    'Система состоит из двух интерфейсов:'))
story.append(bullet_list([
    '<b>/admin</b> — панель администратора (тимлид, владелец): настройка системы, аналитика, автоматизации, контент сайта.',
    '<b>/lidy</b> — рабочее место менеджера по продажам: обработка лидов, ведение клиентов, задачи, шаблоны ответов.',
    '<b>/</b> (публичный сайт) — лендинг с формой заявки и калькулятором стоимости.',
]))
story.append(Sp(8))
story.append(info_box('🔑 Базовая информация',
    'Адрес: <b>https://goglobal.kg</b>. Пароль администратора устанавливается через '
    'переменные окружения <font face="Courier">ADMIN_PASSWORD</font> в Railway. '
    'Пароль всех менеджеров: <b>qwe123!@#</b>. Логин — индивидуальный для каждого менеджера.',
    color=COL_OK
))
story.append(Sp(8))
story.append(H2('Роли пользователей'))
story.append(action_table([
    ('🛡️ <b>Администратор</b>', 'Полный доступ ко всем настройкам, аналитике, контенту сайта, автоматизациям. Входит в /admin по паролю.'),
    ('👑 <b>Тимлид</b>', 'Менеджер с расширенными правами: видит ВСЕ лиды в /lidy, может удалять, переназначать, видит roster и общую статистику.'),
    ('👨‍💼 <b>Менеджер</b>', 'Базовая роль продавца. Видит только свои лиды, обрабатывает их, создаёт задачи, ведёт чат с клиентом.'),
    ('🤝 <b>Партнёр</b>', 'Внешний агент. Может только создавать новые лиды и видеть свои. Используется для агрегаторов.'),
]))
story.append(PageBreak())

# ═══════════════ PART 1: ADMIN PANEL ═══════════════
story.append(Paragraph('<font color="#0369a1" size="36"><b>ЧАСТЬ I</b></font>',
    ParagraphStyle('p1', fontName='Arial-Bold', alignment=TA_CENTER, fontSize=36,
        textColor=COL_PRIMARY_DARK, leading=42, spaceBefore=6*cm)))
story.append(Spacer(1, 1*cm))
story.append(Paragraph('<font color="#0f172a" size="28"><b>Админ-панель /admin</b></font>',
    ParagraphStyle('p1b', fontName='Arial-Bold', alignment=TA_CENTER, fontSize=28,
        textColor=COL_DARK, leading=34)))
story.append(Spacer(1, 1*cm))
story.append(Paragraph('Настройка системы, аналитика, контент сайта',
    ParagraphStyle('p1c', fontName='Arial-Italic', alignment=TA_CENTER, fontSize=14,
        textColor=COL_MUTED, leading=18)))
story.append(PageBreak())

story.append(H1('1. Вход в админ-панель'))
story.append(P('Откройте в браузере: <font face="Courier"><b>https://goglobal.kg/admin</b></font>. '
    'Появится экран входа с одним полем «Пароль».'))
story.append(H3('Экран авторизации'))
story.append(action_table([
    ('Поле «Пароль»', 'Введите значение из переменной окружения <font face="Courier">ADMIN_PASSWORD</font> (по умолчанию <font face="Courier">admin123</font>, но рекомендуется сменить через Railway → Variables).'),
    ('Кнопка «→ ВОЙТИ»', 'Проверяет пароль на сервере. При успехе показывает основной интерфейс. При ошибке — поле подсвечивается, экран не меняется.'),
]))
story.append(N('После входа пароль сохраняется в браузере (sessionStorage). Закрытие вкладки не разлогинит, но очистка кеша — да.'))

story.append(H1('2. Шапка панели'))
story.append(P('Зафиксирована сверху. Содержит:'))
story.append(action_table([
    ('⚙️ ADMIN_PANEL', 'Просто заголовок (визуальный, не кликабелен). Градиент sky → cyan.'),
    ('✓ SAVED индикатор', 'Появляется после успешного сохранения (зелёный пульсирующий кружок). Виден ~3 секунды.'),
    ('💾 СОХРАНИТЬ', 'Сохраняет ВСЕ изменения сайта (видимость блоков, контент, события, контакты). Шлёт POST на /api/admin/site-config. Не сохраняет автоматически — обязательно нажимайте после изменений!'),
]))
story.append(info_box('⚠️ Важно',
    'Кнопка «СОХРАНИТЬ» сохраняет только настройки сайта (визуальные секции, контент). '
    'Изменения в подразделах CRM (менеджеры, статусы, метки, шаблоны, аудит) сохраняются автоматически — каждое нажатие «✓» или «+ Добавить».'
))
story.append(PageBreak())

# ─── Sections ───
story.append(H1('3. Разделы CRM-аналитики'))
story.append(P('Все секции открываются по клику на заголовок (стрелка ▾ → ▴). По умолчанию некоторые открыты для быстрого доступа.'))

# 3.1 Здоровье продаж
story.append(H2('3.1. 🚦 Здоровье продаж'))
story.append(N('Открыт по умолчанию. Цель: за 2 секунды понять, всё ли в порядке.'))
story.append(P('<b>Визуально:</b> большая плашка-светофор: 🟢 «ВСЁ В ПОРЯДКЕ» / 🟡 «ЕСТЬ ВОПРОСЫ» / 🔴 «СРОЧНО».'))
story.append(P('<b>Когда показывается 🟢:</b> SLA ≥ 80%, конверсия ≥ 15%, нет критичных нарушений.'))
story.append(P('<b>Когда 🟡:</b> SLA 60–80% или конверсия 10–15%.'))
story.append(P('<b>Когда 🔴:</b> SLA &lt; 60%, конверсия &lt; 10%, либо более 5 просроченных открытых лидов.'))
story.append(Sp(4))
story.append(H3('Метрики на плашке'))
story.append(action_table([
    ('SLA %', 'Доля закрытых лидов с соблюдением дедлайна. Норма ≥ 80%. "—" если данных нет.'),
    ('Конверсия %', 'Won / (Won + Lost). Норма ≥ 15%.'),
    ('Просрочено', 'Количество ОТКРЫТЫХ лидов с истёкшим SLA. Должно быть 0.'),
    ('Застряли > 14 дней', 'Открытые лиды, по которым ничего не делается две недели.'),
]))
story.append(P('<b>Список оффлайн-менеджеров:</b> если кто-то не заходил в систему более 2 часов — появится строка с именем и временем последнего захода.'))

# 3.2 Дашборд CRM
story.append(H2('3.2. 📈 Дашборд CRM'))
story.append(N('Открыт по умолчанию.'))
story.append(P('Центральная аналитическая страница: общая статистика лидов за выбранный период.'))
story.append(H3('Селектор окна'))
story.append(action_table([
    ('Кнопки 7/30/90/180 дней', 'Меняет окно анализа. Применяется ко всем графикам ниже моментально.'),
    ('Кнопка ↻', 'Принудительно перезагружает данные.'),
]))
story.append(H3('KPI-плитки'))
story.append(P('<b>Всего лидов</b>, <b>Открытых</b>, <b>Закрыто (won)</b>, <b>SLA соблюдён</b> — последняя цветная по уровню (зелёная ≥ 80%, янтарная ≥ 60%, красная иначе).'))
story.append(H3('💰 Sales Forecast'))
story.append(P('Тёмная градиентная панель с 4 показателями:'))
story.append(action_table([
    ('Pipeline', 'Сумма deal_value всех открытых сделок. Бюджет «в работе».'),
    ('Взвешенный прогноз', 'Pipeline × вероятность каждой сделки. Реалистичный ожидаемый доход.'),
    ('Закрыто (won) MTD', 'Сумма deal_value won-сделок с начала текущего месяца.'),
    ('Конверсия', '% won из закрытых сделок.'),
]))
story.append(H3('🪜 Воронка обработки лидов'))
story.append(P('SVG-диаграмма: каждый статус — горизонтальная полоса шириной пропорционально числу лидов. Самый узкий = бутылочное горлышко.'))
story.append(H3('🎓 Этапы клиентов (post-win)'))
story.append(P('Стрипсетка: контракт → оплата_1 → документы → языковой_экзамен → собеседование → зачисление → виза → финальная_оплата → отъезд. Видно где «застряли» успешно подписанные клиенты.'))
story.append(H3('👥 Нагрузка менеджеров'))
story.append(P('Горизонтальные стек-бары: каждому менеджеру — стек из 3 цветов: 🟡 открыто, 🟢 won, 🔴 lost. Сразу видно перегружен ли кто.'))
story.append(P('Справа от имени — pipeline $ менеджера и количество просроченных SLA (если есть).'))
story.append(H3('Линейные графики по дням'))
story.append(P('Барчарт лидов за каждый день в окне. Hover на столбце показывает точную дату и счётчик.'))
story.append(H3('🍩 Donut по статусам'))
story.append(P('Кольцевая диаграмма распределения лидов по статусам. Легенда справа.'))
story.append(H3('📡 По источникам, 🌍 По странам, 🎓 По университетам, 📚 По уровням, 🎟 По событиям'))
story.append(P('Серии горизонтальных bar-чартов / таблиц. Кликов нет — это readonly виджеты.'))
story.append(H3('Экспорт Excel'))
story.append(action_table([
    ('Поля «с» / «по»', 'Опциональные даты. Пустые = выгрузить всё.'),
    ('Кнопка «📊 Скачать Excel (.xlsx)»', 'Формирует и скачивает многолистовой xlsx: Все лиды + сводки по статусам, источникам, странам, менеджерам.'),
]))
story.append(PageBreak())

# 3.3 Leaderboard
story.append(H2('3.3. 🏆 Leaderboard менеджеров'))
story.append(P('Рейтинг сотрудников за выбранный период. Сортировка по выручке (revenue).'))
story.append(action_table([
    ('Кнопки 7/30/90 дней', 'Меняет окно расчёта.'),
    ('Колонка #', 'Место в рейтинге: 🥇/🥈/🥉 для топ-3, дальше числами.'),
    ('Обработано', 'Сколько лидов было закреплено за менеджером в окне.'),
    ('Won', 'Сколько успешно закрыты.'),
    ('Выручка', 'Сумма deal_value won-сделок.'),
    ('Касаний', 'Сколько раз менеджер кликал WhatsApp/Call/Email кнопки в карточках.'),
    ('Avg score', 'Средний скоринг открытых лидов менеджера.'),
    ('Ср. отклик (мин)', 'Среднее время от поступления лида до первого ответа менеджера.'),
]))

# 3.4 1-on-1
story.append(H2('3.4. 📋 1-on-1 отчёт по менеджеру'))
story.append(P('Авто-генерация еженедельного отчёта для встречи тимлида с менеджером.'))
story.append(action_table([
    ('Селектор «Выберите менеджера»', 'Выпадающий список всех manager + teamlead. Партнёры исключены.'),
    ('Карточка после выбора', 'Автоматически загружается отчёт с 4 KPI-плитками: Лиды за неделю (с дельтой ↑/↓ к прошлой), Won, Выручка, Avg отклик.'),
    ('Топ-5 лидов в работе', 'Список самых перспективных лидов менеджера (по score + deal_value).'),
    ('Зависли > 48 ч', 'Лиды, которые слишком долго в текущем статусе. Подсказка тимлиду «спросить про эти».'),
    ('Касания за неделю', 'Чипы каналов с количеством: whatsapp:5, call:3, email:1 и т.п.'),
]))

# 3.5 Time-in-stage
story.append(H2('3.5. ⏱ Время в статусах + зависшие лиды'))
story.append(P('Аналитика «где прокрастинируют лиды»: для каждого статуса считается среднее и максимальное время нахождения.'))
story.append(action_table([
    ('Окно 7/30/90 дней', 'Период расчёта.'),
    ('Среднее время в статусе', 'Горизонтальные бары с цветом статуса. Чем шире — тем дольше в среднем застревают лиды в этом статусе.'),
    ('avg / max / n', 'avg — среднее в часах, max — самый «застрявший» лид, n — число замеров.'),
    ('🐌 Зависшие лиды > 72 ч', 'Список (макс 50) лидов, которые более 3 суток в текущем статусе. Цвет статуса, имя менеджера, часы.'),
]))

# 3.6 Response time
story.append(H2('3.6. ⏲ Скорость отклика менеджеров'))
story.append(P('Перцентильная статистика: насколько быстро отвечает каждый.'))
story.append(action_table([
    ('Окно 7/30/90 дней', 'Период.'),
    ('Замеров', 'Количество лидов с зафиксированным первым ответом.'),
    ('Median (P50)', '50% лидов ответ был быстрее этого. Цвет: 🟢 &lt; 30мин, 🟡 &lt; 2ч, 🔴 ≥ 2ч.'),
    ('P90', '90-й перцентиль — «тяжёлый хвост». Если P50 хороший, а P90 плохой — есть редкие, но критичные задержки.'),
    ('Avg', 'Простое среднее.'),
]))
story.append(N('Первый ответ фиксируется автоматически: при добавлении комментария, изменении статуса, или клике WhatsApp/Call/Email.'))

# 3.7 Heatmap
story.append(H2('3.7. 🌡 Heatmap входящих лидов'))
story.append(P('7×24 матрица: день недели × час. Цвет ячейки — интенсивность приходящих лидов в этот слот (по местному времени Бишкека).'))
story.append(P('<b>Применение:</b> определить часы пик. Если пик в 19:00–22:00, а менеджеры заканчивают в 18:00 — нанять вечернюю смену.'))
story.append(P('Hover над ячейкой показывает точное количество.'))

# 3.8 Churn
story.append(H2('3.8. 🚪 Анализ отказов (churn)'))
story.append(P('Распределение закрытых-проигранных сделок по категориям.'))
story.append(action_table([
    ('Окно 30/90/180 дней', 'Период.'),
    ('Заголовок справа', 'Итого отказов + общая потерянная сумма.'),
    ('Список причин', 'Каждая — название, доля % + сумма потерянной выручки. Бар-индикатор пропорционально доле.'),
]))
story.append(N('Если 60% отказов — «Слишком дорого», задумайтесь о пересмотре прайсов или о работе с возражениями.'))

# 3.9 Cohort
story.append(H2('3.9. 📆 Когортный анализ'))
story.append(P('Таблица «когорта (месяц поступления) × сколько закрыто в 30/60/90 дней».'))
story.append(P('<b>Что видно:</b> сезонность (январские лиды конвертятся быстрее майских?), скорость закрытия (большинство won — в первый месяц или растягивается?).'))
story.append(action_table([
    ('Кнопки 3/6/12 мес', 'Глубина истории.'),
    ('Колонки Won в 30 / 60 / 90', 'Кумулятивно сколько won из этой когорты закрылось в первые N дней.'),
    ('Конв. %', 'Won / total с цветом: 🟢 ≥ 15%, 🟡 ≥ 10%, 🔴 иначе.'),
    ('$$$', 'Суммарная выручка по когорте.'),
]))

# 3.10 ROI
story.append(H2('3.10. 💸 ROI по источникам'))
story.append(P('Окупаемость рекламных каналов. Считает: spend = total × cost_per_lead, revenue = сумма won, ROI = revenue / spend.'))
story.append(action_table([
    ('Колонка CPL $', 'Cost per Lead. Inline-редактируется — кнопка «✎ цена» рядом → вводите значение → «✓» сохраняет.'),
    ('Колонка Бюджет $', 'Месячный бюджет источника, тоже inline.'),
    ('Кнопка «✎ цена»', 'Превращает строки CPL и Бюджет в поля ввода. ✓ — сохранить, × — отменить.'),
    ('Колонка ROI', 'revenue/spend. Цвет: 🟢 ≥ 3x, 🟡 ≥ 1x, 🔴 &lt; 1x (убыток).'),
]))
story.append(PageBreak())

# ═══ CRM OPERATIONS ═══
story.append(H1('4. Управление CRM'))

# 4.1 Managers
story.append(H2('4.1. 🧑‍💼 Менеджеры по продажам'))
story.append(P('CRUD сотрудников.'))
story.append(action_table([
    ('Список менеджеров', 'Карточки: имя, логин, роль (👑 теамлид / 👨‍💼 manager / 🤝 партнёр), 🟢/⚪ статус онлайн, кол-во назначенных лидов (за 30д / всего открытых).'),
    ('Поле Имя / Логин', 'Базовые данные. Логин используется при входе в /lidy.'),
    ('Telegram-тег', 'Опционально. Если задан — в Telegram-уведомлениях о новых лидах будет упоминание @username.'),
    ('Роль', 'manager / teamlead / partner. Меняйте через выпадающий список.'),
    ('Чекбокс «Активен»', 'Снять = менеджер не получает новых лидов, но может войти.'),
    ('Кнопка «🗓 Часы»', 'Открывает редактор рабочего расписания (7 дней × 24 часа). Цветная сетка: кликом меняете доступность по часу.'),
    ('Кнопка «🗑»', 'Архивирует менеджера. Лиды переназначаются другим. Архивный менеджер виден в истории, но не получает новых лидов.'),
    ('+ Создать пользователя', 'Создаёт нового сотрудника. Пароль автоматически: qwe123!@#.'),
]))
story.append(info_box('🔒 Пароли',
    'По умолчанию пароль ВСЕХ менеджеров = <font face="Courier">qwe123!@#</font>. Это устанавливается автоматически при старте сервера. Менеджер не может сменить пароль сам — это сделано для упрощения администрирования. Если нужны разные пароли — потребуется доработка.',
    color=COL_WARN
))

# 4.2 Routing
story.append(H2('4.2. 🤖 Авто-распределение лидов'))
story.append(P('Правила: «если лид с таким-то признаком → отдать менеджеру X». Применяются ПЕРЕД round-robin.'))
story.append(action_table([
    ('Список правил', 'Каждое правило: приоритет, фильтры (страна / источник / уровень программы / минимальный английский), целевой менеджер.'),
    ('Поле «Приоритет»', 'Число. Меньше = выше приоритет. Срабатывает ПЕРВОЕ подходящее правило.'),
    ('Поле «Страна»', 'Точное совпадение (например: Япония). Регистр игнорируется.'),
    ('Поле «Источник»', 'Например: Instagram, WhatsApp, Сайт.'),
    ('Поле «Уровень программы»', 'Бакалавриат / Магистратура / PhD и т.д.'),
    ('Поле «Мин. английский»', 'CEFR-уровень: A1, A2, B1, B2, C1, C2. Лид без указанного английского НЕ подойдёт под правило с этим фильтром.'),
    ('Целевой менеджер', 'Тот, кому отдать. Должен быть онлайн на момент создания лида — иначе фолбэк на round-robin.'),
    ('+ Добавить правило', 'Сохраняет. Сразу применяется к новым лидам.'),
]))
story.append(N('Если ни одно правило не подошло (или менеджер оффлайн) — система использует обычное распределение по очереди.'))

# 4.3 Statuses
story.append(H2('4.3. 🎯 Статусы лидов'))
story.append(P('Управление воронкой. Два типа статусов: <b>обработка лида</b> (new → in_progress → ...) и <b>этап клиента</b> (после контракта: payment_1 → documents → ...).'))
story.append(action_table([
    ('Список статусов', 'Каждый: код, название, цвет, флаги (терминальный, требует встречу, требует причину, этап клиента).'),
    ('Цветной квадратик', 'Открывает colour picker. Цвет применяется к бэйджам в карточках лидов.'),
    ('Поле «Сортировка»', 'Порядок в воронке. Меньше = левее в Pipeline-view.'),
    ('☑ is_terminal', 'Закрывает лид (заполняет processed_at). Должно быть включено у closed_won, closed_lost.'),
    ('☑ requires_appointment', 'При выборе этого статуса менеджер обязан указать дату встречи.'),
    ('☑ requires_reason', 'Менеджер обязан указать причину (например, при closed_lost).'),
    ('☑ is_client_stage', 'Статус для post-win пайплайна (контракт подписан). Эти статусы НЕ показываются в обычной воронке.'),
    ('🗑', 'Удаление статуса. Если есть лиды в этом статусе — удалить нельзя.'),
]))

# 4.4 Tags
story.append(H2('4.4. 🏷 Метки клиентов'))
story.append(P('Цветные ярлыки для категоризации лидов (горячий, VIP, грант и т.д.).'))
story.append(action_table([
    ('Список меток', 'Каждая — пилюля с цветом, эмодзи, названием. Цифра справа — сколько лидов используют.'),
    ('Поле «Название»', 'Текст метки.'),
    ('Поле «Эмодзи»', 'Опционально (⭐, 🔥, ❄ и т.п.). Можно копировать из emojipedia.'),
    ('Цветной picker + палитра', '12 предустановленных цветов или свой через picker.'),
    ('+ Добавить', 'Создаёт метку. Сразу доступна менеджерам в драуере лида.'),
    ('Кнопка «Удалить»', 'Снимает метку со всех лидов и удаляет её.'),
]))

# 4.5 Quick replies
story.append(H2('4.5. 📨 Шаблоны быстрых ответов'))
story.append(P('Готовые сообщения для менеджеров. Доступны в драуере лида по кнопке «📨 Шаблон ▾».'))
story.append(action_table([
    ('Список шаблонов', 'Название + текст. Канал (whatsapp/telegram/email/sms) и сортировка.'),
    ('Плейсхолдеры', '<font face="Courier">{manager}</font> — имя менеджера; <font face="Courier">{name}</font> — имя клиента; <font face="Courier">{amount}</font> — сумма (пустая, заполняется руками).'),
    ('Сортировка', 'Меньше = выше в списке у менеджера.'),
    ('Канал', 'Влияет только на иконку. Whatsapp кнопка всегда откроет WhatsApp; для остальных — копирование в буфер.'),
    ('+ Создать', 'Добавляет новый шаблон.'),
    ('✎', 'Редактирует существующий.'),
    ('🗑', 'Удаляет.'),
]))

# 4.6 Automations
story.append(H2('4.6. 🤖 Авто-сценарии (no-code)'))
story.append(P('Правила автоматизации. Cron каждую минуту проверяет условия и выполняет действия.'))
story.append(P('<b>Структура правила:</b> Имя + Триггер (КОГДА) + Действие (ТОГДА).'))
story.append(H3('Триггеры'))
story.append(action_table([
    ('Лид завис в статусе', 'Срабатывает когда лид находится в указанном статусе дольше X часов. Параметры: статус + часы.'),
    ('Нет первого ответа', 'Срабатывает когда менеджер не ответил в течение X часов после поступления лида.'),
]))
story.append(H3('Действия'))
story.append(action_table([
    ('Создать задачу', 'Ставит задачу менеджеру лида. Параметры: текст + дедлайн (часы от срабатывания).'),
    ('Уведомить тимлида', 'Шлёт Telegram с указанным текстом + номером лида.'),
    ('Поставить метку', 'Прикрепляет указанную метку (по ID).'),
    ('Сменить статус', 'Меняет статус лида автоматически.'),
]))
story.append(P('<b>Анти-дубликат:</b> каждое правило срабатывает по конкретному лиду только 1 раз (хранится в automation_fires).'))
story.append(P('<b>Поле «сработало»:</b> счётчик показывает сколько раз правило срабатывало всего.'))

# 4.7 Churn reasons
story.append(H2('4.7. 🚪 Причины отказов'))
story.append(P('Категории для статуса closed_lost. Менеджер выбирает в карточке лида одной кнопкой.'))
story.append(action_table([
    ('Поля Название / Emoji / Цвет / Sort', 'Аналогично меткам.'),
    ('+ Добавить', 'Создаёт причину. Сразу доступна в драуере при закрытии лида.'),
]))
story.append(N('Дефолтные причины: Слишком дорого, Передумал учиться, Выбрал конкурента, Сменил страну, Семейные обстоятельства, Не прошёл, Не отвечает, Другая.'))

# 4.8 KB
story.append(H2('4.8. 📖 База знаний'))
story.append(P('Wiki-статьи для менеджеров. Они открываются по кнопке «📖» в шапке CRM.'))
story.append(action_table([
    ('Поле «slug»', 'Латинский идентификатор (например: japan-visa-procedure). Используется в URL.'),
    ('Поле «Заголовок»', 'Кириллица + любые символы.'),
    ('Поле «Теги через запятую»', 'visa, japan, documents — используются для поиска и фильтрации.'),
    ('Поле «Текст статьи»', 'Markdown (с поддержкой переносов строк, ссылок, базового форматирования).'),
    ('✎', 'Редактирование. Поля заполняются из выбранной статьи.'),
    ('+ Создать', 'Сохраняет новую статью.'),
    ('🗑', 'Удаление.'),
]))

# 4.9 Commission
story.append(H2('4.9. 💵 Комиссии и выплаты'))
story.append(P('Расчёт бонусов менеджеров. Поддержка глобальных и персональных правил.'))
story.append(H3('Правила комиссии'))
story.append(action_table([
    ('Scope «Global»', 'Применяется ко всем менеджерам без персонального правила.'),
    ('Scope «Per manager»', 'Только для выбранного менеджера. Перекрывает global.'),
    ('Поле «%»', 'Процент от deal_value won-сделок.'),
    ('Поле «Мин $»', 'Минимальная сумма сделки для начисления (например, мелкие win не считать).'),
    ('+ Добавить', 'Сохраняет правило.'),
]))
story.append(H3('Начисления за период'))
story.append(P('Таблица: менеджер, % правила, число won, выручка, сумма к выплате.'))
story.append(P('Внизу — <b>«Итого к выплате»</b> по всей команде.'))
story.append(action_table([
    ('Кнопки 7/30/90 дней', 'Окно расчёта.'),
]))

# 4.10 Audit
story.append(H2('4.10. 🕒 Журнал аудита'))
story.append(P('Лог всех изменений в системе.'))
story.append(action_table([
    ('Фильтр «Тип»', 'Всё / Лиды / Файлы / Задачи. Меняет показ.'),
    ('Строка', 'Дата · Кто (имя, 👑 если тимлид) · Действие · #entity_id'),
    ('Детали', 'Кнопка «детали» раскрывает JSON-объект (before/after).'),
]))
story.append(N('Какие действия логируются: смена статуса, смена этапа, передача лида, переназначение, удаление лида, загрузка/удаление файла, bulk-операции, срабатывание автоматизаций, попытки дедупликации.'))

# 4.11 Utils
story.append(H2('4.11. 🛠 Утилиты и бэкапы'))
story.append(action_table([
    ('💾 Скачать полный дамп', 'JSON с содержимым всех 14+ таблиц БД (лиды, менеджеры, статусы, теги, файлы, задачи, audit, automations, ...). Используйте для миграции/резервной копии.'),
    ('Поле «Страна» в шаринге', 'Код страны (например: japan). Должен совпадать с id страны на сайте.'),
    ('Чекбокс «Грант»', 'Если активен — ссылка предзаполнит грант=on в калькуляторе.'),
    ('Поле с URL', 'Сгенерированная ссылка вида <font face="Courier">https://goglobal.kg/#calculator?country=japan&scholarship=1</font>'),
    ('📋 Копировать', 'Кладёт ссылку в буфер обмена.'),
]))
story.append(N('Шаринг-ссылка калькулятора — отправляете клиенту в WhatsApp, у него открывается калькулятор с уже выбранной страной.'))

# 4.12 All leads view
story.append(H2('4.12. 📋 Все лиды (обзор)'))
story.append(P('Альтернативный список лидов с админ-правами (видит ВСЕ, включая закрытые).'))
story.append(action_table([
    ('Большая таблица', 'ID, дата, имя, контакты, статус, источник, страна, ВУЗ, менеджер, SLA, действия.'),
    ('Сортировка', 'Кликами по заголовкам колонок.'),
    ('Кнопка «Удалить»', 'Только для administrator. С подтверждением.'),
    ('Кнопка «Открыть в /lidy»', 'Прыгает в CRM-драуер этого лида.'),
]))
story.append(PageBreak())

# ═══ SITE CONTENT ═══
story.append(H1('5. Контент сайта'))

story.append(H2('5.1. 📊 Статистика посещений'))
story.append(P('Аналитика публичного сайта (без админки).'))
story.append(action_table([
    ('Линейный график', 'Уникальные посетители по дням.'),
    ('Источники переходов', 'Топ-10 referrer-доменов.'),
    ('География', 'Страны посетителей.'),
    ('Устройства', 'Desktop / mobile / tablet.'),
]))

story.append(H2('5.2. 👁 Видимость блоков сайта'))
story.append(P('Тумблеры включают/скрывают целые секции лендинга:'))
story.append(action_table([
    ('Hero', 'Первый экран с заголовком и кнопкой CTA.'),
    ('О нас', 'About-секция.'),
    ('Направления', 'Карта мира + страны.'),
    ('Калькулятор стоимости', 'Интерактивный CostCalculator. Если выключен — share-ссылка работать не будет.'),
    ('Отзывы', 'Истории студентов.'),
    ('FAQ', 'Аккордеон с вопросами.'),
    ('Контактная форма', 'Финальная форма заявки внизу.'),
]))
story.append(info_box('💾 Не забыть',
    'После переключения тумблеров обязательно нажмите «💾 СОХРАНИТЬ» в шапке. Иначе изменения не применятся!',
    color=COL_WARN
))

story.append(H2('5.3. 🔗 Ссылка на форму заявки'))
story.append(P('Универсальный URL для рассылки. Можно прислать клиенту через любой мессенджер. Открывается напрямую к контактной форме.'))

story.append(H2('5.4. 🎯 Варианты источников лидов'))
story.append(P('Что клиент выбирает в форме «Откуда вы о нас узнали?». Управляется списком: «+» добавить, «×» удалить.'))
story.append(P('<b>Эти значения попадают в поле <font face="Courier">source</font> лида</b> — потом используются в дашборде и ROI-аналитике.'))

story.append(H2('5.5. 🎟 События (events)'))
story.append(P('Образовательные ярмарки, дни открытых дверей. Каждое событие — отдельная страница на сайте.'))
story.append(action_table([
    ('Поле «slug»', 'URL-идентификатор (япония-ярмарка-март-2026).'),
    ('Поле «Название»', 'Заголовок.'),
    ('Поле «Дата»', 'Когда проходит.'),
    ('Поле «Описание»', 'Markdown.'),
    ('Поле «Локация»', 'Где (адрес офиса или Zoom-ссылка).'),
    ('Изображение', 'Hero-картинка. Загружается через ImageInput компонент.'),
    ('☑ Активно', 'Если выключено — событие скрыто с сайта.'),
    ('+ Создать событие', 'Сохраняет.'),
]))
story.append(N('Лиды, заполнившие форму на странице события, получают пометку event_id и event_name_snapshot.'))

story.append(H2('5.6. ☎️ Контактная информация'))
story.append(P('Адрес, телефоны, email, мессенджеры компании. Используются в footer и contact-секциях сайта.'))

story.append(H2('5.7. 🧮 Конфигурация калькулятора'))
story.append(P('Настройка виджета на лендинге.'))
story.append(action_table([
    ('Заголовок / Подзаголовок', 'Тексты над калькулятором.'),
    ('Чек-лист включений', '«Включает проживание», «Включает страховку» и т.д. Массив строк — «+» добавить, «×» убрать.'),
    ('Disclaimer', 'Дисклеймер под суммой (мелким шрифтом).'),
    ('Стоимость услуг', 'Глобальная цена услуг GoGlobal. Прибавляется к расчёту (если у страны/вуза не задано своё).'),
    ('Метка «Грант»', 'Текст тумблера. По умолчанию: «Рассматриваю гранты / Бюджет».'),
    ('Подсказка под меткой', 'Текст-объяснение.'),
]))

story.append(PageBreak())

# ═══════════════ PART 2: CRM ═══════════════
story.append(Paragraph('<font color="#0369a1" size="36"><b>ЧАСТЬ II</b></font>',
    ParagraphStyle('p2', fontName='Arial-Bold', alignment=TA_CENTER, fontSize=36,
        textColor=COL_PRIMARY_DARK, leading=42, spaceBefore=6*cm)))
story.append(Spacer(1, 1*cm))
story.append(Paragraph('<font color="#0f172a" size="28"><b>CRM /lidy</b></font>',
    ParagraphStyle('p2b', fontName='Arial-Bold', alignment=TA_CENTER, fontSize=28,
        textColor=COL_DARK, leading=34)))
story.append(Spacer(1, 1*cm))
story.append(Paragraph('Рабочее место менеджера по продажам',
    ParagraphStyle('p2c', fontName='Arial-Italic', alignment=TA_CENTER, fontSize=14,
        textColor=COL_MUTED, leading=18)))
story.append(PageBreak())

story.append(H1('6. Вход в CRM'))
story.append(P('URL: <font face="Courier"><b>https://goglobal.kg/lidy</b></font>'))
story.append(H3('Экран авторизации'))
story.append(action_table([
    ('Поле «Логин»', 'Индивидуальный логин менеджера (создаётся администратором в админке).'),
    ('Поле «Пароль»', 'qwe123!@# — общий для всех пользователей (см. примечание).'),
    ('Кнопка «Войти»', 'Авторизует. При успехе — переходит на главную CRM.'),
]))
story.append(info_box('🔐 Безопасность',
    'Сессия хранится в HttpOnly cookie. Срок действия — 30 дней. После закрытия браузера не разлогинит.',
    color=COL_OK
))

story.append(H1('7. Главная страница CRM'))
story.append(P('Состоит из 4 зон:'))
story.append(bullet_list([
    '<b>Шапка</b> — сверху, всегда видна.',
    '<b>Сайдбар с фильтрами</b> — слева, сворачиваемый.',
    '<b>Виджет «Мой день» + KPI</b> — наверху основной области.',
    '<b>Список лидов</b> — в выбранном представлении (карточки / таблица / pipeline / stages / календарь).',
]))

# 7.1 Top bar
story.append(H2('7.1. Шапка CRM'))
story.append(action_table([
    ('☰ Меню', 'Сворачивает/разворачивает сайдбар. Положение запоминается в localStorage.'),
    ('Логотип «CRM»', 'Сейчас просто бейдж. Не кликается.'),
    ('Имя менеджера', 'Под логотипом. С пометкой «· тимлид» если роль teamlead.'),
    ('🔍 Поиск', 'По имени, телефону, email, ВУЗу, комментарию. Debounce 300мс. Cерверный поиск (не клиентский фильтр).'),
    ('×', 'Очищает поиск.'),
    ('🟢 «В сети» / ⚪ «Не в сети»', 'Тумблер онлайн-статуса. <b>Важно:</b> когда «Не в сети» — новые лиды НЕ распределяются на вас. Используйте на обед/перерыв.'),
    ('🔄 Auto-refresh', 'Если включён — каждые 15 секунд обновляет список. Иконка крутится.'),
    ('↻ Refresh', 'Принудительное обновление сейчас.'),
    ('📖 База знаний', 'Открывает модал с wiki-статьями.'),
    ('+ Лид', 'Открывает форму создания нового лида вручную.'),
    ('Выйти', 'Разлогинивает.'),
]))

# 7.2 Sidebar
story.append(H2('7.2. Боковая панель фильтров'))
story.append(H3('Просмотр (только для тимлидов)'))
story.append(action_table([
    ('Все', 'Все лиды компании.'),
    ('Мои', 'Только закреплённые за вошедшим тимлидом.'),
]))

story.append(H3('💾 Мои фильтры'))
story.append(P('Сохранённые наборы фильтров.'))
story.append(action_table([
    ('«+ Сохранить»', 'Спрашивает имя → сохраняет текущее состояние всех фильтров. Видно только вам.'),
    ('Кнопка с названием пресета', 'Применяет — все фильтры моментально подставляются.'),
    ('×', 'Удаляет пресет.'),
]))

story.append(H3('Быстрые фильтры'))
story.append(action_table([
    ('📥 Inbox 0', 'Показывает только ВАШИ открытые лиды, требующие действий: просроченные SLA, новые без ответа, или с открытыми задачами.'),
    ('⏰ Просроченные', 'Только лиды с истёкшим SLA.'),
    ('📂 Показать закрытые', 'Включает в список лиды со статусом closed_won / closed_lost (по умолчанию скрыты).'),
    ('☑️ Массовые действия', 'Включает bulk-режим: на карточках появляются чекбоксы; внизу — плавающая панель действий.'),
]))

story.append(H3('Точечные фильтры (выпадающие списки)'))
story.append(action_table([
    ('Статус', 'Один статус из воронки.'),
    ('Источник', 'Один из вариантов формы.'),
    ('Страна', 'Из присутствующих в текущей выборке.'),
    ('Университет', 'Текстовый поиск по частичному совпадению.'),
    ('Уровень программы', 'Бакалавриат / Магистратура / PhD / Foundation / Языковые курсы / Среднее.'),
    ('Менеджер (только тимлид + scope=all)', 'Любой из списка.'),
    ('Дата с / по', 'Диапазон поступления лидов.'),
    ('Сбросить фильтры', 'Снимает все.'),
]))

story.append(PageBreak())

# 7.3 KPI tiles
story.append(H2('7.3. KPI-плитки наверху'))
story.append(action_table([
    ('Всего', 'Найдено лидов в текущей выборке.'),
    ('Открытых', 'Не обработанных (processed_at IS NULL).'),
    ('Просрочено', 'С истёкшим SLA. Красная плашка если > 0.'),
    ('В очереди', 'Без назначенного менеджера.'),
    ('Передачи мне', 'Лиды, которые другие менеджеры передают вам (требуют принятия). Розовая пульсирующая плашка если > 0.'),
]))

# 7.4 Мой день
story.append(H2('7.4. Виджет «Мой день»'))
story.append(P('Персональный дашборд менеджера на главной. Тёмный градиент.'))
story.append(action_table([
    ('Дата + приветствие', '«Доброго дня, Имя!» с днём недели и числом.'),
    ('Бейдж «🔥 N просрочено»', 'Открытые задачи у меня с истёкшим due_at. Появляется только если > 0.'),
    ('Бейдж «📅 N встреч сегодня»', 'Лиды с appointment_at в текущей дате.'),
    ('📅 Встречи сегодня', 'То же число дублируется как метрика.'),
    ('🔥 Горячих лидов', 'Лиды со score ≥ 60.'),
    ('📋 Открытых задач', 'Все мои незакрытые задачи. Красная пометка «(N ⚠)» — сколько просрочено.'),
    ('💰 В работе', 'Сумма deal_value моих открытых сделок.'),
    ('🎯 Прогноз', 'Взвешенный (Σ deal_value × вероятность).'),
]))

# 7.5 View switcher
story.append(H2('7.5. Переключатель видов'))
story.append(P('Над списком лидов: 🪟 Карточки / 📋 Таблица / 🎯 Воронка статусов / 🎓 Этапы клиентов / 📅 Календарь.'))
story.append(action_table([
    ('🪟 Карточки', 'Сетка glass-карточек. Самый удобный для общего обзора.'),
    ('📋 Таблица', 'Компактные строки. 9 колонок: чекбокс, клиент, контакты, статус, источник, страна, менеджер, SLA, действия.'),
    ('🎯 Воронка статусов', 'Kanban по статусам обработки (new → in_progress → callback → ... → closed_*). НЕ включает client-stages.'),
    ('🎓 Этапы клиентов', 'Kanban по post-win этапам (контракт → оплата → ... → отъезд). Только для лидов со статусом closed_won.'),
    ('📅 Календарь', 'Встречи и события: режимы «Список / Неделя / Месяц». Кликом — открывает лид.'),
]))
story.append(N('Выбранный вид запоминается в localStorage и применяется при следующем входе.'))

# 7.6 Lead card anatomy
story.append(H2('7.6. Анатомия карточки лида'))
story.append(P('Карточка содержит:'))
story.append(bullet_list([
    '<b>Имя + ID + время поступления</b> в шапке.',
    '<b>Статус бейдж</b> справа (цветная пилюля с цветом из настроек статуса).',
    '<b>Этап клиента бейдж</b> (если задан, после контракта).',
    '<b>Контакты</b>: 📞 телефон, ✉ email, 🌍 страна, 🎓 желаемый ВУЗ.',
    '<b>Чипы внизу</b>: источник, SLA-индикатор, 💰 сделка (если есть), 🔥/🌡/❄ скоринг с числом, ✓ N задач (роза если просрочены), 👤 менеджер.',
    '<b>Ряд меток</b> (цветные пилюли по нижнему краю).',
    '<b>Кнопка «💬 WhatsApp»</b> (зелёная) + «📋 Открыть» — на карточках если есть телефон.',
]))
story.append(P('<b>Эффект при наведении:</b> карточка приподнимается, sky-glow рамка вокруг.'))
story.append(P('<b>Эффект при bulk-режиме:</b> правый верхний угол — чекбокс. Клик по карточке выделяет вместо открытия.'))
story.append(PageBreak())

# 7.7 Drawer
story.append(H1('8. Карточка лида (драуер)'))
story.append(P('Открывается при клике на карточку или строку. Два режима: <b>side</b> (выезжает справа на 640px) и <b>center</b> (по центру модалом). Переключается кнопкой ⛶/⇥ в правом верхнем углу.'))

story.append(H2('8.1. Шапка драуера'))
story.append(action_table([
    ('Аватар + Имя + #ID', 'Большая зона. Под именем — «Поступил DD.MM.YYYY HH:MM»'),
    ('⏱ «В статусе N часов/дней»', 'Бейдж рядом с датой. Янтарный > 24ч, розовый > 72ч.'),
    ('Статус-бейдж', 'Большой бейдж с цветом и точкой-индикатором (с glow).'),
    ('Этап клиента бейдж', 'Только если есть stage_code.'),
    ('SLA бейдж', '«✓ обработан» или «осталось 1ч 23м» с цветом по срочности.'),
    ('Источник', 'Кликабельная пилюля. Тимлид или владелец могут изменить (открывается ряд кнопок-выбора).'),
    ('×', 'Закрывает драуер.'),
    ('⛶ центр / ⇥ сбоку', 'Переключение режима. Запоминается в localStorage.'),
]))

story.append(H2('8.2. Полоса быстрых действий'))
story.append(action_table([
    ('💬 WhatsApp', 'Открывает wa.me/+phone с предзаполненным текстом-приветствием. Логирует касание (channel=whatsapp).'),
    ('📞 Позвонить', 'tel: ссылка — открывает приложение телефона. Логирует касание (channel=call).'),
    ('✉ Email', 'mailto: ссылка. Логирует касание (channel=email).'),
    ('📨 Шаблон ▾', 'Открывает popover со списком готовых шаблонов. Виден только если есть шаблоны.'),
]))
story.append(H3('Popover шаблонов'))
story.append(action_table([
    ('Список', 'Название шаблона + превью текста с подставленными плейсхолдерами (имя менеджера, имя клиента).'),
    ('Клик по шаблону', 'Открывает WhatsApp с готовым текстом ИЛИ копирует в буфер обмена (если нет телефона). Логирует касание «whatsapp:template» или «clipboard:template».'),
]))

# 7.8 Tabs
story.append(H2('8.3. Вкладки драуера'))
story.append(P('7 вкладок: Обзор · 💰 Сделка · 📋 Задачи · 📎 Файлы · 💬 Чат · 🕒 Аудит · 🔗 Связанные.'))

story.append(H3('Вкладка «Обзор»'))
story.append(P('Главная информация и быстрые действия.'))
story.append(action_table([
    ('Уведомления о передаче', 'Цветной баннер: «🤝 Вам передал лид X — примите за NN мин» (фуксия) или «⏱ Передан Y — ждёт принятия» (фиолетовый). Кнопки «✓ Принять» / «✗ Отказать» / «↩ Отменить» (для исходящего).'),
    ('🎯 Обработка лида', 'Ряд кнопок-статусов. Цвет = текущий статус. Клик меняет статус. Иконки: ✓ терминальный, 📅 требует встречу, ✎ требует причину.'),
    ('🎓 Этап клиента', 'Появляется только когда статус = closed_won. Ряд кнопок этапов.'),
    ('🚪 Категория отказа', 'Появляется только при closed_lost. Кнопки причин — клик ставит causa.'),
    ('💬 Заметка', 'Поле для свободной заметки + кнопка «💾 Сохранить заметку».'),
    ('❌ Причина отказа', 'Текстовая. Если установлена — красная плашка.'),
    ('📋 Информация о клиенте', 'Список полей. Кнопка «Редактировать» справа открывает форму.'),
    ('💬 Комментарий клиента', 'Текст, что клиент написал в форме.'),
    ('Полная анкета клиента', 'Раскрывающаяся секция: дата рождения, паспорт, город, родитель (имя/контакт/профессия), удобный канал и время связи, языковой тест/балл/срок.'),
    ('🏷 Метки', 'Цветные пилюли — текущие метки лида.'),
    ('⇄ Передача лида', 'Раздел для передачи другому менеджеру (для владельца) или взять себе / переназначить (для тимлида).'),
    ('🗑 Удалить лид', 'Только для тимлида. С подтверждением.'),
]))

story.append(H3('Вкладка «💰 Сделка»'))
story.append(action_table([
    ('Сумма сделки', 'Числовое поле в USD. Хранится в deal_value.'),
    ('Валюта', 'USD / EUR / KGS / RUB.'),
    ('Вероятность 0–100%', 'Ползунок. Хранится в deal_probability. Используется для взвешенного прогноза.'),
    ('Pipeline', 'Виджет: чистая сумма deal_value.'),
    ('Взвешенно', 'Виджет: deal_value × probability / 100.'),
    ('Скоринг', 'Виджет: текущий score лида (auto-calculated 0–100).'),
    ('💾 Сохранить сделку', 'Сохраняет 3 поля разом.'),
    ('🏷 Метки (picker)', 'Все доступные метки. Клик — toggle. Активные подсвечены своим цветом.'),
]))

story.append(H3('Вкладка «📋 Задачи»'))
story.append(action_table([
    ('Поле «Что нужно сделать»', 'Текст задачи.'),
    ('Поле «Срок»', 'datetime-local.'),
    ('+ Добавить', 'Создаёт задачу. Назначается на текущего менеджера лида.'),
    ('Чекбокс задачи', 'Toggle: завершено / открыто.'),
    ('Текст задачи', 'Зачёркнут если выполнено.'),
    ('⏰ Срок', 'Подсвечен красным если просрочен и не выполнен. Карточка задачи тоже розовая.'),
    ('🗑', 'Удаляет задачу.'),
]))
story.append(N('Просроченные открытые задачи попадают в Telegram-уведомления и push-нотификации.'))

story.append(H3('Вкладка «📎 Файлы»'))
story.append(action_table([
    ('⬆ Загрузить', 'Открывает file picker. Принимает: PDF, Word/Excel/PPT, JPG/PNG/HEIC/SVG, ZIP/RAR. Лимит 25 МБ.'),
    ('Список файлов', 'Иконка (🖼/📕/📘/📗/📄), имя, размер в KB, кто загрузил, когда. Клик на имя — скачивает.'),
    ('🗑', 'Удаляет файл с диска и из БД.'),
]))
story.append(N('Файлы хранятся на сервере в /uploads/ под Railway-volume — переживают рестарты.'))

story.append(H3('Вкладка «💬 Чат» (внутренняя коммуникация)'))
story.append(action_table([
    ('Список комментариев', 'Хронология. Аватары авторов, имена, время, текст.'),
    ('Бейдж «тимлид»', 'У комментариев от тимлида.'),
    ('Системные события', 'Авто-комментарии: «📅 Запланирован визит», «🎓 Этап клиента: X → Y», «🤖 Дедупликация: ...».'),
    ('Текстовое поле + кнопка «Отправить»', 'Добавляет комментарий. Доступно владельцу и тимлиду.'),
]))

story.append(H3('Вкладка «🕒 Аудит»'))
story.append(P('Полный лог изменений по этому лиду: смены статуса, этапа, передачи, переназначения, удаления файлов, срабатывания автоматизаций.'))
story.append(action_table([
    ('Запись', 'Дата · Имя автора · действие (моноширинно: status.change, stage.change, file.upload и т.д.).'),
    ('Кнопка «детали»', 'Раскрывает JSON before/after.'),
]))

story.append(H3('Вкладка «🔗 Связанные»'))
story.append(P('Лиды с тем же телефоном или email (потенциальные дубли).'))
story.append(P('При клике — открывает соответствующий лид.'))
story.append(PageBreak())

# 8. Drag&drop
story.append(H1('9. Drag&drop в Kanban'))
story.append(P('В режимах «🎯 Воронка статусов» и «🎓 Этапы клиентов» карточки перетаскиваются между колонками. Перемещение моментально меняет статус/этап.'))
story.append(action_table([
    ('Захват карточки', 'Курсор меняется на «двигать». Карточка становится полупрозрачной.'),
    ('Колонка-цель', 'Светится sky-обводкой при наведении.'),
    ('Drop', 'Отпуск над колонкой — POST на сервер с новым статусом/этапом. Карточка пульсирует пока сохраняется.'),
    ('Drop в статус с requires_appointment', 'Пред-проверка: alert → открывает драуер чтобы менеджер указал дату встречи.'),
    ('Drop в статус с requires_reason', 'Запрос причины через window.prompt → отправляет с rejection_reason.'),
    ('Запрет drag', 'Карточка чужого менеджера для обычного менеджера. Для тимлида — драг возможен.'),
]))

# 9. Bulk
story.append(H1('10. Массовые действия (bulk)'))
story.append(P('Активируется кнопкой «☑️ Массовые действия» в сайдбаре. На карточках появляются чекбоксы.'))
story.append(action_table([
    ('Клик по карточке в bulk-режиме', 'Выделяет/снимает выделение (не открывает драуер).'),
    ('Floating bar внизу', 'Появляется когда выбран хотя бы 1 лид. Содержит селекторы.'),
    ('«→ Сменить статус...»', 'Выпадающий список статусов. Выбор моментально применяется ко всем выделенным.'),
    ('«→ Этап клиента...»', 'Изменение stage_code. Опция «Снять этап» для очистки.'),
    ('«→ Метка...»', 'Группы «Добавить» (+ метка) и «Снять» (− метка). Применяется ко всем.'),
    ('«→ Переназначить...»', 'Только для тимлида. Меняет владельца лида.'),
    ('«Снять выбор»', 'Очищает выделение.'),
]))

# 10. KB modal
story.append(H1('11. База знаний'))
story.append(P('Модал, открывается кнопкой «📖» в шапке.'))
story.append(action_table([
    ('Сайдбар слева (264px)', 'Заголовок «📖 База знаний» + поле поиска + список статей. Тэги под названиями.'),
    ('Поле поиска', 'Фильтрует по заголовку и тэгам.'),
    ('Клик по статье', 'Загружает в правую панель.'),
    ('Reading pane', 'Заголовок, время обновления, текст (markdown).'),
    ('×', 'Закрывает модал.'),
]))

# 11. PWA & push
story.append(H1('12. PWA и push-уведомления'))
story.append(P('Система зарегистрирована как Progressive Web App.'))
story.append(action_table([
    ('Установка на телефон', 'Откройте /lidy в Chrome/Safari на телефоне → «Добавить на главный экран». Получите иконку GoGlobal.'),
    ('Запрос на уведомления', 'При первом входе браузер спросит разрешение. Нажмите «Разрешить».'),
    ('Когда придёт push', 'Новый лид на вас / Передача лида от другого / SLA скоро истечёт.'),
    ('Клик по уведомлению', 'Откроет /lidy (фокус на существующую вкладку или новая).'),
    ('Service Worker', 'Кеширует ассеты для оффлайн-просмотра последнего состояния.'),
]))
story.append(info_box('⚠️ Требование для push',
    'В переменных окружения Railway должны быть заданы: <font face="Courier">VAPID_PUBLIC_KEY</font>, '
    '<font face="Courier">VAPID_PRIVATE_KEY</font>, <font face="Courier">VAPID_SUBJECT</font>. '
    'Без них push silently no-op. Сгенерировать ключи: <font face="Courier">npx web-push generate-vapid-keys</font>',
    color=COL_WARN
))

# 12. Roles summary
story.append(H1('13. Сводка по ролям'))

story.append(H2('🛡️ Администратор'))
story.append(bullet_list([
    'Полный доступ к /admin со всеми разделами.',
    'Может создавать/удалять менеджеров.',
    'Управляет всеми настройками: статусами, метками, шаблонами, автоматизациями, KB, комиссиями.',
    'Видит весь аудит-лог.',
    'Может скачать полный бэкап БД.',
]))

story.append(H2('👑 Тимлид (teamlead)'))
story.append(bullet_list([
    'В /lidy: видит ВСЕ лиды компании (переключатель «Все/Мои»).',
    'Может удалять лиды.',
    'Может передавать и переназначать лиды без подтверждения от целевого менеджера.',
    'Видит roster — статистику по всем менеджерам.',
    'Получает Telegram-дайджест каждое утро в 09:00 (вчерашние KPI, оффлайн-менеджеры, задачи).',
    'Доступны bulk-действия включая «Переназначить».',
]))

story.append(H2('👨‍💼 Менеджер (manager)'))
story.append(bullet_list([
    'В /lidy видит только СВОИ лиды (assigned_manager_id = me.id) + входящие передачи.',
    'Может менять статус, ставить этап, писать комментарии, создавать задачи, загружать файлы.',
    'Может передать лид коллеге (с ожиданием принятия 10 минут).',
    'Не может удалять лиды.',
    'Получает push/Telegram при новом лиде и при передаче.',
    'Видит свою статистику в виджете «Мой день».',
]))

story.append(H2('🤝 Партнёр (partner)'))
story.append(bullet_list([
    'Внешний агент. Создаётся администратором с role=partner.',
    'Заходит в /lidy с обычным логином, но интерфейс упрощён.',
    'Может создавать лиды (POST /api/lidy/partner/leads).',
    'Видит ТОЛЬКО лиды, которые создал сам.',
    'Не получает чужих лидов, не видит roster.',
    'Опционально подключается к системе комиссий.',
]))

story.append(PageBreak())

# 13. Best practices
story.append(H1('14. Лучшие практики'))

story.append(H2('Для менеджера'))
story.append(bullet_list([
    'Утром включите «🟢 В сети» сразу. Иначе лиды не придут вам.',
    'Используйте «📥 Inbox 0» как рабочий режим — видны только лиды, требующие действия.',
    'Когда уходите на встречу/обед — переключите на «⚪ Не в сети».',
    'Шаблоны (📨) экономят время — используйте их вместо набора руками.',
    'Загружайте паспорт/диплом/IELTS клиента сразу как получили — не теряйте.',
    'Ставьте задачи на «перезвонить через 3 дня» — иначе забудете.',
    'Указывайте сумму сделки в драуере → прогноз станет точнее.',
]))

story.append(H2('Для тимлида'))
story.append(bullet_list([
    'Каждое утро — проверьте Telegram-дайджест (или светофор «Здоровье продаж»).',
    'Раз в неделю — Leaderboard и 1-on-1 отчёты с каждым менеджером.',
    'Если ROI канала &lt; 1x — пересмотрите рекламный бюджет.',
    'Если время в каком-то статусе > 7 дней — настройте автоматизацию (триггер «время в статусе» → действие «уведомить тимлида»).',
    'Раз в квартал — скачайте бэкап БД через 🛠 Утилиты.',
]))

story.append(H2('Для администратора'))
story.append(bullet_list([
    'Меняйте ADMIN_PASSWORD в Railway сразу после деплоя.',
    'Сгенерируйте VAPID-ключи для push (см. инструкцию в шапке).',
    'Установите TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID для уведомлений.',
    'Раз в месяц — проверяйте аудит-лог на подозрительную активность.',
    'Регулярно обновляйте Knowledge Base — это снижает нагрузку на тимлида.',
]))

# Final box
story.append(Spacer(1, 12))
story.append(info_box('📞 Поддержка',
    'Документация: https://github.com/TamerCOD/go-global-education-abroad<br/>'
    'Тех. поддержка: tamer@goglobal.kg<br/>'
    'Версия системы: 4.0 (Phase A/B/C v4 — май 2026)',
    color=COL_OK
))

# Build PDF
doc.build(story)
print(f"✓ PDF generated: {doc.filename}")
print(f"  Total pages: {doc.page}")
