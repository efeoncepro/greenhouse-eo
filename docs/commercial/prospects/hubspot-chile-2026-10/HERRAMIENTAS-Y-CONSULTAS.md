# Herramientas de prospección verificadas — 19/10/2026
Método: [estrategia](ESTRATEGIA.md). Uso read-only, sin enriquecimiento pagado ni scheduler nuevo.

| Herramienta | Prueba real | Uso comercial correcto |
| --- | --- | --- |
| Getonbrd API pública | HTTP200;48avisos para hubspot | Encontrar responsabilidades explícitas y leer oferta/fecha/estado |
| Getonbrd feed |989avisos;35menciones;13conChile | Barrido de texto; publicación y expiración son campos diferentes |
| Teamtailor Nubox | Ficha y listado propio activos | Confirmar trabajo vigente del empleador |
| Apollo People API Search |240personas; primera página50 | Universo tecnológico y roles; no intención de compra |
| HubSpot CRM | Portal48713323; Companies,Deals,notas/correos leídos | Duplicados, dueño, relación y negativa real |
| HubSpot Buyer Intent | Falta permiso buyer_intent.read | Cobertura bloqueada; no afirmar que no hay señales |
| BuiltWith público |202/Loading en pruebaTalana | No produjo evidencia; no usar como confirmado |
| Wappalyzer público |ShellJS sin datos en pruebaTalana | No produjo evidencia; APIpagada no ejecutada |
| LinkedIn/buscador |Originales y perfiles, bloqueos selectivos | Separar original, snippet y fecha de evento; no eludir bloqueos |

## Consultas reproducibles
API pública:
https://www.getonbrd.com/api/v0/search/jobs?query=hubspot&per_page=100&page=1
[Manual oficial](https://www.getonbrd.com/user-manual/get-on-board-s-api).
Feed: https://www.getonbrd.com/jobs/feed
No sumar ambos conjuntos sin deduplicar por ID; verificar paginación y cobertura en cada corrida.
Filtrar primero plataforma+país; luego leer verbos construir/implementar/migrar/integrar/auditar y
objetos concretos. Un requisito “manejo de HubSpot” no pasa el filtro de trabajo pendiente.

Apollo, parámetros ejecutados:
```json
{
  "organization_locations": ["Chile"],
  "organization_num_employees_ranges": ["50,200", "201,500", "501,2000"],
  "currently_using_any_of_technology_uids": ["hubspot", "hubspot_sales_hub", "hubspot_marketing_hub"],
  "currently_not_using_any_of_technology_uids": ["salesforce", "salesforce_crm", "salesforce_sales_cloud"],
  "person_titles": ["Revenue Operations", "Head of Marketing", "CRM Manager", "Marketing Operations"],
  "include_similar_titles": true,
  "per_page": 50,
  "page": 1
}
```
Rango superior2000 es un recorte exploratorio, no nuevo límite del ICP.
[People API Search](https://docs.apollo.io/reference/people-api-search) declara0créditos.
UIDs contrastados con [CSV oficial](https://api.apollo.io/v1/auth/supported_technologies_csv).
HQChile limita multinacionales; dotación es del proveedor. Exclusión técnica no demuestra ausencia real
de Salesforce. PresenciaHubSpot no distingue Hub instalado, contrato o uso operativo: corroborar.
La respuesta no trae emails/teléfonos y oculta apellidos; no se presentan identidades completadas desde esos datos.
El contacto Nubox completo proviene del perfil propio y del historialCRM, no de desenmascarar Apollo.
Company search/jobs/enrichment pagados no ejecutados.

Búsqueda pública:
```text
"Chile" "buscamos partner" "HubSpot"
"Chile" "busco consultor" "HubSpot"
"Chile" "proveedor" "CRM" "implementación"
site:cl.linkedin.com/jobs/view "HubSpot" "workflows"
site:getonbrd.cl/jobs "HubSpot" "integraciones"
"[empresa]" "CRM Specialist"
"[empresa]" "HubSpot" "implementar"
"[empresa]" "licitación" "CRM"
"[empresa]" "adjudicación" "CRM"
```
Leer publicación original, actualizaciones y contraevidencia. En LinkedIn comparar fecha visible con
SocialMediaPosting.datePublished cuando esté disponible. No usar fecha de indexación como evento.

HubSpot:
- Verificar usuario/portal y propiedades antes de buscar.
- CONTACT: HAS_PROPERTY en gh_form_hubspot_intereses, gh_form_hubspot_presupuesto o
  gh_form_hubspot_hubs_actuales. Resultado1, interno/smoke. No extender conclusión a todos los leads.
- COMPANY: dominio IN nubox.com,tvn.cl,rankmi.com,healthatom.com. Resultado3.
- DEAL/EMAIL/NOTE asociados a Companies Nubox/TVN:1/52/4. Leer respuesta más reciente y dirección
  de la relación comercial, no sólo contador de contactos.
- Para siguientes corridas: recuperar primero metadatos de actividad; leer únicamente cuerpos
  relevantes y devolver extractos sanitizados. Evitar volcar facturas, firmas y enlaces de acceso.
- Consultar negativas/owner antes de enriquecimiento; no duplicar registros o outreach.

## Regla de inversión
Primero fuente y trabajo; luego fit/historial; después personas y acceso.
No gastar en emails de logos descubiertos sólo por tecnología.
No activar un monitor sin mandato recurrente ni sustituir el radar existente.
Si Buyer Intent se habilita posteriormente, usarlo como priorización; jamás asumir demanda individual
desde identificación de cuenta. No se cambiaron permisos ni tracking durante esta corrida.

