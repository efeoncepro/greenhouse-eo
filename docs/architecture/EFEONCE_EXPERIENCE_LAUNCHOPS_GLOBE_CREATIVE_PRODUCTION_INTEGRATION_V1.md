# Efeonce Experience LaunchOps + Globe — Creative Production Integration V1

## Status

- Status: Proposed
- Date: 2026-07-26
- Commercial face: Efeonce
- Product service: Experience LaunchOps, Wave
- Creative production platform: Efeonce Globe
- Related epic: EPIC-036 + EPIC-028

## Decision

Globe se ofrecerá como una capability composable de Experience LaunchOps para producir material creativo
gobernado y listo para ensamblaje, combinando plataforma, especialistas y capacidad operativa. No será un simple
generador de archivos ni una dependencia obligatoria de Wave.

Wave seguirá siendo responsable de convertir la intención de negocio en una experiencia publicable: contrato,
ensamblaje, Search/AEO, medición, governance, integración, release y evidencia. Globe será responsable de la
producción creativa, variantes, provenance, derechos y evidencia de calidad de los assets.

La unidad de valor compartida será el `Experience Release Package`, no un asset aislado.

Globe puede venderse y operarse de forma independiente como capability creativa de Efeonce, o componerse con
Wave para llevar una experiencia desde la intención hasta el lanzamiento. El software amplifica la capacidad
humana; no elimina dirección creativa, craft ni accountability de delivery.

## Boundary

| Concern | Wave / Experience LaunchOps | Globe |
| --- | --- | --- |
| Intent, audience, outcome, window | SoT | consumes |
| `LaunchContract` y `ExperienceSpec` | SoT | input derivado |
| Brand, Search y Measurement Contracts | SoT con especialistas | restricciones de producción |
| Creative direction y asset production | coordina y aprueba el alcance | SoT de ejecución creativa y capacidad humana |
| Asset variants, compositions y media outputs | consume | SoT de producción |
| Rights, provenance, hashes y asset governance | consume evidence | SoT de asset governance |
| Component/slot mapping y ensamblaje | SoT | entrega `AssemblyManifest` |
| CMS/DXP, preview, approvals y release | SoT | no reemplaza el CMS |
| Post-launch measurement y verification | SoT | consume learnings |

Efeonce mantiene la responsabilidad comercial y contractual. Wave y Globe son marcas/capabilities de producto
del ecosistema; el cliente no debe tener que resolver la arquitectura interna para comprar el resultado.

## Product levels

No se debe confundir producción creativa con lanzamiento end-to-end:

1. **Asset-ready:** asset producido, validado, documentado y utilizable.
2. **Experience-ready:** asset relacionado con una experiencia, sus slots, componentes, variantes y reglas.
3. **Launch-ready:** experiencia ensamblada en el stack del cliente, validada, aprobada y lista para publicar.

Globe puede entregar los dos primeros niveles. Wave convierte el paquete en el tercero.

## Experience Release Package

El paquete versionado contiene:

- `LaunchRequest` y `ExperienceSpec` de referencia;
- `CreativeProductionContract`;
- `CreativeAssetPack` con imágenes, video, audio, motion, ilustraciones o composiciones;
- `AssetManifest` con IDs, hashes, formatos, dimensiones, variantes, idioma, mercado y estado;
- `AssemblyManifest` con relación asset → componente → slot → experiencia;
- metadata de accesibilidad, alt text y contexto semántico;
- provenance, derechos, licencias, restricciones y expiración;
- evaluación creativa, brand fit, technical fit y excepciones;
- aprobaciones humanas y `QualityEvidencePack`;
- instrucciones de ensamblaje y dependencias para Wave;
- versión retenida y criterio de reemplazo/rollback.

Un archivo sin contexto, ownership, derechos, destino y evidencia no es un output productivo del paquete.

## Creative Production Contract

Wave deriva desde el Launch Contract:

- objetivo de negocio;
- audiencia, mercado, idioma y canal;
- Brand Contract y sistema visual;
- slots y componentes disponibles;
- requisitos de Search/AEO y Measurement;
- formatos, peso, resolución, duración y variantes;
- restricciones legales, regulatorias y de derechos;
- ventana, prioridad, riesgo y criterios de aceptación.

Globe responde con:

- outputs y candidatos versionados;
- `AssetManifest` y `AssemblyManifest`;
- variantes por viewport, canal, mercado o audiencia;
- provenance y rights status;
- evidencia de evaluación y revisión;
- bloqueos, excepciones y requisitos pendientes;
- referencia durable para recuperación, reutilización o rollback.

El contrato debe ser transport-neutral y compatible con el API Contract Spine de Globe. No se deben crear
integraciones ad hoc desde la UI de Wave ni pasar URLs públicas o credenciales entre plataformas.

## End-to-end flow

```text
LaunchRequest
    ↓
ExperienceSpec + Brand/Search/Measurement Contracts
    ↓
CreativeProductionContract
    ↓
Globe: dirección → producción → variantes → rights/provenance → creative QA
    ↓
CreativeAssetPack + AssetManifest + AssemblyManifest
    ↓
Wave: ensamblaje → CMS/DXP → Search/Measurement/Governance preflight
    ↓
preview → aprobación → release → smoke test → post-launch evidence
```

Los assets pueden venir de Globe, del cliente o de otro proveedor. La procedencia debe quedar declarada y el
flujo no puede suponer que todo material externo tiene los mismos derechos o nivel de confianza.

## Workers y responsabilidades

### Globe workers

- `Creative Director Worker`: traduce el objetivo en dirección creativa y criterios de evaluación.
- `Asset Producer Worker`: genera o transforma imagen, video, audio y otros medios soportados.
- `Variant Worker`: produce adaptaciones por formato, viewport, canal, mercado o idioma.
- `Motion Worker`: produce motion y video conforme a duración, ratio y restricciones.
- `Localization Worker`: adapta el tratamiento sin perder Brand Contract ni intención.
- `Rights & Provenance Worker`: verifica lineage, hashes, derechos y restricciones de uso.
- `Creative QA Worker`: evalúa fit creativo, consistencia, legibilidad y readiness técnico.

### Wave workers

- `Experience Architect Worker` para componentes, slots y ensamblaje.
- `Search Visibility Worker` para SearchContract y preflight.
- `Measurement Worker` para eventos, tagging, consentimiento y verificación.
- `CMS Adapter Worker` para el sistema de registro del cliente.
- `Governance Worker` para risk class, controles, approvals y excepciones.
- `Release Verification Worker` para preview, release, rollback y post-launch.

Los Workers producen propuestas, artefactos y evidencia. No sustituyen la autoridad humana sobre dirección,
claims, derechos sensibles, compliance, marca o publicación.

## Gates compartidos

- **Creative fit:** resuelve objetivo, audiencia y canal.
- **Brand consistency:** respeta Brand DNA, tokens, composición, tono y sistema visual.
- **Technical readiness:** formatos, pesos, dimensiones, rendimiento y variantes.
- **Accessibility:** alt text, contraste, legibilidad y comportamiento inclusivo.
- **Rights & provenance:** uso permitido, lineage, expiración y estado de confianza.
- **Experience fit:** funciona en el componente, slot y layout real.
- **Search/AEO fit:** no contradice significado, contenido, schema ni contexto de la experiencia.
- **Governance:** risk class, aprobación, policy pack y excepciones.
- **Release readiness:** integración, preview, diff, rollback y smoke test.

## Globe como capability de plataforma + personas + operación

La composición debe declarar por separado qué se compra y cómo se entrega:

- **Studio Access / Platform-enabled:** acceso a plataforma, templates, memoria, controles, ledger y soporte.
- **Creative Production:** Globe produce outputs creativos bajo un contrato y criterios de aceptación.
- **Managed Squad:** Efeonce/Globe diseña y dirige el equipo, aporta capacidad y responde por el delivery que
  controla.
- **Staff Augmentation:** Globe aporta perfiles; el cliente dirige cotidianamente el trabajo y asume el outcome
  operativo del perfil, sin heredar automáticamente el SLA de Managed Squad.
- **Full Efeonce:** Efeonce combina Globe, Wave y especialistas para responder por el flujo completo de la
  experiencia.

Managed Squad y Staff Augmentation son modelos de delivery, no nombres alternativos del producto ni del modo
operativo. Cada lane debe declarar dirección, RACI, outcome, SLA, pricing, propiedad y criterios de salida.

## Operating and commercial modes

| Mode | Globe | Wave | Uso |
| --- | --- | --- | --- |
| Client assets | consume assets del cliente | orquesta y lanza | el cliente mantiene producción creativa |
| Globe-assisted | produce una parte del paquete | ensambla y gobierna | addon de producción |
| Globe-managed | dirige producción creativa completa con equipo Globe | opera lanzamiento | managed service |
| Globe staff-augmented | aporta perfiles bajo dirección cotidiana del cliente | coordina sólo su lane | capacidad especializada |
| Full Efeonce | Globe + Wave + especialistas | accountability integral | experiencia end-to-end |

La oferta comercial puede expresarse como `Experience Production Pack by Globe` dentro de Experience LaunchOps,
pero no debe venderse como más créditos o más generaciones. Se vende como capacidad de producción lista para
ensamblaje y lanzamiento, con la modalidad de personas y accountability declarada por separado.

## Metrics

- time from CreativeProductionContract to asset-ready;
- first-pass creative approval rate;
- percentage of assets with complete manifest and rights evidence;
- reuse and variant ratio;
- asset-to-slot mapping coverage;
- creative rework rate;
- assembly defects found by Wave;
- time from asset-ready to launch-ready;
- post-launch defects attributable to creative output;
- cost per Experience Release Package and margin by delivery mode.

La métrica de valor no es cantidad de generaciones. Es cuánto reduce el paquete el tiempo y el retrabajo entre
intención, asset-ready, experience-ready y launch-ready.

## Non-goals

- Convertir Globe en CMS, DAM del cliente o sistema de release.
- Hacer que Wave dependa exclusivamente de Globe.
- Entregar archivos bonitos sin metadata, rights, destino o evidencia.
- Prometer que un asset será indexado, posicionado o citado.
- Permitir publicación autónoma en producción sin los gates del cliente.
- Ocultar la producción creativa, el uso de modelos, costos o provenance.

## Acceptance criteria

- [ ] Un Launch Contract puede derivar un `CreativeProductionContract` reproducible.
- [ ] Globe entrega `CreativeAssetPack`, `AssetManifest` y `AssemblyManifest` versionados.
- [ ] Wave puede ensamblar assets de Globe, cliente u otros proveedores sin cambiar el contrato.
- [ ] Rights/provenance y accessibility metadata acompañan cada output productivo.
- [ ] Un asset rechazado no puede convertirse silenciosamente en output retenido.
- [ ] Una experiencia puede avanzar desde asset-ready a launch-ready con evidencia y gates explícitos.
- [ ] El piloto mide tiempo, retrabajo, calidad, derechos, costo y margen entre ambas plataformas.
- [ ] La frontera de secretos, identidad, tenancy y sistemas de registro se mantiene entre Globe y Wave.

## Related sources

- [`Experience LaunchOps Product Promise`](EFEONCE_EXPERIENCE_LAUNCHOPS_PRODUCT_PROMISE_AND_SEARCH_NATIVE_ARCHITECTURE_V1.md)
- [`Experience LaunchOps Agentic Platform`](EFEONCE_EXPERIENCE_LAUNCHOPS_AGENTIC_PLATFORM_DECISION_V1.md)
- [`Globe Creative Producer Architecture`](creative-studio/EFEONCE_GLOBE_CREATIVE_PRODUCER_ARCHITECTURE_V1.md)
- [`Globe Asset Governance Worker`](creative-studio/EFEONCE_GLOBE_ASSET_GOVERNANCE_WORKER_DECISION_V1.md)
- [`EPIC-028 — Globe`](../epics/in-progress/EPIC-028-efeonce-globe-agentic-creative-studio.md)
- [`EPIC-036 — Experience LaunchOps`](../epics/to-do/EPIC-036-efeonce-experience-launchops.md)
