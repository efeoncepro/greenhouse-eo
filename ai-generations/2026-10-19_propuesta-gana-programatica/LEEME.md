# Propuesta Gana · Programática omnicanal (GRD-1541) — 2026-10-19

**Estado:** borrador para revisión del operador. Logo oficial de Gana en la portada (sitio público, autorizado por el operador el 2026-10-19); faltan los campos marcados.
Canvas: https://claude.ai/artifact/Xmf8FeR6AZFjwf5yJzQAx5 · PDF: `pdf/Efeonce-Propuesta-Gana-Programatica.pdf`.

- **Documento:** propuesta (`plan-recetas.json`, validado con `pnpm brand:deck-plan -- --plan`: 0 errores, 0 avisos).
- **Línea:** Voice (acento `#f83902`, fondo Efeonce). Efeonce presta el servicio y factura; Basis es tecnología que
  Efeonce opera, no alianza.
- **Fuentes:** RFP `Alineación/4. Comercial/Licitaciones/Grupo Reditos/12. Programmatic/` + propuesta de Basis
  «Propuesta Modelos Hibrido EFEONCE 2026» (Outlook, 19-10-2026, Juan Anaya).

## Cómo se produce cada lámina

| Tipo | Láminas | Cómo |
|---|---|---|
| Receta (`pnpm brand:compose`) | 01 portada (`cover-proposal` orbit), 12 plan (`decision-plan`), 19 contraportada (`close-proposal`) | `intents/` → `out/` |
| Nativa (gramática del brochure Medios) | 02, 03, 04, 05, 10, 13, 15, 16, 17, 18 | `node native/propuesta.mjs native/html` → `shot.cjs` del deck SEO/AEO → `laminas/` |
| Reutilizada (brochure Agencia de Medios, aprobada) | 06 T-tecnologia, 07 FA-mapa, 08 G2-audiencias, 09 FJ-dooh-circuitos, 11 G4-calidad, 14 G5-medicion | copia de `2026-10-13_brochure-agencia-medios/laminas/` |
| PDF | las 19, en `deck/` | `node pdf/build-pdf.cjs` |

## Trampas medidas

- `decision-agenda` sólo existe en papel y una pieza de línea no-Growth no puede ir en papel
  (`line-piece-keeps-efeonce-dark`): la agenda es nativa, como el índice del brochure Medios.
- `content-measure` y `content-focus` son variantes: el plan acepta una sola (`variant-both-in-deck`).
- Deck de Basis: CTR total 0,27 % no cuadra con sus números (0,30 %); el escenario ideal traía audiencias de otro
  cliente («autos eléctricos», «emprendimiento»): se usaron las del escenario base.

## Pendientes

honorarios Efeonce `[MONTO]` · nombres del
equipo · dos experiencias certificadas · Excel de ubicaciones DOOH de Basis · hora de cierre del 20-10.

## Versión 2 (2026-10-19, 23 láminas)

Cubre todo el deck de Basis desde la perspectiva de Efeonce. Nuevas nativas: 06 ventajas (categorías sensibles,
presencia en la región, DOOH LATAM, tecnología propia y API), 07 clientes de Basis en apuestas (8 logos de su lámina 13,
pasados a blanco monocromo con `logos/basis-clientes/blanco.cjs`; atribuidos como clientes de la plataforma, no de
Efeonce), 09 integraciones y 19 respaldo de Basis (servicios, Academy, documentación y canales). Lámina 04 con logos de
Efeonce y Basis; portada con el cursor «Efeonce» sobre el logo de Gana. Fuera a propósito: negociación de fees con Basis,
nota de que su 5 % es revisable y la propuesta whitelabel AMX. Fuente de los logos: adjunto PPTX de Basis en la caché
local de Outlook. Versión de 19 láminas en `deck-v1-19/`.

## Versión 3 (2026-10-20, 24 láminas)

- **14 · Gana en el Metro (simulación):** foto real de la Estación Bello (Wikimedia Commons, Minoh09, CC BY 4.0,
  `metro/FUENTE-foto.txt`) + pantalla colgada agregada con `pnpm ai:inpaint image` (gpt-image-2.5-flare, zona
  protegida idéntica bit a bit, USD 0,07; `metro/inpaint/`) + pieza de Gana compuesta exacta encima (sin IA sobre texto
  ni logo; `metro/gana-dooh.html`). La pieza adapta la campaña vigente de Gana en Instagram («Jugar bien, es jugar en
  Gana», $5.439 millones, 26.517 ganadores, 12–18 oct 2026). Gana no tenía anuncios activos en la biblioteca de Meta
  para Colombia. Atribución CC BY en la nota de la lámina.
- **13 · DOOH para Gana:** zonas objetivo de Medellín (sistema Metro, aeropuertos, centros comerciales, mobiliario,
  vallas) marcadas como no confirmadas; TransMilenio y El Dorado sólo si hay cobertura nacional.
- Correo a Basis pidiendo el Excel de ubicaciones: `CORREO-BASIS-UBICACIONES.md` (el conector Outlook sólo tiene
  permisos de lectura; lo envía Julio).

## Versión 4 (2026-10-20, 25 láminas)

- **15 · Más ubicaciones en Medellín (simulación):** estadio Atanasio Girardot (vallas LED de cancha + videomarcador;
  foto User34790, CC BY-SA 4.0), estación Aguacatala (pantalla sobre torniquetes; Jorge Láscar, CC BY-SA 2.0) y C. C.
  Santafé (pendón curvo del atrio; Xemenendura, CC BY-SA 4.0). Imágenes intervenidas bajo la misma licencia.
- **Acabado:** `ai:inpaint` con `gpt-image-2.5-sunburst` sobre cada composición; Sunburst reescribe texto chico, por eso
  la salida final traslada sólo su luz a la pieza exacta: `metro/tools/transfer.cjs` (texto grande, sigma 8) y
  `transfer-light.cjs` (texto chico: sólo luz difusa + derrame). Pendón curvo: `warp.cjs` por franjas + recorte por
  color (cian del pendón y sus letras claras) para dejar plantas y focos delante. Bello rehecho con el mismo acabado.
- **Trampa medida:** un PNG de máscara de un canal se lee con 3 canales en sharp si no se usa `extractChannel(0)`;
  los índices quedan desalineados y la máscara sale vacía o corrida.
- Costo IA total de las simulaciones ≈ USD 0,50.

## Versión 5 (2026-10-20, 28 láminas; PDF sin regenerar por instrucción del operador)

- **11 · Display y mobile, 12 · Video y TV conectada, 13 · Audio digital y native:** cubren los formatos del RFP fuera
  de DOOH con la gramática de las nativas del brochure Medios (`formatos.mjs`), pero con piezas de Gana en vez de la
  marca de ejemplo. Generador: `native/formatos-gana.mjs`; piezas: `native/gana-ad.mjs` (leaderboard 728×90, 300×250,
  interstitial, 320×50, video/CTV 16:9, miniatura y tarjeta native), que adaptan la campaña vigente («Jugar bien, es
  jugar en Gana» y Súper Chance) con la línea legal +18. Rotuladas «Simulación con piezas de campaña de Gana»: no son
  piezas aprobadas por Gana.
- Cumplimiento renumerado: formatos 10 a 13 · 15 a 18; cobertura 16 · 17 · 18 · 25; equipo 23 · 24; servicio 20 · 21 · 22;
  económica 26. Deck de 25 láminas guardado en `deck-v2-25/`. `pdf/` sigue siendo el de 25 páginas hasta que el operador
  pida exportar.
- **26 · Propuesta económica (20/10):** fee de gestión COP 4.500.000/mes fijo, implementación incluida, medios
  COP 30.000.000/mes; excepción al piso aprobada por Julio y registrada en el README del expediente GRD-1541.
- **PDF final (20/10):** `pdf/Efeonce-Propuesta-Programatica-Gana-GRD-1541.pdf`, 28 páginas, copiado a la carpeta OneDrive de la licitación (hash verificado).
