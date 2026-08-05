# Arquitectura económica interna — SKY V2

> **Estado:** `hypothesis_only` · no autoriza envío. Requiere validación de capacidad, costeo y aprobación
> comercial/Finance antes de convertirse en una oferta client-facing.
>
> **Audiencia:** interna. Este documento no se entrega a SKY ni se adjunta a Wherex.
>
> **Fecha:** 3 de agosto de 2026

## 1. Decisión de trabajo

La nueva económica debe ser una configuración competitiva de **SKY Visibility Core**, separada de la oferta
original de CLP 5.200.000 y de su alternativa de CLP 6.900.000. La hipótesis comercial es:

- **CLP 3.000.000 mensuales, netos, sin IVA**;
- operación mensual de visibilidad editorial, SEO/AEO, publicación, QA, medición y reportería;
- newsletter mensual incluida, con curaduría y preparación de hasta 10 contenidos;
- cartera de 45–50 contenidos gestionada y priorizada mensualmente, con mezcla variable de contenidos nuevos,
  `refreshes` y necesidades ad-hoc;
- `Addons` para capacidad o profundidad que exceda el envelope base;
- cero precio unitario por artículo.

El precio de CLP 3.000.000 es una hipótesis de negociación, no una cifra validada de margen. La ventaja de
costos por reutilización de capacidad puede hacerla viable, pero no debe convertirse en una promesa de ejecutar
45–50 piezas con la misma profundidad ni 30+ contenidos nuevos sin una prueba de capacidad.

## 2. Evidencia y restricciones que gobiernan la económica

- SKY informó una operación de aproximadamente 45–50 contenidos mensuales; normalmente combina 15–20
  actualizaciones y más de 30 contenidos nuevos, aunque la mezcla cambia.
- SKY tiene un blog posicionado; buena parte de la oportunidad está en `refreshes`, no en producir todo desde
  cero.
- La newsletter mensual reúne aproximadamente 10 contenidos y se incorpora como extensión natural del servicio.
- El Centro de Ayuda es la fuente operativa principal. El flujo Word → revisión → WordPress es el estado
  actual documentado, pero la propuesta V2 lo mejora con Notion/Content Hub como hub editorial de grilla,
  comentarios, aprobaciones y ciclo de vida; WordPress permanece como superficie de publicación.
- El equipo que hoy opera Berel puede aportar economías de escala. El dato de referencia entregado por el
  operador es una operación de 8 artículos y 50 imágenes mensuales por MXN 57.000. Esta relación es **interna**
  y no debe aparecer en la propuesta de SKY.
- SKY no debe recibir ninguna explicación sobre equipos compartidos, costos cargados, margen, piso de
  negociación, presupuesto inferido o estructura interna de delivery.

## 3. Qué debe comprar públicamente el Core

La propuesta pública debe vender una **operación gobernada por capacidad y mezcla**, no una fábrica de artículos.
Debe dejar explícito que:

1. la cartera mensual se recibe, clasifica y prioriza;
2. cada contenido se asigna a `contenido nuevo`, `refresh` ligero, `refresh` profundo o ad-hoc;
3. la ejecución mensual se define por esa mezcla y por la complejidad aprobada;
4. el Core incluye la preparación de la newsletter, pero SKY mantiene su plataforma, segmentación y envío;
5. los excedentes se reprograman o activan mediante un Addon aprobado;
6. la operación no garantiza posiciones, tráfico ni citaciones.

La frontera debe estar redactada con suficiente precisión para que CLP 3.000.000 no se interprete como una
promesa ilimitada. Si SKY exige una cantidad fija de piezas nuevas, se debe abrir una configuración distinta o
un Addon de capacidad antes de firmar.

## 4. Addons coherentes con el servicio

Los Addons no deben ser un catálogo genérico. Solo deben extender componentes que el Core ya opera:

| Addon | Activa cuando | Frontera |
|---|---|---|
| **New Content Capacity** | Se requiere aumentar la capacidad de contenidos nuevos | Bloque de producción adicional; nunca precio unitario por artículo |
| **Deep Refresh** | El portfolio requiere más reescrituras profundas que las previstas | Investigación, reorganización y reescritura de piezas prioritarias |
| **Technical SEO Expansion** | Se necesitan implementaciones técnicas que exceden la lane editorial | WordPress, templates, arquitectura, schema o rastreo fuera del Core |
| **Multimedia Content** | Se solicitan piezas visuales, video o adaptaciones adicionales | Alcance, derechos y complejidad definidos por bloque |
| **Newsletter Expansion** | Se supera la preparación mensual incluida o se pide diseño/automatización | SKY conserva la plataforma y el envío salvo contratación expresa |
| **Market Expansion** | Se incorporan mercados, idiomas o versiones regionales | Nueva configuración de operación y validación de fuentes |

No se debe publicar el precio de un Addon hasta conocer la capacidad real del bloque y su cost-to-serve.

## 5. Artefactos económicos construidos en taller

| Orden | Artefacto | Audiencia | Fuente / función |
|---|---|---|---|
| 0 | Este documento | Interna | Gate de capacidad, margen, límites, dependencias y decisiones abiertas |
| 1 | `oferta-economica-v2-evolucion.md` | Client-facing | Fuente legible de la oferta: Core, newsletter, envelope, Addons y condiciones; precio explícito neto/IVA |
| 2 | `economica-v2-evolucion.json` | Interna / renderer | Input transitorio reconciliado con la fuente legible para generar el Excel |
| 3 | `deck-plan-economic-v2-evolucion.json` | Client-facing / fuente | Deck económico separado con `PricingFull`, neto, IVA y total visibles |
| 4 | `propuesta-economica-sky-visibility-core-v2.xlsx` | Client-facing | Excel generado con `pnpm economica:build`; conserva neto, IVA, total, proyección y condiciones |
| 5 | `.captures/sky-bid-economic-v2-evolucion/` | Taller | PDF, previews y render de control del Excel; no son cierre canónico |
| 6 | Proposal Studio | Client-facing | Pendiente de registro/render/verificación autenticados; el registro local ya incluye ambos planes |

La oferta técnica V2 y el deck económico deben permanecer separados. Si Wherex exige un único PDF, se puede
fusionar al final, pero se conservan las fuentes, los planes y las salidas individuales.

## 6. Secuencia de composición económica

1. Validar el envelope mensual con una matriz de esfuerzo ponderado: contenido nuevo, `refresh` ligero,
   `refresh` profundo, ad-hoc, newsletter, QA, publicación, medición y coordinación.
2. Probar el escenario de coexistencia con Berel sin comunicarlo al cliente: disponibilidad, picos, vacaciones,
   retrabajo, riesgos de aprobación y capacidad de reemplazo.
3. Cerrar el cost-to-serve, Wherex, pago a 30 días, contrato de 24 meses sin reajuste, penalidades y margen
   mínimo aceptable.
4. Fijar la frontera pública del Core y las condiciones objetivas que disparan cada Addon.
5. Redactar el Markdown económico y obtener aprobación comercial. **Completado en taller:** la fuente usa
   CLP 3.000.000 mensuales netos sin IVA; IVA 19% CLP 570.000; total mensual con IVA CLP 3.570.000.
6. Copiar las cifras al JSON de renderer y generar el Excel; revisar aritmética y coherencia contra el Markdown.
   **Completado:** proyecciones de CLP 36M/42,84M anuales y CLP 72M/85,68M a 24 meses, neto/con IVA.
7. Construir el deck económico separado, componerlo y revisar las láminas en tamaño completo. **Completado:**
   9 láminas, `PricingFull`, precio neto, IVA separado, total mensual y Addons.
8. Registrar la nueva versión en Proposal Studio por el camino canónico. **Pendiente.** Un PDF local nunca se marca como
   `verified` por inferencia.

## 7. Decisiones abiertas antes de publicar

- cuál es la mezcla mínima/máxima que el Core puede sostener con 45–50 oportunidades mensuales;
- cuántos contenidos nuevos estándar caben realmente sin convertir el Core en una promesa ilimitada;
- qué nivel de `refresh` profundo entra al Core;
- qué recursos visuales y multimedia están incluidos y cuáles pasan a Addon;
- si la implementación técnica de SEO queda completamente dentro del Core o solo la lane editorial, dejando
  las intervenciones de desarrollo como `Technical SEO Expansion`;
- precios finales de cada Addon y su unidad de capacidad;
- aprobación de margen y tolerancia al escenario downside.

## 8. Exclusiones duras del paquete client-facing

Nunca deben aparecer en la oferta económica de SKY:

- Berel o cualquier referencia a reutilización/compartición de equipo;
- costos cargados, margen, piso, capacidad disponible del equipo o economía interna;
- el presupuesto inferido de SKY como argumento de precio;
- precio por artículo, por refresh o por imagen;
- una promesa de 45–50 contenidos ejecutados con idéntica profundidad;
- Addons que no extiendan el servicio ofertado;
- una marca `verified` o un vínculo de Proposal Studio que no haya sido comprobado.

## Estado de cierre

**`workshop complete, rollout/validación económica pendiente`.** La técnica V2 y la económica V2 están preparadas
y validadas en taller; la económica incluye fuente, deck separado y Excel. Antes del envío se deben resolver las
decisiones de capacidad y costeo de §7, aprobar el margen y completar el registro/render/verificación en Proposal
Studio. La V1 técnica y económica permanecen intactas.
