# Berel — conciliación de numeración editorial

## Alcance autorizado

El operador pidió corregir la numeración para no confundir al equipo y actualizar las skills.
Solo noviembre y diciembre de 2026; octubre y ciclos anteriores excluidos. No cambiar artículos,
estados, responsables, fechas, relaciones, cupos, aprobaciones, CMS ni archivos entregados.

## Mapa por identidad de artículo

La identidad estable es el ID de la página, no su número visible. Aplicar la permutación de una sola
vez sobre el snapshot original: nunca encadenar sustituciones que conviertan un número dos veces.

| Mes | Número anterior | Número vigente | Tema |
| --- | --- | --- | --- |
| Noviembre | N43–N47 | N43–N47 | Cinco reescrituras existentes, sin cambio |
| Noviembre | N51 | N48 | Rendimiento de una cubeta |
| Noviembre | N52 | N49 | Pintar sobre esmalte |
| Noviembre | N53 | N50 | Pintura que se desprende |
| Noviembre | N59 | N51 | Navidad, pieza adicional autorizada |
| Diciembre | N48 | N52 | Rayados, archivo |
| Diciembre | N49 | N53 | Colores del 8M |
| Diciembre | N50 | N54 | Día de las Madres |
| Diciembre | N54 | N55 | Resanar una pared |
| Diciembre | N55 | N56 | Rodillos |
| Diciembre | N56 | N57 | Pintar un techo |
| Diciembre | N57 | N58 | Quitar papel tapiz |
| Diciembre | N58 | N59 | Guardar pintura sobrante |

Noviembre conserva ocho piezas base y Navidad adicional: N43–N51. Diciembre conserva ocho: N52–N59.
No mover Navidad de mes ni convertirla en sustitución. Los nombres de archivos ya existentes y URLs
no se renombrarán: equivalencia explícita por artículo para mantener su trazabilidad. N1–N4 son posiciones
de banners, no números de artículos, y quedan intactos.

## Estado

Incidente corregido durante el lote: aparecieron números repetidos al mezclarse tareas ya migradas y
tareas pendientes. Además, el transformador confundió `Artículo N48 - 79 años de Rayados` con un
rango. El lote se detuvo; se corrigieron por ID los 17 títulos principales y las cuatro referencias
afectadas en banners de Rayados. Relectura de los 17 títulos: N43–N51 y N52–N59, únicos y tema intacto.
El reconocimiento de rangos ahora exige ambos prefijos N; ocho casos de regresión independientes
verifican años en títulos, rangos, posiciones de banners, URLs y nombres físicos. El ledger inicial
conserva el plan defectuoso como evidencia histórica; no debe reutilizarse como plan vigente.

Concurrencia detectada en Banner N1 de pintura desprendida (`3d039c2fefe78191bdbbfbed2e8497b1`):
el equipo cambió el ancho de una columna a 453 px entre lecturas. La operación se detuvo antes de
escribir, se releyó la ficha y se conservó esa estructura al recalcular solo los números.

Completado y verificado: 179 páginas ajustadas dentro de un inventario de 152 tareas y 83 registros
Content Hub, dos proyectos y dos playbooks. Consulta final paginada: 152 tareas, 17 principales,
N43–N59 únicos y sin títulos discordantes; noviembre N43–N51 y diciembre N52–N59. Los dos proyectos
tienen un índice editorial ordenado. No se cambió la ordenación de la vista global que incluye octubre.
Readback 179/179: contenido esperado, propiedades editadas, alias por artículo, nombres físicos y
propiedades operativas protegidas conformes. Los espacios de tablas y el autoenlace de Frame.io que
añade Notion se normalizaron para comparar; no son cambios de contenido editorial.
Se preservan los cambios del equipo observados en esta lectura, incluidos estados distintos de auditorías
anteriores. La lectura anterior del lote no sirve como snapshot para restaurar estados.

Playbooks de Producción y Derivados Sociales actualizados y releídos, con mapa completo y controles
contra rangos falsos. Skill Berel módulo 16, router, antipatrón, ciclo mensual y checklist de planeación
actualizados en ambos espejos. Ocho regresiones y `pnpm skills:mirrors` correctos; QA documental
acotado y cierre documental sin advertencias. Sin commit, push, cambio de branch ni publicación.

## Verificación exigida

- Lectura completa y paginada antes de escribir; snapshot por ID.
- Comparación previa a cada cambio; no sobrescribir edición humana concurrente.
- Cambios acotados a números editoriales y notas de equivalencia; URLs y archivos intactos.
- Relectura del contenido y propiedades de cada página cambiada.
- Secuencia única por mes y global; referencias coherentes en principales, banners, tutoriales y sociales.
- Índice mensual visible ordenado, sin alterar la fecha de publicación para ordenar una vista.
- Playbooks y skills espejo actualizados; auditorías previas conservadas como evidencia histórica.

## Recuperación

Plan de cambios exactos por ID: [ledger de renumeración](BEREL_EDITORIAL_NUMBERING_LEDGER_2026-09-03.json).
No contiene credenciales ni URLs firmadas de medios. Preserva old/new para compensación controlada.
La corrección del transformador y sus ocho casos independientes están en
[regresión reproducible](BEREL_EDITORIAL_NUMBERING_REGRESSION_2026-09-03.mjs);
el [readback](BEREL_EDITORIAL_NUMBERING_READBACK_2026-09-03.json) registra el estado real y las
reparaciones que prevalecen sobre el plan inicial. Ejecutar la regresión con Node; no escribe en Notion.
Las [correcciones por ID](BEREL_EDITORIAL_NUMBERING_CORRECTIONS_2026-09-03.json) documentan el error
de Rayados, su reparación y la nota histórica de Navidad, además de los 17 títulos verificados.

El registro de cambios por ID conservará old/new de cada fragmento editado. Revertir solo tras comparar
el valor vigente con el que escribió esta operación y con autorización: no ejecutar el mapa inverso
sobre toda la base ni sobre trabajo que el equipo haya editado después.

## Gobierno y límites

Exclusión observada en vivo: la relación de subtareas de pintura desprendida apunta al Banner N3
`3d039c2fefe781efbea7cd671fd76c79`, pero Notion lo devuelve `deleted`. No se restaura, renumera ni
borra la relación: no es un registro activo omitido por paginación. Su N53 es histórico (artículo
vigente N50). Esta operación no acredita que el cupo de gráficas siga completo después de esa baja.

Corrección reversible del naming editorial ya contratado; no cambia source of truth, schema,
API, permisos ni arquitectura. La autoridad sigue en los playbooks vivos de Berel; la skill es
su copia operativa. No requiere un ADR nuevo de plataforma. La especificación técnica y el
procedimiento humano/agente se concentran en módulo 16 y los índices de Notion; no se crea
una capacidad de software ni un nuevo workflow de publicación.

Skills empleadas: berel-content-production, notion-platform, greenhouse-documentation-governor
y greenhouse-qa-release-auditor. Gates globales incluyen WIP ajeno de comercial/DataForSEO;
no se corrige ni se atribuye a esta operación.
