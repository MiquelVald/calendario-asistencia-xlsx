# Calendario de asistencia

Aplicación web estática que lee un archivo XLSX en el navegador, permite buscar una persona y muestra sus fechas en un calendario.

También puede cargar una sola vez el formato institucional de vacaciones y permisos, relacionar a la persona con la hoja `EMPLEADOS` y descargar desde el calendario una copia con número de empleado, datos del puesto, firmas, notas y los días seleccionados para justificar. El calendario ofrece un modo con casillas para elegir llegadas tardías, salidas tempranas y días sin entrada ni salida. La plantilla se conserva en IndexedDB únicamente para ese navegador y dispositivo; no se incluye en el repositorio ni se envía a un servidor.

## Uso local

Sirve la carpeta `dist` con cualquier servidor HTTP estático y abre la URL local en el navegador. El archivo XLSX no se incluye en el proyecto y no se envía a un servidor.

## Formato esperado

La aplicación busca una hoja que contenga los encabezados `Nombre`, `Fecha`, `Entrada` y `Salida`. Admite nombres agrupados en celdas combinadas o repetidos por fila.

- Una celda roja en `Entrada` marca una llegada tardía en salmón claro.
- De lunes a jueves, una salida anterior a las 15:30 marca una salida temprana; los viernes, el límite es antes de las 14:00. También se respeta el indicador naranja que ya venga en la celda de `Salida`.
- Las personas con horario especial configurado se evalúan directamente por hora, ignorando los colores calculados para el horario general. Su límite de entrada es 08:00 y su salida mínima es 15:00 de lunes a jueves; el viernes conservan la salida mínima general de las 14:00.
- Un día laborable sin entrada ni salida se marca en lavanda.
- Los sábados, domingos y descansos obligatorios federales de México se muestran en gris y no cuentan como inasistencia ni alerta.

Los descansos obligatorios siguen el artículo 74 de la Ley Federal del Trabajo. Las jornadas electorales no se calculan automáticamente porque dependen de la elección federal o local aplicable.

El proyecto incluye un flujo de GitHub Pages que publica el contenido de `dist` al enviar cambios a la rama `main`. El lector XLSX se carga desde la CDN oficial de SheetJS.

La generación preserva el libro base y modifica únicamente las celdas necesarias mediante OOXML. Usa JSZip para conservar imágenes, estilos, fórmulas, hojas ocultas y configuración de impresión.

## Servidor privado Linux

El proyecto incluye un servidor Node sin dependencias que sirve la aplicación y puede cargar automáticamente la plantilla desde una ruta local del servidor. La guía para montar `//10.218.108.49/Documentos` con CIFS, ejecutar la aplicación con systemd y publicarla mediante Nginx está en `deploy/README-LINUX.md`.

En el servidor privado, la aplicación también puede listar las carpetas mensuales de asistencia y cargar automáticamente el archivo `dd_mm_aaaa.xlsx` más reciente de cada una. La carga manual permanece disponible como respaldo.
