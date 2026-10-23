# TASK-2045 — Formulario Growth en diálogo: flujo

> Wireframe: `docs/ui/wireframes/TASK-2045-growth-form-dialog-design-fidelity.md`. Contrato: TASK-2044.
> Primer caso: «Quiero ser partner» en `/partnership/`.

## Flow Goal

Que un visitante abra un formulario Growth desde un botón de la landing, lo complete y lo envíe sin salir de la
página, en un diálogo que se ve como el diseño aprobado, y que al cerrar vuelva exactamente donde estaba. El flujo es
abierto por el visitante: nunca aparece solo.

## Nodos

| # | Nodo | Superficie | Entra por | Sale a |
|---|---|---|---|---|
| N0 | Botón del CTA en la landing | `<greenhouse-cta>` con acción `open_growth_form` y `presentation: 'dialog'` | carga de la página | N1 |
| N1 | Diálogo abierto, cargando contrato | `<dialog>` del renderer del CTA con `<greenhouse-form>` recién montado | clic, Enter o Espacio en N0 | N2, R1 |
| N2 | Formulario listo | `<greenhouse-form>` dentro del diálogo | contrato recibido | N3, N7 |
| N3 | Envío | mismo formulario, botón en espera | «Enviar propuesta» | N4, N5, R2, R3 |
| N4 | Desafío de Turnstile | widget dentro de la tarjeta | el servidor pide desafío | N3 (reintento) o R3 |
| N5 | Éxito | tarjeta de éxito del formulario | respuesta OK | N6 |
| N6 | Cerrar desde éxito | acción `dismiss` «Cerrar» | clic | N7 |
| N7 | Diálogo cerrado | landing, foco en N0 | ×, Escape, clic en el velo, N6 | fin |

Eventos de medición (los existentes, con la presentación como dimensión): `gh_cta_clicked` en N0;
`gh_form_viewed` al llegar a N2 (no antes); `gh_form_submitted` en N5; todos con `presentation=dialog` y
`cta_location` del CTA. Cerrar sin enviar no es un evento nuevo en esta task.

## Recovery Branches

| # | Falla | Qué ve el visitante | Recuperación |
|---|---|---|---|
| R1 | El contrato del formulario no llega (sin versión publicada, 4xx/5xx, red) | mensaje dentro de la tarjeta y, si el CTA declara respaldo, enlace al formulario en su página | cerrar el diálogo o seguir el enlace; el CTA no queda roto para el siguiente clic (reintenta al reabrir) |
| R2 | Validación | mensajes bajo cada campo; foco en el primero inválido | corregir y reenviar; nada se pierde |
| R3 | Envío falla o el desafío no se resuelve | alerta con «Reintentar»; los datos siguen en los campos | reintentar; la recuperación del desafío interactivo es de TASK-1750 y debe funcionar dentro del diálogo |
| R4 | Cierre accidental con datos escritos | el diálogo se cierra (Escape, velo o ×) | al reabrir en la misma visita se conserva lo escrito: el formulario no se destruye al cerrar, sólo al recargar |
| R5 | Sin JS | el botón es un enlace | va al respaldo declarado |
| R6 | Dos diálogos | no ocurre | abrir un segundo CTA cierra el primero; nunca dos `<dialog>` abiertos |

Mientras está en N3 (enviando), Escape y el clic en el velo no cierran: el visitante no pierde la confirmación.

## Focus and Navigation

- Al abrir: `showModal()` deja inerte el resto de la página; el foco va al primer campo cuando el contrato está listo y,
  mientras carga, al título del diálogo (`aria-labelledby` = título, `aria-describedby` = bajada).
- Tabulación encerrada en el diálogo: × → campos → consentimiento → enlace de privacidad → botón → (Turnstile si
  aparece).
- El enlace de privacidad abre en una pestaña nueva con `rel="noopener"` y lo anuncia; no cierra el diálogo.
- Al éxito: foco al título «Recibido.», anunciado por la región en vivo del formulario.
- Al cerrar por cualquier vía: el foco vuelve al botón N0 que lo abrió; si ya no está visible, al primer elemento
  enfocable de su sección.
- Scroll: el `body` queda bloqueado y se restaura la posición exacta al cerrar; sin salto por la barra de scroll
  (`scrollbar-gutter: stable` mientras está abierto).
- Teléfono: la hoja inferior hace scroll propio; el campo activo queda visible con el teclado abierto.
- Botón Atrás del navegador: fuera de alcance en esta task (no se agrega entrada al historial); queda en Open Questions.

## GVC Scenario Plan

- Recorrido N0 → N1 → N2 → R2 → N3 → N5 → N6 → N7 a 1440×900 y 390×844, con teclado solamente y con mouse.
- Recorrido R1 forzando un `formSlug` sin versión publicada en el fixture.
- Recorrido R4: escribir, cerrar con Escape, reabrir y comprobar que los valores siguen.
- Evidencia: capturas por nodo, orden de foco registrado, `document.activeElement` tras cerrar = botón N0, secuencia de
  eventos de medición en `dataLayer` (ningún `gh_form_viewed` antes de N2).

## Design Decision Log

| Decisión | Alternativas | Por qué |
|---|---|---|
| Conservar el formulario al cerrar dentro de la visita | destruirlo al cerrar | perder lo escrito por un Escape accidental castiga al visitante; montar al abrir ya evita el costo en la carga |
| Bloquear el cierre mientras envía | permitir cerrar siempre | el visitante no sabría si su propuesta llegó |
| Sin entrada de historial | `history.pushState` para que Atrás cierre | cambia la navegación de todo el sitio y choca con Elementor; se evalúa aparte |
| `presentation=dialog` como dimensión de los eventos existentes | eventos nuevos por diálogo | el plan de medición no crece; GA4 compara inline y diálogo con el mismo evento |
