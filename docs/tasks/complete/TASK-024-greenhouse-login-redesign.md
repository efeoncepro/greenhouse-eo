# CODEX TASK — Rediseño pantalla de login Greenhouse

## Resumen

Reemplazar la pantalla de login actual (personaje 3D genérico + cards de Profit/Order del template Vuexy) por una pantalla con identidad Greenhouse propia. La implementación es 100% código — no requiere diseñador. Requiere el logo de Greenhouse aprobado en formato SVG.

---

## Contexto del proyecto

- **Producto:** Greenhouse™ — Plataforma central del modelo ASaaS de Efeonce
- **Repo:** `github.com/efeoncepro/greenhouse-eo`
- **Stack:** Next.js 16.1.1, React 19.2.3, TypeScript 5.9.3, MUI 7.x, Vuexy Admin Template
- **Auth:** NextAuth.js + Microsoft Entra ID SSO + Google SSO + Credentials fallback
- **Azure App:** Client ID `3626642f-0451-4eb2-8c29-d2211ab3176c`, Tenant ID `a80bf6c1-7c45-4d70-b043-51389622a0e4`
- **Deploy:** Vercel Pro, dominio `greenhouse.efeoncepro.com`

### Audiencia de la pantalla de login

Greenhouse es multi-audiencia. La pantalla de login la ven TODOS:
- **Clientes de Globe** (producción creativa, branding)
- **Clientes de Efeonce Digital** (CRM, implementación HubSpot)
- **Clientes de Reach** (medios, amplificación)
- **Clientes de Wave** (infraestructura digital)
- **Clientes de CRM Solutions**
- **Colaboradores internos de Efeonce** (HR, finanzas, operaciones, nómina)

**Regla de UX Writing:** Todo copy en esta pantalla debe ser verdad para el 100% de las personas que la van a ver. Si alguien puede leerlo y pensar "eso no es para mí", está mal.

### Documentos normativos (LEER ANTES DE ESCRIBIR CÓDIGO)

| Documento | Qué aporta |
|-----------|------------|
| `Greenhouse_Nomenclatura_Portal_v3.md` | Copy, design tokens, reglas de Vuexy, paleta UI |
| `GREENHOUSE_IDENTITY_ACCESS_V2.md` | Auth flow, providers, RBAC |
| `CODEX_TASK_Microsoft_SSO_Greenhouse.md` | Config de Entra ID |
| `CODEX_TASK_Google_SSO_Greenhouse.md` | Config de Google OAuth |

---

## Dependencias previas

- [ ] Logo de Greenhouse aprobado en formato SVG (tarea: "Greenhouse — Diseño de logo")
- [ ] Auth flow de NextAuth.js funcional (Microsoft SSO + Google SSO + Credentials)

---

## Problema actual

La pantalla de login actual tiene:
- Logo de Efeonce solo, sin logo de Greenhouse
- Personaje 3D genérico (stock de Blender/Sketchfab) sin relación con la marca
- Cards flotantes de "Profit" y "Order" del template Vuexy — no representan métricas de Greenhouse
- Fondo gris claro genérico — sin identidad de marca
- Copy parcialmente correcto pero no alineado con la Nomenclatura v3

---

## Estructura: layout de dos paneles

### Panel izquierdo (60% del ancho) — Momento de marca

```
┌──────────────────────────────────────────────────────┐
│  [G] Greenhouse                     ○ (decorativo)   │
│                                   ○                  │
│                                                      │
│  Todo tu ecosistema.                                 │
│  Un solo lugar.                                      │
│                                                      │
│  La plataforma de Efeonce donde todo                 │
│  se conecta y todo se mide.                          │
│                                                      │
│  ┌──────────────────────────────────────────┐        │
│  │ [ico] Visibilidad en tiempo real         │        │
│  │       Lo que necesitas ver, siempre      │        │
│  │       actualizado                        │        │
│  ├──────────────────────────────────────────┤        │
│  │ [ico] Datos que importan                 │        │
│  │       Las métricas correctas para tus    │        │
│  │       decisiones                         │        │
│  ├──────────────────────────────────────────┤        │
│  │ [ico] Mejora continua                    │        │
│  │       Cada mes es mejor que el anterior  │        │
│  └──────────────────────────────────────────┘        │
│                                                      │
│  Greenhouse™ · Efeonce Group · 2026                  │
└──────────────────────────────────────────────────────┘
```

**Especificaciones del panel izquierdo:**

- Fondo: Midnight Navy `#022a4e`
- Logo Greenhouse: isotipo G en contenedor `#1B7A4E` con `border-radius: 8px` + wordmark blanco. Usar el SVG provisto.
- Hero título: "Todo tu ecosistema. Un solo lugar." — blanco, 22px, font-weight 500
- Hero subtítulo: "La plataforma de Efeonce donde todo se conecta y todo se mide." — blanco 55% opacidad, 13px
- Tres cards de propuesta de valor en stack vertical, gap 12px:
  - Card bg: `rgba(255,255,255, 0.06)`
  - Card border: `0.5px solid rgba(255,255,255, 0.08)`
  - Card border-radius: `10px`
  - Card padding: `14px 16px`
  - Icono: contenedor 32x32, border-radius 8px, SVG inline 16x16
  - Título card: blanco, 13px, font-weight 500
  - Subtítulo card: blanco 40% opacidad, 11px
- Elementos decorativos: 3 círculos con borde sutil (`rgba` verde y blanco) en `position: absolute`. Son placeholder — se reemplazarán por elementos 3D cuando estén listos.
- Footer: "Greenhouse™ · Efeonce Group · 2026" — blanco 25% opacidad, 11px

**Cards de propuesta de valor:**

| # | Icono bg | Icono color | Título | Subtítulo |
|---|----------|-------------|--------|-----------|
| 1 | `rgba(27,122,78, 0.25)` | `#4CAF6E` | Visibilidad en tiempo real | Lo que necesitas ver, siempre actualizado |
| 2 | `rgba(3,117,219, 0.25)` | `#85B7EB` | Datos que importan | Las métricas correctas para tus decisiones |
| 3 | `rgba(255,255,255, 0.08)` | `rgba(255,255,255, 0.5)` | Mejora continua | Cada mes es mejor que el anterior |

### Panel derecho (40% del ancho) — Formulario de auth

```
┌────────────────────────────────┐
│                                │
│  Entra a tu Greenhouse         │
│  Accede con tu cuenta          │
│                                │
│  ┌────────────────────────┐    │
│  │ ⊞ Entrar con Microsoft │    │  ← primario (navy)
│  └────────────────────────┘    │
│  ┌────────────────────────┐    │
│  │ G  Entrar con Google   │    │  ← secundario (borde)
│  └────────────────────────┘    │
│         ——— o ———              │
│                                │
│  Tu email corporativo          │
│  ┌────────────────────────┐    │
│  │ jreyes@efeoncepro.com  │    │
│  └────────────────────────┘    │
│  Password                      │
│  ┌────────────────────────┐    │
│  │ ••••••••           👁  │    │
│  └────────────────────────┘    │
│      ¿Olvidaste tu contraseña? │
│  ┌────────────────────────┐    │
│  │       Entrar           │    │  ← terciario (borde)
│  └────────────────────────┘    │
│                                │
│  El acceso se provisiona       │
│  internamente. ¿No tienes      │
│  cuenta? Contacta a tu         │
│  administrador.                │
└────────────────────────────────┘
```

**Especificaciones del panel derecho:**

- Fondo: blanco (o `background-primary` en dark mode)
- Título: "Entra a tu Greenhouse" — 18px, font-weight 500
- Subtítulo: "Accede con tu cuenta" — 13px, color secundario
- Botón Microsoft SSO (primario): fondo `#022a4e`, texto blanco, icono Microsoft, border-radius 8px. Label: "Entrar con Microsoft"
- Botón Google SSO (secundario): fondo blanco, borde `0.5px solid`, icono Google, border-radius 8px. Label: "Entrar con Google"
- Separador "o" con líneas horizontales
- Campo email: label "Tu email corporativo", border-radius 8px
- Campo password: label "Password", border-radius 8px, toggle de visibilidad
- Link: "¿Olvidaste tu contraseña?" — Core Blue `#0375db`, alineado a la derecha
- Botón "Entrar" (terciario): fondo blanco, borde, texto oscuro, border-radius 8px
- Texto inferior: "El acceso se provisiona internamente. ¿No tienes cuenta? Contacta a tu administrador." — 11px, color terciario, centrado

---

## Copy exacto (aprobado por UX Writing audit)

| Elemento | Copy |
| --- | --- |
| Hero título | Todo tu ecosistema. Un solo lugar. |
| Hero subtítulo | La plataforma de Efeonce donde todo se conecta y todo se mide. |
| Card 1 título | Visibilidad en tiempo real |
| Card 1 subtítulo | Lo que necesitas ver, siempre actualizado |
| Card 2 título | Datos que importan |
| Card 2 subtítulo | Las métricas correctas para tus decisiones |
| Card 3 título | Mejora continua |
| Card 3 subtítulo | Cada mes es mejor que el anterior |
| Auth título | Entra a tu Greenhouse |
| Auth subtítulo | Accede con tu cuenta |
| Botón Microsoft | Entrar con Microsoft |
| Botón Google | Entrar con Google |
| Botón credentials | Entrar |
| Label email | Tu email corporativo |
| Label password | Password |
| Link password | ¿Olvidaste tu contraseña? |
| Texto inferior | El acceso se provisiona internamente. ¿No tienes cuenta? Contacta a tu administrador. |
| Footer | Greenhouse™ · Efeonce Group · 2026 |

**IMPORTANTE:** Este copy fue auditado por UX Writing contra la regla de universalidad multi-audiencia. NO cambiarlo sin aprobación.

---

## Especificaciones técnicas

### Paleta

| Token | Hex | Uso |
|-------|-----|-----|
| Midnight Navy | `#022a4e` | Fondo panel izquierdo, botón Microsoft |
| Greenhouse Green | `#1B7A4E` | Contenedor del isotipo G |
| Leaf | `#4CAF6E` | Iconos verdes en cards, indicadores de mejora |
| Core Blue | `#0375db` | Link de contraseña, iconos azules |
| Cards bg | `rgba(255,255,255, 0.06)` | Fondo de cards de propuesta de valor |
| Cards border | `rgba(255,255,255, 0.08)` | Borde de cards |

### Tipografía

- Usar Poppins (títulos, hero, botón labels) y DM Sans (body, labels de campo) del theme existente
- NO agregar Grift — eso es solo para el logo (que viene como SVG)

### Responsive

| Breakpoint | Comportamiento |
|------------|---------------|
| Desktop (≥1024px) | Dos paneles lado a lado (60/40) |
| Tablet (768-1023px) | Panel izquierdo se reduce, cards pueden pasar a 2 columnas |
| Mobile (<768px) | Panel izquierdo se oculta o se colapsa a un header con logo + tagline. Panel derecho ocupa 100% |

### Auth flow

- **Mantener la lógica existente de NextAuth.js** — solo cambiar la presentación visual, no el flujo de autenticación
- Botón Microsoft dispara el flow de Entra ID (ya configurado)
- Botón Google dispara el flow de Google OAuth (ya configurado)
- Formulario de email/password usa el provider de credentials existente

### Dark mode

- Panel izquierdo: no cambia (ya es oscuro)
- Panel derecho: adaptar a dark mode de MUI/Vuexy (fondo oscuro, textos claros, bordes adaptados)

---

## Archivos a modificar

1. Componente de login page (buscar en `src/app/` o `src/views/` la page de login actual)
2. Posiblemente crear `src/components/auth/GreenhouseLoginLayout.tsx` como wrapper
3. Agregar el SVG del logo de Greenhouse a `src/assets/` o `public/`
4. **NO tocar archivos en `src/@core/`** (regla de Vuexy)

---

## Criterios de aceptación

- [ ] Panel izquierdo con fondo Midnight Navy y logo Greenhouse SVG
- [ ] Hero copy exacto según tabla de copy aprobado
- [ ] Tres cards de propuesta de valor con iconografía SVG inline
- [ ] Panel derecho con los tres métodos de auth en jerarquía correcta (Microsoft primario → Google secundario → Credentials terciario)
- [ ] Todo el copy en español con acentos correctos
- [ ] Responsive funcional en desktop, tablet y mobile
- [ ] Dark mode funcional en panel derecho
- [ ] Auth flow existente no se rompe
- [ ] No se agregan dependencias nuevas (no nuevas librerías)
- [ ] No se tocan archivos de `src/@core/`

---

## Notas para el agente

- Este es un cambio **visual**, no funcional. El auth flow NO cambia.
- El logo viene como SVG — importarlo como componente React o como `<Image>` desde `public/`.
- Los círculos decorativos del panel izquierdo son placeholder. Se reemplazarán por elementos 3D cuando Daniela los tenga. Usar `position: absolute` para que sean fáciles de swappear.
- El copy fue auditado por UX Writing y es **universal para todas las audiencias**. NO cambiarlo.
- Las cards del panel izquierdo NO son métricas reales — son proposiciones de valor estáticas. No requieren data fetching.
- Los iconos SVG inline de las cards son simples (3-4 paths cada uno). No importar librerías de iconos para esto.
- Verificar que `GH_COLORS` en `greenhouse-nomenclature.ts` incluye los colores usados. Si no, escalarlos en el documento de Nomenclatura primero.
