import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Country, Testimonial, FAQItem, VisibilityConfig, ContactConfig } from './types';
import { DEFAULT_VISIBILITY, DEFAULT_REGIONS } from './types';
import { COUNTRIES, TESTIMONIALS, FAQS, CONTACT_INFO } from './constants';

export type HomeText = {
  heroBadge: string;
  heroTitle: string;
  heroAccent: string;
  heroSubtitle: string;
  heroCtaPrimary: string;
  heroCtaSecondary: string;
  aboutBadge: string;
  aboutTitle: string;
  aboutAccent: string;
  aboutText1: string;
  aboutText2: string;
  aboutCta: string;
  aboutStats: { value: string; label: string }[];
  destinationsTitle: string;
  faqTitle: string;
  testimonialsTitle: string;
};

// Defaults mirror the original hard-coded copy 1:1 — the site renders
// identically until an admin overrides a field.
export const DEFAULT_HOME_TEXT: HomeText = {
  heroBadge: '🚀 Твой билет в будущее',
  heroTitle: 'Учись. Путешествуй.',
  heroAccent: 'Живи ярко!',
  heroSubtitle: 'Помогаем поступить в топовые вузы мира.\nСША, Европа, Азия — выбирай свой кампус мечты.',
  heroCtaPrimary: 'Выбрать ВУЗ',
  heroCtaSecondary: 'Как это работает?',
  aboutBadge: 'Образовательный туризм',
  aboutTitle: 'Собери чемодан',
  aboutAccent: 'в большое будущее.',
  aboutText1: 'Go Global — это не просто агентство, это твой штурман в мире образования. Мы превращаем сложный процесс переезда в захватывающее путешествие.',
  aboutText2: 'Тысячи наших студентов уже гуляют по улицам Лондона, учатся в небоскребах Торонто и запускают стартапы в Калифорнии. Мы упрощаем границы, чтобы ты мог расширять горизонты.',
  aboutCta: 'Записаться на консультацию',
  aboutStats: [
    { value: '10+', label: 'Лет полета' },
    { value: '500+', label: 'Вузов-партнеров' },
    { value: '∞', label: 'Возможностей' },
  ],
  destinationsTitle: 'Куда поедем учиться?',
  faqTitle: 'Часто задаваемые вопросы',
  testimonialsTitle: 'Студенты Go Global',
};

type DataStore = {
  countries: Country[];
  testimonials: Testimonial[];
  faqs: FAQItem[];
  contactInfo: ContactConfig;
  siteConfig: {
    heroImage: string;
    aboutImage1: string;
    aboutImage2: string;
    loaderTagline?: string;
    partnerUniversities?: { name: string; highlighted?: boolean; highlightColor?: string }[];
    visibility?: VisibilityConfig;
    regions?: { id: string; name: string }[];
    homeText?: HomeText;
  };
};

const defaultSiteConfig = {
  heroImage: 'https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=1920&auto=format&fit=crop',
  aboutImage1: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop',
  aboutImage2: 'https://images.unsplash.com/photo-1543269664-7eef42226a21?q=80&w=600&auto=format&fit=crop',
  partnerUniversities: [
    { name: 'Arizona State University', highlighted: true, highlightColor: 'text-accent-500' },
    { name: 'University of Canada West' },
    { name: 'EU Business School' },
  ],
  loaderTagline: 'Образование за рубежом',
  visibility: DEFAULT_VISIBILITY,
  regions: DEFAULT_REGIONS,
  homeText: DEFAULT_HOME_TEXT,
};

const defaultContactInfo: ContactConfig = {
  ...CONTACT_INFO,
  whatsappNumber: '996999530092',
  whatsappMessage: 'Добрый день! Пишу с сайта GoGlobal!',
};

const DataContext = createContext<{ data: DataStore; refresh: () => void }>({
  data: {
    countries: COUNTRIES,
    testimonials: TESTIMONIALS,
    faqs: FAQS,
    contactInfo: defaultContactInfo,
    siteConfig: defaultSiteConfig,
  },
  refresh: () => {},
});

export const useData = () => useContext(DataContext);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<DataStore>({
    countries: COUNTRIES,
    testimonials: TESTIMONIALS,
    faqs: FAQS,
    contactInfo: defaultContactInfo,
    siteConfig: defaultSiteConfig,
  });

  const fetchData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const json = await res.json();
        // Merge defaults to ensure missing fields are filled
        const merged: DataStore = {
          ...json,
          contactInfo: { ...defaultContactInfo, ...(json.contactInfo || {}) },
          siteConfig: {
            ...defaultSiteConfig,
            ...(json.siteConfig || {}),
            visibility: { ...DEFAULT_VISIBILITY, ...(json.siteConfig?.visibility || {}) },
            regions:
              json.siteConfig?.regions && json.siteConfig.regions.length
                ? json.siteConfig.regions
                : DEFAULT_REGIONS,
            // Deep-merge so a partially-overridden homeText keeps defaults for the rest.
            homeText: { ...DEFAULT_HOME_TEXT, ...(json.siteConfig?.homeText || {}) },
          },
        };
        setData(merged);
      }
    } catch (e) {
      // ignore — keep defaults
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return <DataContext.Provider value={{ data, refresh: fetchData }}>{children}</DataContext.Provider>;
};
