# Tasaciones — Cómo crear un informe de tasación

**Última actualización:** 2026-05-02
**Versión:** Phase G

---

## ¿Qué es el módulo de tasaciones?

El módulo de **Tasaciones** te permite crear informes de valoración de propiedades con respaldo de comparables del mercado y una narrativa generada por inteligencia artificial. El resultado final es un PDF profesional que podés descargar y compartir con tu cliente.

El proceso sigue un asistente de 4 pasos: datos de la propiedad → selección de comparables → revisión de la narrativa IA → generación del informe.

---

## Paso 1: Crear una tasación nueva

1. Navegá a **Tasaciones** en el menú lateral.
2. Hacé clic en **"+ Nueva tasación"**.
3. Completá los datos de la propiedad a tasar:

| Campo | Descripción |
|---|---|
| Dirección | Calle, número, piso, unidad |
| Tipo de propiedad | Departamento, casa, PH, local, oficina, etc. |
| Superficie total | En metros cuadrados |
| Superficie cubierta | En metros cuadrados |
| Ambientes | Cantidad de ambientes |
| Antigüedad | Año de construcción o antigüedad estimada |
| Estado de conservación | Muy bueno, bueno, regular, a refaccionar |
| Propósito | Venta, alquiler o alquiler temporario |

4. Hacé clic en **"Continuar"** para pasar al paso de comparables.

---

## Paso 2: Seleccionar comparables

El sistema busca automáticamente propiedades similares dentro de un radio de 2 km basándose en los datos que ingresaste. Se muestran al menos 10 comparables ordenados por relevancia.

### Entender los comparables

Cada comparable muestra:
- Dirección y zona
- Tipo de propiedad y superficie
- Precio publicado o de cierre (si está disponible)
- Precio por metro cuadrado
- Distancia a la propiedad tasada
- Fecha de publicación o cierre

### Seleccionar y ajustar comparables

- Por defecto se pre-seleccionan los 5 comparables más relevantes. Podés cambiar la selección marcando o desmarcando las casillas.
- **Recomendamos seleccionar entre 3 y 10 comparables** para obtener una narrativa IA más precisa.
- Si querés excluir un comparable por algún criterio (por ejemplo, una propiedad con características muy distintas), desmarcalo y opcionalmente anotá el motivo en el campo **"Nota"**.

### Ajustar criterios de búsqueda

Si los comparables no son representativos, usá los filtros del panel derecho para ampliar o acotar la búsqueda:
- Radio de búsqueda (hasta 5 km)
- Rango de superficie (± metros cuadrados)
- Rango de antigüedad
- Estado de conservación

Aplicá los filtros y hacé clic en **"Buscar comparables"** para actualizar los resultados.

4. Una vez satisfecho con la selección, hacé clic en **"Continuar"**.

---

## Paso 3: Narrativa generada por IA

Con los comparables seleccionados, el sistema genera automáticamente una narrativa de tasación en español. El tiempo de generación es de hasta 20 segundos.

### Qué incluye la narrativa

La narrativa cubre:
- Descripción del inmueble y su ubicación
- Análisis del mercado local en base a los comparables seleccionados
- Rango de valor estimado (expresado en USD y/o ARS según el propósito de la tasación)
- Factores que justifican el valor (estado de conservación, superficie, ubicación, amenities)
- Observaciones sobre la dinámica del mercado en la zona

### Editar la narrativa

La narrativa es un punto de partida, no un texto definitivo. Podés editarla directamente en el editor de texto antes de generar el informe:
- Hacé clic sobre cualquier párrafo para editar
- Usá el formateador de texto para aplicar negrita, cursiva o listas
- Agregá o eliminá secciones según tus criterios profesionales

> **Importante:** la narrativa IA se basa en los comparables que seleccionaste. Si la encontrás poco representativa, volvé al Paso 2 y ajustá la selección de comparables.

4. Cuando la narrativa esté lista, hacé clic en **"Continuar"**.

---

## Paso 4: Generar y descargar el informe PDF

El informe PDF incluye:
- **Portada:** nombre de la inmobiliaria, logo, fecha, datos del tasador y de la propiedad
- **Resumen ejecutivo:** valor estimado y rango
- **Descripción de la propiedad:** todos los campos ingresados en el Paso 1
- **Tabla de comparables:** los comparables seleccionados con sus datos y fotos (si están disponibles)
- **Narrativa:** el texto de análisis revisado y aprobado por vos
- **Bloque de firma:** espacio para la firma del tasador y sello de la inmobiliaria

### Generar el PDF

1. Revisá la vista previa del informe en pantalla.
2. Si necesitás ajustar algo, usá el botón **"Volver"** para ir al paso correspondiente.
3. Cuando estés conforme, hacé clic en **"Generar informe"**.
4. El PDF se descarga automáticamente a tu equipo en segundos.

### Descargar nuevamente

El informe queda guardado en **Tasaciones → Historial**. Podés volver a descargarlo en cualquier momento haciendo clic en **"Descargar PDF"** junto a la tasación.

---

## Administrar tasaciones

### Ver el historial de tasaciones

Navegá a **Tasaciones** para ver todas las tasaciones creadas, ordenadas por fecha. Cada fila muestra la propiedad, la fecha, el tasador y el estado (borrador o completada).

### Editar una tasación en borrador

Las tasaciones que no llegaron al paso final quedan en estado **"Borrador"**. Hacé clic en **"Continuar"** para retomarlas desde donde las dejaste.

### Eliminar una tasación

Hacé clic en los tres puntos `⋯` junto a la tasación y elegí **"Eliminar"**. Esta acción es irreversible.

---

## Preguntas frecuentes

**¿Los comparables vienen del mercado general o solo de mi cartera?**
La búsqueda incluye propiedades de los portales conectados a tu cuenta (MercadoLibre, ZonaProp, Proppit) y, si están disponibles, registros de operaciones cerradas del mercado.

**¿Puedo agregar fotos de la propiedad al informe?**
Sí. En el Paso 1 hay una sección de carga de imágenes. Las fotos que subas aparecen en la sección de descripción de la propiedad del PDF.

**¿La narrativa IA está en español argentino?**
Sí. El texto generado usa español rioplatense y terminología del mercado inmobiliario argentino.

**¿Puedo hacer una tasación de un inmueble que no está en mi cartera?**
Sí. El módulo de tasaciones es independiente del inventario de propiedades. Ingresás los datos manualmente en el Paso 1.

**¿Cuántas tasaciones puedo crear por mes?**
Depende de tu plan. Revisá la tabla de planes en **Configuración → Facturación → Plan actual** para ver el límite de tasaciones mensuales.
