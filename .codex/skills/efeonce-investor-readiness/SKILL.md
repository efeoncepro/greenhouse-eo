---
name: efeonce-investor-readiness
description: >-
  Diseña, audita y ejecuta investor readiness, fundraising y aplicaciones a aceleradoras para
  Efeonce Group y sus posibles verticales. Convierte una tesis de negocio en evidencia verificable,
  narrativa, deck, modelo financiero, data room, pipeline de inversores y proceso de diligence.
  Usar para rondas, inversión estratégica, family offices, ángeles, VC, YC, Start-Up Chile,
  subvenciones, deuda, revenue-based financing, spinouts, cap table, SAFE, runway, use of funds,
  investor updates y preparación de comité. No autoriza emitir valores, firmar instrumentos,
  transferir IP ni publicar claims financieros sin revisión legal/financiera.
---

# Efeonce Investor Readiness

## Propósito

Esta skill convierte una empresa operativa con servicios, software, datos e IP en una oportunidad de
capital que un tercero puede entender, verificar y evaluar. No es una skill de “pitch bonito”. Su objeto
es el sistema completo:

```text
tesis → vehículo → evidencia → narrativa → materiales → pipeline → diligence → términos → cierre → reporting
```

El estándar de salida distingue siempre:

- **narrativa**: lo que afirmamos;
- **evidencia**: lo que prueba la afirmación;
- **modelo**: cómo se convierte en economía;
- **vehículo**: quién recibe el capital y qué instrumento se usa;
- **gobernanza**: quién puede aprobar, comprometer o publicar.

## Autoridad y límites

1. Leer `AGENTS.md`, `CLAUDE.md`, `project_context.md`, `Handoff.md` y
   `docs/strategy/EFEONCE_CAPITAL_AND_INVESTMENT_STRATEGY_V1.md` antes de actuar.
2. En Efeonce, `docs/context/` y el capital strategy gobiernan la tesis; esta skill gobierna el método.
3. `greenhouse-finance-accounting-operator` gobierna tratamiento contable, costos, cash y forecast.
4. `legal-privacy-ip-operator` gobierna contratos, IP, datos, valores, entidad y asesoría legal.
5. `efeonce-agency` gobierna marca, ASaaS, portfolio, capabilities y contexto comercial.
6. `gtm-architect` gobierna ICP, category, offer, motion y GTM.
7. No presentar un retainer como ARR, una demo como tracción, un piloto como PMF, ni una capacidad
   interna como producto comercializado.
8. No usar SAFE, equity, deuda, valoración, cap table o promesa de retorno como copy: requieren revisión
   legal y financiera en la jurisdicción correspondiente.
9. Una cifra sin período, denominador, fuente, owner y confidence level no entra al deck ni al data room.
10. Las fuentes temporales se verifican por Internet y se registran con `as-of` y URL primaria.

## Modelo mental: cinco capas de investor readiness

| Capa | Pregunta | Artefacto principal |
|---|---|---|
| Company | ¿Qué entidad y qué negocio recibe capital? | Vehicle memo + corporate pack |
| Market | ¿En qué categoría compite y por qué ahora? | Market/category brief |
| Business | ¿Cómo entra, retiene, expande y captura valor? | Business model + unit economics |
| Proof | ¿Qué está demostrado hoy? | Evidence ledger + customer proof |
| Capital | ¿Cuánto, para qué, con qué hitos y bajo qué derechos? | Raise memo + data room |

## Modos de trabajo

| Modo | Cuándo | Salida mínima |
|---|---|---|
| Discovery | No está claro qué se levanta o para quién | concern register, unknowns, evidence plan |
| Readiness audit | Hay materiales pero no se sabe si resisten preguntas | gap matrix, red flags, confidence verdict |
| Narrative | Hay evidencia y falta articular la tesis | one-liner, executive summary, storyline |
| Materials | La narrativa está aprobada | deck, one-pager, video brief, demo brief |
| Data room | Se abre diligence | index, permissions, source ledger, request log |
| Outreach | Se busca interlocutor | investor thesis map, target list, CRM cadence |
| Transaction | Hay interés concreto | term comparison, counsel handoff, approval gates |
| Post-close | Se cerró capital | reporting pack, board cadence, milestone tracker |

## Flujo obligatorio

### 1. Enmarcar la oportunidad

Definir:

- entidad receptora;
- objetivo de capital: expansión, producto, working capital, internacionalización o adquisición;
- tipo de capital: equity, strategic, non-dilutive, debt o revenue-based;
- monto como función de milestones y runway, no como número redondo;
- audiencia: accelerator, angel, strategic, family office, growth fund o VC;
- fecha objetivo y restricciones de jurisdicción;
- decisión que el capital debe hacer posible.

No empezar por “hagamos un deck”. Empezar por “qué transformación financiaremos y cómo sabremos que ocurrió”.

### 2. Elegir vehículo y comparables

Comparar explícitamente:

- Efeonce Group como receptor;
- vertical/ProductCo;
- inversión estratégica o joint venture limitado;
- subsidio/no dilutivo;
- deuda o revenue-based financing;
- no levantar todavía.

Para cada alternativa registrar: control, dilución, velocidad, obligaciones, IP, datos, exclusividad,
reporting, riesgo de concentración, reversibilidad y milestone de salida. Un spinout necesita demanda,
revenue, costos, equipo, IP, roadmap y contrato intercompany separables.

### 3. Construir el evidence ledger

Toda afirmación del material debe tener:

```yaml
claim_id:
claim:
claim_type: financial | commercial | product | market | founder | legal | traction
period:
numerator:
denominator:
source:
source_owner:
as_of:
confidence: observed | reconciled | estimated | inferred | aspirational
allowed_surfaces: internal | data_room | deck | public
expiry_or_review:
```

Un claim `estimated`, `inferred` o `aspirational` nunca se presenta como hecho observado. Si las fuentes
discrepan, el deck debe mostrar la definición aprobada o retirar la cifra.

### 4. Definir la tesis de inversión

La tesis debe responder en una frase cada pregunta:

1. ¿Qué categoría ocupa la compañía?
2. ¿Qué dolor costoso y recurrente resuelve?
3. ¿Por qué la solución es difícil de copiar?
4. ¿Qué evidencia existe ahora?
5. ¿Qué se vuelve posible con capital?
6. ¿Qué milestone demostrará que el capital funcionó?
7. ¿Qué riesgo puede invalidar la tesis?

Para Efeonce, separar con rigor: compañía/plataforma, lenguaje comercial, ASaaS, Growth Operating System,
capabilities, wedges, plataformas e IP. AEO o Search Visibility 360 pueden ser wedge; no son automáticamente
la compañía completa.

### 5. Diseñar economía y escenarios

El modelo mínimo debe separar:

- revenue recurrente de servicios;
- proyectos y one-off;
- plataforma/software/gobierno;
- implementación, créditos y uso generativo;
- pass-through y derechos/licencias;
- costo humano fully loaded;
- provider/compute/storage/tooling;
- soporte, éxito de cliente y shared services;
- inversión de producto.

Mostrar por período: revenue, gross profit, gross margin, contribution margin, cash burn, runway, hiring,
CAC/payback cuando la muestra permita, GRR, NRR, logo retention, expansion, cross-sell, capacity,
utilization, active workspaces y cost-to-serve.

Nunca derivar NRR o margen de una definición implícita. Cada métrica tiene contrato en
`templates/metric-contract.md`.

### 6. Construir el paquete de materiales

El orden recomendado es:

1. one-liner;
2. executive summary;
3. evidence ledger;
4. financial model;
5. deck;
6. product/demo brief;
7. data room;
8. target investor map;
9. application variants;
10. founder video and demo video.

El deck base debe tener 12–15 slides, pero la longitud se adapta a la audiencia. Cada slide responde una
pregunta y tiene assertion, evidencia, fuente y owner. El deck nunca inventa evidencia para cerrar un arco.

### 7. Ejecutar outreach como proceso

Registrar por inversor:

- thesis fit;
- etapa, ticket y geografía;
- portfolio conflicts;
- valor estratégico real;
- warm path;
- stage/status/next step;
- preguntas y objeciones;
- claims solicitados;
- permisos y restricciones de confidencialidad.

Abrir ventanas coordinadas sólo cuando el paquete soporte el volumen de preguntas. No hacer outreach masivo
con una oferta de valores o términos sin revisión legal: las reglas de solicitud general y las exenciones
dependen de la jurisdicción y del perfil del inversor.

### 8. Diligence y cierre

Preparar un request log con respuesta, fuente, owner, fecha y nivel de confidencialidad. Separar:

- corporate/cap table;
- financial/tax;
- commercial/customer;
- product/technical/security;
- IP/data;
- people/contractors;
- legal/regulatory;
- risks/insurance.

Ningún término se considera aceptable sin revisar valoración/dilución, instrumento, governance, information
rights, pro rata, liquidation preference, exclusivity, IP/data, reporting, founder obligations y downside.

## Gates de readiness

### Gate 0 — Thesis integrity

- [ ] categoría y vehículo no se contradicen;
- [ ] la tesis no depende de una sola capability si el capital es para Efeonce Group;
- [ ] el modelo ASaaS está definido como modelo, no como instrumento;
- [ ] los claims de producto distinguen live, validating, building y gated.

### Gate 1 — Evidence integrity

- [ ] 12 meses de revenue reconciliados;
- [ ] definición de recurrente, proyecto, plataforma y pass-through;
- [ ] métricas con denominador y período;
- [ ] casos y referencias autorizados;
- [ ] claims públicos separados de claims de data room.

### Gate 2 — Economic integrity

- [ ] cash and runway reconciliados;
- [ ] P&L por capability o allocation policy aprobada;
- [ ] escenario base/downside/upside;
- [ ] use of funds vinculado a milestones;
- [ ] sensibilidad de margen, concentración y hiring.

### Gate 3 — Product/IP integrity

- [ ] inventario de IP y derechos;
- [ ] dependencias de plataforma y proveedores;
- [ ] estado runtime real;
- [ ] privacidad, seguridad y datos revisados;
- [ ] contratos Efeonce↔vertical si aplica.

### Gate 4 — Materials integrity

- [ ] deck leído sin narrador;
- [ ] one-pager consistente con deck y modelo;
- [ ] demo no muestra superficies inexistentes;
- [ ] video de fundadores separado del demo si la convocatoria lo exige;
- [ ] enlaces, permisos y versiones auditados.

### Gate 5 — Transaction integrity

- [ ] counsel y Finance asignados;
- [ ] entidad e instrumento definidos;
- [ ] dilución y escenarios calculados;
- [ ] no exclusividad global sin límites;
- [ ] approval record antes de firmar o recibir fondos.

## Composición del Investor Readiness Pack

```text
Investor Readiness Pack
├── 00_INDEX.md
├── 01_NARRATIVE.md
├── 02_ONE_PAGER.md
├── 03_DECK_STORYLINE.md
├── 04_PRODUCT_BRIEF.md
├── 05_EVIDENCE_LEDGER.md
├── 06_METRIC_CONTRACTS.md
├── 07_FINANCIAL_MODEL_SPEC.md
├── 08_USE_OF_FUNDS_AND_MILESTONES.md
├── 09_DATA_ROOM_INDEX.md
├── 10_INVESTOR_PIPELINE.md
├── 11_APPLICATION_VARIANTS.md
├── 12_RISK_REGISTER.md
└── 13_VERSION_AND_CLAIM_LOG.md
```

El contenido sensible, estados financieros, contratos y cap table deben vivir en el data room controlado,
no necesariamente en el repositorio. El repo conserva specs, índices, fuentes y decisiones.

## Mapeo a Efeonce

| Efeonce | Cómo se presenta | Qué no decir sin evidencia |
|---|---|---|
| Efeonce Group | plataforma de servicios de marketing y crecimiento habilitada por IA | SaaS puro |
| Integrated Growth Partner | lenguaje comercial | categoría técnica suficiente |
| ASaaS | modelo de delivery/monetización | financiamiento |
| Growth Operating System | visión | producto terminado si no lo está |
| AEO/Search Visibility 360 | wedge | toda la compañía |
| Globe/Creative Studio | capability/product line potencial | spinout listo automáticamente |
| Greenhouse/Kortex/Verk | infrastructure and evidence | usuarios/ARR sin medición aprobada |

## Handoff y verdicts

Usar sólo estos estados:

- `not_started`;
- `discovery_in_progress`;
- `evidence_gap`;
- `materials_ready`;
- `outreach_ready`;
- `diligence_ready`;
- `transaction_blocked`;
- `closed_reporting_ready`.

Nunca declarar “fundraising ready” si faltan los gates de evidencia, economía, legal o vehículo. El cierre
correcto enumera artefactos, owners, fuentes, riesgos abiertos, próxima decisión y fecha de revisión.

## Mantenimiento

- Revisar al menos trimestralmente y antes de cada ronda.
- Revalidar requisitos de YC, Start-Up Chile, CORFO, instrumentos, SAFE y securities law antes de una aplicación.
- Registrar URLs, fecha de consulta y jurisdicción en `references/sources.md`.
- Ejecutar `quick_validate.py` y el checklist de `checklists/readiness.md` antes de cerrar una versión.

## Composición de skills

- narrativa/categoría: `efeonce-agency`, `gtm-architect`;
- mercado: `research-benchmark-operator`, `data-analytics:market-sizing`;
- finanzas: `greenhouse-finance-accounting-operator`, `data-analytics:product-business-analysis`;
- deck: `deck-studio`;
- web: `efeonce-public-site-wordpress`, `seo-aeo`;
- IP/legal: `legal-privacy-ip-operator`;
- business model: `efeonce-business-models`;
- cierre documental: `greenhouse-documentation-governor`.
