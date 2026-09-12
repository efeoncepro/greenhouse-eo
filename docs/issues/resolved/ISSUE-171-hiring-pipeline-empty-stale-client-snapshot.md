# ISSUE-171 — El pipeline de Hiring se ve vacío al cambiar de vacante: el tablero no re-lee el snapshot del servidor

> **Tipo:** Incidente de runtime
> **Ambiente:** producción (`/agency/hiring/pipeline`; una sola instancia Cloud SQL compartida dev/staging/prod)
> **Detectado:** 2026-09-12
> **Estado:** resolved 2026-09-12 — fix estructural en producción (release `586a8627568a`, manifest `released` 14:44:56Z)
> **Superficie dueña:** `src/views/greenhouse/hiring/PipelineDeskView.tsx`

## Síntoma

Las vacantes `EO-OPN-0674` (SEO Specialist Senior) y `EO-OPN-0675` (Director(a) de Arte Senior), publicadas el
2026-09-09, muestran el pipeline vacío con el cartel «Sin resultados», aunque han postulado decenas de personas.

## Causa raíz

`PipelineDeskView.tsx:125` siembra el estado `applications` con `useState(initialSnapshot.applications)` y **nunca lo
re-sincroniza**. Sus dos únicos `setApplications` (`:251` y `:274`) son el update optimista del arrastre y su rollback.
El estado hermano `openingId` **sí** se sincroniza, en el efecto de `:150`.

Esa asimetría es el defecto. El `onChange` del selector hace `router.replace` (`:534`): navegación soft, el componente
**no se desmonta**, así que el inicializador de `useState` no vuelve a correr. El servidor re-renderiza y manda un
snapshot nuevo scopeado a la vacante elegida (`src/lib/hiring/desk.ts:136` filtra el `SELECT` por `openingId`);
`openingId` pasa a la vacante nueva y `applications` conserva el arreglo del montaje. `filtered` (`:162-172`) cruza
ambos y da 0 → `:761` pinta «Sin resultados».

Se dispara siempre que la página **monte** con `?openingId=` en la URL — que el propio tablero escribe
(`:159`, `:189`, `:211`, `:534`). Basta elegir una vacante y recargar, volver desde Application 360 con
`?focusApplication=`, o entrar por un enlace del Demand Desk. Un F5 lo enmascara, que es la firma clásica del estado
cliente rancio.

**No es regresión del 2026-09-09.** La línea nació en `559f5654b` (2026-07-09, `feat(hiring): implement Hiring Desk
workspaces`). Se volvió visible al pasar de una a cuatro vacantes con postulaciones: con una sola, cambiar de vacante
no es un gesto que el operador haga.

## Evidencia

Reproducido con un test de re-render con props nuevas (lo que hace la navegación soft): el servidor entrega 4 filas y
el tablero pinta **0**, con `"Sin resultados" presente = true`.

Lectura del desk reproducida tal como la hace la page: con `openingId` devuelve **51 y 15** postulaciones
correctamente. Los datos están sanos y **nada se perdió**:

| Vacante | Postulaciones | Nombre | Email | País | Teléfono | Mensaje | CV |
|---|---|---|---|---|---|---|---|
| `EO-OPN-0674` | 15 | 15 | 15 | 15 | 14 | 9 | 15 |
| `EO-OPN-0675` | 51 | 51 | 51 | 51 | 51 | 38 | 49 |

Todas `data_origin='real'`, 0 archivadas, todas en etapa `sourced` (que tiene carril, `inbox`). El flujo sigue vivo:
30 el 10-sep, 17 el 11-sep, 19 el 12-sep.

### Descartes con datos

1. **Las postulaciones no existen (intake rechazando).** Refutada: las 66 existen y siguen llegando. El carril vivo en
   producción **no es** el endpoint directo sino el Growth Form → projection reactiva
   (`src/lib/sync/projections/growth-hiring-application-from-submission.ts`), que usa su propio abuse-guard, así que la
   rotación pendiente de `TURNSTILE_SECRET` no es el sospechoso. El patrón de `created_at` en múltiplos exactos de
   5 minutos (+2–8 s) es el drain del cron, no el clic del candidato.
2. **El desk las filtra por procedencia.** Refutada: `hidden_by_provenance = 0`; persona, vacante y demanda en `real`.
3. **El snapshot las descarta.** Refutada como causa de este síntoma: con `openingId` viaja todo. Pero ver el defecto
   (a) abajo.

## Impacto

El operador no puede trabajar el pipeline de una vacante tras cambiar de vacante en el selector, y la pantalla afirma
que no hay postulantes cuando hay 51. Riesgo operativo real: 66 candidaturas vivas que parecen inexistentes, con un
compromiso público de respuesta de 3 a 4 semanas. Sin pérdida de datos.

## Solución (implementada en local 2026-09-12; pendiente de release)

Se aplicó la **opción recomendada**: `PipelineDeskView` deriva la lista con `useMemo` desde
`initialSnapshot.applications` y guarda sólo `stageOverrides` (mapa `applicationId → stage`) para el
arrastre; un snapshot nuevo limpia los overrides. Test de regresión
`pipeline-desk-snapshot-sync.test.tsx` (re-render de la MISMA instancia con el snapshot de otra vacante
→ 4 tarjetas nuevas, 0 residuales, sin «Sin resultados»). Verificado con los tests del tablero y lint.

### Opciones que se evaluaron

**Opción recomendada — dejar de duplicar el estado de servidor.** `initialSnapshot.applications` pasa a ser la única
fuente; el único estado cliente legítimo es el delta optimista de etapa del arrastre, como mapa de overrides
(`Record<applicationId, stage>`), derivando la lista con `useMemo` y limpiando overrides cuando llega un snapshot
nuevo. Toca un componente (`:125`, `:251`, `:274` y el `useMemo` de `filtered`), sin cambios de API, schema ni
contratos. Cierra la clase de error: no queda copia del estado de servidor que pueda ranciarse.

**Opción mínima — sincronizar.** Agregar `setApplications(initialSnapshot.applications)` al efecto de `:150`. Una
línea, riesgo bajo, pero deja viva la clase: el autor ya sincronizó tres estados y olvidó el cuarto.

En ambos casos va con test de regresión que re-renderiza con el snapshot de otra vacante y exige que las tarjetas
nuevas aparezcan. Cierre con `pnpm local:check` + test focal; UI visible ⇒ GVC según el contrato del repo.

## Defectos estructurales adyacentes (medidos, fuera del alcance de este fix)

**(a) El tope de 120 trunca en silencio.** En montaje frío (sin `openingId`), `totals.applications = 187` y el snapshot
embarca 120: `EO-OPN-0675` lleva 35 de 51, `EO-OPN-0061` 16 de 56, `EO-OPN-0009` 54 de 67. El contador visible usa
`filtered.length`, así que discrepa de la columna «postulaciones» del Demand Desk **sin emitir ninguna señal**. Es el
descarte mudo de `getHiringDeskSnapshot`, ahora con números.

**(b) El libro de intake es ciego al carril vivo.** `greenhouse_hiring.hiring_application_intake_events` tiene **7
filas en toda su historia** (3 `accepted`, 3 `captcha_failed`, 1 `invalid`; la última del 2026-08-12) con 187
postulaciones acumuladas. No está roto: pertenece al endpoint directo `/api/public/hiring/applications`, que ya nadie
usa. Consecuencia: la tabla designada como «la que discrimina» no observa el camino real, y **no se puede medir si
alguien intentó postular y falló antes de llegar**. Esto reencuadra el follow-up abierto de atribuir `captcha_failed` /
`invalid` a una vacante: antes de atribuir hay que hacer que el carril vivo escriba ahí.

**(c) Menor, misma superficie.** La tarjeta hace `item.application.source.replaceAll(...)` sin guarda (`:336`), así que
un `source` nulo o inesperado revienta el render del tablero completo. Hoy no muerde porque las 66 filas traen
`public_careers`.

## Pendiente operativo aparte (no lo causa ni lo arregla este fix)

**6 CV de `EO-OPN-0675` están en `quarantined`** y 2 postulaciones no adjuntaron ninguno. La cuarentena es el escáner
bloqueando el archivo; la postulación se aceptó igual y el candidato vio el mismo mensaje genérico de éxito, como
corresponde. Esos 6 CV no se pueden abrir hasta que un humano los revise.

## Resolución (2026-09-12)

Release `586a8627568a-d336e91c-115f-4b1f-a7f0-9eadb5157b42` (PR #234, orquestador `34699636555`, `released`
14:44:56Z, Vercel Production READY para `586a86275`). Verificación: test de regresión
`pipeline-desk-snapshot-sync.test.tsx` (re-render de la misma instancia con el snapshot de otra vacante → las tarjetas
nuevas aparecen, 0 residuales, sin «Sin resultados») + revisión de arquitectura (sin bloqueantes; se corrigió la
identidad del estado de overrides). **Verificación runtime (2026-09-12, Playwright + sesión de agente en staging, misma base y mismo código que
producción):** montaje en `EO-OPN-0009` → 120 tarjetas; cambio a `EO-OPN-0675` sin recargar → **66 tarjetas y 0
«Sin resultados»** (antes del fix: 0 tarjetas); vuelta a `EO-OPN-0009` → 120. Capturas en
`.captures/issue-171-verify/` (ignorado por git). Adyacentes registrados en
`ISSUE-172` (tope de 120 mudo, libro de intake ciego, `source` sin guarda) siguen como follow-ups.

## Referencias

- Superficie: `src/views/greenhouse/hiring/PipelineDeskView.tsx` · lectura: `src/lib/hiring/desk.ts`
- Script read-only del diagnóstico: `scripts/hiring/_sanity-pipeline-empty-diagnosis.ts` (vive **sólo** en la rama
  `claude/hiring-pipeline-bug-880pbn`, junto con `TASK-1869` y Deltas en `TASK-800`/`TASK-1864`)
- Arquitectura: `docs/architecture/GREENHOUSE_HIRING_ATS_ARCHITECTURE_V1.md`
