import { Country, FAQItem, Testimonial } from './types';

export const COUNTRIES: Country[] = [
  {
    id: 'usa',
    name: 'США',
    region: 'USA',
    description: 'Лидер мирового образования. Кампусная жизнь как в кино.',
    fullDescription: 'Образование в США — это не просто лекции, это образ жизни. Огромные кампусы, передовые лаборатории, спортивные стипендии и возможности для стажировок в крупнейших компаниях мира (Google, Tesla, Apple).',
    image: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000&auto=format&fit=crop',
    costs: { tuition: { min: 20000, max: 60000 }, living: { min: 15000, max: 25000 } },
    coordinates: { top: '35%', left: '18%' },
    universities: [
      { 
        name: 'University of California', 
        description: 'Инновации и технологии в сердце Калифорнии.', 
        images: [
            'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1498243691581-b145c3f54a5a?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1525909002-1b05e0c869d8?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'New York University', 
        description: 'Обучение в ритме большого города.', 
        images: [
            'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1555431189-0fabf2667795?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1534234828569-1f3554d3298f?q=80&w=800&auto=format&fit=crop',
             'https://images.unsplash.com/photo-1605370933758-a537f5d023b6?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'Boston University', 
        description: 'Академическая столица США.', 
        images: [
            'https://images.unsplash.com/photo-1623000854426-5d933c945143?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1607237138186-73d0ae48c470?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1579782504820-2df2b0c3f56b?q=80&w=800&auto=format&fit=crop'
        ] 
      }
    ]
  },
  {
    id: 'china',
    name: 'Китай',
    region: 'Asia',
    description: 'Гранты, технологии и древняя культура.',
    fullDescription: 'Китай инвестирует миллиарды в образование. Это шанс получить диплом мирового уровня бесплатно или с большой скидкой, выучить самый перспективный язык и увидеть будущее своими глазами.',
    image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?q=80&w=1000&auto=format&fit=crop',
    costs: { tuition: { min: 2500, max: 6000 }, living: { min: 4000, max: 8000 } },
    coordinates: { top: '42%', left: '72%' },
    universities: [
      { 
        name: 'Tsinghua University', 
        description: 'Ведущий технический вуз Азии.', 
        images: [
            'https://images.unsplash.com/photo-1599583764832-6b943d63b016?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1548232979-6c557ee14752?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1588873281272-359178129048?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'Peking University', 
        description: 'Гуманитарные науки и исследования.', 
        images: [
            'https://images.unsplash.com/photo-1589886259062-8e1046d51046?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1569429583626-444455855273?q=80&w=800&auto=format&fit=crop',
             'https://images.unsplash.com/photo-1596422748366-24f6050b188c?q=80&w=800&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 'japan',
    name: 'Япония',
    region: 'Asia',
    description: 'Безопасность, инновации и уникальная эстетика.',
    fullDescription: 'Япония — это страна, где роботы соседствуют с древними храмами. Высочайшее качество образования, идеальная безопасность и невероятная культура. Идеально для тех, кто ищет уникальный опыт.',
    image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?q=80&w=1000&auto=format&fit=crop',
    costs: { tuition: { min: 5000, max: 12000 }, living: { min: 10000, max: 15000 } },
    coordinates: { top: '42%', left: '86%' },
    universities: [
      { 
        name: 'University of Tokyo', 
        description: 'Престиж и вековые традиции.', 
        images: [
            'https://images.unsplash.com/photo-1576757048320-f4728f321903?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1580823114389-c48c962b5311?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1550949992-07759556350b?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'Kyoto University', 
        description: 'Свобода академической мысли.', 
        images: [
            'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1528360983277-13d9b152c611?q=80&w=800&auto=format&fit=crop',
             'https://images.unsplash.com/photo-1570889270055-66d48227b613?q=80&w=800&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 'germany',
    name: 'Германия',
    region: 'Europe',
    description: 'Бесплатное образование и карьера в центре Европы.',
    fullDescription: 'Германия славится своим инженерным образованием и тем, что государственные вузы бесплатны даже для иностранцев. Это прямой путь к карьере в крупнейших экономиках ЕС.',
    image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?q=80&w=1000&auto=format&fit=crop',
    costs: { tuition: { min: 0, max: 3000 }, living: { min: 11000, max: 14000 } },
    coordinates: { top: '27%', left: '50%' },
    universities: [
      { 
        name: 'TU Munich', 
        description: 'Инженерное дело мирового уровня.', 
        images: [
            'https://images.unsplash.com/photo-1564981797816-1043664bf78d?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1590327170154-b3c9597c4856?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1596436579693-5b8c9c0653c3?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'Humboldt University', 
        description: 'Классическое европейское образование.', 
        images: [
            'https://images.unsplash.com/photo-1592398555294-81d332616429?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?q=80&w=800&auto=format&fit=crop',
             'https://images.unsplash.com/photo-1562624121-6b453e925b6a?q=80&w=800&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 'spain',
    name: 'Испания',
    region: 'Europe',
    description: 'Солнце, творчество и доступная жизнь.',
    fullDescription: 'Учитесь под южным солнцем! Испания предлагает отличные программы по бизнесу, архитектуре и туризму. Относительно недорогая жизнь и очень дружелюбная атмосфера.',
    image: 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?q=80&w=1000&auto=format&fit=crop',
    costs: { tuition: { min: 1500, max: 15000 }, living: { min: 9000, max: 13000 } },
    coordinates: { top: '35%', left: '46%' },
    universities: [
      { 
        name: 'University of Barcelona', 
        description: 'Исследования и стиль.', 
        images: [
            'https://images.unsplash.com/photo-1560959082-959c53644917?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1583422409516-2895a77efded?q=80&w=800&auto=format&fit=crop',
             'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'IE Business School', 
        description: 'Бизнес-образование для лидеров.', 
        images: [
            'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1577412647305-991150c7d163?q=80&w=800&auto=format&fit=crop'
        ]
      }
    ]
  },
  {
    id: 'italy',
    name: 'Италия',
    region: 'Europe',
    description: 'Искусство, мода, дизайн и история.',
    fullDescription: 'Где изучать искусство и дизайн, как не в Италии? Страна, подарившая миру Ренессанс, сегодня предлагает передовые программы в сфере моды, архитектуры и гуманитарных наук.',
    image: 'https://images.unsplash.com/photo-1529260830199-42c4394804c7?q=80&w=1000&auto=format&fit=crop',
    costs: { tuition: { min: 1000, max: 4000 }, living: { min: 10000, max: 15000 } },
    coordinates: { top: '35%', left: '53%' },
    universities: [
      { 
        name: 'Politecnico di Milano', 
        description: 'Дизайн и архитектура.', 
        images: [
            'https://images.unsplash.com/photo-1510526487820-222851a02120?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1555529733-0e670560f7e1?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1519417688547-61e5d5338ab0?q=80&w=800&auto=format&fit=crop'
        ]
      },
      { 
        name: 'University of Bologna', 
        description: 'Старейший университет Европы.', 
        images: [
            'https://images.unsplash.com/photo-1564507004663-b6dfb3c8186b?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1558487661-9d4f0142be3f?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1520448057102-125c19736881?q=80&w=800&auto=format&fit=crop'
        ]
      }
    ]
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Айбек Сатыбалдиев',
    countryId: 'china',
    university: 'Tsinghua University',
    image: 'https://images.unsplash.com/photo-1548690414-722a9443e098?q=80&w=200&auto=format&fit=crop',
    quote: "Среда творит чудеса.",
    story: "Go Global помогли мне получить полный грант правительства Китая. Сейчас я учусь на магистратуре по Computer Science."
  },
  {
    id: 't2',
    name: 'Нурайым Абдылдаева',
    countryId: 'italy',
    university: 'Politecnico di Milano',
    image: 'https://images.unsplash.com/photo-1621252178229-236b28b2fd68?q=80&w=200&auto=format&fit=crop',
    quote: "Мечта дизайнера.",
    story: "Поступление в Италию казалось квестом, но менеджеры помогли со всеми документами. Теперь я живу в столице моды."
  },
  {
    id: 't3',
    name: 'Темирлан Жунушалиев',
    countryId: 'germany',
    university: 'TU Munich',
    image: 'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?q=80&w=200&auto=format&fit=crop',
    quote: "Бесплатно и качественно.",
    story: "В Германии ценят инженеров. Учеба сложная, но перспективы того стоят. Я уже прошел стажировку в BMW."
  },
  {
    id: 't4',
    name: 'Айпери Кудайбергенова',
    countryId: 'spain',
    university: 'Univ. of Barcelona',
    image: 'https://images.unsplash.com/photo-1510227272981-87123e259b17?q=80&w=200&auto=format&fit=crop',
    quote: "Учеба как праздник.",
    story: "Барселона заряжает энергией. Уровень преподавания на высоте, а климат позволяет учиться на свежем воздухе круглый год."
  },
  {
    id: 't5',
    name: 'Бекзат Сулайманов',
    countryId: 'usa',
    university: 'NYU',
    image: 'https://images.unsplash.com/photo-1563804828118-02d2c1ecbc8d?q=80&w=200&auto=format&fit=crop',
    quote: "Нью-Йорк не спит.",
    story: "Темп жизни бешеный, но это того стоит. Огромная библиотека, связи, нетворкинг — все это дает NYU."
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "Нужно ли знать язык страны для поступления?",
    answer: "Не всегда. Во многих странах (Китай, Япония, Европа) есть программы на английском языке. Однако, для комфортной жизни базовое знание местного языка приветствуется. Мы также помогаем с подбором языковых курсов."
  },
  {
    question: "Помогаете ли вы с получением визы?",
    answer: "Да, визовая поддержка — одна из наших ключевых услуг. Мы помогаем собрать пакет документов, заполнить анкеты и подготовиться к интервью в консульстве."
  },
  {
    question: "Есть ли возможность получить стипендию или грант?",
    answer: "Безусловно. Мы активно работаем с программами, предоставляющими полное или частичное финансирование, особенно в Китае, США и Германии."
  },
  {
    question: "Сколько стоят ваши услуги?",
    answer: "Стоимость зависит от выбранного пакета услуг (от простой консультации до полного сопровождения «под ключ»). Оставьте заявку, и мы вышлем вам актуальный прайс."
  }
];

export const CONTACT_INFO = {
  phone: "+996 (999) 53-00-92",
  email: "info@goglobal.education",
  address: "г. Бишкек, ул Юнусалиева 80 (ololoPlanet)",
  addressLink: "https://go.2gis.com/EQmnC",
  instagram: "https://www.instagram.com/go_global_official/"
};