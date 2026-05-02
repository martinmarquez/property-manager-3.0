# Preguntas frecuentes — Funciones de IA

**Última actualización:** 2026-05-01
**Versión:** Phase F

---

## Privacidad y aislamiento de datos

### ¿Mis datos se comparten con otras inmobiliarias?

**No.** Cada inmobiliaria en Corredor opera en un entorno completamente aislado (tenant isolation). Esto significa que:

- El Copiloto IA solo consulta los datos de tu propia cuenta.
- La Búsqueda Inteligente solo devuelve resultados de tus propiedades, contactos, leads y documentos.
- Las descripciones generadas por IA se basan únicamente en los atributos de tu propiedad.

Ningún resultado puede incluir, accidental o intencionalmente, información de otro usuario o inmobiliaria. Este aislamiento está verificado técnicamente con controles en la base de datos y en cada consulta al vector store.

### ¿Anthropic (creadores de Claude) puede ver mis datos?

Corredor usa modelos de IA de Anthropic para generar respuestas. Los prompts enviados a la API incluyen fragmentos de tus datos de CRM para construir respuestas grounded. Consulta los términos del servicio de Anthropic y la política de privacidad de Corredor para más detalles sobre cómo se maneja la información enviada a la API.

---

## Límites de consultas

### ¿Cuántas consultas puedo hacer al Copiloto por mes?

Los límites dependen del plan de tu inmobiliaria:

| Plan | Consultas por usuario / mes |
|---|---|
| Free | 50 |
| Starter | 50 |
| Growth | Sin límite |
| Enterprise | Sin límite |

Una "consulta" es cada mensaje que enviás al Copiloto (cada turno de conversación).

### ¿Qué pasa cuando llego al límite?

Aparece un banner informativo en la interfaz del Copiloto y las consultas adicionales quedan bloqueadas hasta el inicio del próximo mes de facturación. Podés ampliar tu cuota comprando un add-on desde **Configuración → Plan → Add-ons de Copiloto IA**.

### ¿Las búsquedas inteligentes (⌘K) también tienen límite?

No. La Búsqueda Inteligente (Smart Search) no consume cuota del Copiloto y no tiene límites de uso.

### ¿La generación de descripciones con IA tiene límite?

La generación de descripciones no tiene un límite mensual de uso. Se descuenta del presupuesto de IA de tu plan, pero en los planes actuales no existe un tope de cantidad de descripciones generadas.

---

## Edición de contenido generado por IA

### ¿Puedo editar el contenido que genera la IA?

**Siempre.** El contenido generado por IA es un punto de partida, nunca una publicación automática.

- Las **descripciones** se abren en un editor completamente editable antes de guardar. Podés modificar, ampliar o acortar el texto libremente.
- Las **respuestas del Copiloto** son solo texto — podés copiarlas y editarlas donde las vayas a usar.
- Las **acciones sugeridas** (como enviar un mensaje por WhatsApp) muestran el borrador completo para que puedas editarlo antes de confirmar.

Ninguna función de IA modifica datos de tu CRM sin que hagas clic explícito en un botón de confirmación.

### ¿Puedo usar el contenido generado para mis publicaciones?

Sí. El texto generado es tuyo para usar, editar y publicar donde quieras. Verificá siempre que el contenido sea preciso y coherente con los datos reales de la propiedad antes de publicarlo.

---

## Precisión de las descripciones

### ¿Qué tan precisas son las descripciones generadas?

Las descripciones se basan **únicamente en los atributos cargados en la ficha de la propiedad**. El sistema está diseñado para no inventar información:

- Si `cochera` no está marcado como amenity, la descripción no la menciona.
- Si `m² cubiertos` está en blanco, la descripción no menciona superficie.
- Si el precio no está cargado, la descripción no incluye precio (a menos que lo hayas puesto en "Destacar").

La precisión del texto resultante depende directamente de la calidad y completitud de los datos que cargaste en la ficha. **Cuantos más atributos completes, mejor la descripción.**

### ¿Por qué la descripción no menciona algo que sé sobre la propiedad?

La IA solo puede incluir lo que está cargado en el sistema. Si sabés que la propiedad tiene una característica especial que no está en los atributos estándar (ej. "vista panorámica al río"), podés:
1. Cargarla como amenity o en el campo de notas de la propiedad.
2. Mencionarla en el campo **"Destacar"** al momento de generar la descripción.

---

## Calidad y comportamiento del Copiloto

### ¿El Copiloto puede equivocarse?

Sí. El Copiloto puede cometer errores de interpretación, especialmente en consultas ambiguas o muy complejas. Siempre verificá los resultados críticos directamente en las fichas correspondientes antes de tomar decisiones importantes.

### ¿Qué pasa si le pregunto algo que no tiene que ver con el CRM?

El Copiloto está diseñado para trabajar únicamente con los datos de tu cartera. Si hacés una consulta fuera de ese ámbito (ej. "escribime un poema"), el Copiloto responde educadamente que esa tarea está fuera de su alcance y te sugiere cómo podría ayudarte dentro del CRM.

### ¿Las respuestas del Copiloto inventan propiedades o contactos?

No. Cada referencia en una respuesta del Copiloto corresponde a una entidad real de tu base de datos. El sistema tiene controles técnicos que impiden que se mencionen propiedades o contactos que no fueron parte del contexto de recuperación usado para generar la respuesta.

---

## Sesiones y privacidad del Copiloto

### ¿Se guardan mis conversaciones con el Copiloto?

Sí. Las sesiones se guardan y podés acceder al historial desde el menú lateral en `/copilot`. Las sesiones expiran tras 24 horas de inactividad pero quedan archivadas (no se eliminan) a efectos de auditoría.

### ¿Cuánto dura el contexto de una conversación?

El Copiloto recuerda los últimos **20 turnos** dentro de una sesión activa. Si una sesión expiró (más de 24 hs de inactividad), el contexto anterior no está disponible en la nueva sesión.

### ¿Cómo empiezo una conversación sin contexto previo?

Hacé clic en **"Nueva conversación"** en la página del Copiloto o en el panel flotante. Eso crea una sesión nueva sin ningún contexto de sesiones anteriores.
