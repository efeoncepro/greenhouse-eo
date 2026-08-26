# Greenhouse Hiring — Estado real del dominio vs. su contabilidad documental — Auditoría 2026-08-26

## Estado

- Tipo: auditoría de contabilidad documental y estado de rollout
- Fecha: 2026-08-26
- Scope: `EPIC-011` completo — las 7 tasks `in-progress`, las ~24 `to-do`, los 12 feature flags del dominio, el estado de promoción a producción y los documentos que declaran todo lo anterior
- Método: 5 verificadores en paralelo con instrucción adversarial explícita (evidencia `file:line` o comando+salida; prohibido usar el texto de una task como prueba de su propia afirmación; obligación de declarar dónde NO se miró), **más re-verificación manual de todo hallazgo que contradijera el diagnóstico previo**
- Evidencia: repositorio en `develop` (`7a7787dfe`), `vercel env ls --scope efeonce-7670142f`, `gcloud run services describe ops-worker --region us-east4` (revisión activa `ops-worker-00594-2tp`), comparación de blobs `origin/main` ↔ `origin/develop`
- Verdict: **`accounting_drift_confirmed` — el dominio está materialmente más avanzado que sus documentos. No se encontró trabajo de construcción faltante donde los documentos lo declaraban; se encontró evidencia y verificación faltantes, y tres pendientes reales que ninguna línea de estado declaraba**
- Sin cambios de runtime

## Por qué existe esta auditoría

La pregunta de origen fue «¿qué falta de Hiring?». El primer barrido se respondió **leyendo los
documentos del dominio** y produjo un diagnóstico equivocado en sus dos conclusiones principales.
Esta auditoría existe para dejar escrito el método que lo corrigió y los hechos verificados, de modo
que la próxima pregunta no se responda igual.

## H-01 — La cuenta de commits no mide despliegue (causa del diagnóstico falso)

`main` promueve por **squash merge**: los commits individuales de `develop` **nunca** se vuelven
ancestros de `main`, aunque su contenido esté en producción. Verificado: los últimos 5 commits de
`main` tienen un solo padre cada uno, encadenados linealmente.

Consecuencia: `git rev-list --count origin/main..origin/develop` devuelve 1137 y **no significa
«trabajo sin desplegar»**; es el residuo acumulado del squash. Interpretarlo así produjo la
conclusión falsa de que había una sequía de releases y de que `TASK-1771` esperaba promoción.

- Último release: `709e15f66`, **2026-08-23** (hubo dos ese mismo día). Cadencia de días.
- `git merge-base --is-ancestor <sha> origin/main` devuelve «no» para código **que sí está en
  producción**. No es prueba de ausencia.

**Método correcto para saber si algo está en producción:** comparar el blob por ruta.

```bash
git ls-tree origin/main -- <ruta> ; git ls-tree origin/develop -- <ruta>
```

Ruta ausente ⇒ no está. Blobs iguales ⇒ está y es idéntico. Aplicado con la ruta equivocada este
método también miente: el primer intento usó rutas inexistentes y devolvió «ausente en ambas», que
se leyó erróneamente como confirmación. **Confirmar primero que la ruta existe en alguna rama.**

## H-02 — Un flag encendido en producción, declarado apagado

`HIRING_VACANCY_AI_ENABLED`: **ON en Production desde 2026-07-16 (41 días), AUSENTE en staging**. El
ledger lo declaraba «OFF en todos los environments» en dos filas distintas.

Agravante de proceso: su precondición declarada era *flip staging + smoke, después prod*. El orden
ocurrió **invertido** — prod ON sin que el smoke de staging ocurriera nunca. La deuda queda abierta;
no es diseño.

Runtime lector verificado: Vercel únicamente (`vacancy-ai/config.ts:14`), cero lecturas en `services/`.

## H-03 — Tres pendientes que ninguna línea de estado declaraba

| # | Task | Hallazgo | Filo |
|---|---|---|---|
| 1 | `TASK-1746` | `purge_assessment_access_recovery` existe en DB con **cero callers**: la retención de 12 meses y el purgado por retiro de consentimiento **nunca se ejecutan** | **Legal** (Ley 21.719) |
| 2 | `TASK-1718` | Hallazgo H-10 de su propio Delta 2026-08-22 **sin arreglar**: el filtro `stage` entra como texto libre (`stage as never`, `candidate-review/readers.ts:97`; sin validación contra el enum en `app-hiring-candidate-review.ts:206`) y ante un literal inexistente responde `200 {items:[]}` | Contrato |
| 3 | `TASK-1742` | El canary se declaró verde el 2026-08-18 y **al día siguiente** entraron dos fixes correctivos al mismo carril (`c7474b068`, `05a5daf48` — el segundo titulado *«Sonnet 5 vuelve a calificar candidatos»*). Sin registro de re-verificación | Confianza en la evidencia |

## H-04 — Una task con la mitad de su premisa falsa

`TASK-1751` declaraba cuatro defectos en la rendición del candidato. **Dos no son ciertos:**

- El reloj **ya es `sticky`** (`bc69e5a75`, 2026-08-19 18:58) — arreglado **2h43m después** de
  crearse la task (`23f51afc8`, 16:15), sin que nadie actualizara la spec.
- Los avisos de 5 y 1 minuto **nunca fueron sólo `srOnly`**: la insignia visible `.timerBadge`
  (`AssessmentTakingClient.tsx:183`/`:505`) convive con el canal de lector de pantalla desde el ship
  original `9b69ca7cd` (2026-07-13), o sea **antes** de escribirse la task.

Quedan los **dos del guardado**, que son el daño real del caso fuente: el borrador en vuelo se
descarta al entrar en `submit_grace` (falta el *flush* al cruzar `answerDeadline`, no «congelar
mejor») y el error final colapsa `assessment_incomplete` al genérico «prueba de nuevo», que en ese
estado no puede funcionar nunca.

## H-05 — Documentos que inducían a error a otros agentes

- `.claude/rules/hiring.md` — **auto-load** al tocar `src/lib/hiring/**`. Afirmaba en presente que el
  `CHECK` de `stage='closed'` ⟺ desenlace seguía parqueado; se aplicó el 2026-08-23 (`b270478f4`) y
  `docs/tasks/pending-migrations/` sólo tiene su `README`.
- `docs/tasks/README.md` — ocho entradas contradiciendo a git y al ledger.
- Cinco de siete `Status real` de tasks `in-progress`, stale. Existe precedente del mismo fix
  (`4a1011286`).

## Lo verificado que resultó SANO

- **Drift `deploy.sh` ↔ revisión activa de Cloud Run: cero.** Los 18 flags `HIRING_*` presentes en
  `ops-worker-00594-2tp` están declarados en `services/ops-worker/deploy.sh`; ninguno vive sólo por
  un `--update-env-vars` out-of-band, así que ninguno se evapora en el próximo deploy.
- `HIRING_ASSESSMENT_AI_PROMOTION_EVIDENCE_DIGEST` ausente en los tres runtimes es **fail-closed
  deliberado**, no un olvido: `scoring-run/config.ts:49-52` declara que nunca interpreta un flag como
  evidencia. **NUNCA** declararlo para «destrabar» la policy de excepciones — el digest *es* la
  evidencia de promoción.
- El reloj de retención de documentos de candidato **existe y corre** (`documents/retention.ts:28`,
  ventana de 12 meses con override por candidato) y su señal `hiring.candidate_document.retention_overdue`
  está cableada al overview de reliability con severidad `error`. Lo que falta es sólo el borrado.

## Confirmado como abierto

- `TASK-1773` — el eje de desenlace se opera **sólo desde el portal**. `decideHiringApplication` tiene
  dos callsites, ninguno bajo `api/platform/app/**`; MCP de Hiring es read-only por contrato de
  scopes; **Nexa no tiene ni lectura** de Hiring. Violación de Full API Parity.
- `TASK-1756` y `TASK-1752` — abiertos, con evidencia.
- `EPIC-038` (Talent Assurance) — detenido en su raíz: ADR `Proposed` y **cero código** en `src/` y
  `migrations/`.
- `TASK-1762` — único gap real `develop`-only, con sus **cuatro migraciones ya aplicadas** a la
  instancia Cloud SQL compartida (schema por delante del código; mitigado porque sus flags nacen OFF).

## Invariante que deja esta auditoría

**Un `Status real` es una afirmación con fecha de caducidad, no un hecho.** Antes de planificar sobre
el estado declarado de una task, verificar contra el runtime: blobs por ruta para despliegue,
`vercel env ls` y la revisión **activa** de Cloud Run para flags, y el código de hoy para cualquier
defecto que la task afirme. Un documento describe el día en que se escribió.

## Lo que NO se verificó

- Ejecución real de los flujos: se verificó configuración (env vars, schedulers), no se ejercitó
  ningún flujo — un flag ON no prueba que su consumer corra sin error.
- Estado de aplicación de las migraciones de `TASK-1762` contra Cloud SQL (requiere `pnpm pg:connect:status`).
- `email_type_config.enabled` de `hiring_decision_not_selected` (fila en PG, no env var).
- `click_tracking` en la API de Resend (estado en un tercero).
- El repo hermano `efeonce-mcp`: la conclusión de «no hay tool MCP de escritura» se apoya en el
  contrato de scopes de Greenhouse, no en su propio repositorio.
- Alertas fuera del repo (Sentry alert rules, Cloud Monitoring) que pudieran cubrir `TASK-1752`.
