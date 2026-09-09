import { WebSocketServer } from "ws";
import http from "http";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

console.log("web_server started");

const port = process.env.PORT || 10000;
const current_file = fileURLToPath(import.meta.url);
const current_dir = path.dirname(current_file);
const dist_dir = path.resolve(current_dir, "../dist");

const mime_types = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".map": "application/json; charset=utf-8",
};

const server = http.createServer(async (request, response) => {
    if (request.url === "/health") {
        response.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("ok");
        return;
    }

    const url_path = request.url === "/" ? "/index.html" : request.url.split("?")[0];
    const resolved_path = path.resolve(dist_dir, `.${url_path}`);

    if (!resolved_path.startsWith(dist_dir)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
    }

    try {
        const file_content = await fs.readFile(resolved_path);
        const extension = path.extname(resolved_path).toLowerCase();
        response.writeHead(200, {
            "Content-Type": mime_types[extension] || "application/octet-stream",
        });
        response.end(file_content);
    } catch {
        response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Not Found");
    }
});

const web_socket_server = new WebSocketServer({
    server,
    path: "/cs2_webradar",
});

web_socket_server.on("connection", (web_socket, request) => {
    const client_address = request.socket.remoteAddress.replace("::ffff:", "");
    console.info(`${client_address} connected`);

    web_socket.on("message", (message) => {
        web_socket_server.clients.forEach((client) => {
            client.send(message);
        });
    });

    web_socket.on("close", () => {
        console.info(`${client_address} disconnected \n`);
    });

    web_socket.on("error", (error) => {
        console.error(error);
    });
});

server.listen(port, "0.0.0.0");
console.info(`listening on port '${port}'`);