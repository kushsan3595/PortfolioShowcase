import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
      "@assets": path.resolve(__dirname, "./src/assets"),
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          shared: ["@shared/schema"],
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "@shared/schema"],
    exclude: ["pg"],
  },
  esbuild: {
    loader: "ts",
    include: ["src/**/*.ts", "src/**/*.tsx", "shared/**/*.ts"],
    exclude: ["node_modules"],
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
