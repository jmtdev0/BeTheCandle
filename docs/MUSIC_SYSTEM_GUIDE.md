# 🎵 Sistema de Música de Fondo - Guía Completa

## 📁 Estructura

```
public/
  └── background_music/          # Carpeta de archivos de audio
      ├── README.md             # Guía de la carpeta
      └── [tus archivos .mp3]   # Aquí van las canciones

src/
  ├── components/
  │   └── MusicPlayer.tsx       # Componente del reproductor
  └── lib/
      └── musicTracks.ts        # Configuración de canciones
```

## 🚀 Cómo Añadir Música

### Paso 1: Añadir archivos de audio

1. Coloca tus archivos de audio en `public/background_music/`
2. Formatos soportados: **MP3** (recomendado), WAV, OGG
3. Nombres recomendados: usa guiones bajos o guiones medios
   - ✅ `ambient-space.mp3`
   - ✅ `cosmic_journey.mp3`
   - ❌ `Ambient Space (2023).mp3` (evita espacios y paréntesis)

### Paso 2: Registrar las canciones

Abre `src/lib/musicTracks.ts` y añade tus canciones al array `MUSIC_TRACKS`:

```typescript
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    name: "ambient-space",                    // ID único (sin extensión)
    path: "/background_music/ambient-space.mp3",  // Ruta desde /public
    displayName: "Ambient Space"              // Nombre que ve el usuario
  },
  {
    name: "cosmic-journey",
    path: "/background_music/cosmic-journey.mp3",
    displayName: "Cosmic Journey"
  },
  {
    name: "electronic-calm",
    path: "/background_music/electronic-calm.mp3",
    displayName: "Electronic Calm"
  },
];
```

### Paso 3: ¡Listo!

El reproductor detectará automáticamente las canciones y las mostrará en la interfaz.

## 🎛️ Características del Reproductor

### Control de Volumen
- **Slider**: Desliza para ajustar el volumen (0-100%)
- **Botón Mute**: Click rápido para silenciar/activar
- **Memoria**: El reproductor recuerda el último volumen antes de silenciar

### Selector de Canciones
- **Click en ↑**: Expande la lista de canciones disponibles
- **Click en cualquier canción**: Cambia instantáneamente
- **Indicador**: La canción actual se resalta en naranja
- **Animación**: ♪ muestra cuando una canción está reproduciéndose

### Reproducción
- **Play/Pause**: Control de reproducción
- **Loop automático**: Las canciones se repiten
- **Contador**: Muestra canción actual / total (ej: 2 / 5)

## 🎨 Ubicación en la UI

El reproductor aparece en la **esquina inferior derecha** de la página, con:
- Fondo oscuro semitransparente (bg-gray-900/95)
- Backdrop blur para efecto moderno
- Color naranja Bitcoin (#f7931a) en elementos activos
- Z-index alto (z-50) para estar siempre visible

## 📝 Ejemplo Completo

Digamos que tienes estos archivos:
```
public/background_music/
  ├── space-ambient-1.mp3
  ├── electronic-chill.mp3
  └── cosmic-waves.mp3
```

Tu `musicTracks.ts` debería verse así:

```typescript
export const MUSIC_TRACKS: MusicTrack[] = [
  {
    name: "space-ambient-1",
    path: "/background_music/space-ambient-1.mp3",
    displayName: "Space Ambient I"
  },
  {
    name: "electronic-chill",
    path: "/background_music/electronic-chill.mp3",
    displayName: "Electronic Chill"
  },
  {
    name: "cosmic-waves",
    path: "/background_music/cosmic-waves.mp3",
    displayName: "Cosmic Waves"
  },
];
```

## ⚙️ Configuración Avanzada

### Cambiar volumen inicial

En `MusicPlayer.tsx`, línea ~15:
```typescript
const [volume, setVolume] = useState(0.3); // 0.3 = 30%
```

### Desactivar loop automático

En `MusicPlayer.tsx`, encuentra:
```typescript
audioRef.current.loop = true; // Cambia a false
```

### Cambiar posición del reproductor

En `MusicPlayer.tsx`, encuentra la clase del contenedor:
```typescript
className="fixed bottom-6 right-6 z-50"
//          ^^^^^^^ ^^^^^ ^^^^^^
//          posición vertical: bottom-6, top-6
//                 horizontal: right-6, left-6
```

## 🎵 Recomendaciones de Música

### Estilo
- Música ambiental
- Electrónica chill
- Synthwave espacial
- Música cinematográfica

### Especificaciones Técnicas
- **Formato**: MP3
- **Bitrate**: 128-192 kbps (equilibrio calidad/tamaño)
- **Duración**: 2-5 minutos
- **Volumen**: Normalizado (evita picos)

### Fuentes Libres de Derechos
- YouTube Audio Library
- Free Music Archive
- Incompetech
- Purple Planet Music
- Bensound

## 🐛 Solución de Problemas

### La música no suena
1. Verifica que el archivo esté en `/public/background_music/`
2. Comprueba la ruta en `musicTracks.ts` (debe empezar con `/background_music/`)
3. Asegúrate de que el formato sea MP3
4. Verifica que el volumen no esté en 0 o muteado

### El reproductor no aparece
1. Si `MUSIC_TRACKS` está vacío, el reproductor no se muestra
2. Verifica que haya al menos una canción registrada

### Error al cargar
1. Abre la consola del navegador (F12)
2. Busca errores 404 (archivo no encontrado)
3. Verifica que el nombre del archivo coincida exactamente (distingue mayúsculas)

## 📋 Checklist Rápido

- [ ] Archivos de audio en `/public/background_music/`
- [ ] Canciones registradas en `src/lib/musicTracks.ts`
- [ ] Rutas correctas (empiezan con `/background_music/`)
- [ ] Nombres de archivo sin espacios ni caracteres especiales
- [ ] Formato MP3 para mejor compatibilidad
- [ ] Volumen de archivos normalizado

## 🎉 ¡Disfruta de tu música!

El sistema está listo para usar. Solo añade tus canciones favoritas y disfruta de la experiencia completa.
