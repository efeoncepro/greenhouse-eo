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

## Lo que sigue faltando **[pendiente]**

- **Polo navy**: espalda puesta en cuerpo femenino (tiene 13-frente, 14-espalda y 15-frente-cuerpo-b).
- **Bomber**: espalda puesta en cuerpo masculino, y frente en cuerpo B.

## Entrega

Guardadas en los kits con su nomenclatura, declaradas en sus manifiestos con `cuando_usarla`, y
entregadas en OneDrive `13- Branding/{Hoodie,Chaqueta} Efeonce/v01/`.
