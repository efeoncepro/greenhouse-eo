# TASK-1975 — Tarjeta de cifra de Efeonce Insights: dirección visual aprobada

## Mode and source

- Mode: `source-led`, sobre la dirección aprobada de TASK-1889
  ([`TASK-1889-efeonce-insights-premium-catalogs-direction.md`](./TASK-1889-efeonce-insights-premium-catalogs-direction.md)).
- Durable source: hojas versionadas en este repo, exportadas del canvas aprobado el 2026-10-03:
  - [`Premium-Cifras.png`](./TASK-1889-efeonce-insights-premium-catalogs/paginas/Premium-Cifras.png) y
    [`Deck-Cifras.png`](./TASK-1889-efeonce-insights-premium-catalogs/paginas/Deck-Cifras.png) — **las dos hojas
    aprobadas a tamaño nativo** (A4 794×1123, lámina 1280×720), junto a las 41 de TASK-1889 porque son el mismo
    sistema: la referencia contra la que se mide la fidelidad de `report-figure-stat` e `insights-figure-stat`.
  - [`TASK-1975-efeonce-insights-stat-card/`](./TASK-1975-efeonce-insights-stat-card/) — el resto del canvas:
    - `Premium-Cifras-Una.png` y `Deck-Cifras-Una.png`: la retícula con una sola cifra (Sky y Berel IA).
    - `Premium-Cifras-Ledger.png`, `Deck-Cifras-Ledger.png`, `Premium-Cifras-Destacada.png` y
      `Deck-Cifras-Destacada.png`: las direcciones descartadas.
    - `Cifras-Anatomia.png`: anatomía de la tarjeta y sus estados.
    - `Tokens-Figuras.png`: los roles de color de waffle, dona, apiladas y el paso «Sumó».
    - `Cifras-y-Graficos.png`: la norma de cómo conviven tarjetas y gráficos en un capítulo.
    - `fuente-canvas-2026-10-03.tar.gz`: fuentes `.dc.html` del canvas y `render-referencia.mjs`, que regenera las
      hojas desde la raíz del repo. Va empaquetado para que el escaneo de Tailwind no lea su marcado.
- Provenance / approval: canvas «TASK-1975 · Tarjeta de cifra» (Artifact de tipo Design, privado del operador,
  <https://claude.ai/artifact/9q7nThMhdphN5j8f3K3cbB>). El operador aprobó el 2026-10-03, en tres pasos: los colores
  semánticos de la variación (pedidos en un comentario sobre la retícula), los tokens («apruebo los colors y todo lo
  de acá») y el conjunto («está todo aprobado»), con la norma de tarjetas y gráficos incluida.
- Selected frame/state: estado `ready` con **datos reales**. Berel: SEO de septiembre contra agosto 2026, recolectado
  en sólo lectura con el código vigente el 2026-10-03; visitas desde IA de la verificación de TASK-1962. Sky: ICO del
  mismo período. A diferencia de TASK-1889, las cifras no son de ejemplo, pero tampoco autorizan nada: qué figura sale
  lo decide el planificador de TASK-1974.

## Alternatives

1. **Ledger de cifras.** Filas a ancho completo, como «Lo esencial del mes». Máxima coherencia con el resumen, pero la
   variación y el período se aprietan en una línea y la página se lee como tabla.
2. **Retícula de cifras (seleccionada).** Hasta 6 cifras en 3 columnas con filetes finos, sin borde de tarjeta ni
   fondo gris y sin cifra principal en el héroe.
3. **Cifra destacada y secundarias.** La primera cifra en el héroe y las demás en una fila. Rompe la regla 2 del
   criterio: la conclusión cita la misma métrica y el dato sale dos veces. Además, jerarquiza sin criterio cifras que
   pesan igual.

## Decision

Se adopta la dirección 2 en A4 y en deck. Las cifras son la figura: la página abre con antetítulo, conclusión y lead
a ancho completo y no repite ninguna cifra en el héroe. Una sola cifra ocupa la retícula completa en horizontal: valor
a la izquierda y variación a la derecha. La dirección 1 se descarta porque la variación queda sin aire; la 3, por
duplicar el dato.

Decisiones que cambian el wireframe original:

- **Capacidad del deck: 6 cifras (3×2), no 4.** Caben a 38 px; así las 6 de un capítulo de SEO no se parten en dos
  láminas de 3.
- **Variación con el valor anterior:** «vs {valor} en {período}» («vs 16.390 en agosto 2026»), en vez de
  «vs {período}».
- **Tonos semánticos en la variación** (ver Token mapping). La píldora de TASK-1889 pintaba «peor» en gris, igual que
  «neutro»; ahora «peor» es rojo en **todas** las figuras, no sólo en la tarjeta.

## Visual thesis

- First-fold reading order (página de cifras A4): antetítulo «Cifras del período» → conclusión y lead → retícula, de
  izquierda a derecha y de arriba abajo → nota → unidad / fuente / cobertura → pie.
- Anatomía de una celda: ícono de trazo y nombre (máximo 3 palabras) → marca «Estimado» opcional → valor (Poppins
  700 con cifras tabulares; 44 px en A4, 38 px en deck, en teal sobre navy) → píldora de variación → «vs {valor} en
  {período}» → «Menor es mejor» cuando subir es malo.
- Estados: sube y es mejor (verde), baja y es peor (rojo), cambia sin dirección declarada (gris), «Menor es mejor»,
  «Estimado», sin período anterior (sin píldora ni «vs») y sin dato («—» y «Sin dato en {período}», nunca 0).
- Density: media; filetes `rule` entre celdas, sin cards.
- Depth model: plano, como el resto del catálogo.

## Norma: tarjetas y gráficos en un capítulo

1. La pregunta decide: «¿cuánto es y cómo cambió?» es una tarjeta; evolución, explicación, composición y comparación
   son gráficos.
2. Un hecho, una figura: si una métrica tiene tarjeta, no vuelve en barras contra el mes anterior. Si tiene meta, va
   **sólo en bullet, sin tarjeta**.
3. La tarjeta da el total y el gráfico el porqué: cuando hablan de la misma métrica, el gráfico no repite el total.
4. Las cifras abren el capítulo. Orden: **cifras → evolución → explicación → composición → comparación**. La que no
   aplica se salta; el orden no se invierte.
5. **Una sola página de cifras por capítulo**: hasta 6 en A4 y en deck. Con más, páginas equilibradas una tras otra,
   nunca separadas por gráficos.
6. Dos barras no son un gráfico: una métrica contra su período anterior es una tarjeta.
7. Dos sistemas de color que no se mezclan: las series usan roles de dato y la variación usa tonos semánticos. Una
   serie nunca se pinta de rojo o verde porque bajó o subió.
8. La misma píldora en la tarjeta, bajo las columnas y en las tablas.
9. Sin dato no es cero: la tarjeta muestra «—»; un gráfico sin hechos suficientes no se emite.
10. En Think, el mismo orden: retícula de tarjetas al inicio del capítulo (varias columnas en escritorio, una a
    390 px) y los gráficos debajo.

Excepciones aprobadas:

- **Cascada y tarjeta de la misma métrica:** los totales de la cascada (Berel: 16.390 → 13.606) son anclas de la
  explicación y no cuentan como segunda figura de esos hechos.
- **Centro de la dona:** si la métrica ya tiene tarjeta, el centro muestra la participación de la parte principal
  («97,7 % ChatGPT»); sin tarjeta, el total de las partes.

## Desktop target

- **A4 — página de cifras:** pestaña de capítulo, cabecera corrida, antetítulo con ícono, conclusión (26 px) y lead
  a ancho completo, título del tablero con el conteo de cifras, retícula de 3 columnas, nota, procedencia y pie. El
  cierre «Lo que significa / Próximo paso» aparece sólo si la lectura lo trae.
- **Deck — lámina de cifras:** columna izquierda de 372 px sin cifra principal (antetítulo, conclusión de 34 px,
  filete teal, lead); panel de 428 px con título, «Fuente» y retícula de 3×2.

## Mobile target

No aplica al documento. En Think, la tarjeta es una lista de definiciones a una columna a 390 px; ninguna cifra baja
de 28 px ni se trunca.

## Token mapping

| Cue | Canonical token / role | Deviation |
|---|---|---|
| Valor en papel / navy | `paperAccent` (`--axis-ppt-blue-800`) / `navyAccent` (`--axis-deck-teal-500`) | ninguna |
| Variación mejor, papel | `status/success-text` (`--axis-ppt-green-900`, #0d6b3f) sobre su tinte al 12 %: 5,2:1 | rol nuevo de tono |
| Variación peor, papel | `status/error-text` (`--axis-ppt-red-800`, #b91954) sobre su tinte al 10 %: 5,0:1 | rol nuevo de tono |
| Variación mejor, navy | `icon/success` (`--axis-ppt-green-400`, #28c76f) sobre su tinte al 16 %: 5,9:1 | rol nuevo de tono |
| Variación peor, navy | `--axis-ppt-red-300` (#ff7063) sobre su tinte al 16 %: 5,3:1 | rol nuevo de tono |
| Variación neutra | `ruleSoft` + `paperInk` (papel) / `navyMuted` al 12 % + `navyInk` (navy) | la de TASK-1889 |
| Paso «Sumó» y 4.ª parte (waffle, apiladas) | rol nuevo `dataStepOnPaper` = `--axis-ppt-blue-500` (4,3:1) / `dataStepOnNavy` = `--axis-deck-cyan-700` (3,3:1) | rol nuevo en `editorial-roles.json` |
| Partes 1–3 y ausencia | `dataCurrent*`, `dataOpportunity*`, `dataPrior*`, `dataAbsence*` existentes | ninguna |
| Oportunidad en papel | `--axis-ppt-orange-500`: 2,94:1, bajo 3:1 | aceptado con nota: lo sostienen la etiqueta directa, la cuenta y el signo |
| Chip «Estimado» y «Menor es mejor» | `ruleSoft` + `paperAccent`; `labelMuted` | ninguna |

Orden de las partes: waffle y dona, actual → oportunidad → anterior → paso → ausencia; apiladas, base actual →
anterior → oportunidad → paso; cascada, total anterior → sumó (+) → restó (−) → total actual.

## Anti-patterns

- Una cifra en el héroe que la retícula ya muestra.
- Tarjetas con borde o fondo gris (card soup).
- Dos barras para una métrica contra su mes anterior.
- La misma métrica en tarjeta y en bullet.
- El total de la tarjeta repetido al centro de la dona.
- Una serie pintada de rojo o verde por su variación.
- Variación sólo con color: siempre triángulo, cifra y tono.
- Truncar un nombre o una cifra: el mapper rechaza con causa (Berel: «Keywords en primera página» tiene 4 palabras).

## Acceptance signature

- Fidelity ≤ 1 % contra `Premium-Cifras.png` y `Deck-Cifras.png`, en color y en gris.
- Average ≥ 4.5/5; hierarchy, surface economy, visual impact, fidelity and generic-template resistance each ≥ 4.5/5;
  no dimension below 4/5.
- Contraste AA medido de cada tono de variación y de la cifra teal sobre navy.
