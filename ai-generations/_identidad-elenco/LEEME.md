# Elenco de marca Efeonce — referencias de identidad

Hogar canónico de las referencias de los **personajes ficticios** del elenco (2026-10-02). No es una carpeta de corrida:
el catálogo `ELENCO` de `scripts/foto/build-prompt.mjs` apunta **sólo aquí**. Canon y reglas de uso:
[`EFEONCE_BRAND_CAST_V1.md`](../../docs/operations/brand-photography/EFEONCE_BRAND_CAST_V1.md) (§1 reparto, §2 qué puede
representar, §3 fichas). Si la ficha y el catálogo difieren, **manda el catálogo**: es lo que recibe el modelo.

Ninguno es persona del equipo real. Interpretan el rol de su línea y no se presentan como equipo, cliente ni testimonio.

## Los cinco personajes

| Clave | Personaje | Edad · origen | Línea | Rol | Silueta | Carácter | Rasgos que lo separan |
|---|---|---|---|---|---|---|---|
| `hum` | Hum | 33 · venezolana | `growth` | Estratega de crecimiento y medición | `mujer` | **[propuesta]** serena y analítica, escucha antes de proponer (la ficha no lo define todavía) | pelo negro largo con ondas, piercing plateado en la nariz |
| `karo` | Karolyne «Karo» | 28 · venezolana | `brand` | Directora de arte y creadora de contenido | `mujer` | coqueta en el gesto (sonrisa ladeada, mirada pícara), social, presenta y convence | rizos 3A–3B cobrizos largos, aros dorados medianos, labial rosado |
| `sophia` | Sophia | 31 · venezolana, hermana mayor de Karo | `engine` | Estratega SEO/AEO y analítica web | `mujer` | seria, analítica, sonrisa contenida de boca cerrada | bob rizado castaño oscuro a la mandíbula, lentes de montura metálica dorada fina |
| `isabella` | Isabella | 27 · colombiana (Barranquilla) | `voice` | Especialista de medios pagados y distribución | `mujer` | energía alta, gesticula al explicar, ríe fácil | rizos 3C–4A, pecas suaves en nariz y pómulos, aretes de botón dorados pequeños (catálogo) |
| `antonio` | Antonio | 35 · mexicano (CDMX) | `revenue-hubspot` · `revenue-salesforce` | Líder de RevOps y CRM | `hombre` | calma segura, sonrisa de boca cerrada | pelo negro liso peinado hacia atrás, barba de 3–5 mm, sin lentes |

**Qué puede:** interpretar el rol de su línea en campaña, social, deck y propuestas; vestir la prenda de su línea; salir
solo, con otros del elenco, con Nexa y con Julio. **Qué no:** aparecer como equipo real (página de equipo, firmas,
LinkedIn), presentarse como cliente o testimonio, llevar su nombre en pantalla salvo narrativa declarada como ficción,
ni cambiar de rol o de línea. Las piezas publicadas pasan por `greenhouse-ai-creative-rights-governance`.

## Qué hay en cada carpeta (8 archivos por personaje)

| Archivo | Qué es | Para qué sirve | Lo usa el catálogo |
|---|---|---|---|
| `<clave>-frente.png` | Rostro frontal | Primera referencia de identidad; en un grupo es la única que viaja | sí, `refs[0]` |
| `<clave>-elegida.png` | La foto que eligió el operador | Fuente de todas las demás vistas | sí, `refs[1]` |
| `<clave>-cuerpo.png` | Cuerpo entero, **extendido** desde la elegida | Proporción y escala del cuerpo | sí, `refs[2]` y `cuerpo` |
| `<clave>-45-izq.png` · `<clave>-45-der.png` | Tres cuartos | `"vista": "45-izq"` / `"45-der"`; también fija el giro de la prenda puesta (45°) | sí, `vistas` |
| `<clave>-perfil-izq.png` · `<clave>-perfil-der.png` | Perfil | `"vista": "perfil-izq"` / `"perfil-der"`; la prenda puesta va a 70° | sí, `vistas` |
| `<clave>-manos.png` | Ancla de manos | Escenas de manos: se pasa a mano como referencia de piel | no |

El nombre de cada vista dice hacia qué lado **del cuadro** mira la persona.

Extras que no forman parte de los 8:

| Archivo | Qué es |
|---|---|
| `<clave>-ancla-hd.png` (hum, karo, sophia, isabella) | Ancla de rostro en alta resolución para primeros planos; no la usa el catálogo |
| ~~`antonio-ancla-hd-no-usar.png`~~ | Fallida (frente rugosa al 100 %), archivada el 2026-10-03 en `2026-10-02_elenco-efeonce/descartes-identidad/` (`pnpm ai-gen:pull` para verla). Para primeros planos de Antonio, `antonio-frente.png` |

Las 8 referencias están selladas en `scripts/foto/assets.lock.json` y publicadas en el canon
(`gs://efeonce-creative-canon`). Si faltan en disco, `pnpm foto:prompt` las baja solo (canon-sync).

## Cómo se pide en una ficha

Igual que el roster, en `identidad`:

```json
"identidad": [{ "persona": "karo", "vista": "45-der" }]
```

Sin `vista`, va de frente. La silueta del personaje la usa `pnpm foto:prompt` para elegir la vista puesta de la ropa de
marca; para fijar quién viste una prenda en un grupo, se declara `persona` en el objeto:

```json
"objetos": [{ "objeto": "polo-efeonce", "persona": "isabella", "tapa": "cruza" }]
```

## Grupos

El elenco se hizo para **variar las personas en fotos de varios o de equipo**, no como cuota. Operador: «no para tener
reglas explícitas de que al menos uno del elenco deba estar. Debe usarse el elenco si es necesaria su inclusión».

- Un grupo de **3 a 5** es cualquier combinación de personajes del elenco, Nexa y Julio. Con otras personas del roster
  el tope sigue en dos.
- En dupla, cualquier combinación.
- En grupo viaja **una referencia frontal por persona**, en bloques `PERSON n — NOMBRE (Image k):`, y la luz de las
  referencias se corta («the light of the identity references does NOT carry over»).
- La misma persona dos veces en `identidad` es error («aparece dos veces»).
- Validado: `EC2` (los cinco del elenco) y `VP3` (Julio + Nexa + Karo).

## Cómo se hicieron

1. Casting en dos rondas; el operador eligió (`ai-generations/2026-10-02_elenco-efeonce/`).
2. Modelos publicitarios con piel real: realismo **v3 de Nexa** (`_identidad-nexa/LEEME.md`), textura sólo de poros
   irregulares y vello fino, tono parejo, nunca castigo.
3. Vistas por **edición** desde la elegida (generar de cero reconstruye el rostro).
4. Cuerpo entero por **extensión** hacia abajo desde la elegida, a escala medida (≥ 7,2 cabezas, Vision), sin reponer
   el original. Nunca se injertan caras.
5. Isabella lleva su marca de carácter: pecas suaves en nariz y pómulos, en todo el set.

Prompts y salidas intermedias: `ai-generations/2026-10-02_elenco-efeonce/` (`sets/`, `realismo-v3/`; parte archivada,
`pnpm ai-gen:pull` para recuperarla).

## Sumar un personaje nuevo (procedimiento B)

1. Escribir su ficha en la biblia del elenco (`EFEONCE_BRAND_CAST_V1.md` §3) con su geometría de rostro.
2. Generar candidatos con realismo v3; **el operador elige**.
3. Hacer las vistas por **edición** desde la elegida.
4. Extender el cuerpo entero desde la elegida a escala medida (≥ 7,2 cabezas).
5. Crear `_identidad-elenco/<clave>/` con los 8 archivos y sus nombres exactos.
6. Agregar la entrada en `ELENCO` (`scripts/foto/build-prompt.mjs`): `etiqueta`, `silueta`, `linea` e `identity`, que
   empiece con «IDENTITY (critical):» y lo declare «fictional Efeonce campaign character».
7. `pnpm foto:assets:lock` → `pnpm creative:assets:publish apply` → `pnpm exec vitest run scripts/foto`.
8. Archivar la exploración con `pnpm ai-gen:archive apply --folder <carpeta>` y sumarlo a este LEEME.
