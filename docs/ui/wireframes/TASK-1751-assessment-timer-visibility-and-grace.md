# Wireframe — Reloj visible y gracia de envío usable en la rendición del candidato

> **Task:** `TASK-1751`
> **Superficie:** `AssessmentTakingClient` — la pantalla donde el candidato rinde su test
> **Creado:** 2026-08-19
> **Caso fuente:** Roxana Lezama, `EO-ASM-0128`, 2026-08-19

## Por qué existe este documento

Cuatro protecciones bien diseñadas fallaron juntas sobre una candidata real. Ninguna es un
error grande; el problema es que se apilan y el resultado es que perdió una respuesta escrita
y quedó sin poder enviar, con un mensaje que la mandaba a reintentar algo imposible.

Reconstrucción medida, no hipotética:

| Hora (UTC) | Hecho |
|---|---|
| 19:02:34 | Empieza. Reloj de 45 min → vence 19:47:34 |
| 19:17 / 19:33 / 19:42 / 19:42 / **19:46:59** | Guarda 5 respuestas; la última a **35 s del límite** |
| 19:47:34 | Vence el plazo de RESPUESTA. Entra la gracia de 30 min (hasta 20:17:34) |
| ~19:51 | Escribe la 6.ª respuesta (445 chars, sin guardar) y pulsa **Enviar evaluación** |
| ~19:51 | El guardado se rechaza con `409 assessment_not_open`; la pantalla muestra el error genérico |

Le sobraban **26 minutos** de gracia. No se le acabó el tiempo: el sistema le impidió guardar
lo que estaba escribiendo y no se lo dijo.

## Los cuatro defectos, con su evidencia

### 1. El reloj se va con el scroll

`AssessmentTakingClient.tsx:490` lo renderiza dentro de `.sessionBar`, y esa clase
(`AssessmentTakingClient.module.css:86-97`) **no declara `position: sticky` ni `fixed`**. El único
`position: fixed` del módulo es `.modalBackdrop` (`:650`). Es un bloque normal al tope del documento.

Consecuencia: mientras el candidato lee la pregunta y escribe —el momento exacto en que el tiempo
importa— el reloj está fuera de viewport. La captura del caso fuente no muestra reloj en ninguna parte.

### 2. Los avisos de 5 y 1 minuto son invisibles

`AssessmentTakingClient.tsx:228-231` dispara `setTimeNote(copy.taking.timeWarningFive)` a los 300 s y
`timeWarningOne` a los 60 s. Pero `:514` lo renderiza como
`<span className={styles.srOnly} aria-live='polite'>`, y `.srOnly`
(`AssessmentTakingClient.module.css:718-725`) es `width:1px; height:1px; clip:rect(0 0 0 0)`.

**Sólo existe para lectores de pantalla. Una persona vidente nunca lo ve.**

Existe además `timerVisualNote` (`:183`), que sí es visual — pero se pinta **dentro de la tarjeta del
reloj** (`:505`), o sea dentro del mismo bloque que ya se fue con el scroll. Redundancia que falla
por la misma causa.

### 3. La gracia de 30 minutos es inservible con texto sin guardar

`resolveAssessmentTiming` (`src/lib/hiring/assessment/public-taking.ts:190-250`) define dos plazos:

- `answerDeadlineMs = startedAt + effectiveMinutes` → cierra el **guardado**
- `closeDeadlineMs = answerDeadline + 30 min` → cierra el **envío**
- entre ambos, `phase = 'submit_grace'`

Y `instances.ts:577-579` rechaza cualquier guardado pasado `answer_deadline` con
`assessment_not_open` (409).

La gracia está pensada para "ya no escribas más, pero alcanza a enviar". El problema es que la UI
**sigue mostrando el textarea editable** durante `submit_grace`, y el envío intenta guardar primero.
Quien llegue a la gracia con texto en el cuadro —el caso natural de alguien a quien se le acabó el
tiempo escribiendo— choca contra un 409 y pierde el texto.

### 4. El error final no dice la causa

`hiringAssessment.ts:12-13` — `errorTitle: 'No pudimos cargar la evaluación'` /
`errorBody: 'Prueba de nuevo en unos minutos. Si el problema sigue, avisa a quien te contactó.'`

Es el genérico de cualquier fallo. Aquí la causa es conocida y estructural, y reintentar **no puede
funcionar nunca**. Mismo patrón que `invalidBody` (`:9-10`), que colapsa seis causas distintas.

## Layout objetivo

### Fase `answering` — reloj pegado al viewport

```
┌────────────────────────────────────────────────────────────┐
│ ◀ STICKY (top:0, z-index sobre el contenido)               │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ 💼 Account Manager        ⏱ Tiempo restante  12:04     │ │
│ │                           ▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░         │ │
│ └────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────┤
│  Sección 4 de 6: Comunicación de riesgos                   │
│  [enunciado de la pregunta…]                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │ [textarea]                                         │    │
│  │                                          445/6000  │    │
│  └────────────────────────────────────────────────────┘    │
│  Atrás                                     Continuar       │
└────────────────────────────────────────────────────────────┘
```

A ≤300 s el reloj vira a `warning` y a ≤60 s a `critical` (`:175`, ya implementado). Al estar sticky,
ese cambio de tono **por fin es perceptible**, que era su intención original.

### Aviso de 5 y 1 minuto — visible, no sólo anunciado

```
┌────────────────────────────────────────────────────────────┐
│ 💼 Account Manager           ⏱ Tiempo restante   04:59     │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⚠ Quedan 5 minutos. Guarda tu respuesta con Continuar. │ │  ← role='status'
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

El `srOnly` con `aria-live` **se conserva** para lectores de pantalla; se le suma la banda visible.
No se reemplaza uno por otro: son dos canales para dos usuarios distintos.

### Fase `submit_grace` — honesta y sin trampa

```
┌────────────────────────────────────────────────────────────┐
│ 💼 Account Manager      ⏱ Para enviar te quedan  26:12     │
├────────────────────────────────────────────────────────────┤
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⏱ El tiempo para responder terminó. Ya no puedes       │ │
│ │   editar ni agregar respuestas, pero todavía puedes    │ │
│ │   enviar lo que alcanzaste a guardar.                  │ │
│ │   Guardadas: 5 de 6.                                   │ │
│ └────────────────────────────────────────────────────────┘ │
│  [textarea EN SOLO LECTURA, contenido preservado]          │
│  Atrás                              Enviar evaluación      │
└────────────────────────────────────────────────────────────┘
```

Decisiones que esto fija:

- El textarea pasa a **`readOnly`**, no se vacía ni se desmonta. El candidato conserva su texto a la
  vista y puede copiarlo. Vaciarlo sería destruir su trabajo delante de él.
- El botón de envío **no intenta guardar** en esta fase: envía lo ya guardado.
- La banda declara cuántas respuestas se guardaron, para que "enviar" sea una decisión informada.

## Estados

| Estado | Qué se ve |
|---|---|
| Default (`answering`) | Reloj sticky con cuenta regresiva y barra |
| Aviso 5 min | Banda visible `warning` + reloj ámbar + `srOnly` intacto |
| Aviso 1 min | Banda visible `critical` + reloj rojo + `srOnly` intacto |
| `submit_grace` | Banda explicativa, textarea `readOnly`, envío habilitado, reloj cuenta hacia `closeDeadline` |
| `closed` | Sin textarea ni envío; mensaje terminal que nombra la causa (venció el plazo de envío) |
| Guardado rechazado (409 `assessment_not_open`) | Mensaje específico: el tiempo de respuesta terminó, tu texto sigue en pantalla, puedes enviar lo guardado. **Nunca** "reintenta en unos minutos" |
| Error real (5xx/red) | Ahí sí `errorBody` genérico, que es su caso legítimo |
| Sin límite de tiempo | Sin cuenta regresiva; la ventana de 24 h no se presenta como reloj |
| Móvil ≤560px | `.sessionBar` ya colapsa a columna (`:733-738`); sticky debe conservar altura mínima y no tapar el enunciado |
| Reduced motion | La aparición del sticky y de las bandas sin transición |

## Copy

Todo en `src/lib/copy/dictionaries/es-CL/hiringAssessment.ts` + par `en-US` + tipo en
`src/lib/copy/types.ts`. Tuteo es-CL, sin culpar al candidato, sin jerga técnica.

| Key | Texto propuesto |
|---|---|
| `timeWarningFive` | ya existe — reusar en la banda visible |
| `timeWarningOne` | ya existe — reusar en la banda visible |
| `graceTitle` | `El tiempo para responder terminó` |
| `graceBody` | `Ya no puedes editar ni agregar respuestas, pero todavía puedes enviar lo que alcanzaste a guardar.` |
| `graceSavedCount` | `Guardadas: {saved} de {total}.` |
| `saveClosedTitle` | `Tu tiempo de respuesta terminó` |
| `saveClosedBody` | `No pudimos guardar esta respuesta porque el plazo se cumplió. Tu texto sigue en pantalla: cópialo si lo necesitas. Puedes enviar lo que ya está guardado.` |

`saveClosedBody` es la que reemplaza al genérico en el 409 y la que le habría dicho a Roxana qué hacer.

## Accesibilidad

- La banda de aviso usa `role='status'` (no `alert`: no interrumpe una tarea en curso).
- Se **conserva** el `srOnly` con `aria-live='polite'`; no duplicar el anuncio (la banda visible
  no lleva `aria-live` propio).
- El reloj mantiene `role='timer'` y su `aria-label` (`:498-499`).
- Sticky no debe tapar el foco: al tabular hacia un control alto, `scroll-margin-top` igual a la
  altura de la barra.
- Contraste AA en los tres tonos del reloj, incluido `critical` sobre su fondo.
- El textarea `readOnly` conserva foco y permite seleccionar/copiar.

## Implementation Mapping

- **Ruta / surface:** `/public/assessment/[token]` y `/public/assessment/session` →
  `src/components/greenhouse/hiring/assessment/AssessmentTakingClient.tsx`
- **CSS:** `AssessmentTakingClient.module.css` — `.sessionBar:86`, `.srOnly:718`
- **Timing (sin cambios de contrato):** `resolveAssessmentTiming`
  (`src/lib/hiring/assessment/public-taking.ts:190`) ya expone `phase`, `answerDeadlineAt`,
  `closeDeadlineAt`, `remainingSeconds`. **La UI ya recibe todo lo que necesita.**
- **Origen del 409:** `src/lib/hiring/assessment/instances.ts:577-579` (`assessment_not_open`).
  No se modifica: el plazo de respuesta debe seguir cerrando. Lo que cambia es cómo se presenta.
- **Copy:** `src/lib/copy/dictionaries/{es-CL,en-US}/hiringAssessment.ts` + `src/lib/copy/types.ts`
- **Primitive decision:** `one-off` — esta superficie es pública y no consume el shell del portal;
  usa CSS modules propios, no MUI. No se introduce primitive nueva.
- **Access / capability:** ninguna. Superficie pública autenticada por token/sesión opaca.

## GVC Scenario Plan

- **Scenario file:** `scripts/frontend/scenarios/assessment-taking-timer.mjs` `[verificar nombre]`
- **Viewports:** desktop 1440 + móvil 390
- **Quality profile:** `premium`
- **Pasos:** abrir un test en curso → hacer scroll hasta el pie del enunciado → capturar
  (el reloj debe seguir visible) → forzar `submit_grace` → capturar banda + textarea `readOnly`
- **`data-capture`:** `assessment-timer` ya existe (`:497`); agregar `assessment-grace-banner`
- **Assertions:** el reloj es visible tras scroll al fondo; la banda de 5 min es visible (no `srOnly`);
  en `submit_grace` el textarea tiene `readonly` y el botón de envío está habilitado; sin scroll
  horizontal en 390px

## Design Decision Log

| Decisión | Alternativa descartada | Por qué |
|---|---|---|
| Reloj sticky | Reloj flotante tipo FAB | El sticky conserva la jerarquía y el layout ya existente; un FAB tapa contenido en móvil |
| Banda visible + `srOnly` | Reemplazar `srOnly` por visible | Son dos canales para dos usuarios; quitar el `srOnly` sería una regresión de accesibilidad |
| Textarea `readOnly` en gracia | Desmontarlo o vaciarlo | Destruir el texto del candidato delante de él es el peor resultado posible |
| No tocar `instances.ts` | Permitir guardar durante la gracia | El plazo de respuesta es el invariante del test; extenderlo de facto lo vacía de sentido |
| Copy específica para el 409 | Mantener el genérico | El genérico manda a reintentar algo imposible; es la causa directa del caso fuente |

## Fuera de alcance

- Cambiar la duración de la gracia (30 min) o del límite base.
- Autoguardado mientras se escribe — mitigaría mucho esto, pero es un cambio de contrato de
  guardado con su propio riesgo; queda declarado como follow-up, no como parte de esta task.
- El mensaje `invalidBody` del enlace no disponible (dueño distinto, mismo patrón).
- Cualquier superficie de operador.
