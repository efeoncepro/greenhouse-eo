# ISSUE-121 — artifact-worker: la bug class del primer deploy (5 hallazgos del smoke real en Cloud Run)

> **Estado:** ✅ Resuelto (2026-07-12, mismo día)
> **Ambiente:** staging (Cloud Run Job `artifact-worker` + dispatcher en `ops-worker`)
> **Detectado:** 2026-07-12, durante el rollout de TASK-1391 (smoke real del pipeline de render)
> **Task relacionada:** `TASK-1391` (complete) · commits `216e146be` · `f76fbf28c` · `e6e191e97` · `2905b39bb` · `da2f72c6c`

## Resumen

El primer smoke real del pipeline de render gobernado (deck SKY → Cloud Run) falló **cinco veces
consecutivas, cada vez una capa más adentro**. Ninguno de los cinco bugs era visible en local —
los cinco eran de la MISMA clase raíz: **"el contenedor/la nube difiere de la máquina del autor,
y nos enteramos en runtime"**. Se resolvieron todos el mismo día, cada uno de raíz y con un guard
permanente. El sexto intento renderizó al primer intento (15 láminas/25,2 s y 25 láminas/32,3 s).

## Los 5 síntomas, causas y cierres

| # | Síntoma | Causa raíz | Cierre (no parche) | Guard permanente |
|---|---|---|---|---|
| 1 | `dispatch_error`: `Permission 'run.jobs.runWithOverrides' denied` | Ejecutar un Cloud Run Job con overrides de env exige un permiso que `roles/run.invoker` NO incluye | **El worker claim-ea su propio trabajo** (`FOR UPDATE SKIP LOCKED`, misma regla de prioridad); el dispatcher hace `jobs.run` simple. Menos privilegio + concurrencia segura por construcción | El claim atómico ES el diseño; suite del dominio |
| 2 | El contenedor moría al arrancar: `ENOENT scripts/lib/server-only-empty.cjs` | El Dockerfile copiaba UN archivo del shim; el shim `require`a a su vecino | `scripts/lib/` completo + **SELFTEST DE IMAGEN en Cloud Build**: catálogo completo + 13 fuentes por sha256 + Chromium + render probe, DENTRO de la imagen recién construida. Falla ⇒ no hay deploy | `--selftest` como paso del build + `deploy-contract.test.ts` |
| 3 | (Preventivo — nos esperaba) Chromium como root en contenedor no arranca sin `--no-sandbox` | El sandbox de Chromium se niega bajo root; el launch canónico no llevaba el flag | Flag agregado al launch canónico **UNIFORME** (nunca condicionado al ambiente — eso sería el no-determinismo que el helper existe para eliminar). Es aislamiento de proceso, no rasterización: **visual gate re-corrido a 0 píxeles** | Assert en `deploy-contract.test.ts` |
| 4 | `missing_asset` falso: 3 imágenes "sin resolver" que SÍ estaban en la imagen (verificado por inspección vía Cloud Build) | **CARRERA en el propio gate de calidad**: juzgaba `naturalWidth` sin esperar la carga. El SSD local la escondía; el streaming de capas de Cloud Run la expuso | El gate **espera determinísticamente** (`img.decode()` por imagen + techo duro 15 s) y RECIÉN juzga. *"Un gate que depende de la velocidad del disco no es un gate: es una moneda"* | El propio gate, ya determinista |
| 5 | `missing_asset` REAL: `file:///Users/jreye/…/logo-negative.svg` | Dos plantillas (`quote-split`, `bullet-list-split`) sobrevivieron a la internalización de assets de TASK-1393 con la ruta absoluta del Mac del autor horneada. En local resolvía siempre | Paths internos del catálogo (bytes idénticos ⇒ 0 píxeles) | **`catalog-portability.test.ts`**: prohíbe `file://`, paths raíz-absolutos, rutas de máquina y `../../` en TODA plantilla de TODO catálogo |

Además, durante la corrida local previa el drift check del manifest cazó otros 2 bugs de la misma
familia (input del manifest no canonicalizado; hash sensible al reorden de claves de JSONB) —
resueltos en `dae981c32` con serialización canónica.

## Aprendizajes durables (los NUNCA/SIEMPRE que deja este incidente)

1. **NUNCA declarar "listo" un deployable nuevo sin ejecutarlo en su runtime real.** Los 5 bugs
   eran invisibles en local por construcción (IAM real, filesystem del contenedor, root, latencia
   de disco, filesystem del autor). El smoke real no es un trámite: es donde vive esta clase.
2. **SIEMPRE que se construya una imagen nueva, la imagen se prueba a sí misma en el pipeline**
   (selftest como paso de build). "Compiló y el Dockerfile se ve bien" no es evidencia.
3. **NUNCA un gate de calidad juzga estado asíncrono sin esperar su settlement de forma
   determinista** (eventos/promesas con techo, jamás un sleep ni un juicio inmediato).
4. **NUNCA un hash de contenido sobre `JSON.stringify` de datos que viajan por JSONB** — PostgreSQL
   reordena claves. Serialización canónica (claves ordenadas, profunda) o el drift check miente.
5. **SIEMPRE preferir rediseñar para necesitar MENOS privilegio antes que escalar IAM** (el claim
   del worker vs `runWithOverrides`): la solución con menos permiso fue además la más robusta.
6. **Un catálogo es DATO portable o no es un catálogo**: toda referencia debe vivir dentro de su
   árbol. Enforcement mecánico, no convención.

## Verificación

- Render staging real post-fixes: `prnd-518535f0…` (15 láminas, 25,2 s, 3,16 MB) y
  `prnd-7ebe35b1…` (25 láminas, 32,3 s, 5,56 MB) — ambos `completed` al primer intento en Cloud Run.
- Gates del repo: suite composer+dominio+worker verde · visual gate 40 frames a 0 px ·
  `deploy-contract.test.ts` 10/10 · selftest ✓✓ local y en Cloud Build.

## Relacionado

- `docs/tasks/complete/TASK-1391-tender-deck-renderer-worker-artifact-pipeline.md` (Delta e)
- `docs/architecture/GREENHOUSE_TENDER_PROPOSAL_STUDIO_ARCHITECTURE_V1.md` §0
- Skill: `greenhouse-public-private-tenders/proposal-studio-runtime.md`
