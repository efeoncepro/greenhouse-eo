# GREENHOUSE_DASHBOARD_UX_GAPS_V1

## Brechas detectadas
- El hero estaba cargando demasiada narrativa, badges y highlights; eso elevaba su altura y empujaba a que las cards de la derecha se vieran largas y desalineadas.
- La columna derecha del top fold usaba tres mini cards comprimidas en un espacio angosto y, ademas, heredaba altura innecesaria del hero.
- `Capacity` tenia una buena direccion visual, pero todavia no existia una variante compacta reusable para layouts con menos alto.
- El UX writing del top fold mezclaba mensajes largos, etiquetas redundantes y poca consistencia entre espanol ejecutivo e indicadores mas tecnicos.
- Habia oportunidades claras de accesibilidad en hero y capacity: landmarks, labels mas explicitos y mejor semantica para listas y barras de progreso.

## Matriz de soluciones
| Brecha | Solucion viable | Pros | Contras | Esfuerzo | Impacto | Puntaje |
| --- | --- | --- | --- | --- | --- | --- |
| Hero sobredimensionado | Reducir copy, bajar highlights a dos y convertir el summary en panel compacto rectangular | Baja la altura, mejora el scan y ordena la jerarquia | Requiere recalibrar copy y layout del top fold | 3/5 | 5/5 | 5/5 |
| Hero sobredimensionado | Mantener el hero actual y solo reducir padding | Cambio rapido | No corrige la causa estructural | 1/5 | 2/5 | 2/5 |
| Mini cards derechas alargadas | Apilar las top stats en una sola columna en desktop y desactivar el fill-height | Corrige proporcion y alineacion de inmediato | Cambia la lectura respecto a la version anterior | 2/5 | 5/5 | 5/5 |
| Mini cards derechas alargadas | Mantener tres columnas y solo bajar min-heights | Conserva la estructura previa | Sigue dejando cards demasiado angostas | 1/5 | 2/5 | 2/5 |
| Falta variante compacta en capacity | Extender `CapacityOverviewCard` con variantes `default` y `compact` | Abre el camino a formatos multiples sin duplicar componentes | La variante compacta queda lista pero no reemplaza la principal todavia | 3/5 | 4/5 | 4/5 |
| Falta variante compacta en capacity | Crear otro componente independiente para capacity compacto | Aisla el experimento | Duplica logica y styling | 3/5 | 2/5 | 2/5 |
| UX writing irregular | Reescribir hero y copy del top fold con mensajes mas cortos y lenguaje mas escaneable | Mejora comprension y densidad visual | Requiere revisar coherencia entre secciones | 2/5 | 4/5 | 4/5 |
| UX writing irregular | Mantener copy y traducir solo labels aislados | Barato | No resuelve la friccion general | 1/5 | 2/5 | 2/5 |
| Accesibilidad incompleta | Agregar landmarks, ids accesibles, listas semanticas y labels para progress/summaries | Mejora lectura asistida y deja mejor base para iteraciones futuras | No reemplaza una auditoria completa con lector de pantalla real | 2/5 | 4/5 | 4/5 |
| Accesibilidad incompleta | Limitarse a agregar `aria-label` sueltos | Rapido | Solucion parcial y poco coherente | 1/5 | 2/5 | 2/5 |

## Solucion recomendada
La mejor combinacion es simplificar el hero, desacoplar la altura de las mini cards derechas y extender `CapacityOverviewCard` con variantes. Esa mezcla supera al resto porque corrige la desalineacion de raiz, reduce densidad arriba del fold y deja un patron reusable para futuros formatos compactos sin duplicar componentes.

## Plan listo, documentado y ejecutado y documentado
1. Se simplifico el hero: menos copy, dos highlights clave, summary rectangular y badges condensados en un bloque secundario.
2. Se corrigio la fila superior: las top stats derechas ya no se estiran por la altura del hero y en desktop viven en una sola columna mas proporcionada.
3. `CapacityOverviewCard` ahora soporta `default` y `compact`, manteniendo la version actual como principal y dejando la variante compacta lista para futuros layouts.
4. Se ajusto el UX writing del top fold y de `Capacity` para hacer la lectura mas corta, directa y consistente.
5. Se integraron mejoras de accesibilidad en hero y capacity con landmarks, ids accesibles, listas semanticas y labels para allocation/progress.
