# Efeonce Globe — Promoción comercial por atestación de derechos (la firma vive en el modelo, no en cada ruta)

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-07-24 por Claude (TASK-1535)
> **Ultima actualizacion:** 2026-07-24 por Claude
> **Documentacion tecnica:** [`docs/architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md`](../../architecture/creative-studio/EFEONCE_GLOBE_COMMERCIAL_PROMOTION_ATTESTATION_DECISION_V1.md) (ADR-010)

## De qué se trata este documento

Efeonce Globe es la **plataforma hermana de producción creativa** de Efeonce (imagen, video, audio). Greenhouse **no la hospeda**: la **gobierna**. Este documento explica, en lenguaje simple y **desde el punto de vista de Greenhouse**, cómo Globe **promueve rutas creativas para uso comercial** sin que un humano tenga que firmar ruta por ruta y workspace por workspace. La decisión que gobierna esto es el **ADR-010**; la spec técnica y esta documentación funcional viven en Greenhouse (control plane documental, EPIC-028), y el código vive en el repo hermano `efeonce-globe`.

## El problema que resuelve (en simple)

Una **ruta** en Globe es un modelo concreto detrás de un encargo (por ejemplo, "Seedream 5 Pro para un key visual de redes"). Un **workspace** es un espacio de trabajo — el de Efeonce interno, o el de un cliente. **Promover** una ruta es dejarla disponible para producir en un workspace.

El enfoque ingenuo sería: *un humano firma cada (ruta × workspace)*. Eso no escala. Si hay N rutas y M workspaces, son **N×M firmas** — y cada modelo nuevo o cliente nuevo multiplica el trabajo manual. Peor: la pregunta que de verdad importa para comercializar **no es** "¿puede esta ruta correr en este espacio?", sino **"¿tenemos derecho a usar comercialmente lo que produce este modelo, y a entregárselo a un cliente?"**. Y esa pregunta **se responde una vez por modelo**, no una vez por espacio.

## La idea central: reubicar la firma al modelo

El ADR-010 **mueve la firma humana** de la combinación (ruta × workspace) a una sola **atestación de derechos comerciales por modelo**. En vez de N×M firmas, hay **una firma por modelo** (más precisamente, por proveedor+modelo+versión+términos). Todo lo demás **se deriva** de esa atestación; nadie vuelve a firmar para cada ruta o cada espacio.

Una **atestación de derechos comerciales** es un hecho firmado que dice, para un modelo concreto:

- **Quién revisó** los términos del proveedor y **cuándo**.
- **Qué términos** exactos revisó — con su URL (`providerTermsRef`) y una **huella `sha256`** de esos términos (`providerTermsDigest`), para que la firma quede anclada al texto que se leyó y no a "los términos en general".
- **Qué se concede** (`grant`), en tres casillas independientes:
  - **Uso comercial** (`commercialUse`): ¿se puede usar la salida para fines comerciales de Efeonce?
  - **Entrega a cliente** (`clientDelivery`): ¿se puede **entregar** esa salida a un cliente?
  - **Sublicenciable** (`sublicensable`): ¿el cliente puede a su vez re-licenciarla?

Esta atestación es un **hecho global del plano de control** — no pertenece a ningún workspace ni lleva aislamiento por tenant. Es **inmutable** por (proveedor, modelo, versión, huella de términos): si los términos del proveedor cambian, cambia la huella, y eso **exige una atestación nueva**; la vieja queda como evidencia histórica. Cuando se consulta, se devuelve **la más reciente**.

## Promover ≠ entregar (la distinción que evita el error caro)

Promover una ruta la deja **disponible** para producir. **No** significa que cualquier pieza salga automáticamente al cliente. Cada artefacto que va a un cliente **sigue pasando por su propio camino de aprobación humana** (candidato → revisión → aprobación). La promoción abre la puerta del taller; la entrega de cada pieza sigue teniendo su control de calidad humano. Son dos cosas distintas y **ninguna reemplaza a la otra**.

## La lane automatizada (promoción sin firma ruta-por-ruta)

Con la atestación como **fuente única de verdad** de los derechos, aparece una **lane de promoción automatizada**: un camino que puede promover una ruta para un workspace **derivando** los derechos de la atestación del modelo, sin pedir una firma nueva.

Lo importante de cómo está construida:

- Corre bajo un **principal de servicio distinto y separado** (`globe:service:promotion-auto-lane`), no bajo la identidad humana ni bajo el principal que revisa a mano. Cada quien tiene su propia autoridad acotada.
- **No pasa por el saga de revisión humana** (ese sigue existiendo, cableado a la firma humana, para lo que la requiere). La lane es un camino paralelo y **fail-closed**: si algo falta, **niega**, no adivina.
- **Nunca fabrica derechos.** Lee la atestación y **solo puede apretar** (nunca aflojar) las restricciones. Si el modelo no tiene atestación con uso comercial, la ruta **no se promueve para uso comercial**.
- **Techo por tipo de workspace, fail-closed:** promover a un workspace **de cliente** exige que la atestación conceda **entrega a cliente** (`clientDelivery`). A un workspace interno le basta con uso comercial. Si el techo no se cumple, se niega.

En palabras simples: **la firma se hace una vez, sobre el modelo; la lane reparte esa autoridad a las rutas y espacios que califican, sin volver a molestar a un humano — y siempre por debajo de lo que se firmó, nunca por encima.**

## Qué se probó en vivo

El sistema **no quedó solo en código**: se desplegó y se ejercitó en producción interna.

- El CEO firmó **atestaciones comerciales reales** para dos modelos (Vertex generativo y Seed Audio de ByteDance en Fal), cada una con su evidencia de términos y huella `sha256`.
- Se ejercitó un **canary de la lane**: el principal de servicio de la lane tomó una ruta que estaba deshabilitada, la **promovió derivando los derechos de la atestación**, y publicó la política de derechos con las restricciones **derivadas de la postura atestada** (no inventadas).
- El acceso temporal para disparar la lane se **otorgó y se revocó** (break-glass), verificando el corte.

## La lección que quedó grabada (el apagón de acceso)

Al agregar la capability de atestación al **grant del broker de OAuth**, hubo un **apagón de login** breve: el broker exige que las capabilities concedidas sean un **subconjunto** de las requeridas, así que declarar la capability nueva la volvió **requerida** antes de que el cliente desplegado la pidiera — y todos quedaron fuera con "tu sesión no cumple la política de acceso". Se revirtió la política del broker (login recuperado) y luego se aplicó el **rollout correcto en 3 pasos, sin downtime**: primero el broker **permite** (buffer), después el cliente **pide** la capability, y recién al final el broker la **exige**. Es la regla dura para cualquier cambio futuro de scopes entre Greenhouse y Globe.

> Detalle técnico: la matriz de estados, los principals, el techo por workspace, la evidencia de términos y el rollout de scopes están en el ADR-010 y en el runbook de operación. La evidencia viva (revisiones desplegadas, atestaciones firmadas, flags y canarios) vive en [`docs/operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md`](../../operations/creative-studio/GLOBE_RUNTIME_HANDOFF.md).

## Cómo se conecta con el resto

- **Model Lab** ([`efeonce-globe-model-lab.md`](efeonce-globe-model-lab.md)) — las rutas que se promueven son las mismas que el Lab ejercita; la atestación gobierna su uso comercial.
- **Evaluation Harness** ([`efeonce-globe-evaluation-harness.md`](efeonce-globe-evaluation-harness.md)) — la evidencia repetible por contrato de fidelidad convive con la atestación: una dice "cuán bien sirve la ruta", la otra "tenemos derecho a comercializarla".
- **Catálogo de producer** ([`efeonce-globe-producer-catalog.md`](efeonce-globe-producer-catalog.md)) — las rutas y sus modelos que la atestación cubre.

## Para operarlo paso a paso

Ver el manual: [`docs/manual-de-uso/creative-studio/operar-promocion-comercial-atestacion-globe.md`](../../manual-de-uso/creative-studio/operar-promocion-comercial-atestacion-globe.md).

> Detalle técnico: código en el repo hermano `efeonce-globe` — atestación en `packages/domain/src/model-commercial-rights.ts`, lane en `packages/domain/src/commercial-promotion-lane.ts`, contrato en `packages/contracts/src/model-commercial-rights.ts`, tabla append-only en `packages/database/migrations/0030_model_commercial_rights_attestations.sql`. Gobernado por `TASK-1535` de Greenhouse (control plane).
