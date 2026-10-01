# Creative Workbench — continuidad operativa vigente

Corte: 2026-10-01. Fuente activa: [`efeoncepro/creative-workbench`](https://github.com/efeoncepro/creative-workbench),
main `c3e85b6cb1927fdeb13fea9aeddbdfbefc857852` (PR 16). Este documento separa capacidades
integradas, pruebas fechadas y trabajo pendiente; verificar el runtime al ejecutar, porque un merge no acredita
por sí solo flags, presupuesto, permisos o un despliegue del broker.

## Cambios integrados y sus fuentes

| Unidad | Evidencia integrada | Dueño canónico |
|---|---|---|
| Corrección frente a Figma | [PR 14](https://github.com/efeoncepro/creative-workbench/pull/14), `be57032`; revisión técnica de 126 pares independientes | Workbench `docs/architecture/workbench-sky-reference-comparison.md` |
| Producción por componentes autónomos y tokens | [PR 15](https://github.com/efeoncepro/creative-workbench/pull/15), main `2392758`, merge 2026-10-01 08:10:24Z | Workbench `docs/architecture/workbench-sky-autonomous-components.md`, `docs/documentation/autonomous-components.md`, `docs/manual/autonomous-components.md` |
| Identidad Git persistente | PR 15: comprobación de persona GitHub activa, autor/committer efectivos y hooks por repo | Workbench `docs/architecture/workbench-git-identity.md`, `docs/manual/git-identity.md` |
| Lab premium | [PR 16](https://github.com/efeoncepro/creative-workbench/pull/16), main `c3e85b6`; bibliotecas de composiciones, adaptaciones, recetas y zonas, subpáginas de tokens/tipografía/recursos | Workbench `docs/manual/workbench-lab.md`, `docs/ui/reviews/workbench-main-integration-2026-10-01.md` |
| Skills, ADR y tasks Greenhouse | [PR 246](https://github.com/efeoncepro/greenhouse-eo/pull/246), develop `d4dad02`, merge 2026-10-01 08:10:52Z | Skill espejo `.codex/.claude/skills/efeonce-creative-workbench/` |

Greenhouse conserva gobernanza y enseñanza; la implementación activa se mantiene en Workbench.
No restaurar los mirrors retirados del template ni ejecutar un sync total heredado para incorporar estos cambios.
Los gates, workflows y rutas selladas conservan su ownership. El histórico bootstrap de `sky-brand-system`
no es la fuente de producción actual.

## Qué pueden producir hoy los agentes

El flujo por CLI permite seleccionar una receta y sus adaptaciones, inspeccionar slots/zonas, declarar copy,
legal y fotografía admitida, preparar una corrida o lote nuevo, componer y revisar sus PNG/SVG/QA.
`marca:recetas`, `marca:adaptaciones`, `marca:zonas`, `marca:disenar` y `marca:lote` son entradas de Workbench;
consultar su manual para argumentos y versiones exactos. El Lab sirve referencia e inspección; no sustituye
el contrato productivo ni la aprobación humana de la campaña.

Cada adaptación conserva composición propia, dimensiones nativas y recibos de procedencia.
La biblioteca contiene 126 escenas, 11.096 capas, 1.196 campos, 24 máscaras y 445 capas ocultas.
Los comandos `marca:componentes`, `marca:descomponer`, `marca:extraer` y `marca:recomponer`
operan sobre un grafo admitido y verificable. La descomposición representa la escena previa a copy/foto;
una exportación editable no admite geometría arbitraria al reimportar: debe igualar una compilación fresca.
Clips, orden de capas, máscaras y efectos se conservan; componentes dependientes requieren contexto.

La tokenización exacta de propiedades distingue valores derivados de bindings Figma demostrados.
Hay 4.996 fills/strokes originales vinculados a 20 IDs propios (4.684 tras reparaciones), sin inferencias
por hex, y 193.920 recibos de propiedades. No atribuir bindings de tipografía, spacing o radios no demostrados.
Los 108 tokens originales, pack 0.1.0 y catálogo 2.0.0 conservan sus sellos. Vectores y fotografía
mantienen tipos distintos; no reconstruir el logo ni los iconos mediante IA.

Una marca por corrida; equipo autorizado para todas las marcas no permite mezclar SKY, Berel y Efeonce.
UI del host Efeonce y contenido de SKY usan sistemas separados. Metric gobierna las composiciones SKY,
Inter es auxiliar; el host del Lab usa recursos Efeonce. Nuevos contenidos comerciales y legales exigen
aprobación explícita: las fuentes Figma conservan información histórica.

## Evidencia fechada y límites

- Comparación independiente `comparison-final-02`: 126 controles Figma y 126 renders revisados por dos
  revisores, cero defectos detectados pendientes en el ledger técnico. No demuestra identidad absoluta
  de píxeles ni aprobación comercial.
- Regresión modular sellada: 126 PNG **y** SVG byte-idénticos a ese baseline. Auditoría SHA
  `2dd4e9b5426b836e8b5366c40333ad187f91fa94714dc36aa3ad79c4f371db84`; regresión SHA
  `cf2189de49bded4f0604b327b75807694c01d3c4344e5939d08b3b1e24d725e3`.
  La revisión anterior sólo se transfiere por identidad exacta de ambos formatos y controles.
- Corrida nueva con copy interno explícito `6f287c46-574a-49a3-9351-51fc259f9f1e`: completed, PNG
  inspeccionado, cero invocaciones de proveedores. Fuente y evaluación en
  Workbench `projects/sky/modular-runtime-proof/evaluation.md`; sin autorización comercial.
- Suite final de PR 15: 348 harness + 7 SKY + 11 Lab = 366 PASS/0 SKIP en privado;
  pública 325 PASS/30 SKIP licenciados exactos. No usar ese conteo como conteo del Lab posterior.
- Integración local del Lab PR 16: 17 pruebas Lab, Astro/TypeScript sin diagnósticos,
  cuatro gates; build digest `335e56a10c11833951de2055135c072c58ad9e89795303f436b47a78a8c97985`,
  309 archivos, cinco fonts host OFL, cero fonts Metric distribuidas. Esto es evidencia local fechada,
  independiente del readback remoto de CI/Vercel.
- Pruebas de identidad Git: 19 casos + tres de hooks y negativos reales de autor/committer del Mac.
  La configuración personal no se copia al equipo: cada miembro configura su cuenta GitHub verificada.
  Estos hooks son guardarraíles locales; no son AUTH del broker ni una frontera inviolable.

Pruebas y artefactos privados están fuera de Git. Un cambio de renderer, receta, recurso o contenido
requiere preparación/UUID nuevo y QA; no sobrescribir corridas antiguas ni declarar que sus previews
se regeneraron por un merge. La foto nueva se probó mediante fixture; no hubo nueva generación pagada
ni canary monetario en la unidad modular.

## Readback remoto — 2026-10-01

[Auditoría de reconciliación](../../audits/creative-workbench/2026-10-01-documentation-reconciliation.md) conserva las consultas y verificaciones de este corte.

PR 16 quedó merged a las 10:02:29Z. Sobre `c3e85b6`, GitHub Actions:
[gates 36846606818](https://github.com/efeoncepro/creative-workbench/actions/runs/36846606818) SUCCESS y
[native-harness 36846606907](https://github.com/efeoncepro/creative-workbench/actions/runs/36846606907) SUCCESS:
320 harness PASS/28 SKIP, cinco SKY PASS/dos SKIP y 17 Lab PASS. Deployment GitHub Production
`6781523756` success a las 10:02:44Z, target
[deployment Vercel](https://creative-workbench-2rlnmj87l-efeonce-7670142f.vercel.app).
El alias `creative-workbench-sky.vercel.app` respondió HTTP 302 hacia Vercel SSO, por lo que su protección
sigue siendo una condición de acceso; no afirmar acceso público a partir de ese deployment.
`creative.efeonce.org` no resolvió en el readback de este corte; queda pendiente, sin inferir la causa.

GitHub Packages verificado por API: `sky-tokens` (version ID 1313424154), `sky-brand-assets`
(1313424278) y `sky-creative-contracts` (1313424409) sólo tienen **0.1.0**, publicada 2026-09-29
23:36UTC. `sky-creative-contracts` **0.2.0 no está publicada**; distinguirla de los paquetes 0.1 ya disponibles.

## Pendientes con ownership

| Pendiente | Owner y próximo paso | Estado real |
|---|---|---|
| Distribución de contratos autónomos | TASK-1946: publicar versión candidata 0.2.0 y verificar instalación limpia/consumo privado | 0.2.0 preparado localmente; no acreditar publicación desde `package.json` |
| Tipografía y recursos licenciados del equipo | TASK-1946: admisión/licencia y provisionamiento privado por integrante | Binarios Metric fuera de npm/Git; derechos de distribución remota no acreditados |
| Onboarding completo y segunda marca | TASK-1945: doctor/aislamiento y producción real de cada integrante; admitir Berel u otra marca por su contrato | SKY es primer caso; no inferir readiness de las otras marcas desde el catálogo |
| IA operativa y presupuesto | TASK-1947: revalidar revisión/flags efectivos, cotizaciones, reserva, rechazo a cupo agotado y canary monetario autorizado | Topes autorizados USD 50/persona y USD 500/organización/mes; aumentables por decisión del operador; código/fixtures no prueban gasto habilitado |
| Identidad definitiva | TASK-1952 con TASK-1834: consumer first-party de Efeonce ID, cohort, revocación y readback | `to-do`, diferido; no construir AUTH paralelo ni vincular por email |
| Campaña nueva y entrega cliente | Responsable/aprobador de la pieza: imagen/copy/legal/derechos vigentes y QA de cada adaptación | Pruebas internas y revisión técnica no autorizan publicación |

El dominio elegido es `creative.efeonce.org`. Verificar alias y deployment actual antes de comunicarlo
como disponibilidad pública; la UI premium, GitHub Packages, Cloud Run y el custom domain son superficies
con verificaciones independientes. Esta consolidación documental no cambia cloud, permisos, secretos,
paquetes, autenticación ni el estado de IA.

## Antecedentes documentales conservados

## 2026-09-30 — Skill viva de Creative Workbench para Codex y Claude

- `efeonce-creative-workbench`: biblioteca documental espejo con arquitectura, flujo SKY, fotografía, componentes, distribución, aprendizajes y corte de continuidad. Validador propio de paridad/links y registro en router; no modifica motores locales ni da por terminado el harness.


### Handoff inicial trasladado del root

## 2026-09-29 — Creative Workbench multimarcas

TASK-1945/1946 verificados localmente; rollout pendiente. Evidencia: `docs/operations/creative-production/sky-airline/PACKAGE_CANDIDATE_EVIDENCE.md`.
