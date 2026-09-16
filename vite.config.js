import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative assets make the same build work on GitHub Pages project sites,
  // Netlify, and Vercel without changing the source code.
  base: './',
});
