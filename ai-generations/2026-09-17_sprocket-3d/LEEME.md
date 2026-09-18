# Sprocket de HubSpot 3D — biblioteca de «poses» (2026-09-17)

Pedido del operador: distintas «poses» del sprocket de HubSpot en 3D para usarlas luego en piezas, con el mismo método
que Clawd y Codex.

> **Uso interno hasta aprobación de HubSpot.** El sprocket es marca registrada. Las guías para partners prohíben
> modificar el logo y piden enviar un boceto por formulario (revisión 7–10 días hábiles) para usar el sprocket; prefieren
> las insignias de partner. Estos renders sirven para bocetos y solicitudes de aprobación. No publicar ni pautar sin
> aprobación escrita. Fuentes: https://www.hubspot.com/partners/promotion-guidelines ·
> https://legal.hubspot.com/tm-usage-guidelines

**Destino OneDrive:** `5. Contenidos/14. Mascotas de partners/Sprocket (HubSpot)/`
- `LEEME - uso interno hasta aprobacion HubSpot.txt`
- `Fuente oficial/` — `hubspot-sprocket-oficial.svg` (copia de `public/images/logos/axis/hubspot-isotype.svg`, `#FF5C35`) + silueta de referencia.
- `Poses 3D/v01/` — 8 ángulos × (`-fondo-estudio.png`, `-transparente.png`).
- `Poses 3D en contexto/v01/` — 8 escenas (`-escena.png`); con transparente las de fondo gris (cable, pedestal, carpetas, en mano). La vitrina no lleva transparente (el recorte elimina el vidrio).

## Método

1. **Geometría oficial primero:** SVG del repo renderizado como silueta de referencia; prompt que enumera la geometría
   (aro abajo a la derecha, barra corta hacia arriba, barra larga arriba a la izquierda con el nodo mayor, barra corta
   abajo a la izquierda con el nodo menor) y prohíbe cambiar proporciones o agregar engranajes/texto.
2. **Material:** extrusión sólida de grosor uniforme (~¼ del ancho del aro), bisel mínimo, esmalte mate `#FF5C35` sin
   variaciones de color. Mismo estudio que las mascotas.
3. **Base validada** (frente y tres cuartos) contra la silueta; luego base 3D + silueta como referencias de las 16 poses.
4. **Recorte:** `pnpm ai:image:rmbg`. El piso en sombra visto a través del aro en la vista cenital se rellenaba como
   si fuera objeto; se corrigió la regla de `scripts/ai/fill-alpha-holes.ts` (gris neutro del fondo en sombra = fondo) con prueba.

## Ángulos

01 frente héroe · 02 tres cuartos izquierda · 03 lateral pronunciado (se pidió de canto; se renombró por honestidad) ·
04 contrapicado monumental · 05 cenital plano · 06 flotando · 07 rodando sobre el canto · 08 tres cuartos trasero (espejo).

## En contexto

01 cable conectado al nodo mayor · 02 sobre pedestal navy · 03 en vitrina · 04 pin de solapa sobre tela navy ·
05 sobre escritorio navy con laptop desenfocada · 06 sobre carpetas ordenadas · 07 halo naranja sobre navy · 08 en mano.
El logo nunca se altera en las escenas.

## Límites

- Interpretación 3D de una marca registrada: sólo con aprobación de HubSpot para uso publicado.
- El pin muestra el broche plateado a través del aro (físicamente plausible; revisar si se usa).
