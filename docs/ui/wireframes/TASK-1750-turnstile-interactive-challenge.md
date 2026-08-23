# TASK-1750 — Wireframe: desafío interactivo de Turnstile en formularios públicos

> **Estado:** dirección propuesta, pendiente de la verificación empírica del Slice 1.
> La decisión entre las dos variantes de abajo **no se puede tomar sin ver** dónde pinta Cloudflare
> el desafío. Este documento describe ambas y el criterio para elegir.

## El problema que resuelve

Cloudflare, en modo *Managed*, decide por visitante si el desafío es invisible o interactivo. Cuando
escala a interactivo, aparece un checkbox que la persona **tiene que tocar**. Hoy el contenedor del
widget mide 1×1, está recortado con `clip-path: inset(50%)`, marcado `aria-hidden` y colgado del
`<body>`. Resultado: el desafío existe pero la persona no lo ve, o lo ve flotando en una esquina sin
relación con el formulario. Nunca lo resuelve, no hay token, y el envío falla con un mensaje que no
explica nada.

Caso real (2026-08-19): una postulante no pudo enviar su postulación desde su computador. Desde el
móvil sí pudo — Cloudflare no escaló ahí. No reclamó por el error; escribió porque le importaba el
puesto. Los candidatos que no insisten simplemente desaparecen del proceso.

## Superficies afectadas

| Superficie | Ruta | Renderer |
|---|---|---|
| Postulación pública | `/public/careers/[publicId]/apply` | `growth-forms-renderer` |
| Formularios de growth embebidos | host externo | `growth-forms-renderer` |
| Agendador de reuniones | público | `growth-meeting-renderer` (misma bug class) |

## Estados de la interacción

| Estado | Qué ve la persona | Origen |
|---|---|---|
| `idle` | Nada. El widget no existe todavía | Antes del submit |
| `verifying-invisible` | Nada. El botón muestra su estado de envío | Cloudflare no escaló — **caso mayoritario, no debe cambiar** |
| `challenge-visible` | El checkbox de Cloudflare, **asociado visualmente al formulario**, con una línea de contexto | `before-interactive-callback` |
| `challenge-resolved` | El desafío desaparece y el envío continúa | `callback` |
| `challenge-timeout` | El desafío desaparece y aparece un mensaje accionable **con el widget reseteado** | `timeout-callback` / timeout propio |
| `challenge-error` | Igual que timeout, con copy distinto si la causa es distinguible | `error-callback` |

**Invariante del estado `verifying-invisible`:** es el camino de la mayoría de los visitantes. Ninguna
solución puede introducirle un elemento visible, una demora ni un salto de layout.

## Variante A — el desafío vive dentro del formulario (preferida)

```
┌─────────────────────────────────────────────┐
│  Acepto que Efeonce trate mis datos…    [✓] │
├─────────────────────────────────────────────┤
│                                             │
│  Confirma que no eres un robot para         │  ← línea de contexto, es-CL
│  enviar tu postulación                      │     aparece SOLO en challenge-visible
│  ┌───────────────────────────────────┐      │
│  │ [ ] Verifique que es un ser humano│      │  ← widget de Cloudflare, tamaño real
│  │                        CLOUDFLARE │      │
│  └───────────────────────────────────┘      │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │        ➤  Enviar postulación          │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

El widget se monta en un hueco reservado **encima del botón de envío**, donde la persona ya tiene la
mirada. En `verifying-invisible` ese hueco tiene altura cero y no desplaza nada.

**Requisito técnico:** el contenedor deja de colgar del `<body>` y pasa a montarse en un nodo que el
formulario provee. Es el cambio de fondo, y por eso el Slice 1 tiene que confirmar antes que
Cloudflare respeta ese contenedor.

## Variante B — panel modal centrado (solo si A es inviable)

Aplica **únicamente** si la verificación demuestra que Cloudflare pinta el desafío en un elemento
propio que no podemos posicionar. En ese caso el desafío aparece donde Cloudflare quiera y lo que
resta es **enmarcarlo**: fondo atenuado, `role="dialog"`, `aria-modal`, foco movido al panel, cierre
con Escape que cancela el envío explícitamente, y la misma línea de contexto.

Es peor que A —interrumpe, tapa el formulario, exige manejo de foco— y solo se justifica si A no es
posible.

## Copy (es-CL, va a `src/lib/copy/`)

| Situación | Texto |
|---|---|
| Contexto del desafío | «Confirma que no eres un robot para enviar tu postulación» |
| Timeout | «No alcanzamos a verificarlo. Inténtalo de nuevo.» — **sin** "recarga la página": el reintento debe funcionar |
| Error | «No pudimos completar la verificación. Vuelve a intentarlo en unos segundos.» |

El copy actual («No pudimos verificar el envío. Recarga la página e intenta otra vez.») colapsa cuatro
causas distintas y le pide a la persona una acción que no debería ser necesaria.

## Accesibilidad

- El contenedor deja de ser `aria-hidden` al revelarse, **y además** el foco se mueve al desafío:
  quitar `aria-hidden` lo hace alcanzable, no anunciado.
- La línea de contexto se asocia al widget con `aria-describedby`.
- El desafío tiene que ser resoluble **solo con teclado**.
- En la Variante B, `role="dialog"` + `aria-modal` + foco atrapado + Escape.
- Sin `prefers-reduced-motion` que importe: la aparición no debe animarse de forma llamativa.

## Tiempo

El timeout actual de 15 segundos es de máquina, no de persona: tiene que cubrir que el panel aparezca,
que la persona lo note, lo resuelva y Cloudflare verifique. Al entrar en modo interactivo el reloj
debe cancelarse y re-armarse con un presupuesto humano, o delegarse en el `timeout-callback` de
Cloudflare. Un token que llegue después del vencimiento, con el formulario todavía montado, **se usa**
en vez de descartarse.

## Verificación

`3x00000000000000000000FF` es la sitekey de Cloudflare que **fuerza** el desafío interactivo y
funciona en `localhost`. Toda evidencia visual de esta task se produce con ella: en desktop y en
390 px, en los tres estados (`verifying-invisible`, `challenge-visible`, `challenge-timeout`).

## Referencias

- `src/growth-forms-renderer/turnstile.ts` · `src/growth-forms-renderer/renderer.ts`
- `src/growth-meeting-renderer/turnstile.ts` (misma bug class)
- [Widget configurations — Cloudflare](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/)
- [Testing — Cloudflare](https://developers.cloudflare.com/turnstile/troubleshooting/testing/)
