# ADR — separar el modelo comercial de Creative Studio en tres ejes y gobernar Studio Credits

## Architecture Decision 2026-07-19 — business model híbrido, taxonomía ortogonal y crédito no especulativo

- **Status:** Accepted
- **Date:** 2026-07-19
- **Owner:** Efeonce Strategy + Creative Practice + Finance + Efeonce Globe Product
- **Scope:** taxonomía comercial de Creative Studio, responsabilidad de delivery, arquitectura de ingresos,
  Studio Credits, documentación canónica y futuros contratos/entitlements del producto
- **Reversibility:** two-way-but-slow
- **Confidence:** medium
- **Validated as of:** 2026-07-19

### Context

Efeonce necesita comercializar una plataforma que puede ser operada completamente por la agencia, compartida
con el cliente o puesta a disposición del cliente. La documentación existente mezclaba tres preguntas distintas:

1. quién dirige el servicio y responde por el outcome;
2. cuánto dura y cómo se contrata la relación;
3. quién opera un run específico dentro del Studio.

Esa mezcla hacía aparecer `On-Going`, `Staff Augmentation`, `Managed Squad` y `client-operated` como si fueran
alternativas de una misma lista. También abría el riesgo de vender créditos como tokens de proveedor, cobrar
dos veces el trabajo humano o prometer el mismo SLA cuando Efeonce no controla la ejecución.

El mercado valida el patrón de acceso/suscripción más consumo gobernado, pero no entrega una equivalencia
económica universal entre créditos, outputs o costo. El runtime de Efeonce Globe todavía no está habilitado
para clientes externos, checkout ni facturación.

### Decision

1. Creative Studio adopta tres ejes ortogonales:
   - **modelo de delivery:** `Managed Squad`, `Staff Augmentation`, `Studio Access` o configuración híbrida con
     lanes separadas;
   - **forma de engagement:** `On-Going`, `On-Demand` o `Sample Sprint`;
   - **modo operativo por run/lane:** `efeonce-managed`, `co-operated` o `client-operated`.
2. `Managed Squad` no es sinónimo de `efeonce-managed`: el primero es una promesa comercial de gobierno y
   accountability; el segundo asigna control operativo dentro de una corrida.
3. Staff Augmentation permanece client-directed. No puede incluir silenciosamente dirección, QA ni SLA de un
   Managed Squad. Si se necesitan, se crean lanes y líneas comerciales separadas.
4. Studio Credits representan **operaciones generativas gobernadas**, no horas, piezas, tokens, moneda ni costo
   directo de un provider. La misma operación semántica consume los mismos créditos cualquiera sea el modo;
   la capacidad humana y el accountability cambian de precio por otra línea.
   Provider-neutral no significa provider-oculto: estimate, approval e historial muestran provider,
   modelo/version, readiness y fallbacks reales, sin publicar costo vendor, margen ni una tabla provider→credit.
5. El fee de gobierno/plataforma, la capacidad humana, implementación/IP, derechos/licencias y pass-through se
   separan de los créditos. Derechos nunca quedan ocultos dentro de un crédito.
6. No se publica `1 crédito = $X`, paquetes, top-ups ni checkout hasta validar costos p50/p95, refund policy,
   impuestos, margen, contrato y controles financieros.
7. El modelo canónico vive en `docs/business-models/creative-studio/`; arquitectura mantiene los contratos
   técnicos y `docs/services/` definirá cada oferta operable cuando esté comercialmente habilitada.

### Alternatives Considered

| Alternativa | Razón de rechazo |
| --- | --- |
| Tres paquetes independientes: Managed, Co-op y Self-service | Duplica producto y confunde modo operativo con SKU; rompe continuidad de run y memoria. |
| Crédito como pass-through del costo de proveedor | Expone volatilidad ajena, incentiva arbitraje y no remunera IP, gobernanza, QA ni soporte. |
| Crédito por pieza final | Una pieza puede contener múltiples operaciones, variantes y finishing; crea comparaciones falsas y castiga eficiencia. |
| Crédito por hora humana | Contradice la doctrina de capacidad gobernada y hace que la eficiencia por IA reduzca el valor facturable. |
| Todo incluido en un retainer plano | Oculta consumo variable, complica margen/forecast y subsidia heavy users con cuentas de bajo uso. |
| Self-service puro desde el inicio | Traslada ambigüedad, derechos y riesgo de marca al cliente antes de probar templates, soporte y escalamiento. |

### Consequences

Positivas:

- pricing y accountability se vuelven explicables sin vender bodies ni tokens;
- un cliente puede graduar autonomía sin cambiar de producto ni perder memoria;
- Finance puede observar margen por línea y por modo;
- el ledger puede permanecer provider-neutral y compatible con cambios de ruta/modelo;
- la transparencia de ruta permite que el cliente valore y audite el motor usado sin convertirlo en moneda;
- los contratos pueden asignar claramente errores, cambios de dirección y derechos.

Costos y riesgos:

- CPQ, CRM, contratos y analytics necesitarán representar tres ejes, no un enum único;
- la operación híbrida exige owner por lane/run y evita el cómodo pero ambiguo “lo hacemos juntos”;
- la equivalencia de créditos requiere telemetría y revisión periódica;
- el modelo no estará listo para pricing público hasta completar pilotos y aprobación Finance/Legal.

### Runtime Contract

- Business model: [EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md)
- Credit policy: [EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_CREDIT_MODEL_V1.md)
- Platform architecture: [EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md](EFEONCE_CREATIVE_STUDIO_AGENTIC_PLATFORM_ARCHITECTURE_V1.md)
- Runtime location and rollout: [EPIC-028](../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)

Esta decisión no crea precios, SKUs, checkout, facturación ni autorización de clientes externos.

### Revisit When

- 50+ runs comparables permiten recalibrar bandas de crédito con p50/p95 y tasa de refund;
- un proveedor o capability cambia el costo efectivo más de 25% durante dos ventanas consecutivas;
- el margen bruto por línea cae bajo 45% o el soporte no financiado supera 10% del costo servido;
- clientes no pueden predecir consumo dentro de ±20% en templates estables;
- más de 15% de runs requiere reclasificar manualmente modelo, engagement o modo;
- Finance/Legal aprueban venta externa, impuestos, expiración, top-ups y reconocimiento de ingresos;
- evidencia muestra que una taxonomía más simple mantiene igual control y auditabilidad.

---

## Delta 2026-07-23 — autoría humana como mecanismo de valor; agencias como hipótesis, no nuevo modelo

**Clarificación aceptada.** La decisión de vender capacidad creativa gobernada implica una doctrina de autoría:
el equipo creativo es protagonista, el operador es el punto de vista de la interacción, la autoridad creativa
permanece humana y Globe actúa como guía/sistema. Globe absorbe routing, perfiles de prompt, parámetros,
referencias, restricciones, retries, estimate y trazabilidad; no absorbe gusto, derechos, presupuesto,
aprobación ni publicación.

Esto no cambia la taxonomía de tres ejes ni Studio Credits. La vuelve más defendible: gobierno/plataforma remunera
la reducción de complejidad y la memoria; capacidad humana se concentra en dirección, curation y excepciones;
implementación/IP captura templates, recetas y Creative Prompt Engineering validados; credits continúan midiendo
operaciones generativas gobernadas, no prompts ni horas.

Los equipos creativos de otras agencias quedan registrados como **hipótesis B2B2B**. No se crea un cuarto modelo
de delivery, package ni entitlement. Cualquier piloto debe usar una combinación existente de `Studio Access`,
`co-operated` o `client-operated` y cerrar antes tenancy agencia→cliente final, confidencialidad, derechos,
brand authority, white-label/endorsed, accountability y margen.

**Runtime Contract:** la formulación completa vive en
[Creative Studio Business Model V1.1](../business-models/creative-studio/EFEONCE_CREATIVE_STUDIO_BUSINESS_MODEL_V1.md);
las experiencias agentic deben preservar original, provenance `aportado|derivado|sugerido` y aceptación humana.

**Revisit when:** evidencia de entrevistas y pilotos B2B2B justifique promover agencias a ICP; o métricas de
uso muestren que la automatización reduce control/autonomía percibidos en vez de aumentarlos.
