# TASK-2068 — Motion del acceso y la lectura

Contrato 2026-10-25. Reutiliza `src/components/room-motion.tsx`, tokens AXIS y reglas TASK-2059; no depende de nuevos flags experimentales.

## Principio

La transición ayuda a orientarse dentro de una edición ya autorizada. La autenticación y la pérdida de acceso son fronteras: se cambia documento/contexto y nunca se captura contenido privado para animarlo.

## Mapping

| Interacción | Tratamiento | Foco |
|---|---|---|
| OTP idle→pending→error | tamaño estable, mensaje local, sin shake | campo mantiene foco; error descrito |
| Código validado | navegación documento sin View Transition | h1 de edición tras montaje |
| Resend/cooldown | texto/estado; no countdown animado ni live cada segundo | botón/input según acción |
| Crear/revocar Dialog | primitive AXIS; transformación breve sin pérdida de contraste | trap+Escape+restore |
| List readback | actualizar fila estable, sin stagger | trigger o heading si desaparece |
| Capítulos/piezas misma edición | helper View Transition existente si soportado | preserva foco; pager no deja body al deshabilitarse |
| Cambio de rol/org/sesión/edición autorizada distinta | sin snapshot compartido; leer autoridad fresca | nuevo documento/región |
| Logout/revocado/expirado | retirar contenido y cerrar overlay antes de recovery | título recovery |

## Tokens y fallback

Duración/easing/distancia provienen de roles del adapter AXIS vigente. No nueva animación del logo, texto por letra, pulse continuo ni opacidad que reduzca contraste. `prefers-reduced-motion: reduce` evita transiciones y conserva feedback inmediato; si API no existe, mismo flujo/foco con actualización normal.

## Race policy

Clicks rápidos usan estado actual/secuencial; no pérdida de offsets ni respuesta tardía restaurando una edición revocada. Cancelar/ignorar respuestas del contexto anterior y no rehidratar private snapshots desde bfcache sin validación; invalidación elimina media y evidencia también.

## Verification

E2E cuenta llamadas reales de transición en capítulos/galería; cero llamadas en verify/logout/revoke/cambio de actor. Probar supported/reduced/noAPI, spam de pager y Escape, pending/doble submit, tamaño 320/200% texto y contraste durante la animación. Registrar evidencia, no inferir soporte desde CSS solo.

## GVC / Micro Evidence

Capturar input→pending→error y reapertura del diálogo con Escape/restauración; probar cooldown sin anuncios por segundo. Verificar supported/reduced/noAPI para capítulos y evidencia. Cero transiciones de snapshot al verificar, cerrar sesión o perder autoridad. Medir contraste durante entrada y ausencia de overflow en320px/200%. Evidencia en docs/ui/reviews/TASK-2068-rooms-invitation-and-guest-experience/.

## Design Decision Log

Reutilizar AXIS y helper Rooms sólo dentro del contexto autorizado. La entrada de código no necesita animación de viaje ni loader de pantalla completa. Feedback inmediato y geometría estable prevalecen. Auth cambia documento; no animar el contenido que acaba de perder acceso ni el logo.
