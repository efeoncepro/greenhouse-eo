# Sales Navigator — servicios y modelo operativo de cliente

Corte **29-10-2026**, America/Santiago. Owner: Commercial / Julio Reyes.

> **Corte inicial histórico, sustituido operativamente por el [portafolio ampliado](PORTAFOLIO-E-ICP-2026-10-29.md)**
> y su [manifest final](PORTAFOLIO-CONFIGURADO-2026-10-29.json): doce servicios y cinco Personas ampliadas.
> Los cuatro servicios y nombres de Personas siguientes describen el estado anterior a esa ampliación.
**Estado de esta fase inicial: cuatro servicios y cinco perfiles ideales guardados en la cuenta Core de Julio y releídos
después de recargar.** Mandato explícito: documentar el aprendizaje, configurar servicios con sus landings
y armar perfiles ideales robustos. [Valores exactos verificados](CONFIGURACION-2026-10-29.json).

Esta es una configuración operativa de búsqueda y personalización. Las hipótesis de ICP de las ofertas
conservan sus estados de validación; guardar una Persona no valida demanda, presupuesto, autoridad o PMF.
Marco: [método B2B Accepted](../../architecture/EFEONCE_B2B_PROSPECTING_SKILL_DECISION_V1.md),
[Customer Model](../../../.codex/skills/efeonce-customer-model-operator/SKILL.md) y
[contexto ICP](../../context/13_icp-buyer-personas-jtbd.md).

## Decisiones del operador y evidencia

- **Relación:** Julio considera probable que muchos contactos relevantes, especialmente los de mayor valor,
  no sean primer grado; aclaró que es **su suposición**. Se registra como hipótesis, no hecho general de su red.
  Seleccionar personas por responsabilidad y necesidad; verificar después relación y canal por individuo.
- **Cuenta frente a persona:** el filtro Contacto de cuentas acredita alguna conexión en la empresa.
  No identifica al economic buyer. La pasada anterior 295 → 31 → 28 es un carril de acceso; se conserva
  la base sin relación para seleccionar compradores pertinentes.
- **Plan y saldo:** Ajustes confirma **Sales Navigator Core / 150 InMail disponibles**. La captura del usuario
  coincide. La declaración inicial de 50 queda como antecedente; no se determinó la causa de la diferencia,
  ni reposición, periodicidad o acumulación. [Política vigente](../../operations/EFEONCE_LINKEDIN_SALES_NAVIGATOR_POLICY_V1.md).
- **Geografía e industria:** las cinco Personas son reutilizables y no fijan país, industria ni relación.
  El ejercicio actual aplica a cuentas de Chile; el alcance corporativo LATAM se conserva. Cada búsqueda
  añade cuenta/lista/cohorte, geografía pertinente y la Persona; no usar el contador global como cartera.

## Servicios configurados

| Servicio guardado | Landing guardada | Propuesta de valor y frontera |
| --- | --- | --- |
| Posicionamiento SEO | [SEO](https://efeoncepro.com/servicios/posicionamiento-seo/) | Técnica, arquitectura, intención, contenido, entidades y autoridad; diagnóstico, ejecución y medición por ciclo con dependencias CMS/datos definidas. |
| Efeonce AEO · Visibilidad en IA | [AEO](https://efeoncepro.com/aeo-2/) | Baseline de menciones/citaciones/representación por mercado y consultas, prioridades de contenido/entidad/evidencia y seguimiento comparable; fases según alcance. El nombre exacto usa `Efeonce AEO \| Visibilidad en IA`. |
| Agencia Creativa | [Agencia Creativa](https://efeoncepro.com/agencia-creativa/) | Estrategia/posicionamiento, identidad, plataforma de campaña, mensajes, KV y toolkit; del concepto al despliegue o tramo acordado, coordinado con otros partners. |
| Producción Creativa a Escala | [Producción Creativa](https://efeoncepro.com/agencia-creativa-v2/) | Capacidad definida, producción/adaptación multiformato, versionado/localización, memoria de marca, aprobaciones, derechos y QA; puede partir de concepto de cliente u otra agencia. |

Agencia Creativa ya existía: se conservó su URL correcta y se reescribieron descripción/categoría en español.
Se añadieron las otras tres fichas. Las cuatro descripciones distinguen destinatario, problema, alcance,
forma de trabajar y situaciones de entrada; los textos exactos (905/939/928/942 caracteres) y categorías
están en el JSON. Se sustituyeron borradores automáticos en inglés por textos revisados contra sitio/canon.
No se añadieron precios, métricas de clientes, garantías de rankings/citación ni capacidades ilimitadas.

Las cuatro URLs describen servicios distintos y están vigentes en la navegación verificada. SEO se abrió
en navegador real; AEO y ambas creativas se contrastaron por web y canon. `/agencia-creativa-v2/` es la
landing deliberada de producción. `/aeo-2/` sigue siendo la ruta comercial utilizada: no reemplazarla por
un destino de cutover planificado sin verificarlo.

Fuentes: [arquitectura de landings creativas](../../architecture/public-site/AGENCIA_CREATIVA_ELEMENTOR_MODULES_V1.md),
[oferta creativa](../../services/creative-services/EFEONCE_CREATIVE_SERVICES_OFFER_ARCHITECTURE_V2.md),
[Search Visibility 360](../../business-models/search-visibility-360/SEARCH_VISIBILITY_360_BUSINESS_MODEL_V1.md),
[modelo AEO](../../business-models/aeo/EFEONCE_AEO_BUSINESS_MODEL_V1.md).

## Cinco Personas guardadas

Se editaron los dos perfiles genéricos existentes y se crearon tres. El límite de cinco se verificó en UI
y en [FAQ oficial](https://www.linkedin.com/help/sales-navigator/answer/a1422192).
Los cargos del catálogo se normalizan/traducen; el título declarado debe revisarse en el perfil real.

| Persona | Filtros persistidos | Papel que orienta la investigación |
| --- | --- | --- |
| Dirección de Marketing y Growth | Función Marketing; seis niveles desde Propietario/socio, Director ejecutivo y VP hasta Director y las dos clases de gerente ofrecidas por la UI. Sin Cargo actual. | Responsables y sponsors candidatos de las cuatro ofertas; autoridad económica por verificar. |
| SEO y AEO · Orgánico y contenido | Ocho cargos normalizados: especialista/analista/director/jefe/líder de SEO y jefaturas/dirección de contenido. Sin función o seniority adicional. | Operador, experto, owner de orgánico y posible champion; no presupone presupuesto. Nombre exacto con `\|` en JSON. |
| Marca y Estrategia Creativa | Ocho cargos de gestión superior, responsabilidad, dirección nacional/general, estrategia, comunicaciones y marketing de marca. Sin seniority adicional. | Owner de marca/campañas y evaluación de agencias. |
| Producción Creativa y Content Ops | Diez cargos: dirección de producción/creativa, jefaturas de equipo/grupo creativo, diseño creativo, productores y jefaturas/dirección de contenidos. | Owner/operador de briefs, capacidad, producción, QA y aprobaciones. |
| Producto Digital y Plataformas Web | Siete cargos: producto digital, gerencias de producto, CPO normalizado, webmaster y desarrollo web sénior. | Implementación/validación de SEO/AEO y dependencias; confirmar que gobierna activos digitales y no sólo otro producto. |

Todas quedan sin geografía e industria permanentes. Marketing, Marca, Producción y SEO pueden solaparse:
una persona puede cumplir varios roles. No sumar sus resultados como personas únicas. La relación de primer
grado se aplica sólo en una pasada posterior de acceso, nunca para definir el grupo comprador completo.

## ICP de cuenta y calificación

**Piso vigente:** clientes nuevos de servicios con menos de **50 personas** quedan fuera del ICP corporativo.
50 es piso de evaluación, no aprobación automática. Las bandas LinkedIn 51+ son un proxy; 11–50 requiere
confirmar al menos 50 en la entidad que contrataría. No convertir perfiles asociados ni tamaño de holding en
plantilla de la filial. Registrar fuente, fecha, confianza y discrepancias.

Para outbound, el canon añade capacidad razonable de comprar USD 8.000–15.000 Spot o USD 3.000–5.000 MRR:
**gate económico interno**, no tarifa publicada ni presupuesto demostrado por tamaño. Fuente y alcance en
[ICP corporativo](../../context/13_icp-buyer-personas-jtbd.md#tamaño-de-la-cuenta-en-la-calificación-comercial).
La oportunidad conserva sus gates propios y economía por fase; no se trasladaron estos importes a las fichas públicas.

| Dimensión | Evidencia a buscar | Si falta |
| --- | --- | --- |
| Entidad y tamaño | Marca/razón social que compra, país y banda sustentada | Investigación; no asumir fit por grupo o cargo |
| Problema y momento | Situación verificable y progreso que el cliente intenta lograr | Hipótesis para discovery; sin urgencia inventada |
| Equipo y ownership | Operador, owner del problema, sponsor, aprobación de datos/tecnología/marca según fase | Mapear objetivo y adyacentes pertinentes |
| Capacidad de compra | Orden de magnitud, presupuesto accesible y decisión económica | Desconocido; no inferirlo por empleados/seguidores |
| Delivery | Datos/accesos, aprobador, capacidad de implementar, derechos y colaboración | Condicionar fase/alcance antes de propuesta |
| Decisión y procurement | Criterios, proceso decisor, onboarding, Legal/Finance/Compras cuando corresponda | Próxima validación con owner, sin prometer alta de proveedor |

No exigir todo el grupo confirmado antes de una primera conversación pertinente; la evidencia debe ser
suficiente para la siguiente decisión. Un comprador potencial y un operador son roles distintos aunque
una persona pueda cubrir ambos.

### SEO

**Cuenta candidata:** organización con activos web y demanda orgánica relevante, owner interno, datos y
capacidad de aprobar/implementar cambios. Especialistas SEO/contenido operan; Marketing/Growth/E-commerce
poseen el problema; Producto/Web/TI validan implementación; sponsor y economic buyer se comprueban por cuenta.

**JTBD:** cuando una migración, cambio de mercado o brecha orgánica afecta el descubrimiento, quiero priorizar
y ejecutar técnica/contenido/autoridad con evidencia, para captar demanda pertinente y decidir la siguiente inversión.
Triggers: migración/replatforming; caída medida; nuevo producto/mercado. Primer valor: baseline, prioridades
y primer frente ejecutable con acceptance owner. Validar métricas de visibilidad, tráfico calificado y conversión
según instrumentación. Anti-ICP de delivery: sin acceso o capacidad de cambio; exigencia de rankings/ingresos
garantizados; compra aislada de artículos sin estrategia ni continuidad de implementación.

### AEO

**Cuenta candidata:** marca con productos/categorías que requieren representación fiel y evidencia verificable,
owner Marketing/SEO/Marca y disposición a operar hallazgos. Operador SEO/contenido y sponsor Marketing/Growth;
Producto/Web, Analytics y validadores de marca/Legal según el dato que se modifica.

**JTBD:** cuando el directorio pregunta cómo aparece la marca en IA o hay inconsistencias comprobadas, quiero
un baseline reproducible y un plan priorizado, para gobernar representación y decidir qué ejecutar. Triggers:
pregunta ejecutiva concreta; cita/representación incorrecta verificada; cambio de oferta o mercado.
Primer valor: matriz de consultas/mercados/fuentes, brechas sustentadas y decisión de fase. Anti-ICP:
exigir controlar respuestas de modelos o garantizar citación; buscar sólo un score sin decisión; falta de
fuentes/evidencia o de acceso para corregir. Los cambios se evalúan con métodos comparables, sin causalidad asumida.

### Agencia Creativa

**Cuenta candidata:** equipo interno de marketing/marca con necesidad de definición, diferenciación o plataforma
de campaña, y aprobador de marca identificado. Marca/estrategia creativa posee el problema, Marketing patrocina;
operadores creativos, contenido y producción implementan. Legal/IP y Procurement intervienen según alcance.

**JTBD:** cuando la marca evoluciona o llega un lanzamiento, quiero traducir estrategia en concepto, mensajes
y sistema utilizable, para desplegar campañas coherentes entre equipos, formatos y mercados. Triggers:
rebranding; lanzamiento; fragmentación comprobada de criterios. Primer valor: brief alineado, plataforma/KV
y toolkit con criterios de aceptación. Anti-ICP: estética sin problema/owner; aprobaciones indefinidas;
derechos ambiguos; agencia externa asumida como ICP validado sin investigación propia.

### Producción Creativa

**Cuenta candidata:** equipo con demanda recurrente o picos, varios formatos/mercados y sensibilidad de marca,
que puede priorizar backlog y aprobar entregas. Producción/Creative Ops/contenido operan; Marca/Marketing
poseen prioridad y autoridad creativa; economic buyer y Compras/Finance se verifican; Legal/IP gobierna derechos.

**JTBD:** cuando el volumen supera la capacidad estable o ya existe un concepto aprobado, quiero ampliar
producción gobernada conservando decisiones, para entregar sin pérdida de consistencia ni reiniciar contexto.
Triggers: backlog de lanzamiento; adaptación/localización continua; exceso de retrabajo/coordinar proveedores.
Primer valor: backlog priorizado, primer lote o sistema modular con revisión y aprobación. Medir entrega,
retrabajo, cumplimiento y capacidad liberada con baseline comparable. Anti-ICP: piezas ilimitadas;
sin brief/aprobador; dirigir personas como staff augmentation bajo un compromiso managed; IA sin revisión
o condiciones de datos/derechos acordadas.

## Prueba real y límites

Se probaron tres Personas contra **Empresa actual BICE VIDA**, sin filtro de conexión:

| Prueba | Resultado leído | Lectura |
| --- | --- | --- |
| SEO/AEO | 2: Marta Rodríguez y María Ignacia Álvarez | Recupera primer y segundo grado; cargos SEO pertinentes |
| Marca | 4: Mauricio Gaete, Carol Ortega, Matías Ramón de Quevedo y María José Fuentes | Cobertura de marca; roles/autoridad por validar |
| Dirección, versión final | 11; incluye Pilar García y Felipe Otarola | Amplía niveles gerenciales; sigue incluyendo candidatos que requieren depuración |

La primera receta de Dirección, Marketing + sólo niveles altos, recuperaba únicamente a Bárbara. Un intento
de títulos normalizados fue demasiado restrictivo; la versión final usa Marketing + seis niveles, sin títulos.
Las tres búsquedas verifican aplicación, no precisión/cobertura exhaustiva. Felipe Moncayo aparece por
clasificación de empresa aunque su alcance declarado sea Inmobiliaria Security: conservar la depuración
del expediente. Algunos especialistas o responsables clasificados como IC pueden quedar fuera de Dirección;
**la pasada de respaldo es Empresa exacta + función sin seniority, y revisión nominal/de cargo**.

Producto/Web y Producción se verificaron por persistencia de campos, sin una prueba exhaustiva de resultados
por cuenta. No certificar todas las variantes de cargo, idiomas o geografías. Los roles propuestos deben
contrastarse con el perfil y con la persona; el catálogo no es organigrama.

## Operación siguiente y cierre

1. Seleccionar cuenta/cohorte por industria, entidad y tamaño; aplicar país a la cuenta o a las personas
   según el alcance de la decisión. La matriz chilena conserva su búsqueda sin conexión como base.
2. Aplicar Persona por papel, combinar pasadas y deduplicar; revisar cargo actual/alcance. Retirar filtros
   de clasificación y buscar nominalmente si una persona conocida queda fuera.
3. Registrar relación por persona, historial y restricciones; elegir directo, conexión/espera o InMail
   táctico según política, sin trasladar una conexión agregada al decisor.
4. Convertir una hipótesis en discovery proporcional, con primer valor y siguiente validación; comprobar
   ICP/delivery/economía antes de comprometer diagnóstico/propuesta y producción.

Acciones verificadas: **tres servicios añadidos, uno editado; tres Personas creadas, dos adaptadas**.
Se recargó y releyó cada ficha completa y el conjunto final de cinco perfiles. El JSON conserva valores
releídos y los tres smoke tests. No se enviaron mensajes/solicitudes/InMail, no se consumieron créditos,
no se crearon registros CRM ni búsquedas guardadas/alertas nuevas. La personalización nativa de LinkedIn
puede actualizarse conforme a sus propias reglas; no se modificaron ajustes de notificaciones.

Al cierre de esta fase, documentación/skills locales actualizadas sin commit/push; el cierre posterior de
consolidación se registra en el [índice del expediente](README.md). Capturas ignoradas por Git:
`.captures/sales-navigator-config-2026-10-29/servicios.jpg` y `perfiles.jpg`.
No hay nuevo runner, API de LinkedIn, exportación de sesión o automatización de envíos.
