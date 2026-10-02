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

## Delta 2026-10-02 — Lo implementado

- **Lente al canon de AXIS:** anillo con aire `orbit.ringAirRatio` (1,12× el radio de la foto), foto interior ampliada ×`lens.zoom` (1,25), trazos y esfera escalados por ancho (`lens.anatomy` × ancho/794, con pisos `orbit.*Px`), arco de 50° centrado en `upper-start` y acento por línea de servicio (`lineAccentOnDark`). Reemplaza el «a color ×1.25» del dibujo de arriba, que se aplicaba como saturación.
- **Anclaje:** la lente se ancla al punto de la foto con `object-position: x% y%`; con `cover` el recorte cambia entre proporción 1,06 (móvil) y 1,5 (desktop) y sin anclaje la lente se corría del sujeto.
- **Novedad sin lente:** si la novedad no trae `lens` (fotos en registro cine), la foto va a color entero y sin lente: la luz de la escena ya es la órbita de la pieza (una órbita por pieza). Hoy dos de las tres novedades publicadas van así.
- **Voz:** el kicker lleva delante el anillo pequeño (receta `question` de AXIS) y el titular cierra con la esfera en lugar del punto tipeado, ambos en el acento de la línea.
- **Avisos de proveedor:** aviso discreto con texto `text.secondary` (el `Alert` warning daba 1,5:1); la alerta de error usa `text.primary` (el `Alert` del theme daba ~3,5:1 sobre el papel); enlaces sueltos con área táctil ≥ 24 px.
- **Fotos:** `public/images/login/*.webp` ya son producidas (fichas revisadas por `cine-reviewer`); la fila «Fotos de referencia» de la tabla de regiones queda resuelta.
- **Pendiente visual:** anillo de la órbita de Escalar producción cortado en 1440; respuesta del titular en 4–5 palabras (objetivo 1–3); el kicker es una etiqueta y no una pregunta del cliente.
