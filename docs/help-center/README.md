# Help Center — Corredor

Artículos de ayuda para usuarios de Corredor CRM. Idioma primario: **español argentino (es-AR)**.

## Índice de artículos

### Phase D — Bandeja de entrada y portales

| Artículo | Ruta |
|---|---|
| Bandeja de entrada — guía de inicio | `es/bandeja-de-entrada.md` |
| Portales — conectar y sincronizar | `es/portales.md` |

### Phase F — Funciones de IA

| Artículo | Ruta | Descripción |
|---|---|---|
| [Guía del Copiloto IA](es/guia-copilot-ia.md) | `es/guia-copilot-ia.md` | Qué es el copiloto, cómo usarlo, consultas de ejemplo, acciones sugeridas, gestión de sesiones, botón flotante, límites de cuota |
| [Búsqueda Inteligente](es/busqueda-inteligente.md) | `es/busqueda-inteligente.md` | Cómo usar ⌘K, búsqueda por palabras clave vs. semántica, búsqueda por código de referencia, consejos, filtros de la página de resultados |
| [Cómo generar descripciones con IA](es/descripciones-ia.md) | `es/descripciones-ia.md` | Generar una descripción, selección de tono y portal, campo "Destacar", edición antes de guardar, gestión de borradores, sincronización con portales |
| [Preguntas frecuentes — IA](es/preguntas-frecuentes-ia.md) | `es/preguntas-frecuentes-ia.md` | Privacidad y aislamiento de datos, límites por plan, edición de contenido generado, precisión de descripciones, comportamiento del Copiloto |

### Phase G — Sitio web, facturación, reportes y tasaciones

| Artículo | Ruta | Descripción |
|---|---|---|
| [Sitio web — Guía completa del constructor](es/sitio-constructor-web.md) | `es/sitio-constructor-web.md` | Crear páginas, usar bloques (Hero, ListingGrid, ContactForm, etc.), elegir temas, configurar dominio personalizado con SSL, publicar, sincronización CRM, formularios |
| [Facturación — Preguntas frecuentes](es/facturacion-preguntas-frecuentes.md) | `es/facturacion-preguntas-frecuentes.md` | Prueba gratuita 14 días, upgrade/downgrade de plan, métodos de pago (Stripe, Mercado Pago), historial de facturas, facturación electrónica AFIP con CAE, cancelación |
| [Reportes y analítica — Tutoriales](es/reportes-y-analitica.md) | `es/reportes-y-analitica.md` | Navegar reportes operativos y estratégicos, filtros de fecha, exportar a CSV/Excel, configurar digestos por correo, tutorial pipeline y ROI de portales |
| [Tasaciones — Cómo crear un informe](es/tasaciones.md) | `es/tasaciones.md` | Asistente de 4 pasos: datos de la propiedad, selección de comparables por radio PostGIS, narrativa IA (<20s), generación y descarga del PDF con bloque de firma |
| [Planes y precios — Guía completa](es/planes-y-precios.md) | `es/planes-y-precios.md` | Qué incluye cada plan (Free, Starter, Growth, Enterprise), tabla comparativa de funciones, cómo elegir, preguntas frecuentes sobre límites y cambios de plan |

## Estructura

```
docs/help-center/
├── README.md          ← este archivo (índice)
└── es/                ← artículos en español argentino (primario)
    ├── bandeja-de-entrada.md
    ├── portales.md
    ├── guia-copilot-ia.md
    ├── busqueda-inteligente.md
    ├── descripciones-ia.md
    ├── preguntas-frecuentes-ia.md
    ├── sitio-constructor-web.md
    ├── facturacion-preguntas-frecuentes.md
    ├── reportes-y-analitica.md
    ├── tasaciones.md
    └── planes-y-precios.md
```

## Convenciones

- Idioma: **es-AR** — usar vos, vocabulario rioplatense, monedas en peso/dólar.
- Cada artículo incluye: fecha de última actualización, versión de fase, secciones con h2/h3, tablas donde aplique.
- Los artículos no deben inventar comportamientos no especificados en el spec de la fase correspondiente.
- Al actualizar funcionalidades: editar el artículo existente y actualizar la fecha, no crear duplicados.
