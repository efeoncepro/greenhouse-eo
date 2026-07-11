# 05 · Derecho Comercial / Contratos

> **⚠️ No es asesoría legal.** Orienta la estructura de un contrato y sus riesgos; **no redacta el contrato final vinculante** — eso lo hace un abogado. Cita jurisdicción y "valida antes de firmar".

El "derecho comercial" que le importa a una agencia es sobre todo **derecho de contratos**: los acuerdos con clientes, proveedores y freelancers. Este módulo mapea los documentos, las cláusulas que mueven el riesgo, y las diferencias por jurisdicción.

## El stack contractual de una agencia

| Documento | Para qué | Cuándo |
|---|---|---|
| **NDA / Acuerdo de confidencialidad** | proteger info sensible antes/durante la relación | pre-venta, pitch, due diligence |
| **MSA (Master Services Agreement)** | marco legal general de la relación | al iniciar relación de largo plazo |
| **SOW (Statement of Work)** | el trabajo concreto (alcance, entregables, precio, plazos) | por proyecto/retainer, colgado del MSA |
| **Retainer / contrato de servicios** | servicios recurrentes | relación continua |
| **SLA (Service Level Agreement)** | niveles de servicio, disponibilidad, soporte | cuando hay compromisos medibles |
| **Contratos con vendors/freelancers** | subcontratación de producción/talento | cada tercero que ejecuta |
| **Órdenes de compra / propuestas aceptadas** | formalización acotada | ventas simples |

**MSA + SOW** es el patrón dominante: el MSA fija las reglas una vez; cada SOW cuelga de él con el trabajo específico. Evita renegociar todo en cada proyecto.

## Las cláusulas que mueven el riesgo (dónde mirar primero)

1. **Objeto y alcance** — qué se entrega, qué **no** (evita scope creep; conéctalo al SOW).
2. **Precio y forma de pago** — montos, hitos, moneda, plazos (net-30/45/60 → cashflow, `greenhouse-finance-accounting-operator`), reajuste (UF/indexación).
3. **Propiedad intelectual** — **quién es dueño de los entregables** y cuándo se transfiere (típicamente **contra pago total**). ⚠️ La joya de la agencia — detalle completo en `06`. No firmes cesión total de IP sin considerar tu portafolio y tus assets reusables.
4. **Confidencialidad** — mutua, con duración y excepciones.
5. **Garantías (warranties)** — qué prometes (originalidad, no infracción de terceros) y qué **no** (resultados de negocio — evita garantizar KPIs).
6. **Limitación de responsabilidad (limitation of liability)** — **cap** de responsabilidad (típico: monto pagado en los últimos N meses) + exclusión de daños indirectos/consecuenciales. **Cláusula crítica** — sin cap, expones a la agencia a daños enormes.
7. **Indemnización (indemnity)** — quién cubre a quién y por qué (típico: la agencia indemniza por infracción de IP de sus entregables; el cliente por los materiales que aporta). Que sea **recíproca y acotada**.
8. **Terminación** — causales, preaviso, efectos (pago de trabajo en curso, devolución de materiales, licencias que sobreviven).
9. **Ley aplicable y foro (governing law / jurisdiction)** — **qué derecho rige y dónde se litiga/arbitra**. En cross-border es decisivo: no aceptes litigar en una jurisdicción hostil/cara sin razón. Arbitraje como alternativa.
10. **Fuerza mayor, cesión, subcontratación, no solicitación, supervivencia** — el "boilerplate" que igual importa.
11. **Datos personales / DPA** — si tratas datos del cliente, el **contrato de encargo** va aquí o anexo (`04`).

## Diferencias por jurisdicción (no exportar el derecho)

- **Civil law (Chile, Colombia, México, Perú)** — el contrato se interpreta con el Código Civil/Comercial local; hay normas imperativas que **no se pueden pactar en contra** (p. ej. **derechos morales de autor irrenunciables**, ciertas protecciones al consumidor). Un MSA gringo copiado tal cual puede tener cláusulas **inaplicables o nulas**.
- **Common law (EEUU)** — más libertad contractual, "freedom of contract", pero conceptos propios (consideration, "work made for hire", disclaimers de warranties en MAYÚSCULAS, indemnities amplios). Al entrar a EEUU, **usa contratos US redactados para US** (en-US), no traducciones.
- **Regla:** el contrato debe redactarse **para la ley aplicable**, no traducirse mecánicamente. Un mismo cliente multinacional puede requerir versiones por jurisdicción.

## Firma electrónica

- **Chile / LATAM:** firma electrónica reconocida (Chile Ley 19.799 firma electrónica; equivalentes por país). Firma electrónica **avanzada** vs simple tiene distinto valor probatorio.
- **EEUU:** **ESIGN Act** (federal) + **UETA** (estatal) — la firma electrónica es válida y ejecutable.
- **Runtime Efeonce:** la firma se opera vía el **adapter ZapSign** (provider-neutral; ver `INTEGRATIONS_INFRA_AGENT_INVARIANTS`). **NUNCA** llamar la API de ZapSign directo — usar el port/adapter. La skill define el **requisito legal**; el runtime lo ejecuta.

## Contratos con vendors / freelancers (crítico para IP)

Si un freelancer produce parte del entregable, **su contrato debe ceder la IP a Efeonce** (o a quien corresponda), o Efeonce no puede transferirla al cliente. Cadena de IP rota = no puedes entregar limpio. Asegura el **flow-down** de cesión de derechos + confidencialidad + no infracción. Detalle en `06`.

## Checklist de revisión de contrato

- [ ] ¿MSA + SOW o documento único? Alcance claro (qué sí / qué no).
- [ ] **IP**: quién es dueño, cuándo transfiere, qué me reservo (`06`).
- [ ] **Cap de responsabilidad** + exclusión de daños indirectos.
- [ ] **Indemnidad recíproca y acotada.**
- [ ] Garantías razonables (no garantizar resultados de negocio).
- [ ] **Ley aplicable + foro** apropiados a la relación (cross-border consciente).
- [ ] Pago (plazos, moneda, indexación) — cashflow (`finance`).
- [ ] **DPA** si trato datos del cliente (`04`).
- [ ] Terminación y qué sobrevive.
- [ ] Firma electrónica válida en la jurisdicción (ZapSign vía adapter).
- [ ] Cadena de IP con vendors/freelancers asegurada.

## Hand-off

- IP/ownership/licencias a fondo → `06`; IP de contenido IA → `07`.
- DPA/transferencias → `04`.
- Pricing/pago/factoring/entidad → `greenhouse-finance-accounting-operator` + `commercial-expert`.
- Contratos en licitaciones (público/privado) → `greenhouse-public-private-tenders`.
- Firma runtime → adapter ZapSign (`INTEGRATIONS_INFRA`).
- **Redacción/validación vinculante** → abogado habilitado en la jurisdicción.
