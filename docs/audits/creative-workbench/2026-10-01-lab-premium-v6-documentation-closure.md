# Creative Workbench — cierre documental del Lab premium v6

Corte: 2026-10-01. Alcance: documentación y skills Greenhouse para la modernización integral
PR16/v5 y la corrección PR17/v6, con reconciliación de fuentes y readback puntual. Implementación
activa: repo privado `efeoncepro/creative-workbench`; este cierre no modifica su renderer, broker,
paquetes, admisiones, permisos, gasto, corridas o recursos licenciados.

## Fuentes contrastadas

- Workbench `docs/architecture/workbench-lab-navigation.md` y `workbench-lab-efeonce-host.md`:
  cinco rutas, separación host/cliente, receta/variante, proyección sellada y admisión de fuentes.
- `docs/ui/visual-directions/workbench-surface-economy-v5.md`,
  `workbench-filter-selects-v6.md`, `docs/ui/motion/workbench-premium-v2.md` y
  `docs/ui/reviews/workbench-filter-selects-v6-qa.md`: criterio vigente de superficies, coreografía,
  controles y QA. Historial v2/v3/v4 conservado, sin tomar sus envoltorios como canon actual.
- Código `FilterSelect.astro`, `scripts/filter-select.ts`, `styles/filter-select.css`,
  `scripts/motion.ts` y `lib/motion-model.ts`: native select como dueño de valor/eventos,
  combobox/listbox con fallback Popover y motion sólo en relato/hero.
- Dossier privado de publicación:
  `/Users/jreye/Documents/creative/creative-workbench-canon/operations/2026-10-01-workbench-filter-selects-v6/`.
  Sólo metadata permitida, SHA, resultados y capturas; ningún secreto se copia a estos documentos.

## Estado publicado y comprobación

| Plano | Evidencia del corte |
| --- | --- |
| Merge | [PR17](https://github.com/efeoncepro/creative-workbench/pull/17) MERGED, main `7e4c6177992785c02430dd238c267991e097c4c9`, 2026-10-01 11:05:43 UTC; tree del head revisado `2b0bf8b` idéntico. PR/main/checks revalidados durante este cierre. |
| CI postmerge | [gates 36853208420](https://github.com/efeoncepro/creative-workbench/actions/runs/36853208420) y [native-harness/Lab 36853208477](https://github.com/efeoncepro/creative-workbench/actions/runs/36853208477), completed/success. |
| Build revisado | `0b815c5e7ee07a56a24d24d1e4962ad378a235726325138105098daa250118e2`, 310 archivos, cinco WOFF2 host OFL, cero binarios privados; 298 archivos no HTML/CSS/JS idénticos al build v5. |
| Proyecto/deployment SKY | `prj_7D9AODtfOOEf1su21wqyQASOdzOc` / `dpl_139Fyz3vV85jfHBHXw7CNuMqAE2d`, READY/production; metadata source/build exactos. |
| Alias | [creative-workbench-sky.vercel.app](https://creative-workbench-sky.vercel.app/), promoción y asignación explícita verificadas. Un status Vercel genérico de GitHub no prueba este snapshot. |
| Readback de publicación | Dossier `snapshot-readback.json`: 29 archivos críticos SHA exactos. `production-readback.json`: seis respuestas autenticadas idénticas deployment/alias; cuatro anónimas 302 y protección `all`. |
| Readback nuevo de conciliación | Tres archivos autenticados del alias (raíz, `/tokens/`, `/_astro/FilterSelect.DsDf_dOY.css`) descargados con exit 0 y SHA exacto respecto al dossier. Se guardó `greenhouse-docs-live-readback.json` en el dossier privado. No se presenta esta pasada como nueva verificación de los otros 26 archivos. |
| Navegador de publicación | `browser-production.json`, `families-vercel-desktop.png` y `tokens-vercel-desktop.png`: paneles abiertos en Vercel, Always On siete resultados, reset 126, cuatro opciones de tokens y consola limpia. Recorridos no repetidos por la unidad documental. |
| QA local v6 | TypeScript estricto, Astro 47 archivos/cero diagnósticos, 17 tests Lab, cuatro gates y 16 recorridos interactivos desktop/móvil/teclado/reduced/no-JS. |

La revisión de la publicación y los tests son evidencia fechada. No se infiere nueva revisión de
las 126 escenas, aprobación comercial SKY, aceptación visual formal del cliente o acceso público.
El dominio `creative.efeonce.org` sigue previsto, sin readback DNS/TLS/alias nuevo en este cierre.

## Cobertura documental

- Estado operativo: [WORKBENCH_CURRENT_STATE](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md)
  pasa de PR16 al corte PR17 y registra la publicación del snapshot SKY separado del CI genérico.
- Funcional: [Lab premium](../../documentation/creative/creative-workbench-lab.md) reúne bibliotecas,
  recetas/inspector, tokens/tipo/recursos, economía de superficies, identity host/cliente, motion y
  accesibilidad. El funcional [plataforma](../../documentation/plataforma/creative-workbench.md) enruta a él.
- Manual: [usar el Lab](../../manual-de-uso/creative/usar-creative-workbench-lab.md) explica URL publicada,
  navegación, menús abiertos, teclado/reset, móvil/fallback y verificación de otro snapshot.
  [Operación de plataforma](../../manual-de-uso/plataforma/operar-creative-workbench.md) añade ese router;
  [preflight de marca](../../manual-de-uso/creative/creative-workbench-brand-preflight.md) mantiene
  corridas/UUID/pruebas históricos y actualiza sólo su advertencia de continuidad.
- Skills Codex/Claude: la skill `efeonce-creative-workbench` conserva el aprendizaje y los punteros
  propios del Lab; ambos runtimes deben quedar byte-equivalentes. Validación final del bundle,
  links y routers se registra en el cierre de esta unidad.
- Arquitectura, índices y roots se sincronizan mediante sus dueños durante este cierre; las tasks
  conservan sus estados independientes;
  no se agrega un ADR nuevo para documentar componentes locales existentes. Los ADR Workbench y
  multimarcas conservan la frontera de runtime/gobernanza; decisión UI detallada pertenece a Workbench.

## Sin actualización funcional adicional

Los manuales de Glitch, línea gráfica Efeonce, publicidad, fotografía, decks y AXIS no cambian sus
contratos por modernizar un consumer Lab. El host usa sus recursos admitidos; el Lab no cambia los
valores/paquetes source ni autoriza una aplicación de marca nueva. La producción autónoma y sus
CLIs, Packages 0.2, licencias Metric, onboarding/segunda marca, IA/presupuesto y Efeonce ID mantienen
sus estados/owners anteriores. Ninguna task de esos carriles se cierra por publicación visual.

La [auditoría PR16 anterior](2026-10-01-documentation-reconciliation.md) permanece como corte histórico,
sin borrar sus consultas, cifras o pruebas. Sus referencias a deployment/status y alias corresponden
a ese corte; el estado operativo actual dirige a esta auditoría v6.

## Límites de esta unidad

Sólo documentación y skills Greenhouse. Validadores de cierre, paridad/links, contexto y whitespace
se ejecutan después de la última edición y antes del commit. Este documento no acredita push,
merge o despliegue nuevo de Greenhouse: esas acciones requieren sus propios readbacks. Los JSON
privados y capturas quedan fuera de Git; los hashes e identificadores permiten reconciliar el corte.


# QA Release Audit — cierre documental Workbench en Greenhouse

## Verdict

PASS

Closure state: complete — unidad documental; no cierra los carriles de rollout pendientes.

## Scope

- 22 archivos propios: skill/referencias espejo, funcional/manual/auditoría, estado e índices/roots.
- Runtime cotejado: PR17/main/checks GitHub y tres SHA del alias SKY protegido.
- Fuera de alcance: WIP comercial, otras skills, kit de avatares, tipos DB y sus cambios de contexto.
  En los roots compartidos se incluyen sólo los fragmentos propios en el índice del commit.

## Risk Classification

| Risk | Level | Why |
| --- | --- | --- |
| Documentación y enseñanza del consumer | Low-Medium | Puede inducir operación incorrecta si confunde historia, fuente activa, host/cliente o publicación. No cambia el runtime. |

## Injected Skills

- Codex `efeonce-creative-workbench`: dueño de referencias del harness y de aislamiento de marcas.
- Codex `greenhouse-documentation-governor`: ownership, espejos, continuidad e índices.
- Codex `greenhouse-qa-release-auditor`: proporcionalidad y falsos cierres.
- Subagentes: dos unidades con ownership independiente y una auditoría de sólo lectura.

## Evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Validador específico Workbench | PASS | 17 archivos byte-idénticos Codex/Claude; 216 enlaces internos y router válidos. |
| `pnpm skills:mirrors` | PASS | Allowlist general sin drift; no sustituye el validador específico anterior. |
| `pnpm qa:gates --staged --agent codex` | Revisado | Sólo dominio docs/task/local skill; ownership resuelto mediante governor. |
| `node scripts/check-documentation-closure.mjs --staged --strict` | PASS | 22 archivos, cero warnings; se usa la entrada directa para aplicar staged al checker dueño. |
| `pnpm docs:closure-check` | PASS | Checker compuesto, ledger estático sin faltantes, índice Creative Studio e inventarios/frescura; no prueba flags live. |
| `pnpm ops:lint --changed` | PASS con avisos ajenos | Cero errores; 14 avisos de child-parity en epics existentes, sin cambios de lifecycle en esta unidad. |
| Enlaces documentales propios y `git diff --cached --check` | PASS | Punteros funcional/manual/estado resuelven; sin whitespace errors. |
| `pnpm docs:context-check:strict` | PASS | Cero errores/warnings tras reducir el puntero root; ejecutar después de la última edición. |

## Blockers

Ninguno para este cierre documental.

## Conditional Follow-Ups

Paquetes, licencias, onboarding, IA, Efeonce ID y dominio institucional conservan los owners y
pasos de la matriz de continuidad; no son dependencias nuevas de este commit documental.

## False-Closure Traps Checked

- CI genérico, snapshot SKY, alias y readback se distinguen; localhost no acredita Vercel.
- Capturas/interacciones de publicación se citan como evidencia fechada, sin afirmar nueva QA visual.
- Este cierre no aplica flags, redeploys, backfills, permisos ni aprobación comercial.
- Tasks conservan sus estados; historia PR16 y WIP ajeno no se convierten en fuente vigente.
- Sentry/observabilidad de Greenhouse no aplica a esta unidad sin cambio de código/runtime.

## Final Call

La enseñanza y documentación reflejan la implementación y publicación verificadas, conservan el
histórico y los pendientes independientes. El commit contiene sólo sus rutas/hunks propios;
push, merge o deploy Greenhouse quedan fuera de la acción de este cierre.
