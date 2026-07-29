# Auditoría rigurosa del post Instagram Brand Visibility v10

**Asset auditado:** `generated/brand-visibility-grader-social/instagram-1080x1350-v10.png`

**Fecha:** 2026-07-28
**Skills aplicadas:** `greenhouse-ai-design-studio`, `design-studio`, `social-media-studio`, `greenhouse-qa-release-auditor`.

## Veredicto

**BLOCK / rehacer.** El v10 no debe aprobarse ni escalarse.

La corrección no es decorativa: el creativo contiene dos logos Efeonce visibles —uno externo y otro dentro del
reporte real—. En un post individual, el logo externo puede competir además con el avatar/nombre de la cuenta que
Instagram muestra en la cabecera. El reporte ya trae marca suficiente; agregar otra marca rompe el contrato de logo
único y produce una lectura de “doble cuenta”.

## Evidencia y fallas

| Dimensión | Puntaje | Evidencia | Acción |
| --- | ---: | --- | --- |
| Brand-fit | 2/5 | Hay una marca externa y otra interna dentro del mismo frame. | Eliminar el logo externo; conservar el logo del reporte como única marca en la imagen. |
| Claridad de concepto | 4/5 | “¿Tu marca aparece cuando la buscan?” se entiende rápido y conecta con el reporte. | Mantener; revisar en thumbnail real. |
| Jerarquía visual | 3/5 | El headline domina, pero la marca externa y la marca del producto compiten. | Resolver logo único y volver a medir el recorrido headline → score → evidencia. |
| Sistema de color | 4/5 | Gradiente/topografía coherentes con el sistema SKY y subordinados. | Mantener; no aumentar textura. |
| Tipografía / legibilidad | 4/5 | Headline legible; el detalle del reporte funciona como prueba, no como copy principal. | Mantener; comprobar en 25% y 15% de escala. |
| Composición | 3/5 | El v10 mejoró el tamaño del reporte, pero el bloque superior y la captura aún compiten por atención. | Eliminar el logo externo y conservar el reporte como ancla de prueba. |
| Reproducibilidad | 2/5 | Solo existe validación aislada del lienzo; no hay evidencia de feed, post individual ni perfil. | Crear pruebas de superficie antes de aprobar. |
| Contraste | 4/5 | Headline y score tienen contraste suficiente sobre sus fondos. | Mantener y revisar compresión de Instagram. |
| Originalidad | 3/5 | La combinación de evidencia real y sistema topográfico es propia, pero el tratamiento sigue cerca del patrón “headline + screenshot”. | No sumar decoración; diferenciar con crop y proof-first. |
| Craft / acabado | 3/5 | El render es limpio, pero el doble logo es un defecto de acabado de primer orden. | Corregir marca, revisar bordes del crop y reexportar. |

**Total:** 32/50 → **rehacer**. El puntaje no oculta el gate duro: brand-fit y reproducibilidad no están
resueltos.

## Matriz de riesgos de superficie

- **Instagram feed:** la cabecera de cuenta queda fuera del lienzo, pero el logo externo dentro del arte crea una
  segunda identificación de marca inmediatamente bajo la cuenta.
- **Instagram post individual:** la navegación, cabecera, acciones y comentarios cambian el marco de lectura; el
  logo externo no debe ocupar una esquina que el usuario interpreta como identidad de la cuenta.
- **Instagram perfil/grid:** la miniatura puede recortar el 4:5; el logo externo y el logo del reporte no garantizan
  supervivencia conjunta ni una única lectura de marca.
- **Miniatura:** a tamaño pequeño, la marca externa y el logo interno se fusionan como ruido, mientras el score y el
  mensaje compiten por el primer golpe visual.

## Corrección aplicada en v11

1. Se removió completamente el logo externo.
2. Se conserva el logo que pertenece al asset real del reporte.
3. Se mantuvo el reporte dentro de la zona central protegida.
4. Se conserva la composición 1080 × 1350 y el crop nativo del reporte.
5. No se agregaron métricas ni UI inventadas.

## Gates pendientes antes de aprobar

- [ ] Revisar v11 en thumbnail al 25% y 15%.
- [ ] Simular crop central 3:4 y 1:1.
- [ ] Revisar mockup de feed móvil y vista individual con cabecera de cuenta, acciones y caption.
- [ ] Revisar preview de perfil/grid.
- [ ] Confirmar que solo existe un logo Efeonce dentro del creativo.
- [ ] Confirmar que el score 61 y el headline sobreviven a compresión y reducción.
- [ ] Reauditar después de cualquier cambio de logo, crop o escala.

## Reauditoría de v11

**Resultado visual local:** `CONDITIONAL PASS` para exportación; **no es aprobación de publicación** porque no
se ejecutó una captura autenticada dentro de Instagram.

| Dimensión | Puntaje | Evidencia v11 |
| --- | ---: | --- |
| Brand-fit | 5/5 | Solo queda el logo que pertenece al reporte real; no hay logo externo compitiendo con la cuenta. |
| Claridad de concepto | 4/5 | El hook se entiende sin caption y el reporte prueba la promesa. |
| Jerarquía visual | 4/5 | Headline → reporte/score → evidencia secundaria; la marca deja de interrumpir el recorrido. |
| Sistema de color | 4/5 | Campo oscuro, acento aqua y amarillo del reporte tienen roles claros. |
| Tipografía / legibilidad | 4/5 | Headline y score son legibles a tamaño reducido; el detalle del reporte es evidencia secundaria. |
| Composición | 4/5 | El reporte queda dentro del centro protegido y con aire suficiente para contexto de feed. |
| Reproducibilidad | 3/5 | La geometría está preparada para recorte, pero falta captura real de feed/post/perfil. |
| Contraste | 4/5 | El texto principal no depende del área clara del reporte. |
| Originalidad | 3/5 | La solución es sólida y específica al caso, aunque conserva la gramática editorial de reporte + headline. |
| Craft / acabado | 4/5 | Sin doble logo, sin marco externo, sin deformación y con crop determinístico. |

**Total v11:** 39/50 → **conditional pass**.
**Gate bloqueante restante:** evidencia de superficie real de Instagram y verificación de crop 3:4/1:1.

La decisión de marca es intencional: no se agrega un segundo logo para “reforzar” Efeonce. En este caso, la
marca dentro de la evidencia real es más creíble y evita que el post parezca una cuenta superpuesta sobre otra.
