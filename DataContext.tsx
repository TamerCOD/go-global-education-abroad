import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Country, Testimonial, FAQItem, VisibilityConfig, ContactConfig } from './types';
import { DEFAULT_VISIBILITY, DEFAULT_REGIONS } from './types';
import { COUNTRIES, TESTIMONIALS, FAQS, CONTACT_INFO } from './constants';

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
