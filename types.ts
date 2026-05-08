export interface University {
  name: string;
  description: string;
  images: string[]; // Changed from single image to array
}

export interface CostData {
  tuition: { min: number; max: number }; // Annual in USD
  living: { min: number; max: number }; // Annual in USD
}

export interface Country {
  id: string;
  name: string;
  region: 'Asia' | 'Europe' | 'USA';
  description: string;
  fullDescription?: string; 
  image: string;
  universities: University[];
  costs: CostData;
  coordinates: { top: string; left: string; };
}

export interface Testimonial {
  id: string;
  name: string;
  university: string;
  countryId: string;
  image: string;
  quote: string;
  story: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface SiteConfig {
  heroImage: string;
  aboutImage1: string;
  aboutImage2: string;
  partnerUniversities: { name: string, highlighted?: boolean, highlightColor?: string }[];
}

export interface ContactFormState {
  name: string;
  phone: string;
  email: string;
  country: string;
  comment: string;
}