# Performance & Commerce Distribution — Pricing Integrity Pack V1

> **Estado:** `hypothesis_only` — bandas internas de validación; no son tarifario público ni autorización de venta
> **Owner:** Strategy + Commercial + Finance + Media & Distribution
> **Versión:** V1 · 2026-09-10 · **Revisión:** después del primer piloto de cada motion
> **Último delta:** 2026-10-16 — rebates/comisiones como margen de Efeonce; sin cambio de bandas · 2026-10-10 — paid social en el deck «Marketing de Contenidos» (§13); sin cambio de bandas ni de veredicto
> **Moneda de referencia:** USD; cotizar en moneda del contrato con snapshot FX aprobado (referencia de cálculo:
> USD 1 = CLP 925,97, dólar observado 2026-09-10)
> **Decisión:** [`EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1`](../../architecture/EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md)
> **Ficha:** [`Performance & Commerce Distribution`](../../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md)
> **Benchmark:** [market update 2026-09-10](../../audits/commercial/PERFORMANCE_MEDIA_CHANNELS_PARTNERS_PRICING_RESEARCH_2026-09-10.md)

## 1. Decisión de pricing

```text
fee Efeonce por nivel de complejidad (métrica de valor: capacidad gobernada de operación)
+ inversión en medios — pass-through, facturada idealmente por la plataforma al cliente
+ fees de partners y tecnología (trading desk, DSP, datos) — pass-through declarado, sin markup
+ producción creativa — Creative Services
+ implementación de medición — Wave Measurement & Analytics
+ integración de CRM — RevOps & CRM
+ impuestos
```

El cliente distingue siempre cuánto cobra Efeonce, cuánto va a la plataforma o al partner y qué compra cada línea.

## 2. Matriz oferta × delivery × engagement

| Oferta | Delivery | Engagement | Operating mode | Métrica de valor | Unidad de cobro |
|---|---|---|---|---|---|
| Performance Diagnostic | Productized Service | Diagnostic | efeonce-managed | decisión priorizada y estado de la señal | fee fijo por scope |
| Growth Activation Sprint | Productized Service + Implementation | Sprint 8–12 semanas | efeonce-managed o co-operated | señal remediada, cuentas operando, baseline | fee fijo por nivel, 50/50 |
| Managed Performance | Managed Squad | On-Going, mínimo 3 meses | efeonce-managed o co-operated | capacidad gobernada por nivel | fee mensual por nivel; híbrido opcional |
| Incrementality & Media Investment Architecture | Advisory + Implementation | On-Demand | co-operated | respuesta causal a una pregunta de asignación | fee por estudio |
| Staff Augmentation | Staff Augmentation | On-Going | client-operated | disponibilidad del perfil | tarifa de rol del catálogo |

## 3. Cost-to-serve

### Supuestos

| Rol | Costo cargado USD/mes FTE | Fuente |
|---|---:|---|
| Paid Media Manager | 3.149 | catálogo Greenhouse `ECG-008` |
| Media Buyer / Specialist | 1.849 | catálogo `ECG-009` |
| Data Analyst | 2.049 | catálogo `ECG-019` |
| Performance Lead / Strategist | **5.500 — hipótesis** | el catálogo no tiene el rol; proxy de mercado: Performance Marketing Manager ≈ CLP 4,86 M bruto + ~25% de costo empresa |
| Herramientas, overhead y coordinación | +12% sobre el costo de equipo | hipótesis; Finance debe reemplazarla por el overhead real |

Fórmula: `precio = costo cargado / (1 − margen)`.

### Niveles de complejidad de Managed Performance

| Nivel | Perfil típico | Equipo (FTE) | Costo USD/mes | Piso (45%) | Óptimo (55%) |
|---|---|---|---:|---:|---:|
| **1 · Focalizado** | 1 motion, 2 canales core, 1 mercado, señal existente; inversión típica < USD 20 mil/mes | PMM 0,25 · analista 0,05 · lead 0,05 | 1.304 | **2.370** | 2.900 |
| **2 · Multicanal** | 1 motion, 3–4 canales, sistema de testing creativo, 1–2 mercados; USD 20–80 mil/mes | PMM 0,5 · specialist 0,25 · analista 0,15 · lead 0,1 | 3.241 | **5.890** | 7.200 |
| **3 · Integrado** | 2 motions o 5+ canales, retail media o programmatic, 3+ mercados, experimentación; > USD 80 mil/mes | PMM 1,0 · specialist 0,5 · analista 0,3 · lead 0,2 | 6.484 | **11.790** | 14.400 |

Por encima del nivel 3, cotización a medida con costeo explícito.

**Bandas de validación:** nivel 1 USD 2.400–2.900 · nivel 2 USD 5.900–7.200 · nivel 3 USD 11.800–14.400.

La inversión típica orienta el nivel, pero no lo define: un cliente con inversión baja y cuatro mercados es nivel 2 o 3.

### Diagnostic y Sprint

| Oferta | Scope | Costo USD | Piso (45%) | Banda de validación |
|---|---|---:|---:|---|
| Diagnostic Focal | 1 motion, ≤3 cuentas, 1 mercado, 2 semanas | 1.785 | 3.245 | USD 3.200–4.000 |
| Diagnostic Extendido | multi-mercado, retail media o CRM del motion B, 4 semanas | 4.574 | 8.316 | USD 8.300–10.000 |
| Sprint nivel 1 | 10 semanas | 5.374 | 9.771 | USD 9.800–12.000 |
| Sprint nivel 2 | 10 semanas | 10.217 | 18.576 | USD 18.600–22.700 |
| Sprint nivel 3 | a medida | — | — | desde USD 30.000 |
| Incrementality | por estudio | — | — | a medida; sin banda hasta el primer caso |

El 50% del Diagnostic se acredita contra el Sprint o el primer mes de Managed si se firma dentro de 60 días. Los
Sprints no incluyen la implementación de Wave (server-side, APIs de conversión) ni la de RevOps & CRM: se cotizan en
sus prácticas y la propuesta los muestra como líneas separadas.

## 4. Posición frente al mercado

| Referencia | USD/mes | Lectura |
|---|---:|---|
| Freelance y paquetes de un canal en Chile | 110–760 | fuera de nuestro juego |
| Muller y Pérez, performance "desde" | ~1.610 | techo local publicado |
| **Efeonce nivel 1** | **2.400–2.900** | ~50% sobre el techo local publicado |
| Agencias B2B de LinkedIn (global) | 1.500–15.000 | el motion B se ancla aquí |
| Tinuiti / Power Digital / NoGood | 10.000–25.000+ | el nivel 3 queda por debajo, con costo LATAM |

`[INF]` El nivel 1 no gana por precio contra el tramo medio chileno: gana cuando el comprador ya sufrió la ejecución
barata o necesita señal y CRM. Si el prospecto sólo puede pagar el tramo medio, se descalifica o se ofrece Advisory.

**El SKU legacy `EFG-003` (USD 1.820/mes, creatividad incluida, línea Wave) queda bajo el piso del nivel 1 aun sin la
creatividad.** Se solicita a Finance su retiro o reemplazo por los tres niveles vía la gobernanza del catálogo.

## 5. Componente híbrido — alternativa contractual, nunca default

Cuando el cliente exige un modelo porcentual:

```text
fee mensual = max(piso del nivel, escala sobre inversión gestionada)
escala: 12% hasta USD 30 mil · 9% sobre el tramo 30–100 mil · 6% sobre el excedente de 100 mil
```

- El piso del nivel siempre aplica: el porcentaje nunca baja el fee bajo el costo de servir.
- Revisión obligatoria cuando la inversión cambia de tramo por dos meses seguidos.
- En cuentas enterprise se pacta un tope o una revisión anual, para que el fee no sea renta sobre la inversión.

## 6. Motion B — reglas específicas

- **Inversión mínima en LinkedIn:** USD 3.000/mes por el mínimo práctico de aprendizaje de la plataforma; bajo eso,
  LinkedIn no entra en la propuesta.
- **Bono por pipeline (opcional):** hasta 15% del fee base, trimestral, sobre oportunidades calificadas con fuente paid
  en el CRM del cliente por encima de un baseline de tres meses. Definiciones de etapa firmadas en el SOW. Nunca
  performance-only.
- La integración del CRM (mapeo de etapas, sync de conversiones offline) se cotiza en RevOps & CRM.

## 7. Programmatic, partners y administración de pagos

- Los fees del partner programático (tecnología, datos, servicio) son pass-through declarados. Referencia de mercado:
  20–35% apilado sobre la inversión.
- **Efeonce no cobra markup sobre inventario ni hace compra principal.** Programmatic cuenta como un canal en el nivel
  de complejidad.
- **Administración de pagos:** preferir que el cliente pague directo a plataformas y partners. Si Efeonce adelanta
  fondos, se agrega una línea de administración del 3–5% de la inversión administrada por capital de trabajo, DSO y FX,
  con aprobación de Finance. Nunca se combina con la escala híbrida sobre el mismo peso sin excepción aprobada.
- **Proveedores seleccionados: Basis + Real Audiences** (dirección aceptada 2026-10-09). Selección de ejecución por
  campaña, sin exclusividad o reparto obligatorio. El [pack específico de programmatic](PROGRAMMATIC_MEDIA_OPERATIONS_PRICING_INTEGRITY_PACK_V1.md)
  gobierna sus costos, fee, caja y escenarios; no aplicar bandas de retainer completo automáticamente a un flight.
- **Aprobación comercial acotada 2026-10-09:** el servicio programático, su tarifario base y cobro están aprobados por
  el operador en ese pack específico; estas bandas de Performance conservan su estado de hipótesis. El precio
  programático usa fee fijo con piso, markup 0% y no añade híbrido ni recargo financiero por defecto.
- **Real Audiences:** oferta temporal de comisión 10% hasta 2026-12-31; inversión en plataforma como base declarada,
  definición contractual y liquidación pendientes. Su crédito a 30 días sin anticipo también primera campaña no está
  aprobado. **Basis:** deck y modalidades recibidos; costos, mínimos, entidad y crédito por negociar.
- **Rebates/comisiones:** no reemplazan el fee ni sostienen el margen base. Desde el 2026-10-16 son margen de Efeonce
  por decisión del operador: no se promete declararlos ni traspasarlos al cliente (sustituye la regla anterior de
  trasladarlos o declararlos). Finance valida liquidación y tributos.
- **Autogestión:** gate por proveedor, con dos campañas managed o acompañadas auditadas, capacitación específica, trader con backup,
  permisos, soporte y costo de seat comprobados. La restricción histórica de otro DSP sólo por carencias de Real
  Audiences queda reemplazada por la [decisión dual](../../architecture/EFEONCE_PROGRAMMATIC_DUAL_PROVIDER_DECISION_V1.md).

- **Actualización 12-10:** reunión y demo registradas; operación directa Efeonce con formación/soporte como ruta a
  evaluar, no capacidad activa. Porcentajes ilustrativos no son tarifas ni acreditan ahorro. Ver
  [evidencia](../../audits/commercial/BASIS_DISCOVERY_AND_MEDIA_OFFER_2026-10-12.md).
- **Cuenta integral de medios:** costear alcance y gestión conjunta, sin sumar fees completos de canales ni repetir
  tareas cubiertas por retainer. El [pack programático §2.3](PROGRAMMATIC_MEDIA_OPERATIONS_PRICING_INTEGRITY_PACK_V1.md#23-calibración-del-tarifario-y-composición-integral)
  mantiene tarifa aprobada y distingue piso de margen, objetivo, costos externos y trabajo incremental; estas bandas
  de Performance conservan `hypothesis_only`.

### 7.1 Canales emergentes y bajo pedido

- **ChatGPT Ads** entra primero como experimento: presupuesto de prueba del cliente, lectura a 4–6 semanas y medición
  del lado del sitio, porque la plataforma sólo entrega vistas y clics agregados. Si reemplaza un canal del nivel, no
  cambia el fee; si se suma, cuenta como un canal más para el nivel.
- **Preparación para ChatGPT Ads** en mercados donde aún no existe (Chile): se cotiza dentro del Diagnostic o como
  composición con Search Visibility 360, no como fee mensual de un canal inexistente.
- **X Ads** cuenta como un canal más para el nivel; la verificación de brand safety de terceros es pass-through.

## 8. Descuentos y aprobaciones

| Situación | Regla |
|---|---|
| Compromiso de 12 meses | hasta 10% con prepago o compromiso firme; aprobación Finance (coherente con `EFO-009`) |
| Factor país del catálogo | se aplica, pero nunca lleva el precio bajo el piso del nivel |
| Diagnostic | sin descuento bajo el piso; la acreditación del 50% es el incentivo |
| Bajo el piso | sólo con aprobación de Finance, razón, owner, compensación y fecha de expiración |
| Performance-only | no se ofrece |

## 9. Condiciones de pago

| Oferta | Condición |
|---|---|
| Diagnostic | 100% al inicio |
| Sprint | 50% al firmar, 50% al entregar |
| Managed | mensual anticipado |
| Inversión en medios | el cliente paga a la plataforma; si Efeonce adelanta, fondos antes de comprometer |
| Bono de pipeline | trimestral, contra datos del CRM aceptados |

## 10. Quote y versionado

Toda cotización registra nivel, drivers de complejidad, supuestos de costo, margen resultante, descuento y aprobador.
Los cambios de banda se versionan con fecha efectiva; las cotizaciones emitidas conservan su snapshot. Estas bandas no
se cargan al catálogo Greenhouse hasta aprobación de Finance.

## 11. Validación

| Hipótesis | Experimento | Threshold | Stop condition |
|---|---|---|---|
| El Diagnostic se vende al piso | primeros prospectos por motion | 2 vendidos en 90 días, ≥1 por motion | 5 propuestas sin cierre por precio |
| El nivel 1 sostiene margen con el equipo supuesto | medir horas reales del primer Managed | margen bruto ≥45% en el mes 3 | margen < 35% dos meses |
| El cliente acepta fee por nivel en vez de % | registrar la preferencia de cada propuesta | ≥50% acepta fee por nivel | todos exigen % puro |
| El motion B paga más que el A por la señal de CRM | comparar WTP en propuestas | nivel B igual o mayor que A | el comprador B2B sólo valora CPL |

Cada resultado entra al evidence ledger con fuente, fecha, owner, confidence y decisión.

## 12. Pricing Integrity Pack mínimo

```yaml
offer_id: media-distribution/performance-commerce
delivery_model: managed_squad | productized_service | staff_augmentation | advisory
engagement: diagnostic | sprint | on_going | on_demand
value_metric: capacidad gobernada por nivel de complejidad
billing_unit: fee mensual por nivel; fee fijo para diagnostic y sprint
minimum_commitment: 3 meses en Managed
included: [especificación de señal, operación de canales del motion, testing creativo, gobierno algorítmico, reporting, gobierno trimestral]
excluded: [inversión en medios, producción creativa, implementación de medición, integración CRM, fees de partners, derechos]
cost_drivers: [motion, canales, mercados, feeds, retail media, programmatic, madurez de señal, stakeholders]
provider_pass_through: [plataformas publicitarias, trading desk, DSP, datos]
margin_floor: 45% bruto sobre el fee Efeonce — hipótesis pendiente de Finance
discount_band: hasta 10% por 12 meses con aprobación Finance
renewal_trigger: gobierno trimestral con aprendizaje documentado y recomendación de asignación ejecutada
expansion_trigger: nuevo mercado, nuevo motion, retail media, programmatic, incrementalidad
effective_from: pendiente
status: hypothesis_only
finance_review: pending
commercial_review: pending
legal_review: pending
operations_review: pending
```

**Verdict:** `hypothesis_only`. Pasa a `approved_for_validation` cuando Finance confirme el costo del Performance Lead,
el overhead real y el piso de margen, y resuelva `EFG-003`.

## 13. Delta 2026-10-10 — paid social en el deck «Marketing de Contenidos» (sin cambio de bandas)

El operador aprobó el 2026-10-10 el deck comercial «Marketing de Contenidos» y pidió incorporar su contenido al modelo
de negocio (cita y alcance en la [ficha](../../services/media-distribution/PERFORMANCE_COMMERCE_DISTRIBUTION_SERVICE_V1.md),
sección «Paid social en el plan de contenidos»). Un precio no queda aprobado por aparecer en un deck: este delta **no
cambia ninguna banda, piso, escala ni condición de pago**, y el veredicto sigue `hypothesis_only`.

### 13.1 Lectura del «Cómo se compra» del deck

| Línea del deck | Regla vigente de este pack | Coincide |
|---|---|---|
| Fee Efeonce · «fijo, por capacidad» | §1 y §3: fee por nivel de complejidad; métrica de valor = capacidad gobernada | sí, como default. El híbrido porcentual de la §5 sigue existiendo como alternativa contractual con piso (DA-03) |
| Whitelisting y medios · «línea propia» | §1 y §9: la inversión en medios es pass-through y la paga el cliente a la plataforma. La licencia de whitelisting no es de este pack: es un costo de creadores | sí |
| Comisión por resultado · «sólo si se acuerda» | §6: bono por pipeline, opcional, hasta 15% del fee base, sólo en el motion B, con baseline y definiciones de etapa firmadas. §8: no se ofrece performance-only | parcial: el acuerdo es necesario, no suficiente (DA-04) |
| Derechos y uso pagado · «línea propia» | fuera de este pack; `excluded: derechos` en la §12 | sí |

### 13.2 Cómo se cotiza hoy el «paid social» del plan de contenidos

No existe una unidad de cobro llamada «paid social». Mientras no se decida otra cosa (DA-01):

- se cotiza con el nivel de Managed Performance que corresponda a su complejidad, con su piso y su mínimo de tres
  meses, o con Diagnostic y Sprint;
- el «sprint de prueba» del deck no tiene banda propia: las bandas de Sprint de la §3 corresponden a 10 semanas de
  remediación de señal y takeover de cuentas, que es un alcance mayor que «un frente acotado» (DA-05);
- una lane más liviana, sólo para amplificar contenido, **no tiene costo medido ni precio**. Crearla exige costeo de
  Finance con equipo, horas y piso propios; no se deriva recortando el nivel 1.

### 13.3 Lo incorporado que no tiene precio en este pack

- «Lo orgánico prueba, la pauta escala»: la lectura del orgánico y la selección de piezas consumen horas que el
  cost-to-serve de la §3 no contempla. Se miden en el primer caso antes de asumir que caben en el nivel;
- UGC patrocinado: sobre la misma amplificación pueden coincidir el fee de governance de Amplification & Whitelisting
  (pack de creadores) y el fee por nivel de este pack. Falta la regla de no doble cobro entre ambos packs (DA-06);
- Thought Leader Ads en LinkedIn: cuenta como parte del canal LinkedIn para el nivel; sin evidencia de costo;
- social commerce y live shopping: sin banda. La operación de tienda, catálogo y checkout no es de este pack;
- origen por red, pieza y creador en el CRM: la integración se cotiza en RevOps & CRM, como en la §6.

### 13.4 Validación que se suma

| Hipótesis | Experimento | Señal | Stop condition |
|---|---|---|---|
| El comprador de contenidos acepta pagar paid social como fee por nivel, separado del plan social | registrar la reacción en cada propuesta que componga ambos | el buyer acepta fee y medios separados del fee de social media | exige que la pauta venga «incluida» en el plan |
| La selección por señal orgánica cabe en el cost-to-serve del nivel | medir horas reales del primer caso | el margen del nivel se sostiene | las horas de lectura y selección rompen el piso |

Cada resultado entra al evidence ledger con fuente, fecha, owner, confidence y decisión.
