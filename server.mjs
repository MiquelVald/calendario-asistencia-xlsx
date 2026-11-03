import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const publicRoot = path.join(appRoot, "dist");
const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 8080);
const templatePath = process.env.JUSTIFICACIONES_TEMPLATE_PATH || "";

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
      sendJson(response, 200, { ok: true, templateReady });
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
});
