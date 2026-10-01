# Creative Workbench — conciliación documental

Corte: 2026-10-01. Alcance: documentación y skills después de la comparación Figma, la
componentización autónoma, la corrección persistente de identidad Git y la modernización del Lab.
No introduce cambios de motor, credenciales, autorización, infraestructura ni campañas.

## Fuentes y comprobación independiente

| Fuente | Resultado observado en esta conciliación |
| --- | --- |
| Workbench main | `c3e85b6cb1927fdeb13fea9aeddbdfbefc857852`, PR 16 integrado el 01/10 a las 10:02:29 UTC; incluye PR 15 `2392758` |
| Greenhouse develop remoto | PR 246 integrado, `d4dad02f994c2bc0493b24a2e810c1a1485c7532`; este corte documental no es otra promoción |
| CI del main Workbench | [gates 36846606818](https://github.com/efeoncepro/creative-workbench/actions/runs/36846606818) y [native-harness 36846606907](https://github.com/efeoncepro/creative-workbench/actions/runs/36846606907) exitosos |
| Resumen final CI | Harness 320 PASS / 28 SKIP licenciados; SKY 5 PASS / 2 SKIP; Lab 17 PASS. No se presenta CI público como validación del canon privado |
| Deployment GitHub Production | `6781523756`, success; SHA exacto de main, [deployment](https://creative-workbench-2rlnmj87l-efeonce-7670142f.vercel.app) |
| Alias del Lab | `creative-workbench-sky.vercel.app` responde HTTP 302 hacia SSO de Vercel; no acredita acceso público o acceso de cliente |
| Dominio objetivo | `creative.efeonce.org` no resuelve desde esta máquina durante el corte; DNS/alias y acceso cliente pendientes de verificación, sin atribuir causa al proveedor |
| GitHub Packages | API de versiones devuelve sólo 0.1.0 para `sky-tokens`, `sky-brand-assets` y `sky-creative-contracts`, publicados el 29/09. Contratos 0.2.0 preparados en código, sin publicación |
| Política de gasto en source | Draft: 50 USD por persona/mes, 500 USD organización/mes; ampliaciones explícitas. Su presencia no acredita el rollout del broker |
| Autoridad de App en source | Policy draft con IDs sin admitir y manifiesto con nombre anterior; provisión externa reportada por el operador conservada por separado |

La revisión visual anterior de 126 referencias y los hashes de regresión son evidencia histórica
sellada, conservada en Workbench. Esta auditoría documental no repite la inspección visual ni
concede aprobación comercial. Tampoco consulta secretos, activa IA o realiza un canary pagado.

## Hallazgos documentales corregidos

- Estados “local”, “PR abierto” y “no integrado” usados como estado vigente después de los merges.
- Instrucciones de bootstrap que prescribían sync total o generación directa desde Greenhouse.
- Recetas y cobertura de comparación anteriores a las 126 variantes y al CLI por lotes.
- Falta de la capa funcional para la identidad Git del equipo.
- Skills con navegación antigua del Lab y cifras de CI anteriores, preservadas como cortes históricos.
- TASK-1946 aún ligada al proyecto inicial `sky-brand-system` y a una comparación pendiente.

Los READMEs gestionados de clientes Efeonce/Berel conservan el sello de origen. Sus advertencias
de transición y comandos retirados quedan en README/AGENTS nativos, sin alterar managed hashes
o ejecutar sync heredado. Los routers SKY de Codex/Claude incorporan el uso de fotografías
admitidas en nuevos KV; el ZIP original, los maestros y sus hashes permanecen intactos.

La fuente de operación se mantiene en Workbench; Greenhouse conserva el router, las tasks y las
skills de Codex/Claude. El [estado vigente](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md)
identifica los pendientes y siguientes pasos. La skill
[efeonce-creative-workbench](../../../.codex/skills/efeonce-creative-workbench/SKILL.md)
dirige a los contratos y al flujo de producción. No se cierran tasks de distribución/auth por
haber terminado componentes o documentación.

## Validación del corte

Resultado del corte documental:

- Workbench: 26 Markdown modificados/nuevos, 296 links locales válidos, routers SKY espejo
  idénticos; managed-drift, hygiene, piezas y native-policy pasan. `git diff --check` limpio.
- Greenhouse: bundle Workbench de 17 archivos por runtime byte-idénticos, 206 links internos
  y router válidos. TASK-1945/1946/1947/1952: cero errores y warnings de lint.
- Checker de cierre documental acotado: cero warnings. Contexto estricto compartido: cero
  errores y warnings; cambios Workbench condensados, sin limpiar WIP ajeno.
- Esta unidad modifica documentación y skills; las pruebas de motor/CI del main se conservaron
  como evidencia fechada, sin atribuirles una nueva ejecución privada o aprobación visual.

Los chequeos de cierre/contexto y whitespace se repiten tras esta última edición de auditoría.
Cambios locales sin commit ni push en esta consolidación; no confundirlos con los merges previos.
