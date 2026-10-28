# Calendario de asistencia

Aplicación web estática que lee un archivo XLSX en el navegador, permite buscar una persona y muestra sus fechas en un calendario.

## Uso local

Sirve la carpeta `dist` con cualquier servidor HTTP estático y abre la URL local en el navegador. El archivo XLSX no se incluye en el proyecto y no se envía a un servidor.

## Formato esperado

La aplicación busca una hoja que contenga los encabezados `Nombre`, `Fecha`, `Entrada` y `Salida`. Admite nombres agrupados en celdas combinadas o repetidos por fila.

- Una celda roja en `Entrada` marca el día en salmón claro.
- Una celda naranja en `Salida` marca el día en naranja claro.

El proyecto incluye un flujo de GitHub Pages que publica el contenido de `dist` al enviar cambios a la rama `main`. El lector XLSX se carga desde la CDN oficial de SheetJS.
