# Promotions — ofertas contextuales propias en el ecosistema

> **Tipo:** documentación funcional
> **Estado:** diseño aceptado; todavía no existe runtime
> **Versión:** 1.0
> **Fecha:** 2026-07-21
> **Arquitectura:** [GREENHOUSE_GROWTH_PROMOTIONS_ARCHITECTURE_V1.md](../../architecture/GREENHOUSE_GROWTH_PROMOTIONS_ARCHITECTURE_V1.md)
> **ADR:** [GREENHOUSE_GROWTH_PROMOTIONS_DECISION_V1.md](../../architecture/GREENHOUSE_GROWTH_PROMOTIONS_DECISION_V1.md)
> **Programa:** [EPIC-034](../../epics/to-do/EPIC-034-growth-promotions-orchestration.md)

## Qué es

Promotions permitirá que Efeonce promueva sus propios servicios, diagnósticos, herramientas, contenidos, eventos o consultas dentro de sus superficies: artículos del blog, páginas del sitio, Think, previews de Greenhouse y futuras piezas del ecosistema.

No es publicidad pagada ni un reemplazo futuro de Campaigns. Es la capa que decide **qué oferta queremos impulsar, para qué audiencia/contexto, durante qué período, en qué superficies, con qué piezas creativas y hacia qué resultado real**.

## Cómo se relaciona con Growth

Una Promotion coordina capacidades existentes, sin absorberlas:

- **CTA** decide la experiencia visible: banner, bloque embebido, slide-in, botón, trigger, cierre y acción.
- **Forms** conserva campos, validación, consentimiento y la verdad de una solicitud enviada.
- **Meetings** conserva disponibilidad y la verdad de una reunión reservada.
- **Tools** conservan la verdad de sus diagnósticos o resultados.
- **Commercial/HubSpot** recibe un handoff calificado; un click por sí solo nunca crea una oportunidad.

Ejemplo: una Promotion puede impulsar una auditoría AEO durante cuatro semanas. Puede usar un bloque editorial dentro de artículos, un slide-in en páginas relevantes y un CTA en el reporte de Think. Todos comparten oferta y medición, pero cada experiencia sigue siendo un CTA gobernado. La conversión real puede ser un Form aceptado o una Meeting confirmada.

## Contenido rico, pero gobernado

Una Promotion podrá combinar:

- titulares, cuerpo, listas, estadísticas y evidencia;
- imágenes responsivas;
- video con poster, subtítulos y transcripción;
- audio con controles y transcripción, nunca autoplay;
- testimonios y prueba social;
- contenido de creadores: UGC, EGC —contenido generado por colaboradores— o expertos;
- botones/grupos de acción del Action Registry de CTA;
- contenido dinámico proveniente de providers registrados, por ejemplo contexto de un reporte o disponibilidad resumida.

No admitirá HTML, JavaScript, CSS, iframes ni URLs de datos arbitrarias. Cada pieza es un bloque tipado y versionado. Si el renderer no conoce el tipo o la versión, la publicación se bloquea; si un dato dinámico falla, se muestra su fallback estático o no se muestra la Promotion.

## Derechos, accesibilidad y rendimiento

Promotions referencia assets existentes; no duplica archivos ni se convierte en biblioteca multimedia. Para publicar, cada vínculo debe acreditar procedencia, derecho de uso, consentimiento cuando hay personas y expiración cuando corresponda.

Las imágenes requieren texto alternativo o marca decorativa. Video requiere controles, subtítulos y transcripción; audio requiere controles y transcripción. El sistema respeta reduced motion/data, reserva dimensiones para evitar saltos de layout y carga media pesada solo cuando hace falta.

## Qué podrá operar una persona —y también Nexa

Desde `/growth/promotions`, una persona autorizada podrá crear borradores, versionar oferta y piezas, vincular CTAs/superficies/assets, previsualizar con el renderer real, enviar a revisión, publicar, pausar, reanudar, retirar y leer resultados con su nivel de confianza.

La UI no tendrá una implementación privilegiada. Promotions nace con Full API Parity: UI, Nexa, MCP/agentes, scripts y futuros clientes consumen los mismos readers y commands. Las escrituras de Nexa siempre siguen `proponer -> confirmar -> ejecutar`, con las mismas capabilities, auditoría e idempotencia.

## Cómo se mide sin inflar resultados

- Una impresión o un click reportado por el navegador es evidencia direccional.
- Un Form aceptado, una Meeting confirmada o un resultado de tool confirmado por servidor es una conversión real.
- La exposición masiva se agrega para analítica; no se crea una fila OLTP por cada impresión.
- Cada resultado conserva Promotion, versión, pieza creativa, delivery, CTA y superficie para saber qué ocurrió sin borrar la autoridad del sistema que confirmó el outcome.
- La interfaz mostrará frescura y outcomes no conciliados; no inventará tasas completas cuando falta evidencia.

## Límites iniciales

V1 se concentra en superficies públicas propias y en una Promotion real de un servicio. No incluye compra de medios, presupuesto publicitario, campañas multicanal, targeting sensible, clientes autenticados, page builder ni experimentos declarados ganadores sin tráfico suficiente.

## Operación segura

Habrá pausa y kill switch global, por superficie y por Promotion. Si el servicio de decisión falla, la página anfitriona sigue funcionando sin mostrar la pieza. La publicación falla si hay una acción inválida, derechos vencidos, accesibilidad incompleta, provider dinámico sin fallback o preview distinto del contrato de producción.
