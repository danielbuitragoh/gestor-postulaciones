import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // En GitHub Pages el gestor vive en /gestor-postulaciones/, no en la raíz
  // del dominio: sin esta base, el HTML pediría los JS y CSS a la raíz y la
  // página saldría en blanco. En local y en `vite preview` se queda en '/'.
  base: process.env['GITHUB_PAGES'] ? '/gestor-postulaciones/' : '/',
})
