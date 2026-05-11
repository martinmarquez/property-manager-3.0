export interface BlogPost {
  slug: string;
  category: 'product' | 'guides' | 'news' | 'market';
  date: string;
  readTime: number;
  author: { name: string; initials: string };
  content: {
    'es-AR': { title: string; excerpt: string; body: string };
    en: { title: string; excerpt: string; body: string };
  };
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'lanzamiento-corredor',
    category: 'news',
    date: '2026-05-01',
    readTime: 4,
    author: { name: 'Martín Márquez', initials: 'MM' },
    content: {
      'es-AR': {
        title: 'Corredor ya está disponible: el CRM inmobiliario con IA para Argentina',
        excerpt: 'Después de meses de desarrollo junto a corredores de todo el país, lanzamos la primera versión pública de Corredor.',
        body: `## Un CRM pensado para la realidad argentina

Corredor nació de una necesidad concreta: los CRMs genéricos no entienden cómo opera una inmobiliaria en Argentina.

## ¿Qué incluye esta primera versión?

- **Gestión de propiedades** con publicación automática en portales
- **Pipeline de ventas** con tablero Kanban visual
- **Bandeja unificada** para WhatsApp, email y portales
- **Copiloto IA** que responde consultas y genera descripciones
- **Portal de propietarios e inquilinos**
- **Cobros y liquidaciones** con integración bancaria

## Probalo gratis

Corredor tiene una prueba gratuita de 14 días, sin tarjeta de crédito.`,
      },
      en: {
        title: 'Corredor is live: the AI-powered real estate CRM for Argentina',
        excerpt: 'After months of development alongside brokers across the country, we launch the first public version of Corredor.',
        body: `## A CRM built for the Argentine market

Corredor was born from a concrete need: generic CRMs don't understand how real estate agencies operate in Argentina.

## What's included in this first release?

- **Property management** with auto-publishing to listing sites
- **Sales pipeline** with visual Kanban board
- **Unified inbox** for WhatsApp, email, and portals
- **AI Copilot** that answers inquiries and generates descriptions
- **Owner and tenant portals**
- **Billing and settlements** with bank integration

## Try it free

Corredor has a 14-day free trial, no credit card required.`,
      },
    },
  },
  {
    slug: 'crm-inmobiliario-argentina-guia',
    category: 'guides',
    date: '2026-04-20',
    readTime: 7,
    author: { name: 'Federico Ruiz', initials: 'FR' },
    content: {
      'es-AR': {
        title: 'Guía completa: cómo elegir un CRM inmobiliario en Argentina (2026)',
        excerpt: 'Analizamos qué funcionalidades necesita una inmobiliaria argentina y qué buscar en un CRM moderno.',
        body: `## ¿Por qué necesitás un CRM inmobiliario?

Si todavía gestionás tu inmobiliaria con planillas de Excel y WhatsApp personal, estás perdiendo tiempo y oportunidades.

## Las 7 funcionalidades esenciales

- **Gestión de propiedades** con publicación en portales
- **Pipeline de ventas** visual tipo Kanban
- **Bandeja unificada** de WhatsApp, email y portales
- **Facturación en pesos** con ajustes por IPC
- **Portal de propietarios** autoservicio
- **IA integrada** para respuestas automáticas
- **Soporte local** que entienda la operación argentina`,
      },
      en: {
        title: 'Complete guide: how to choose a real estate CRM in Argentina (2026)',
        excerpt: 'We analyze what features an Argentine real estate agency needs and what to look for in a modern CRM.',
        body: `## Why do you need a real estate CRM?

If you're still managing your agency with Excel spreadsheets and personal WhatsApp, you're losing time and opportunities.

## The 7 essential features

- **Property management** with portal publishing
- **Visual sales pipeline** Kanban-style
- **Unified inbox** for WhatsApp, email, and portals
- **Billing in pesos** with CPI adjustments
- **Self-service owner portal**
- **Integrated AI** for auto-responses
- **Local support** that understands Argentine operations`,
      },
    },
  },
  {
    slug: 'migrar-tokko-a-corredor',
    category: 'product',
    date: '2026-04-10',
    readTime: 5,
    author: { name: 'Sofía Delgado', initials: 'SD' },
    content: {
      'es-AR': {
        title: 'Cómo migrar de Tokko Broker a Corredor en 48 horas',
        excerpt: 'Guía paso a paso para pasar todas tus propiedades, contactos e historial de Tokko a Corredor sin perder datos.',
        body: `## ¿Por qué migrar desde Tokko?

Tokko Broker fue una herramienta pionera pero el mercado evoluciona. Hoy los corredores necesitan IA, bandeja unificada de WhatsApp y portales de propietarios.

## El proceso paso a paso

### Paso 1: Exportá tus datos
Desde el panel de Tokko, exportá tus propiedades y contactos en formato CSV.

### Paso 2: Envianos el archivo
Nuestro equipo mapea los campos automáticamente.

### Paso 3: Revisá y confirmá
Te mostramos una vista previa de cómo quedan tus datos en Corredor.

### Paso 4: Empezá a trabajar
En menos de 48 horas tenés todo listo.`,
      },
      en: {
        title: 'How to migrate from Tokko Broker to Corredor in 48 hours',
        excerpt: 'Step-by-step guide to move all your properties, contacts, and history from Tokko to Corredor without losing data.',
        body: `## Why migrate from Tokko?

Tokko Broker was a pioneering tool but the market evolves. Today brokers need AI, unified WhatsApp inbox, and owner portals.

## The step-by-step process

### Step 1: Export your data
From the Tokko dashboard, export your properties and contacts in CSV format.

### Step 2: Send us the file
Our team maps the fields automatically.

### Step 3: Review and confirm
We show you a preview of how your data looks in Corredor.

### Step 4: Start working
In under 48 hours, everything is ready.`,
      },
    },
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
