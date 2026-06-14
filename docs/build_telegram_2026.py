# -*- coding: utf-8 -*-
"""GoGlobal — Telegram-бот: что присылает и как настроить. A4 PDF, единый стиль."""
import os
from doc_common import (make_doc, cover, toc_page, chapter, build, mm,
                        P, B, LI, NOTE, WARN, OK, BAD, HRule, tbl, mock, diagram,
                        S_H2, S_H3, S_CAP, Spacer, C_ACCENT, sanitize, st)
from reportlab.platypus import Table, TableStyle, Paragraph
from reportlab.lib import colors

OUT = os.path.join(os.path.dirname(__file__), "goglobal-telegram-bot.pdf")
doc, story = make_doc(OUT, "GoGlobal — Telegram-бот", "Telegram-бот · июнь 2026")

# message card (mimics a Telegram message bubble)
def msg(title, lines):
    body = [Paragraph(f"<b>{sanitize(title)}</b>",
                      st("mt", fontName="Arial-Bold", fontSize=9.5, leading=13, textColor=colors.white))]
    for l in lines:
        body.append(Paragraph(sanitize(l), st("ml", fontSize=9, leading=12.8,
                    textColor=colors.HexColor("#c2c7d0"))))
    inner = Table([[b] for b in body], colWidths=[150*mm])
    inner.setStyle(TableStyle([("LEFTPADDING",(0,0),(-1,-1),0),("RIGHTPADDING",(0,0),(-1,-1),0),
                               ("TOPPADDING",(0,0),(-1,-1),1),("BOTTOMPADDING",(0,0),(-1,-1),1)]))
    t = Table([[inner]], colWidths=[158*mm])
    t.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),colors.HexColor("#15171c")),
        ("BOX",(0,0),(-1,-1),0.8,colors.HexColor("#363b45")),("ROUNDEDCORNERS",[5,5,5,5]),
        ("LEFTPADDING",(0,0),(-1,-1),9),("RIGHTPADDING",(0,0),(-1,-1),9),
        ("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
    return [Spacer(1,3), t, Spacer(1,5)]

cover(story, "Внутренняя документация",
      "Telegram-бот\nуведомления команды",
      "Что бот присылает в рабочий чат, когда и как это настроить.\nОбновлено под новые адреса и сценарии.",
      "Команда · версия v5 · июнь 2026")
toc_page(story)

# ── 1 ──
chapter(story, "Зачем нужен бот")
story.append(P("Telegram-бот — мгновенный «громкоговоритель» CRM. Как только в системе что-то важное "
               "происходит (новый лид, повторное обращение, просрочка), бот пишет в общий рабочий чат. "
               "Никто не сидит и не обновляет CRM вручную — команда узнаёт сразу."))
story += diagram("leadflow", 60*mm, "Путь лида: заявка → распределение → менеджер → уведомление в Telegram")
story.append(NOTE("Бот — это <b>дополнение</b> к push-уведомлениям в самой CRM, а не замена. Менеджеру push "
                  "приходит лично; в Telegram видит вся команда (полезно руководителю)."))

# ── 2 ──
chapter(story, "Что присылает бот")
story.append(tbl([
    ["Событие", "Когда срабатывает", "Кому полезно"],
    ["🆕 Новый лид", "заявка с сайта / партнёра / внешнего источника", "менеджеру + команде"],
    ["📞 Лид создан вручную", "менеджер завёл лид в CRM", "команде"],
    ["🔁 Повторное обращение (дубль)", "клиент обратился снова (тот же телефон/email)", "менеджеру оригинала"],
    ["⏰ Просрочка SLA", "первый ответ не дан вовремя", "менеджеру + руководителю"],
    ["🤝 Передача лида", "лид передан коллеге / возвращён по таймауту", "участникам передачи"],
    ["🔒 Блокировка входа", "5 неверных попыток входа (безопасность)", "руководителю"],
    ["📥 Импорт лидов", "загрузка базы из CSV — сводка", "руководителю"],
], [44*mm, 58*mm, None]))

# ── 3 ──
chapter(story, "Как выглядят сообщения")
story.append(P("Новый лид", S_H3))
story += msg("🆕 Новый лид #128", [
    "👤 Айгуль Токтосунова",
    "📞 +996 700 123 456 · открыть WhatsApp",
    "🌍 Япония · Toyo University",
    "🏷 Источник: Сайт",
    "👨‍💼 Назначен: Анна Петрова (anna)",
    "⏱ SLA до 12.06 14:30",
    "→ открыть в CRM (goglobal.kg/lidy300499)"])
story.append(P("Повторное обращение (дубль)", S_H3))
story += msg("🔁 Повторное обращение — дубль #131", [
    "Оригинал: лид #128",
    "👤 Айгуль Токтосунова",
    "👨‍💼 Назначен: Анна Петрова",
    "→ открыть в CRM (goglobal.kg/lidy300499)"])
story.append(P("Просрочка SLA", S_H3))
story += msg("⏰ Просрочен SLA по лиду #126", [
    "👤 Бакыт Асанов · +996 700 555 222",
    "Менеджер: @ivan — нет первого ответа",
    "→ открыть в CRM"])
story.append(P("Блокировка входа (безопасность)", S_H3))
story += msg("🔒 Заблокирован вход в админку", [
    "5 неверных попыток с IP 1.2.3.4 — блокировка 15 минут."])

# ── 4 ──
chapter(story, "Что изменилось")
story.append(tbl([
    ["Изменение", "Подробности"],
    ["Ссылки ведут на новый адрес", "все «открыть в CRM» теперь на goglobal.kg/lidy300499 (секретный адрес)"],
    ["Уведомления о дублях", "повторное обращение присылается отдельно, со ссылкой на оригинал"],
    ["Сигнал о блокировке входа", "при 5 неверных попытках — оповещение (безопасность)"],
    ["Сводка импорта", "после загрузки CSV — сколько создано / пропущено дублей / ошибок"],
], [50*mm, None]))
story.append(OK("Если у кого-то в команде «застряла» CRM на старом адресе — нужно один раз открыть новый "
                "goglobal.kg/lidy300499 (старые ссылки из бота уже ведут туда)."))

# ── 5 ──
chapter(story, "Настройка (для администратора)")
story.append(P("Бот работает через две настройки сервера. Они задаются один раз."))
story.append(tbl([
    ["Переменная", "Что это"],
    ["TELEGRAM_BOT_TOKEN", "токен бота от @BotFather"],
    ["TELEGRAM_CHAT_ID", "ID чата/группы, куда слать уведомления"],
], [56*mm, None]))
story.append(P("Шаги", S_H2))
story.append(step1 := P("1. Создать бота у @BotFather → получить токен.", st("s1", fontSize=10, leading=14, leftIndent=10)))
story.append(P("2. Добавить бота в рабочую группу; узнать chat_id группы.", st("s2", fontSize=10, leading=14, leftIndent=10)))
story.append(P("3. Прописать TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в переменных окружения (Railway).", st("s3", fontSize=10, leading=14, leftIndent=10)))
story.append(P("4. В админке (Система → Telegram) нажать «Тест» — придёт пробное сообщение.", st("s4", fontSize=10, leading=14, leftIndent=10)))
story.append(NOTE("Если переменные не заданы — бот просто молчит, остальная система работает как обычно. "
                  "Токен и chat_id хранятся в окружении сервера, не в коде."))

story.append(Spacer(1, 14)); story.append(HRule(C_ACCENT, 2))
story.append(P("GoGlobal · Telegram-бот · июнь 2026", S_CAP))
print("OK:", build(doc, story))
