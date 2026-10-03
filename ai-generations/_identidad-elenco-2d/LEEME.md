# Elenco 2D de Efeonce — referencias canónicas

Hogar canónico de las hojas del **elenco 2D** (aprobado por el operador el 2026-10-03). No es una carpeta de corrida:
el catálogo `ELENCO_2D` de `scripts/foto/build-prompt.mjs` apunta **sólo aquí**, y todo lo de esta carpeta está sellado
en `scripts/foto/assets.lock.json` y publicado en `gs://efeonce-creative-canon`.

Canon y reglas: [`EFEONCE_2D_CAST_V1.md`](../../docs/operations/brand-characters/EFEONCE_2D_CAST_V1.md).

| Archivo | Qué es | Para qué sirve |
|---|---|---|
| `<clave>/<clave>-giro.png` | Hoja de giro: frente, tres cuartos, perfil y espalda | Primera referencia del personaje |
| `<clave>/<clave>-expresiones.png` | Seis expresiones: neutral, curiosa, sorprendida, pensando, aprobando, sonrisa contenida | Gesto y expresión |
| `_estilo/estilo-a-sello-efeonce.png` | Tomás con el Spark en el estilo A con el sello Efeonce | Ancla del estilo para personajes o escenas nuevas |
| `elenco-2d-grupo.png` | Los cuatro con un Spark | Escala relativa y estilo común |

Claves: `tomas` (Tomás Ríos) · `camila` (Camila Quispe) · `renata` (Renata Salgado) · `mateo` (Mateo Arango).

Si falta un archivo en disco: `pnpm ai-gen:where <ruta>` y `pnpm ai-gen:pull <carpeta>`. **Nunca** regenerarlo ni
resellar el lock para tapar un faltante. Origen y prompts: `ai-generations/2026-10-03_sparks-aeo-60s/elenco-2d/`.
