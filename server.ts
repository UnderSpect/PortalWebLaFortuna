import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set high limits for file upload sizes as requested (no MB limits)
  app.use(express.json({ limit: "500mb" }));
  app.use(express.urlencoded({ limit: "500mb", extended: true }));

  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // API Routes

  // 1. Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 2. Upload file
  app.post("/api/upload", (req, res) => {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: "Nombre del archivo y datos base64 son requeridos." });
    }

    try {
      // Data is expected to be a Base64 dataURL: e.g. "data:application/pdf;base64,JVBERi..."
      const commaIndex = data.indexOf(",");
      const base64Content = commaIndex !== -1 ? data.slice(commaIndex + 1) : data;
      const fileBuffer = Buffer.from(base64Content, "base64");

      const safeId = Date.now() + "-" + Math.random().toString(36).substring(2, 9);
      const safeName = name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const diskName = `${safeId}_${safeName}`;
      const filePath = path.join(UPLOADS_DIR, diskName);

      fs.writeFileSync(filePath, fileBuffer);

      // Return download URL and file index identification
      res.json({
        id: safeId,
        url: `/api/files/${safeId}`
      });
    } catch (err) {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Ocurrió un error al procesar la carga del documento." });
    }
  });

  // Helper to get Content-Type based on extension for browser compatibility
  const getMimeType = (fileName: string): string => {
    const ext = path.extname(fileName).toLowerCase();
    switch (ext) {
      case ".pdf": return "application/pdf";
      case ".png": return "image/png";
      case ".jpg":
      case ".jpeg": return "image/jpeg";
      case ".gif": return "image/gif";
      case ".svg": return "image/svg+xml";
      case ".txt": return "text/plain";
      case ".csv": return "text/csv";
      case ".html": return "text/html";
      case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      case ".xls": return "application/vnd.ms-excel";
      case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case ".doc": return "application/msword";
      case ".zip": return "application/zip";
      default: return "application/octet-stream";
    }
  };

  // 3. Download file
  app.get("/api/files/:id", (req, res) => {
    const { id } = req.params;
    const cleanId = path.basename(id);

    try {
      if (!fs.existsSync(UPLOADS_DIR)) {
        return res.status(404).send("Repositorio de archivos no inicializado");
      }

      const files = fs.readdirSync(UPLOADS_DIR);
      const targetFile = files.find(f => f.startsWith(cleanId + "_"));

      if (!targetFile) {
        return res.status(404).send("El documento no se encuentra en el servidor");
      }

      const filePath = path.join(UPLOADS_DIR, targetFile);
      if (!fs.existsSync(filePath)) {
        return res.status(404).send("Archivo físico no encontrado en el disco");
      }

      const originalName = targetFile.substring(cleanId.length + 1);
      const stat = fs.statSync(filePath);
      const mimeType = getMimeType(originalName);

      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(originalName)}"`);
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Length", stat.size);

      const fileStream = fs.createReadStream(filePath);
      
      fileStream.on("error", (streamErr) => {
        console.error("Stream reader error:", streamErr);
        if (!res.headersSent) {
          res.status(500).send("Error de transmisión de archivo");
        }
      });

      fileStream.pipe(res);
    } catch (err) {
      console.error("Download error:", err);
      res.status(500).send("Error de servidor al descargar el archivo");
    }
  });

  // 4. Delete file
  app.delete("/api/files/:id", (req, res) => {
    const { id } = req.params;
    const cleanId = path.basename(id);

    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      const targetFile = files.find(f => f.startsWith(cleanId + "_"));
      if (targetFile) {
        fs.unlinkSync(path.join(UPLOADS_DIR, targetFile));
      }
      res.json({ success: true });
    } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ error: "Error al remover el archivo del disco" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
