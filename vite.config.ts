import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';
export default defineConfig({
  resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},
  plugins:[react(),tailwindcss(),VitePWA({
    registerType:'autoUpdate', includeAssets:['favicon.svg','icon-192.png','icon-512.png','og.png'],
    manifest:{name:'DBMS Study Desk',short_name:'Study Desk',description:'An interactive DBMS handbook and progress checklist for Nirma CSE.',theme_color:'#0a0d14',background_color:'#0a0d14',display:'standalone',start_url:'/',icons:[{src:'/icon-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'/icon-512.png',sizes:'512x512',type:'image/png',purpose:'any'},{src:'/icon-maskable.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},
    workbox:{globPatterns:['**/*.{js,css,html,woff2,wasm,png,svg}'],maximumFileSizeToCacheInBytes:5*1024*1024,navigateFallback:'/index.html',cleanupOutdatedCaches:true}
  })],
  build:{target:'es2022',chunkSizeWarningLimit:700},
});
