# Calendario de asistencia

Aplicación web estática que lee un archivo XLSX en el navegador, permite buscar una persona y muestra sus fechas en un calendario.

También puede cargar una sola vez el formato institucional de vacaciones y permisos, relacionar a la persona con la hoja `EMPLEADOS` y descargar desde el calendario una copia con número de empleado, datos del puesto, firmas, notas y los días seleccionados para justificar. El calendario ofrece un modo con casillas para elegir llegadas tardías, salidas tempranas y días sin entrada ni salida. La plantilla se conserva en IndexedDB únicamente para ese navegador y dispositivo; no se incluye en el repositorio ni se envía a un servidor.

## Uso local

Sirve la carpeta `dist` con cualquier servidor HTTP estático y abre la URL local en el navegador. El archivo XLSX no se incluye en el proyecto y no se envía a un servidor.

## Formato esperado

La aplicación busca una hoja que contenga los encabezados `Nombre`, `Fecha`, `Entrada` y `Salida`. Admite nombres agrupados en celdas combinadas o repetidos por fila.

- Una celda roja en `Entrada` marca una llegada tardía en salmón claro.
- Una celda naranja en `Salida` marca una salida temprana en naranja claro.
- Un día laborable sin entrada ni salida se marca en lavanda.
- Los sábados, domingos y descansos obligatorios federales de México se muestran en gris y no cuentan como inasistencia ni alerta.

Los descansos obligatorios siguen el artículo 74 de la Ley Federal del Trabajo. Las jornadas electorales no se calculan automáticamente porque dependen de la elección federal o local aplicable.

El proyecto incluye un flujo de GitHub Pages que publica el contenido de `dist` al enviar cambios a la rama `main`. El lector XLSX se carga desde la CDN oficial de SheetJS.

La generación preserva el libro base y modifica únicamente las celdas necesarias mediante OOXML. Usa JSZip para conservar imágenes, estilos, fórmulas, hojas ocultas y configuración de impresión.
