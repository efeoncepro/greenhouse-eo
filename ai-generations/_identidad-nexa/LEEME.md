# Nexa — identidad canónica

**Esto es lo vigente. Si vas a generar cualquier cosa con Nexa, sale de aquí.**

No es una carpeta de corrida: las carpetas con fecha (`2026-09-17_…`, `2026-09-20_…`, `2026-09-21_…`) son el
histórico de cada sesión y no se tocan. Ésta es el estado actual, y el catálogo de
[`scripts/foto/build-prompt.mjs`](../../scripts/foto/build-prompt.mjs) apunta sólo aquí.

## Cómo se usa (no copies rutas a mano)

```bash
pnpm foto:prompt <ficha.json>   # resuelve las referencias por ti
```

En la ficha, `"identidad": ["nexa"]` toma las referencias base; `"identidad": [{ "persona": "nexa", "vista":
"perfil-der" }]` antepone esa vista. Una vista inexistente aborta y lista las disponibles. **Nunca pases
rutas de imagen a mano a `pnpm ai:image` para una pieza con Nexa**: es exactamente así como durante cinco
meses se mezclaron dos caras distintas sin que nadie lo notara.

## Qué hay

| Carpeta | Qué es | Para qué |
|---|---|---|
| `1-anclas/` | 8 imágenes a 2560×3200 y 2304×3456, calidad `max` | **La identidad.** Rostro frontal, tres cuartos y perfil; busto; cuerpo entero frontal, tres cuartos y perfil; manos. Piel fotográfica real. |
| `2-angulos/` | 8 vistas derivadas a 1024×1024 | Ángulos que las frontales no cubren: ambos perfiles, ambos tres cuartos, trasero, espalda y dos de cuerpo entero. |
| `3-poses/` | 8 poses expresivas | Escéptica, risa, hablando, pensativa, confiada, escucha, neutra asertiva, idea. |
| `4-vestuario/` | 17 imágenes en 4 contextos | Home office, casual, profesional y speaker. |
| `_anterior-no-usar/` | 2 imágenes | **Referencia de lo que NO es canónico.** Está aquí para reconocerlo, no para usarlo. |

## Las dos identidades, y por qué esta carpeta existe

Desde abril de 2026 convivían **dos rostros distintos** bajo el nombre «Nexa», y el catálogo mezclaba los
dos: dos referencias de una cara y una de la otra. El modelo promediaba. En el KV aprobado ganó la cara
correcta **por mayoría**, no porque la mezcla no existiera — por eso el defecto estuvo latente sin
detectarse.

| | Identidad **A — canónica** | Identidad **B — no usar como rostro** |
|---|---|---|
| Párpado | **delineado superior con rabillo** | sin delineado |
| Cejas | gruesas, arco definido con cola | más rectas y finas |
| Nariz | corta, punta redondeada | más larga, puente alto |
| Labios | llenos, cupido marcado | más finos |
| Óvalo | más ancho | más largo |
| Dónde vive | esta carpeta | `Poses y expresiones/` y `Vestuario/` **originales** de OneDrive |

**El iris NO distingue las dos** (ambas castaño oscuro; dentro de una misma cara varía más por luz que entre
identidades). Lo que distingue es la estructura, y el rasgo más rápido de verificar es el delineado.

**El material original de B no es basura: es un banco de poses, vestuario y escenarios.** Lo que no puede
aportar es rostro. Las carpetas `3-poses/` y `4-vestuario/` de aquí SON ese material, con la cara de A
injertada encima.

## El acabado, y una deuda declarada

Las `1-anclas/` son fotografía: poros irregulares, vello facial fino, pecas sutiles, luz de ventana con
dirección real. El maestro anterior era sintético —piel sin poros, con un patrón de micro-arrugas uniforme—
y eso se nota a simple vista.

**[deuda 2026-09-21]** `2-angulos/`, `3-poses/` y `4-vestuario/` conservan el acabado sintético anterior,
porque se derivaron del maestro viejo. Sirven para pose, encuadre y vestuario, pero si una pieza necesita
piel creíble en primer plano, la referencia es un ancla. Regenerarlos con la receta realista está pendiente
y decidido por el operador, no por un agente.

## Verificación

```bash
pnpm foto:assets:check   # catálogo y lock deben coincidir por sha256
```

Si alguien sustituye un archivo de aquí, ese comando falla. Es el guardarraíl que impide que la identidad
cambie en silencio.
