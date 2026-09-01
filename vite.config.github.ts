import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// Configuração para GitHub Pages
// Usa HashRouter e base path correto

export default defineConfig({
  base: '/bunkr-albums/',
  plugins: [react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-github",
    rollupOptions: {
      output: {
        // Garante que os chunks usem o path correto
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
