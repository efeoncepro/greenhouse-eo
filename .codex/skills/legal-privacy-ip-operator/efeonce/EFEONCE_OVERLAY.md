# Overlay Efeonce — lo legal aterrizado en el negocio real

La skill es genérica y reutilizable, pero Efeonce tiene una realidad legal concreta. Este overlay ancla la entidad, el stack, y las decisiones que se repiten. **No es asesoría legal** — orienta y remite a abogado.

## Entidad y mercados

- **Entidad contratante: Efeonce Group SpA** (Chile). Es quien firma como parte en los contratos salvo que se cree una entidad local por mercado.
- **Opera en Chile, Colombia, México, Perú**; **abriendo Estados Unidos** (`03`/`03b` cobran urgencia). La apertura de US puede requerir **entidad US** (LLC/Inc.) para contratar/facturar allá — decisión legal/fiscal (coordina con `greenhouse-finance-accounting-operator` + abogado US).
- **Clientes Globe internacionales** → posible alcance **GDPR** (`04`).

## El doble rol legal de Efeonce (interiorízalo)

1. **Como agencia (processor):** trata datos de sus clientes (campañas, CRM, martech) → necesita **DPA con cada cliente** + **DPAs con sub-processors** (HubSpot, Google, Notion, nubes US) (`04`).
2. **Como autor/licenciante:** crea entregables → define ownership y licencias con cada cliente (`06`), y licencia correctamente los inputs (stock/música/fuentes/IA) (`06`, `07`).
3. **Como responsable propio (controller):** sus leads/marketing/portal → responsable de su propia privacidad y transferencias.

## Firma electrónica — runtime ZapSign

- La firma de contratos se opera vía el **adapter ZapSign** (provider-neutral; ver `INTEGRATIONS_INFRA_AGENT_INVARIANTS`). **NUNCA** llamar la API de ZapSign directo — usar el port/adapter.
- Firma electrónica válida en Chile (Ley 19.799) y US (ESIGN/UETA). La skill define el **requisito legal**; el runtime firma.

## Stack que dispara obligaciones de datos

- **HubSpot** (CRM/marketing), **Google GA4/Ads**, **Notion**, nubes en **EEUU** → transferencia internacional + DPAs con proveedores + declaración en la privacy policy (`04`, `09`).
- **Formularios / lead magnets** (`greenhouse-growth-forms`) → consentimiento informado + finalidad clara; **ebooks** se entregan por link (no adjunto) desde bucket privado (ver playbook de ebooks). El **dato de contacto capturado** es dato personal → base de licitud.
- **Nubox** (facturación) → datos de facturación; toque fiscal → `greenhouse-finance-accounting-operator`.

## Contenido y campañas — reglas que se repiten

- **Ownership de entregables:** cede patrimoniales al cliente **contra pago total**, **reserva** los assets/frameworks reusables de Efeonce, y pacta el **derecho de portafolio** (`06`). En Chile/LATAM, cesión explícita (no "work for hire" ciego; derechos morales irrenunciables).
- **Inputs licenciados:** stock/música/fuentes/fotos/IA con las 5 dimensiones (`06`); IA con proveedor que permita uso comercial + (idealmente) indemnidad (`07`).
- **Releases** de personas/lugares en toda producción (`06`).
- **Publicidad:** claims sustanciados (el cliente aporta la evidencia por contrato) + **disclosure de influencers** verificado (`08`).

## Boundary con Payroll (duro)

- Todo lo **laboral** — contratos de trabajo, honorarios/contractor **desde la relación laboral**, finiquito, previsional, jornada — es del dominio **Payroll** (`greenhouse-payroll-auditor` + `PAYROLL_WORKFORCE_AGENT_INVARIANTS` / `CONTRACTOR_ENGAGEMENTS`). Esta skill **no** opina laboral.
- Sí toca esta skill: los **NDAs/confidencialidad** y **cesión de IP** de un freelancer/vendor **como cláusula de IP/contrato civil-comercial** (`05`, `06`) — pero la **relación laboral/contractor** y su compliance es de Payroll. Si hay duda de frontera, coordina con `greenhouse-payroll-auditor`.

## Sinergias operativas (dónde vive cada ejecución)

- Privacidad/consent runtime → `greenhouse-gtm-ga4-operator` + `greenhouse-growth-forms` + `arch-architect`/`greenhouse-backend` (PII/retención) + `greenhouse-secret-hygiene` (seguridad).
- Páginas legales del sitio → `efeonce-public-site-wordpress`.
- Contratos en deals/licitaciones → `commercial-expert` + `greenhouse-public-private-tenders`.
- IP/publicidad de contenido → `content-marketing-studio` + `copywriting` + `social-media-studio` + `greenhouse-ai-image-generator`.
- Contexto de negocio/entidad/marca → `efeonce-agency`.

## Reglas duras del overlay

- **NUNCA** dar asesoría legal vinculante; orienta + cita + "valida con abogado habilitado".
- **NUNCA** opinar laboral (→ Payroll).
- **NUNCA** citar norma sin verificar vigencia (privacidad web-verificada as-of 2026-07; reverifica).
- **NUNCA** llamar ZapSign directo (usar adapter); **NUNCA** meter PII/confidencial real en IA sin gobernanza.
- **NUNCA** ceder los assets reusables de Efeonce con cada proyecto ni aplicar "work for hire" gringo en LATAM asumiendo transferencia total.

## Cross-links

- Privacidad → `../modules/01`-`04`; contratos → `05`; IP → `06`; IA-IP → `07`; publicidad → `08`; digital → `09`.
- Fuentes verificadas → `../SOURCES.md`.
