# TASK-1964 — Login V4 premium · Flow de acceso

## Meta

- Task: `TASK-1964` · Wireframe: `docs/ui/wireframes/TASK-1964-login-v4-premium-access.md` · Motion: `docs/ui/motion/TASK-1964-login-v4-premium-access-motion.md`
- Prototipo aprobado: artboard `AccessMotion.dc.html` («Acceso · La lente te lleva adentro»).
- Relación con `TASK-1834`: para cohortes con Efeonce ID habilitado, `/login` redirige al issuer sin renderizar esta pantalla; este flow aplica al login de Greenhouse mientras tanto.

## Nodos

| # | Nodo | Ruta | Qué ve la persona |
|---|---|---|---|
| N1 | Login | `/login` | Formulario V4 + escenario con novedades |
| N2 | Validando | `/login` | Botón «Validando acceso» con mini órbita; campos deshabilitados |
| N3 | Error | `/login` | Alerta con el error mapeado (`mapAuthError`), foco en la alerta |
| N4 | Redirección SSO | proveedor | Botón «Redirigiendo a Microsoft/Google…»; navegación del navegador |
| N5 | La lente se abre | `/login` → `/auth/landing` | Transición de vista: el círculo de la lente crece a pantalla completa; el logo Efeonce viaja al encabezado |
| N6 | Preparando espacio | `/auth/landing` (`loading.tsx`) | `OrbitLoader` sobre papel con el estado «Preparando tu espacio de trabajo» |
| N7 | Llegada | `portalHomePath` | Shell del portal; la esfera asienta y el anillo hace onda |

## Transiciones

- N1 → N2: submit de credenciales (`signIn('credentials', { redirect: false })`).
- N2 → N3: `result.error`; foco va a la alerta; se reactivan los campos.
- N2 → N5: éxito; `LoginAccessTransition` abre el papel desde la lente (900 ms) y luego `startViewTransition(() => router.replace(callbackUrl))` desde `src/lib/motion/view-transition.ts`.
- N1 → N4: botón de proveedor (`signIn('azure-ad'|'google')`), navegación completa sin view transition.
- N5 → N6: Next sirve `src/app/auth/landing/loading.tsx` mientras resuelve la sesión.
- N6 → N7: redirect server-side a `session.user.portalHomePath`.
- `callbackUrl` conserva la regla actual de `resolveSafeCallbackUrl` (sólo rutas relativas, nunca `//`).

## Fallbacks

- Sin soporte de View Transitions o con `prefers-reduced-motion`: N2 → N6 con cambio directo (el helper corre la actualización sin animación).
- Sin novedades: el escenario muestra la foto por defecto; el flow no cambia.
- Error del reader: igual que sin novedades (el reader devuelve `[]`).

## Delta 2026-10-02 — Verificado

- N1 → N2 → N3 probado en localhost: credenciales inválidas → 401 → alerta con foco y campos reactivados.
- N1 → N2 → N5 → N6 → N7 probado en localhost con el usuario agente: `/login` → apertura de la lente → `/auth/landing` → `/home`.
- N6: en frío se vio pantalla en blanco ~30 s entre `/auth/landing` y `/home` (compilación de `pnpm dev`); en caliente no se confirmó si el `OrbitLoader` llega a verse. Queda por medir en staging.
- Aborto de la transición: `src/lib/motion/view-transition.ts` deja un `InvalidStateError` sin capturar cuando la transición se aborta; el ingreso no se bloquea, pero el error queda suelto (tarea aparte).
- N4 (SSO): sin evidencia registrada en esta pasada.
