En este archivo, vamos a tratar los diferentes puntos que nos quedan para que la aplicación esté completa. 

# Puntos principales

* Nueva sección Community Pot. En esta sección, diariamente se recaudará un bote comunitario de BTC que se guardará en una dirección de memoria que yo custodiaré; aunque esto de custodiarlo quiero evitarlo a toda costa (¿sería posible alguna alternativa mediante Lightning Network?). A cierta hora del día, el bote se repartirá equitativamente entre todos los participantes, que habrán indicado la dirección de memoria en la que lo quieren recibir. Esto supondrá muchas transacciones, o una transacción masiva, lo que sea para evitar un exceso de comisiones. La representación visual de esta sección será también una escena espacial, como Goofy Mode, pero, en este caso, se podrá observar una nebulosa a la que se irán introduciendo los usuarios, representados con bolitas luminosas, quizá, y que irá creciendo conforme el bote aumente.
* Añadir más información a las tarjetas de información de los usuarios: un nombre preferido, enlaces a redes sociales
* En el Lobby, añadir un ránking de donantes: aquellos que más BTC han donado.

# Ajustes y mejoras

* El botón del color del satélite que se encuentra ahora mismo en la esquina superior izquierda se puede integrar también en la configuración del perfil del usuario.
* Añadir una flechita o un texto o algo con lo que el usuario pueda identificar visualmente en todo momento cuál es su satélite.
* Al cargar la página de Lobby, se está simulando un click izquierdo en el ratón sobre la estrella Bitcoin, vamos a desactivar este click inicial. Si no sabes a qué me refiero, me dices.
* Al hacer hover sobre los satélites, es un poco complicado a veces atinar con el ratón, sobre todo con los que son más pequeños. Es necesario ampliar el área de hover en los satélites para que el usuario tenga mayor facilidad para pinchar el que quiere. Si en ese área de hover circulan varios satélites, se reducirá la velocidad de todos ellos. Es como si el ratón llevara consigo un área de reducción de velocidad de los satélites.

# Ajustes y mejoras II

* Responsive total. Adaptación a móvil

# Pijotadas

* Que el favicon cambie continuamente. Que sea como un GIF de una estrella que flota y se mueve suavemente de arriba a abajo.


# Comentarios

* Recuerda que tenemos disponible una base de datos PostgresSQL que está alojada en Supabase. La parte backend necesaria en principio creo que la vamos a desarrollar en Supabase Edge Functions. ¿Cómo lo ves?
* No acumular todo el código en los mismos archivos. Crear carpetas separadas para las secciones Lobby (que ahora se llama Goofy Mode) y Community Pot.

---

## Notas GPT-o1

* Community Pot: lo abordaría creando `src/app/community-pot/` con una escena R3F independiente y tablas Supabase (`community_contributions`, `community_payouts`). El reparto diario lo delegaría a una Supabase Edge Function corriendo por cron; idealmente integraría un proveedor Lightning para pagos automáticos y custodiaríamos lo mínimo posible. La visual tendría una nebulosa con partículas que representen a cada usuario conectándose vía Realtime.
* Tarjetas de usuarios: ampliaría la payload de presencia (`preferredName`, `socialLinks`) para que Supabase Realtime transporte los datos y `SatelliteInfoCard` muestre enlaces/tags. Granularía la UI en un modal simple que permita editar y persistir esos campos desde el cliente mediante una Edge Function.
* Ránking de donantes: añadiría un endpoint `GET /api/donations/top` que agrupe `sum(amount_btc)` por usuario. En el lobby mostraría un panel (tal vez en la `Sidebar`) que consuma ese endpoint y se refresque con Realtime o un intervalo corto.
* Backend Supabase: me parece la mejor opción. Edge Functions cubren las necesidades de cron + endpoints protegidos y usamos la misma base de datos y Realtime.
* Organización: separar los módulos en carpetas (`/lobby`, `/community-pot`, `/components/common`) y mover shaders/utilidades a `src/lib/three/` evitará el caos conforme avancemos.

---

## Notas Claude Sonnet

### Community Pot
**Lightning Network**: De acuerdo con usar Lightning para reducir custodia. Recomendaría servicios como **LNbits** (self-hosted) o **OpenNode/Strike API** para gestionar el pool. Con Lightning podemos hacer payouts instantáneos con fees mínimas. Otra opción no-custodial sería usar **federated ecash** (Cashu/Fedimint), pero requiere más setup inicial.

**Transacciones batch**: Si usamos on-chain, implementar batch payouts con PSBT (Partially Signed Bitcoin Transactions) - una sola tx con múltiples outputs. Esto reduce fees drásticamente vs. txs individuales.

**Esquema DB sugerido**:
```sql
-- Contribuciones diarias
CREATE TABLE community_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount_sats BIGINT NOT NULL,
  lightning_invoice TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rondas de payout
CREATE TABLE payout_rounds (
  id UUID PRIMARY KEY,
  total_sats BIGINT,
  participant_count INT,
  sats_per_user BIGINT,
  status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  executed_at TIMESTAMPTZ
);

-- Pagos individuales
CREATE TABLE user_payouts (
  id UUID PRIMARY KEY,
  round_id UUID REFERENCES payout_rounds(id),
  user_id TEXT NOT NULL,
  btc_address TEXT NOT NULL,
  amount_sats BIGINT,
  tx_hash TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Visual nebulosa**: Usar instanced rendering para miles de partículas sin impacto en performance. El shader puede interpolar colores según el tamaño del pot (azul → morado → dorado conforme crece).

### Tarjetas de usuarios
**Validación de datos**: En la Edge Function que persiste los datos, validar con Zod:
- `preferredName`: max 32 chars, sanitizar HTML
- `socialLinks`: array max 5, validar URLs con regex
- Guardar en tabla `user_profiles` con foreign key a `auth.users` si usamos Supabase Auth

**Caché**: Considerar cachear perfiles en localStorage del cliente para evitar re-fetch constante.

### Ránking donantes
**Problema de agregación**: Si la tabla `donations` crece mucho, la query `sum()` puede ser lenta. Sugerencias:
1. Crear materialized view que se refresque cada hora
2. O tabla `donation_totals` que se actualice con triggers tras cada INSERT
3. Indexar `display_name` para speedup

**UI**: Mostraría top 10 con avatares generados (Dicebear API o similares). Podríamos añadir badges/logros (🏆 para top 3, etc.).

### Estructura de carpetas propuesta
```
src/
├── app/
│   ├── (lobby)/              # Route group - comparte layout
│   │   ├── goofy-mode/
│   │   │   └── page.tsx
│   │   └── layout.tsx
│   ├── community-pot/
│   │   ├── page.tsx
│   │   ├── layout.tsx
│   │   └── components/       # Componentes específicos del pot
│   │       ├── Nebula3D.tsx
│   │       └── ContributionForm.tsx
│   └── api/
│       ├── donations/
│       │   ├── route.ts
│       │   └── top/          # Ránking endpoint
│       │       └── route.ts
│       └── community-pot/
│           └── route.ts
├── components/
│   ├── common/               # Shared components
│   │   ├── BackgroundMusic.tsx
│   │   └── Sidebar.tsx
│   ├── lobby/
│   │   ├── InteractiveSphere3D.tsx
│   │   └── SatelliteInfoCard.tsx
│   └── community-pot/
│       └── ParticleField.tsx
├── hooks/
│   ├── useRealtimeDonations.ts
│   ├── useSocket.ts
│   └── useCommunityPot.ts   # Nuevo hook
└── lib/
    ├── three/               # Utilidades Three.js
    │   ├── shaders/
    │   │   ├── nebula.glsl
    │   │   └── star.glsl
    │   └── utils.ts
    └── bitcoin/             # Utilidades BTC/Lightning
        ├── lightning.ts
        └── batchPayouts.ts
```

### Consideraciones adicionales
- **Testing**: Añadir tests E2E con Playwright para flujos críticos (donación, payout).
- **Monitoreo**: Integrar Sentry para trackear errores en Edge Functions.
- **Rate limiting**: Proteger endpoints de payout con rate limits (Upstash Redis + middleware).
- **Seguridad**: Nunca exponer private keys en el cliente. Todo firmado server-side.
- **UX progresiva**: Mostrar skeletons/loaders mientras carga Realtime data.

¿Algún punto que quieras profundizar o cambiar el enfoque?


