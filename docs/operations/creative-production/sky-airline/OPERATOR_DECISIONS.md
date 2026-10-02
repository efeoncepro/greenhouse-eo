# SKY Airline — decisiones del operador

## Continuidad posterior — 2026-09-30

El operador priorizó producción por agentes; Efeonce ID definitivo queda diferido en TASK-1952,
sin otro AUTH. Workbench PR 11 (lotes) y PR 12 (contornos) están integrados; el
[estado vigente fechado](../../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md)
separa ese código de la candidata de identidad y del runtime. El bloque de identidad siguiente
preserva una observación previa: su token pendiente, identity404 y «sin PR» no son estado actual.
La corrección circular conserva trazados de fuente; no modifica los dos pins de máscara ni
actualiza outputs de corridas antiguas. Nuevas marcas y miembros mantienen admisión explícita.

## Histórico: identidad del Workbench — corte inicial 2026-09-30

El harness es multimarcas; la App de autoridad pertenece al Workbench, no a SKY. Julio
confirmó creada/instalada `efeonce-workbench-authority`: App **5138627**, instalación
**166592362**. La API GitHub verificada por el agente raíz confirma organización **234934634**,
`members:read`, `metadata:read`, selección `selected` y `events: []`. No ampliar ese alcance
por inferencia. El operador reportó secreto propio con una versión y SA exacta; valores privados
no se registran aquí. Faltan lectura efectiva de token/scopes y consumer/runtime.

Pins App admitidos por owner. Firma/audiencia del ticket Google verificadas por agente raíz;
usuario aprobó vínculo del operador a `cesargrowth11`, GitHub ID87578376. Policy privada
preparada con modo `0600`, 90 días hasta 2026-12-29; sub/JWT/claims no se copian aquí.
Primer token App pendiente por grant de impersonación SA ausente, sin ampliar IAM.
No autoriza vínculos del resto del equipo, rollout o IA. Último readback runtime:
`/v1/identity` 404 y generación false; sin PR creado aún. Estado vivo y evidencia local de suites:
[skill Workbench](../../../../.codex/skills/efeonce-creative-workbench/references/state-continuity.md).
Los bloques de tipografía/inventario siguientes conservan sus cortes iniciales fechados.

## Tipografía 2026-09-29

Julio Reyes confirmó en esta conversación: «Metric; Inter es auxiliar o experimental».
Metric gobierna la producción gráfica. Los 24 estilos locales Inter extraídos de Figma son evidencia
auxiliar y no se convierten en defaults ni reemplazan Metric cuando faltan los archivos de fuente.
El contexto de las plantillas presenta Metric Regular, SemiBold, Bold y Black.
Los binarios se verificaron localmente a partir de `~/Downloads/Metric_family.zip`, aportado por Julio.
Son 14 OTF, siete pesos con sus itálicas; Regular 400, Semibold 600, Bold 700 y Black 900
cubren las plantillas. `font-provenance.json` conserva nombres internos, pesos y hashes.
Los archivos viven fuera de los repositorios en
`/Users/jreye/Documents/creative/creative-workbench-canon/sky-airline/2026-09-29/fonts/`.
La prueba `metric-verificacion.png` fue renderizada desde contornos de los cuatro archivos, sin fallback.
El ZIP no incluye un documento de licencia; los derechos de distribución remota no están establecidos.
Los paquetes incluyen metadata tipográfica, no binarios de las fuentes.

## Inventario

107 variables locales en tres colecciones (Primitives, Semantic, Typography).
101 nodos component/component-set en Page 1; 17 component sets.
13 componentes Destino reportan errores al consultar variantProperties; quedan como brecha de fuente.
Hay tres páginas (Page 1, Page 2, Color Tokens). La extracción de componentes cubre Page 1,
no acredita ausencia de componentes en las demás páginas.
