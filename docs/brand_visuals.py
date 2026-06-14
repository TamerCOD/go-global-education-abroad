# -*- coding: utf-8 -*-
"""Vector design specimens for the GoGlobal brandbook: colour swatches, type
specimens, component anatomy, page structure, hero mock. Drawn 1:1 in reportlab."""
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.platypus import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# system substitutes for the real Google fonts (clearly labelled in the doc)
for fam, fp in [("Sans", r"C:\Windows\Fonts\segoeui.ttf"), ("Sans-Bold", r"C:\Windows\Fonts\segoeuib.ttf"),
                ("Sans-Black", r"C:\Windows\Fonts\seguisb.ttf"), ("Mono", r"C:\Windows\Fonts\consola.ttf"),
                ("Mono-Bold", r"C:\Windows\Fonts\consolab.ttf"), ("Serif", r"C:\Windows\Fonts\georgia.ttf")]:
    try: pdfmetrics.registerFont(TTFont(fam, fp))
    except Exception: pass

INK  = colors.HexColor("#1c1f26"); INK2 = colors.HexColor("#4f5560"); INK3 = colors.HexColor("#8a91a0")
LINE = colors.HexColor("#dee1e6"); WHITE = colors.white

def _readable(hexc):
    c = colors.HexColor(hexc)
    return colors.white if (0.299*c.red + 0.587*c.green + 0.114*c.blue) < 0.6 else colors.HexColor("#1c1f26")

class Swatches(Flowable):
    """A row band of colour chips. rows = list of (name, hex)."""
    def __init__(self, rows, h=26*mm, chip_h=None, cols=None):
        super().__init__(); self.rows = rows; self.h = h
    def wrap(self, aw, ah): self.w = aw; return (aw, self.h)
    def draw(self):
        c = self.canv; n = len(self.rows); gap = 2*mm
        cw = (self.w - gap*(n-1)) / n
        for i, (name, hx) in enumerate(self.rows):
            x = i*(cw + gap)
            c.setFillColor(colors.HexColor(hx)); c.roundRect(x, 0, cw, self.h, 2*mm, stroke=0, fill=1)
            tc = _readable(hx)
            c.setFillColor(tc); c.setFont("Sans-Bold", 7.5)
            c.drawString(x + 2.2*mm, self.h - 6*mm, name)
            c.setFont("Mono", 7); c.setFillColor(tc)
            c.drawString(x + 2.2*mm, 2.6*mm, hx.upper())

class TypeRow(Flowable):
    """Font specimen: big sample + spec line."""
    def __init__(self, real, role, sample, weights, sub_font, size=22, h=26*mm):
        super().__init__(); self.real=real; self.role=role; self.sample=sample
        self.weights=weights; self.sub=sub_font; self.size=size; self.h=h
    def wrap(self, aw, ah): self.w = aw; return (aw, self.h)
    def draw(self):
        c = self.canv
        c.setFillColor(colors.HexColor("#f7f8f9")); c.roundRect(0,0,self.w,self.h,2.5*mm,stroke=0,fill=1)
        c.setStrokeColor(LINE); c.setLineWidth(0.6); c.roundRect(0,0,self.w,self.h,2.5*mm,stroke=1,fill=0)
        c.setFillColor(colors.HexColor("#4f46e5")); c.setFont("Sans-Bold", 9)
        c.drawString(5*mm, self.h - 7*mm, self.real)
        c.setFillColor(INK3); c.setFont("Sans", 7.5)
        c.drawString(5*mm + c.stringWidth(self.real,"Sans-Bold",9) + 4*mm, self.h - 7*mm, self.role)
        c.setFillColor(INK); c.setFont(self.sub, self.size)
        c.drawString(5*mm, self.h - 7*mm - self.size*0.9, self.sample)
        c.setFillColor(INK2); c.setFont("Mono", 7)
        c.drawString(5*mm, 2.8*mm, self.weights)

class Components(Flowable):
    """Buttons, chips, inputs, card anatomy."""
    def __init__(self, h=52*mm):
        super().__init__(); self.h=h
    def wrap(self, aw, ah): self.w = aw; return (aw, self.h)
    def _btn(self, x, y, w, label, fill, tcol=WHITE, h=8*mm, r=4*mm, lift=False):
        c=self.canv
        if lift:
            c.setFillColor(colors.HexColor("#1d4ed8")); c.roundRect(x, y-1.3*mm, w, h, r, stroke=0, fill=1)
        c.setFillColor(fill); c.roundRect(x, y, w, h, r, stroke=0, fill=1)
        c.setFillColor(tcol); c.setFont("Sans-Bold", 8.5)
        c.drawCentredString(x+w/2, y+h/2-3, label)
    def _chip(self, x, y, label, base):
        c=self.canv; col=colors.HexColor(base)
        mix=colors.Color(col.red*0.16+1*0.84, col.green*0.16+1*0.84, col.blue*0.16+1*0.84)
        w=c.stringWidth(label,"Sans-Bold",7.5)+6*mm
        c.setFillColor(mix); c.roundRect(x,y,w,5.6*mm,2.8*mm,stroke=0,fill=1)
        c.setStrokeColor(col); c.setLineWidth(0.7); c.roundRect(x,y,w,5.6*mm,2.8*mm,stroke=1,fill=0)
        c.setFillColor(col); c.setFont("Sans-Bold",7.5); c.drawString(x+3*mm,y+1.7*mm,label)
        return w
    def draw(self):
        c=self.canv; w=self.w; top=self.h
        c.setFillColor(INK3); c.setFont("Sans-Bold",7.5)
        c.drawString(0, top-4*mm, "КНОПКИ")
        self._btn(0, top-16*mm, 36*mm, "Выбрать ВУЗ", colors.HexColor("#2563eb"), lift=True)
        self._btn(40*mm, top-16*mm, 30*mm, "Заявка", colors.HexColor("#2563eb"), r=4*mm, h=8*mm)
        self._btn(74*mm, top-16*mm, 34*mm, "Как это работает?", colors.HexColor("#0f1e3d"))
        self._btn(112*mm, top-16*mm, 34*mm, "WhatsApp", colors.HexColor("#25D366"))
        c.setFillColor(INK3); c.setFont("Sans-Bold",7.5)
        c.drawString(0, top-22*mm, "ЧИПЫ / СТАТУСЫ")
        xx=0
        for lbl,base in [("Новый","#6366f1"),("В работе","#f59e0b"),("Дубль","#a78bfa"),
                         ("Закрыт","#10b981"),("Отказ","#e11d48"),("VIP","#7c3aed")]:
            xx += self._chip(xx, top-30*mm, lbl, base) + 3*mm
        c.setFillColor(INK3); c.setFont("Sans-Bold",7.5)
        c.drawString(0, top-36*mm, "ПОЛЕ ВВОДА")
        c.setFillColor(colors.HexColor("#f7f8f9")); c.setStrokeColor(LINE); c.setLineWidth(0.8)
        c.roundRect(0, top-45*mm, 70*mm, 7*mm, 2.5*mm, stroke=1, fill=1)
        c.setFillColor(INK3); c.setFont("Sans",8); c.drawString(2.5*mm, top-42.8*mm, "Иван Иванов")
        # focus ring example
        c.setStrokeColor(colors.HexColor("#6366f1")); c.setLineWidth(1.4)
        c.roundRect(74*mm, top-45*mm, 70*mm, 7*mm, 2.5*mm, stroke=1, fill=0)
        c.setFillColor(INK2); c.setFont("Sans",7); c.drawString(74*mm, top-49*mm, "focus-ring: 2px #6366f1, offset 2px")

class SiteStack(Flowable):
    """Vertical stack of public-site sections."""
    def __init__(self, h=120*mm):
        super().__init__(); self.h=h
    def wrap(self, aw, ah): self.w=aw; return (aw, self.h)
    def draw(self):
        c=self.canv; w=self.w
        secs=[("Navbar","фиксированное меню; прозрачное → белое при скролле","#1e3a8a"),
              ("Hero","первый экран: градиент + текстура, заголовок с акцентом, 2 кнопки, фото","#2563eb"),
              ("О нас","миссия, статистика (счётчики), карточки услуг, логотипы партнёров","#0d9488"),
              ("Направления","страны/ВУЗы карточками со стоимостью","#6366f1"),
              ("Калькулятор","бюджет обучения; результат → WhatsApp","#f59e0b"),
              ("Отзывы","карточки клиентов с фото и рейтингом","#7c3aed"),
              ("FAQ","аккордеон вопрос-ответ","#0891b2"),
              ("Форма заявки","имя + телефон, доп. поля по желанию","#059669"),
              ("Footer","контакты, соцсети, ссылки","#15171c")]
        bh=(self.h - (len(secs)-1)*1.6*mm)/len(secs)
        for i,(t,s,col) in enumerate(secs):
            y=self.h - (i+1)*bh - i*1.6*mm
            c.setFillColor(colors.HexColor(col)); c.roundRect(0,y,7*mm,bh,1*mm,stroke=0,fill=1)
            c.setFillColor(colors.HexColor("#f7f8f9")); c.setStrokeColor(LINE); c.setLineWidth(0.6)
            c.roundRect(8*mm,y,w-8*mm,bh,1.4*mm,stroke=1,fill=1)
            c.setFillColor(INK); c.setFont("Sans-Bold",8.5); c.drawString(11*mm,y+bh/2-1, t)
            c.setFillColor(INK2); c.setFont("Sans",7.5); c.drawString(40*mm,y+bh/2-1, s)
        # floating elements note
        c.setFillColor(colors.HexColor("#25D366")); c.circle(w-4*mm, 4*mm, 2.6*mm, stroke=0, fill=1)
        c.setFillColor(INK3); c.setFont("Sans",6.5); c.drawRightString(w-8*mm, 3*mm, "плавающие: WhatsApp + «Заявка»")

class HeroMock(Flowable):
    def __init__(self, h=72*mm):
        super().__init__(); self.h=h
    def wrap(self, aw, ah): self.w=aw; return (aw, self.h)
    def draw(self):
        c=self.canv; w=self.w; h=self.h
        # gradient-ish background (brand-900 -> brand-600)
        steps=40
        b9=colors.HexColor("#1e3a8a"); b6=colors.HexColor("#2563eb")
        for i in range(steps):
            t=i/steps
            col=colors.Color(b9.red*(1-t)+b6.red*t, b9.green*(1-t)+b6.green*t, b9.blue*(1-t)+b6.blue*t)
            c.setFillColor(col); c.rect(i*w/steps, 0, w/steps+1, h, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont("Sans-Black", 9)
        c.drawCentredString(w/2, h-9*mm, "Go Global")
        # badge
        c.setFillColor(colors.HexColor("#f59e0b")); c.roundRect(w/2-26*mm, h-22*mm, 52*mm, 6*mm, 3*mm, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont("Sans-Bold",7); c.drawCentredString(w/2, h-20*mm, "ТВОЙ БИЛЕТ В БУДУЩЕЕ")
        c.setFillColor(colors.white); c.setFont("Sans-Black", 30)
        c.drawCentredString(w/2, h-38*mm, "Учись. Путешествуй.")
        # accent line (amber gradient text -> draw amber)
        c.setFillColor(colors.HexColor("#fbbf24")); c.setFont("Sans-Black", 30)
        c.drawCentredString(w/2, h-50*mm, "Живи ярко!")
        c.setFillColor(colors.HexColor("#dbeafe")); c.setFont("Sans", 9)
        c.drawCentredString(w/2, h-58*mm, "Помогаем поступить в топовые вузы мира.")
        # buttons
        c.setFillColor(colors.HexColor("#2563eb")); c.roundRect(w/2-44*mm, 6*mm, 40*mm, 9*mm, 3.5*mm, stroke=0, fill=1)
        c.setFillColor(colors.white); c.setFont("Sans-Bold",8.5); c.drawCentredString(w/2-24*mm, 9*mm, "Выбрать ВУЗ")
        c.setFillColor(colors.Color(1,1,1,0.12)); c.roundRect(w/2+2*mm, 6*mm, 42*mm, 9*mm, 3.5*mm, stroke=0, fill=1)
        c.setStrokeColor(colors.Color(1,1,1,0.4)); c.setLineWidth(0.8); c.roundRect(w/2+2*mm, 6*mm, 42*mm, 9*mm, 3.5*mm, stroke=1, fill=0)
        c.setFillColor(colors.white); c.drawCentredString(w/2+23*mm, 9*mm, "Как это работает?")
        # WA fab
        c.setFillColor(colors.HexColor("#25D366")); c.circle(w-6*mm, 6*mm, 3.2*mm, stroke=0, fill=1)
