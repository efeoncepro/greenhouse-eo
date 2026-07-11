# 06 · Measurement (contenido → pipeline)

Contenido que no se mide es un hobby caro. Este módulo cierra el loop: qué mirar por etapa, cómo conectar contenido con pipeline, y dónde termina el studio y empieza la medición runtime/atribución. La **atribución/tracking técnico** es de `growth-marketing-cro` + `greenhouse-gtm-ga4-operator`; aquí decides *qué del contenido merece medirse y cómo interpretarlo*.

## Leading vs lagging (no confundas actividad con resultado)

- **Leading (actividad/engagement):** producción, publicaciones, tráfico, tiempo en página, scroll depth, shares, suscriptores, aperturas de newsletter. Rápidos, pero **no son el resultado** — son señales tempranas.
- **Lagging (negocio):** leads de contenido, influenced pipeline, revenue asistido, retención/expansión. Lentos, pero **son el punto**.
- **Trampa:** optimizar solo leading (tráfico, likes) produce vanity. Optimizar solo lagging ignora las señales para corregir a tiempo. Mira ambos, decide con lagging.

## Métricas por objetivo (mide lo que la pieza vino a hacer)

| Objetivo de la pieza | Métrica primaria | Métrica de apoyo |
|---|---|---|
| **Awareness** | alcance / usuarios nuevos / share of voice | engagement rate, menciones |
| **Autoridad / thought leadership** | citabilidad (citas en IA/medios), backlinks, suscriptores | tiempo en página, saves |
| **Demanda / generación** | leads de contenido, MQLs, lead magnet conversions | tráfico a landing, CTR |
| **Nurture / consideración** | influenced pipeline, avance de etapa | opens/clicks de newsletter, retorno |
| **Retención / expansión** | uso/retención, NRR asistido | engagement de clientes con contenido |

Cada pieza declara su métrica en el **brief** (`02`). Si no sabes qué mediría el éxito, no está lista para producir.

## Del engagement al pipeline (la cadena que importa)

El valor real del contenido es **influenced pipeline**, no likes. La cadena:

```
contenido → engagement → lead/suscriptor → contacto conocido → deal influenciado → revenue
```

- **Atribución de contenido:** first-touch (¿qué pieza trajo?) + multi-touch (¿qué piezas influyeron el deal?). El **modelado de atribución/MMM/incrementality** es de `growth-marketing-cro`; el studio aporta el **linaje de la pieza** (qué contenido tocó el journey).
- **Influenced pipeline:** % del pipeline/revenue que tocó al menos una pieza de contenido. Es la métrica que justifica el motor ante el negocio.
- **UTM + tracking plan:** la **taxonomía UTM** es de `digital-marketing`; la **medición runtime GA4/GTM + CRM** de `greenhouse-gtm-ga4-operator` + HubSpot. El studio consume esos datos, no los reimplementa.

## Medir por TEMA, no solo por pieza

Gracias al **linaje de átomos** (`04`), mide el rendimiento del **pillar/tema completo** (pilar + clusters + átomos + ediciones de newsletter), no de piezas sueltas. Un tema puede ganar aunque un post individual rinda poco. Esto guía qué pillars reforzar (`01`).

## El loop de aprendizaje

La medición existe para **decidir el próximo contenido**, no para un reporte muerto:

- **Doblar** lo que funciona (temas/formatos/canales ganadores → más pillars ahí, `01`).
- **Refrescar/re-distribuir** el evergreen que rinde (`04`).
- **Podar** lo que no rinde tras distribución real (si se distribuyó bien y no funcionó, el problema es el contenido, no el alcance).
- **Recalibrar** la cadencia y el portafolio según capacidad vs retorno.

## Honestidad de datos (regla dura)

- Si **no puedes medir** una pieza (sin tag, sin acceso, sin atribución), **decláralo** y no inventes un número.
- Nunca presentes un **benchmark de mercado** como tu resultado real.
- Distingue **correlación de causalidad**: contenido "influye" un deal, rara vez lo "cierra" solo. Reporta influenced, no claimed.

## Checklist de salida del módulo

- [ ] Cada pieza tiene **métrica de éxito** declarada en el brief, alineada a su objetivo.
- [ ] Leading + lagging mirados; se **decide con lagging**.
- [ ] Cadena engagement→influenced pipeline conectada (linaje de pieza aportado al CRM).
- [ ] Medición por **tema**, no solo por pieza (usa el linaje de átomos).
- [ ] Loop de aprendizaje activo (doblar/refrescar/podar/recalibrar).
- [ ] Hand-offs nombrados: atribución/loops → `growth-marketing-cro`; GA4/GTM/CRM → `greenhouse-gtm-ga4-operator` + HubSpot; UTM → `digital-marketing`.

## Cross-links

- Objetivos por pieza → `01`, `02`; distribución que se mide → `05`; temas a reforzar → `01`.
- Atribución/loops → `growth-marketing-cro`; runtime de medición → `greenhouse-gtm-ga4-operator`; UTM → `digital-marketing`.
- Artefacto → `templates/measurement-dashboard.md`.
