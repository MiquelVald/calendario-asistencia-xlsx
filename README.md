# Vacaciones e incidencias

Aplicación web que permite elegir entre solicitar vacaciones y elaborar un formato de incidencias.

El flujo de vacaciones lee un reporte XLSX con el número y nombre del empleado en las columnas A y B, el saldo disponible de 2025 y su vencimiento en D/E, y el saldo de 2026 y su vencimiento en F/G. No muestra el saldo vencido de la columna C. Presenta ambos saldos y los acumula: consume primero 2025 y continúa con 2026 cuando la solicitud lo requiere. La persona puede seleccionar uno o dos rangos de fechas; la aplicación evita traslapes, cuenta los días laborables, muestra el regreso de cada rango y genera una fila del formato por cada rango y periodo utilizado.

El flujo de incidencias lee un archivo XLSX en el navegador, permite buscar una persona y muestra sus fechas en un calendario.

También puede cargar una sola vez el formato institucional de vacaciones y permisos, relacionar a la persona con la hoja `EMPLEADOS` y descargar desde el calendario una copia con número de empleado, datos del puesto, firmas, notas y los días seleccionados para justificar. El calendario ofrece un modo con casillas para elegir llegadas tardías, salidas tempranas y días sin entrada ni salida. La plantilla se conserva en IndexedDB únicamente para ese navegador y dispositivo; no se incluye en el repositorio ni se envía a un servidor.

## Uso local

Ejecuta `npm start` y abre `http://127.0.0.1:8080`. Los archivos XLSX no se incluyen en el proyecto.

El servidor admite estas variables:

- `JUSTIFICACIONES_TEMPLATE_PATH`: formato institucional con las hojas `FORMATO` y `EMPLEADOS`.
- `JUSTIFICACIONES_VACATIONS_PATH`: reporte de saldos de vacaciones.

En Windows, si las variables no están definidas, el servidor local usa `O:\Miguel Valdez\JustificacionesMiniApp\VacacionesDates.xlsx` para vacaciones y `O:\2026 Formatos\2026 Reporte Lista de Asistencia` para los reportes mensuales. En Linux o en el servidor definitivo, configura las variables con las rutas montadas correspondientes.
- `JUSTIFICACIONES_REPORTS_PATH`: carpeta con los reportes mensuales de asistencia.

Si el reporte de vacaciones o la plantilla no están configurados en el servidor, la interfaz permite cargarlos manualmente y los procesa en el navegador.

## Formato esperado

La aplicación busca una hoja que contenga los encabezados `Nombre`, `Fecha`, `Entrada` y `Salida`. Admite nombres agrupados en celdas combinadas o repetidos por fila.

- La hora general de entrada es 08:30 y tiene 15 minutos de tolerancia: hasta las 08:45 se considera puntual y desde las 08:46 se marca una llegada tardía en salmón claro.
- De lunes a jueves, una salida anterior a las 15:30 marca una salida temprana; los viernes, el límite es antes de las 14:00. También se respeta el indicador naranja que ya venga en la celda de `Salida`.
- Las personas con horario especial configurado tienen entrada a las 08:00 con 15 minutos de tolerancia: hasta las 08:15 se considera puntual y desde las 08:16 se marca una llegada tardía. Su salida mínima es 15:00 de lunes a jueves; el viernes conservan la salida mínima general de las 14:00. Estas reglas se evalúan directamente por hora, ignorando los colores calculados para el horario general.
- Un día laborable sin entrada ni salida se marca en lavanda.
- Los sábados, domingos y descansos obligatorios federales de México se muestran en gris y no cuentan como inasistencia ni alerta.
- Para vacaciones, el 24 de diciembre también se considera día inhábil institucional y no descuenta saldo.

Los descansos obligatorios siguen el artículo 74 de la Ley Federal del Trabajo. Las jornadas electorales no se calculan automáticamente porque dependen de la elección federal o local aplicable.

El proyecto incluye un flujo de GitHub Pages que publica el contenido de `dist` al enviar cambios a la rama `main`. El lector XLSX se sirve localmente desde `dist/vendor`.

La generación preserva el libro base y modifica únicamente las celdas necesarias mediante OOXML. Usa JSZip para conservar imágenes, estilos, fórmulas, hojas ocultas y configuración de impresión.

En la tabla de checadas fuera de horario, una llegada tardía llena únicamente `INICIO`, una salida temprana o un día sin checadas llena únicamente `TÉRMINO`, y ambos campos se llenan sólo cuando el mismo día tiene llegada tardía y salida temprana.

## Servidor privado Linux

El proyecto incluye un servidor Node sin dependencias que sirve la aplicación y puede cargar automáticamente la plantilla desde una ruta local del servidor. La guía para montar `//10.218.108.49/Documentos` con CIFS, ejecutar la aplicación con systemd y publicarla mediante Nginx está en `deploy/README-LINUX.md`.

En el servidor privado, la aplicación puede cargar automáticamente el reporte de vacaciones configurado, listar las carpetas mensuales de asistencia y abrir el archivo `dd_mm_aaaa.xlsx` más reciente de cada una. La carga manual permanece disponible como respaldo.
