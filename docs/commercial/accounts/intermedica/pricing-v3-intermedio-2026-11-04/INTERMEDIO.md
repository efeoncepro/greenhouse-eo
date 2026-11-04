# Intermedica Perú · escenario intermedio (Cotizador V3)

**04/11/2026 · INTERNO.** Cinco cotizaciones V3 separadas, una por servicio, para que Julio apruebe cifras. Todas
`binding:false`, `reviewStatus: requires_review`, exit **3** (calculada en revisión) y replay `verified:true`.
Catálogo `operating-review-2026-10-27-v14`, policy `operating-review-2026-10-22-v12`, créditos v1; `current show`
consistente; mercado `market:PE` factor 0,95 confirmado, `floorBasis: base_market`. Sin aprobación de precio,
contratación, reserva de personas, envío ni escritura a CRM. Impuestos `not_resolved`. Moneda USD, netos.

> **Costo, margen, horas, FTE y perfiles son INTERNOS.** Nunca salen al cliente. Al comprador sólo llegan los
> precios por servicio, rotulados «estimado para revisión» hasta que Julio decida.

Spec del escenario: [ESTRUCTURA-OFERTA-2026-11-04.md §7](../ESTRUCTURA-OFERTA-2026-11-04.md). Método y perfiles:
los mismos del [28/10](../pricing-v3-propuesta-2026-10-28/) (`compose workload` → `scaffold` → `quote` → `assess`).
Fuente numérica única: [EDITORIAL-PRICE-MASTER.json](EDITORIAL-PRICE-MASTER.json).

## 1. Precio por línea (salida del CLI, sin recálculo)

| Línea | Oferta V3 / forma | Precio neto USD | Margen (truncado) | Objetivo / piso | Filas bajo piso |
| --- | --- | ---: | ---: | --- | ---: |
| a) Performance gestionado | `performance-commerce-distribution` · on_going ×3 | **3.640,00 / mes** | 53,3164 % | 55 % / 45 % (estimados) | 0 |
| b) Medición y analítica | `performance-commerce-distribution` · on_going ×3 | **940,00 / mes** | 53,7680 % | 55 % / 45 % (estimados) | 0 |
| c) Creatividad de performance | `creative-managed-service` · on_going ×3 | **590,00 / mes** | 44,7152 % | 45 % / 45 % | 0 |
| d) Conversión web (opcional) | `performance-commerce-distribution` · on_demand ×1 | **2.140,00 único** | 58,3196 % | 55 % / 45 % (estimados) | 0 |
| e) Preparación | `performance-commerce-distribution` · on_demand ×1 | **2.270,00 único** | 57,9303 % | 55 % / 45 % (estimados) | 0 |

`belowPolicyFloor:false` en las cinco. Creatividad queda bajo 45 % nominal por el ajuste de mercado PE
(`floorBasis: base_market`): mismo comportamiento que A/B del 28/10; no es excepción de CEO ni se declara una.
Performance, Medición y Conversión web quedan bajo el objetivo 55 % pero sobre el piso 45 %.

## 2. Totales (sumas de netos de artefactos)

| Concepto | USD neto |
| --- | ---: |
| Mensual sin creatividad (a + b) | 4.580,00 |
| Mensual con creatividad (a + b + c) | 5.170,00 |
| Preparación, pago único (e) | 2.270,00 |
| Conversión web opcional, proyecto único (d) | 2.140,00 |
| Preparación + 3 meses, sin creatividad | 16.010,00 |
| Preparación + 3 meses, con creatividad | 17.780,00 |
| Preparación + 3 meses, con creatividad + conversión web | 19.920,00 |
| Medios: techo de planificación, pagado directo por el cliente (no es fee) | hasta 2.000,00 / mes · 6.000,00 en 3 meses |

Comparación con el 28/10 (mensual con creatividad): A 3.330 · **intermedio 5.170** · B 7.100. Preparación:
A 1.780 · **intermedio 2.270** · B 2.660.

**INTERNO:** costo modelado preparación + 3 meses con creatividad US$8.335,10; margen agregado 53,12 %. El agregado no
reemplaza el margen por línea.

## 3. Horas por función (INTERNO)

Capacidad: 150 h de entrega por FTE/mes (180 programadas), paso 0,01 FTE. Talento declarado CL como hipótesis de
abastecimiento; cupos `planned-*`, sin personas asignadas.

| Función (perfil) | Línea | Bloques h/mes | Total | FTE |
| --- | --- | --- | ---: | ---: |
| Líder de performance, referente (`ECG-008`, + tarea `digital-strategy`) | a | dirección/comité 10 · estrategia 2 líneas y mix 6 · 3 hipótesis × 3 = 9 · lectura quincenal 2 × 2,5 + reporte 5 = 10 · optimización 10 | 45 | 0,30 |
| Especialista de medios pagados (`ECG-009`) | a | 8 chequeos × 2 = 16 · 6 campañas × 2,5 = 15 · variantes de test 6,5 | 37,5 | 0,25 |
| Analista de datos y medición (`ECG-019`) | b | tablero segmentado y conciliación 12 · datos para lectura/reporte 6 | 18 | 0,12 |
| Implementación GA4/GTM/Looker (`ECG-031`) | b | mantenimiento ≤ 6 eventos + QA formularios/WhatsApp 7,5 | 7,5 | 0,05 |
| Diseñador (`ECG-003`) | c | 6 maestras × 2 = 12 · 12 adaptaciones × 0,5 = 6 | 18 | 0,12 |
| Copywriter (`ECG-011`) | c | 6 conceptos × 1,5 | 9 | 0,06 |
| **Núcleo mensual a + b** | | | **108** | **0,72** |
| **Con creatividad** | | | **135** | **0,90** |

Referencia: A 52,5 h / 0,35 FTE (70,5 h con creatividad); B 150 h / 1,00 FTE (186 h). Las tasas de producción
creativa son las mismas del 28/10 (2 h maestra, 0,5 h adaptación, 1,5 h copy por concepto): 6 + 6 + 12 = 18
exportaciones, 2 rondas por lote incluidas en la hora de maestra.

**Proyectos únicos (h totales):**

- d) Conversión web, 2 landings sobre el sitio WordPress existente: líder 4 (0,03) · copy 8 (0,06) · diseño 12 (0,08)
  · WordPress 20 (0,14) · medición 6 (0,04) = 50 h. Una landing por línea de negocio, con CTA a formulario/WhatsApp y
  eventos; sin rediseño, migración ni producción de fotografía/video.
- e) Preparación: medición `ECG-031` 24 (0,16) · WordPress `ECG-012` 10 (0,07) · líder 14 (0,10) = 48 h. Cubre 2
  recorridos, hasta 15 destinos/CTAs, 1 formulario, hasta 6 eventos, diccionario, tablero y QA.

## 4. Supuestos y decisiones de modelado

- **ECG-035 (Digital Strategist) no se usa**: sólo tiene costo localizado CO. Igual que el 28/10, la estrategia se
  cubre con el líder `ECG-008` + tarea `digital-strategy`. No se desactivó ninguna guarda (`allowUnlocalizedCost:false`).
- **Provisión de cobertura/reemplazo** (`provision-backfill-coverage`, estimada) sólo en a) Performance, sobre el líder;
  no se repite en Medición ni Creatividad para no apilarla.
- **Cada cotización separada carga sus costos completos** (fee de plataforma por línea, asientos Notion y Microsoft 365
  por cupo repartidos por dedicación estimada; Adobe paquete de 3 licencias en c y d). Separar Medición de Performance
  suma un cupo y sus asientos frente a A del 28/10; no se supuso rebaja por compartir personas entre líneas.
- **On-Demand (d, e):** razón de precio 1,10 y reserva de contingencia 12 % del costo humano aplicadas por el motor
  (d: US$66,93; e: US$85,20), sin renuncia.
- **Conversión web se cotizó en la oferta Performance** (práctica dueña de la conversión y la medición), no en
  Creatividad. Decisión de Julio si prefiere moverla a `creative-managed-service` (piso 45/45).
- Medios US$2.000/mes `client_direct` dentro de la cotización de Performance: no suma revenue ni costo propio.

## 5. Advertencias del CLI

- `reviewSignals`: `HISTORICAL_ONLY` (snapshot del catálogo) y `ESTIMATED_SOURCE` en las cinco (política de reparto,
  política de precio de la oferta, fees por perfil, provisión y reserva).
- `assumptions`: `DEDICATION_ESTIMATED` en todas las líneas.
- `estimateExposure` (parte estimada del costo): a 98,75 % · b 98,49 % · c 93,87 % · d 97,51 % · e 98,66 %.
- `runNotices` (c y d): precio de Adobe Creative Cloud Pro vence revisión el **16/11/2026** (12 días). Si se emite la
  cotización después de esa fecha, revisar el precio y volver a correr.
- Gaps de `compose assess`: aprobación comercial, acceso/capacidad de recursos, evidencia de asignación de herramientas,
  personas por asignar, dedicación estimada, entidad/impuesto y alcance del servicio; a) agrega evidencia de la
  provisión y términos de medios de terceros.

## 6. Decisiones para Julio

1. Aprobar o ajustar los cinco precios (el precio final es suyo). Cualquier cambio se hace en la demanda y se vuelve a
   correr; nunca se edita una cifra.
2. Confirmar Conversión web en Performance (o moverla a Creatividad).
3. Confirmar la dotación de 0,72 FTE en el núcleo (referente + especialista + analista + implementación) antes de
   comprometer.
4. Emitir la cotización con `compose document` (plantilla A4 versión 2) sólo después de la aprobación, y antes del
   16/11 o tras revisar el precio de Adobe.

## 7. Reproducibilidad

```bash
# desde la raíz del repo
python3 docs/commercial/accounts/intermedica/pricing-v3-intermedio-2026-11-04/build-intermedio.py
python3 docs/commercial/accounts/intermedica/pricing-v3-intermedio-2026-11-04/verify-and-summarize.py
```

Cada script invoca `pnpm --silent pricing:v3 compose workload | compose scaffold --current | compose quote --current |
compose assess | replay` y guarda comando, exit y salida en `*.run.json`. Los scripts se niegan a sobrescribir
archivos: para recalcular, usar otra carpeta o versión.
