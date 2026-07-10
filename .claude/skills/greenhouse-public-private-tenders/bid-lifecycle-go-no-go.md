# Bid Lifecycle + Go/No-Go

El ciclo de una oportunidad, del ruido del portal a un GO defendible. Aplica a público y privado (los estados son los mismos; cambian las fuentes y los plazos).

## Lifecycle canónico (7 estados)

Alinea con el modelo del módulo RESEARCH-007. Cada estado tiene una pregunta y una salida.

| Estado | Pregunta | Salida |
|---|---|---|
| **1. Discovered** | ¿Existe la oportunidad y la capturamos? | Registro con fuente + fecha + raw payload/adjuntos |
| **2. Screened** | ¿Es siquiera de nuestro rubro? | Fit binario preliminar (keyword/rubro/BU) + señales |
| **3. Triage** | ¿Vale la pena mirarla en serio hoy? | Prioridad por decision band + owner asignado |
| **4. Evaluate** | ¿Podemos y conviene ganarla? | **Bid/No-Bid** con score explicable + margen |
| **5. Plan Bid** | ¿Cómo la ganamos? | Capture plan: mensajes, precio, equipo, garantías, plazos, anexos |
| **6. Submit (externo)** | ¿Presentamos? | Paquete presentado en el portal (acción humana) + comprobante |
| **7. Reconcile** | ¿Qué pasó y qué aprendimos? | Resultado (adjudicada/desierta/perdida) + win/loss + recalibración |

**Human-in-control:** el paso 6 lo ejecuta una persona. La skill/agente prepara; no envía.

## Discovery → Screening: higiene del matcher (lección TASK-673)

El listado de un portal trae miles de filas resumidas. El screening barato usa **nombre**; el fit real requiere **descripción + items + bases** (hidratación por `codigo`). Reglas aprendidas del POC:

- **Word-boundary matching obligatorio.** `SEO` matcheó dentro de `aseo`; `documental` matcheó gestión documental genérica. Acrónimos cortos sin límites de palabra generan falsos positivos.
- **Evita keywords de una palabra demasiado amplias** que describen trabajo administrativo genérico.
- **Nombre pesa menos que bases técnicas.** Un match en `Nombre` es señal; un match en bases técnicas/items es evidencia fuerte. Guarda `matched_field`.
- **Señales no canónicas ≠ servicios.** Hits de medios/PR/influencers/staff-aug que no son servicio canónico del catálogo van como `signals`, nunca en `servicios_matched`.
- **Hidrata antes de decidir.** El listado solo trae `CodigoExterno`, `Nombre`, `CodigoEstado`, `FechaCierre`. Descripción/items exigen llamada por `codigo`.

## Scoring explicable (10 componentes)

Nada de score opaco. Combina reglas deterministas con señales auditables. Cada score guarda: valor, versión de scoring, señales positivas, señales negativas, campos/documentos que lo sustentan, fecha.

| Componente | Pregunta |
|---|---|
| **Fit de servicio** | ¿Pide algo que Efeonce vende? (audiovisual, web, CRM, campañas, analytics…) |
| **Fit de business line** | ¿Hay una BU naturalmente responsable? (Globe, Wave, Reach, CRM…) |
| **Calidad del match** | ¿El match está en nombre, descripción, items o bases? (bases > nombre) |
| **Plazo** | ¿Hay tiempo real para preparar oferta? (cierre en 3 días vs 18) |
| **Monto estimado** | ¿Justifica el esfuerzo comercial? (umbral por BU) |
| **Comprador** | ¿Historial, relación, rubro atractivo? (organismo recurrente, ministerio) |
| **Complejidad documental** | ¿Muchos anexos/requisitos pesados? (garantías, certificaciones) |
| **Riesgo de fit** | ¿Parece commodity, obra civil, hardware, scope fuera de agencia? |
| **Capacidad interna** | ¿Hay equipo y ventanas disponibles? (delivery/capacity) |
| **Estrategia** | ¿Abre cuenta, caso público, relación futura? (first logo, sector prioritario) |

Ejemplo de score explicable:

```text
fit_score = 78
positive_signals:
  - service_match: produccion_audiovisual (from items)
  - closing_window: 16 days
  - buyer_sector: cultura
negative_signals:
  - documentation_complexity: medium
  - no_prior_buyer_relationship
matched_field: items
scoring_version: v1
```

## Decision bands (calibrar con evidencia real, no dogma)

- **80–100** → revisar hoy, alta prioridad.
- **60–79** → candidata, requiere triage humano.
- **40–59** → monitorear / revisar si hay capacidad.
- **< 40** → archivar salvo keyword/rubro estratégico.

## El gate que manda: Bid/No-Bid con margen

El fit-score **no** decide solo. El GO exige pasar **tres puertas** en orden:

1. **Admisibilidad (binaria).** ¿Podemos siquiera ofertar? Inhabilidades, requisitos excluyentes, ChileProveedores hábil, garantías obtenibles a tiempo. Si falla → NO-BID inmediato, sin importar el fit. (`compliance-riesgo-integridad.md`)
2. **Capacidad (binaria).** ¿Tenemos equipo, tiempo y skills para entregar bien? Un GO sin delivery readiness es un problema futuro. (Delegar a `greenhouse-talent-people-operator` para staffing.)
3. **Economía (cuantitativa).** ¿Margen proyectado sobre **loaded cost** ≥ umbral, considerando el costo de garantías + el desfase de pago del Estado + el costo de preparar la oferta? Fit alto con margen negativo = **NO-BID**. (`pricing-garantias-finance.md` + `commercial-expert`.)

Solo si las tres pasan, y el fit-score/estrategia lo respalda, es **GO**.

### Anti-metas del scoring

- No perseguir volumen: **fit before volume**. Mejor 5 bids fuertes que 40 tibios.
- **Commercial before finance**: primero ¿la queremos y podemos ganarla?, después el detalle financiero fino.
- No declarar bandas/umbrales como definitivos: recalíbralos con win/loss real.

## Plan Bid → Capture plan

Un GO genera un plan operable (delega el desglose a `greenhouse-task-planner`):

- **Mensajes clave / tema ganador** (por qué Efeonce, mapeado a los criterios ponderados).
- **Estrategia de precio** (hacia la fórmula de las bases; `pricing-garantias-finance.md`).
- **Equipo + CVs + casos** (`greenhouse-talent-people-operator` + `propuesta-tecnica-economica.md`).
- **Garantías** (tipo, monto, instrumento, emisión).
- **Matriz de anexos y plazos** con owners y fechas límite internas (antes del cierre real).
- **Owner del bid + fecha de "todo listo"** (con colchón para emisión de garantías/certificados).

## Reconcile → Win/Loss

Al cerrar (ganada, perdida, desierta):

- Registra resultado, precio ganador (si es público, es dato abierto), y **por qué**.
- Recalibra keywords, bandas y umbrales de margen.
- Si ganaste → handoff a **deal/quote/SOW → delivery** (no crear identidad paralela; extender el objeto canónico).
- Si perdiste por precio con margen sano → revisa la fórmula; si perdiste por técnica → revisa la propuesta.

## Hand-off

- Admisibilidad/inhabilidades → `compliance-riesgo-integridad.md`.
- Precio/garantías/margen → `pricing-garantias-finance.md` + `greenhouse-finance-accounting-operator`.
- Armar la oferta → `propuesta-tecnica-economica.md`.
- Operacionalizar el GO → `greenhouse-task-planner`; deal/pipeline → `commercial-expert` + `hubspot-greenhouse-bridge`.
