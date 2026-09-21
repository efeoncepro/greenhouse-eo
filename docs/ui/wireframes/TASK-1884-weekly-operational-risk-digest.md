# TASK-1884 — Wireframe: digest semanal de riesgo operativo (email)

> **Superficie:** email transaccional semanal, no ruta del portal.
> **Plantilla base:** `src/emails/WeeklyExecutiveDigestEmail.tsx` (existente, en producción desde 2026-04).
> **Dirección visual:** `repo-native-benchmark` — evolución de la plantilla existente, sin dirección visual nueva. La identidad (cabecera navy con isotipo Efeonce, tarjeta blanca sobre fondo gris, chip de severidad) se conserva; lo que cambia es **qué información entra y en qué orden**.
> **Estado:** `UI ready: no`. Falta la decisión de producto sobre qué bloques entran en V1 (ver `## Open Decisions`) y el ensayo de render con datos reales.

---

## 1. Por qué existe este contrato

El correo actual presenta una lista plana de "insights" ordenados por un número constante, sin sujeto accionable, sin fecha del hecho y sin distinguir riesgo operativo de higiene de tablero. El rediseño no es cosmético: cambia la **unidad de información** de "métrica que se desvió el mes pasado" a "compromiso que está en riesgo esta semana".

Evidencia del correo del 2026-09-21 (07:00 Santiago), reproducida contra la base:

- 5 insights, 2 espacios, todos con `quality_score = 85,00`.
- 3 de los 5 correspondían al período **2026-08**, bajo un encabezado que decía "14 SEPT - 21 SEPT".
- Los 2 de Efeonce eran las causas raíz de **menor** contribución (8,33 % y 16,67 %); la anomalía madre y la causa del 75 % no llegaron (ISSUE-176).
- Ninguno mencionaba las 156 tareas que vencían en ≤7 días, de las cuales 78 estaban sin movimiento.

## 2. Audiencia y momento

- **Quién lo recibe:** hoy `EFEONCE_ADMIN` + `EFEONCE_OPERATIONS` (`src/lib/nexa/digest/recipient-resolver.ts:7`). El Contrato de Métricas §8 asigna el ritmo semanal a **Ops Lead + Account Lead**; ampliar la audiencia es decisión de producto, no de esta task.
- **Cuándo:** lunes 07:00 `America/Santiago`, cron `ops-nexa-weekly-digest` (`0 7 * * 1`, `services/ops-worker/deploy.sh:1951`).
- **Contexto de lectura:** en el teléfono, antes del primer bloque de trabajo de la semana. El primer fold debe permitir decidir "¿tengo que mover algo hoy?" sin abrir el portal.
- **Qué debe provocar:** una de tres acciones — reasignar, renegociar una fecha con el cliente, o mandar a limpiar el tablero. Si el correo no habilita ninguna de las tres, no cumplió.

## 3. Estructura de bloques

El orden es deliberado: **lo que todavía se puede evitar va antes que lo que ya pasó.**

```
┌─────────────────────────────────────────────────────────┐
│ [cabecera navy · isotipo Efeonce]                       │  ← sin cambios
├─────────────────────────────────────────────────────────┤
│ RIESGO DE LA SEMANA · 21–28 sept 2026                   │  ← período del CORTE
│ Datos al lunes 21 de septiembre, 06:20                  │  ← frescura explícita
│ [chip] 2 de 3 espacios con datos suficientes            │  ← estado de datos
├─────────────────────────────────────────────────────────┤
│ ① VENCE ESTA SEMANA Y NO SE ESTÁ MOVIENDO               │  ← bloque primario
│                                                          │
│   Grupo Berel · 37 de 104 en riesgo                     │
│   ┌───────────────────────────────────────────────┐     │
│   │ Cargar banners de artículos a SharePoint      │     │
│   │ Briefing · vence jue 24 · 11,7 días quieta    │     │
│   │ Daniela Ferreira                    [ver →]   │     │
│   └───────────────────────────────────────────────┘     │
│   … hasta N ítems, luego "y 33 más"                     │
│                                                          │
│   Sky Airline · 41 de 52 en riesgo (79 %)               │
│   …                                                      │
├─────────────────────────────────────────────────────────┤
│ ② COMPROMISOS VENCIDOS SIN CERRAR                       │  ← deuda
│   Sky Airline 164 · Efeonce 177 · Berel 28              │
│   "El OTD del mes no cuenta estos."                     │  ← la frase importa
├─────────────────────────────────────────────────────────┤
│ ③ EL REGISTRO NO ESTÁ AL DÍA                            │  ← higiene, separado
│   272 tareas vencidas sin responsable (~235 días)       │
│   333 activos sin tocarse hace más de 96 h              │
├─────────────────────────────────────────────────────────┤
│ ④ INDICADORES FUERA DE BANDA                            │  ← período cerrado
│   Efeonce · OTD 20 %  [crítico]  [dato insuficiente]    │
│   sobre 5 tareas · período agosto · visto hace 5 sem.   │
├─────────────────────────────────────────────────────────┤
│ ⑤ QUÉ CAMBIÓ                                            │  ← secundario, colapsable
│   Sky · RpA 1,33 vs 1,17 · agosto · 30 de 328 tareas    │
├─────────────────────────────────────────────────────────┤
│ Lo que no se pudo medir esta semana: …                  │  ← degradación honesta
│ [Abrir Greenhouse]                                       │
└─────────────────────────────────────────────────────────┘
```

### Regla de jerarquía

Los bloques ① a ③ salen del reader de TASK-1882 (conteos, sin modelo). Los bloques ④ y ⑤ salen del DTO de TASK-1883 (métricas con severidad y evidencia). **Si el reader de riesgo falla, los bloques ④-⑤ no rellenan su lugar**: el correo declara que no pudo leer el riesgo. Al revés también.

## 4. Anatomía de un ítem de riesgo

Cinco datos, ninguno opcional:

| Dato | Origen | Por qué es obligatorio |
|---|---|---|
| Qué | `taskName` | sin sujeto no hay acción |
| Dónde | `projectLabel` resuelto | nunca el ID técnico |
| Cuándo | `dueDate` + `daysUntilDue` | la urgencia es la fecha, no el score |
| Cuánto lleva quieto | `daysIdle` | distingue "va lento" de "nadie lo tocó" |
| Quién | `ownerDisplayName` o **"sin responsable"** explícito | la ausencia de dueño es información, no un campo vacío |

El enlace lleva al detalle de la tarea o al espacio; nunca a una lista genérica que obligue a volver a buscar.

## 5. Anatomía de un indicador (bloque ④)

```
Efeonce · OTD 20 %          [crítico]  [dato insuficiente]
sobre 5 tareas completadas · período agosto 2026
visto por 5ª semana consecutiva
```

Cuatro cambios respecto del correo actual:

1. **Nunca `· score 85`.** El `qualityScore` sale del titular; el número que acompaña a la métrica es su valor real.
2. **Severidad del umbral de negocio**, no del z-score (TASK-1883). El 20 % es crítico aunque su desviación no llegue a 3σ.
3. **Denominador siempre visible.** "sobre 5 tareas" cambia por completo cómo se lee un 20 %.
4. **Período del hecho y recurrencia explícitos.** Un hecho de agosto no se presenta bajo un encabezado de septiembre sin decirlo.

## 6. Estados

| Estado | Qué muestra |
|---|---|
| Default | los cinco bloques con contenido |
| Sin riesgo en el horizonte | bloque ① con mensaje afirmativo explícito ("nada vence esta semana sin movimiento"), **no** se omite el bloque — su ausencia se leería como fallo |
| Datos stale | banner de frescura arriba, con la fecha del último dato; los bloques siguen pero rotulados |
| Un espacio sin datos suficientes | el espacio aparece con su razón, no desaparece de la lista |
| Reader de riesgo caído | bloques ①-③ reemplazados por una nota de degradación; ④-⑤ siguen si están sanos |
| Paridad de señales rota (ISSUE-176) | nota explícita de que la lista de indicadores puede estar incompleta |
| Sin destinatarios resueltos | no se envía; queda el log `skipped: no_weekly_digest_recipients` (comportamiento actual, se conserva) |
| Todo vacío | no se envía (comportamiento actual `no_weekly_insights`, se conserva) |
| Mobile | una columna, tarjetas apiladas, sin tabla horizontal |
| Dark mode de cliente de correo | colores de severidad con contraste verificado sobre fondo oscuro |

## 7. Copy

Todo el copy visible vive en `src/lib/copy/nexa.ts` (`GH_NEXA`) o en el diccionario de emails `src/lib/copy/dictionaries/es-CL/emails.ts`. Prohibido literal en JSX.

Principios de tono (es-CL, tuteo, validar con `greenhouse-ux-writing`):

- **Nombrar el hecho, no adjetivarlo.** "37 de 104 sin movimiento" y no "situación preocupante".
- **La ausencia de dato se dice.** "sin responsable asignado", nunca un espacio en blanco.
- **Sin falsa urgencia.** El chip de severidad y la fecha bastan; no hace falta "¡atención!".
- **La frase del bloque ② es deliberada**: el lector tiene que entender que su OTD verde y su deuda conviven. Redactarla con cuidado y validarla con el operador.

## 8. Accesibilidad y render

- Tabla HTML de correo (no flexbox/grid): compatibilidad con Outlook, que es el cliente laboral canónico de Efeonce.
- Contraste de los chips de severidad ≥ 4,5:1 medido, en claro y en oscuro.
- Los chips no comunican sólo por color: llevan texto (`crítico`, `en seguimiento`).
- Ancho máximo 600 px; sin scroll horizontal en 390 px.
- `alt` en el isotipo; jerarquía de encabezados real (`h1` → `h2` por bloque).

## Implementation Mapping

- Route / surface: email `weekly_executive_digest`; construido en `src/lib/nexa/digest/build-weekly-digest.ts`, renderizado por `src/emails/WeeklyExecutiveDigestEmail.tsx`, disparado por `POST /nexa/weekly-digest` (`services/ops-worker/server.ts:932`).
- Primitive / variant / kind: `reuse` — componentes de email ya existentes en `src/emails/`. No nace primitive nueva; los bloques son composición de los existentes.
- Component candidates: `WeeklyExecutiveDigestEmail.tsx` (modificado), más subcomponentes locales por bloque dentro de `src/emails/`.
- Copy source: `src/lib/copy/nexa.ts` + `src/lib/copy/dictionaries/es-CL/emails.ts`.
- Data reader / command: `readDeliveryCommitmentRisk` (TASK-1882) para ①-③; DTO enriquecido de insights (TASK-1883) para ④-⑤. El builder del digest **compone**, no calcula.
- API parity: el correo es un consumer más del mismo reader que exponen `/api/platform/app/delivery/commitment-risk` y las superficies de `/nexa/insights`. Cero lógica propia.
- Access / capability: sin cambios — resolución de destinatarios por rol en `recipient-resolver.ts`.
- States to implement: los once de la sección 6.

## GVC Scenario Plan

GVC (Playwright sobre rutas del portal) **no aplica directamente**: esta superficie es un correo, no una ruta. La verificación visual equivalente, y obligatoria:

- Scenario file: `n/a` — se reemplaza por el ensayo de render descrito abajo.
- Route: `n/a`.
- Viewports: 600 px (ancho canónico de correo) y 390 px (móvil).
- Quality profile: `premium` en criterio, con evidencia adaptada al medio.
- Required steps:
  1. `POST /nexa/weekly-digest` con `dryRun: true` contra staging — el endpoint ya soporta `dryRun` y `recipients_override` (`server.ts:938-940`). Devuelve el digest completo sin enviar.
  2. Renderizar el HTML resultante a archivo y abrirlo en el navegador a 600 px y 390 px.
  3. Envío real a un destinatario interno de prueba vía `recipients_override`, y **apertura en Outlook**, que es el cliente laboral real.
- Required captures: primer fold a 600 px, primer fold a 390 px, bloque ① con ítems, estado "sin riesgo en el horizonte", estado degradado, captura en Outlook.
- Required `data-capture` markers: `n/a` (medio email).
- Assertions: ningún ítem sin responsable renderiza un espacio en blanco; ningún indicador sin denominador; ningún texto con slug técnico; ningún `score` en el titular.
- Scroll-width checks: sin scroll horizontal a 390 px.
- Reduced-motion / focus evidence: `n/a` — el correo no tiene motion ni foco interactivo.
- Review dossier: capturas adjuntas al PR.
- Baseline decision / surface ID: sin baseline de píxeles; el medio no lo permite de forma estable entre clientes de correo.

## Design Decision Log

- **Decisión:** reordenar el correo por naturaleza de riesgo (prospectivo → deuda → higiene → indicadores → cambios) en vez de agrupar por espacio.
  **Alternativas consideradas:** (a) conservar el agrupamiento por espacio y sólo añadir campos; (b) dos correos separados, uno de riesgo y otro de indicadores.
  **Por qué este patrón:** el agrupamiento por espacio obliga a leer todo para saber si hay algo urgente, y mezcla en una misma lista un compromiso que vence el jueves con una métrica de agosto. La separación en dos correos duplica el ritual y compite por la misma atención de lunes. Un correo con jerarquía explícita resuelve ambos.
  **Reuse / extend / new primitive:** `reuse`.
  **Riesgos abiertos:** el correo se alarga; mitigación es el tope de ítems por bloque y el "y N más".

- **Decisión:** separar higiene de registro (bloque ③) del riesgo operativo (bloque ①).
  **Alternativas:** mezclarlas como hoy.
  **Por qué:** exigen decisiones opuestas. Con 272 de 369 tareas vencidas sin responsable y ~235 días de antigüedad, presentarlas como atraso manda a liderazgo a revisar capacidad cuando el problema es de registro. El correo del 2026-09-21 hizo exactamente eso con Efeonce.
  **Riesgos abiertos:** el bloque ③ puede volverse ruido si nadie lo acciona; revisar a las 4 semanas.

- **Decisión:** el valor de la métrica acompaña al nombre; el `qualityScore` desaparece del titular.
  **Alternativas:** conservarlo en un lugar secundario.
  **Por qué:** es constante en el 86,3 % de los casos y se lee como si fuera el valor de la métrica. No aporta información y produce una lectura falsa.
  **Riesgos abiertos:** ninguno; es retirada de información sin valor.

- **Decisión:** declarar siempre la frescura y lo que no se pudo medir.
  **Alternativas:** omitir silenciosamente.
  **Por qué:** con ISSUE-176 abierto, el correo puede estar mostrando un subconjunto. Un correo que no declara sus huecos es peor que uno que no se envía.

## Open Decisions

Bloquean `UI ready: yes`:

1. ¿Entran los cinco bloques en V1, o V1 es sólo ①-③ (lo que no depende de TASK-1883)? Determina si el correo puede salir antes de que cierre la severidad honesta.
2. ¿Cuántos ítems por espacio antes del "y N más"? Afecta directamente el largo del correo.
3. ¿La audiencia sigue siendo los dos roles actuales, o pasa a Ops Lead + Account Lead como indica el Contrato §8?
4. Redacción final de la frase del bloque ② — requiere validación del operador.

## Lo que este contrato NO cubre

- La entrega por Teams o in-app (TASK-695, TASK-436, TASK-439).
- Botones de acción dentro del correo (TASK-435, TASK-1184).
- Las superficies de `/nexa/insights` en el portal, que consumen los mismos readers pero tienen su propio contrato.
- Evidencia de paridad entre el render del correo y la vista del portal.
