# Sitio web — Guía completa del constructor

**Última actualización:** 2026-05-02
**Versión:** Phase G

---

## ¿Qué es el constructor de sitios web?

Corredor incluye un editor visual con el que podés crear y publicar el sitio web de tu inmobiliaria sin escribir código. Usando bloques arrastrables, elegís el diseño, completás el contenido y publicás en minutos. Tu sitio queda sincronizado con tu cartera: cualquier cambio en una propiedad del CRM se refleja en el sitio en menos de 60 segundos.

---

## Acceder al editor

Navegá a **Sitio** en el menú lateral. Si es la primera vez, el asistente de configuración te guía para crear tu sitio y elegir un tema. Si ya tenés un sitio, aterrizás directamente en el panel del editor.

---

## Crear y administrar páginas

### Crear una página nueva

1. En el panel lateral del editor, hacé clic en **"+ Nueva página"**.
2. Escribí el nombre de la página (por ejemplo: "Quiénes somos", "Propiedades en alquiler").
3. Elegí una plantilla de inicio o comenzá con una página en blanco.
4. Hacé clic en **"Crear"**. La página queda en borrador hasta que la publicás.

### Configurar la URL de la página

Cada página tiene un slug editable (por ejemplo: `/sobre-nosotros`, `/alquileres`). Podés cambiarlo desde **Configuración de página → URL**. Si ya estaba publicada, Corredor crea automáticamente una redirección 301 desde la URL anterior.

### Eliminar o archivar páginas

Hacé clic en los tres puntos `⋯` junto al nombre de la página y elegí **"Archivar"** o **"Eliminar"**. Las páginas archivadas se guardan pero no se publican. Las eliminadas no se pueden recuperar.

---

## Trabajar con bloques

Los bloques son los componentes que forman cada página. Los arrastrás desde el panel de la izquierda y los soltás en el área de edición.

### Bloques disponibles

| Bloque | Descripción |
|---|---|
| **Hero** | Imagen de fondo grande con título, subtítulo y llamado a la acción |
| **ListingGrid** | Grilla de propiedades filtrada por tus criterios (tipo, operación, zona) |
| **ListingDetail** | Detalle completo de una propiedad específica |
| **ContactForm** | Formulario de contacto con campos configurables |
| **AgentBio** | Perfil de un agente con foto, nombre y datos de contacto |
| **Testimonials** | Carrusel o grilla de testimonios de clientes |
| **Map** | Mapa interactivo con marcadores de propiedades |
| **Blog** | Listado o detalle de artículos del blog |
| **CTA** | Bloque de llamado a la acción con texto y botón |
| **Footer** | Pie de página con logo, enlaces y datos de contacto |

### Agregar un bloque

1. Hacé clic en **"+ Agregar bloque"** en la posición donde querés insertarlo.
2. Elegí el tipo de bloque del panel.
3. El bloque aparece con contenido de ejemplo. Hacé clic sobre él para editarlo.

### Editar un bloque

Al seleccionar un bloque, el panel derecho muestra sus propiedades configurables: textos, imágenes, colores, filtros de propiedades, etc. Los cambios se aplican en tiempo real en la vista previa.

### Reordenar bloques

Arrastrá el bloque desde el ícono `⠿` de la izquierda y soltalo en la nueva posición.

### Eliminar un bloque

Seleccioná el bloque y hacé clic en el ícono de papelera en la barra de herramientas superior, o usá la opción **"Eliminar bloque"** del menú contextual.

---

## Elegir y cambiar el tema

El tema define la tipografía, la paleta de colores y los estilos base de todos los bloques. Corredor incluye 5 temas al momento del lanzamiento.

### Cambiar el tema

1. Abrí **Configuración del sitio → Tema**.
2. Pasá el cursor sobre cada tema para ver la vista previa.
3. Hacé clic en **"Aplicar"**. El cambio se aplica a todas las páginas del sitio.

> **Importante:** cambiar el tema no borra tu contenido, pero puede ajustar los colores y fuentes de tus bloques existentes. Revisá las páginas clave luego de un cambio de tema.

---

## Configurar un dominio personalizado

Podés publicar tu sitio bajo tu propio dominio (por ejemplo: `www.tuvainmobiliaria.com.ar`) en lugar del subdominio de Corredor.

### Pasos para conectar tu dominio

1. Navegá a **Configuración del sitio → Dominio**.
2. Hacé clic en **"Agregar dominio personalizado"** e ingresá tu dominio.
3. Corredor te muestra los registros DNS que debés configurar en tu proveedor de dominio (generalmente un registro `CNAME` o `A`).
4. Ingresá esos registros en el panel de administración de tu proveedor de dominio.
5. Volvé a Corredor y hacé clic en **"Verificar"**. Una vez que la propagación DNS se complete (puede tardar entre unos minutos y 48 horas), el estado cambia a **"Activo"** y el certificado SSL se emite automáticamente.

> **Tip:** la mayoría de los dominios quedan activos en menos de 2 minutos luego de configurar correctamente los registros DNS.

### SSL automático

Corredor gestiona el certificado SSL por vos. No necesitás comprarlo ni renovarlo. Tu sitio siempre estará accesible por HTTPS.

---

## Publicar el sitio

### Publicar una página

Cuando terminás de editar, hacé clic en **"Publicar"** en la barra superior. La página queda live en segundos (tiempo máximo de publicación: 30 segundos desde que guardás).

### Ver el sitio publicado

Hacé clic en **"Ver sitio"** para abrir tu sitio en una nueva pestaña del navegador.

### Despublicar una página

Desde el panel de páginas, usá el menú `⋯` y seleccioná **"Despublicar"**. La página vuelve a estado borrador y deja de ser visible para los visitantes.

---

## Sincronización con el CRM

El bloque **ListingGrid** y el bloque **ListingDetail** muestran datos en vivo de tu cartera. Cuando actualizás una propiedad en el CRM (precio, fotos, descripción, disponibilidad), el cambio se refleja en tu sitio web en un máximo de 60 segundos, sin que tengas que re-publicar el sitio.

---

## Formularios de contacto

El bloque **ContactForm** captura consultas de visitantes directamente desde tu sitio.

### Configurar un formulario

1. Agregá el bloque **ContactForm** a tu página.
2. En el panel derecho, configurá los campos que querés mostrar (nombre, teléfono, correo, mensaje, propiedad de interés).
3. Definí a qué agente o dirección de correo se envían las notificaciones.
4. Publicá la página.

### Ver envíos recibidos

Navegá a **Sitio → Formularios** para ver todos los envíos, filtrados por fecha y página. Cada envío muestra los campos completados por el visitante y la fecha de recepción.

### Crear un lead automáticamente

Si el visitante completa su correo o teléfono, Corredor puede crear automáticamente un lead en el CRM. Activá esta opción desde **Sitio → Formularios → Configuración → Crear lead automáticamente**.

---

## Preguntas frecuentes

**¿Puedo tener más de un sitio?**
Cada cuenta de Corredor puede tener un sitio activo por organización.

**¿El sitio funciona bien en celulares?**
Sí. Todos los temas son responsive y se adaptan automáticamente a dispositivos móviles.

**¿El sitio afecta el rendimiento del CRM?**
No. El sitio corre en infraestructura separada (Cloudflare Pages) y no comparte recursos con el resto de la aplicación.
