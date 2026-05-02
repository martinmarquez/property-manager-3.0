# Búsqueda Inteligente (Smart Search)

**Última actualización:** 2026-05-01
**Versión:** Phase F

---

## ¿Qué es la Búsqueda Inteligente?

La Búsqueda Inteligente reemplaza las barras de búsqueda dispersas de cada sección con **una sola entrada unificada** que busca en todo tu CRM al mismo tiempo: propiedades, contactos, leads, documentos y conversaciones.

Funciona con dos modos combinados:
- **Búsqueda por palabras clave** — encuentra coincidencias exactas o aproximadas en nombres, direcciones y códigos de referencia.
- **Búsqueda semántica** — entiende el significado de tu consulta y devuelve resultados relevantes aunque no uses las palabras exactas.

---

## Cómo abrir la búsqueda

| Sistema operativo | Atajo |
|---|---|
| Mac | `⌘K` |
| Windows / Linux | `Ctrl+K` |

También podés hacer clic en la barra de búsqueda del encabezado global en cualquier página.

Para cerrar la paleta, presioná `Esc` o hacé clic fuera del panel.

---

## La paleta de comandos (⌘K)

La paleta de comandos aparece centrada en la pantalla. Los resultados se actualizan automáticamente mientras escribís (debounce de 300 ms) — no hace falta presionar Enter.

```
┌──────────────────────────────────────────────────────────────┐
│  🔍  Buscar en Corredor…                          ⌘K  ✕    │
├──────────────────────────────────────────────────────────────┤
│  PROPIEDADES                                                 │
│    🏠  Av. Corrientes 1234, CABA       CAP-0142  USD 250K   │
│    🏠  Thames 890, Palermo             PAL-0089  USD 195K   │
│  CONTACTOS                                                   │
│    👤  Juan García                    juan@ejemplo.com      │
│  LEADS                                                       │
│    📋  Juan García → Thames 890        Pipeline: Activo      │
│  ─────────────────────────────────────────────────────────  │
│  Buscar "corrientes" en todos los resultados →              │
└──────────────────────────────────────────────────────────────┘
```

La paleta muestra hasta **3 resultados por tipo de entidad**. Para ver todos, hacé clic en "Buscar en todos los resultados" o presioná `Enter`.

### Navegación con teclado

| Tecla | Acción |
|---|---|
| `↑` / `↓` | Navegar entre resultados |
| `Enter` | Abrir el resultado seleccionado |
| `Esc` | Cerrar la paleta |

---

## Búsquedas recientes

Cuando la paleta está abierta y el campo está vacío, se muestran las últimas 10 búsquedas recientes para acceso rápido.

---

## Búsqueda por palabras clave vs. búsqueda semántica

### Búsqueda por palabras clave
Ideal para nombres, direcciones parciales y códigos de referencia. La búsqueda por palabras clave es muy rápida (< 50 ms) y encuentra coincidencias aunque el texto esté incompleto.

Ejemplos:
- `"corrientes"` → propiedades y documentos que mencionan "Corrientes"
- `"Juan Gar"` → contactos cuyo nombre empieza con "Juan Gar"

### Búsqueda semántica
Ideal para descripciones y consultas con significado. El sistema entiende sinónimos y relaciones conceptuales.

Ejemplos:
- `"departamento luminoso con cochera en Belgrano"` → encuentra propiedades en Belgrano con estacionamiento y buena iluminación, aunque la descripción use palabras distintas.
- `"propiedades premium cerca del parque"` → devuelve propiedades de alta gama con acceso a espacios verdes.

Los resultados de ambos modos se combinan automáticamente usando un algoritmo de fusión (RRF) para que siempre veas lo más relevante primero.

---

## Búsqueda por código de referencia

Los códigos de referencia (ej. `CAP-0142`, `PAL-0089`) tienen **prioridad máxima** en los resultados. Si escribís un código exacto, esa propiedad aparece primero en menos de 100 ms.

Casos de uso:
- Un cliente te llama con el código de una propiedad que vio en el portal.
- Querés abrir una ficha directamente desde cualquier pantalla.

---

## Página de resultados completos (`/search`)

Cuando presionás `Enter` o hacés clic en "Ver todos los resultados", se abre la página `/search?q=tu-consulta` con:

- **Barra lateral izquierda** — filtrá por tipo de entidad:
  - Todos
  - Propiedades (con contador)
  - Contactos (con contador)
  - Leads (con contador)
  - Documentos (con contador)
  - Conversaciones (con contador)

- **Lista de resultados** — 20 resultados por página, ordenados por relevancia. Cada resultado muestra:
  - Ícono del tipo de entidad
  - Título y subtítulo
  - Fragmento destacado (texto coincidente resaltado)
  - Fecha de última actualización

---

## Qué busca y qué no busca

**Busca:**
- Propiedades: dirección, barrio, código de referencia, descripción, amenities
- Contactos: nombre, email, teléfono, empresa, notas
- Leads: nombre del contacto, dirección de la propiedad, notas
- Documentos: tipo, nombres de las partes
- Conversaciones: asunto, nombres de participantes, fragmentos de mensajes

**No busca (Phase F):**
- Datos de analytics
- Configuración de la cuenta
- Contenido de plantillas

---

## Consejos de búsqueda

- **Buscá por lo que recordás** — no hace falta la dirección completa. "Thame 8" devuelve "Thames 890".
- **Usá descripciones naturales** — "depto con terraza vista al río" puede encontrar propiedades que coinciden por semántica.
- **Para acceso rápido, escribí el código** — los códigos de referencia te llevan directo a la propiedad.
- **Filtrá por tipo** en la página de resultados si la consulta devuelve muchos resultados mixtos.
- **Las búsquedas recientes** están disponibles apenas abrís `⌘K` — útil para retomar un flujo de trabajo.
