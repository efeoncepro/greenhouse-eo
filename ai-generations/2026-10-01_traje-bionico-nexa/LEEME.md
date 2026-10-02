# Traje biónico de Nexa — kit de referencia (2026-10-01/02)

[TASK-1940](../../docs/tasks/complete/TASK-1940-nexa-bionic-suit-reference-kit.md). El traje existía sólo como texto
dentro de las fichas de foto (`NX3`–`NX5`) y el modelo lo redibujaba en cada corrida, hasta inventarle un cohete en el
pecho. Este kit lo fija como objeto: una sola versión, con sus marcas armadas, declarada en el catálogo de
`foto:prompt`.

**Regla de uso: sólo Nexa y sólo en registro cine.** `foto:prompt` aborta si la ficha lo pide para otra persona o sin
`"registro": "cine"`.

## De dónde sale

Del plate aprobado `NX5b` (`ai-generations/2026-09-26_deck-nexa/plates/NX5b-nexa-bionica-isotipo.png`, copia en
`ref/`). Todas las vistas se **editaron** desde ahí o desde la vista frontal aprobada, nunca se generaron de cero
(editar conserva, generar reconstruye). Hoja de diseño, Nexa vestida, lentes y la escena aprobada:
canvas https://claude.ai/artifact/WqTLZG8m5yieAmTdhTgQcF.

## El traje

Body de una pieza en punto técnico navy mate; placas blancas mate en hombros, pecho (pechera + placa abdominal), brazos
y antebrazos, y una **placa dorsal** nueva (NX5b no mostraba la espalda); costuras LED azul `#0375DB`; cinturón navy;
piernas sin placas. Los **lentes biónicos**: una mica envolvente transparente apenas azul con una línea LED en el borde
superior, sin marco ni logo.

## Las marcas (decisiones del operador)

| Dónde | Qué | Técnica | Cómo se hizo |
|---|---|---|---|
| Pecho, lado izquierdo de quien lo lleva | Isotipo oficial | **Incrustado**: navy, al ras, sin borde ni relieve | `pnpm foto:isotipo … --prenda clara --acabado` (se movió «más a la derecha y hacia el pecho» el 2026-10-02) |
| Placa dorsal, entre los omóplatos | **Logo completo** «efeonce» | **Serigrafiado** en tinta navy levemente metálica | `pnpm foto:isotipo … --marca logotipo --acabado --tecnica "…"` (opción nueva de la herramienta) |

🔴 **La referencia viaja con las marcas ya armadas** **[operador, 2026-10-02: «dejarlo armado y con eso pasar la
referencia al modelo para que no lo borre ni lo reinvente»]**. Con la pechera lisa, las dos primeras escenas salieron
sin logo. Con la marca armada y el macro en escena, el modelo la copió fiel en `NX7c`, `NX7d`, `04` y `14`. Siempre se
verifica con `pnpm foto:emblema` al 100 %; `foto:isotipo` sólo si difiere. Las medidas de cada composición viven en el
manifiesto.

## Contenido de `final/` (10 vistas)

| # | Vista | Uso |
|---|---|---|
| 01 · 02 · 03 · 04 · 05 | Traje solo: frente, espalda (v02, con el logo), tres cuartos izq. y der., perfil | Construcción. 1600×1600, fondo de estudio y transparente |
| 10 | Macro de la pechera con el isotipo | Viaja como macro en toda escena; QA |
| 13 | Nexa con el traje, de frente | Documento del kit (lleva su cara) |
| 13 sin rostro | La misma, recortada bajo el mentón | **Escena**: la referencia por defecto. Sin cara para que el modelo no copie su gesto (2026-10-02) |
| 14 | Nexa con el traje, de espaldas (v02, pelo sobre el hombro, logo a la vista) | **Escena** de espaldas: `{ "puesta": "espalda" }` |
| 20 · 21 | Lentes biónicos, frente y tres cuartos | Referencia de los lentes (21 por defecto) |

`efeonce-traje-bionico-nexa-manifiesto.json` dice `cuando_usarla` por vista, la técnica de cada marca y sus medidas.

## Cómo se usa

```json
"registro": "cine",
"identidad": ["nexa"],
"objetos": [{ "objeto": "traje-bionico-nexa" }, { "objeto": "lentes-bionicos-nexa" }]
```

Escena con Sparks: **dos con referencia como máximo**, el resto lejos y desenfocado. La receta y lo que hizo cine a la
escena aprobada `NX7d` están en el [registro cine, delta 2026-10-02](../../docs/operations/brand-photography/EFEONCE_PHOTO_REGISTER_CINE_V1.md).

## Reproducir

```bash
node ai-generations/2026-10-01_traje-bionico-nexa/entrega.mjs            # out/ → final/ en 1600×1600 y 1200×1600
pnpm ai:image:rmbg final/<vista>-fondo-estudio.png final/<vista>-transparente.png
node ai-generations/2026-10-01_traje-bionico-nexa/entrega.mjs --opacar   # sólo el traje, nunca los lentes
pnpm foto:assets:lock && pnpm creative:assets:publish apply
```

Los prompts de cada vista están en `brief/`; las fichas y prompts de la escena, en `fichas/` y `prompts/`. Lo que quedó
fuera de la entrega (pilotos, la entrega preliminar de 1024 px) está en `out/`.

## Correcciones de la corrida

| Observación | Corrección |
|---|---|
| La espalda volvió con el torso de frente | Pedir la toma desde atrás con marcadores y negar el pecho: «the chest plate is NOT visible at all» |
| El matting dejó las placas blancas semitransparentes (se confunden con el fondo gris) | `entrega.mjs --opacar`: opaca el interior de la silueta y conserva los huecos reales y el borde suave |
| Las escenas con la pechera lisa salieron sin logo | La referencia lleva las marcas armadas + `macroEnUso` |
| Cinco Sparks con referencia se leían como stickers | Dos con referencia; el resto lejos y desenfocado (registro cine) |
| Pedir «three more» Sparks dio cuatro | Declarar el total: «EXACTLY THREE more (FIVE in total, never more)» |

Los aretes salen dorados en las vistas puestas (como en las anclas de Nexa), aunque su ficha pide plata; el operador
aprobó las vistas así. Es el conflicto ya registrado en el catálogo (`accesorios`).

**Costo de la corrida ≈ USD 1,3** (`gpt-image-2.5-sunburst`, `high`): ~25 generaciones y ediciones más 9 acabados de
marca a ≈ USD 0,05.

**Pendiente fuera del repo:** copia del kit en OneDrive `5. Contenidos/13- Branding/` (la hace el operador).
