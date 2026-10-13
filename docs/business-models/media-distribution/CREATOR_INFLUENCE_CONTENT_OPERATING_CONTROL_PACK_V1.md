# Creator Influence & Content — Operating Control Pack V1

> **Línea:** Media & Distribution
> **Estado:** `Approved for validation` · `scale_constrained`
> **Mercados iniciales:** Chile, Colombia, México y Perú
> **Owner:** Media & Distribution + Commercial + Legal/IP + Finance
> **Versión:** V1 · 2026-07-29
> **Último delta:** 2026-10-10 — controles para lo incorporado desde el deck «Marketing de Contenidos» (§11); el estado no cambia

Este documento convierte la oferta de Influencer Marketing, Creator Content y UGC en un sistema operable. No es un
contrato, una opinión legal, una tarifa pública ni una promesa de performance. Las bandas económicas son hipótesis que
deben validarse con campañas reales; los overlays legales deben ser revisados por abogados habilitados antes de firmar
o publicar.

## 1. Decisión operativa

La capacidad puede venderse como piloto gobernado o campaña custom controlada, no como servicio regional ilimitado.
El gate de venta general exige poder predecir delivery, controlar derechos, proteger caja, medir contribución sin
sobreafirmar causalidad y repetir el workflow con margen conocido.

La arquitectura mínima es:

```text
Favikon / herramienta de discovery
        ↓ snapshot fechado
Base operativa propia de Efeonce
        ↓ IDs y estados
Repositorio documental de contratos y evidencia
        ↓ derechos, assets y expiraciones
Dashboard de delivery, audiencia, contenido y negocio
```

Favikon puede acelerar discovery, listas, CRM, contactos y campañas. No es la fuente única de verdad para contratos,
derechos, chain of title, expiraciones, takedown, pagos o evidencia legal. No se recomienda construir software propio
hasta demostrar volumen, repetición y cost-to-serve.

## 2. Sistema de registros

La base inicial puede ser Notion o Airtable, según el nivel de estructura relacional requerido. Google Drive, SharePoint
u otro DMS guarda los originales. HubSpot conserva cliente, oportunidad, presupuesto, owner y relación con el SOW; no
debe ser la base de derechos por asset.

Registros mínimos:

| Registro | Propósito | Campos críticos |
|---|---|---|
| Campaign | Scope de campaña | ID, cliente, mercados, categoría, objetivo, plataformas, presupuesto, owner, estado |
| Creator Record | Ficha persistente | identidad pública, país, audiencia, plataformas, manager, contacto, conflictos, fees históricos, revisión |
| Rights Brief | Qué derechos se necesitan | canales, cuentas, paid, whitelisting, territorio, plazo, exclusividad, raw, adaptaciones, IA |
| Rights Matrix | Qué derecho tiene cada asset | asset, creator, derecho, país, plataforma, cuenta, finalidad, fechas, contrato, evidencia, estado |
| Chain of Title | Quién pudo conceder cada elemento | autor, productor, música, locación, terceros visibles, permiso, limitaciones, revisión legal |
| Contract Register | Estado contractual | partes, ley, fechas, valor, moneda, derechos, firmantes, documento, alertas |
| Asset Register | Estado de cada pieza | versión, formato, país, claims, música, aprobaciones, URLs, derechos, expiración |
| Expiry/Takedown | Retiro y renovación | derecho, canal, vencimiento, alertas, owner, solicitud, ejecución, evidencia |
| Renewal Queue | Decisión de continuidad | performance, derecho que vence, fee, owners, decisión y motivo |
| Evidence Index | Auditoría reproducible | tipo, origen, fecha, ubicación, versión/hash, retención, sensibilidad, acceso |

Las métricas públicas de Favikon, Modash o HypeAuditor se guardan como snapshots fechados. Nunca se presenta una
métrica actual como verdad histórica.

## 3. Flujo end-to-end y gates

```text
intake → rights brief → discovery → vetting → shortlist → disponibilidad/quote
→ negociación → contratos/rights matrix → brief → producción/aprobación
→ publicación → paid/whitelisting opcional → medición → expiry/takedown
→ aprendizaje → renovación o cierre
```

### Gate 1 — Intake completo

Antes de scouting deben existir cliente, producto, mercados, categoría, objetivo, plataformas, fechas, presupuesto,
claims, derechos solicitados y owner de aprobación.

### Gate 2 — Candidate ready

Todo creador recomendado debe tener scorecard, fuente y fecha de datos, fit de audiencia, conflicto, brand safety,
canal de contacto, disponibilidad por confirmar y owner.

### Gate 3 — Quote ready

Antes de pedir precio final deben estar definidos entregables, paid usage, territorio, duración, exclusividad,
plataformas, offline, raw files, adaptaciones, traducciones y whitelisting.

### Gate 4 — Contract ready

No se produce sin contrato aprobado, rights matrix, chain of title suficiente, claims aprobados, país/ley aplicable,
responsabilidades claras y fondos disponibles para compromisos de terceros.

### Gate 5 — Publish ready

No se publica sin asset aprobado, disclosure, música y terceros cleared, cuenta/URL correcta, derechos activos y
fecha de expiración registrada.

### Gate 6 — Amplify ready

No se pauta sin permiso paid explícito, autorización de cuenta o Partnership Ads cuando corresponda, copy aprobado,
tracking implementado y plataforma/territorio correctos.

### Gate 7 — Close ready

El cierre exige assets finales, evidencia de publicación, reporte, conciliación de gastos, derechos y expiraciones
registrados, aprendizajes y decisión de renovación.

## 4. Arquitectura contractual y derechos

La secuencia regional recomendada es:

```text
MSA cliente–Efeonce
→ SOW de campaña
→ Talent Agreement
→ Rights Exhibit / Rights Matrix
→ Country Overlay
→ Platform Permissions
→ Claims & Disclosure
→ Third-Party Clearance
→ AI Addendum, si aplica
→ Expiry/Takedown Register
```

No se infieren derechos por pagar un fee, recibir un archivo, repostear orgánicamente o activar una herramienta de
plataforma. Paid usage, whitelisting, imagen/voz, exclusividad, raw files, derivados, multi-país, offline, TV, OOH e
IA son componentes separados. El AI/likeness addendum está bloqueado por defecto.

La base regional y los overlays de Chile, Colombia, México y Perú viven en el [Rights & Usage Integrity Pack](CREATOR_INFLUENCE_CONTENT_RIGHTS_AND_USAGE_INTEGRITY_PACK_V1.md) y en la [investigación regional](../../audits/commercial/CREATOR_INFLUENCE_CONTENT_RIGHTS_REGIONAL_RESEARCH_2026-07-29.md). La validación local es obligatoria para categorías reguladas, menores, atletas con clubes/federaciones/sponsors, claims sensibles, pagos transfronterizos y derechos ampliados.

## 5. Economía, caja y pricing

Separar siempre:

1. fee Efeonce;
2. creator y manager fees;
3. producción y proveedores;
4. derechos y exclusividad;
5. media;
6. impuestos/retenciones;
7. FX y riesgo financiero.

Bandas internas para validación, no tarifas públicas:

| Componente | Hipótesis inicial |
|---|---:|
| Intelligence Sprint | USD 4.000–8.000 |
| Gestión de campaña | USD 12.000–20.000 |
| Programa regional recurrente | USD 8.000–15.000/mes |
| Mínimo de activación | USD 12.000 |
| Administración de pass-through | 10–15% o fee fijo explícito |
| Paid usage | 15–35% del fee base por 30 días |
| Whitelisting | setup USD 500–2.000 + licencia separada |
| Exclusividad local 90 días | +15–30% |
| Raw files | +10–25% del fee de contenido |
| Contingencia compleja | 10–15% |

No cobrar simultáneamente capas que representen la misma coordinación. No ocultar margen en pass-through. El margen
objetivo de la cuenta debe revisarse con Finance; como hipótesis: 55% sobre fees propios después de costos directos,
45% sobre la cuenta antes de overhead asignado y 35% de contribution margin. Una campaña excepcional no debe bajar de
30% sin aprobación.

Reglas de caja:

- No comprometer talento, producción o proveedores sin fondos suficientes del cliente.
- Intelligence: preferentemente 100% anticipado.
- Campaña: 50% del fee Efeonce al firmar y 50% antes de publicar.
- Creators: cubrir el fee comprometido antes de confirmar fechas, salvo aprobación de Finance.
- Retainers: pago mensual anticipado.
- Media: presupuesto separado y preferentemente financiado directamente por el cliente.
- Calcular `cash exposure = compromisos − fondos cobrados y disponibles`; cualquier exposición negativa requiere aprobación.
- Cotizar con moneda, fecha de FX, vigencia de 15 días y regla de ajuste. No usar tasas tributarias genéricas.

Las cancelaciones deben contemplar trabajo ejecutado, reservas, costos no recuperables, producción iniciada, publicación
y reprogramación. No se ofrece refund general por bajo rendimiento.

## 6. Measurement framework

Cada KPI declara fórmula, periodo, denominador, moneda, fuente, owner y nivel de confianza.

| Capa | Indicadores principales |
|---|---|
| Delivery | entregables, puntualidad, approval cycle, rights compliance, disclosure, budget variance, takedown |
| Audience | reach, audience fit, country fit, frequency, VTR, qualified reach, fraude/anomalías |
| Content | hook retention, completion, saves/shares, CTR, asset reuse, cost per usable asset, creative winners |
| Business | tráfico, códigos, leads, ventas, CPA/ROAS, branded search, lift, incrementalidad, retención |

No llamar incremental a una venta sólo porque usó un código. La jerarquía de evidencia es: holdout/test geográfico,
control sintético, cohorts con tracking, last-click/correlación y, al final, métricas de vanidad sin baseline. Si no
hay control o tracking suficiente, usar “señal”, “contribución” o “direccional”; nunca prometer causalidad.

Gate de reporting: 100% de assets usados con rights matrix aprobada, 100% de disclosures correctos, cero paid usage
posterior a vencimiento y desviación presupuestaria máxima de 10% salvo change order.

## 7. Creator experience, crisis y enterprise

### Creator experience

Brief breve, un canal de feedback, máximo dos rondas salvo change order, derechos definidos antes de producir, pago en
plazo, claims verificables, disclosure correcto y debrief posterior. Medir pago promedio, rondas, satisfacción, fallas,
rehire y tiempo de respuesta. Objetivo inicial: satisfacción ≥8/10 y cero pagos vencidos por falla interna.

### Crisis

```text
detectar → clasificar → pausar → preservar evidencia → escalar → decidir → corregir → documentar
```

P0 (riesgo grave): pausa y escalamiento en menos de 1 hora. P1 (controversia viral): evaluación en menos de 4 horas.
P2 (disclosure/claim/asset): corrección en menos de 24 horas. P3 (desviación menor): respuesta el siguiente día hábil.
El contrato debe prever suspensión, takedown, cancelación, kill fee, cooperación del creator y statement aprobado.

### Enterprise procurement

Preparar antes de vender a cuentas grandes: datos tributarios, bancarios, privacidad, seguridad, anticorrupción,
conflictos, subcontratistas, continuidad, incident response, referencias y facturación. Identificar marketing, brand,
procurement, legal, finance, media lead, economic buyer y sponsor.

No iniciar producción sin PO o aprobación equivalente, no adelantar talento sin fondos, no aceptar unlimited liability
sin revisión legal y no comenzar sin owner claro de aprobaciones.

## 8. Capacidad y piloto multi-país

Hipótesis de capacidad por campaign manager: 2 campañas premium, 4 medianas o 6 pequeñas productizadas. Medir horas
por fase, retrabajo, aprobaciones, creators, países, derechos, incidentes y margen antes de vender más capacidad.

Piloto recomendado: 8–10 semanas, una marca, 8–12 creators, 2–3 por mercado, una matriz regional de derechos, assets
adaptables, UTMs/códigos por país y paid test controlado. La venta general requiere, como mínimo, dos campañas, una
multi-país, una con paid usage, una con expiración de derechos, un segundo ciclo o renovación, cost-to-serve conocido,
cero incidentes críticos y satisfacción de cliente/creators ≥8/10.

## 9. Fuentes de verdad y automatizaciones

Fuente propia obligatoria: fees negociados, disponibilidad, conflictos, contratos, derechos, chain of title,
aprobaciones, evidencia, expiraciones, takedown, renovación y decisiones. No usar WhatsApp, email, Favikon, dashboards
de terceros, presentaciones o memoria del account manager como única fuente.

Automatizar recordatorios y consistencia, no decisiones legales:

- contrato firmado → crear derechos asociados;
- asset aprobado → exigir rights `cleared`;
- 30/14/7 días → alertas de renovación;
- derecho vencido → bloquear paid;
- takedown requerido → tareas por URL/canal;
- takedown verificado → adjuntar evidencia;
- cambio de territorio/plataforma → re-review;
- evidencia crítica ausente → campaña `blocked`.

## 10. Estado y próximos gates

Estado actual: `approved_for_validation` + `scale_constrained`.

Antes de cerrar venta general, validar con campañas reales: tres negociaciones regionales, conciliación de costos,
exposición de caja, fees de derechos, impuestos, capacidad, satisfacción y un caso con expiry/takedown. Legal debe
convertir checklists en contratos ejecutables y validar la versión vigente de cada norma antes de firmar o publicar.

## 11. Delta 2026-10-10 — controles para lo incorporado desde el deck «Marketing de Contenidos»

El operador aprobó el deck el 2026-10-10 y pidió incorporar su contenido al modelo (cita y alcance en el
[Business Model, §11](CREATOR_INFLUENCE_CONTENT_BUSINESS_MODEL_V1.md#11-delta-2026-10-10--incorporaciones-del-deck-marketing-de-contenidos)).
Este delta traduce esas incorporaciones a registros y gates. No relaja ningún gate existente; todo lo que agrega va
en la dirección de más control. El estado sigue `approved_for_validation` + `scale_constrained`, y las bandas de la
§5 no cambian.

### 11.1 Selección por función y nivel (Gate 2)

El scorecard de cada candidato suma tres campos:

- **función en la cartera:** alcance, credibilidad, producción, acceso a una audiencia o aprendizaje;
- **nivel:** nano, micro, macro o celebridad, con la fuente y la fecha del dato de audiencia. No existe una tabla de
  umbrales aprobada: el nivel se asigna por mercado y plataforma y se justifica en la shortlist (`por validar`);
- **autenticidad de audiencia:** resultado del chequeo de fraude o anomalías, la herramienta usada y la fecha del
  snapshot. Si no hay dato, el campo queda `unknown`, nunca como supuesto favorable.

La shortlist no puede presentarse al cliente como «audiencia verificada» sin ese registro.

### 11.2 Programa de creadores: roster y revisión por creador

- El Creator Record suma mercado, audiencia, función y nivel, para ordenar el roster como lo promete la oferta.
- La Renewal Queue pasa a tener **una decisión por creador en cada revisión trimestral**: renovar, reemplazar o
  cerrar, con la evidencia y el derecho que vence. Un creador no se renueva por haber publicado mucho.

### 11.3 De orgánico a pauta

«Lo orgánico prueba, la pauta escala» no crea una vía rápida. Para que una pieza con un creador pase de orgánico a
anuncio:

1. se registra por qué se eligió: señal usada (retención, guardados, comentarios), período, fuente y contra qué se
   comparó;
2. se cumple el **Gate 6 — Amplify ready** completo. Haber publicado en orgánico, o que la pieza haya funcionado, no
   concede uso pagado;
3. si el derecho de pauta no se contrató al firmar, se negocia y se registra en la Rights Matrix antes de activar;
4. el aprendizaje vuelve al Creator Record y a la campaña.

Promocionar una publicación desde la cuenta de la marca también es uso pagado.

### 11.4 UGC patrocinado: permisos por plataforma

Cada activación desde el perfil del creador registra, además de la licencia contractual:

| Formato | Evidencia mínima en el registro |
|---|---|
| Partnership ads (Instagram, Facebook) | permiso otorgado en la plataforma, cuenta, fecha, vencimiento y cómo se revoca |
| Spark Ads (TikTok) | autorización del creador para la pieza, plazo autorizado y vencimiento |
| Thought Leader Ads (LinkedIn) | aprobación de la persona dueña del perfil, pieza, plazo y revocación — `por validar` |

La mecánica exacta de cada permiso cambia con la plataforma: se verifica contra su documentación vigente antes de
cada activación; este pack no la fija. Si el permiso de plataforma y el contrato no coinciden en cuenta, pieza o
plazo, la activación queda `blocked`. LinkedIn no tiene todavía overlay de derechos: no se activa sin revisión de
Legal.

Si el perfil amplificado es de un ejecutivo o de un empleado del cliente, no es un creador contratado: no entra por
este pack hasta que exista una decisión sobre dueño y derechos (DA-07).

### 11.5 Contenido de clientes reales y de la comunidad

Contenido publicado por personas sin contrato con la marca (`por validar`, sin oferta propia):

- una mención, una etiqueta o un hashtag no son una licencia;
- para repostearlo o pautarlo hace falta una autorización escrita de la persona, registrada como cualquier otro
  derecho en la Rights Matrix, con canales, plazo y retiro;
- menores, terceros identificables y música siguen la regla general de terceros: sin clearance revisado, no se usa;
- hasta que Legal entregue el formato de autorización, este contenido no se pauta.

### 11.6 Social commerce y vivo con creadores

Antes de comprometer una activación con formatos comprables o live shopping:

- confirmar que el formato existe en la plataforma y el mercado del cliente en la fecha de la campaña;
- confirmar quién opera tienda, catálogo, precios, stock y checkout: no es Efeonce por defecto y se cotiza aparte;
- en vivo no hay ronda de aprobación previa de la pieza: se aprueban antes la lista de claims permitidos, el guion
  base, el disclosure visible durante toda la transmisión y quién puede cortarla;
- la grabación del vivo es un asset nuevo: sus derechos de reutilización se contratan aparte;
- aplica el protocolo de crisis de la §7, con un responsable de la marca disponible durante la transmisión.

Todo esto está `por validar`: no hay caso ejecutado.

### 11.7 Creadores en reserva para un lanzamiento

Dejar creadores «en reserva» antes de una fecha de lanzamiento es comprometer talento: aplican el Gate 4 y las reglas
de caja de la §5 (no se reservan fechas sin fondos del cliente ni contrato). El contrato suma confidencialidad sobre
el producto no anunciado y la fecha a partir de la cual el creador puede publicar (`por validar` con Legal).

### 11.8 Origen por creador en el CRM

Cuando el cliente compra la lectura «del social al CRM»:

- cada creador y cada pieza tienen un identificador estable en enlaces, códigos y nombres de anuncio; la convención
  se acuerda antes de publicar y se registra en la campaña;
- el creador no recibe datos personales de los contactos;
- recibir o enviar datos de contactos a plataformas o al CRM exige base de licitud revisada por Legal;
- la integración con HubSpot o Salesforce no es parte de este pack: la implementa y la cotiza RevOps & CRM;
- en el reporte, «origen» es atribución declarada. Aplica la jerarquía de evidencia de la §6: no se presenta como
  incrementalidad ni como causalidad.

Estado: `por validar`.

### 11.9 Nota sobre las bandas de la §5

Las bandas y el mínimo de activación de la §5 difieren de los del
[Pricing Integrity Pack](CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md) (§2 y §7). La diferencia es anterior
al deck y no se resolvió en este delta: está registrada como decisión abierta DA-13 en el
[modelo de la línea](MEDIA_DISTRIBUTION_BUSINESS_MODEL_V1.md#10-riesgos-y-decisiones-abiertas). Hasta que se decida, una
cotización declara cuál de los dos documentos usó.

Documentos complementarios: [Business Model](CREATOR_INFLUENCE_CONTENT_BUSINESS_MODEL_V1.md), [Pricing Integrity Pack](CREATOR_INFLUENCE_CONTENT_PRICING_INTEGRITY_PACK_V1.md), [Rights & Usage Integrity Pack](CREATOR_INFLUENCE_CONTENT_RIGHTS_AND_USAGE_INTEGRITY_PACK_V1.md), [Service](../../services/media-distribution/CREATOR_INFLUENCE_CONTENT_SERVICE_V1.md), [Manual](../../manual-de-uso/media-distribution/operar-creator-influence-content.md).
