import React, { useState, useCallback } from 'react';
import {
  ArrowLeft, Plus, Edit3, Trash2, Eye, Calendar, ChevronDown,
  Upload, Search, MoreHorizontal, FileText, Clock, Check,
  Tag, Image, Save,
} from 'lucide-react';
import { C, F } from '../../components/copilot/tokens.js';

/* ─────────────────────────────────────────────────────────
   Corredor — Website Builder: SiteBlogPage
   Route: /site/blog
   ───────────────────────────────────────────────────────── */

// ─── Types ────────────────────────────────────────────────

type ViewMode = 'list' | 'editor';
type PostStatus = 'publicado' | 'borrador' | 'programado';
type FilterTab = 'todos' | 'publicado' | 'borrador' | 'programado';

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  status: PostStatus;
  date: string;
  scheduledDate?: string;
  author: string;
  category: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  featuredImage: string | null;
}

// ─── Mock data ────────────────────────────────────────────

const MOCK_POSTS: BlogPost[] = [
  {
    id: '1',
    title: '5 tips para vender tu propiedad rápido',
    slug: '5-tips-para-vender-tu-propiedad-rapido',
    status: 'publicado',
    date: '01/05/2026',
    author: 'Martín Márquez',
    category: 'Ventas',
    content: `# 5 tips para vender tu propiedad rápido

Vender una propiedad puede ser un proceso largo y estresante. Acá te compartimos cinco consejos clave para acelerar la venta.

## 1. Precio competitivo

Investigá el mercado y fijá un precio acorde a la zona y las características de tu inmueble.

## 2. Fotos profesionales

Las primeras impresiones cuentan. Invertí en un fotógrafo profesional para destacar los mejores ángulos.

## 3. Home staging

Prepará tu propiedad para las visitas. Un espacio ordenado y bien decorado genera mayor interés.

## 4. Descripción atractiva

Redactá una descripción que resalte las ventajas únicas de la propiedad y del barrio.

## 5. Difusión amplia

Publicá en múltiples portales y redes sociales para maximizar la visibilidad.`,
    metaTitle: '5 tips para vender tu propiedad rápido | Corredor',
    metaDescription: 'Descubrí los mejores consejos para vender tu propiedad de forma rápida y al mejor precio.',
    featuredImage: null,
  },
  {
    id: '2',
    title: 'Guía de alquileres temporarios en CABA',
    slug: 'guia-de-alquileres-temporarios-en-caba',
    status: 'publicado',
    date: '28/04/2026',
    author: 'Lucía Fernández',
    category: 'Alquileres',
    content: `# Guía de alquileres temporarios en CABA

Todo lo que necesitás saber sobre alquileres temporarios en la Ciudad Autónoma de Buenos Aires.

## Marco legal

La normativa vigente establece requisitos específicos para alquileres temporarios...

## Zonas más demandadas

Palermo, Recoleta y Puerto Madero lideran la demanda de alquileres temporarios.`,
    metaTitle: 'Guía de alquileres temporarios en CABA | Corredor',
    metaDescription: 'Todo lo que necesitás saber sobre alquileres temporarios en Buenos Aires.',
    featuredImage: null,
  },
  {
    id: '3',
    title: 'Tendencias del mercado inmobiliario 2026',
    slug: 'tendencias-del-mercado-inmobiliario-2026',
    status: 'borrador',
    date: '25/04/2026',
    author: 'Martín Márquez',
    category: 'Mercado',
    content: `# Tendencias del mercado inmobiliario 2026

Un análisis de las principales tendencias que están transformando el sector inmobiliario este año.

## Digitalización

La tecnología sigue transformando cómo se compran y venden propiedades...`,
    metaTitle: 'Tendencias del mercado inmobiliario 2026 | Corredor',
    metaDescription: 'Las principales tendencias del mercado inmobiliario argentino en 2026.',
    featuredImage: null,
  },
  {
    id: '4',
    title: 'Cómo elegir el mejor barrio para vivir',
    slug: 'como-elegir-el-mejor-barrio-para-vivir',
    status: 'programado',
    scheduledDate: '05/05/2026',
    date: '20/04/2026',
    author: 'Lucía Fernández',
    category: 'Guías',
    content: `# Cómo elegir el mejor barrio para vivir

Elegir dónde vivir es una de las decisiones más importantes. Te ayudamos a evaluar los factores clave.

## Transporte y conectividad

Evaluá la cercanía a medios de transporte público y accesos principales.

## Servicios y comercios

La disponibilidad de supermercados, farmacias y centros de salud es fundamental.`,
    metaTitle: 'Cómo elegir el mejor barrio para vivir | Corredor',
    metaDescription: 'Factores clave para elegir el barrio ideal para vivir en Buenos Aires.',
    featuredImage: null,
  },
  {
    id: '5',
    title: 'Inversión en pozo: lo que debés saber',
    slug: 'inversion-en-pozo-lo-que-debes-saber',
    status: 'borrador',
    date: '18/04/2026',
    author: 'Martín Márquez',
    category: 'Inversiones',
    content: `# Inversión en pozo: lo que debés saber

Invertir en pozo puede ser muy rentable, pero requiere conocer los riesgos y las claves del negocio.

## Ventajas

- Precio inicial más bajo
- Valorización durante la construcción
- Financiación en cuotas`,
    metaTitle: 'Inversión en pozo: lo que debés saber | Corredor',
    metaDescription: 'Todo sobre inversión en pozo: ventajas, riesgos y consejos para invertir bien.',
    featuredImage: null,
  },
  {
    id: '6',
    title: 'Decoración para aumentar el valor de tu propiedad',
    slug: 'decoracion-para-aumentar-el-valor-de-tu-propiedad',
    status: 'borrador',
    date: '15/04/2026',
    author: 'Lucía Fernández',
    category: 'Tips',
    content: `# Decoración para aumentar el valor de tu propiedad

Pequeños cambios en la decoración pueden generar un gran impacto en el valor percibido de tu inmueble.

## Colores neutros

Pintá las paredes con colores claros y neutros para dar sensación de amplitud.

## Iluminación

Una buena iluminación transforma cualquier ambiente. Priorizá la luz natural.`,
    metaTitle: 'Decoración para aumentar el valor de tu propiedad | Corredor',
    metaDescription: 'Ideas de decoración para revalorizar tu propiedad antes de venderla.',
    featuredImage: null,
  },
];

const CATEGORIES = ['Ventas', 'Alquileres', 'Mercado', 'Guías', 'Inversiones', 'Tips'];

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'publicado', label: 'Publicados' },
  { id: 'borrador', label: 'Borradores' },
  { id: 'programado', label: 'Programados' },
];

// ─── Helpers ──────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function statusColor(status: PostStatus): { bg: string; text: string } {
  switch (status) {
    case 'publicado':
      return { bg: C.successFaint, text: C.success };
    case 'borrador':
      return { bg: 'rgba(232,138,20,0.12)', text: C.warning };
    case 'programado':
      return { bg: C.brandFaint, text: C.brand };
  }
}

function statusLabel(status: PostStatus): string {
  switch (status) {
    case 'publicado':  return 'Publicado';
    case 'borrador':   return 'Borrador';
    case 'programado': return 'Programado';
  }
}

// ─── Component ────────────────────────────────────────────

export default function SiteBlogPage() {
  const [view, setView] = useState<ViewMode>('list');
  const [filter, setFilter] = useState<FilterTab>('todos');
  const [posts] = useState<BlogPost[]>(MOCK_POSTS);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  // ── Editor state ──
  const [editorTitle, setEditorTitle] = useState('');
  const [editorSlug, setEditorSlug] = useState('');
  const [editorStatus, setEditorStatus] = useState<PostStatus>('borrador');
  const [editorContent, setEditorContent] = useState('');
  const [editorCategory, setEditorCategory] = useState('Ventas');
  const [editorDate, setEditorDate] = useState('');
  const [editorMetaTitle, setEditorMetaTitle] = useState('');
  const [editorMetaDescription, setEditorMetaDescription] = useState('');

  const filteredPosts = filter === 'todos'
    ? posts
    : posts.filter((p) => p.status === filter);

  const openEditor = useCallback((post?: BlogPost) => {
    if (post) {
      setEditingPost(post);
      setEditorTitle(post.title);
      setEditorSlug(post.slug);
      setEditorStatus(post.status);
      setEditorContent(post.content);
      setEditorCategory(post.category);
      setEditorDate(post.scheduledDate ?? post.date);
      setEditorMetaTitle(post.metaTitle);
      setEditorMetaDescription(post.metaDescription);
    } else {
      setEditingPost(null);
      setEditorTitle('');
      setEditorSlug('');
      setEditorStatus('borrador');
      setEditorContent('');
      setEditorCategory('Ventas');
      setEditorDate('');
      setEditorMetaTitle('');
      setEditorMetaDescription('');
    }
    setView('editor');
  }, []);

  const handleTitleChange = useCallback((value: string) => {
    setEditorTitle(value);
    setEditorSlug(slugify(value));
  }, []);

  // ── Shared styles ──

  const focusRing = '0 0 0 2px rgba(22,84,217,0.5)';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: C.bgBase,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    color: C.textPrimary,
    fontFamily: F.body,
    fontSize: 14,
    outline: 'none',
    minHeight: 44,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontFamily: F.body,
    fontSize: 12,
    fontWeight: 500,
    color: C.textSecondary,
    marginBottom: 6,
  };

  const primaryBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 20px',
    height: 44,
    background: C.brand,
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontFamily: F.body,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const secondaryBtn: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '0 20px',
    height: 44,
    background: 'transparent',
    color: C.textSecondary,
    border: `1px solid ${C.border}`,
    borderRadius: 8,
    fontFamily: F.body,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  // ════════════════════════════════════════════════════════
  // EDITOR VIEW
  // ════════════════════════════════════════════════════════

  if (view === 'editor') {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bgBase,
          color: C.textPrimary,
          fontFamily: F.body,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Top bar ── */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 24px',
            borderBottom: `1px solid ${C.border}`,
            background: C.bgRaised,
            minHeight: 64,
            flexShrink: 0,
          }}
        >
          <button type="button"
            onClick={() => setView('list')}
            aria-label="Volver a la lista de artículos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 44,
              height: 44,
              background: 'transparent',
              border: 'none',
              borderRadius: 8,
              color: C.textSecondary,
              cursor: 'pointer',
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <ArrowLeft size={20} />
          </button>

          <input
            type="text"
            value={editorTitle}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Título del artículo"
            aria-label="Título del artículo"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: C.textPrimary,
              fontFamily: F.display,
              fontSize: 20,
              fontWeight: 700,
              padding: '8px 0',
              minHeight: 44,
            }}
            onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          />

          {/* Status dropdown */}
          <div style={{ position: 'relative' }}>
            <button type="button"
              onClick={() => setStatusDropdownOpen(!statusDropdownOpen)}
              aria-label={`Estado del artículo: ${statusLabel(editorStatus)}`}
              aria-expanded={statusDropdownOpen}
              aria-haspopup="listbox"
              style={{
                ...secondaryBtn,
                gap: 6,
                padding: '0 14px',
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: statusColor(editorStatus).text,
                  flexShrink: 0,
                }}
              />
              {statusLabel(editorStatus)}
              <ChevronDown size={14} />
            </button>
            {statusDropdownOpen && (
              <ul
                role="listbox"
                aria-label="Seleccionar estado del artículo"
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: 4,
                  background: C.bgElevated,
                  border: `1px solid ${C.border}`,
                  borderRadius: 8,
                  padding: 4,
                  listStyle: 'none',
                  zIndex: 100,
                  minWidth: 160,
                }}
              >
                {(['publicado', 'borrador', 'programado'] as PostStatus[]).map((s) => (
                  <li key={s}>
                    <button type="button"
                      role="option"
                      aria-selected={editorStatus === s}
                      onClick={() => { setEditorStatus(s); setStatusDropdownOpen(false); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        width: '100%',
                        padding: '10px 12px',
                        background: editorStatus === s ? C.brandFaint : 'transparent',
                        border: 'none',
                        borderRadius: 6,
                        color: C.textPrimary,
                        fontFamily: F.body,
                        fontSize: 14,
                        cursor: 'pointer',
                        minHeight: 44,
                      }}
                      onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                      onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                    >
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: statusColor(s).text,
                        }}
                      />
                      {statusLabel(s)}
                      {editorStatus === s && <Check size={14} style={{ marginLeft: 'auto' }} />}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button type="button"
            aria-label="Guardar borrador del artículo"
            style={secondaryBtn}
            onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Save size={16} />
            Guardar borrador
          </button>

          <button type="button"
            aria-label="Publicar artículo"
            style={primaryBtn}
            onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
            onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
          >
            <Check size={16} />
            Publicar
          </button>
        </header>

        {/* ── Editor body ── */}
        <div
          style={{
            display: 'flex',
            flex: 1,
            overflow: 'hidden',
          }}
        >
          {/* Left — MDX textarea */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              padding: 24,
              overflow: 'auto',
            }}
          >
            <label
              htmlFor="mdx-editor"
              style={{
                ...labelStyle,
                marginBottom: 8,
              }}
            >
              Contenido (MDX / Markdown)
            </label>
            <textarea
              id="mdx-editor"
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              placeholder={`# Título del artículo\n\nEscribí el contenido de tu artículo usando Markdown...\n\n## Subtítulo\n\nTexto del párrafo con **negrita** y *cursiva*.\n\n- Elemento de lista\n- Otro elemento\n\n> Cita destacada`}
              aria-label="Editor de contenido del artículo en formato Markdown"
              style={{
                flex: 1,
                width: '100%',
                minHeight: 400,
                padding: 20,
                background: C.bgRaised,
                border: `1px solid ${C.border}`,
                borderRadius: 10,
                color: C.textPrimary,
                fontFamily: F.mono,
                fontSize: 14,
                lineHeight: 1.7,
                resize: 'vertical',
                outline: 'none',
                boxSizing: 'border-box',
                tabSize: 2,
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Right — sidebar */}
          <aside
            style={{
              width: 280,
              flexShrink: 0,
              borderLeft: `1px solid ${C.border}`,
              background: C.bgRaised,
              padding: 20,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
            aria-label="Opciones del artículo"
          >
            {/* Slug */}
            <div>
              <label htmlFor="post-slug" style={labelStyle}>Slug</label>
              <input
                id="post-slug"
                type="text"
                value={editorSlug}
                onChange={(e) => setEditorSlug(e.target.value)}
                placeholder="url-del-articulo"
                aria-label="Slug del artículo"
                style={{ ...inputStyle, fontFamily: F.mono, fontSize: 13 }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="post-category" style={labelStyle}>Categoría</label>
              <select
                id="post-category"
                value={editorCategory}
                onChange={(e) => setEditorCategory(e.target.value)}
                aria-label="Categoría del artículo"
                style={{
                  ...inputStyle,
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238DA0C0' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: 36,
                  cursor: 'pointer',
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="post-date" style={labelStyle}>Fecha de publicación</label>
              <input
                id="post-date"
                type="date"
                value={editorDate}
                onChange={(e) => setEditorDate(e.target.value)}
                aria-label="Fecha de publicación del artículo"
                style={{ ...inputStyle, cursor: 'pointer' }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            {/* Featured image */}
            <div>
              <span style={labelStyle}>Imagen destacada</span>
              <button type="button"
                aria-label="Subir imagen destacada del artículo"
                style={{
                  width: '100%',
                  height: 120,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: C.bgBase,
                  border: `2px dashed ${C.border}`,
                  borderRadius: 10,
                  color: C.textTertiary,
                  fontFamily: F.body,
                  fontSize: 13,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                <Upload size={24} />
                Subir imagen
              </button>
            </div>

            {/* SEO section */}
            <div
              style={{
                borderTop: `1px solid ${C.border}`,
                paddingTop: 20,
              }}
            >
              <h4
                style={{
                  fontFamily: F.display,
                  fontSize: 13,
                  fontWeight: 700,
                  color: C.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: 14,
                  marginTop: 0,
                }}
              >
                SEO
              </h4>

              <div style={{ marginBottom: 14 }}>
                <label htmlFor="meta-title" style={labelStyle}>Meta título</label>
                <input
                  id="meta-title"
                  type="text"
                  value={editorMetaTitle}
                  onChange={(e) => setEditorMetaTitle(e.target.value)}
                  placeholder="Título para buscadores"
                  aria-label="Meta título para SEO"
                  style={inputStyle}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              <div>
                <label htmlFor="meta-description" style={labelStyle}>Meta descripción</label>
                <textarea
                  id="meta-description"
                  value={editorMetaDescription}
                  onChange={(e) => setEditorMetaDescription(e.target.value)}
                  placeholder="Descripción para buscadores (máx. 160 caracteres)"
                  aria-label="Meta descripción para SEO"
                  rows={3}
                  style={{
                    ...inputStyle,
                    resize: 'vertical',
                    minHeight: 80,
                  }}
                  onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                  onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════
  // LIST VIEW
  // ════════════════════════════════════════════════════════

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bgBase,
        color: C.textPrimary,
        fontFamily: F.body,
        padding: 32,
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: F.display,
            fontSize: 28,
            fontWeight: 700,
            color: C.textPrimary,
          }}
        >
          Blog
        </h1>
        <button type="button"
          onClick={() => openEditor()}
          aria-label="Crear nuevo artículo de blog"
          style={primaryBtn}
          onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
          onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
        >
          <Plus size={18} />
          + Nuevo artículo
        </button>
      </div>

      {/* ── Filter tabs ── */}
      <nav
        role="tablist"
        aria-label="Filtrar artículos por estado"
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 24,
          borderBottom: `1px solid ${C.border}`,
          paddingBottom: 0,
        }}
      >
        {FILTER_TABS.map((tab) => {
          const isActive = filter === tab.id;
          return (
            <button type="button"
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls="posts-table"
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '12px 20px',
                minHeight: 44,
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${isActive ? C.brand : 'transparent'}`,
                color: isActive ? C.textPrimary : C.textSecondary,
                fontFamily: F.body,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                marginBottom: -1,
                transition: 'color 0.15s, border-color 0.15s',
              }}
              onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
              onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* ── Posts table ── */}
      <div
        id="posts-table"
        role="tabpanel"
        aria-label="Lista de artículos del blog"
        style={{
          background: C.bgRaised,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 120px 120px 150px 80px',
            gap: 12,
            padding: '14px 20px',
            borderBottom: `1px solid ${C.border}`,
            background: C.bgElevated,
          }}
          role="row"
          aria-label="Encabezado de la tabla de artículos"
        >
          <span
            style={{
              fontFamily: F.body,
              fontSize: 12,
              fontWeight: 600,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="columnheader"
          >
            Título
          </span>
          <span
            style={{
              fontFamily: F.body,
              fontSize: 12,
              fontWeight: 600,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="columnheader"
          >
            Estado
          </span>
          <span
            style={{
              fontFamily: F.body,
              fontSize: 12,
              fontWeight: 600,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="columnheader"
          >
            Fecha
          </span>
          <span
            style={{
              fontFamily: F.body,
              fontSize: 12,
              fontWeight: 600,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="columnheader"
          >
            Autor
          </span>
          <span
            style={{
              fontFamily: F.body,
              fontSize: 12,
              fontWeight: 600,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
            role="columnheader"
          >
            Acciones
          </span>
        </div>

        {/* Table rows */}
        {filteredPosts.length === 0 ? (
          <div
            style={{
              padding: '48px 20px',
              textAlign: 'center',
              color: C.textTertiary,
              fontFamily: F.body,
              fontSize: 14,
            }}
          >
            <FileText size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
            <p style={{ margin: 0 }}>No hay artículos en esta categoría</p>
          </div>
        ) : (
          filteredPosts.map((post, idx) => {
            const sc = statusColor(post.status);
            return (
              <div
                key={post.id}
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 120px 120px 150px 80px',
                  gap: 12,
                  padding: '16px 20px',
                  alignItems: 'center',
                  borderBottom: idx < filteredPosts.length - 1
                    ? `1px solid ${C.border}`
                    : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onClick={() => openEditor(post)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openEditor(post);
                  }
                }}
                tabIndex={0}
                aria-label={`Editar artículo: ${post.title}`}
                onMouseEnter={(e) => { e.currentTarget.style.background = C.bgElevated; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Title */}
                <span
                  role="cell"
                  style={{
                    fontFamily: F.body,
                    fontSize: 14,
                    fontWeight: 500,
                    color: C.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {post.title}
                </span>

                {/* Status badge */}
                <span role="cell">
                  <span
                    aria-label={`Estado: ${statusLabel(post.status)}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 6,
                      background: sc.bg,
                      color: sc.text,
                      fontFamily: F.body,
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {post.status === 'publicado' && <Check size={12} />}
                    {post.status === 'borrador' && <Edit3 size={12} />}
                    {post.status === 'programado' && <Clock size={12} />}
                    {statusLabel(post.status)}
                  </span>
                </span>

                {/* Date */}
                <span
                  role="cell"
                  style={{
                    fontFamily: F.body,
                    fontSize: 13,
                    color: C.textSecondary,
                  }}
                >
                  {post.status === 'programado' && post.scheduledDate
                    ? post.scheduledDate
                    : post.date}
                </span>

                {/* Author */}
                <span
                  role="cell"
                  style={{
                    fontFamily: F.body,
                    fontSize: 13,
                    color: C.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {post.author}
                </span>

                {/* Actions */}
                <span
                  role="cell"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); openEditor(post); }}
                    aria-label={`Editar artículo ${post.title}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      minWidth: 44,
                      minHeight: 44,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      color: C.textTertiary,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.textPrimary; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.textTertiary; }}
                    onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Edit3 size={16} />
                  </button>
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); }}
                    aria-label={`Eliminar artículo ${post.title}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 36,
                      height: 36,
                      minWidth: 44,
                      minHeight: 44,
                      background: 'transparent',
                      border: 'none',
                      borderRadius: 6,
                      color: C.textTertiary,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#E83B3B'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.textTertiary; }}
                    onFocus={(e) => { e.currentTarget.style.boxShadow = focusRing; }}
                    onBlur={(e) => { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <Trash2 size={16} />
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── Footer summary ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: 16,
          padding: '0 4px',
        }}
      >
        <span
          style={{
            fontFamily: F.body,
            fontSize: 13,
            color: C.textTertiary,
          }}
        >
          {filteredPosts.length} {filteredPosts.length === 1 ? 'artículo' : 'artículos'}
        </span>
        <span
          style={{
            fontFamily: F.body,
            fontSize: 13,
            color: C.textTertiary,
          }}
        >
          {posts.filter((p) => p.status === 'publicado').length} publicados
          {' · '}
          {posts.filter((p) => p.status === 'borrador').length} borradores
          {' · '}
          {posts.filter((p) => p.status === 'programado').length} programados
        </span>
      </div>
    </div>
  );
}
