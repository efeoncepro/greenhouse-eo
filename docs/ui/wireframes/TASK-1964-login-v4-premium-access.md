# TASK-1964 — Login V4 premium · Wireframe

## Meta

- Task: `TASK-1964` · Flow: `docs/ui/flows/TASK-1964-login-v4-premium-access-flow.md` · Motion: `docs/ui/motion/TASK-1964-login-v4-premium-access-motion.md`
- Dirección aprobada: **V4 premium** del canvas «Login Greenhouse · La órbita» (Design artifact `29ef89d6-a399-4c9e-bea4-0ff71cdebeaf`, artboards `LoginV4.dc.html` y `MobileV4.dc.html`), aprobada por el operador el 2026-10-02. Prototipo de transición: artboard `AccessMotion.dc.html`.
- Sistema: «La órbita» (tema papel para el formulario; lente sobre foto en el escenario). Efeonce es la marca principal; Greenhouse es secundaria.
- Referencias de carácter dadas por el operador (no se copian): portal Banco de Chile empresas (foto + tarjeta de novedades con progreso) y Magnific (foto a sangre + pestañas con progreso).

## Desktop (≥ 1024 px)

```
┌──────────────── panel formulario (papel, 440–620 px) ───────────────┬─────────── escenario (foto, flex) ───────────┐
│                                                                      │╭────────────────────────────────────────────╮│
│                       [logo Efeonce · 180 px, centrado]              ││  foto apagada (gris · brillo .5 · multiply ││
│                  Accede a tu cuenta corporativa  (bajada)            ││  ground .8) y a color ×1.25 dentro de la   ││
│                                                                      ││  LENTE: anillo · arco 50° · esfera         ││
│   [ Continuar con Microsoft ]          (botón claro, 50 px)          ││                                            ││
│   [ Continuar con Google    ]                                        ││                                            ││
│   ──────────── o con tu email ────────────                           ││  KICKER · NUEVO · AI VISIBILITY REPORT     ││
│   Email corporativo                                                  ││  Titular Bricolage 52/500                  ││
│   [ nombre@empresa.com            ]                                  ││  una línea de apoyo                        ││
│   Contraseña                         ¿La olvidaste?                  ││  CTA →                                     ││
│   [ ••••••••                    👁 ]                                  ││                                            ││
│   [            Entrar            ]  (navy, 52 px)                    ││  ENGINE   BRAND   GREENHOUSE      (⏸)       ││
│   ¿No puedes entrar? Recibe un link mágico por correo               ││  ━━━━━━   ──────  ──────                   ││
│   El acceso se provisiona internamente… (nota centrada)              │╰────────────────────────────────────────────╯│
│                                                                      │  inset 12 px · radio 24 px                     │
│        [Greenhouse] | PORTAL DE CLIENTES                             │                                                │
│        Greenhouse™ es una plataforma de Efeonce Group · 2026         │                                                │
└──────────────────────────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

- Columna del formulario centrada en su panel, `max-width: 380px`. Encabezado (logo + bajada) centrado; campos y etiquetas alineados a la izquierda por legibilidad; nota de acceso y pie centrados.
- Avisos de proveedor (no configurado / degradado) aparecen bajo el botón correspondiente como alerta discreta (copy desde `src/lib/copy`).
- Escenario: la lente se posiciona por novedad (`lens.x`, `lens.y`, `lens.radiusRatio` del reader). Sin novedades vigentes: foto por defecto con lente y sin texto ni pestañas.
- Novedad tipo `banner`: imagen a sangre a todo color, sin lente ni texto superpuesto; toda la imagen es el enlace (con `alt` obligatorio). Las pestañas y la pausa se mantienen.

## Mobile (< 1024 px)

```
┌───────── 390 ─────────┐
│   [logo Efeonce 156]  │
│ Accede a tu cuenta…   │
│ [Continuar Microsoft] │
│ [Continuar Google   ] │
│ ── o con tu email ──  │
│ Email / Contraseña    │
│ [      Entrar       ] │   ← visible sin scroll en 390×844
│ nota                  │
│ ╭─ tarjeta novedad ─╮ │   foto con lente, 380 px alto, radio 20
│ │ kicker · titular  │ │
│ │ CTA · pestañas    │ │
│ ╰───────────────────╯ │
│ [Greenhouse] | PORTAL │
│ pie                   │
└───────────────────────┘
```

- El login es la prioridad en móvil (comentario del operador 2026-10-02): el escenario baja después del formulario como tarjeta.

## Regiones y datos

| Región | Fuente |
|---|---|
| Logo Efeonce | `public/branding/logo-full.svg` (copia verificada contra `@efeoncepro/axis-brand-assets`) |
| Sello Greenhouse | `public/images/greenhouse/SVG/greenhouse-blue.svg` |
| Copy | `src/lib/copy/client-portal.ts` (`login_*`) |
| Novedades | `listActiveLoginAnnouncements()` (TASK-1963) servido por `src/app/(blank-layout-pages)/login/page.tsx` |
| Valores de la lente | `efeonceGraphicLine.lens` (`@efeoncepro/axis-tokens`) |
| Fotos de referencia | `public/images/login/*.webp` (set curado de La órbita; reemplazo por fotos producidas antes de producción) |

## Accesibilidad

- `h1` visible: «Accede a tu cuenta corporativa». Logo con `alt="Efeonce"`.
- Carrusel: `section` con `aria-roledescription="carrusel"`, diapositivas `role="group"` con «n de m», pestañas como botones con `aria-current`, botón de pausa (WCAG 2.2.2), se pausa con hover/foco y arranca pausado con `prefers-reduced-motion`. `aria-live` sólo cuando está en pausa.
- Contraste: texto sobre foto apagada blanco/`#cfe4fa`; acento sólo en anillo/arco/esfera (gráfico, ≥ 3:1).
