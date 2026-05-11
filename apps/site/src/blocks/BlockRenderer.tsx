import type React from 'react';
import type { BlockData } from '../lib/types';
import { Hero } from './Hero';
import { ListingGrid } from './ListingGrid';
import { ListingDetail } from './ListingDetail';
import { ContactForm } from './ContactForm';
import { AgentBio } from './AgentBio';
import { Testimonials } from './Testimonials';
import { MapBlock } from './MapBlock';
import { Blog } from './Blog';
import { CTA } from './CTA';
import { Footer } from './Footer';
import { getListings } from '../lib/site-data';
import { formatPrice } from '../lib/format';
import type {
  HeroProps, ListingGridProps, ListingDetailProps,
  ContactFormProps, AgentBioProps, TestimonialsProps,
  MapProps, BlogProps, CTAProps, FooterProps,
} from '../lib/types';

interface BlockRendererProps {
  block: BlockData;
  tenantId: string;
  siteId: string;
  pageId: string;
}

export async function BlockRenderer({ block, tenantId, siteId, pageId }: BlockRendererProps): Promise<React.JSX.Element | null> {
  const p = block.props as unknown;

  switch (block.blockType) {
    case 'Hero':
      return <Hero {...(p as HeroProps)} />;

    case 'ListingGrid':
      return <ListingGrid {...(p as ListingGridProps)} tenantId={tenantId} />;

    case 'ListingDetail':
      return <ListingDetail {...(p as ListingDetailProps)} tenantId={tenantId} />;

    case 'ContactForm':
      return (
        <ContactForm
          {...(p as ContactFormProps)}
          siteId={siteId}
          pageId={pageId}
          blockId={block.id}
        />
      );

    case 'AgentBio':
      return <AgentBio {...(p as AgentBioProps)} />;

    case 'Testimonials':
      return <Testimonials {...(p as TestimonialsProps)} />;

    case 'Map': {
      const mapProps = p as MapProps;
      const listings = await getListings(tenantId, { limit: 100 });
      const pins = listings
        .filter((l) => l.lat != null && l.lng != null)
        .map((l) => {
          const pin: { id: string; title: string | null; lat: number; lng: number; thumbUrl?: string | null; priceLabel?: string } = {
            id: l.id,
            title: l.title,
            lat: l.lat!,
            lng: l.lng!,
          };
          if (l.thumbUrl != null) pin.thumbUrl = l.thumbUrl;
          if (l.priceAmount) pin.priceLabel = formatPrice(l.priceAmount, l.priceCurrency);
          return pin;
        });
      return <MapBlock {...mapProps} listings={pins} />;
    }

    case 'Blog':
      return <Blog {...(p as BlogProps)} />;

    case 'CTA':
      return <CTA {...(p as CTAProps)} />;

    case 'Footer':
      return <Footer {...(p as FooterProps)} />;

    default:
      return null;
  }
}
