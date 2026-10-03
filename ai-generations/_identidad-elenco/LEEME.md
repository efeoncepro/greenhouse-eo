# Elenco de marca Efeonce — referencias de identidad

Hogar canónico de las referencias de los **personajes ficticios** del elenco (2026-10-02). No es una carpeta de corrida:
el catálogo `ELENCO` de `scripts/foto/build-prompt.mjs` apunta **sólo aquí**. Canon y reglas de uso:
[`docs/operations/brand-photography/EFEONCE_BRAND_CAST_V1.md`](../../docs/operations/brand-photography/EFEONCE_BRAND_CAST_V1.md).

Ninguno es persona del equipo real. Interpretan el rol de su línea y no se presentan como equipo, cliente ni testimonio.

| Clave | Personaje | Línea | Rol |
|---|---|---|---|
| `hum` | Hum | `growth` | Estratega de crecimiento y medición |
| `karo` | Karo | `brand` | Directora de arte y creadora de contenido |
| `sophia` | Sophia (hermana mayor de Karo) | `engine` | Estratega SEO/AEO y analítica web |
| `isabella` | Isabella | `voice` | Especialista de medios pagados y distribución |
| `antonio` | Antonio | `revenue-hubspot` · `revenue-salesforce` | Líder de RevOps y CRM |

## Qué hay en cada carpeta

| Archivo | Qué es | Lo usa el catálogo |
|---|---|---|
| `<clave>-frente.png` | Rostro frontal (primera referencia) | sí, `refs[0]` |
| `<clave>-elegida.png` | La foto que eligió el operador | sí, `refs[1]` |
| `<clave>-cuerpo.png` | Cuerpo entero, **extendido** desde la elegida | sí, `refs[2]` y `cuerpo` |
| `<clave>-45-izq/45-der/perfil-izq/perfil-der.png` | Vistas; el nombre dice hacia qué lado **del cuadro** mira | sí, `vistas` |
| `<clave>-manos.png` | Ancla de manos | no (para escenas de manos, se pasa a mano como referencia de piel) |
| `<clave>-ancla-hd.png` | Ancla de rostro en alta resolución para primeros planos | no |
| ~~`antonio-ancla-hd-no-usar.png`~~ | Ancla HD de Antonio fallida (frente rugosa al 100 %): archivada el 2026-10-03 con la exploración del elenco (`2026-10-02_elenco-efeonce/descartes-identidad/`, `pnpm ai-gen:pull` para verla). Para primeros planos, `antonio-frente.png` | no |

## Cómo se hicieron

1. Casting en dos rondas; el operador eligió (`ai-generations/2026-10-02_elenco-efeonce/`).
2. Vistas por **edición** desde la elegida (generar de cero reconstruye el rostro).
3. Realismo **v3 de Nexa** (`_identidad-nexa/LEEME.md`): textura sólo de poros y vello fino, tono parejo.
4. Cuerpo entero por **extensión** hacia abajo desde la elegida, sin reponer el original.
5. Isabella lleva su marca de carácter: pecas suaves en nariz y pómulos, en todo el set.

Prompts y salidas intermedias: `ai-generations/2026-10-02_elenco-efeonce/` (`sets/`, `realismo-v3/`).
