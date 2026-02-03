# 🔍 Debug Guide: Video Background Effect

## 📋 Instrucciones de Testing

### 1. **Abrir el servidor en el puerto correcto**
   - El servidor debe estar en: `http://localhost:3004`
   - Si ves otro puerto, ajusta la URL

### 2. **Ir a la página Community Pot**
   ```
   http://localhost:3004/community-pot
   ```

### 3. **Abrir DevTools (F12)**
   - Ve a la pestaña "Console"
   - Limpia la consola (botón 🚫 o Ctrl+L)

### 4. **Reproducir "Telepath - Teardrops (edited).mp3"**
   - Hover sobre la esquina inferior derecha para ver el music player
   - Click en Play
   - Expandir la lista y seleccionar "Telepath - Teardrops (edited)"

## 🔎 Qué logs deberías ver en la consola

### ✅ Logs esperados cuando TODO funciona:

```
[TeardropsVideoBackground] Status: {
  currentTrackName: "Telepath - Teardrops (edited)",
  isTeardropsSong: true,
  isMobile: false,
  shouldShow: true
}
[TeardropsVideoBackground] ✅ Video effect ACTIVATED

[VideoBackgroundManager] 🎬 Component mounted, fetching videos...
[VideoBackgroundManager] 📡 Fetching from /api/videos
[VideoBackgroundManager] 📦 Received data: {videos: Array(53)}
[VideoBackgroundManager] ✅ Loaded 53 videos
[VideoBackgroundManager] 📹 First video: /I LOVE FREE 4K STOCK VIDEOS/...
[VideoBackgroundManager] 🔀 Shuffled playlist, first: /I LOVE FREE 4K STOCK VIDEOS/...
[VideoBackgroundManager] ▶️ Setting active to TRUE
[VideoBackgroundManager] 📼 Loading videos: {currentIndex: 0, nextIndex: 1, ...}
[VideoBackgroundManager] 🎥 RENDERING video elements (opacity: 1 / 0)
[VideoBackgroundManager] Next transition in 12.3s
```

### ❌ Escenarios de error y sus causas:

#### **Problema 1: No detecta la canción**
```
[TeardropsVideoBackground] Status: {
  currentTrackName: null,  ← El problema
  isTeardropsSong: false,
  isMobile: false,
  shouldShow: false
}
[TeardropsVideoBackground] ⏸️ Wrong song or no song playing
```
**Causa**: MusicTrackContext no está compartiendo el estado
**Solución**: Verificar que el archivo de música se llama exactamente "Telepath - Teardrops (edited).mp3"

#### **Problema 2: Detecta como móvil**
```
[TeardropsVideoBackground] Status: {
  currentTrackName: "Telepath - Teardrops (edited)",
  isTeardropsSong: true,
  isMobile: true,  ← El problema
  shouldShow: false
}
[TeardropsVideoBackground] ⏭️ Skipped on mobile device
```
**Causa**: El navegador es detectado como móvil (touchscreen o ventana < 768px)
**Solución**: Expande la ventana del navegador a más de 768px de ancho

#### **Problema 3: API no responde**
```
[VideoBackgroundManager] 🎬 Component mounted, fetching videos...
[VideoBackgroundManager] 📡 Fetching from /api/videos
[VideoBackgroundManager] ❌ Error loading videos: [error details]
```
**Causa**: El endpoint /api/videos no funciona
**Solución**: Verificar que la carpeta existe y el servidor está corriendo

#### **Problema 4: No hay videos**
```
[VideoBackgroundManager] ✅ Loaded 0 videos
[VideoBackgroundManager] ⚠️ No videos found in response
[VideoBackgroundManager] 🚫 Not rendering (isActive: false, playlist.length: 0)
```
**Causa**: La carpeta de videos está vacía o no existe
**Solución**: Verificar `public/I LOVE FREE 4K STOCK VIDEOS/` tiene 53 archivos .mp4

## 🎯 Tests rápidos en consola

### Test 1: Verificar API
```javascript
fetch('/api/videos').then(r => r.json()).then(console.log)
// Debe devolver: {videos: Array(53)}
```

### Test 2: Verificar Context
```javascript
// Inspeccionar el React Components tree en DevTools
// Buscar MusicTrackContext.Provider
// Verificar que TeardropsVideoBackground está dentro del árbol
```

### Test 3: Verificar videos manualmente
Abre en una pestaña nueva:
```
http://localhost:3004/I LOVE FREE 4K STOCK VIDEOS/10176482-uhd_4096_2160_25fps.mp4
```
Debería reproducirse el video.

## 📝 Qué compartir si no funciona

Por favor compárteme:

1. **Todos los logs** de la consola cuando reproduces la canción
2. **Screenshot** de la pestaña "Network" filtrando por "videos"
3. **Este comando** (correlo en tu terminal):
   ```bash
   ls "public/I LOVE FREE 4K STOCK VIDEOS/" | wc -l
   ```
4. **Ancho de tu ventana** del navegador (en DevTools > Console, escribe: `window.innerWidth`)

## 🚀 Si todo funciona correctamente

Deberías ver:
- ✅ Videos 4K reproduciéndose **detrás** de la escena 3D
- ✅ La esfera USDC y satélites visibles **encima** de los videos
- ✅ Transición suave a otro video cada 10-15 segundos
- ✅ Fade-out cuando cambias de canción

---

**Última actualización**: Los logs ahora incluyen emojis para facilitar la lectura 🎬📡✅❌
