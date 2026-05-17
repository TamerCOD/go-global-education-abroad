# 📚 GoGlobal CRM — Документация

## 📖 Файлы

| Документ | Кому | Размер | Назначение |
|---|---|---|---|
| **goglobal-crm-manual.pdf** | Все | 31 стр | Полное руководство (все разделы и кнопки) |
| **manager-quickstart.pdf** | Менеджер | 2 стр | Шпаргалка для повседневной работы |
| **teamlead-quickstart.pdf** | Тимлид | 2 стр | Продвинутые операции + еженедельные процессы |
| **admin-setup-guide.pdf** | Администратор | 2 стр | Развёртывание, env vars, восстановление |
| **manager-onboarding-checklist.pdf** | Новый менеджер + тимлид | 2 стр | Чек-лист первых двух недель |

## 🔄 Регенерация

```bash
cd docs
python3 build_docs.py    # полное руководство
python3 build_cards.py   # 4 шпаргалки
```

Требования: Python 3.8+, `pip install reportlab pypdf`.

Шрифт берётся из Windows: `C:\Windows\Fonts\arial.ttf` + bold/italic варианты.

## 📅 Версия

CRM v4 — май 2026.
