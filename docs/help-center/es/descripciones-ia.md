# Cómo generar descripciones con IA

**Última actualización:** 2026-05-01
**Versión:** Phase F

---

## ¿Qué son las descripciones generadas con IA?

Corredor puede redactar automáticamente la descripción de cualquier propiedad a partir de sus atributos: tipo, dirección, ambientes, superficie, amenities y más. El resultado es un texto listo para publicar en portales, escrito en español argentino, con el tono y la extensión que mejor se adaptan a cada plataforma.

Vos siempre tenés la última palabra: la IA genera un borrador, vos lo revisás y lo guardás (o no) cuando estés conforme.

---

## Cómo generar una descripción

1. Abrí la ficha de una propiedad (cualquier propiedad con al menos tipo, dirección y cantidad de ambientes completos).
2. Hacé clic en **"Generar descripción IA"**.
3. Se abre un modal con dos selectores:
   - **Tono** — elegí entre Formal, Casual o Lujo.
   - **Portal** — elegí ZonaProp, Mercado Libre, Argenprop o General.
4. Opcionalmente, completá el campo **"Destacar"** con instrucciones libres (ej.: "Resaltar cochera amplia y vista al parque").
5. Hacé clic en **"Generar"**.
6. La descripción aparece en el editor, generándose en tiempo real (esperá hasta 10 segundos).
7. Leé, editá si querés y hacé clic en **"Guardar descripción"** cuando estés conforme.

> **Importante:** la descripción **nunca se guarda automáticamente**. Debe existir un clic explícito en "Guardar descripción" para que los cambios surtan efecto.

---

## Selección de tono

| Tono | Cuándo usarlo | Estilo |
|---|---|---|
| **Formal** | Propiedades de uso corporativo, ventas a inversores | Profesional, párrafos cortos, sin adornos |
| **Casual** | Propiedades residenciales, alquileres para familias o jóvenes | Cercano, uso del vos, conversacional |
| **Lujo** | Propiedades premium, casas de alta gama, unidades exclusivas | Aspiracional, resalta exclusividad y estilo de vida |

---

## Optimización por portal

Cada portal tiene requisitos distintos de extensión y enfoque. La IA ajusta el texto automáticamente:

| Portal | Extensión objetivo | Enfoque |
|---|---|---|
| **ZonaProp** | 1.500–2.000 caracteres | Detallado, con barrio, accesos y puntos de referencia |
| **Mercado Libre** | 800–1.200 caracteres | Conciso, los 3 puntos de venta más fuertes primero |
| **Argenprop** | 1.000–1.500 caracteres | Estándar, oración de apertura potente |
| **General** | Sin límite | Descripción completa, para uso interno o multi-portal |

Si el texto generado queda fuera del rango esperado, el sistema reintenta automáticamente con una instrucción de ajuste de extensión antes de mostrártelo.

---

## Campo "Destacar" — instrucciones adicionales

Usá este campo para indicarle a la IA qué aspectos de la propiedad querés enfatizar. Por ejemplo:

- "Resaltar pileta en terraza y proximidad al Parque Centenario"
- "Mencionar que el edificio tiene portero 24 hs y doble vidriado"
- "Enfatizar la luminosidad y la vista al río"

La IA incluirá estos elementos en el texto generado. **No inventa atributos**: si un amenity no está cargado en la ficha, la descripción no lo menciona, aunque lo pidas en "Destacar".

---

## Edición antes de guardar

El editor del modal es completamente editable. Podés:
- Corregir palabras o frases.
- Agregar información que no esté en los atributos (ej. contexto de barrio que conocés de primera mano).
- Eliminar secciones que no te convencen.

Todos los cambios que hagas antes de guardar se preservan.

---

## Gestión de borradores

Por cada propiedad podés tener hasta **5 borradores guardados**. Esto es útil para generar versiones con distintos tonos o portales y comparar antes de elegir cuál publicar.

**Crear una nueva versión:**
Si ya existe una descripción guardada y hacés clic en "Generar descripción IA", el sistema te pregunta:
- **"Reemplazar"** — sobreescribe la descripción activa.
- **"Nueva versión"** — guarda el resultado como un borrador adicional, sin tocar el texto activo.

Cuando superás los 5 borradores, el más antiguo se elimina automáticamente.

**Activar un borrador:**
Desde la sección "Descripciones guardadas" en la ficha de la propiedad, hacé clic en **"Usar esta descripción"** sobre cualquier borrador para convertirlo en la descripción activa.

---

## Cómo se sincronizan las descripciones con los portales

Cuando guardás una descripción generada por IA y la marcás como activa, Corredor la usa automáticamente en los próximos envíos de sincronización a portales.

- La descripción activa reemplaza cualquier texto que hayas escrito manualmente con anterioridad en el campo de descripción del portal.
- Si después editás o reemplazás la descripción activa, el próximo sync envía el texto actualizado.
- Si no hay ninguna descripción guardada, el sync sigue usando el campo de descripción manual de la ficha.

---

## Preguntas frecuentes

**¿La IA puede inventar atributos que no tengo cargados?**
No. El sistema solo usa los datos presentes en la ficha. Si `m² cubiertos` está en blanco, la descripción no menciona la superficie.

**¿Qué pasa si genero una descripción y no la guardo?**
Nada cambia. Cerrar el modal sin guardar descarta el borrador.

**¿Puedo regenerar con otro tono sin perder lo que ya tenía?**
Sí. Elegí "Nueva versión" cuando el sistema te pregunte, y el texto anterior queda guardado como borrador.

**¿En qué idioma se genera el texto?**
Siempre en español argentino, usando el vos y expresiones locales. No está disponible en otros idiomas en Phase F.

**¿Cuánto tarda en generarse?**
El 95% de las generaciones se completan en menos de 10 segundos para propiedades con hasta 30 atributos.
