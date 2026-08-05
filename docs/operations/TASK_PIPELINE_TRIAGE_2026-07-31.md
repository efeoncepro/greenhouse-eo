# Triage del pipeline de tasks — 2026-07-31

> **Tipo:** nota de operación (método + hallazgo medido)
> **Origen:** `docs/tasks/in-progress/` acumuló 107 tasks; se intentó clasificarlas mecánicamente
> **Estado:** el hallazgo está medido; la acción correctiva **no** se ejecutó, y este documento explica por qué

## El problema que se quiso resolver

Con 107 tasks en `in-progress`, la carpeta dejó de distinguir lo que alguien trabaja hoy de lo que quedó
abierto hace meses. Eso no es un problema de orden: es la condición que hizo que trabajo terminado se
perdiera de vista durante semanas (caso fuente el mismo día: cinco commits de Content Engineering que sólo
sostenía un `HEAD` desacoplado, sin rama en ningún lado).

## Los dos proxies que se probaron, y por qué fallan los dos

### Proxy 1 — criterios marcados (`- [x]` contra `- [ ]`)

**Falla por falsos negativos.** Clasificó 41 tasks como «nunca arrancaron» por tener cero criterios
marcados. Tres verificadas al azar tenían su trabajo **entregado y en producción**:

| Task | Lo que el proxy dijo | Lo que existe en el repo |
|---|---|---|
| `TASK-1160` | nunca arrancó | el CLI `claude-md` está en `package.json` y hay **12 reglas auto-load** en `.claude/rules/` |
| `TASK-991` | nunca arrancó | `upsertCanonicalOrganization` existe — es el SSOT que `CLAUDE.md` documenta como canónico |
| `TASK-1036` | nunca arrancó | `src/components/theme/typography-drift.test.ts` existe (el drift-guard de tipografía) |

**Conclusión: el estado de los checkboxes no se mantiene**, así que no puede usarse para nada — ni para
medir avance, ni para priorizar, ni para decidir un movimiento de carpeta.

### Proxy 2 — existencia de los artefactos declarados

Se extrajeron las rutas `src|scripts|migrations|services/**.{ts,tsx,mjs,sql}` que cada task menciona y se
verificó cuáles existen en disco. **Mejor señal, pero también falla**, en dos direcciones:

- **Falso positivo:** que una ruta exista no prueba que *esta* task la creó. Pudo existir antes, o haberla
  creado otra task.
- **Falso negativo:** una task cuyo entregable **no vive en este repo** puntúa cero. `TASK-1374` (landing
  pública de un ebook) da `0/2`, y sus dos rutas son menciones incidentales: una landing de ebook vive en
  **WordPress**. Con el proxy 2 habría sido la única «movible», y habría sido un error.

## El hallazgo, que invierte la premisa

De las 33 tasks que el proxy 1 daba por no arrancadas y tenían rutas declaradas:

| | |
|---|---|
| **28** | la mayoría o la totalidad de sus artefactos **existe en el código** |
| 2 | parcial |
| 2 | sin rutas declaradas |
| 1 | cero artefactos — y es la que vive en WordPress |

Ejemplos con evidencia completa: `TASK-991` 17/17 · `TASK-1123` 18/18 · `TASK-1194` 12/12 ·
`TASK-1209` 10/10 · `TASK-1321` 9/9 · `TASK-1258` 8/8 · `TASK-1282` 7/7.

**`in-progress` no está lleno de trabajo sin empezar. Está lleno de trabajo hecho que nunca se cerró.**

Eso cambia la acción correctiva por su opuesta: no hay que devolver tasks a `to-do` — hay que **cosechar
cierres**. Y no es una hipótesis: ese mismo día se cerró `TASK-408`, que llevaba 86 días en 17/18 porque
el único criterio pendiente era *mirar* una señal que estaba en cero.

## Por qué no se ejecutó ninguna acción masiva

Porque ningún proxy disponible distingue con seguridad «terminada» de «a medias», y **una acción masiva mal
fundada es peor que el desorden que corrige**: mover a `to-do` una task cuyo trabajo está en producción
reetiqueta lo entregado como no empezado, y el próximo que la lea creerá que hay que construirla de nuevo.

Cerrar en masa es peor todavía: declarar `complete` sin verificar rollout viola el
`Runtime Rollout Completion Gate` justamente en las tasks donde el riesgo es mayor.

## Lo que sí sirve

1. **Cosecha verificada, de a una.** Abrir la task, mirar sus criterios pendientes contra el runtime real, y
   cerrar sólo con evidencia. Es lo que se hizo con `TASK-408` (señal en `steady=0`, verificada contra el
   control plane) y con `TASK-1120` (cuyo criterio decía «falta aplicar la migración» cuando ya estaba
   aplicada — el bloqueo real era una decisión de gobernanza).
2. **Recalibrar el criterio cuando esté obsoleto**, aunque la task no se cierre. Un criterio que infla el
   trabajo pendiente cuesta tanto como uno que lo esconde.
3. **Arreglar la causa, no el síntoma.** El desorden no viene de que falte limpiar la carpeta: viene de que
   marcar criterios y cerrar el lifecycle no es parte del flujo que efectivamente se ejecuta. Mientras eso
   no cambie, la carpeta se vuelve a llenar sola.

## Reproducir esta medición

Los scripts fueron de un solo uso y viven fuera del repo. La medición se reproduce con dos pasadas de
`git log` (menciones de `TASK-###` en mensajes de commit + último commit que tocó cada archivo de task),
el conteo de `- [x]` / `- [ ]` por archivo, y una verificación de existencia sobre las rutas
`src|scripts|migrations|services` que cada task declara. Lo importante no es el script: es **no confiar en
un único proxy**, y contrastar contra el repo antes de mover un archivo.
