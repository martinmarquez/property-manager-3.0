export type ThemeCode = 'moderno' | 'clasico' | 'oscuro' | 'tierra' | 'minimal';

export type BlockType =
  | 'Hero'
  | 'ListingGrid'
  | 'ListingDetail'
  | 'ContactForm'
  | 'AgentBio'
  | 'Testimonials'
  | 'Map'
  | 'Blog'
  | 'CTA'
  | 'Footer';

export interface SiteData {
  id: string;
  tenantId: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  themeCode: ThemeCode;
  brandSettings: Record<string, unknown>;
  customCss: string | null;
  customHeadHtml: string | null;
}

export interface PageData {
  id: string;
  siteId: string;
  slug: string;
  title: string;
  metaTitle: string | null;
  metaDescription: string | null;
  ogImageUrl: string | null;
  blocks: BlockData[];
}

export interface BlockData {
  id: string;
  blockType: BlockType;
  sortOrder: number;
  props: Record<string, unknown>;
}

export interface HeroProps {
  headline: string;
  subheadline?: string;
  ctaLabel?: string;
  ctaHref?: string;
  backgroundImageUrl?: string;
  overlayOpacity?: number;
  alignment?: 'left' | 'center' | 'right';
}

export interface ListingGridProps {
  title?: string;
  operationFilter?: string;
  propertyTypeFilter?: string;
  localityFilter?: string;
  limit?: number;
  columns?: 2 | 3 | 4;
}

export interface ListingDetailProps {
  propertyId: string;
}

export interface ContactFormProps {
  title?: string;
  subtitle?: string;
  fields?: string[];
  submitLabel?: string;
  successMessage?: string;
  notifyEmail?: string;
}

export interface AgentBioProps {
  name: string;
  role?: string;
  photoUrl?: string;
  bio?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
}

export interface TestimonialsProps {
  title?: string;
  items?: {
    quote: string;
    author: string;
    role?: string;
    photoUrl?: string;
    rating?: number;
  }[];
  layout?: 'carousel' | 'grid';
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  height?: string;
  showAllListings?: boolean;
  propertyIds?: string[];
}

export interface BlogProps {
  title?: string;
  posts?: {
    title: string;
    excerpt: string;
    imageUrl?: string;
    href: string;
    date: string;
  }[];
  layout?: 'list' | 'grid';
}

export interface CTAProps {
  headline: string;
  body?: string;
  buttonLabel: string;
  buttonHref: string;
  variant?: 'default' | 'accent' | 'outline';
}

export interface FooterProps {
  companyName?: string;
  logoUrl?: string;
  address?: string;
  phone?: string;
  email?: string;
  socialLinks?: { platform: string; url: string }[];
  links?: { label: string; href: string }[];
  showPoweredBy?: boolean;
}

export interface ListingCardData {
  id: string;
  referenceCode: string;
  title: string | null;
  propertyType: string;
  operationKind: string;
  priceAmount: string | null;
  priceCurrency: string;
  coveredAreaM2: number | null;
  totalAreaM2: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  locality: string | null;
  neighborhood: string | null;
  thumbUrl: string | null;
  lat: number | null;
  lng: number | null;
}
