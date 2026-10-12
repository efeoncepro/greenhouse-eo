# Alta focal de radar — INAPI y SERNATUR Arica | 10/10/2026

**Decisión posterior vigente:** Arica NO-BID por Julio; Lead Disqualified/NO_INTEREST y tarea Cancelada, verificados. Control12/10 cancelado. [Descarte y evidencia](2026-10-10-arica-no-bid.md). El corte inferior documenta el alta inicial.

Julio autorizó incluir las dos faltantes con todo lo correspondiente. Dos Leads New por calificar, dos notas y dos tareas Notion; compañías existentes reutilizadas. Sin Deal, contactos nuevos, forecast, GO, cotización, propuesta, envío o postulación. No renueva cobertura global ni modifica la automatización existente.

| Caso | Expediente | Lead / Company / nota | Tarea Julio | Meta interna / plazo externo Chile |
| --- | --- | --- | --- | --- |
| 519302-9-LE26 | [INAPI — Campañas de marketing digital](../../tenders/inapi-marketing-digital-519302-9-le26/README.md) | [Lead 595750420294](https://app.hubspot.com/contacts/48713323/objects/0-136/views/all/list?leadId=595750420294&utm_source=codex&utm_medium=ai_agent); 34939665568 / 118339677186 | [Alta · Sin empezar](https://app.notion.com/p/3f539c2fefe78108bd57fef0ab6e5002?pvs=204) | 16/10 12:00; foro 19/10 15:00; oferta 02/11 16:00 |
| 1330-22-COT26 | [SERNATUR Arica — Campaña medios online](../../tenders/sernatur-arica-medios-online-1330-22-cot26/README.md) | [Lead 595750420295](https://app.hubspot.com/contacts/48713323/objects/0-136/views/all/list?leadId=595750420295&utm_source=codex&utm_medium=ai_agent); 31640422315 / 118333867172 | [Alta · Sin empezar](https://app.notion.com/p/3f539c2fefe781e6a035df7493f63a1e?pvs=204) | 12/10 09:00; oferta 12/10 18:00 según LicitaLAB |

## Fuentes y puertas pendientes

INAPI: ficha oficial y LicitaLAB corroboran calendario; tres anexos DOCX originales y hashes. PDF normativo protegido por reCAPTCHA; lectura RAG parcial por páginas. 23,5M impuestos incluidos, pauta ≥70%/fee ≤30%, cuotas contra informes; referencias, costo/caja y metas 20.000/25.000 pendientes. Arica: PDF oficial completo de 7 páginas y SHA256; cierre LicitaLAB no corroborado por SPA oficial. 7,1M IVA incluido, fee ≤10% (710k sobre envolvente); soportes 4,5M vs total 7,1M, destinos alternativos, pago final y financiamiento pendientes.

## Readback y control de duplicados

Portal 48713323; identidad Julio jreyes@efeoncepro.com, owner 75788512. CLI OAuth para escritura Lead; conector para notas y lectura independiente. Dos Leads con etapa New, abiertos y empresas principales; notas asociadas a Lead/Company. Fetch Notion posterior confirma proyecto, responsable Julio, prioridad Alta, estado Sin empezar, metas internas distintas del cierre externo y cuatro criterios pendientes. Ver JSON de readback en cada expediente. Búsquedas previas por ID dieron cero Leads/Deals; IDs guardados en state.json para reutilización.

No se cambia el nombre histórico “Servico Nacional de Turismo” de Company 31640422315 ni se altera otro proceso SERNATUR. No se creó cohorte prospecting ni se infirió relación newbusiness/crosssell. Los anexos originales son formularios del comprador, sin firma de Efeonce.

## Validación

Readback exacto de las dos notas verificado; asociaciones Lead–Company Primary y nota–Lead/Company completas y sin paginación. Búsqueda posterior: un Lead y cero Deals por ID. Catorce JSON válidos, hashes de cuatro originales verificados, DOCX íntegros y PDF Arica de siete páginas legibles. Cero enlaces locales rotos en ambos expedientes; 47 claves de seguimiento únicas. Documentation closure focal: 0 warnings; git diff --check focal sin errores.

`pnpm qa:gates --changed --agent codex -- <rutas focales>` devuelve BLOCK de cierre de Proposal para ambos: falta oferta técnica/plan y verificación canónica, estado workshop_only. Es el estado esperado de investigación sin oferta; no se altera el gate ni se inventa una propuesta para pasarlo. `node scripts/check-documentation-closure.mjs -- <rutas focales>` pasó. No se ejecutó el wrapper global de auditorías de flags/modelos, ajeno a este intake. Alta operativa y decisión de participar son estados distintos; no se debe pasar proposal-studio.json a verified para una investigación.

[Auditoría focal de cierre](2026-10-10-inapi-arica-QA.md): alta operativa PASS; Proposal/participación pendientes. Ops lint con sintaxis válida pasó sin errores y con warnings de tareas/epics ajenos a estas altas.
