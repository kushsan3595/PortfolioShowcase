import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: 'client',
  plugins: [react({
    babel: {
      plugins: [
        ['@babel/plugin-transform-react-jsx', { 
          runtime: 'automatic',
          importSource: 'react',
          throwIfNamespace: false,
          useBuiltIns: true
        }]
      ],
      babelrc: false,
      configFile: false,
      compact: true,
      comments: false
    }
  })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client/src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "client/src/assets")
    },
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"]
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1000,
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          shared: ["@shared/schema"],
          ui: ["@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu", "@radix-ui/react-slot", "@radix-ui/react-toast"]
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    commonjsOptions: {
      include: [/node_modules/, /shared/],
      extensions: ['.js', '.cjs', '.ts']
    }
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["@shared/schema"],
    esbuildOptions: {
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx'
      },
      jsx: 'automatic',
      jsxDev: false,
      jsxImportSource: 'react',
      target: 'esnext',
      treeShaking: true,
      format: 'esm',
      platform: 'browser',
      supported: {
        'top-level-await': true,
        'dynamic-import': true,
        'import-meta': true
      }
    }
  },
  esbuild: {
    include: /\.(ts|tsx)$/,
    exclude: /node_modules/,
    loader: 'tsx',
    jsx: 'automatic',
    jsxDev: false,
    jsxImportSource: 'react',
    target: 'esnext',
    treeShaking: true,
    format: 'esm',
    platform: 'browser',
    supported: {
      'top-level-await': true,
      'dynamic-import': true,
      'import-meta': true
    }
  },
  server: {
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000
    }
  }
});
