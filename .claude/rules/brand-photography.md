---
paths:
  - "scripts/foto/**"
  - "docs/operations/brand-photography/**"
  - "ai-generations/**"
---

# Fotografía de marca Efeonce — invariantes (auto-load por path)

Carga [`design-studio` → lenguaje fotográfico](../skills/design-studio/references/efeonce-photographic-language.md)
y el [índice del canon](../../docs/operations/brand-photography/README.md) **antes de escribir un prompt**. La
sesión que reconstruyó el oficio a pedazos en vez de cargar la skill perdió un día entero y ~USD 5
(`ai-generations/2026-09-20_formatos-catalogo/ESTADO.md`).

## Los tres comandos. NUNCA a mano

```bash
pnpm foto:doctor                    # ¿puede esta máquina generar? seis chequeos, sin costo
pnpm foto:prompt <ficha.json>       # arma el prompt desde la ficha
pnpm foto:validar <plate.png>       # mide las seis reservas sobre el plate limpio
```

**NUNCA armes un prompt de foto de marca concatenando bloques a mano.** Es la vía por la que «Vertical 4:5.»
vivió dentro del bloque de realismo compartido sin que nadie lo viera. El comando resuelve desde tablas:

| Campo de la ficha | Qué resuelve |
|---|---|
| `formato` | tamaño, % del lecho y límite de sujetos, de UNA tabla |
| `identidad` | bloques `IDENTITY` + `REFERENCES` verbatim, con **vista por ángulo** (`{ persona, vista }`) |
| `objetos` | kits de marca como **referencia de forma** (logo, mascota, prenda, merch), numerados tras la identidad |
| `palanca` | **una** palanca de encuadre: `pov` · `manos` · `luz-motivada` · `larga-exposicion` · `oclusion` |
| `atmosfera` | `polvo` · `bruma` · `vapor` · `humo` — aire con materia que hace visible la luz |
| `suspendido` | qué está congelado en el aire |
| `lecho` | objeto y **tono declarado** del primer plano desenfocado |

## Reglas duras que el comando ya hace cumplir (no las repitas a mano, no las esquives)

- **Identidad:** el set de Julio es `2026-09-20_identidad-julio-nexa/refs-aprobadas/` (+ 6 ángulos derivados).
  El set viejo de `2026-09-17_equipo-vestuario/` **idealizaba el rostro** y arrastraba deriva.
- **`ignore their clothing` NO alcanza:** con identidad, **declara el vestuario en la escena** o el modelo copia
  la ropa de las referencias. El comando avisa.
- **Editar conserva, generar reconstruye.** Para un ángulo nuevo de una persona, **edita su foto aprobada**;
  generar desde cero redondea el rostro (cuatro iteraciones lo probaron).
- **Marcadores verificables, no magnitudes.** «Gira 45 grados» da una cabeza inclinada; «la oreja lejana no se ve,
  el puente de la nariz corta la mejilla lejana» da el tres cuartos real.
- **Una palanca dominante por pieza.** Combinar dos las diluye: cada una pide el control de la escena.
- **La atmósfera exige un haz declarado** (el comando aborta sin él) y **la acción suspendida tiene dosis: 1 de
  cada 4 piezas** (el comando cuenta la tanda y avisa con el número).
- **La luz con carácter va sobre el SUJETO; la reserva vive en la sombra que esa luz deja, nunca en su camino.**
  Vale también para el **lecho**: medido, 3,16 → 3,93 → **11,55:1** sólo por sacarlo del haz.
- **Nunca un scrim.** Si el contraste no da, se **regenera** el plate; no se oscurece en post.
- **El plate nace sin logo ni texto.** La firma es el SVG oficial compuesto después, **20% del lado corto del lienzo**
  (decisión del operador 2026-09-20), contraste ≥ 4,5:1 medido.
- **Tope de tanda:** más de 6 fichas exige que cada una declare un `piloto` ya generado en disco. La calidad sale
  de generar poco y **mirar cada plate**.
- **Nunca ancles la serie en la categoría de un cliente** (pintura = Berel). El comando aborta.

## Los assets viven fuera de git — y el lock los vigila

Los renders de referencia y los kits pesan **640 MB** y están en `.gitignore`. Viven en la máquina y en OneDrive
(`5. Contenidos/13- Branding/` y `14. Mascotas de partners/`). Lo que **sí** está versionado es
`scripts/foto/assets.lock.json`: la huella SHA-256 de los **54** assets que el catálogo declara.

```bash
pnpm foto:assets:check   # ¿el catálogo y el lock coinciden?
pnpm foto:assets:lock    # resella el lock (tras agregar un kit o cambiar un asset a propósito)
```

Para qué sirve:

- **CI verifica el catálogo sin descargar nada.** Si agregas un kit con la ruta mal escrita, falla ahí.
- **Detecta que tu copia local difiere de la aprobada.** `pnpm foto:prompt` avisa antes de generar, y
  `pnpm foto:doctor` lo chequea entre sus pasos. Sin esto, una copia derivada produce una pieza con una
  referencia que el equipo nunca aprobó, y nada lo delata.

**Si agregas un kit o una vista al catálogo, resella el lock y commitéalo**, o el test lo marca como faltante.

## Al cerrar

`pnpm foto:validar` sobre el plate limpio y **mirar la imagen al 100%**: identidad contra la referencia, emblema
letra por letra, y que no haya texto ni marcas de terceros. Un contraste que pasa no prueba que la pieza esté bien.
