# Twitter Integration Setup

Esta función automáticamente publica un tweet después de cada reparto completado en Mainnet.

## Configuración de Credenciales de Twitter

### 1. Crear una App de Twitter

1. Ve a [Twitter Developer Portal](https://developer.twitter.com/en/portal/dashboard)
2. Inicia sesión con tu cuenta de Twitter
3. Crea un nuevo proyecto y una nueva App
4. En la configuración de la App, ve a "Keys and tokens"

### 2. Generar Credenciales OAuth 1.0a

En la sección "Keys and tokens":

1. **API Key** y **API Key Secret**: Se generan automáticamente cuando creas la App
2. **Access Token** y **Access Token Secret**: Haz clic en "Generate" en la sección "Access Token and Secret"

### 3. Configurar Permisos

1. Ve a la pestaña "Settings" de tu App
2. En "User authentication settings", haz clic en "Set up"
3. Selecciona los permisos necesarios (mínimo "Read and Write")
4. Guarda los cambios

### 4. Añadir las Credenciales a Supabase

En tu proyecto de Supabase:

1. Ve a "Edge Functions" > "Settings"
2. En la sección "Secrets", añade las siguientes variables:

```bash
TWITTER_API_KEY=tu_api_key_aqui
TWITTER_API_SECRET=tu_api_secret_aqui
TWITTER_ACCESS_TOKEN=tu_access_token_aqui
TWITTER_ACCESS_TOKEN_SECRET=tu_access_token_secret_aqui
PUBLIC_SITE_URL=https://bethecandle.vercel.app
```

O, si usas el CLI de Supabase:

```bash
supabase secrets set TWITTER_API_KEY=tu_api_key_aqui
supabase secrets set TWITTER_API_SECRET=tu_api_secret_aqui
supabase secrets set TWITTER_ACCESS_TOKEN=tu_access_token_aqui
supabase secrets set TWITTER_ACCESS_TOKEN_SECRET=tu_access_token_secret_aqui
supabase secrets set PUBLIC_SITE_URL=https://bethecandle.vercel.app
```

## Comportamiento

- **Solo Mainnet**: Los tweets solo se publican para repartos en Polygon Mainnet (chain_id = 137)
- **Opcional**: Si las credenciales no están configuradas, el reparto se completa normalmente sin publicar el tweet
- **Contenido del Tweet**: Incluye:
  - Cantidad total distribuida en USDC
  - Número de participantes
  - Enlace a la página de histórico de repartos

## Ejemplo de Tweet

```
🌟 Community Pot Distribution Complete!

💰 Amount: $50.00 USDC
👥 Participants: 5 (each gets $10.00 USDC)

View full history: https://bethecandle.vercel.app/community-pot/history

#Web3 #Polygon @USDC
```

## Solución de Problemas

Si los tweets no se publican:

1. Verifica que las credenciales estén correctamente configuradas en Supabase
2. Revisa los logs de la Edge Function para ver mensajes de error
3. Asegúrate de que tu App de Twitter tenga permisos de "Read and Write"
4. Verifica que el Access Token esté asociado a la cuenta correcta de Twitter
