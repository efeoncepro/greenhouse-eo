# TASK-1878 — Wireframe de enlaces de entrada en páginas existentes

> Contrato de planificación, no cambio en WordPress. Fuentes: páginas y refs Home, HubSpot y AEO.

## Regiones y jerarquía

| Página | Región existente a inspeccionar | Cambio propuesto | Lo que se preserva |
|---|---|---|---|
| Home 251731 | Tarjeta CRM y bloque Automatización e IA | Aclarar intención por plataforma y dar acceso a servicio humano-agente | Hero, estructura aprobada, CTA principal |
| HubSpot 244079 | Región de oferta/servicios | Puente breve a transformación transversal cuando el job supera configuración CRM | Intención HubSpot, form y proof existente |
| AEO 250265 | Región editorial posterior a propuesta AEO | Puente desde visibilidad pública hacia equipo de marketing con agentes | CTA diagnóstico, form y semántica AEO |

No se agrega navegación global ni se duplica un CTA primario. Cada enlace aparece únicamente cuando
TASK-1877 tenga URL 200/canonical/CTA verificados. Desktop conserva la composición vigente; en 390 px
el bloque secundario sigue al mensaje principal, con longitud legible y sin overlay.

## Implementation Mapping

- Reusar widgets/links page-scoped de las tres páginas; no crear primitive.
- Capturar postId, hash Elementor/Ohio, destino, CTA y copy live antes de diseñar la mutación.
- Copy aprobado en ledger por página; WordPress sirve enlaces en HTML sin JS obligatorio.

## GVC Scenario Plan

- Capturas antes/después del bloque tocado a 1440 y 390 px, más destino final.
- Verificar H1/hero intactos, CTA/form previos intactos, foco visible, JS-off, reduced motion
  y documentElement.scrollWidth <= clientWidth.
- Dossier de comparación por página; CMS save no equivale a verificación pública.

## Design Decision Log

- Decisión inicial: copy y enlace contextual de baja intrusión.
- Rechazado: reemplazar Home o reescribir las páginas por proveedor/AEO.
- Pendiente: ubicación exacta tras inspección live y aprobación del owner.
