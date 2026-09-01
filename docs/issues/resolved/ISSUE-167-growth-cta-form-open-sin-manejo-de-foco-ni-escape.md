# ISSUE-167 — Al abrir el Growth Form desde un CTA, el foco se pierde y Escape no cierra

## Ambiente

production (`efeoncepro.com`, motor CTA con `GROWTH_CTA_ENGINE_ENABLED` ON desde 2026-07-18).
El mismo renderer sirve Think y WordPress, así que el defecto es del contrato, no del host.

## Detectado

2026-09-01, ejercitando en vivo el criterio de aceptación de `TASK-1427` que exige *«CTA→Growth Form
funciona con teclado, Escape/focus restore»*. No lo reportó un usuario: emergió al negarme a tildar
ese criterio sin haberlo probado.

## Síntoma

Sobre `https://efeoncepro.com/greenhouse-cta-prueba/` (CTA `ai-visibility-report-followup`), con el
CTA en `data-ghc-state="visible"`:

| Acción | Esperado | Real (medido) |
|---|---|---|
| Activar el botón del CTA | el formulario abre y el foco entra en él | abre (`state=form_open`, 5 controles enfocables) pero **`document.activeElement` queda en `body`** |
| `Escape` con el formulario abierto | cierra y devuelve el foco al botón | **no cierra**: el `greenhouse-form` sigue montado y el estado sigue en `form_open` |

Lo que **sí** funciona y quedó verificado: el formulario se monta **dentro** del `<greenhouse-cta>` y
**después** del botón en orden de documento, así que tabulando hacia adelante se alcanzan los campos
(el primero es `firstName`). No hay overflow horizontal ni en 1280 ni en 375 (card 343px). El botón
«Ahora no» sigue presente y operable.

## Causa raíz

El formulario abre como **expansión inline**, no como diálogo: no declara `role="dialog"` ni
`aria-modal`. Esa elección es defendible —no atrapa el foco ni oscurece la página— pero el renderer
no implementa ninguna de las dos obligaciones que la acompañan:

1. **Mover el foco al contenido revelado** (o anunciarlo por región viva) cuando la activación de un
   control descubre contenido nuevo.
2. **Ofrecer una salida por teclado** desde ese contenido. Hoy la única forma de cerrar es el botón
   «Ahora no» con el mouse o llegando a él tabulando.

No es un defecto del host: el `<greenhouse-form>` y el `<greenhouse-cta>` son los dueños del
comportamiento, y ambos son el mismo bundle en Think y en WordPress.

## Impacto

- **Accesibilidad.** Un usuario de teclado o de lector de pantalla activa el CTA y no recibe señal
  de que algo cambió: el foco sigue en el `body`. WCAG 2.2 **2.4.3 (Focus Order)** y **3.2.2 (On
  Input)** están comprometidos; el patrón de disclosure exige gestionar el foco o anunciar el cambio.
- **Alcance real.** Aplica a **todos** los CTA del motor en ambas superficies, no sólo a la página
  de prueba — es el renderer compartido.
- **No bloquea conversión con mouse.** El flujo con puntero funciona de punta a punta (verificado:
  el formulario abre, ingesta acepta, GA4 recibe `greenhouse_cta_viewed`).

## Causa raíz REAL (corregida al implementar)

La primera lectura culpó al path del form. Al abrir el código apareció algo más útil: **el
comportamiento existía dos veces y faltaba una tercera**.

| Módulo | Foco al abrir | `Escape` |
|---|---|---|
| `slide-in.ts` | deliberadamente NO (reveal pasivo) | sí, en el shell |
| `meeting-action.ts` | sí, heading con `tabindex=-1` | propio |
| `action.ts` + `renderer.ts` (form) | **nada** | **nada** |

El foco y la salida por teclado se habían modelado como propiedad del **placement**
(`slide-in`) en vez de como propiedad de **«hay una superficie revelada por activación del
usuario»**. Por eso `placement=embedded` no las heredaba: no era un olvido en el form, era el
eje de modelado equivocado.

## Solución aplicada

Primitive canónica **`src/growth-cta-renderer/disclosure-focus.ts`** (`attachDisclosureFocus`),
consumida por el renderer en el path del form. Cualquier acción futura que revele contenido
in-place la obtiene por construcción en vez de reimplementarla.

Decisiones del contrato, todas deliberadas:

1. **Disclosure, no modal.** No atrapa el foco, no declara `aria-modal`, no oscurece la página.
   Tab sigue al resto del host. El CTA vive incrustado en sitios ajenos.
2. **`Escape` se escucha en el contenedor, NUNCA en el documento.** Un CTA incrustado no puede
   secuestrarle el `Escape` a la página del cliente. Es seguro porque `enter()` mete el foco
   adentro: el evento burbujea desde donde está el foco.
3. 🔴 **`Escape` COLAPSA el form de vuelta al card; NO emite `dismissed`.** Esto emergió al
   escribir el test y vale más que el arreglo de accesibilidad: `dismissed` es una **señal de
   negocio** («el visitante rechazó la oferta») que viaja al ledger de conversión. Cerrar un
   formulario abierto por curiosidad no es rechazar el CTA — emitirlo habría contaminado la tasa
   de rechazo. El botón «✕ Ahora no» sí es rechazo y sigue llamando a `dismiss()`.
4. **El colapso queda sin telemetría a propósito.** El vocabulario de `cta_conversion_event` no
   tiene `form_closed`, y agregarlo es un cambio de contrato server-side (allowlist de ingest +
   `CHECK` en DB) que no pertenece a esta corrección.
5. **Sin foco robado en el reveal pasivo.** `slide-in` NO adopta la primitive en su apertura: su
   contrato de no robar atención sigue siendo correcto para contenido que aparece solo.

`meeting-action.ts` conserva su gestión propia: funciona, no tenía defecto medido, y refactorizarla
sin necesidad era riesgo sin retorno. Queda como consumidor candidato de la primitive.

## Verificación

**Hecha (2026-09-01):**

- 8 tests de la primitive + 3 del cableado en el renderer. **Falsificados**: revertido el arreglo,
  se ponen rojos (2 de 22 en el renderer); con él, 47/47 del paquete en verde.
- Los tests fijan el contrato, no la implementación: foco al primer control y no al `body`;
  contenedor con `tabindex=-1` cuando aún no hay nada enfocable; `Escape` del host NO capturado;
  `release` devuelve el foco al trigger pero **no lo roba** si el visitante ya se fue a otra parte;
  colapso sin `dismissed`; «✕ Ahora no» sí con `dismissed`.
- 🔴 **Riesgo cerrado con medición contra el DOM real de producción**, no con un supuesto: si
  `<greenhouse-form>` montara sus campos en shadow DOM, el selector de la primitive no los vería y
  el arreglo sería inerte. Verificado en vivo: `formUsaShadowDom: false`, el slot expone **5**
  controles al selector exacto de la primitive, y el primero es `input[name="firstName"]`.

**Pendiente de rollout — la corrección NO está en producción:** el bundle desplegado sigue siendo el
anterior. El cierre real exige release develop→main + rebuild del renderer, y repetir en vivo, en
**ambos** hosts, el recorrido con teclado: activar con `Enter` → foco dentro del formulario;
`Escape` → colapsa al card con el foco de vuelta en el botón; sin regresión de overflow en 1440/390.

## Estado

resolved — 2026-09-01

## Relacionado

- `TASK-1427` — lo destapó; cerró dejando su criterio de teclado **sin tildar y con esta razón**.
- `EPIC-023` — dueño del motor CTA.
- `TASK-1429` / `TASK-1431` — tocan el renderer y sus adapters de navegación.
