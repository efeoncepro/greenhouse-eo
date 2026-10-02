# Corrección SKY — cierre documental local

Corte: 2026-10-01. Pedido: corregir todas las variantes afectadas, actualizar documentación y skills
con subagentes y hacer commit local. Fuente activa: `/private/tmp/cw-sky-production-flow`, rama
`codex/lab-efeonce-favicon`; Greenhouse conserva enseñanza y continuidad, sin cambios de motores.

## Contrato vigente y evidencia

Workbench posee las recetas `contentLayoutRecipe@1.5.0` y `destinationRecipe@1.2.0`:
76 badges tarifarios LEFT (42 pilas y 34 complejos/dobles, incluidos 18 IDA Y VUELTA DESDE),
label centrado dentro de cada cápsula adaptable y offsets nativos del precio conservados.
El catálogo de 126 fuentes no deja un DESDE tarifario sin admisión. Footer-legal 1387 CENTER
sólo en 2611/2668; condiciones 1241/1242/1254 LEFT. Prefijo/ciudad separados por 16 px,
fila 2668 equilibrada y promoción editorial 4685 LEFT con destino/CTA.

Canon técnico: Workbench `docs/architecture/workbench-sky-designer-content-rules.md` y
`docs/architecture/workbench-sky-destination-content-flow.md`. Evidencia detallada y snapshots
históricos: `docs/audits/sky-layout-feedback-correction-2026-10-01.md`.

Verificación de implementación previa a este cierre documental: 384/384 harness + 10/10 SKY,
cero skips y cuatro gates PASS; 14 corridas nuevas, 24 seleccionadas, cero proveedores;
2.310 archivos anteriores con hashes intactos. Atlas de 76 badges y matriz de 13 variantes
revisados. La documentación conserva esos resultados fechados, sin presentarlos como ejecución
nueva de los tests por cambios de Markdown.

Entrega privada: `/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-10-01/prueba-modular-24-v6/`.
Incluye PDF/HTML de 25 páginas, 24 PNG + 24 SVG y ZIP con 48 originales. SHA-256 del PDF:
`489244b17e7979c475ce353e22f345c05d93de8b77098b4859667c5c49fc0113`.
Revisión del PDF real y hashes en `reproducibilidad/final-review.json`; prueba de inmutabilidad
en `layout-feedback-correction-v6/selection-and-immutability-verification.json`, carpeta hermana.

## Documentación y enseñanza

Los subagentes revisan contratos/manual/routers de Workbench, auditoría/handoff/estado y el bundle
completo de `efeonce-creative-workbench` en Codex/Claude. Se corrigen instrucciones actuales stale
que todavía pedían implementar en el próximo chat; los cortes v3/v4/v5 quedan explícitamente históricos.
Greenhouse actualiza estado central, funcional, manual, preflight y puntero del ADR existente.
No se crea otra arquitectura ni se duplica el renderer en Greenhouse.

Fuentes de lectura: [estado vigente](../../operations/creative-production/WORKBENCH_CURRENT_STATE.md),
[funcional](../../documentation/plataforma/creative-workbench.md),
[manual](../../manual-de-uso/plataforma/operar-creative-workbench.md) y
[skill espejo](../../../.codex/skills/efeonce-creative-workbench/SKILL.md).

Datos sintéticos y fotografía source-reference; aceptación visual del operador y aprobación comercial
pendientes. Sin push, despliegue ni publicación; WIP ajeno preservado.

## Validación documental y versionado local

Tres subagentes revisaron contratos/routers/manuales, handoff/auditorías y el bundle completo de la skill.
Se actualizaron 14 documentos Workbench y ocho archivos pertinentes de la skill en cada espejo.
El resto de las referencias de la skill conserva su contrato vigente sin cambios.

Validador de lectura: 20 archivos byte-equivalentes, 308 enlaces internos y router válido.
Chequeo final de enlaces del conjunto: 249 destinos internos Workbench y
383 Greenhouse resueltos, sin enlaces rotos.
Cuatro gates Workbench PASS; cierre documental Greenhouse estricto sin warnings.
El gate de contexto se ejecuta como último control después de la última edición documental.
No se ejecuta el wrapper global de cierre con herramientas IA: se usa su helper documental
read-only para respetar el alcance sin motores/CLIs de producción Greenhouse.

Commit local Workbench: `a2c08a4e5443566057da270625d9c8b89980ec86`, 14 archivos exclusivamente documentales,
con identidad Git verificada por el hook. Las skills y sus routers se versionan en el commit
Greenhouse de este cierre; el SHA final se registra mediante readback Git en la entrega.
El WIP de implementación Workbench y ai-generations ajeno de Greenhouse quedan fuera de ambos
commits. Ningún binario privado, output de corrida o asset licenciado se añade a Git.
Push, merge, publicación y deploy siguen sin ejecutarse.
