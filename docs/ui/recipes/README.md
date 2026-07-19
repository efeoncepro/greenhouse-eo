# Greenhouse surface recipes

Las recetas son composiciones canónicas para convertir intención de producto en una primera interfaz rica sin dibujar freehand. No son templates rígidos ni skins: fijan jerarquía, regiones, densidad, estados, responsive y motion; el dominio aporta contenido y `kind`.

## Registry

| Recipe | Composition Shell | Cuándo usarla | Contrato |
| --- | --- | --- | --- |
| Operational workbench | `masterDetail` | inventario + selección + detalle accionable | [operational-workbench.md](./operational-workbench.md) |
| List-detail | `masterDetail` | navegación estable con lectura/edición focal | [list-detail.md](./list-detail.md) |
| Command center | `leadPlusContext` | señales, excepciones y decisión rápida | [command-center.md](./command-center.md) |
| Review studio | `split` | comparar evidencia y aprobar/rechazar | [review-studio.md](./review-studio.md) |
| Analytics/report | `single` o `leadPlusContext` | narrativa ejecutiva + métricas + evidencia | [analytics-report.md](./analytics-report.md) |
| Settings/flow | `focused` | configuración, wizard o proceso secuencial | [settings-flow.md](./settings-flow.md) |

## Reglas comunes

1. El primer fold comunica contexto, estado y una sola acción primaria.
2. Toda receta se construye con las primitives compuestas de `surface-system`; el consumer elige `kind`, no recrea el shell.
3. Cards y filas nacen con `density='auto'`; la condensación conserva la señal principal.
4. Desktop y 390 px se diseñan antes de implementar. El responsive cambia jerarquía, no solo apila cajas.
5. Loading, empty, error, partial, permission y success se resuelven dentro de la misma arquitectura visual.
6. La entrada usa motion coreografiado; hover, focus y selección responden con feedback breve y reduced-motion.
7. La salida se verifica con GVC `qualityProfile: 'premium'`, dossier, baseline y scorecard.
8. Primero se compone con planos `open`, rails, bands y divisores; `contained`
   sólo aparece cuando existe una frontera semántica. Más de tres superficies
   contenidas simultáneas en el viewport o card-on-card bloquean el first fold.
9. Cada receta declara un momento de impacto visual ligado a la tarea; una grilla
   uniforme de cards pulidas no satisface la receta.
