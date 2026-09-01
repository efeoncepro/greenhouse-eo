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

## Solución propuesta

Requiere decisión de diseño antes que código, porque hay dos caminos legítimos y no da lo mismo:

- **Camino A (disclosure inline, recomendado):** al abrir, mover el foco al primer elemento del
  formulario o a su encabezado con `tabindex="-1"`; agregar `Escape` como cierre que **devuelve el
  foco al botón que lo abrió**; anunciar la apertura con una región viva. NO convertirlo en modal.
- **Camino B (modal):** declarar `role="dialog"` + `aria-modal="true"`, atrapar el foco y cerrar con
  `Escape`. Cambia la sensación del producto y tapa la página; sólo si el diseño lo quiere.

Dueña: **pendiente de asignar**. Candidata natural es una task nueva del `EPIC-023` con perfil
`ui-ux`, porque toca el renderer compartido y necesita contrato de flow + evidencia GVC.

## Verificación

- Con teclado únicamente: activar el CTA con `Enter` → el foco queda dentro del formulario y un
  lector de pantalla lo anuncia.
- `Escape` con el formulario abierto → cierra y el foco vuelve al botón del CTA.
- El flujo con mouse no cambia; `data-ghc-state` sigue transicionando `visible → form_open → …`.
- Sin regresión de overflow en 1440 y 390.
- Repetido en **ambos** hosts (Think y WordPress), porque el bundle es el mismo.

## Estado

open

## Relacionado

- `TASK-1427` — lo destapó; cerró dejando su criterio de teclado **sin tildar y con esta razón**.
- `EPIC-023` — dueño del motor CTA.
- `TASK-1429` / `TASK-1431` — tocan el renderer y sus adapters de navegación.
