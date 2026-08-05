# Licitación / Propuesta — Polpaico · LIC-6533

> **Estado:** discovery interno en **HOLD / NO-BID provisional** · propuesta bloqueada por capacidad,
> certificaciones, partnership y pricing · **No enviar ni cargar en Wherex** · **Deadline histórico:**
> 2026-08-24 16:00 (Chile) · **Origen:** private_rfp / Wherex
> **Wherex:** LIC-6533 · **Owner:** Julio Reyes · **Creado:** 2026-07-31

Workspace interno del deal (el "DSR interno"). Las FUENTES viven acá como archivos git; las
SALIDAS versionadas (PDF renderizados) y la quote viven en el aggregate `Proposal`, que referencia
esta carpeta por `proposal_id`. Contrato de la carpeta: `../TENDER_WORKSPACE_TEMPLATE.md`.

## Artefactos

### 🟠 Borradores potencialmente client-facing — bloqueados, no aprobados

- `oferta-tecnica.md` — narrativa y ledger de evidencia incompletos; no constituye oferta presentable.
- No existe oferta económica client-facing: `oferta-economica-INTERNO.md` conserva sólo la arquitectura sin
  precios. El stub renderizable de monto cero fue retirado para impedir una emisión accidental.
- No existe `deck-plan.json`; cualquier deck requiere decisión, plan propio, pricing aprobado y revisión visual.
- `anexos/` — administrativos (declaraciones, poderes, certificados).
- `artifact-manifest.json` — punteros a artefactos VIVOS (Radiografía, Grader) — por enlace.

### 🔒 INTERNOS — NUNCA van al cliente

- `research/` — diagnóstico, benchmark, VoC, fuentes crudas.
- `*-INTERNO.md` — squad-blueprint (loaded cost + piso), matriz de admisibilidad si aplica.

### Fuente normativa

- `bases/` — el RFP, bases admin/técnica/económica, aclaraciones del foro. **Manda sobre todo.**

## Identificación del proceso

- **Nombre exacto:** RFP - Implementación de Agente de Inteligencia Artificial para Post Venta con Salesforce Agentforce sobre Salesforce Service Cloud.
- **Comprador:** Grupo Polpaico BSA / Polpaico Soluciones S.A.
- **SKU Wherex:** WEXCPP_1944465550371.
- **Servicio:** implementación, configuración y habilitación de Agentforce sobre un Salesforce Service Cloud existente.
- **Cierre:** 24/08/2026 a las 16:00, hora de Chile.
- **Consultas:** 31/07/2026, único día; respuestas del comprador: 05/08/2026.
- **Evaluación:** cumplimiento funcional/técnico 30%; experiencia Salesforce, Service Cloud y Agentforce 25%; equipo 10%; metodología 15%; económica 20%.
- **Pago:** facturas a 60 días desde la emisión, según Anexo D del RFP.

La lectura recomendada del desafío comercial es: Polpaico no está comprando “un chatbot”. Está comprando una primera capacidad gobernada de IA dentro de Service Cloud que reduzca trabajo manual de Post Venta sin perder control humano, trazabilidad, seguridad ni capacidad de evolución.

## Qué falta

- [x] Discovery documental, correo y evidencia inicial en `research/`.
- [x] Ledger de evidencia y matriz de requisitos inicial.
- [ ] Copiar/materializar el RFP y anexos en `bases/` si se requiere un paquete offline; por ahora se conservan referencias autenticadas.
- [ ] Confirmar bid/no-bid con capacidad Salesforce/Agentforce y margen validado por Finance.
- [ ] Resolver preguntas críticas antes del 31/07/2026 o documentar que no fueron respondidas.
- [ ] Validar equipo, certificaciones, referencias comprobables y partnership Salesforce.
- [ ] Dimensionar alcance, cost-to-serve, riesgo y precio; no crear un artefacto económico renderizable hasta
  contar con aprobación de Finance.
- [ ] Redactar oferta técnica final y matriz obligatoria del Anexo B.
- [ ] Decidir si el comité se beneficiará de deck técnico + deck económico separados; el RFP no los exige explícitamente.
- [ ] Si se decide deck: autorar planes propios, preparar assets propios, componer y revisar todos los frames.
- [ ] Registrar el deal como `Proposal` en el Studio y adjuntar salidas sólo después de aprobación humana.
