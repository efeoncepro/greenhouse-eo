# Proveedor Higgsfield en Creative Studio

## Para qué sirve

Higgsfield puede aportar generación de imagen, video, audio y 3D, workflows de edición y análisis de video, además
de skills para agentes y tooling local para After Effects/Blender.

La capacidad se incorpora a Efeonce Globe como proveedor gobernado. No es una pantalla de usuario ni un permiso para
generar o publicar sin revisión.

## Qué queremos usar

- generación multimodal y referencias;
- product photoshoot, brandkit y marketplace cards;
- reframe, dubbing, draw-to-video y explainers;
- Virality Predictor como señal de revisión, nunca como promesa de rendimiento;
- SDK TypeScript/Python para integración server-side;
- skills como patrones de composición agentic;
- MCP local para After Effects/Blender cuando el carril local sea aprobado.

## Qué significa “disponible”

Hay cuatro estados distintos:

1. **Documentado:** conocemos la superficie del proveedor.
2. **Provider-supported:** el proveedor declara o expone el endpoint.
3. **Integrado:** Globe tiene adapter, contrato, secreto y tests.
4. **Promovido:** reader live, canary, derechos, costes, governance y readback permiten usar la ruta.

La revisión actual deja Higgsfield en los estados 1 y parcialmente 2. No afirma 3 ni 4.

## Responsabilidades

Creative define brief, referencias, dirección, selección y revisión humana. Globe conserva identidad de ruta,
autorización, créditos, idempotencia, completion, asset governance, provenance y retrieval. Legal/Privacy valida
derechos y tratamiento de datos. Finance valida coste y margen. Higgsfield conserva la responsabilidad de su servicio,
modelos y términos externos.

## Resultado esperado

Una salida Higgsfield sólo puede entrar a la biblioteca de Globe si existe un output exacto, digest, MIME, estado de
governance, provenance y autorización de entrega. La API, el SDK o el CLI por sí solos no constituyen evidencia de
publicación ni de propiedad del activo.

## Enlaces

- [Decisión técnica](../../architecture/creative-studio/EFEONCE_HIGGSFIELD_PROVIDER_ADOPTION_DECISION_V1.md)
- [Auditoría](../../audits/creative-studio/2026-09-17-higgsfield-github-review.md)
- [Runbook](../../operations/creative-studio/HIGGSFIELD_PROVIDER_RUNBOOK_V1.md)
- [Manual](../../manual-de-uso/creative-studio/higgsfield-provider.md)
