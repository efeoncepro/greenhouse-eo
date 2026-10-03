# Verificación local — TASK-1938

Estado al 2026-10-03. No autoriza ni acredita publicación.

| Comprobación | Resultado y evidencia |
|---|---|
| Exportación real | 10 casos PASS: seis variantes normales, null, cero, cien y largo. A4, contenido, fuentes, enlaces, folios y hash de modelo. `manifest.json`; 9 casos de matriz + óptimo focal. |
| Regresión focal | 13 suites PASS / 108 tests PASS; 10 exports opt-in no se ejecutan en modo unitario ordinario. `focal-tests.log`. |
| Tipos | `NODE_OPTIONS=--max-old-space-size=12288 pnpm exec tsc --noEmit --incremental false`: exit 0. |
| Lint focal | ESLint sobre renderer, proyección, copy, recursos y tests: exit 0. |
| Build | `pnpm build`: exit 0; dist `.next-local/build-20261003195800-7390`. Compilación, TypeScript y generación final completadas. |
| Bundle | `vercel:function-size-gate --dist … --json`: exit 0, cero warnings/failures. Descarga PDF: 636 archivos / 33.742.036 bytes. Los 47 PNG y seis TTF nuevos están en el NFT; cero faltantes. `build-trace.json`. |
| Reachability | PASS con mapa literal de assets y fuentes; se retiró la excepción obsoleta del renderer anterior, sin añadir otra. |
| Task / wireframe | `task:lint --task TASK-1938`, `ui:wireframe-check --task TASK-1938`: 0 errores, 0 warnings. |
| Ops | `ops:lint --changed`: exit 0; warnings de otras tasks/epics del checkout compartido. |
| QA visual | Revisor independiente `final_pdf_review`: sin hallazgos materiales; advisory de sobrepaso óptico 1,05 pt dentro de hoja. |
| Suite completa | **1.982 suites PASS / 18.148 tests PASS**, 67 suites y 286 tests skipped; 1 suite / 1 test FAIL de Manzanitas, con inputs intactos. `pnpm exec vitest run --maxWorkers=2`, 508,74 s. No se presenta como suite global verde. `full-tests-summary.txt`. |
| Local check final | `pnpm local:check`: exit 0. Preflight, skill mirrors, manifests, reachability y TypeScript PASS; ESLint sin errores, 26 warnings fuera del alcance del refresh. |
| Cierre documental | `pnpm docs:closure-check`: exit 0. |
| Staging / producción | Pendiente de rollout autorizado. Sin emails, publicaciones, commit ni push. |

## Corrección posterior por anotaciones del operador

Diez PDFs reexportados tras retirar identificadores técnicos de las etiquetas de metodología y centrar el chip de período. Cuatro suites / 49 tests PASS (incluidos exports) y ESLint focal y TypeScript PASS. Evidencia: `annotation-fixes-tests.log`. El pie conserva el diseño aprobado sin lockup Insights. El build y la suite global arriba son evidencia del corte previo, no una repetición posterior a estas dos correcciones.

## Fallo de catálogo externo al refresh — resuelto

El fallo original era exclusivamente metadata: el JSON registraba `axis-brand-assets 0.4.10` frente al paquete instalado `0.4.15`. El 03/10, con autorización explícita del operador, `pnpm manzanitas:tokens` regeneró el catálogo y sólo cambió esa línea. `pnpm manzanitas:tokens --check` PASS (49 archivos) y `manzanitas-tokens-sync.test.ts` PASS (7 tests). CSS, SVG, compiler y dependencias sin cambios. La suite general de la tabla conserva su resultado histórico; no se repitió por esta corrección.

La primera corrida general sin límite de workers se interrumpió tras timeouts por competencia con build. No se usa como resultado final: la segunda limita la concurrencia a dos workers.

## Revisión de alcance

Sin diff en `ReportArtifactModel`, scoring, contratos del reporte ni plantillas de email. Registro de fuentes aditivo; alias compartidos preservados y probados. Consumers sólo reciben contexto de presentación después de sus gates. Los valores se conservan y se formatean; no hay nueva evaluación ni cambio de destinatarios, consentimiento o idempotencia.

Revisión independiente de las correcciones (03/10, exports 17:13): chip centrado y sin cortes en ES/EN/PT-BR; metodología sin identificadores técnicos; diez PDFs sin texto ni enlaces fuera de hoja. Pie aprobado conservado.

## Validación antes del commit (03/10)

`pnpm build` final PASS (exit 0), incluyendo compilación, TypeScript y generación de páginas sobre las correcciones de anotaciones; dist `.next-local/build-20261003223513-37388`. Este resultado sustituye la limitación anterior de build previo a las correcciones. Lint de los 28 archivos de código preparados, task/wireframe, skill mirrors y `git diff --cached --check` PASS. Suite global no repetida. Commit autorizado por el operador; push y rollout pendientes.
