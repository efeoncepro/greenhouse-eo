# ARMOR · escenarios del fee del piloto (Cotizador V3, 28/10/2026)

Simulaciones locales con `pnpm --silent pricing:v3 compose quote --current` (catálogo v14, oferta
`performance-commerce-distribution`, On-Demand, USD). **No son precio aprobado ni cotización emitida**
(`commercialStatus: requires_review`); dedicaciones estimadas por el agente, a validar por Operations.

| Escenario | Equipo | Fee 90 días | Por mes (P1 / P2 / P3) | Costo | Margen |
| --- | --- | ---: | --- | ---: | ---: |
| Base 27/10 (vigente en el deck) | PMM, Media Buyer, Analista, Copy + preparación de medición (GTM, WordPress, Kommo, PM) | 22.450 | 11.350 / 5.550 / 5.550 | 9.141 | 59,3 % |
| A · sin preparación (pasa a Fase 0) | PMM 99/67 h, Media Buyer 44/20 h, Analista 24 h, Copy 34/10 h, todos CL | 19.360 | 8.260 / 5.550 / 5.550 | 7.888 | 59,3 % |
| B · trafficker en Colombia | Trafficker Digital Semi-senior CO 100/80 h; PMM CL 32/20 h; Analista 16 h; Copy 24/8 h; Account 8/4 h | 13.390 | 5.370 / 4.010 / 4.010 | 5.438 | 59,4 % |
| C · trafficker en Perú | igual a B | — | — | — | bloqueado |

- C no calcula (`MISSING_CATALOG_SELECTION`): el catálogo no tiene costo del Trafficker Digital en Perú. Hace falta
  un sueldo de referencia PE con fuente para cotizarlo.
- Ningún escenario queda bajo el piso de 45 % (`belowPolicyFloor: false`).
- Diseño: no hay horas de diseño en ningún escenario (en la base, el diseño lo ponía ARMOR). Si las piezas las
  hacen diseñadores de Efeonce, su tiempo no es gratis aunque ya estén contratados: se declara como costo
  existente o se suma una línea.
- La Fase 0 de medición se cotiza aparte (aún no cotizada).
