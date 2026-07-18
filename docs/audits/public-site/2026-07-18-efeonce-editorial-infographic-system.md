# Auditoría del sistema de infografías editoriales Efeonce — 2026-07-18

## Alcance

Revisión visual y técnica de siete SVG históricos usados en tres artículos de Marketing con Manzanitas, contraste
con ejemplos editoriales oficiales de Semrush, inspección del sello URL de Artifact Composer y auditoría de los
SVG source del pillar privado “El fin de la web solo para humanos”.

Esta auditoría describe el estado observado el 2026-07-18. El canon operativo resultante vive en:

- `.codex/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`
- `.claude/skills/content-marketing-studio/efeonce/EFEONCE_EDITORIAL_INFOGRAPHIC_SYSTEM.md`

## Muestra Efeonce

- `https://efeoncepro.com/inbound/estrategia-de-contenidos/`
- `https://efeoncepro.com/inbound/genera-leads-con-marketing-de-contenidos/`
- `https://efeoncepro.com/inbound/seo-inbound-marketing/`

Activos únicos observados: `Reutilizacion-2.svg`, `Topic-Cluster.svg`, `golden-circle.svg`, `eeat-ymyl-1.svg`,
`flywheel.svg`, `loop-hi.svg` y `messy-middle.svg`.

## Hallazgos visuales

1. La familia comparte campo blanco, tinta navy, acentos intensos, geometría plana, título fuerte y firma, pero
   cada argumento recibe una composición distinta.
2. Los arquetipos dominantes son metáfora, red, comparación, ciclo, loop y recorrido. La serie se reconoce sin
   convertir todas las piezas en la misma grilla.
3. La densidad es semántica: una forma central comprime el mecanismo; el copy se edita para navegarla. No hay
   abundancia de tarjetas, burbujas ambientales, glass ni fondos decorativos.
4. La paleta núcleo observada es navy `#022A4E`, azules `#023C70`, `#024C8F`, `#0375DB`, naranja `#F55D01`,
   plomos `#263448`/`#505964` y blanco. Magenta `#BB1954`, púrpura `#633F93`, gris y verde actúan como acentos
   semánticos. Colores HubSpot en `flywheel.svg` son contexto, no core Efeonce.
5. El footer histórico usa `efeonce.cl`. Para piezas nuevas debe sustituirse por el sello canónico
   `src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg` (`efeoncepro.com`), conservando el asset
   original como source único.

## Hallazgos técnicos y peso

Los siete SVG históricos tienen `viewBox`, no contienen `<text>` vivo —la tipografía está convertida a paths—,
no usan filtros y solo `messy-middle.svg` usa un gradiente. El servidor entregó SVG comprimido.

| Asset | SVG raw | Transferencia SVG comprimida | WebP 1200 q88 comparativo | Ventaja SVG aproximada |
|---|---:|---:|---:|---:|
| Reutilización | 249,843 B | 47,822 B | 101,690 B | 2.1× |
| Topic Cluster | 56,872 B | 12,365 B | 66,262 B | 5.4× |
| Golden Circle | 268,303 B | 39,030 B | 85,216 B | 2.2× |
| EEAT/YMYL | 163,464 B | 24,302 B | 71,044 B | 2.9× |
| Flywheel | 55,880 B | 22,248 B | 70,800 B | 3.2× |
| Loop | 41,879 B | 14,912 B | 68,610 B | 4.6× |
| Messy Middle | 42,577 B | 14,770 B | 82,862 B | 5.6× |

Conclusión acotada: en esta familia vectorial, SVG directo fue más liviano y más nítido que el WebP comparable.
No implica que SVG gane con fotografía, texturas, filtros complejos o todos los runtimes.

## Benchmark Semrush

Fuentes primarias revisadas:

- `https://www.semrush.com/blog/infographic-examples/`
- `https://www.semrush.com/blog/content-marketing-tips/`
- `https://www.semrush.com/blog/types-of-content-marketing/`

Los ejemplos oficiales refuerzan un patrón útil: póster autocontenido, título grande, recorrido inequívoco,
forma organizadora dominante y chrome de marca/URL constante. El cuerpo cambia según proceso, camino, ciclo,
comparación o presentación de datos. Esto se adopta como principio, no como trade dress a copiar.

## Diagnóstico de los SVG Web Agéntica actuales

Se ejecutó:

```bash
pnpm content:editorial-svg:audit -- \
  ai-generations/2026-07-18_web-agentica-pillar/source/*.svg
```

Resultado sobre 12 variantes: sin findings bloqueantes; peso raw entre 10,654 y 15,799 B, Brotli estimado entre
3,797 y 4,229 B. Todas quedaron en `WARN` porque contienen texto vivo y un filtro. Por lo tanto:

- son fuentes extraordinariamente livianas y buenas candidatas para SVG directo;
- todavía deben tratarse como **source SVG**, no como delivery portable definitivo;
- antes de servirlas directamente se debe controlar/contornear tipografía, revisar si la sombra/filtro aporta y
  volver a verificar bounding boxes, `viewBox`, light/dark y columna real.

El gap creativo es independiente del peso: V02 y V04 repiten una gramática de cards escalonadas. Para elevar la
serie, la siguiente iteración debe conservar el shell y reasignar cada argumento a un arquetipo semántico propio.

## Decisión resultante

- shell estable + cuerpo semántico variable;
- SVG directo evaluado primero para infografías vectoriales;
- source SVG separado de delivery SVG saneado;
- raster solo por contenido, destino, seguridad o victoria medida de peso;
- sello `efeoncepro.com` consumido desde Artifact Composer;
- contrato, preset JSON y auditor automatizado compartidos por Codex/Claude;
- producción privada y QA contextual antes de cualquier publicación.

## Addendum v7 — 2026-07-18

La auditoría anterior preserva el corte source inicial. La v7 posterior produjo siete conceptos × cuatro
variantes (`28` delivery SVG), firma completa únicamente en footer y media IDs `251514–251541`. El auditor de
archivo reportó `28/28 PASS`; la familia suma aproximadamente `5.67 MB` raw, `777 KB` gzip y `519 KB` Brotli.
Una muestra CDN respondió `200`, `image/svg+xml`, `nosniff`, Brotli y cache anual, confirmando que SVG directo
sigue siendo correcto para este body vectorial.

La auditoría de cierre encontró deuda que el PASS de archivo no cubre:

- el screenshot del builder inspecciona source, no delivery trazado;
- la escala proyectada puede dejar texto bajo `16 CSS px` y notas bajo `12–14 CSS px` en columna real;
- el fixture contextual vigente corresponde a visuales anteriores, no a las siete piezas v7;
- el ratio mobile difiere del fallback desktop y requiere medición de `currentSrc`/LayoutShift;
- ALT breve + caption debe complementarse con descripción larga equivalente para diagramas complejos;
- manifest, build report y spec aún duplican metadata y no registran toda la toolchain/evidencia.

Resultado: `integrated_private`, no `contextually_verified`. La publicación sigue bloqueada hasta QA v7 real.
El canon detallado se promovió a
`docs/operations/public-site-content-factory/EDITORIAL_INFOGRAPHIC_OPERATING_MODEL_V1.md`.
