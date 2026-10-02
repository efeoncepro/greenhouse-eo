# Plantilla — Plan de campaña (borrador IA)

Copiar esta estructura. Reglas de llenado:

- Cada número lleva **fuente y fecha** (`[fuente: studio.campaign.media_plan.get, 2026-09-26]`,
  `[fuente: CDR-007, 2026-09-22]`, `[fuente: get_seo_keyword_opportunities, captura 2026-09-20, ● medido]`).
- Lo ausente se escribe **`no registrado`** (y `null` en tablas que vayan a convertirse en datos). Nunca 0.
- Toda meta es `meta` (con quién la fijó) o `dimensionamiento` (supuesto para calcular). Nada de «meta sugerida».
- Los copys son **borradores** hasta que una persona los apruebe; los copys ya registrados se citan literales.
- Español neutro latinoamericano, tuteo de marca, sin voseo.

```markdown
# Plan de campaña · <CMP-### o «sin id (borrador)»> · <nombre>

> **Estado:** borrador IA — no aprobado · **Versión:** <AAAA-MM-DD>-v<N> · **Organización:** <org-…>
> **Epic:** EPIC-049 (Efeonce Marketing Studio) · **Skill:** efeonce-campaign-planning

## 0. Procedencia
| Campo | Valor |
|---|---|
| Modelo | <id exacto del modelo> |
| Generado | <AAAA-MM-DD HH:MM America/Santiago> |
| Entradas | brief <ruta/fecha o «no registrado»> · Studio <campaignId + revision leída o «no existe»> |
| Lecturas | <lista de tools/documentos con fecha: studio.campaign.get 2026-…, 13_icp… , CDR-…> |
| Tools no disponibles en la sesión | <p. ej. «studio.* sin sesión MCP» o «ninguna»> |

## 1. Resumen ejecutivo (5 líneas)
Objetivo · a quién · promesa · canales · qué falta decidir.

## 2. Estrategia
- **Objetivo de negocio:** <frase medible> [fuente]
- **KPI norte:** <definición · denominador · fuente · meta|dimensionamiento · ventana>
| Etapa | KPI | Definición / denominador | Fuente | Meta o dimensionamiento | Quién la fija |
|---|---|---|---|---|---|
| TOFU | | | GA4 / plataforma | | |
| MOFU | | | | | |
| BOFU | | | HubSpot | | |
- **Guardrail:** <qué no puede empeorar>
- **Hipótesis**
| # | Creemos que… | Lo sabremos cuando… | Ventana | Si no se cumple |
|---|---|---|---|---|

## 3. Matriz de audiencias
Personas desde `docs/context/13_icp-buyer-personas-jtbd.md` (citar id, no redefinir).
| Persona (BP · rol en buying group) | Etapa · stage bow-tie | Canal canónico | Job / trigger | Mensaje | Acción | Destino |
|---|---|---|---|---|---|---|

## 4. Message house
- **Promesa central:**
| Pilar | Prueba (dato/caso/mecanismo) | Fuente y fecha | ¿Hipótesis? |
|---|---|---|---|
- **No prometemos:**
- **Vocabulario sí / no:**
- **Tono por canal:**

## 5. Plan de contenidos
| Concepto | Título | Canal · placement | Ratio · tipo | Nombre de archivo | Rol / etapa | Owner | Entrega | Estado |
|---|---|---|---|---|---|---|---|---|
| CMP###-01 | | linkedin · feed-image | 4x5 · imagen | `CMP###-01 - <título> - 4x5.png` | BP1 campeón · TOFU | | AAAA-MM-DD | por producir |
Conceptos sin producir (no son exports): <tabla aparte>.

## 6. Plan SEO / AEO
- **Módulo SEO:** <hasModule · presupuesto restante> [get_seo_entitlement, fecha]
| Keyword / pregunta IA | Lente (● medido / ◑ estimado) | Dato actual con fecha | URL destino | Contenido de soporte | Acción |
|---|---|---|---|---|---|
- **Propuestas que gastan presupuesto (requieren tu confirmación explícita):**
| Tool | Lista exacta | Costo (vista previa) | Recurrente | Tu decisión |
|---|---|---|---|---|

## 7. Plan de medición
- **UTM:** convención <registrada | propuesta> [fuente]; ejemplo de URL completa.
| Evento | Sistema | Definición | Estado verificado | Fuente |
|---|---|---|---|---|
- **Conversión calificada:** <stage HubSpot> — fijada por <persona, fecha> | `no registrado`
- **Puente UTM → contacto → deal:** <estado>
- **Cadencia de lectura y criterio de parada:**

## 8. Copies por canal (borradores)
| copy | Canal · campo | Texto (borrador) | Caracteres / límite [fuente, fecha] | Variante (qué cambia) | CTA · destino |
|---|---|---|---|---|---|

## 9. Presupuesto (si existe)
| Línea | Kind (`proposed`/`approved`/`actual`) | Período | Canal | Monto · moneda | Fuente |
|---|---|---|---|---|---|
Nunca se suman kinds distintos. `actual` vacío = sin datos de gasto.

## 10. Riesgos y supuestos
| Riesgo | Impacto | Mitigación | Dueño |
|---|---|---|---|
Supuestos: <lista marcada>.

## 11. Decisiones abiertas (checklist para ti)
- [ ] <decisión> — opciones: <a / b> — consecuencia: <…>
- [ ] Reservar el `CMP-###` y registrar su fila en el overview (si es campaña nueva)
- [ ] Conversión calificada (la fija quien opera el pipeline)
- [ ] Presupuesto y techo mensual
- [ ] Gasto SEO propuesto (lista exacta)
- [ ] Aprobación del brief / copys / piezas (T2)

## 12. Cuando existan las tools de escritura
Tabla sección → command/tool → nivel (T0/T1/T2), desde `studio-write-mapping.md`.
```
