# Gorra Efeonce — variantes y kit (2026-09-17)

La gorra **ya existía**: es el héroe visual de la landing `/contacto` del sitio público
(`contacto-careers-cap.png`), royal con el logotipo completo bordado en blanco. Se descargó como
`ref/gorra-oficial.png` y es la **única fuente de construcción**: seis paneles, visera curva, botón forrado, dos
ojetillos por lado y cierre de cinta.

## Variantes (decisión del operador: se siguió la recomendación)

| Variante | Rol |
|---|---|
| Royal con logotipo | La existente; continuidad con el sitio, producción y regalo |
| **Navy con logotipo blanco** | **Principal** del equipo; combina con polo y softshell |
| Navy sólo con isotipo | Alternativa discreta frente a cliente |
| Blanco con logotipo navy | Verano y eventos |
| Trucker navy con malla blanca | Terreno, grabación y exteriores |

## Kit (`final/`, 12 vistas + la referencia del sitio)

De la principal: héroe en tres cuartos, frente recto, lateral, trasera con el cierre, macro del bordado y cenital.
De las alternativas: héroe y trasera. Transparentes en todas menos el macro. Manifiesto
`efeonce-gorra-manifiesto.json` con **cuándo usar** cada vista.
Entrega: OneDrive `5. Contenidos/13- Branding/Gorra Efeonce/v01/`.

## Pruebas en persona

`out/prueba-nexa.png` y `out/prueba-julio.png`: la gorra navy sobre el polo navy, con las referencias de cada persona
y, en la persona real, al menos una foto de cuerpo entero. El logotipo se mantiene legible y el emblema conserva su
orientación.

**Corrección del operador: «muy grandes las gorras».** En el primer intento la gorra se leía de talla grande y dominaba
la cara. La referencia es una foto de producto, así que el modelo la escala de más si no se declara el calce. Se
resolvió describiendo el ajuste, no el objeto:

- talla adulta normal, calce **ceñido** y perfil **bajo**, nunca oversized;
- de la ceja a lo alto de la copa, alrededor de **un tercio** de la altura de la cabeza;
- la banda apoya justo sobre las cejas y los laterales abrazan sin hueco en las sienes;
- visera corta y curva, del ancho de la frente; nunca visera larga y plana;
- el logotipo se lee pequeño en los paneles, sin estirarse.

## Notas de método

- La construcción sale de una **foto real existente**, no de una descripción: cuando la pieza ya existe, esa foto es
  la referencia y las variantes se piden como cambio de color o de aplicación, igual que con el segundo color de un
  render 3D.
- La trasera se declara **sin bordado**; si no, el modelo tiende a repetir el logotipo detrás.

Modelo `gpt-image-2.5-sunburst`, xhigh; ~USD 0,14 por vista, 14 generaciones.

## Vistas puestas por silueta, giro, espalda y oclusión (2026-10-03)

Vistas PUESTAS nuevas de este kit (las de escena, con una persona sin rostro dentro de la prenda), producidas en la
corrida [`2026-10-03_uniforme-vistas`](../2026-10-03_uniforme-vistas/LEEME.md): declaradas en `usoPorVista` del catálogo
(`scripts/foto/build-prompt.mjs`), con `cuando_usarla` en el manifiesto del kit, su prompt en `brief/`, selladas en
`scripts/foto/assets.lock.json` y publicadas al canon. Si faltan en disco, `pnpm foto:prompt` las baja solo.

### Cómo las elige `pnpm foto:prompt`

No se pasan a mano: el comando elige la vista por la `silueta` de quien viste la prenda (`hombre`/`mujer`), por el
giro de su vista de identidad (`45-*` → 45°, `perfil-*` → 70°) o por `giro` en el objeto (obligatorio de espaldas),
por `camara: "baja"` y por lo que tapa la marca (`tapa`; con una sola persona se infiere de la escena). Cadena de
respaldo: oclusión → cámara baja → giro → 45° del mismo lado → frente o espalda; en cada paso, primero la de la
silueta. Imprime una línea `·` con la elegida, el motivo y las alternativas; `puesta` en el objeto fuerza otra.

**La gorra NO lleva macro**: su logotipo ya se lee grande y el macro la empujaba a redibujarlo (medido 2026-09-20). Sólo hay vistas de frente y giro (sin espalda, cámara baja ni oclusión), encuadradas de la copa a las cejas, sin rostro. Ejemplo de ficha:

```json
"objetos": [{ "objeto": "gorra-efeonce", "persona": "sophia" }]
```

### Claves y números

#### Gorra navy (logotipo) — `gorra-efeonce` (10 vistas, números v2-10 a v2-19)

| Vista (clave base) | Qué muestra | Hombre | Mujer (`-mujer`) |
|---|---|---|---|
| `frente` | de frente | v2-10 | v2-11 |
| `45-izq` | 45°, nariz a la izquierda del cuadro | v2-12 | v2-16 |
| `45-der` | 45°, nariz a la derecha | v2-13 | v2-17 |
| `70-izq` | 70°, izquierda | v2-14 | v2-18 |
| `70-der` | 70°, derecha | v2-15 | v2-19 |

Archivo: `efeonce-gorra-v2-NN-puesto-<clave>-<tam>-v01-fondo-estudio.png`. Vistas puestas previas del kit: `usoPorPersona` con las pruebas de Julio y Nexa (`out/prueba-*.png`); las demás vistas de la gorra son de producto, sin persona.

### Sumar una vista a este kit (procedimiento A)

1. Generarla **editando** una vista puesta aprobada del kit, con el macro del bordado como segunda imagen; si es un
   giro, partir del frente (un 45° de base arrastra su rotación). Entradas 3:4 padeadas a 2:3 espejando el pie.
2. Revisarla al 100 % con `pnpm foto:emblema`: esfera arriba, ventanas horizontales, letras exactas.
3. Copiarla a `final/` con la convención de nombre y declararla en `usoPorVista` con su clave
   `<giro>[-<tapa>|-bajo][-mujer]`.
4. Agregarla al manifiesto del kit (`cuando_usarla`) y su prompt a `brief/`.
5. `pnpm foto:assets:lock` → `pnpm creative:assets:publish apply` → `pnpm exec vitest run scripts/foto`.
6. Archivar la exploración con `pnpm ai-gen:archive apply --folder <carpeta>` y sumarla a la tabla de arriba.

Método completo y trampas medidas (marca rotada en el giro, oclusión esquivada, no componer sobre la vista):
[`garment-reference-kit.md`](../../.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md)
§Delta 2026-10-03.
