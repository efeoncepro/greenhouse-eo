# TASK-1844 — Consentimiento de autoridad interna multiorganización

Fecha: 2026-09-08. UI-lite, approved plan. Implementación: reuse del renderer Efeonce ID.
El operador interno decide si permite a una aplicación leer las organizaciones a las que tiene acceso.
Contrato: [plan](../../tasks/plans/TASK-1844-plan.md), delta ADR Accepted; sólo scope de lectura base.

- Visual direction mode: `repo-native-benchmark`
- Product Design asset: `docs/ui/visual-directions/TASK-1835-efeonce-id-direction.md`

## Dirección y alternativas

Se conserva «Acceso enfocado con contexto explícito» de TASK-1835 y el renderer HTML vigente.
Alternativa descartada: selector fijo A/B; sugeriría que el consentimiento congela las organizaciones.
Alternativa descartada: lista sin explicación; ocultaría el alcance dinámico.
Seleccionada: explicación directa + lista actual + permisos + acciones actuales.
CompositionShell pertenece al portal React; este renderer del emisor reutiliza su layout HTML canónico.
Sin nueva primitive, dependencia, token ni motion. Tokens: id-text, id-muted, id-border; listas id-organizations,
id-permissions, formulario id-form y botones existentes. Cambios de copy en GH_AUTH_SERVER únicamente.

## Copy Ledger

1. H1 «Autorizar acceso», aplicación y destino: existentes.
2. GH_AUTH_SERVER.consent_multi_org_intro: «Esta aplicación podrá leer las organizaciones a las que tengas acceso en Efeonce. Si tus permisos cambian, su acceso también cambiará.»
3. GH_AUTH_SERVER.consent_multi_org_organizations_label: «Organizaciones autorizadas ahora».
4. Lista de nombres y capacidades autorizadas; nunca candidatos denegados.
5. GH_AUTH_SERVER.consent_multi_org_more: «Mostramos las primeras 50 organizaciones autorizadas. La aplicación puede consultar la lista completa de forma paginada.» Sólo cuando nextAfterOrganizationId existe.
6. GH_AUTH_SERVER.consent_multi_org_boundary: «Este permiso incluye las organizaciones que se te autoricen después para esta misma clase de lectura. Los permisos de otra clase requieren una nueva autorización.»
7. Permisos, «Cancelar» y «Autorizar acceso», revocación: existentes.

## Flow, estados y verificación

GET resuelve contexto v2 y lista actual. POST compara contexto/version mostrados con los actuales.
Cambio de contexto o formulario legacy: invalid_request; reiniciar conexión desde la aplicación.
Cero organizaciones o reader no disponible: error existente; no renderizar un consentimiento vacío.
V1 y externo: copy y flujo existentes. Lista parcial: texto explícito. A/B: ambos nombres autorizados.
Marcadores: id-multi-org-authority, id-organizations, id-scopes, id-form, id-actions.
Tab: disclosures y botones; campos de contexto ocultos no participan del foco. Sin contenido esencial en hover.
Validación prevista: renderer behavioral tests + GVC/local desktop y 390 px, teclado, reduced motion y overflow.
Runtime productivo pendiente del rollout y clientes reales; este wireframe no constituye esa evidencia.

## Desktop Target

Viewport 1440×1000. Conservar el shell y columna de consentimiento existentes: marca, título, aplicación,
explicación de alcance, organizaciones vigentes, permisos y acciones. El texto de autoridad dinámica aparece
antes de la decisión; la lista no introduce cards nuevas ni un selector. Referencia visual verificada:
`docs/ui/reviews/TASK-1844/desktop.png`. No hay nuevo panel contextual, sidebar ni nueva navegación.

## Mobile Target

Viewport 390×844. La misma jerarquía fluye verticalmente y permite scroll de página para alcanzar las acciones.
Los nombres se ajustan al ancho disponible; botones y foco quedan dentro de la columna. No hay carrusel ni
tabla comprimida. Referencia: `docs/ui/reviews/TASK-1844/mobile.png`; GVC no detectó overflow horizontal.

## Action Hierarchy

Primaria: «Autorizar acceso», sólo con contexto y autoridad vigentes. Secundaria: «Cancelar», que rechaza la
solicitud según OAuth. La explicación y los nombres son lectura, no controles. Los campos ocultos de contexto
son expectativas de integridad y no modifican el actor ni conceden acceso desde el navegador.

## Visual Fidelity Mapping

Se reutilizan `renderConsentPage`, el shell Efeonce ID, clases `id-organizations`, `id-permissions`, `id-form`
y botones canónicos. `id-text`, `id-muted` e `id-border` conservan los tokens del renderer. El copy nuevo vive
en GH_AUTH_SERVER; no hay CSS, colores, radios, sombras ni tipografía nuevos. Flow y motion pertenecen a
TASK-1835. La fidelidad se verifica contra el renderer existente y las capturas de este delta.

## State Copy

| Estado | Texto visible y comportamiento | Recuperación |
| --- | --- | --- |
| ready | «Autorizar acceso» y «Organizaciones autorizadas ahora»; muestra nombres sólo después de resolver autoridad | Autorizar o cancelar |
| loading | Navegación HTTP del renderer server-side; no hay estado loading ni texto nuevo dentro de una pantalla incompleta | Esperar respuesta o reiniciar desde la aplicación si falla la navegación |
| empty | No se renderiza consentimiento v2 con cero targets; usa el error existente «No pudimos completar la autorización» | Volver a iniciar desde la aplicación después de revisar permisos |
| partial | «Mostramos las primeras 50 organizaciones autorizadas. La aplicación puede consultar la lista completa de forma paginada.» | Discovery paginado después del consentimiento; no presenta 50 como total |
| error | «No pudimos completar la autorización»; error genérico existente sin nombres ni detalles del reader | «Vuelve a intentarlo desde la aplicación.» |
| denied | La autoridad inválida no ofrece consentimiento; «Tu cuenta no tiene una organización vinculada que permita este acceso.» según error OAuth existente | Revisar acceso con el responsable y reiniciar desde la aplicación; Cancelar vuelve al cliente con deny |

## Accessibility Contract

Mantener headings, labels y botones semánticos del renderer. La clase de autoridad se explica con texto y no
depende del color, hover o motion. Tab alcanza las acciones con foco visible; campos hidden fuera del orden.
GVC verifica desktop y móvil, overflow y reduced motion. La lista parcial tiene disclosure visible; los nombres
largos pueden envolver líneas sin ocultar el propósito ni desplazar controles fuera del viewport.

## Implementation Mapping

`src/lib/auth-server/internal/consent-context.ts` produce la proyección autorizada; `oauth/pages/render.ts`
presenta el DTO y `src/lib/copy/auth-server.ts` gobierna textos. `oauth/consent-endpoint.ts` compara la versión
y el ID contra el servidor antes de aceptar POST. El harness `scripts/auth-server/dev-ui-server.ts` y scenario
`scripts/frontend/scenarios/task1844-multi-org-consent.scenario.ts` ejercitan el renderer real con datos ficticios.

## GVC Scenario Plan

Quality profile: `premium`. Desktop 1440×1000 y mobile 390px (390×844), teclado y reduced motion. Captura local
`2026-09-08T18-22-08_task1844-multi-org-consent`: 4 frames, 0 findings; review dossier generado con
`fe:capture:review` y revisión durable en `docs/ui/reviews/TASK-1844/review.md`. Baseline decision: reutilizar
TASK-1835; no existe baseline automatizado para este scenario nuevo. Scroll-width evidence: GVC overflow
check sin hallazgos, `scrollWidth === clientWidth` en las superficies capturadas. V1/deny y validación GET/POST
se verifican en tests; estas capturas v2 no se presentan como certificación visual de todos los estados previos.

## Design Decision Log

2026-09-08: se eligió `reuse` del renderer y shell para mantener la ceremonia conocida. Se descartó selector
de organizaciones porque confundiría target por llamada con identidad/contexto del token; también se descartó
la lista sin disclosure dinámico porque podría interpretarse como alcance fijo. Se implementaron cuatro textos,
proyección v2 y expectativas GET/POST. Revisión GVC y visual completadas, sin nueva primitive ni cambios de CSS.
