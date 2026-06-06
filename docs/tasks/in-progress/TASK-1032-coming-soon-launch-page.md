# TASK-1032 — Coming Soon / Launch page (branded misc page + launch-notify capture)

> **Lifecycle:** in-progress
> **Branch:** develop (local-first, **sin push** — commit local hecho)
> **Creado:** 2026-06-06
> **Origen:** Figma DS Vuyx→AXIS nodo `504:12406` ("We are launching soon") + decisiones del operador en sesión.

## Qué es

Página **"Coming Soon / Algo nuevo está creciendo"** branded, hermana de 404/401, con **countdown** + **captura de email de lanzamiento** (waitlist) gobernada. Ruta pública reutilizable: `/coming-soon` (anónima pre-login) **y** gate de feature interna.

## Estado actual

- **Code complete + funcional**: backend verificado **end-to-end en vivo** (created → idempotent already_subscribed → invalid_email 422 → no-email 422).
- **UI enterprise** iterada en loop GVC (desktop + mobile) con skills `modern-ui`/`greenhouse-ux`/`state-design`/`forms-ux`/`greenhouse-ux-writing`.
- **EN FINE-TUNING VISUAL del espaciado** cuando se pausó la sesión (ver "Cómo continuar").
- `tsc` 0 errores, `eslint` limpio en archivos propios. Ruta responde 200 en dev.

## Decisiones del operador (LOCKED)

1. **Form funcional con backend gobernado** (no placeholder estático).
2. **Audiencia "ambas"**: ruta pública anónima + gate interno. Endpoint maneja anónimo + autenticado con rate-limit.
3. **Countdown con fecha objetivo** → config env-overridable `COMING_SOON_LAUNCH_AT` (placeholder marcado por ahora). **Auto-redirige** a `COMING_SOON_REDIRECT_PATH` (default `/`) al llegar a cero.
4. **Captura**: solo guardar + toast in-app (sin email de confirmación).
5. **Autenticado**: botón **"Notifícame" de un clic** (suscribe su correo de Greenhouse, **sin mostrar ni teclear nada redundante**) + enlace bajo énfasis **"¿Prefieres otro correo?"** que revela el campo (progressive disclosure). **Anónimo**: campo requerido + botón.
6. **Ilustración**: la del personaje 3D de Figma como **placeholder** hasta que el **equipo creativo de Efeonce** entregue el asset propietario definitivo. (Las `characters/greenhouse-*.png` son **propietarias de Efeonce, NO stock** — documentado en DESIGN.md + efeonce-brand.ts.)
7. **Efeonce logo abajo centrado** en las **3** misc pages (404, 401, coming-soon) → componente compartido `MiscPageEfeonceFooter`.
8. **Microcopy creativo + funcional bilingüe** (es-CL + en-US) en las 3 páginas, metáfora invernadero (crecer/florecer) + emoji `🌱` consistente solo en las líneas de la metáfora (description/toasts/launching) — nunca en título/eyebrow/labels ni en errores.

## Archivos (todos en el commit local)

**Nuevos:**
- `src/views/ComingSoon.tsx` — vista (eyebrow + hero Poppins + subtítulo + countdown flat + form auth-adaptive + personaje + footer)
- `src/app/(blank-layout-pages)/coming-soon/page.tsx` — ruta (resuelve locale+mode+copy+launchAt+session)
- `src/lib/coming-soon/subscribe.ts` — store server-only (rate-limit IP + upsert idempotente + outbox, payload sin PII)
- `src/app/api/coming-soon/notify/route.ts` — endpoint POST (email opcional para autenticado → fallback session email; anónimo requerido)
- `src/config/coming-soon.ts` — config launch date (env `COMING_SOON_LAUNCH_AT`) + redirect path
- `src/components/greenhouse/brand/MiscPageEfeonceFooter.tsx` — wordmark Efeonce bottom-centered (mode-aware), usado por las 3 misc pages
- `src/lib/copy/dictionaries/{es-CL,en-US}/comingSoon.ts` — copy bilingüe
- `migrations/20260606101244591_launch-notifications-coming-soon.sql` — tabla `greenhouse_core.launch_notifications` (**aplicada** al Cloud SQL dev + tipos regenerados)
- `scripts/frontend/scenarios/coming-soon.scenario.ts` — GVC desktop + mobile
- `public/images/illustrations/characters/greenhouse-coming-soon.png` — ilustración (placeholder de Figma)

**Modificados:**
- `src/lib/copy/types.ts` (+ `ComingSoonCopy` + en `MicrocopyDictionary`)
- `src/lib/copy/dictionaries/{es-CL,en-US}/index.ts` (registran comingSoon)
- `src/lib/copy/dictionaries/{es-CL,en-US}/{notFound,notAuthorized}.ts` (copy creativo)
- `src/views/{NotFound,NotAuthorized}.tsx` (montan `MiscPageEfeonceFooter`)
- `src/lib/sync/event-catalog.ts` (`launchNotificationSubscribed: 'launch.notification.subscribed'`)
- `src/lib/api/canonical-error-response.ts` (+ codes `invalid_email`, `rate_limited`, `internal_error`)
- `DESIGN.md` + `src/config/efeonce-brand.ts` (nota: ilustraciones propietarias Efeonce, no stock)
- `src/types/db.d.ts` (regen: +launch_notifications)

## Arquitectura / decisiones técnicas

- **Reliability**: NO se creó signal dedicado — el outbox publish de `launch.notification.subscribed` ya lo cubre `sync.outbox.dead_letter` (TASK-773); errores de endpoint → `captureWithDomain(err, 'home', …)`. (Anti over-engineering, documentado.)
- **PII**: IP hasheada (SHA-256) nunca cruda; payload outbox sin email (solo notificationId + locale + source); el flujo "ya lanzamos" lee el email de PG por id.
- **Idempotencia**: UNIQUE(email) normalizado lowercase + `ON CONFLICT DO NOTHING RETURNING`; re-suscribir no re-emite evento.
- **(blank-layout-pages)/layout.tsx** ya envuelve Providers + BlankLayout → la page solo resuelve datos.

## Pendientes (para la nueva sesión)

1. **VISUAL FINE-TUNING (donde quedamos):** el operador estaba ajustando el ritmo vertical. Valores `mb` actuales en `ComingSoon.tsx`: eyebrow `mb:3` (12px), **headline `mb:2`** (8px, acercado al subtítulo por pedido), subtítulo `mb:4` (16px), countdown `mb:4` (16px). El operador pedía "compacto pero que respire" e "integrar el headline con el párrafo". Continuar el loop GVC desde acá.
2. **Fecha real**: setear `COMING_SOON_LAUNCH_AT` (ISO+tz, ej. `2026-08-01T09:00:00-04:00`) en los envs cuando el operador la defina. Hoy placeholder (aviso solo en consola dev).
3. **Ilustración definitiva**: reemplazar `public/images/illustrations/characters/greenhouse-coming-soon.png` con el asset propietario de Efeonce cuando el equipo creativo lo entregue.
4. **Estados sin captura aún** (cerrar loop): éxito post-Notifícame (check verde + "Listo… 🌱"), campo revelado ("¿Prefieres otro correo?"), variante anónima, dark mode (logo Efeonce negativo).
5. **Cierre documental**: invocar `greenhouse-documentation-governor` (doc funcional + manual de uso si aplica).
6. **Push + rollout**: cuando el operador apruebe visualmente → push a develop (correr `pnpm test` + `pnpm build` full como gate). El endpoint público + la migración ya están aplicados al dev; producción requiere el rollout gate.

## Aprendizajes canonizados en esta sesión

- **MUI `sx` NO resuelve los shorthands de margen lógico `mbe`/`mbs`/`mis`/`mie` en este repo** — son **no-ops silenciosos**. Usar `mb`/`mt`/`ml`/`mr` (o `my`/`mx`) en `sx`; `mbe-*` solo funciona como clase **Tailwind** (className). Fue la causa raíz del "se ve apretado" persistente: los márgenes verticales por `mbe` se ignoraban. (Memoria Claude: `reference_mui_sx_logical_margin_noop`.)
- **Toasts**: el repo usa **sonner** (TASK-512), no react-toastify.
- **Ilustraciones de personaje** = propietarias Efeonce (no stock). Documentado cross-agente.

## Cómo continuar (entorno)

- Dev server en `http://localhost:3000` (puede seguir corriendo; si no, `pnpm dev`).
- Ruta: `/coming-soon` (con sesión = variante autenticada; incógnito = anónima).
- GVC: `pnpm fe:capture --route=/coming-soon --env=local --hold=4000` (ad-hoc desktop) o `pnpm fe:capture coming-soon --env=local` (scenario desktop+mobile).
- Backend smoke: `curl -s -X POST localhost:3000/api/coming-soon/notify -H 'Content-Type: application/json' -d '{"email":"x@y.com"}'`.

## Dependencies & Impact

- **Depende de:** `src/lib/copy/*` (TASK-265), `MiscPageEfeonceFooter` compartido, `canonical-error-response` (extendido), `publish-event`/`event-catalog`, `sync.outbox.dead_letter` (TASK-773), `(blank-layout-pages)` layout.
- **Impacta a:** 404/401 (montan el footer Efeonce + copy creativo). `greenhouse_core.launch_notifications` (nueva tabla).
- **Archivos owned:** los listados arriba.
