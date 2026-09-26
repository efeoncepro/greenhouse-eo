# Vistas puestas de espalda en cuerpo femenino (2026-09-21)

**Detectado por el operador:** los kits tenían la espalda puesta **sólo en cuerpo masculino**. Para una
pieza con una mujer de espaldas había que elegir entre el ángulo correcto con el cuerpo equivocado, o
nada. Y la bomber no tenía **ninguna** vista de espalda puesta.

| Vista nueva | Kit | Qué cerraba |
|---|---|---|
| `efeonce-hoodie-22-puesto-espalda-mujer` | hoodie | la 16 es la misma toma en cuerpo masculino |
| `efeonce-chaqueta-softshell-17-puesto-espalda-mujer` | chaqueta | la 15 es la misma toma en cuerpo masculino |
| `efeonce-chaqueta-bomber-15-puesto-espalda-mujer` | chaqueta | **primera** espalda puesta de la bomber |

## Cómo se hicieron

**No se escribió un prompt nuevo.** Se tomó el brief verbatim de la vista de espalda que ya existía en
cada kit y se cambió **sólo el delta de la vista** —quién la lleva puesta—, que es el método que el
propio kit define: bloque base idéntico → delta → contrato de realismo → cierre de estudio.

La **estampa entró como imagen 2** en las tres: el logo y «Empower your Growth» nunca se le piden al
modelo. Por eso salieron exactos, y las tres **a la primera**.

```bash
pnpm ai:image --model gpt-image-2.5-sunburst --quality xhigh --size 1024x1536 \
  --image <kit>/final/<prenda>-02-espalda-…-transparente.png \
  --image <kit>/ref/estampa-espalda.png \
  --prompt "$(cat brief/<vista>.prompt.txt)"
```

El delta que se agregó, igual en las tres: mujer de complexión más delgada, pelo recogido sobre un
hombro **para que no tape la estampa**, sin rostro, y cómo cae la prenda unisex en un cuerpo femenino
—las costuras de hombro algo más anchas, el cuerpo suelto sobre una cintura más estrecha—.

## Segunda tanda, mismo día — los tres huecos que quedaban

| Vista nueva | Kit | Qué cerraba |
|---|---|---|
| `efeonce-polo-navy-16-puesto-espalda-mujer` | polo | la 14 es la misma toma en cuerpo masculino |
| `efeonce-chaqueta-bomber-16-puesto-espalda` | chaqueta | empareja con la femenina de la primera tanda |
| `efeonce-chaqueta-bomber-17-puesto-frente-cuerpo-b` | chaqueta | equivalente a la 16 de la softshell |

🔴 **El polo se generó SIN referencia de arte, a propósito.** Es la única prenda de **espalda limpia**
—la más formal frente a cliente— y el kit ya tenía medido que pasarle la estampa **empuja al modelo a
imprimirla igual**. En su brief la espalda limpia se declara además de forma explícita: *«no print, no
logo, no text of any kind»*. Salió limpia a la primera.

**QA del emblema:** en `bomber-17-puesto-frente-cuerpo-b` se revisó el emblema del pecho contra la
referencia del kit, recortado y ampliado, porque el espejado es el fallo recurrente documentado (6 de
21 vistas del polo volvieron invertidas). **Orientación correcta**: nave a la derecha, aletas abajo a
la izquierda, planeta arriba.

Las seis vistas de la jornada salieron **a la primera**, sin descartes.

## Entrega

Guardadas en los kits con su nomenclatura, declaradas en sus manifiestos con `cuando_usarla`, y
entregadas en OneDrive `13- Branding/{Hoodie,Chaqueta} Efeonce/v01/`.
