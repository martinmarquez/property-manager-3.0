# Guía del Copiloto IA

**Última actualización:** 2026-05-01
**Versión:** Phase F

---

## ¿Qué es el Copiloto IA?

El Copiloto IA es tu asistente conversacional dentro de Corredor. Podés hacerle preguntas en lenguaje natural sobre tu cartera de propiedades, contactos, leads y pipeline — y recibir respuestas precisas, citadas y accionables, sin necesidad de navegar por filtros.

El Copiloto entiende el contexto de tu CRM: todas las respuestas están fundamentadas en tus propios datos, y nunca comparte información entre distintas inmobiliarias.

---

## Cómo acceder

### Página completa

Navegá a `/copilot` desde el menú lateral para abrir la interfaz de chat completa. Ahí podés ver el historial de sesiones y tener conversaciones más largas.

### Botón flotante (todas las páginas)

En cualquier página de Corredor, encontrás el botón `?` fijo en la esquina inferior derecha. Hacé clic para abrir un panel de chat compacto (400 × 600 px). Este panel tiene las mismas capacidades que la página completa, pero sin la barra lateral de sesiones.

> **Tip:** cuando abrís el panel flotante desde la ficha de una propiedad, el Copiloto ya conoce esa propiedad y podés hacerle preguntas específicas sobre ella sin tener que nombrarla.

---

## Consultas de ejemplo

El Copiloto entiende consultas en español argentino. Algunos ejemplos:

**Propiedades**
- "Mostrá propiedades de 3 ambientes en Palermo bajo USD 200k disponibles para alquiler"
- "¿Cuántas propiedades en venta tengo sin precio actualizado?"
- "Buscá departamentos con cochera en Belgrano"

**Contactos y leads**
- "¿Qué propiedades tiene Juan García como vendedor activo?"
- "¿Cuántos leads entraron esta semana y cuáles no fueron contactados?"
- "Mostrá contactos con consultas sobre 3 ambientes en los últimos 30 días"

**Pipeline**
- "¿Cómo está mi pipeline este mes?"
- "¿Cuántos leads vencen esta semana?"
- "Resumí el pipeline del mes actual"

**Documentos**
- "¿Cuál es la penalidad por rescisión en el Boleto de Av. Corrientes?"
- "¿Cuál es la fecha de escritura del contrato de Soler 456?"

---

## Sugerencias de acción

Cuando el Copiloto identifica una acción posible (como enviar una propiedad a un contacto), muestra una **tarjeta de acción** antes de ejecutar cualquier cosa:

```
┌─────────────────────────────────────────────────┐
│ 📤 Acción sugerida                              │
│                                                 │
│ Enviar por WhatsApp a Juan García:              │
│ "Hola Juan, te comparto esta propiedad:         │
│  [Thames 890 — PAL-0089]"                       │
│                                                 │
│  [✓ Enviar]  [✏ Editar]  [✗ Cancelar]        │
└─────────────────────────────────────────────────┘
```

**El Copiloto nunca ejecuta una acción sin tu confirmación explícita.** Podés editar el mensaje antes de enviarlo, o cancelar si no es lo que querías.

Las acciones disponibles incluyen:
- Enviar una propiedad por WhatsApp a un contacto
- Crear un recordatorio o tarea de seguimiento
- Abrir el compositor de mensajes del inbox

---

## Gestión de sesiones

Cada conversación es una **sesión**. Las sesiones guardan el contexto de los últimos 20 turnos y expiran tras 24 horas de inactividad (quedan archivadas, no borradas).

### Iniciar una nueva conversación
Hacé clic en **"Nueva conversación"** para comenzar una sesión fresca sin contexto previo.

### Ver sesiones anteriores
En la página completa (`/copilot`), la barra lateral izquierda muestra tus sesiones ordenadas por fecha, con el primer mensaje como título. Hacé clic en cualquier sesión para retomar esa conversación.

### Contexto entre turnos
El Copiloto recuerda lo que dijiste antes en la misma sesión. Podés afinar tu consulta sin repetir todos los criterios:

> Primera consulta: "Mostrá propiedades de 3 ambientes en Palermo"
> Seguimiento: "¿Cuáles de esas tienen balcón?"

El Copiloto aplica el filtro de balcón sobre los resultados anteriores, sin que tengas que repetir Palermo ni la cantidad de ambientes.

---

## Citas y referencias

Las respuestas que mencionan propiedades, contactos u otros datos de tu CRM incluyen **píldoras de cita** — botones con el nombre y código de referencia del elemento. Hacé clic en una cita para ir directamente a esa ficha.

Ejemplo de respuesta citada:
> "Encontré 3 propiedades que coinciden: **[Av. Corrientes 1234 — CAP-0142]**, **[Thames 890 — PAL-0089]** y **[Soler 456 — PAL-0112]**."

El Copiloto **solo cita entidades que existen en tus datos**. Si no hay resultados que coincidan, te lo dice directamente y puede sugerirte ampliar los criterios.

---

## Límites de consultas (cuota)

| Plan | Consultas por usuario / mes |
|---|---|
| Free | 50 |
| Starter | 50 |
| Growth | Sin límite |
| Enterprise | Sin límite |

Cuando alcanzás el límite, aparece un banner informativo. Podés ampliar tu cuota desde **Configuración → Plan → Add-ons de Copiloto IA**.

---

## Preguntas frecuentes

**¿El Copiloto puede ver datos de otras inmobiliarias?**
No. Todas las consultas están estrictamente limitadas a los datos de tu propia cuenta. Es imposible acceder a información de otros usuarios o inmobiliarias.

**¿Qué pasa si pregunto algo que no está en mi CRM?**
El Copiloto te responde que no encontró información relevante y te sugiere alternativas dentro de tus datos.

**¿El Copiloto puede modificar mis datos directamente?**
Solo con tu confirmación explícita. Cualquier acción que implique cambios (enviar un mensaje, crear una tarea) requiere que hagas clic en "Confirmar" o "Enviar" en la tarjeta de acción.

**¿Se guardan mis conversaciones?**
Sí, las sesiones se archivan y podés acceder a ellas desde el historial. No se comparten con terceros ni con Anthropic.
