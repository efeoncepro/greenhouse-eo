# TASK-2064 — Dirección visual source-led V4

## Product Design Source

Mode: `source-led`. Fuente durable: `docs/ui/wireframes/TASK-1964-login-v4-premium-access.md`, implementación `src/views/Login.tsx` y `src/views/login/`. Canvas aprobado 2026-10-02 `29ef89d6-a399-4c9e-bea4-0ff71cdebeaf`, LoginV4/MobileV4/AccessMotion. Julio eligió expresamente esta dirección el 2026-10-25 para Auth con Rooms primero. No se requiere nueva ronda de alternativas.

## Desktop Target

1440×960: formulario papel en panel 440–620px, máximo contenido 380px; Efeonce centrado y contexto de entrada. Escenario foto lateral con radio y aire del V4. Métodos reales, sin contraseña ni Google inexistentes.

## Mobile Target

390×844: logo, título, métodos/correo y acción antes de escenario; fotografía como tarjeta debajo. Sin scroll horizontal. No comprimir desktop.

## Action Hierarchy

Efeonce principal. Entra a Rooms sólo con RP validado; neutral Entra a Efeonce. Passkey y Microsoft disponibles, correo siempre como recuperación real. Enlace de retorno sólo servidor confiable.

## Visual Fidelity Mapping

Papel/navy/acento y geometría desde efeonceGraphicLine; radios/espaciado del adapter tokenizado. WOFF2 exactos de src/assets/fonts/web, fotografía aprobada de public/images/login. Logo SVG oficial positivo. Sin efectos decorativos nuevos.

## Decision Log

Se descarta mantener Nocturno para login por pedido explícito. Se descarta importar JSX/MUI/Next por frontera runtime. Consent/step-up conservan su shell hasta unidad propia; no cambia la semántica de consentimiento.
