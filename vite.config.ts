import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "client", "index.html")
      },
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-slot',
            '@radix-ui/react-toast'
          ],
          'utils-vendor': ['zod', 'drizzle-orm', 'drizzle-zod']
        }
      }
    },
    sourcemap: process.env.NODE_ENV === 'development',
    target: 'esnext',
    commonjsOptions: {
      include: [/node_modules/, /shared/]
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
    exclude: ['@shared'],
    esbuildOptions: {
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx'
      }
    }
  },
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    host: '0.0.0.0'
  }
});
