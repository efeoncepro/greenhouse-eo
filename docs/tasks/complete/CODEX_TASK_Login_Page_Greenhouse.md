# CODEX TASK — Rediseño de la Página de Login del Greenhouse Portal

## Resumen

Reemplazar la página de login actual del portal Greenhouse por una versión limpia y alineada con la identidad de marca Efeonce. La página actual tiene dos problemas: en `pre-greenhouse` (branch de Codex) se sobre-diseñó con un panel izquierdo tipo landing page que no corresponde a un login, y en `main` (producción) se mantiene el contenido demo de Vuexy (personaje 3D, cards de "Profit" y "Order") que no tiene relación con Greenhouse.

**El login es puerta de entrada, no pitch deck.** La complejidad visual va después del login (Pulse, Proyectos). Aquí gana la limpieza, el branding sutil y los copys correctos del documento de Nomenclatura.

**Esta tarea NO toca la lógica de autenticación** (NextAuth, providers, callbacks, BigQuery). Solo modifica la capa visual y de copy de la página de login. La lógica de auth ya está definida en `docs/tasks/complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md` y esta tarea la complementa — específicamente **reemplaza la sección B6 (Página de login)** de ese documento con las especificaciones de diseño aquí descritas.

---

## Contexto del proyecto

- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Branch de trabajo:** `feature/login-redesign`
- **Framework:** Next.js 14+ (Vuexy Admin Template, starter-kit)
- **UI Library:** MUI (Material UI) v5
- **Package manager:** pnpm
- **Deploy:** Vercel (auto-deploy desde `main`, preview desde feature branches)
- **Documento normativo:** `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md` — secciones 3 (Login), 12.1 (donde aplica metáfora), 13.1 (constantes) y 14 (design tokens)

---

## Archivo principal a modificar

Buscar la página de login actual de Vuexy en una de estas ubicaciones (depende de la versión del starter-kit):

```
src/app/(blank-layout-pages)/login/page.tsx
src/views/Login.tsx
src/views/pages/auth/login-v1/index.tsx
src/views/pages/auth/login-v2/index.tsx
```

Identificar cuál está en uso revisando el routing en `src/app/`. Si hay múltiples, la que esté montada en la ruta `/login` es la que se modifica.

---

## Diseño objetivo

### Layout general

Layout de dos columnas (desktop) / una columna (mobile), usando el layout `blank` de Vuexy (sin sidebar ni navbar).

| Columna izquierda (60%) | Columna derecha (40%) |
|---|---|
| Panel de marca Greenhouse | Formulario de autenticación |

En mobile, solo se muestra la columna derecha (formulario). La columna izquierda es decorativa y se oculta con `display: none` en breakpoints `md` hacia abajo.

### Columna izquierda — Panel de marca

**Fondo:** Gradiente sutil usando Deep Azure (#023c70) como base. Dirección: de abajo-izquierda a arriba-derecha. Opacidad del gradiente suave — no saturado ni plano.

Sugerencia de gradiente:
```css
background: linear-gradient(135deg, #023c70 0%, #024c8f 50%, #0375db 100%);
```

**Contenido sobre el gradiente:**

1. **Logo Efeonce** — versión blanca, posicionado arriba a la izquierda con padding generoso. Buscar el asset en `public/images/` o `src/assets/`. Si no existe la versión blanca, usar el logo existente con filtro CSS `brightness(0) invert(1)`.

2. **Texto central** (centrado vertical y horizontalmente en la columna):
   - Label superior: `GREENHOUSE PORTAL` — tipografía uppercase, font-size pequeño (12-13px), letter-spacing amplio (2-3px), color blanco al 70% de opacidad. Font-weight 500-600.
   - Título: `Visibilidad real de tu operación creativa.` — tipografía bold (font-weight 700), font-size grande (28-32px), color blanco 100%, line-height ajustado (1.2). Max-width ~400px para que no se extienda demasiado.
   - Subtítulo: `Métricas ICO, status de proyectos y el ritmo de tu producción — todo en un solo lugar.` — tipografía regular, font-size 15-16px, color blanco al 80%, line-height 1.5, max-width ~420px.

3. **Sin cards, sin bullets, sin features.** No replicar lo que hizo Codex con las cards de Pulse/Proyectos/Ciclos/Mi Greenhouse. El panel izquierdo es ambiental, no informativo.

4. **Elemento decorativo opcional:** un shape sutil (círculo o semicírculo) en la esquina inferior derecha de la columna, en blanco al 5-8% de opacidad. Esto agrega profundidad visual sin distraer. Si es complejo de implementar, omitir — el gradiente solo ya funciona.

### Columna derecha — Formulario de autenticación

**Fondo:** Blanco (`#FFFFFF`). Contraste limpio con la columna izquierda.

**Contenido, de arriba a abajo:**

1. **Título:** `Entra al Greenhouse` — font-size 24-26px, font-weight 600-700, color Midnight Navy (`#022a4e` de `GH_COLORS.neutral.textPrimary`).

2. **Subtítulo:** `Tu espacio de crecimiento te espera` — font-size 14-15px, color gris (`#848484` de `GH_COLORS.neutral.textSecondary`), margin-bottom generoso (24-32px).

3. **Botón Microsoft SSO (CTA principal):**
   - Texto: `Entrar con Microsoft`
   - Ícono: Logo de Microsoft (4 cuadrados de colores) a la izquierda del texto. Usar un SVG inline del ícono oficial de Microsoft o un ícono de la librería que ya tenga Vuexy.
   - Estilo: Fondo Deep Azure (`#023c70`), texto blanco, border-radius consistente con Vuexy (6-8px), height 48px, width 100%.
   - Hover: Fondo Royal Blue (`#024c8f`).
   - **Este es el CTA principal.** Va arriba del formulario, separado por un divider visual.
   - **Nota:** Si Microsoft SSO no está configurado (las env vars `AZURE_AD_CLIENT_ID` y `AZURE_AD_CLIENT_SECRET` no existen), mostrar el botón deshabilitado con un info banner debajo que diga: `"Microsoft SSO aún no está configurado en este ambiente. Puedes usar credenciales mientras se cargan AZURE_AD_CLIENT_ID y AZURE_AD_CLIENT_SECRET."` — Esto ya existe en la versión actual de pre-greenhouse y está correcto como patrón de fallback.

4. **Divider:** Línea horizontal con texto `o` centrado. Color de la línea: `#dbdbdb` (`GH_COLORS.neutral.border`). Texto del divider en gris secundario.

5. **Campo Email:**
   - Label: `Email`
   - Placeholder: `Tu email corporativo`
   - Usar el componente TextField de MUI estándar de Vuexy. Variant `outlined`.

6. **Campo Password:**
   - Label: `Password`
   - Placeholder: (vacío o puntos)
   - Con toggle de visibilidad (ojo) — ya existe en la versión actual.

7. **Botón credentials:**
   - Texto: `Entrar con email`
   - Estilo: Outlined, borde `#023c70`, texto `#023c70`, fondo transparente. Width 100%, height 44px.
   - Hover: Fondo `#023c70` al 5% de opacidad.
   - **Este es el botón secundario.** No compite visualmente con el botón de Microsoft.

8. **Texto informativo (footer del formulario):**
   - `El acceso al portal se provisiona internamente. Si tu cuenta aún no aparece, contacta a tu equipo de cuenta.`
   - Font-size 12-13px, color gris secundario (`#848484`), margin-top 16-24px.

9. **NO incluir:**
   - Link de "Olvidé mi contraseña"
   - Link de "Crear cuenta" / "Registrarse"
   - Checkbox de "Recordarme"
   - Links a términos y condiciones
   - Ningún contenido demo de Vuexy (personas 3D, cards de métricas genéricas, etc.)

### Error states

| Evento | Comportamiento |
|---|---|
| Credenciales incorrectas | Alert de MUI tipo `error` debajo del botón de email: `"Las credenciales no coinciden. Intenta de nuevo o contacta a tu equipo de cuenta."` |
| Error de red / servidor | Alert tipo `warning`: `"No pudimos conectar. Intenta de nuevo en unos minutos."` |
| Microsoft SSO rechazado | Redirige a `/auth/access-denied` (definida en `docs/tasks/complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md`, sección B7) |

---

## Fuente de verdad para copys y colores

**Todo texto visible sale de `GH_MESSAGES` y `GH_LABELS` en `src/config/greenhouse-nomenclature.ts`.** No hardcodear strings.

Si el archivo `greenhouse-nomenclature.ts` no existe aún, crearlo con las constantes definidas en `docs/architecture/Greenhouse_Nomenclatura_Portal_v3.md`, sección 13.1. Incluir como mínimo:

- `GH_MESSAGES.login_title` → `'Entra al Greenhouse'`
- `GH_MESSAGES.login_subtitle` → `'Tu espacio de crecimiento te espera'`
- `GH_MESSAGES.login_button` → `'Entrar'`
- `GH_MESSAGES.error_connection` → `'No pudimos conectar con tus datos. Intenta de nuevo en unos minutos.'`
- `GH_COLORS.neutral.textPrimary` → `'#022a4e'`
- `GH_COLORS.neutral.textSecondary` → `'#848484'`
- `GH_COLORS.neutral.border` → `'#dbdbdb'`
- `GH_COLORS.role.account.source` → `'#023c70'` (Deep Azure, color principal del botón Microsoft y branding)

**Todo color sale de `GH_COLORS`.** No escribir hex directamente en componentes.

---

## Responsive

| Breakpoint | Comportamiento |
|---|---|
| `lg+` (≥1200px) | Dos columnas: 60/40 |
| `md` (900-1199px) | Dos columnas: 50/50, texto del panel izquierdo más compacto |
| `sm` y `xs` (<900px) | Solo columna derecha. Panel de marca oculto. Logo Efeonce versión pequeña arriba del título del formulario. |

En mobile, agregar el logo Efeonce (versión color, no blanca) centrado arriba del título "Entra al Greenhouse", con margin-bottom de 24px.

---

## Estructura de archivos

```
src/
├── app/
│   └── (blank-layout-pages)/
│       └── login/
│           └── page.tsx          ← Modificar (o reescribir)
├── config/
│   └── greenhouse-nomenclature.ts ← Crear si no existe
└── views/
    └── Login.tsx                  ← Modificar si la page.tsx delega a este view
```

---

## Criterios de aceptación

**Visual:**
- [ ] Layout de dos columnas con panel de marca azul a la izquierda y formulario blanco a la derecha
- [ ] Panel izquierdo con gradiente Deep Azure → Core Blue, logo blanco, texto descriptivo sin cards ni features
- [ ] Botón Microsoft SSO como CTA principal (Deep Azure, ícono de Microsoft, width 100%)
- [ ] Formulario de email/password como opción secundaria (botón outlined)
- [ ] Divider visual con "o" entre ambas opciones
- [ ] Sin contenido demo de Vuexy (personajes 3D, cards genéricas de Profit/Order)
- [ ] Sin links de registro, recuperar contraseña, ni checkbox de recordar
- [ ] Texto informativo de provisión interna al final del formulario

**Copy (todo desde `greenhouse-nomenclature.ts`, no hardcodeado):**
- [ ] Título: "Entra al Greenhouse"
- [ ] Subtítulo: "Tu espacio de crecimiento te espera"
- [ ] Placeholder email: "Tu email corporativo"
- [ ] Placeholder password: "Password" (no "Contraseña")
- [ ] Botón Microsoft: "Entrar con Microsoft"
- [ ] Botón credentials: "Entrar con email"
- [ ] Error de credenciales con mensaje amigable que sugiere contactar equipo de cuenta
- [ ] Footer: "El acceso al portal se provisiona internamente..."

**Colores (todo desde `GH_COLORS`, no hex directo):**
- [ ] Panel izquierdo: gradiente sobre Deep Azure (#023c70)
- [ ] Título del formulario: Midnight Navy (#022a4e)
- [ ] Subtítulo y texto secundario: Brand Gray (#848484)
- [ ] Botón Microsoft: Deep Azure fondo, blanco texto
- [ ] Botón credentials: Deep Azure outlined
- [ ] Divider: Light Alloy (#dbdbdb)

**Responsive:**
- [ ] Desktop (lg+): dos columnas 60/40
- [ ] Tablet (md): dos columnas 50/50
- [ ] Mobile (sm, xs): solo formulario, logo Efeonce color arriba del título

**Funcional:**
- [ ] Botón Microsoft ejecuta `signIn('azure-ad', { callbackUrl: '/dashboard' })`
- [ ] Formulario credentials ejecuta `signIn('credentials', { email, password, redirect: false })` y maneja errores
- [ ] Si Microsoft SSO no está configurado, botón deshabilitado con info banner
- [ ] Redirección post-login a `/dashboard`

---

## Lo que NO incluye esta tarea

- Lógica de autenticación (NextAuth providers, callbacks, BigQuery lookups) — ver `docs/tasks/complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md`
- Página de acceso denegado (`/auth/access-denied`) — ver `docs/tasks/complete/CODEX_TASK_Microsoft_SSO_Greenhouse.md`, sección B7
- Dashboard post-login (Pulse) — ver `docs/tasks/complete/CODEX_TASK_Client_Dashboard_Redesign.md`
- Las demás vistas del portal (Proyectos, Ciclos, Mi Greenhouse)

---

## Referencia visual

**LO QUE NO QUEREMOS:**
- Panel izquierdo tipo landing con hero text + cards descriptivas de features (lo que hizo Codex en pre-greenhouse) — es un login, no un onboarding
- Contenido demo de Vuexy con personajes 3D y cards de Profit/Order (lo que está en main) — no tiene relación con Greenhouse

**LO QUE SÍ QUEREMOS:**
- Limpieza y espacio en blanco del lado del formulario (como Vuexy base, pero sin el contenido demo)
- Panel de marca que transmita profesionalismo y confianza sin sobrecargar
- Un login que un CMO pueda usar sin sentir que está entrando a una herramienta de desarrollo ni a un pitch deck

---

## Notas técnicas

- Usar componentes MUI estándar de Vuexy: `TextField`, `Button`, `Divider`, `Alert`, `Typography`, `Box`, `Grid`.
- No instalar librerías adicionales para esta tarea.
- El gradiente del panel izquierdo se puede hacer con CSS puro (no necesita librería).
- Si el logo Efeonce en SVG blanco no existe como asset, crear un wrapper que aplique filtro CSS: `filter: brightness(0) invert(1)` al logo existente.
- Mantener el layout `blank` de Vuexy (el que no tiene sidebar) para la página de login.
- Esta tarea es compatible con el branch `feature/microsoft-sso` — si ese branch ya existe, trabajar sobre él. Si no, crear `feature/login-redesign` desde `develop`.
