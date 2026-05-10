export interface University {
  name: string;
  description: string;
  images: string[];
  tuition?: number | null;     // Per-university yearly tuition in USD
  servicesCost?: number | null; // Our company's services cost for this university (USD/year)
  grantAvailable?: boolean;    // Whether this university offers grants/scholarships
  grantNote?: string;          // Free-form note about grants
}

export interface CostData {
  tuition: { min: number; max: number };
  living: { min: number; max: number };
}

export interface Country {
  id: string;
  name: string;
  region: string;
  description: string;
  fullDescription?: string;
  image: string;
  universities: University[];
  costs: CostData;
  servicesCost?: number | null;  // Country-level fallback for our company's services cost
  coordinates: { top: string; left: string };
}

export interface Testimonial {
  id: string;
  name: string;
  university: string;
  countryId: string;
  image?: string;
  quote: string;
  story: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface VisibilityConfig {
  hero: boolean;
  about: boolean;
  destinations: boolean;
  calculator: boolean;
  testimonials: boolean;
  faq: boolean;
  contact: boolean;
}

export interface ContactConfig {
  phone: string;
  email: string;
  address: string;
  addressLink: string;
  instagram: string;
  whatsappNumber?: string;
  whatsappMessage?: string;
}

export interface CalculatorConfig {
  title?: string;
  subtitle?: string;
  companyServicesCost?: number;   // Approximate price of our company's services per year (USD)
  checklistItems?: string[];      // Bullet items shown below the price
  disclaimer?: string;
  grantToggleLabel?: string;
  grantToggleHint?: string;
}

export interface SiteConfig {
  heroImage: string;
  aboutImage1: string;
  aboutImage2: string;
  partnerUniversities: { name: string; highlighted?: boolean; highlightColor?: string }[];
  loaderTagline?: string;
  visibility?: VisibilityConfig;
  regions?: { id: string; name: string }[];
  calculatorConfig?: CalculatorConfig;
}

export interface ContactFormState {
  name: string;
  phone: string;
  email: string;
  country: string;
  comment: string;
}

export const DEFAULT_VISIBILITY: VisibilityConfig = {
  hero: true,
  about: true,
  destinations: true,
  calculator: true,
  testimonials: true,
  faq: true,
  contact: true,
};

export const DEFAULT_REGIONS = [
  { id: 'Asia', name: 'Азия' },
  { id: 'Europe', name: 'Европа' },
  { id: 'USA', name: 'США' },
];
