# Trendjacking «Formato Chile» (meme Chile angosto) — 2026-09-25

## Estado

Programado en Metricool para **Efeonce Group** (`brandId 3961547`, `America/Santiago`), en `PENDING` (no
publicado). Falta confirmar la publicación efectiva después de cada hora.

| Red | Cuenta | Hora (Chile) | Post Metricool | Estado observado |
| --- | --- | --- | --- | --- |
| Instagram | `efeoncepro` | 2026-09-25 20:00 | `382269976` | `PENDING` (`isAiGenerated: true`) |
| LinkedIn | página `urn:li:organization:20503593` | 2026-09-26 11:00 | `382269994` | `PENDING` |

Carpeta de la corrida: `ai-generations/2026-09-25_formato-chile/` (`brief/brief.md`, `prompts/plate-v1.txt`,
`piezas.json`, `QA.md`, `COPY.md`, `PROGRAMACION.md`; los PNG están fuera de git por `.gitignore`).

## Trend y evidencia

- Origen: TikTok `@secret_compte_spam`, 18-sep-2026, «How I still imagine Chile» (>2,3 M vistas). Pico 22–25 sep,
  impulsado por cuentas francesas y estadounidenses. Código: objeto estirado alto y angosto + mini-mapa de
  Sudamérica con Chile destacado + «POV: … en Chile» / «Average X in Chile».
- Marcas verificadas **leyendo sus posts** (embeds públicos de Instagram, 25-sep): Cabify Chile («POV: Pides un
  Cabify en Chile», auto convertido en torre), LG Chile (WashTower rascacielos), Google Maps (única que no estiró:
  flechas ⬆⬇ + «at its narrowest point, Chile is 90km wide»), Metro de Santiago (73.978 likes), KFC Chile (25.999),
  WOM, Rappi. Ryanair y Free, vía prensa/embed de X. Recopilación: Creapills (25-sep).
- Lección observada: las piezas con **objeto real** (Metro, KFC) superaron por mucho a las de producto estirado con
  IA; la única con idea propia fue la de Google Maps.

## Concepto

Todas las marcas estiraron su producto. Estirar es el error capital de un diseñador → Efeonce **recompone**. Escena
de estudio: el mismo KV impreso en 4:5, 1:1, 9:16 y 16:9, y un banner larguísimo y angosto donde la mujer del KV
conserva sus proporciones y sólo crece el cielo. Rutas descartadas: «una sola marca cabe en la respuesta de IA»
(claim no verificable) y «embudo chileno» (copia el gag sin lectura nueva). Mecanismo: contraste + demostración de
oficio (conecta con CMP-004 agencia creativa premium sin registrarse en esa campaña).

## Producción

- Plate: `gpt-image-2`, 1600×2000, high, 2 variantes (≈USD 0,58). Layout declarado en el prompt (tercio superior de
  pared vacía y oscura, banner en x≈80 %, pruebas en 40–64 % del alto). Se eligió v1-1; v1-2 descartada (prueba
  16:9 sin sujeto y el diseñador la tapaba).
- Capa gráfica con `pnpm foto:componer` (Bricolage en las tres voces, acento naranja `#ff6500` en «Chile»,
  selección AXIS eight-handles sobre el banner, cursor colaborador «Dirección de arte», logo SVG oficial 20 %).
  v1→v2: caja ajustada al borde real del banner y dominante subido a 4,0× la entrada.
- Skills: `design-studio`, `social-media-studio` (módulo 11), `efeonce-advertising-creative`, y las del plugin
  `/design` a pedido del operador: `design-critique` (defectos de v1), `ux-copy` (elección del copy de imagen) y
  `accessibility-review` (contrastes WCAG AA: 20,25 / 19,74 / 6,65 / 18,8 / 14,25).

## Decisiones que vale reutilizar

1. **El número de la pieza no puede contradecir lo que se ve.** El banner visible mide ≈1:13 (el riel superior
   queda en cuadro); el dato 1:24 (4.270 km / 177 km promedio) quedó sólo en el caption, no en la imagen.
2. **Sin mapa de Chile generado.** Todas las marcas usaron el mini-mapa, pero un mapa mal dibujado es el error que
   el público chileno detecta primero; el titular ya dice «Chile».
3. **«Medio internet estiró su producto»** se sostiene en marcas verificadas sin nombrarlas: no se caracteriza a
   ninguna marca ajena.
4. **Copy de dos redes conectado:** misma apertura con el dato, misma línea de oficio («Misma mujer… más cielo»),
   mismo remate de la imagen y **la misma PD con humor** («la imprenta todavía no nos contesta»). El operador pidió
   dos veces más punch; la versión final usa frases en tres tiempos y el giro al final.

## Programación

IG hoy 20:00 (vigencia del trend; 272 en best time) y LinkedIn sáb 11:00 (2.217, máximo de la ventana, sin
colisión con la cola: Grader lun 28 11:00, IG mar 29 16:00). Media PNG por el bucket
`campaigns/formato-chile-2026-09/`; readback con texto idéntico y SHA-256 del PNG re-alojado idéntico al master.
Detalle en `PROGRAMACION.md` de la corrida.

## Pendientes

- Confirmar `PUBLISHED` + `publicUrl` después de cada hora.
- Threads y 9:16 no producidos ni programados.
