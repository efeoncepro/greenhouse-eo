# Alta creativa y segmentos — 2026-10-08

Portal 48713323, Julio 75788512, Agent CLI 0.15.1 y MCP autenticado independientemente.
Scope autorizado: investigación y registro de dos interlocutores, Yanbal y Olivos del Sur; correos y segmentos.
Enriquecimiento Apollo corporativo de Yanbal autorizado explícitamente: éxito Verified/ZeroBounce, 2 créditos.
La otra dirección es individual personal publicada en LinkedIn, no verificada por proveedor.

## Diccionario y consumidores

Se reutilizaron las cuatro propiedades existentes. Se añadió únicamente la opción research_2026_10_08
(Búsquedas 08-10-2026) a efeonce_prospecting_cohorts en Company y Contact, conservando research_2026_10_06.
Se respetó el contrato de [segmentación por propiedades](../../architecture/GREENHOUSE_HUBSPOT_PROSPECT_PROPERTY_SEGMENTATION_DECISION_V1.md).

| ID | Tipo | Nombre | Regla | Miembros comprobados |
| --- | --- | --- | --- | ---: |
| 178 | CONTACT ACTIVE | Efeonce — Búsquedas 2026-10-08 — Contactos — Fit servicios creativos | cohorte08 + tipo persona con/sin email + fit creative | 2 |
| 179 | COMPANY ACTIVE | Efeonce — Búsquedas 2026-10-08 — Empresas investigadas | cohorte08 | 2 |

Expresiones exactas:
```sql
efeonce_prospecting_cohorts IN ('research_2026_10_08') AND efeonce_prospecting_contact_kind IN ('individual_email', 'individual_no_email') AND efeonce_prospecting_service_fit IN ('creative')
efeonce_prospecting_cohorts IN ('research_2026_10_08')
```

178 clasifica fit, no habilitación de envío. No exige email, porque la afinidad puede conocerse antes de
enriquecer. Ambos miembros actuales tienen email, con distinta calidad/procedencia documentada.
No se alteró 174/176 ni su exigencia de email/cohorte06. Tampoco se atribuyó interés HubSpot o Social Media
a solicitudes de automatización creativa o audiovisual para forzar su entrada a otro segmento.

## Escrituras y evidencia

- 2 Company, 2 Contact, 2 Note y 1 Deal nuevos; Deal Olivos existente asociado/actualizado.
- Cohorte en ambos objetos, tipo/fit en los contactos; industrias Company COSMETICS/FOOD_BEVERAGES.
- Contact industria Otro ante ausencia de los sectores exactos en su enum.
- Cargo verificado sólo para Yanbal; empleo/cargo exacto del contacto Olivos sigue sin confirmar.
- Notas asociadas a Contact, Company y Deal, con fuente, necesidad, límites y calidad del correo.
- Previews CLI ejecutados antes de opciones y segmentos; definición leída después.
- MCP independiente releyó propiedades y notas; CLI releyó asociaciones y Company Primary en los cuatro registros.
- CRM search enumeró conjuntos completos de 178/179 y cohortes: 2/2 en cada objeto, sin faltantes ni extras.
- Los dos Deals quedaron default/qualifiedtobuy, Strategic Bets al corte; sin amount/closedate.
- Sin outreach, propuestas, cambios de suscripción o marketing-contact status, workflows o secuencias.

IDs individuales, fuentes PII y respuestas completas: .auth/creative-prospect-intake-20261008/, ignorada por Git.
Para continuidad, ver [Yanbal](../../commercial/prospects/yanbal-ai-creative-2026/README.md)
y [Olivos](../../commercial/prospects/olivos-del-sur-peru-2026/README.md).
Recuperación: retirar sólo la nueva cohorte de estos registros si se revoca la clasificación; no borrar
personas, empresas ni histórico. No se necesitan membresías manuales para mantener el filtro.
