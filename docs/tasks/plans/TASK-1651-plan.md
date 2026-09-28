# Plan de ejecución — TASK-1651 / delta TASK-1935

> Estado: pendiente de checkpoint humano
> Fecha: 2026-09-28
> Objetivo confirmado: cerrar las cinco brechas del research DataForSEO y habilitar de forma verificada el
> `CHECK` de `ai_optimization`, sin ampliar las otras familias del proveedor ni construir TASK-1651-B.

## Discovery summary

- `pnpm dataforseo research` ya compone Labs, Overview, SERP y competidores, pero su CSV sólo normaliza
  keywords y métricas básicas; SERP, PAA, AI Overview, URLs y evidencia permanecen en JSON crudo.
- Los finalistas se ordenan principalmente por volumen y no existe una aprobación explícita de intención,
  categoría, prioridad de negocio o cobertura propia antes de comprar SERP.
- El flujo es secuencial y no persiste checkpoints, caché, páginas ni tokens de continuación. Un fallo tardío
  puede recomprar pasos ya completados.
- El entitlement y el ceiling se verifican una vez contra una estimación agregada. No existe un freno progresivo
  antes de cada request. SERP live es el único modo compuesto.
- Los presets de AI Optimization y Scraper se pueden ejecutar, pero no existe un panel compuesto y reproducible
  que separe API de superficie de consumidor ni normalice citas, fan-out, entidades y resultados por plataforma.
- El ADR vigente de la CLI enumera estas mismas limitaciones; se ampliará esa decisión en lugar de crear otra.
- La migración `20260928095506879_task-1651-ai-optimization-family.sql` es aditiva y está versionada, pero el
  estado real sigue sin verificarse. `pnpm pg:doctor` pasó; `pnpm migrate:status` sin proxy falló por
  `ECONNREFUSED 127.0.0.1:15432`. El estado se leerá con el wrapper canónico antes de aplicar nada.
- TASK-1696 ya proporciona el ledger y el gate de presupuesto que este delta debe reutilizar. No se crearán
  tablas, endpoints de producto, readers, MCP tools, cron ni captura recurrente.

## Ownership y división de alcance

- **TASK-1935 delta:** CLI local, artefactos de research, selección de finalistas, checkpoints, paginación,
  costo progresivo, SERP Standard y `ai-research`.
- **TASK-1651-A rollout:** comprobar y, si corresponde, aplicar la migración ya versionada; verificar el
  constraint y un canary mínimo atribuible.
- **Fuera de alcance:** TASK-1651-B, snapshots recurrentes de LLM SoV, schema adicional, workers, scheduler,
  readers, MCP, UI y las 225 rutas `catalog_only` restantes.

## Access and tenancy

- La CLI permanece `server-only` y local; no agrega views, route groups ni acceso de navegador.
- Toda llamada pagada conserva `organizationId` explícito, `consumer: seo|aeo`, entitlement y ledger canónicos.
- Nunca se infiere ni se fabrica una organización. El canary AI sólo puede usar una organización real y
  autorizada, con techo explícito y readback del gasto.
- Secretos, payloads sensibles y cuerpos HTTP crudos no se imprimen ni se escriben en artefactos.

## Architecture decision

- Se actualizará `GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`; no hace falta una ADR nueva porque no
  cambia la fuente de verdad, el allowlist, el modelo de acceso ni la topología.
- `requestDataForSeo` seguirá siendo el único transporte. POST conserva un único intento; polling GET nunca
  resubmite una task.
- Los módulos nuevos serán primitives server-only bajo `src/lib/ai/**`; `scripts/dataforseo/cli.ts` sólo
  orquestará comandos, entrada/salida y exit codes.
- La compatibilidad se preservará: `catalog`, `quick`, `run` y `task wait` no cambian; `research` añade columnas,
  flags y estados sin invalidar los campos JSON existentes.

## Backend contract

### Artefacto SEO/SERP estructurado

- Extender cada fila con intención declarada/inferida, categoría, prioridad de negocio, cobertura propia,
  URLs propias y competidoras, posiciones, SERP features, preguntas PAA, presencia/citas de AI Overview y
  evidencia con endpoint, task ID, fecha, mercado y procedencia.
- Mantener las respuestas crudas en JSON y convertir `--csv` en una matriz completa y auditable. Las celdas
  multivalor usarán JSON compacto determinista para no perder estructura.
- Ausencia de datos, paso no ejecutado y error serán estados distintos; nunca se convertirán en cero o `false`.

### Selección y checkpoint de finalistas

- La priorización usará una tupla visible y determinista: aprobación explícita, ajuste de intención, categoría,
  prioridad de negocio, brecha de cobertura y luego demanda. El volumen dejará de ser el primer criterio.
- Antes de SERP, el comando emitirá candidatos y se detendrá salvo que reciba un archivo de finalistas aprobado
  o el operador use un flag explícito para aceptar el ranking automático. `--yes` seguirá confirmando gasto,
  pero no sustituirá la aprobación editorial.
- El archivo aprobado contendrá keywords e inputs de intención/categoría/prioridad/cobertura, y su digest quedará
  en el checkpoint y en el artefacto final.

### Checkpoint, cache, resume y paginación

- Cada corrida tendrá `runId`, versión de formato y fingerprint de plan, mercado, target, organización y opciones.
- El checkpoint se escribirá atómicamente después de cada request aceptado y de cada página. Guardará task IDs,
  respuesta normalizada, costo observado, cursor (`offset_token` o `search_after_token`), offset y estado.
- `--resume` sólo reutilizará datos cuyo fingerprint coincida. Una política explícita de frescura gobernará la
  reutilización de métricas; nunca se asumirá que un dato viejo sigue vigente.
- La paginación tendrá `page-size` y `max-pages` acotados. Si existe token del proveedor, el request siguiente
  enviará sólo los campos compatibles con ese token; si no, usará offset. Los límites entrarán en la estimación.
- Una task SERP Standard se persistirá inmediatamente después de `task_post`, antes de iniciar polling, para no
  recomprarla tras una caída.

### Costo progresivo y modos SERP

- Antes de cada request pagado se recalculará el costo máximo del siguiente paso, el acumulado observado y el
  saldo del ceiling. El entitlement se volverá a comprobar con el monto incremental.
- Si el siguiente paso excede el ceiling o el entitlement cambia, la corrida se detendrá de forma reanudable
  antes del request y escribirá una razón canónica en el checkpoint.
- `--serp-mode standard|live` tendrá `standard` como default. Standard usará `task_post` y
  `task_get/advanced`; live requerirá selección explícita.
- AI Overview será opt-in y sólo se ejecutará en un modo/ruta cuyo contrato oficial la soporte; el preview
  mostrará por separado su costo máximo.

### Comando `ai-research`

- Aceptará un panel versionado que fije queries, mercado, idioma, plataformas/modelos, superficies y límites.
- Separará lanes de API (`ai_optimization/llm_responses` y datos AI) y consumer surface (Scraper/ChatGPT/Gemini
  cuando corresponda). Nunca mezclará cobertura de API con observación de interfaz.
- Normalizará por query, plataforma, modelo, superficie, fecha y mercado: respuesta, citas, dominios/URLs,
  `fan_out_queries`, entidades/marcas, posición/mención, task ID, costo y procedencia; conservará raw JSON.
- Tendrá el mismo preview, aprobación, checkpoint, resume y freno progresivo que `research`.
- Seguirá siendo herramienta local reproducible; no materializa el data product recurrente de TASK-1651-B.

## Skills and canon

- `dataforseo-operator`: endpoints, pricing, task lifecycle, allowlist y contrato Greenhouse.
- `seo-aeo`: criterio de research, intención, evidencia y separación por plataforma/superficie.
- `software-architect-2026`: boundaries y actualización del ADR existente.
- `greenhouse-task-planner`: plan, checkpoint y evidencia de cierre.
- `greenhouse-secret-hygiene`: credenciales, logs y canary sin exposición.
- `greenhouse-production-release`: sólo para verificar compatibilidad y runtime; no autoriza push/deploy.
- Antes del cierre se cargará `greenhouse-qa-release-auditor` para los gates proporcionales.

## Subagent strategy

Ejecución secuencial. No se usarán subagentes: el checkout es compartido, los archivos centrales se solapan y
esta fase no tiene autorización explícita para delegación paralela.

## Execution order

1. Añadir deltas y acceptance criteria binarios a TASK-1935 y TASK-1651 sin reabrir TASK-1651-B.
2. Definir tipos y tests de la matriz, selección, checkpoint, frescura, paginación y presupuesto progresivo.
3. Implementar los primitives y luego conectarlos a `research` con Standard por defecto.
4. Implementar `ai-research` y sus fixtures/tests sin ejecutar POST pagados.
5. Actualizar ADR, manual y skills espejo con comandos, estados, recuperación y ejemplos seguros.
6. Ejecutar tests focales, lint, typecheck, mirrors, catálogo y task lint; corregir sólo archivos propios.
7. Ejecutar `pnpm pg:connect:status`, revisar la lista completa de migraciones pendientes y detenerse si aparece
   cualquier migración ajena o incompatible.
8. Si el único delta pendiente y compatible es el CHECK de TASK-1651-A, aplicar con
   `pnpm pg:connect:migrate` y leer el constraint real para confirmar `ai_optimization`.
9. Ejecutar preview y GET gratuitos. Sólo después, hacer un canary pagado mínimo con organización real,
   entitlement vigente y ceiling explícito; verificar `consumer=aeo` y readback del ledger. Si no puede
   verificarse alguno, reportar el rollout parcial sin presentar los POST como operativos.
10. Actualizar estado real/evidencia en las tasks y documentación aplicable; hacer commits con paths explícitos,
    excluyendo todo WIP ajeno. No push ni deploy salvo instrucción posterior.

## Files

### Crear

- `src/lib/ai/dataforseo-research-checkpoint.ts`
- `src/lib/ai/dataforseo-ai-research.ts`
- `src/lib/ai/__tests__/dataforseo-research-checkpoint.test.ts`
- `src/lib/ai/__tests__/dataforseo-ai-research.test.ts`

### Modificar

- `scripts/dataforseo/cli.ts`
- `src/lib/ai/dataforseo-keyword-research.ts`
- `src/lib/ai/__tests__/dataforseo-keyword-research.test.ts`
- `src/lib/ai/dataforseo-cli-presets.ts` y sus tests sólo si el panel requiere builders reutilizables.
- `docs/architecture/GREENHOUSE_DATAFORSEO_OPERATOR_CLI_DECISION_V1.md`
- `docs/manual-de-uso/growth/dataforseo-cli.md`
- `.claude/skills/dataforseo-operator/SKILL.md` y su espejo `.codex/**`
- `.claude/skills/seo-aeo/SKILL.md` y su espejo `.codex/**`, sólo si cambia el uso operativo documentado.
- `docs/tasks/complete/TASK-1935-dataforseo-daily-operator-cli.md`
- `docs/tasks/in-progress/TASK-1651-growth-seo-dataforseo-ai-optimization-llm-sov-foundation.md`
- Handoff/changelog únicamente mediante hunks propios si el cierre lo exige; ya contienen WIP ajeno.

### No modificar

- `data/dataforseo/endpoints.v3.json` y el allowlist: no se agregan familias ni rutas.
- La migración ya versionada, salvo que el status/readback revele un defecto comprobable.
- `package.json`, `pnpm-lock.yaml`, schema de TASK-1651-B, UI, MCP y ops-worker.

## Verification

- Vitest focal para research, checkpoints, AI panel, CLI y transporte.
- `pnpm exec eslint scripts/dataforseo src/lib/ai`
- `pnpm typecheck`
- `pnpm dataforseo:catalog:check`
- `pnpm skills:mirrors`
- `pnpm task:lint --task TASK-1935`
- `pnpm task:lint --task TASK-1651`
- `pnpm qa:gates --changed`
- Preview/reanudación con fixtures sin red y una task Standard simulada antes de cualquier compra.
- Readback DB del constraint y, si el canary se puede ejecutar, del ledger atribuible.

## Risks and mitigations

- **Duplicar gasto tras timeout:** persistir task ID inmediatamente; POST sin retry; resume por fingerprint.
- **Costo del proveedor no predecible:** estimación conservadora por siguiente request y detención previa; el
  ceiling no se describirá como límite transaccional del proveedor.
- **Datos stale en cache:** TTL explícito y provenance visible; un dato vencido se vuelve candidato a refresh.
- **Ranking editorial opaco:** tupla y razones por fila; aprobación humana separada de `--yes`.
- **Standard queda pending:** polling acotado y checkpoint reanudable; nunca resubmit automático.
- **Migraciones concurrentes:** status completo y revisión antes de `migrate`; no aplicar lotes desconocidos.
- **DB compartida con producción:** el CHECK sólo se aplica si es backward-compatible con `origin/main`; se hace
  readback directo y no se confunde con deploy de código.
- **WIP compartido:** staging y commits por paths explícitos; no tocar ni normalizar cambios de otras sesiones.

## Open questions resolved by default

- La matriz completa reemplaza el CSV básico como superset compatible; el JSON crudo se conserva.
- Standard es el modo SERP por defecto; live y AI Overview son opt-in.
- La aprobación editorial usa archivo de finalistas; un flag explícito permite aceptar el ranking automático.
- El panel AI es local y versionado, no el pipeline recurrente de TASK-1651-B.
- No se habilitan Trends, Content Analysis, Business Data ni ninguna otra familia.

## Human checkpoint

Tras aprobar este plan comienza la implementación. Antes de la aprobación no se cambia código, no se levanta el
proxy con intención de migrar y no se ejecuta ningún request pagado.
