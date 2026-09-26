# Método de producción — ads Brand Visibility (2026-09-21)

> **Tipo:** bitácora de producción · **Estado:** piezas producidas, **pauta no autorizada**
> **Corrida:** `ai-generations/2026-09-21_ads-brand-visibility/` · **Valores listos para copiar:** [`RECETA-POR-FORMATO.json`](../../../ai-generations/2026-09-21_ads-brand-visibility/RECETA-POR-FORMATO.json)
> **Canon que gobierna:** [lenguaje fotográfico](../brand-photography/README.md) · [reservas del plate](../brand-photography/EFEONCE_PHOTO_PLATE_SPACE_RESERVATION_V1.md) · skill `efeonce-advertising-creative`

## Qué es

Set de ads para el **Brand Visibility Grader** (`think.efeoncepro.com/brand-visibility`), anclado al
capítulo 3 de la narrativa GTM, «Lo que la IA dice de ti». **7 piezas: 5 con voz + 2 mudas.**

## Cómo reproducirlo (el camino corto)

```bash
pnpm foto:doctor                                      # ¿puede esta máquina generar?
pnpm foto:prompt <ficha.json>                         # emite el prompt + el comando con sus --image
pnpm ai:image … --prompt-file … --out <plate>.png     # el comando que imprime el paso anterior
pnpm foto:validar <plate>.png --zona-texto            # banda ≥0,28 · lecho ≥4,5:1
pnpm foto:emblema <plate>.png                         # el bordado al 100%, letra por letra
pnpm foto:componer piezas.json                        # capa gráfica + firma + QA de contraste
```

Las fichas de esta corrida están en `brief/`; el plan de composición en `piezas.json`. **Para una campaña
nueva: copiar el bloque de formato de la receta, cambiar `plate`, `lead`, `dominant` y `after`.**

## La capa gráfica, por formato **[medido]**

Lo que más cuesta descubrir son los tamaños. Aquí están, ya medidos:

| | **4:5** feed | **9:16** stories | **16:9** display |
|---|---|---|---|
| Lienzo | 1152×1440 | 1152×2048 | 2048×1152 |
| Reserva de texto | top 30% | banda 10–32% | columna izq. 42% |
| Lecho de firma | 18% | 22% | 16% |
| `top` | 0,075 | 0,10 | 0,20 |
| `textWidth` | 0,84 | 0,84 | 0,44 |
| `leadSize` | 44 | 46 | 52 |
| `dominantSize` | 175 | 190 | 158 |
| `dominantMax` | 0,62 | 0,76 | 0,44 |
| `afterSize` | 40 | 42 | 48 |
| `leadGap` / `afterGap` | 0,15 / 0,12 | 0,14 / 0,11 | 0,22 / 0,18 |
| **ratio dom/entrada** | **4,0×** | **4,1×** | **3,04×** (mínimo) |
| Cursores | local + 1 colaborador | local + colaborador + 1 **moving** | **sólo local** |
| Firma | centrada, 20% del lado corto | igual | igual |

**1:1 no se usa.** Existe en el comando pero está `sinValidar`: su lecho de 18% nunca se midió. Para
LinkedIn va 4:5, que además ocupa más pantalla en móvil.

## 🔴 La regla de las tres veces **[operador, 2026-09-21]**

**El dominante manda sólo si mide al menos 3× la entrada.** Medido sobre esta misma pieza a lo largo de
cuatro versiones:

| Versión | Ratio | Veredicto |
|---|---|---|
| v2 | **2,8×** | «la jerarquía no está bien resuelta» |
| v4 · 4:5 y 9:16 | **4,0× / 4,1×** | aprobadas |
| v4 · 16:9 | 2,9× → **3,04×** | la más apretada; se subió el dominante para cumplir |
| Caso canónico «Nivel de búsqueda» | 3,8× | referencia |

Está **cableada en `foto:componer`**: imprime el ratio en el QA y avisa bajo 3×. Avisa, no aborta —
en columna angosta el ratio compite con la legibilidad a 390 px, y ahí puede ganar la legibilidad, pero
entonces la excepción se declara **mirando el número**, no por descuido.

**Es condición necesaria, no suficiente.** La versión de 2,8× fallaba además por el color y por no tener
cierre: cumplir el ratio no salva una pieza con las otras dos cosas mal.

## Las cuatro voces, y por qué se ven distintas

| Voz | Familia | Ejemplo |
|---|---|---|
| Entrada | **Bricolage**, blanco | «Le preguntaron a **ChatGPT** por tu categoría.» |
| **Dominante** | **Bricolage**, blanco, 4× la entrada | «**No estabas.**» |
| Cierre | **Poppins 400**, blanco | «Tu competencia **sí**.» |

**Todo en blanco: sobre foto de marca el color lo pone la fotografía.** La jerarquía se construye con
**escala, familia y peso**, y entre voces vecinas hay siempre **dos ejes** de diferencia.

**La etiqueta se eliminó [operador, 2026-09-21]:** «BRAND VISIBILITY GRADER» nombraba el producto y no
aportaba al riesgo, ocupando la línea más cara de la pieza.

## Los seis hallazgos medidos (por qué las cosas están así)

1. **El dominante va en 1–3 palabras, con un CIERRE que remata.** Meter la frase entera en el dominante lo
   hace crecer a dos líneas y aplana la jerarquía: «No dijo tu nombre.» contra «No estabas.» + «Tu
   competencia sí.»
2. **La entrada es Bricolage, no Poppins.** El default del compositor es Poppins y la receta pide Bricolage.
3. **`softOnDark` (#cfe4fa) es token correcto en el contexto equivocado.** Nació para fondo FRÍO; sobre
   fotografía de marca, que es neutro-cálida por contrato, pelea con la luz de la escena.
4. **El colaborador va en `bottom-end`, nunca en `top-end`.** Arriba su etiqueta cae sobre la ENTRADA y se
   come el nombre propio: salió «Ch·SEO·PT» y «GRA·SEO». `withinCanvas` daba `true` en ambos casos.
5. **El gap entrada→dominante separa la CAJA, no el texto.** Con gaps chicos el borde superior del bounding
   box tacha la última línea de la entrada.
6. **A 390 px la 16:9 no se leía.** Sólo sobrevivía el dominante. Se corrige subiendo las voces de apoyo, y
   eso baja el ratio a 2,9×: **en columna estrecha la proporción canónica y la legibilidad compiten, y gana
   la legibilidad.**

## Dos trampas de la TOMA que costaron regeneraciones

- **El 16:9 nació sin lecho.** La ficha pedía «the near **corner** of the standing desk» y una esquina no es
  un lecho: debe cruzar el ancho entero y ser un objeto del oficio fuera de la luz. Con un road case
  cruzando el borde, el lecho pasó de fallar a **9,81** y la firma centrada de 6,75 a **11,88:1**.
- **`oclusion` no es incompatible con la reserva: lo es su dirección.** Colgando desde arriba, la banda midió
  **0,00**; desde el costado sin pasar del hombro, **0,26**; bajando además al sujeto, **0,38** ✓.

## Decisiones del operador registradas

| Decisión | Consecuencia |
|---|---|
| Uniforme **formal**: polo + bomber | El comando avisa «mezcla registros»; es decisión suya y se ignora el aviso |
| Firma **centrada** | En 16:9 obligó a rehacer el plate para que hubiera lecho al centro |
| Quitar la etiqueta de producto | Tres voces en vez de cuatro |
| **Nunca componer la marca determinísticamente**: usar las vistas oficiales del kit | Se corrigió `a2` con la vista puesta-espalda; nació el campo `puesta` |

## Lo que queda abierto

- **El emblema del pecho varía entre piezas.** Las frontales usan la vista puesta oficial y aun así el
  bordado chico deriva. El canon prohíbe publicar el emblema como sale del generador.
- **La capa gráfica sigue formalmente sin aprobar** (canon 2026-09-19), y estas piezas la usan.
- **Nada de esto está pauteado ni medido**: faltan variantes por ángulo, carrusel, video, message match
  contra la landing, eventos en GTM y plan de medios.
