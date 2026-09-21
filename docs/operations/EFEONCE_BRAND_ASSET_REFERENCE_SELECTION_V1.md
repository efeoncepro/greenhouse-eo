# Selección de referencias de marca para generación — V1

> **Tipo de documento:** Contrato operativo de producción
> **Versión:** 1.0 · **Creado:** 2026-09-21 por Claude, dictado por el operador (Julio Reyes)
> **Aplica a:** toda pieza generada donde aparezca un asset de marca Efeonce — ropa corporativa, lanyard,
> merch, logo 3D, isotipo 3D, nave, mascotas de partners
> **Relacionado:** [guía de kits](social/EFEONCE_BRAND_KITS_USAGE_GUIDE_V1.md) · [kit de prendas](../../.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md) · [lenguaje fotográfico](brand-photography/README.md) · [caso fuente](../../ai-generations/2026-09-21_lanyard-deterministico/LEEME.md)

## 0. Las dos frases que gobiernan este documento

> **«Tienes muchísimas referencias de la ropa corporativa en distintos ángulos y formas para asegurar
> consistencia y resultados impecables; sólo debes —tú y los demás agentes— aplicar la correcta para
> alcanzar el resultado.»** — operador, 2026-09-21

> **«Si se quieren resultados óptimos debes armar la composición con todos sus elementos sensibles
> aparte y luego juntarlos pasando la referencia al modelo.»** — operador, 2026-09-21

El problema nunca fue que faltaran assets. **Faltaba elegir el correcto.** Y cuando la pieza lleva una
marca, ni el asset correcto basta: hay que **componerla** y dejarle al modelo sólo el acabado.

## 1. Lo que existe hoy **[inventario medido 2026-09-21]**

**279 archivos en `final/` repartidos en 10 kits**, sin contar `out/` ni `ref/`. Nadie tiene que
inventar una vista: casi siempre ya está.

| Kit | Archivos | Vistas distintas | Manifiesto | Pruebas en persona |
|---|---:|---:|:---:|---|
| `2026-09-17_efeonce-ship-3d` (nave) | 76 | 24 | — | — |
| `2026-09-17_chaqueta-efeonce` | 36 | 16 | sí | — |
| `2026-09-17_hoodie-efeonce` | 35 | 21 | sí | — |
| `2026-09-17_polo-efeonce` | 34 | 15 | sí | — |
| `2026-09-17_gorra-efeonce` | 24 | 6 | sí | **`prueba-julio`, `prueba-nexa`** |
| `2026-09-17_lanyard-efeonce` | 23 | 14 | sí | **`prueba-julio`, `prueba-nexa`, `prueba-julio-carnet`** |
| `2026-09-17_clawd-poses-3d` (mascota) | 16 | 8 | — | — |
| `2026-09-17_codex-poses-3d` (mascota) | 16 | 8 | — | — |
| `2026-09-17_sprocket-3d` (mascota HubSpot) | 16 | 8 | — | — |
| `2026-09-17_efeonce-logo-3d` | 414 archivos en `kit/`, por **escala × color** | — | LEEME | `prueba/` |

Los kits 3D traen **ocho poses o ángulos** cada uno —frente héroe, tres cuartos izquierda y derecha,
perfil, contrapicado, cenital, espalda, y una de acción— **cada una con fondo de estudio y
transparente**. El logo 3D está además resuelto por **escala** (pequeña, mediana, grande, monumental)
**y color** (blanco, navy), porque una pieza monumental y una de sobremesa no se iluminan igual.

## 2. Las tres clases de asset, y para qué sirve cada una

🔴 **No son intercambiables.** Confundirlas es lo que hace que el modelo reinvente la marca.

| Clase | Qué es | Para qué | Ejemplos |
|---|---|---|---|
| **Arte plano** | el diseño en vectorial o plano, sin volumen | **PRODUCIR** una vista nueva del kit | `ref/arte-cinta.png`, `ref/arte-carnet-*.png`, `public/branding/SVG/*` |
| **Pieza aislada** | la pieza sola, recortada, sobre transparente | **CONSTRUIR** un armado o un bodegón | `…-01-frente-…-transparente.png` |
| **Pieza en uso** | la pieza **puesta en una persona** o el **producto terminado** fotografiado | **USAR** la pieza en una escena | `…-04-puesto-…`, `out/prueba-julio.png`, `…-14-conjunto-deterministico-…` |

**Regla:** para **vestir a alguien o poner la pieza en una escena, la referencia es la clase «en
uso»**. El arte plano y la pieza aislada son assets de taller.

### Por qué, medido

| Qué se le pasó al modelo | Resultado |
|---|---|
| El logotipo **descrito con palabras** | un borrón con forma de flecha |
| El **arte plano** de la cinta | «Empower your Growth» salió bien; el logotipo, ilegible |
| **Composición determinística** del arte sobre el trazado | encaja el arte correcto, pero a 22 px de ancho de cinta el logotipo queda en ~15 px: mancha igual. **El límite es de escala física, no de método** |
| La **foto del producto terminado** | «efeonce» legible con la nave en la «o», el eslogan limpio, y apareció el regulador negro que la pieza real tiene |

**Confirmado en los dos kits y con las dos personas** **[2026-09-21]**:

| Prueba | Asset usado | Resultado |
|---|---|---|
| Nexa, terreno | `gorra/out/prueba-nexa.png` | logotipo completo legible e isotipo del polo correcto, **a la primera** |
| Julio, terreno | `gorra/out/prueba-julio.png` | ídem, **a la primera** |
| Julio, reunión | conjunto determinístico terminado | logotipo de la cinta legible, **el mejor de cinco intentos** |

En la **gorra** ocurrió lo mismo el mismo día: tres intentos peleando un problema que ya estaba
resuelto en `out/prueba-julio.png`, un asset que llevaba días en el kit sin usarse, y cuyo propio
LEEME decía que ahí «el logotipo se mantiene legible y el emblema conserva su orientación».

## 3. Cómo se elige la vista correcta

**Nunca por costumbre ni por la que aparece primero en la lista.** Cuatro preguntas, en orden:

1. **¿Qué rol cumple la pieza en la escena?** El manifiesto de cada kit declara `cuando_usarla` por
   vista. La gorra tiene cinco variantes con rol distinto: la de continuidad con el sitio no es la de
   terreno, que es la trucker navy.
2. **¿Desde qué ángulo se ve?** Si el sujeto está de espaldas, la referencia es la espalda. Si la
   chaqueta va abierta, es la vista de cierre abierto, no la de frente.
3. **¿Cómo se usa?** Sobre otra prenda se pasan **ambas**, interior y exterior, como referencias
   separadas.
4. **¿Hay una prueba en persona?** Si el kit la tiene, **ésa es el punto de partida**, no un extra: ya
   resolvió calce, orientación y legibilidad.

> **La prueba en persona arregla dos cosas a la vez** **[medido 2026-09-21]**. Esas pruebas son de
> **cuerpo entero**, así que usarlas como asset de uso cumple de paso la regla de
> [`garment-reference-kit`](../../.claude/skills/greenhouse-ai-image-generator/references/garment-reference-kit.md)
> §«vestir a una persona real»: *«nunca sólo retratos, pasar siempre al menos una foto de cuerpo
> entero»*. Pasar tres retratos es exactamente lo que hace al modelo **construir el cuerpo desde la
> cara** y sacar la cabeza más grande que el cuerpo. Se estaba incumpliendo sin darse cuenta.

### Y el registro manda sobre la variedad visual

Para ropa corporativa, la prenda dice el **registro** de la escena **[operador, 2026-09-20]**: polera
piqué = oficina casual · chaqueta = reunión o instancia importante · gorra + polo = terreno · hoodie =
terreno · lanyard y carnet = transversales. **Se elige por el registro, nunca por variar.**

## 4. Cuando la pieza lleva marca: componer, no generar

**Un modelo no sostiene una marca.** Medido el 2026-09-20 en prendas (tres prendas dieron tres
emblemas distintos y ninguno era el de Efeonce) y el 2026-09-21 en el lanyard (cuatro pasadas, cuatro
logotipos). No se arregla pidiéndoselo mejor: **se arregla no pidiéndoselo**.

| Paso | Qué se hace |
|---|---|
| 1 | **Separar lo sensible** —marca, texto exacto, cifra, arte oficial— y componerlo desde su archivo oficial |
| 2 | **Armar** la pieza con esas partes ya resueltas; lo neutro (herrajes, marcos) en SVG plano |
| 3 | **Pasarle el armado al modelo** pidiéndole **sólo material y luz**: tejido, relieve de serigrafía, plástico, metal, acrílico, sombras de contacto. El prompt repite que las marcas no se tocan |
| 4 | **Mirar el resultado al 100%** antes de usarlo — `pnpm foto:emblema` para bordados |

Comando: **`pnpm foto:lanyard --nombre "<N>" --cargo "<C>" --foto <retrato.png> [--generar]`**.

### El orden de preferencia cuando la marca debe leerse fiel

1. **Componerla** (lo plano y rígido: carnet, tarjeta, etiqueta, firma).
2. **Pasar la pieza en uso** como referencia (tela, volumen, caída).
3. **Que no se lea** —de espaldas, en sombra, pequeña— sólo si la pieza se reconoce por otra cosa.
4. **Editar con máscara** partiendo del kit.

**Nunca:** publicar una marca tal como sale del generador.

## 4 bis. Cuándo hace falta armar, y cuándo NO **[operador, 2026-09-21]**

🔴 **Armar sólo cuando la pieza lleva algo que CAMBIA por persona u ocasión.** Si lo que lleva es
**fijo**, ya está resuelto en el kit y el trabajo es **elegir la vista**, no reconstruirla.

| Pieza | ¿Qué lleva? | ¿Hay que armar? |
|---|---|---|
| **Lanyard** | el **carnet**, que cambia por persona — Julio, Nexa, cada quien el suyo | **Sí.** No puede existir una vista fija: se arma cada vez con `pnpm foto:lanyard` |
| **Hoodie** | la estampa de espalda: logo + «Empower your Growth», **siempre la misma** | **No.** Se compuso una vez con `estampa-espalda.mjs`, entró como referencia a las 35 vistas del kit y quedó lista — incluida `16-puesto-espalda`, con la estampa impecable sobre la prenda puesta |
| **Polo, chaqueta, gorra** | emblema o logotipo **fijo** | **No.** Mismo caso que el hoodie |

**Este documento nació de un error de esta clase y estuvo a punto de repetirlo.** Tras resolver el
lanyard se anotó «el parche de la espalda del hoodie es el siguiente candidato» — y el operador
corrigió en el acto: *«el hoodie ya está así con el logo y eslogan armado y listo»*. Tenía razón; se
propuso reconstruir lo que llevaba días resuelto, que es exactamente el error que este contrato existe
para evitar.

**La pregunta que hay que hacerse antes de armar nada: ¿lo que lleva esta pieza cambia según quién la
use o la ocasión? Si la respuesta es no, abre el kit.**

## 5. Las proporciones se calculan del objeto real

**Ninguna medida se estima a ojo.** Dos correcciones del operador el 2026-09-21, ambas detectadas a la
primera sobre un render:

| Medida | A ojo | Real | Cómo se calcula |
|---|---|---|---|
| Unidad del patrón de la cinta | 3,4 × el ancho → *«logo alargado y achatado»* | **7,05 ×** | `ANCHO × (unidad_del_arte / alto_del_arte)` |
| Diámetro del yoyo | 2,5 × el ancho de la cinta | **1,6 ×** | 32 mm ÷ 20 mm reales |

Rima con la corrección de la gorra —*«muy grandes las gorras»*— que ya había dejado cinco marcadores
de calce escritos en su LEEME. **El tamaño se ancla a un objeto del mismo cuadro, no a centímetros:**
«no más ancho que un tercio del panel del pecho, apenas más ancho que el carnet que cuelga en la misma
toma».

## 6. Antes de escribir el prompt

🔴 **Abrir el `LEEME.md` y el manifiesto del kit.** No es prolijidad: es el paso que evita reconstruir
mal lo que ya está resuelto. El 2026-09-20 tres intentos fallidos de vestir a alguien con la gorra
tenían sus tres respuestas dentro del propio kit, a un `cat` de distancia. El 2026-09-21 el lanyard
repitió el patrón: el aviso existía, se emitía en cada prompt, y se ignoró.

**Un aviso más no arregla un aviso ignorado.** Lo que sí funciona es convertirlo en algo que hay que
**mirar** (`pnpm foto:emblema` recorta y amplía) o en algo que el comando **resuelve solo** (la vista,
el color, el tamaño heredado, el armado determinístico).
