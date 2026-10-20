---
name: commercial-expert
description: Ejecuta discovery, calificación, negociación, propuestas y seguimiento comercial Efeonce en Codex, usando el overlay del repositorio y los módulos comerciales disponibles. Para descubrir cuentas y rutas de acceso, coordina efeonce-b2b-prospecting.
---

# Commercial Expert — entrada Codex


## Partnerships, distribuidores y expedientes externos

Para recuperar membresías, completar altas/crédito o preparar documentos para distribuidores, cargar el
[manual de operación](../../../docs/manual-de-uso/comercial/operar-partnerships-y-distribuidores.md) y el registro de partnerships. Cruzar cuenta, razón social/RUT e ID antes
de registrar, formar o pedir un upgrade; no crear duplicados ni usar una membresía de otra empresa.
Separar estado del programa, curso, distribución, Marketplace, crédito y capacidad de ordenar.
Los formularios externos sólo llevan datos pertinentes: notas de búsqueda, pendientes y QA quedan en el
expediente interno. No inventar datos ni aplicar la firma del correo como firma contractual. Revisar todas
las páginas y la lista exacta de adjuntos; comprobar Enviados, archivos y CRM por separado.
Los estados variables viven en el registro/auditoría; los correos y rutas de contacto viven en el
[directorio de personas y equipos](../../../docs/operations/EFEONCE_PARTNER_CONTACT_DIRECTORY_V1.md).
Leerlo antes de localizar destinatarios; contiene funciones, fuentes, fechas, reemplazos y rebotes.
Índice nominal de recuperación (no implica cargo vigente ni autorización de envío):
- Google/Ingram: Joelvis Sarmiento, Víctor Escárate, Nicolás Santibáñez, Cristian Faúndez;
  Google for Education: Arthur Guedes y Carlos Jimenez.
- Microsoft/LOL: Geraldine Vanessa Gonzalez Moreno, Camila Orellana, Reinel Bejarano,
  Diana Jaimes y Daniela Sedlacek. Alta/crédito LOL: Lucia Gabriela Tovar.
- AWS/LOL: José Manuel Quezada, Valentina Egaña, Macarena Hein, Víctor Ledezma y Jorge Noguera;
  AWS directo: Julieth Vanessa Castillo y Daniel López.
- Adobe/Nexsys: Jean Sánchez, Francisco Araya, Constanza Moya, Javiera Castro, José Orellana
  y Vicente Ulloa. Adobe/Ingram: Melissa Danae Santos y Marco Seferino.
No confundir ambos Víctor, ni Ingram con Nexsys. Cristian, Vicente y Marco tienen rebotes registrados;
consultar la evidencia antes de reutilizarlos. María Berrios pertenece a una membresía ajena;
Jose Menezes es fuente del anuncio, no contacto operativo acreditado. No copiar ni inferir sus correos.


## Nombres de negocios y leads Efeonce

Antes de preparar o escribir `dealname` / `hs_lead_name`, aplicar la
[convención canónica](../../../docs/operations/EFEONCE_CRM_RECORD_NAMING_POLICY_V1.md), aceptada el 15/10/2026:
Deal = marca/cuenta, país, iniciativa, referencia; Lead = marca/cuenta, país, necesidad, persona,
separados por ` | `. La marca del alcance precede al holding; conservar Company legal y asociaciones.
El formato no autoriza altas, calificación ni renombrados masivos. Nuevas altas autorizadas lo adoptan;
registros existentes sólo cambian nombre dentro del mandato expreso, con antes/después y readback.

Companion de routing, no copia del método global. Carga el
[overlay Efeonce](../../../.claude/skills/commercial-expert/SKILL.md) antes de decisiones comerciales.
Sus contratos de dominio prevalecen sobre defaults genéricos; valida estado actual en canon/runtime.

Para método especializado, localizar `commercial-expert` global en las skills instaladas (en este host,
`~/.claude/skills/commercial-expert/SKILL.md`) y leer sólo los módulos de la decisión actual. Sus rutas internas
se resuelven respecto de ese bundle global, no respecto de este companion. Si no existe, seguir con overlay,
Customer Model y práctica disponible, declarar la limitación y no fingir módulos cargados.

- Descubrimiento, contactos, frío/tibio/cálido, referidos, reactivación y expansión →
  [Prospección B2B](../efeonce-b2b-prospecting/SKILL.md).
- Coordinación ABM/ABS, intensidad por cuenta y buyer enablement →
  [módulo compartido](../efeonce-b2b-prospecting/references/abm-and-abs.md); Commercial conserva ABS y Digital Marketing ABM.
- ICP/JTBD y grupo comprador → [Customer Model](../efeonce-customer-model-operator/SKILL.md).
- Discovery/prueba por oferta o función → [módulo compartido](../efeonce-b2b-prospecting/references/discovery-and-proof.md) + práctica.
- Capacidad/preventa → [economía](../efeonce-b2b-prospecting/references/capacity-and-economics.md) + Pricing/Finance;
  aprendizaje de cuenta → [resultados y vigencia](../efeonce-b2b-prospecting/references/experiments-and-learning.md).
- Empaquetado/precio → [Pricing](../efeonce-pricing-operator/SKILL.md) + Business Model/práctica.
- Operaciones CRM → [HubSpot](../hubspot-as-a-service/SKILL.md).
  Creación/calificación/cierre → [diccionario y captura por objeto](../hubspot-as-a-service/references/property-inventory.md): nombres/enums reales, evidencia por fase y campos del sistema.
  Cuentas objetivo/roles → su [adapter account-based](../hubspot-as-a-service/references/account-based-prospecting.md).

Para preparar entrada por situación, usar [playbooks de entrada](../efeonce-b2b-prospecting/references/situation-entry-playbooks.md).
Cadencias y respuestas se coordinan con [cadencia de cuenta](../efeonce-b2b-prospecting/references/account-cadence.md)
y [tratamiento de respuestas](../efeonce-b2b-prospecting/references/response-handling.md); Commercial conserva
objeciones, calificación y negociación. Preparación del remitente/canal: [entregabilidad](../efeonce-b2b-prospecting/references/deliverability-operations.md),
sin convertir método en autorización de envío, enrollment, cambios DNS o pausas aplicadas.

No cargar recursivamente ambos entrypoints: cada owner conserva su fase. Una oportunidad/etapa o una
invocación comercial no autoriza precio, contrato, consumo pagado, CRM ni envío adicionales al pedido.

## Ofrecer medios de forma integral

Cargar el [manual programático](../../../docs/manual-de-uso/comercial/ofrecer-publicidad-programatica.md) y el
[método compartido](../digital-marketing/references/programmatic-media-operations.md). Partir del problema de
mix/inversión y presentar una responsabilidad Efeonce con alcance, owners, honorarios y externos claros. Proveedores
permanecen en el expediente interno. Una demo, entrenamiento declarado o ejemplo de fee no prueba licencia,
crédito, ahorro ni capacidad activa. Mapear retainer y cotizar sólo alcance incremental; no duplicar planificación,
setup, coordinación o reportes ni sumar fees completos por canal. Preservar la aprobación acotada del servicio.
