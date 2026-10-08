# Licitaciones, CRM y continuidad — consolidación 2026-10-08

Owner: Commercial / Julio Reyes. Actualización documental solicitada expresamente por el operador y ejecutada con tres subagentes: documentación comercial, skills y seguimiento. Esta consolidación no es una nueva corrida global de CRM, Outlook ni scheduler.

## Estado recuperado y fuentes

| Frente | Hecho documentado | Continuidad |
| --- | --- | --- |
| Investigación LicitaLAB | Vista Todos con 203 IDs únicos; búsqueda ampliada de 38 términos y 2.860 IDs observados. Incluye CRM, creativos, diseño web y licencias Claude/OpenAI. No representa todas las compras nacionales ni lectura íntegra de cada documento. | [Informe y cobertura](../../commercial/tenders/licitalab-deep-review-2026-10-07/README.md). |
| Altas autorizadas | Registros de licitaciones y prospectos conservados; Diego/Yanbal y Emily/Olivos investigados y registrados con procedencia del contacto. Apollo para Diego fue autorizado. | [Altas de licitaciones](../../commercial/tenders/licitalab-deep-review-2026-10-07/HUBSPOT_ALTA_2026-10-08.md), [prospectos creativos](2026-10-08-creative-prospect-intake.md). No nuevas altas en esta consolidación. |
| Calificación y segmentos | El operador indicó conservar Deals creados; futuras señales permanecen lead hasta calificación. Reutilizar segmentos activos y completar propiedades; conservar estáticos. | [Readback de segmentos y agente](2026-10-08-prospecting-agent-active-segments.md). Sus conteos/créditos son del corte observado, no una consulta nueva. Membresía no acredita inscripción ni envío. |
| Seguimiento comercial | Cadencia autorizada lunes a viernes 09:00 y 16:00 America/Santiago; 23 tareas y tres textos en Notion en el corte inicial. | [Contrato, bitácora e IDs](../../commercial/follow-up-agent/README.md). Se preservan observaciones y estados externos; no se inventa ejecución programada ni cierre de tareas. |
| Outlook | Error 403 histórico al guardar borrador; investigación de conexión/permisos documentada. No hay prueba de reconexión ni borrador guardado en Outlook. | [Registro](../../commercial/follow-up-agent/REGISTRO.md). Comprobar capacidades efectivas en una ejecución futura; reconectar no garantiza permisos de escritura. |
| UTEM | Compra Ágil 5251-1060-COT26: dos originales descargados; cuatro anexos administrativos firmados en DOCX y PDF; consolidado de seis páginas. | [Revisión vigente](../../commercial/tenders/licitalab-deep-review-2026-10-07/UTEM-5251-1060-COT26-REVISION-2026-10-08.md). Quedan técnica, ficha de cumplimiento, cotización, costo/margen y precio exacto. Sin oferta presentada. |
| UTEM · deck y técnica v1.1 | Deck de 35 láminas, PDF y técnica v1.1 alineada (Claude, 08/10); sin presentación. | [Registro del deck](2026-10-08-utem-deck-propuesta-tecnica.md) |
| Datos del operador | Participación del 100%, teléfono, banco y habilitación Mercado Público confirmados por Julio; sin vínculos/deudas con UTEM y ejecución in-house para ese proceso. | [Ficha corporativa](../../commercial/EFEONCE_DATOS_PARA_LICITACIONES.md). Confirmación del operador no equivale a certificado consultado en vivo. Los datos sensibles no se duplican en skills. |

## Criterios incorporados

1. **Plataformas en general:** Wherex, Mercado Público y procesos descubiertos mediante LicitaLAB se preparan para postulación por su plataforma. El contacto previo no es requisito automático. Si no hay canal de consultas, conservar la limitación y trabajar con bases y supuestos acordados; nunca inventar cumplimiento.
2. **UTEM:** tres meses desde el inicio definido por UTEM; orientación del operador cercana a CLP 6,8 M netos, sin convertirla en confirmación tributaria del comprador. El primer cierre observado fue 08/10 a las 18:00 Chile; una eventual segunda llamada no prueba extensión. Revalidar estado antes de actuar.
3. **Contacto UTEM:** búsqueda en Outlook sin interlocutor del proceso. `facturas@utem.cl` corresponde a facturación. No se enviaron consultas ni se exigirá respuesta inexistente para preparar.
4. **Expediente:** `Licitaciones/<Empresa o institución>/<N>. <Proceso>`; UTEM usa `UTEM/1. Agencia SEO-AEO`. Separar originales, revisión, anexos y archivo de versiones. OneDrive local verificado no acredita sincronización remota.
5. **Autorizaciones:** respetar las concedidas dentro de su alcance; firma gráfica autorizada para anexos UTEM no se extiende a otras declaraciones ni a presentación. Preparar, registrar CRM, pertenecer a un segmento, inscribir y enviar son acciones distintas.

## Superficies sincronizadas

- Documentación comercial: índice, ficha de datos, registros CRM/licitaciones, revisión LicitaLAB, UTEM y prospectos Yanbal/Olivos. En OneDrive se actualizó la revisión y `LEEME.md`; originales y firmados preservados.
- Seguimiento: README, REGISTRO, state.json y [ADR existente](../../architecture/GREENHOUSE_COMMERCIAL_FOLLOWUP_AGENT_DECISION_V1.md). No cambió la automatización remota ni el corte observado global.
- Skills Codex/Claude: once archivos por espejo en `greenhouse-public-private-tenders` y `hubspot-as-a-service`, incluida la nueva [referencia de plataformas y expediente](../../../.codex/skills/greenhouse-public-private-tenders/platform-bids-and-administrative-package.md).
- Método visible: [manual de construcción](../../manual-de-uso/comercial/construir-una-licitacion.md), [LicitaLAB](../../manual-de-uso/comercial/revisar-licitaciones-licitalab-con-cli.md), [Wherex](../../manual-de-uso/comercial/revisar-licitaciones-wherex-con-chrome.md), [documentación funcional](../../documentation/comercial/construccion-de-licitaciones.md) e [invariantes comerciales](../../architecture/agent-invariants/COMMERCIAL_TENDERS_AGENT_INVARIANTS.md).
- Descubrimiento: Handoff, project_context, changelog e índice de auditorías enlazan las fuentes vigentes. Historia conservada con estado posterior explícito.

## Verificación

- Subagentes: enlaces comerciales y OneDrive, JSON/IDs de seguimiento, cuatro hashes PDF, integridad de cuatro DOCX y consolidado de seis páginas correctos. No se regeneraron los firmados.
- Skills: `pnpm skills:mirrors` PASS y comparación byte a byte de los once pares PASS (incluye HubSpot, fuera de la lista del gate global).
- Integración: 272 enlaces locales válidos, cero rotos; `git diff --check` acotado PASS. `node scripts/check-documentation-closure.mjs` sobre rutas de esta consolidación PASS, sin faltantes detectados.
- Contexto: `pnpm docs:context-check:strict` PASS, cero errores/warnings. Los resúmenes se compactaron a referencias canónicas sin perder detalle; no se rotó ni borró historia.

No se enviaron correos, inscribieron contactos, cambiaron etapas, compraron créditos ni presentaron ofertas durante esta consolidación. Sin commit ni push.
