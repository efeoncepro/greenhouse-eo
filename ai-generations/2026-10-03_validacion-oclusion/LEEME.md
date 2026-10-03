# Validación de las vistas de oclusión en escena (2026-10-03)

Dos tomas con `pnpm foto:generar` (gpt-image-2.5-sunburst, high, 1024×1280) para comprobar que la vista de oclusión
del kit llega a una escena real.

| Ficha | Selección de `foto:prompt` | Resultado al 100 % |
|---|---|---|
| `VO-karo-mano` · hoodie | `frente-mano-mujer`, inferida de la escena («her right hand rests flat on her chest») | ✅ marca a su tamaño, sólo la parte visible junto a los dedos |
| `VO-isabella-cruza` · polo | `frente-cruza-mujer`, declarada con `tapa: "cruza"` | marca correcta y ENTERA: el modelo corrió la taza a un costado |

Lectura: la vista de oclusión evita que la marca se reinvente o se achique cuando algo la cruza; con una mano la
oclusión ocurre, con un objeto el modelo tiende a esquivarla. Ninguna de las dos reinventó la marca.
