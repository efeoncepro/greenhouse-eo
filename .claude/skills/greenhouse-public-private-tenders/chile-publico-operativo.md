# Chile Público — Operativa ChileCompra

> **Vigencia:** umbrales en UTM y plazos cambian por reglamento y por la reforma 21.634. La UTM se reajusta mensualmente. Verifica el valor UTM del mes y el umbral vigente antes de afirmar montos. Fuentes: `www.chilecompra.cl`, Reglamento DS 250.

## Modalidades de compra (no todo es "licitación")

| Modalidad | Qué es | Cuándo la usa el organismo |
|---|---|---|
| **Licitación Pública** | Concurso abierto, la regla general | Por defecto sobre ciertos montos |
| **Licitación Privada** | Concurso por invitación, requiere causal fundada + resolución | P. ej. licitación pública previa desierta/sin oferentes |
| **Trato o Contratación Directa** | Adjudicación directa por causal legal (proveedor único, emergencia, confidencial, montos menores, etc.) | Excepcional, fundada y publicada |
| **Convenio Marco** | Catálogo/tienda ChileCompra: el organismo compra de un catálogo preadjudicado (como e-commerce B2G) | Bienes/servicios estandarizados ya convenidos |
| **Compra Ágil** | Procedimiento simplificado de menor cuantía; el organismo pide ≥3 cotizaciones vía `mercadopublico.cl` | Montos ≤ **100 UTM** (post-reforma; páginas antiguas dicen 30 UTM — usa 100 y versiona la fuente) |
| **Compra por cotización / Grandes Compras / Compras Coordinadas / Subasta Inversa / Diálogo Competitivo de Innovación / Bases Tipo** | Procedimientos especiales | Según reglamento/naturaleza |

Implicación para Efeonce: el radar debe modelar **`opportunity_kind`** amplio, no solo "licitación". Para servicios de agencia, lo jugoso suele ser **Licitación Pública (LE/LP)**, **Compra Ágil (COT)** para trabajos chicos rápidos, y **Convenio Marco** si Efeonce llega a estar en un catálogo.

## Códigos de procedimiento (el sufijo del ID dice mucho)

El `CodigoExterno` de una licitación trae un sufijo, p. ej. `1000813-8-LE26` → procedimiento `LE`, año `26`. **Guarda dos planos distintos**: `Tipo` (código de procedimiento, p. ej. `LE`) y `CodigoTipo` (numérico de visibilidad: `1=Pública`, `2=Privada`). No los mezcles ni derives la familia solo del prefijo — usa tabla de mapping versionada.

| Código | Familia | Descripción |
|---|---|---|
| `L1` | licitación pública | menor a 100 UTM |
| `LE` | licitación pública | entre 100 y 1.000 UTM |
| `LP` | licitación pública | mayor a 1.000 UTM |
| `LS` | licitación pública | servicios personales especializados |
| `A1/B1/E1/F1/J1/CO/B2/E2` | licitación privada | por causales (pública desierta, remanente, extranjero, confidencial, otras, tramos de monto) |
| `A2/D1` | trato directo | producto de privada sin oferentes / proveedor único |
| `C2/F2/G2` | trato directo con cotización | |
| `C1/F3/G1` | compra directa / orden de compra | |
| `R1/CA/SE` | orden de compra | R1 = OC < 3 UTM |
| `COT` | **Compra Ágil** | cotización solicitada por Compra Ágil (formato `2409-196-COT26`) |
| `RFI / RF` | consulta al mercado | Request for Information |

> Nota técnica: `COT` (Compra Ágil) y `RFI/RF` **no** entran por el endpoint `licitaciones.json` validado — requieren la API Compra Ágil v2 Beta u otros carriles. Detalle en `data-sources-apis.md`.

## Anatomía de una licitación pública (bases → contrato)

1. **Publicación de bases** — `mercadopublico.cl`. Documentos clave:
   - **Bases administrativas**: reglas del juego (plazos, garantías, forma de presentación, criterios de evaluación y sus ponderaciones, requisitos de admisibilidad, forma de pago).
   - **Bases técnicas**: qué se pide (alcance, entregables, requisitos técnicos, SLA, perfiles del equipo).
   - **Anexos**: formularios obligatorios (identificación, oferta económica, declaraciones juradas, experiencia, equipo).
2. **Foro de preguntas y respuestas (aclaraciones)** — canal **público** e igualitario. Todo lo relevante que no esté en bases, pregúntalo por acá. Las respuestas modifican/complementan las bases.
3. **Cierre de recepción de ofertas** — plazo fatal. La oferta se sube electrónicamente. Tarde = fuera.
4. **Acto de apertura electrónica** — se abren ofertas; se levanta acta. Primero apertura administrativa/técnica, luego económica (si es en dos sobres).
5. **Evaluación** — la **comisión evaluadora** aplica los criterios ponderados de las bases y levanta **acta/informe de evaluación**. Puede pedir aclaraciones o salvar errores/omisiones formales (dentro de lo que permitan las bases, sin alterar la oferta).
6. **Adjudicación** — por **resolución fundada** del organismo, publicada. Puede declararse **desierta** (ninguna oferta conviene) o **revocada/suspendida**.
7. **Contrato** — firma; puede requerir **garantía de fiel cumplimiento**, inscripción hábil en ChileProveedores, y eventual **toma de razón** de Contraloría según monto.
8. **Ejecución y pago** — entregables, recepción conforme, facturación, pago (ojo con los plazos reales del Estado → `pricing-garantias-finance.md`).

## Criterios de evaluación (dónde se gana el puntaje)

Las bases definen criterios **ponderados** que suman 100%. Típicos en servicios de agencia:

- **Precio / oferta económica** (fórmula, casi siempre precio mínimo = puntaje máximo, proporcional).
- **Experiencia** del oferente (cantidad/relevancia de trabajos similares; se acredita con anexos/certificados).
- **Propuesta técnica / metodología** (calidad del enfoque, plan de trabajo, comprensión del problema).
- **Equipo** (perfiles, CVs, dedicación).
- **Plazo** de entrega.
- **Cumplimiento de requisitos formales** (a veces puntúa la completitud/oportunidad de los anexos).
- **Criterios inclusivos/sostenibilidad** (reforzados por 21.634: inclusión, MIPYME, medio ambiente, equidad de género — pueden dar puntaje).

**Regla de oro:** lee primero la **tabla de ponderaciones** y **modela la oferta hacia ella**. Si precio pesa 40% y técnica 60%, la batalla es técnica; si precio pesa 70%, es guerra de costos y quizás no calce con margen (→ NO-BID). El scoring bid/no-bid usa exactamente esto (`bid-lifecycle-go-no-go.md`).

## Garantías (visión operativa; detalle económico en pricing-garantias-finance.md)

| Garantía | Para qué | Cuándo |
|---|---|---|
| **Seriedad de la oferta** | Que no te retractes tras ofertar | Se exige al ofertar en montos altos (no siempre en LE menores) |
| **Fiel cumplimiento del contrato** | Que cumplas el contrato | Al firmar |
| **Anticipo** | Respaldar un pago adelantado | Si el contrato contempla anticipo |
| **Correcta ejecución / buena ejecución** | Cubrir defectos post-entrega | Según bases |

Instrumentos aceptados: boleta de garantía bancaria, **vale vista**, **póliza de seguro de garantía**, **certificado de fianza**, depósito a la vista. Cada uno tiene costo y plazo de emisión distintos → impacta cashflow y el propio bid/no-bid.

## Plazos: la trampa silenciosa

- Los plazos mínimos entre publicación y cierre dependen del **tipo** (una LP da más días que una L1/LE). Verifica el mínimo reglamentario vigente.
- El **plazo real útil** para preparar la oferta es menor que el nominal: descuenta emisión de garantías, obtención de certificados, y la ventana de preguntas.
- Un cierre en 3 días hábiles con garantía de seriedad exigida suele ser NO-BID salvo que ya tengas todo pre-armado.

## Checklist operativo mínimo antes de ofertar

- [ ] Leí bases administrativas **y** técnicas **y** todos los anexos.
- [ ] Tengo la **tabla de ponderaciones** y modelé la oferta hacia ella.
- [ ] Identifiqué **requisitos de admisibilidad excluyentes** (≠ criterios que puntúan).
- [ ] Verifiqué **inhabilidades** y estado en **ChileProveedores**.
- [ ] Dimensioné **garantías** (tipo, monto, vigencia, instrumento, costo, tiempo de emisión).
- [ ] Revisé el **foro**: preguntas propias enviadas + respuestas de otros que cambian las bases.
- [ ] Confirmé **plazo de cierre** y ventana real útil.
- [ ] Corrí **bid/no-bid con margen sobre loaded cost** (no solo fit).

## Hand-off

- Decidir participar/priorizar → `bid-lifecycle-go-no-go.md`.
- Precio + garantías + cashflow → `pricing-garantias-finance.md`.
- Armado del paquete de oferta → `propuesta-tecnica-economica.md`.
- Base legal / inhabilidades / recursos → `chile-publico-marco-legal.md` + `compliance-riesgo-integridad.md`.
