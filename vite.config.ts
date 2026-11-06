import { defineConfig } from 'vite';

export default defineConfig({
  // Percorsi relativi: il sito funziona sia in locale sia su https://<utente>.github.io/<repository>/
  base: './',
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
});
