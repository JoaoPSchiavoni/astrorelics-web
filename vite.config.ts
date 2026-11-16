import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Plugin Vite para servir diretamente os arquivos da pasta `./3d_models` e `./logo.png`
 * tanto durante o desenvolvimento (`npm run dev`) quanto no build de produção (`npm run build`),
 * sem exigir duplicação manual de arquivos grandes.
 */
function serve3DModelsPlugin() {
  return {
    name: 'serve-3d-models',
    configureServer(server: any) {
      server.middlewares.use((req: any, res: any, next: any) => {
        const url = req.url?.split('?')[0] ?? '';
        if (url.startsWith('/3d_models/') || url === '/logo.png') {
          const decodedUrl = decodeURIComponent(url.slice(1));
          const filePath = path.resolve(process.cwd(), decodedUrl);
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath).toLowerCase();
            const mimeTypes: Record<string, string> = {
              '.glb': 'model/gltf-binary',
              '.gltf': 'model/gltf+json',
              '.bin': 'application/octet-stream',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.jpeg': 'image/jpeg',
              '.webp': 'image/webp',
            };
            const stat = fs.statSync(filePath);
            res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
            res.setHeader('Content-Length', stat.size);
            res.setHeader('Cache-Control', 'no-cache');
            if (req.method === 'HEAD') {
              res.statusCode = 200;
              res.end();
              return;
            }
            fs.createReadStream(filePath).pipe(res);
            return;
          }
        }
        next();
      });
    },
    closeBundle() {
      const srcDir = path.resolve(process.cwd(), '3d_models');
      const outDir = path.resolve(process.cwd(), 'dist', '3d_models');
      if (fs.existsSync(srcDir)) {
        fs.mkdirSync(outDir, { recursive: true });
        for (const file of fs.readdirSync(srcDir)) {
          const srcFile = path.join(srcDir, file);
          if (fs.statSync(srcFile).isFile()) {
            fs.copyFileSync(srcFile, path.join(outDir, file));
          }
        }
      }
      const logoSrc = path.resolve(process.cwd(), 'logo.png');
      const logoDest = path.resolve(process.cwd(), 'dist', 'logo.png');
      if (fs.existsSync(logoSrc) && fs.existsSync(path.resolve(process.cwd(), 'dist'))) {
        fs.copyFileSync(logoSrc, logoDest);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), serve3DModelsPlugin()],
  assetsInclude: ['**/*.glb', '**/*.gltf'],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-core': ['three'],
          'r3f-drei': ['@react-three/fiber', '@react-three/drei'],
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
  server: {
    watch: {
      ignored: ['**/*.pdf'],
    },
  },
});
