import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(appRoot, "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8080);
const templatePath = process.env.JUSTIFICACIONES_TEMPLATE_PATH || "";
const reportsRoot = process.env.JUSTIFICACIONES_REPORTS_PATH || "";
const monthOrder = new Map([
  ["enero", 1], ["febrero", 2], ["marzo", 3], ["abril", 4], ["mayo", 5], ["junio", 6],
  ["julio", 7], ["agosto", 8], ["septiembre", 9], ["octubre", 10], ["noviembre", 11], ["diciembre", 12],
]);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".woff2", "font/woff2"],
]);

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

async function sendFile(response, filePath, extraHeaders = {}) {
  const fileStat = await stat(filePath);
  if (!fileStat.isFile()) throw new Error("Not a file");
  response.writeHead(200, {
    "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
    "Content-Length": fileStat.size,
    ...extraHeaders,
  });
  createReadStream(filePath).pipe(response);
}

function reportDate(fileName) {
  const match = /^(\d{2})_(\d{2})_(\d{4})\.xlsx$/i.exec(fileName);
  if (!match) return null;
  const [, day, month, year] = match;
  const value = Date.UTC(Number(year), Number(month) - 1, Number(day));
  const date = new Date(value);
  if (date.getUTCFullYear() !== Number(year) || date.getUTCMonth() !== Number(month) - 1 || date.getUTCDate() !== Number(day)) return null;
  return { value, iso: `${year}-${month}-${day}` };
}

async function listReports() {
  if (!reportsRoot) return [];
  const entries = await readdir(reportsRoot, { withFileTypes: true });
  const months = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const files = await readdir(path.join(reportsRoot, entry.name), { withFileTypes: true });
    const candidates = files
      .filter((file) => file.isFile())
      .map((file) => ({ name: file.name, date: reportDate(file.name) }))
      .filter((file) => file.date)
      .sort((a, b) => b.date.value - a.date.value || b.name.localeCompare(a.name));
    if (!candidates.length) continue;
    months.push({
      id: entry.name,
      label: entry.name,
      fileName: candidates[0].name,
      reportDate: candidates[0].date.iso,
    });
  }
  return months.sort((a, b) => {
    const aOrder = monthOrder.get(a.label.toLocaleLowerCase("es-MX")) ?? 99;
    const bOrder = monthOrder.get(b.label.toLocaleLowerCase("es-MX")) ?? 99;
    return aOrder - bOrder || a.label.localeCompare(b.label, "es-MX");
  });
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/health") {
      let templateReady = false;
      if (templatePath) {
        try {
          templateReady = (await stat(templatePath)).isFile();
        } catch {
          templateReady = false;
        }
      }
      let reportsReady = false;
      try {
        reportsReady = (await listReports()).length > 0;
      } catch {
        reportsReady = false;
      }
      sendJson(response, 200, { ok: true, templateReady, reportsReady });
      return;
    }

    if (url.pathname === "/api/template") {
      if (!templatePath) {
        sendJson(response, 404, { error: "No hay una plantilla configurada." });
        return;
      }
      await sendFile(response, templatePath, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        "X-Template-Name": encodeURIComponent(path.basename(templatePath)),
      });
      return;
    }

    if (url.pathname === "/api/reports") {
      if (!reportsRoot) {
        sendJson(response, 404, { error: "No hay una carpeta de reportes configurada." });
        return;
      }
      sendJson(response, 200, { months: await listReports() });
      return;
    }

    const reportMatch = /^\/api\/reports\/([^/]+)\/latest$/.exec(url.pathname);
    if (reportMatch) {
      const monthId = decodeURIComponent(reportMatch[1]);
      if (!reportsRoot || path.basename(monthId) !== monthId) {
        sendJson(response, 400, { error: "Mes no válido." });
        return;
      }
      const report = (await listReports()).find((item) => item.id === monthId);
      if (!report) {
        sendJson(response, 404, { error: "No se encontró el mes solicitado." });
        return;
      }
      const reportPath = path.join(reportsRoot, report.id, report.fileName);
      await sendFile(response, reportPath, {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "inline",
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
        "X-Report-Name": encodeURIComponent(report.fileName),
      });
      return;
    }

    const requestedPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(publicRoot, `.${requestedPath}`);
    if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${path.sep}`)) {
      sendJson(response, 403, { error: "Ruta no permitida." });
      return;
    }
    await sendFile(response, filePath, { "Cache-Control": "no-cache" });
  } catch (error) {
    if (error?.code === "ENOENT") {
      sendJson(response, 404, { error: "No encontrado." });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: "Error interno del servidor." });
  }
});

server.listen(port, host, () => {
  console.log(`Calendario de asistencia disponible en http://${host}:${port}`);
  console.log(templatePath ? `Plantilla configurada: ${templatePath}` : "Plantilla del servidor no configurada.");
  console.log(reportsRoot ? `Reportes configurados: ${reportsRoot}` : "Carpeta de reportes no configurada.");
});
