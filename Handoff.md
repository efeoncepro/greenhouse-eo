# Handoff activo

**Performance & Commerce Distribution (2026-09-10, documental; `Proposed`, no autoriza venta):** ADR
`EFEONCE_PERFORMANCE_COMMERCE_DISTRIBUTION_DECISION_V1.md` + ficha + Pricing Integrity Pack `hypothesis_only` + market
update 2026-09-10 + PDR-022 (spoke `/servicios/performance-marketing`). La capability tiene dos motions (Demand & Commerce ·
B2B Pipeline), los canales son cobertura y programmatic va vía partner con cláusula de transparencia. Niveles al piso de 45%:
USD 2.400 / 5.900 / 11.800 al mes. El costo del Performance Lead (USD 5.500) es hipótesis: el catálogo no tiene el rol.
Registry: diez relaciones nuevas `No iniciado`. Pendientes con dueño: retiro de `EFG-003` (asignado a Wave, bajo el
piso), costo del lead, overhead y piso (Finance) · posición sobre datos first-party bajo la Ley 21.719, vigente el
2026-12-01 (Legal) · verificar Google Partners y cerrar términos con Real Audiences, partner programático seleccionado por el CEO
(fees, cláusula de transparencia, brand safety, CTV, ABM y certificación de trader; Commercial) · G1: dos
Diagnostics pagados en 90 días, uno por motion · TASK ui-ux de la landing, sin crear. Sin runtime ni push.
Canales emergentes: ChatGPT Ads `selectivo` donde existe (LATAM: sólo BR/MX; Chile no), X Ads bajo pedido, Perplexity
`no disponible`. **Landing: `TASK-1865`** (to-do, ui-ux/flow, UI ready no; reservada como 1864 y renumerada porque la
tomó en paralelo la task del MCP autosuficiente) con wireframe, flow, motion, dirección "La señal" y brief SEO/AEO. La
legacy `/servicio-gestion-campanas-publicitarias/` (`242862`) muestra contadores en cero y un claim de Google/Meta
Partners no verificado en producción; el owner decidió no parcharla: la página se construye desde cero y la legacy sale
con 301. Investigación Semrush por país completada (`docs/audits/public-site/PERFORMANCE_LANDING_KEYWORD_RESEARCH_BY_COUNTRY_2026-09-11.md`):
Chile busca "performance marketing", PE/MX/CO "publicidad digital", CO además "pauta", US en inglés (página aparte,
follow-up). Title y copy ledger ajustados; FAQ a catorce.

**Product Design 360 (2026-09-10, modelado y canonizado; oferta `Proposed`, no autoriza venta):** business model
V1.1 + ficha `docs/services/wave/product-design-360.md` + ADR `EFEONCE_PRODUCT_DESIGN_360_DECISION_V1.md`: capability de
oficio con dos ofertas por comprador (producto → Product Design 360 · sitio público → Web Experience 360), siete lanes
con accesibilidad primero; se venden lanes, nunca horas ni pantallas. `creative-practice` corregido: Superside mínimo
USD 15.000/mes (decía ~5.000, error 3×). Landing `TASK-1859` creada (to-do, UI ready no; no se indexa hasta
`Commercially approved`). **Colisión de ID resuelta:** la landing de Trade Marketing & BTL, que usó `TASK-1859` en
paralelo, se registró como `TASK-1860` (`a2081e4f1`); `TASK-1859` es la landing de Product Design 360 y no
cambió. Pendientes con dueño: G1 demanda (Commercial) · D7 loaded cost chileno de un
senior product designer y piso de margen por lane (Finance) · IP del design system, datos de research y marco chileno
de accesibilidad (Legal) · nombre público D1 (Strategy) · Calculadora de Capacidad (wedge, sin task). **BP9** (Head of Design in-house) agregada a `13_icp` como persona
candidata: su plan de validación —≥ 5 conversaciones con Heads of Design— valida también el copy de la landing.

**TASK-1858 — conciliación bancaria ago–sep 2026 (2026-09-10, in-progress; Slices 1/2/3/5 hechos):** release
`2cf8c26cfa2d-8f79606f-8cb3-4154-a7fd-c570e7af8497` `released` 20:06Z (PR #233, run `34523159501`, un intento,
bypass forense por la migración de TASK-1604 ya aplicada; watchdog 5/5, `ops-worker`/`auth-server` change-gated
en `f8803acc3` con árbol equivalente). Producción y el worker sirven `ISSUE-169`; saldos = banco (Santander CLP
33.002.610 · USD 336,44 · Global66 16.468 · MXN 10 · Banco de Chile 3.660.000 · TC 1.532.944; CCA −125.194).
`fx_drift` cubre USD/MXN (0 drift contra PG real). Manual v1.2 con rutina mensual + decisión Nubox (facturas
`EXP-NB-*` siguen por plan `pay_expense`). OTB del CCA al 01/08 = 2.141.867 `estimated`
(`obtb-sha-cca-julio-reyes-clp-20260801-275f0308`): pasa a `reconciled` cuando el accionista confirme.
**Slice 4 (Payroll):** Humberly cobra **450.000 líquidos**; v2 (desde 01/07) quedó cargada como bruto por error
(boletas: julio 300.000, agosto 450.000; pagado 450.000 ambos). La reliquidación canónica se detuvo en la guarda sin
escribir (v2 con entries exportados no se edita; el recálculo por entry conserva la versión del entry; el del
período completo tocaría a Felipe Zurita y María Fernanda González en julio). El operador pidió **no forzar**: los
complementos `EXP-RECON-20260803-57fj` (195.750) y `EXP-RECON-20260903-bcfh` (68.625) quedan asumidos
internamente como costo laboral. Desde 01/09 rige `humberly-henriquez_v3` (bruto 530.973,45 = 450.000 líquidos; v2 cerrada al
31/08): **Humberly debe emitir boletas por 530.973 desde septiembre**. Pendiente con el operador: sueldo
empresarial de Julio (2×1.000.000 del 07/09 como expenses `payroll` sin entry), estado de cuenta TC de mayo para
Melkin (`EXP-202604-005`), y el PDF `36_16359_420051383906_2026-06-30.pdf` para el crédito antiguo.
Contable a revisar: pagar el bruto sobre boletas con retención deja la retención sin documento propio.

**TASK-1604 (2026-09-10, in-progress):** slice SEO/Arte aplicado y documentado. Seis competencias activas,
nueve preguntas SEO en `sme_review`, cero templates del pack, cero policies y cero assessments. Las vacantes
`EO-OPN-0674` y `EO-OPN-0675` fueron publicadas por un acto separado y sus rutas responden 200; publicación no
equivale a pack activo. El CLI ahora exige las preguntas exactas del pack y coincidencia exacta antes de
reutilizar un template. Pendiente: SME individual, template SEO, binding scorecard Arte y Quality Gate.

**TASK-1832 (readback 2026-09-10T12:17Z): operativamente bloqueada para retiro.** Frontera canary sana
(`1/1`, purpose drift `0/0`, dos profiles run-owned fuera de Person 360), pero
`auth.oauth.refresh_reuse_detected=93/24h` sobre el CIMD compartido de Codex. Cleanup dry-run, sin apply:
`unexpectedRefs=0`, `deletionReady=false` y blockers
`registration_active|active_authority|active_auth|oauth_client_not_run_owned`. El CIMD tiene 8 artefactos de
sujetos canary y 35 de otros sujetos; el helper vigente borra por `client_id`. No retirar el blocker ni ejecutar
`--apply`: implementar planner/delete/readback sujeto-específicos, preservar cliente/hijos ajenos, diagnosticar
las familias de refresh y recién después reiniciar steady/retirar desde `delete_after`.

**Sistema de contenidos Notion (2026-09-10, mapeado / sin mutaciones):**
[mapa canónico](docs/operations/EFEONCE_CONTENT_SYSTEM_NOTION_MAP_V1.md) de Pilares JTBD + Content Hub +
Calendario + Wiki, con IDs y schema. Corrige `PDR-020` a rev 1.5: los Pilares JTBD son el eje temático
canónico y las franquicias son ortogonales; `LinkedIn Julio` es canal aparte. Tres fracturas medidas: dos bases de Calendario con schema idéntico (100 filas de histórico vs 66 a
futuro) que parten la evidencia de velocidad; **0 de 66 filas del calendario vigente declaran Pilar
JTBD**; y el Content Hub no tiene propiedad de destino Think/WordPress (`Enlace` en 5 de 41). Pendiente
del operador: autorizar los cambios propuestos, en orden — etiquetar Wiki, poblar Pilar JTBD, agregar
Destino, luego schema del calendario, y por último decidir el corte de calendarios (el único que puede
romper histórico). Nada escrito en Notion.

**Canales propios Efeonce (2026-09-10, decisión cerrada / ejecución no autorizada):** seasonalities conservadas
como línea propia de marca (rev 1.4): son temporadas con ventana por mercado, NO efemérides; hogar Instagram,
sends+saves, LinkedIn recibe argumento y no caption. Plan 2026–2027 sin cambios de alcance.
[PDR-020](docs/public-site/decisions/PDR-020-canales-propios-sistema-editorial.md) rev 1.2 — rol y catálogo por
canal, franquicias con canal-hogar, vocero Julio Reyes. Propagado a `TASK-1802`, `PDR-003/004/005/019`, roadmap,
context pack y diez archivos de skills espejados. Pendiente: 7 decisiones, entre ellas canonical de video (bloquea
TASK-1802 y YouTube) y el plan estacional 2026–2027. Nada producido ni publicado.

**Social Efeonce, 09/09:** [13 piezas y skills](docs/audits/social/EFEONCE_SEASONAL_CONTENT_PLAN_2026_2027.md).
Pendiente: conciliar MET-2339–2342 tarea/calendario. Producción abierta; cierre documental sin cambios Notion.

**EPIC-046 / TASK-1852 (09/09):** Production `released`; [evidencia y pendientes](docs/audits/client-portal/TASK-1852_ROLLOUT_2026-09-09.md).
PR #231/main `5726ce9d90`, orquestador `34416904936`; gates y watchdog verdes; excepción pause auditada.
**10/09 RELEASE `f69b9d32` (PR #232, run `34431792218`, manifest released 03:16Z, watchdog 5/5, canary 5/5):** términos con
`bundledModules`, autoridad `delegated_oauth`, invitación diferida, chats Teams `ready`, preferencias `client_service_default_v1`;
flag writes ON horneada. **07:40Z apply Sky HECHO por MCP delegado con token del operador** (`EO-APC-ECD63852`, sólo preserve,
replay OK) = canary humano del canal cerrado. Berel sin entregar invitaciones (bloqueo del operador hasta UI);
`/creative-hub` → `TASK-1857` (es el módulo de Sky; 1687 no supersede).

**EPIC-045 ↔ EPIC-046:** Hitos I/N obligatorios: Insights cliente/interno + email/in-app/Teamsbot con
deep links; shared separado y móvil posterior. Contrato en arquitectura Insights §§7.1/9.1 y ADRs.
P01/P09 incluyen destinatarios/canales; TASK-1848/1849 distribución/experiencia; TASK-690/693 Hub y
preferencias. UI TASK-1854/1856: ocho docs detallados (dirección/wireframe/flow/motion), requisitos en 1853/1855; UI ready no, GVC pendiente.
Primer email/in-app acompaña apertura cliente; Teamsbot por destino verificado. Reusar dueñas, sin otro Hub.

**GPT Image 2.5 + contrato de proveedores de imagen (2026-09-08):** doc y skills al día; sólo documentación,
cero código y cero llamadas al proveedor. El trabajo quedó en
[`TASK-1851`](docs/tasks/to-do/TASK-1851-openai-image-provider-contract-consolidation.md), que supersede a
`TASK-1850` (cerrada sin ejecutar) y suma el segundo defecto de la misma forma: `DEFAULT_IMAGE_PROVIDER`
apunta a `imagen-4.0-generate-001`, declarado bloqueado. Bloqueador que decide el diseño: 2.5 no tiene
calculadora de costo por imagen, así que la reserva previa de créditos de Globe no tiene fuente. `gpt-image-2`
NO está deprecado. Detalle:
[matriz](docs/architecture/creative-studio/OPENAI_GPT_IMAGE_PROVIDER_CAPABILITY_MATRIX_V1.md).

**TASK-1844 COMPLETE (2026-09-08):** producción ON para una identidad; SQL aplicada y fixtures retiradas.
Codex y Claude Code/hospedado/Desktop certificados, rollback probado (Claude Code exige login tras OFF).
PR 230/main `45f6910e3`, checks/orquestador `34281143424` success, manifest released y watchdog 5/5.
Conexiones definitivas conservadas; sólo se sustituyó Claude hospedado del canary bajo autorización.
Docs/skills reconciliados con tres subagentes; [manual de uso](docs/manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md) y [cobertura](docs/audits/mcp/TASK-1844_DOCUMENTATION_SKILLS_CLOSURE_2026-09-08.md).
Push documental disparó auth deploy por su README: run `34284610774` cancelado, sin nuevo build/revisión; tráfico conserva `00048-4vq`. Efecto y prevención documentados en runbook/skills.
[QA](docs/audits/mcp/TASK-1844_INTERNAL_MULTI_ORG_QA_2026-09-08.md) · [runbook](docs/operations/TASK-1844_INTERNAL_MULTI_ORG_ROLLOUT.md).

**Berel (2026-09-08):** [cadencia mensual](docs/operations/BEREL_CLIENT_COLLABORATION_OPERATING_MODEL_V1.md)
aprobada internamente y skill espejo alineada. Activar sólo tras aceptación de Anel, Fer y Marce; no se envió
correo ni cambió Notion/calendario.

**TASK-1813 — COMPLETE:** cierre histórico en `1.2.0`/`00047-8b5`, discovery base-only y lecturas sin gasto en la
matriz de clientes; sin widening ni cambios Entra. Multi-org queda en TASK-1844/U19.
[Task](docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md) ·
[auditoría](docs/audits/mcp/TASK-1813_OAUTH_HARDENING_QA_2026-09-07.md).

**Historia TASK-1832 2026-09-06/07:** releases, clientes, correo, passkeys, observaciones y la excepción de
migración están preservados en la [task](docs/tasks/in-progress/TASK-1832-efeonce-mcp-client-canaries-and-first-customer-cohort.md)
y el [manifiesto](docs/audits/mcp/TASK-1832_CANARY_ASSET_MANIFEST_task-1832-canary-20260906-a.md); no repetir
sus snapshots aquí.

**TASK-1835 (EPIC-044 U06) — `COMPLETE` y EN PRODUCCIÓN 2026-09-06 (Claude greenhouse-eo-06, 2026-09-06;
commits `85c67e97d` · `4eb358d5b` · `b15b1690e`).** Efeonce ID queda enterprise-ready en local. Tres hallazgos que
importan más que el trabajo planificado:

1. **El login por passkey no existía.** Backend (`/auth/passkeys/authenticate/*`) y copy estaban desde el
   2026-09-04, pero `/login` no ofrecía el método: los cuatro ids `login_passkey_*` llevaban dos días huérfanos.
   Hallazgo del operador. Implementado con el patrón del step-up; `renderLoginPageResponse` exige el nonce en su
   TIPO, así que el compilador —no la disciplina— impide servir la página sin script.
2. 🔴 **`violations: 0` de axe era una medición vacía.** En las 40 capturas del emisor axe devolvía las 24 filas de
   texto de cada página en `incomplete` («background could not be determined due to a pseudo element»): el lienzo
   pinta su azul con degradado y `::after`. Nunca midió una. Debajo del cero, la ficha de aplicación y el aviso
   «no verificada» del consentimiento estaban a **1.53:1**. Causa raíz: `.id-context`/`.id-muted` compartidas entre
   la ficha (sobre el azul) y el bloque del destino (dentro de la tarjeta) — un color cruzando fondos opuestos.
   Mecanismo nuevo `pnpm auth-server:verify-contrast` (muestrea píxeles): **272 textos, 0 bajo el piso WCAG**.
   _Aplica más allá de esta task: cualquier superficie con fondo compuesto tiene el mismo punto ciego._
3. 🔴 **Ninguna PERSONA puede crear una passkey.** `/auth/passkeys/register/*` existe y no tiene superficie; el
   step-up sólo enrola TOTP. **Corrección del operador:** dije que eso bloqueaba la certificación de U07 y es
   falso — `scripts/auth-server/external-passkey-canary.ts` (TASK-1832, Codex) ya ejecuta registro y login con una
   passkey de plataforma real en Chrome persistente, en el origen real, sin CDP ni autenticador de software. Falta
   la PANTALLA, no la capacidad: quien recibe una invitación depende del correo en cada entrada. Registrado como
   **`TASK-1842`** (`/account/credentials`, ui-ux, con el nodo S11 del flujo maestro y un gate de cobertura
   endpoint→consumidor). Pesa sobre el primer piloto cliente (U16), no sobre el canary.

Evidencia: GVC premium **29 fixtures** × desktop 1440 y móvil 390 = 58 capturas 29/29; scorecard 4.63 / piso 4.5;
los cuatro gates `ui:*` PASS; suite del emisor 427; typecheck y lint limpios. Patrón «runtime sin React» en
`PATTERNS.md`. **Desplegado y verificado en vivo** (deploy `auth-server` 21:49 `success`): botón de passkey, pie de
licencias y arreglo de contraste sirviendo en `auth.efeonce.org`.

**Para quien siga:** el aviso de códigos de respaldo quedó con tres tests en la suite —vistos ponerse ROJOS al
quitar el comportamiento, no sólo verdes—, porque un script suelto que hay que acordarse de correr es un mecanismo
apagado. Y ojo con `auth-server-deploy.yml`: dispara con `src/lib/**` sobre el Cloud Run ÚNICO que sirve
`auth.efeonce.org` en vivo — el push ES el despliegue, incluso si el push lo hace otra sesión sobre la rama
compartida (pasó hoy: Codex empujó y se llevó estos commits).

**TASK-1832 / TASK-1841 — certificación sintética separada del piloto cliente (Codex, 2026-09-06):** U07 ya no
usa una organización cliente real para probar la tecnología. TASK-1832 certifica el camino productivo completo
con cuentas M365/Google controladas por Efeonce, personas `data_origin='smoke_test'`, organización canary no cliente,
binding de propósito explícito, Claude/Codex/ChatGPT y Chrome/Safari; un verde acredita preparación técnica, no
adopción ni usabilidad cliente. TASK-1841 (U16) reserva el primer uso real para una organización ya existente en
Account 360, un administrador consentido y una capability read-only vigente, sólo después de TASK-1832/1833/1835,
con acompañamiento y observación por siete días. El cliente nunca actúa como tester ni comparte tokens o logs.
Este cambio es sólo de tasks/registry/README/epic/handoff/changelog: no crea cuentas, bindings, migraciones, flags,
invitaciones, implementación, push ni rollout. Siguiente ID libre: TASK-1842.

**TASK-1840 — logout multiproducto registrado, sin implementación (Codex, 2026-09-06):** unidad backend-critical
separada de TASK-1834 para tres operaciones distintas: salir sólo del producto, cerrar la sesión Efeonce ID del
navegador actual y cerrar todas las sesiones. El contrato exige `sid` opaco, RP-Initiated/Back-Channel Logout,
ledger/tombstone server-side por RP, fan-out durable, revalidación, auditoría, señales, conformance multi-RP y
rollback. No revoca consentimientos, roles, entitlements, memberships, `gv`, factores ni upstream Microsoft/Google.
TASK-1834 y Globe quedan como consumers separados. Sólo task/registry/README/epic/handoff; sin código, migración,
flag, push, deploy ni modificación de TASK-1834. Siguiente paso: Slice 0/Delta ADR con checkpoint humano.

**TASK-1834 — dirección v2 de login único Greenhouse/Efeonce ID aprobada, sin implementación (Codex,
2026-09-07):** después de revisar la UI real, se rechazaron dos modelos: `Continuar con Efeonce ID` como quinto
provider mezclaba producto, autoridad y método; un CTA genérico `Continuar` todavía creaba un login antes del login.
La decisión vigente mantiene Greenhouse como URL/contexto de entrada y autoridad de producto, pero `/login` de una
cohorte habilitada crea la transacción y redirige server-side sin pantalla ni flash intermedio. Efeonce ID muestra el
único login visible, `Entra a Greenhouse`, desde un RP/transacción registrados y ofrece Microsoft/passkey/correo. Si
la sesión del issuer satisface assurance, vuelve sin mostrar login; el first-party sign-in tampoco muestra
consentimiento delegado. Login MCP/terceros conserva consentimiento. El login directo mantiene `Entra a Efeonce`.

La decisión transversal ya no vive en TASK-1834: EPIC-044 y el ADR Accepted
`EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md` son dueños de entry, RP confiable, fast path,
aislamiento y frontera de consentimiento. TASK-1834 queda como primer consumer Greenhouse. EPIC-044 y
TASK-1829/1830/1831/1833/1834/1840/1841/1842 quedaron sincronizadas; las skills `efeonce-mcp-platform` y
`greenhouse-ai-design-studio` cargan el ADR. El ADR nativo previo conserva su historia y suma sólo un delta.

El resolver trata `0 | 1 | many`: deny, contexto único o selector Greenhouse server-authorized; nunca email,
query param, `LIMIT 1` ni suma de permisos. La foundation OIDC/resolver puede construirse en oscuro antes de
TASK-1833. Activar externos exige assurance TASK-1833, evidencia sintética TASK-1832 y piloto consentido TASK-1841;
el cutover amplio además espera invitaciones TASK-1839, logout TASK-1840 y credenciales/passkey TASK-1842. Cohortes
no habilitadas ven sólo el login vigente; recovery usa una ruta/estado sin auto-redirect para evitar loops. `UI
ready: no` hasta first fold contextual, checkpoint humano, GVC no-flash y scorecard. No hubo código, migración,
flag, commit, push ni deploy. Siguiente paso si se ejecuta: confirmar `/goal`, correr
`pnpm codex:task-hook TASK-1834` y planificar Slice 0; Slices 1–3 detrás de flags OFF antes de cualquier first fold
visible.

**TASK-1837 (EPIC-044 U12) — `EN PRODUCCIÓN 2026-09-06, COMPLETE`.** Release `b3e324cb5c8d-3cfce865-236f-4e4e-b128-8e144de193cf` (run `34029501838`, PR #227, target `b3e324cb5c8d`), manifest `released` 11:23:09Z en un solo intento. Break-glass con hechos (la migración `20260906004450748` ya estaba aplicada en la instancia única, `run_on 04:27:58Z`); el smoke de `main` se PRODUJO en vez de bypassearse. Cinco servicios Cloud Run OK: `ops-worker` y `auth-server` quedaron en `2b385284d594` con **hash de árbol IDÉNTICO** al target (`d3a1432a1f71`) — no-op legítimo probado por identidad de árbol, no por el change-gate; watchdog `drift_count=0`. Ambos flags `EXTERNAL_INVITATION_*` ON en Production (valor live leído con `vercel env pull`) + redeploy obligatorio `greenhouse-j7aix61yk`. **Canary de contrato contra producción**: la misma llamada a la lane delegada pasó de `404` anti-oráculo a `422 field=bindingId`, y con `organizationId` a `403 forbidden` — la lane ejecuta la resolución de autoridad, no sólo existe. Federación mergeada en `efeonce-mcp` (PR #3 → `65ae1d5`, revisión `00038-8jj`); ese repo **NO** despliega en push a `main`, va por dispatch de `deploy.yml`.

**Pendiente real (no bloqueante):** (1) la **primera persona CLIENTE real** es decisión comercial tuya — hasta que exista, el flujo delegado de punta a punta y las dos tools del gateway sólo están probados en staging y por los negativos del canary; (2) la señal `identity.external_invitation.token_revealed` marca 3 por las revelaciones de prueba y **se apaga sola** al vencer su ventana de 24 h; (3) **punto ciego abierto en el gate de versión del gateway**: `test/version.test.ts` sólo compara el hash de las tools FEDERADAS desde Greenhouse, así que las tools propias del gateway crecieron la superficie de 37 a 39 con el test verde y `version` congelada — se subió a `1.1.0` a mano, pero la próxima volverá a pasar sin bump.

**Barrido documental del 2026-09-06 (posterior al release).** Tres agentes disjuntos actualizaron identidad, MCP/gateway y control plane de release: los dos docs funcionales y el manual de identidad pasan a estado de producción, el runbook del MCP documenta por primera vez que **el gateway se despliega por dispatch manual, nunca por push a `main`**, que su servicio Cloud Run vive en `southamerica-west1`, y la diferencia entre `GREENHOUSE_ECOSYSTEM_API_URL` (producción, la que usan los providers) y `GREENHOUSE_API_URL` (dev-greenhouse, fondeo Globe). El playbook de release suma el caso positivo del día y dos anti-patterns: pedir la autorización de mutaciones externas al EMPEZAR (costó 64 min con la evidencia ya verde) y no leer como drift un SHA distinto cuando los ÁRBOLES son idénticos.

**Dos defectos encontrados por la verificación cruzada, ambos cerrados el mismo día.** (1) El gate de versión del gateway medía sólo las tools federadas: `efeonce-mcp` PR #4 (`5c28a7a`) lo cambia a medir el servidor construido; visto encenderse en los dos casos. (2) Al agregar `efeonce.mcp.identity.write` se cubrió el documento del RECURSO pero no el bloque del emisor NATIVO, así que el scope salía sólo cualificado y un cliente que armara su authorize desde discovery nunca lo habría pedido: `efeonce-mcp` PR #5, abierto, con test de regresión visto fallar sin el arreglo. ⚠️ Ese fix **no** agrega el scope a Entra, que el ADR del gateway prohíbe explícitamente.

**TASK-1836 / TASK-1831 — evidencia consolidada, 2026-09-06:**
Tres subagentes actualizaron contratos, funcionales, manuales, tasks/epic y skills espejo.
[Mapa de construcción, pruebas y pendientes](docs/audits/2026-09-06-task-1836-1831-consolidated-evidence.md).
PR225 está certificado: main `08acfb2c6`, run `34000876213`, manifest released sin override.
Canary MCP real: emisión, lectura propia, aislamiento y revocación en 6.633 s; refresh y rollback
medidos. Piloto gv5, vencimiento original 2026-09-12T15:00Z, señales unaudited/mixed cero.
El fix directo quedó promovido por PR226 a main `456d9accf`: release `456d9accffb6-3b09047e-c37f-4ac7-acbc-0e463e1610fd`,
run `34005056894` success, auth `00032-h45` Ready100% y cinco servicios con el SHA exacto.
Flags OAuth/personas/interno ON; Microsoft visible y clic correcto en `/login` público a1440/390.
Gateway `00036-5wc` sigue Ready100%, nativo/interno ON. Próximos pasos: reconciliar alcance del PR
antes de promover (Claude añadió TASK1837 después del corte21aa), probar retorno humano `/auth/session`
y logout; completar matrices externas/multicontexto y WebKit con los owners. No extender el piloto.
El primer run `34004535327` quedó aborted por un deploy concurrente de develop; el retry se hizo sin bypass
tras drenar esa carrera. No existe todavía un nuevo canary humano directo completo.

> Historial rotado: [Handoff.archive.md](Handoff.archive.md)

**MCP gateway — cartel del servidor, 2026-09-05 — DESPLEGADO:** `efeonce-mcp` `815df9b` en producción,
revisión `efeonce-mcp-gateway-00036-5wc`. El gateway declara `title`/`websiteUrl`/`icons` y sirve UN ícono
(isotipo blanco sobre placa navy opaca, sin `theme`, sin radio horneado). Front door verificado en vivo:
`/icon-512.png` 200 `image/png` con bytes idénticos al asset del repo y sin challenge de auth;
`/.well-known/oauth-protected-resource` 200; `POST /mcp` sin token 401 (fail-closed intacto);
`/icon-512-dark.png` 404; `auth.efeonce.org/readyz` 200 (el piloto de TASK-1836 no se tocó). El deploy llevó
sólo estos commits: la revisión anterior `00035-bhd` estaba construida desde `d7469d7`, su padre exacto. Sin
impacto visible: ningún cliente Claude renderiza `icons` todavía. Razones:
[ADR](docs/architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md) §Delta 2026-09-05.

**Berel, 2026-09-04:** Playbook Producción y feedback nuevo de septiembre leídos completos y promovidos a
`berel-content-production` en los espejos Claude/Codex. La skill ahora distingue ficha técnica de página
pública, elimina lenguaje interno del cuerpo, agrega la rama de awareness con render oficial, normaliza
Kelvin/tablas/CTA y registra catálogo y pendientes técnicos. Se preservaron las reglas posteriores que
superan líneas antiguas del Playbook. Alcance local documental: no se tocaron artículos, assets, Drupal ni
el estado de publicación. Ver `SOURCES.md` de la skill para IDs, timestamps y drift.

**SEO/AEO y Berel, 2026-09-04:** método de informes documentado en
[modelo operativo](docs/operations/SEO_AEO_CLIENT_AUDIT_REPORTING_OPERATING_MODEL_V1.md) y skills espejo.
[Auditoría agosto](docs/audits/seo/BEREL_AUDITORIA_SEO_AEO_AGOSTO_2026.md) guardada y verificada en
[Notion](https://app.notion.com/3d139c2fefe781ba8928eef8dadfb219) y Markdown. El run EO-GRUN-00049
no es línea base comercial válida: categoría amplia y probes MCP/API falsos positivos. Corregir instrumento
y repetir medición sigue pendiente; este cambio solo documenta el método y el caso.
[Informe PDF A4](docs/audits/seo/berel-agosto-2026/BEREL_INFORME_AGOSTO_2026_A4.pdf): 55 páginas revisadas,
desempeño de Berel y pie institucional completo. [Estándar de informes](docs/operations/EFEONCE_REPORT_BRAND_DELIVERY_STANDARD_V1.md)
y skill `report-studio` creada para Claude/Codex: investigación primaria, siete módulos, plantillas y preflight probado. HTML queda como insumo; cobertura On-time explícita y exportación reproducible. Entrega local, sin envío al cliente.

**Globe, 2026-09-03:** caller externo pausado; protección deploy sólo local, sin commit/push/deploy.
Platform debe promoverla y medir ahorro. Reactivación/evidencia:
[runbook TASK-1807](docs/operations/creative-studio/GLOBE_DEEP_HIBERNATION_RUNBOOK_V1.md).

**RELEASE 2026-09-04 `9100bbd2765d` — `released`** (greenhouse-eo-45; run `33893120972`; PR #221; manifest `9100bbd2765d-d5fae366-…`). EPIC-044 en producción: `auth-server` vivo (readyz 200, JWKS 2 kid, rev `auth-server-00005-pk8`, `oauth:false`); lane 1631 verificado (200/400/401); Vercel READY; watchdog `ok` 5/5 (ops-worker y auth-server change-gated, árbol idéntico). Post-release: `AUTH_SERVER_JWKS_URL` en Vercel Production+staging + redeploy; environment `efeonce-auth` registrado `draft` (`pnpm auth-server:register-issuer-environment`). Fix en develop: el watchdog ya clasifica el change-gate del `auth-server` (espejo + test de paridad). Pendientes: señales `identity.external_binding.*` en prod con sesión humana; retiro de llave v1 (eo-0f); `AUTH_SERVER_OAUTH_ENABLED` ON en staging con environment `active`. Detalle: ledger de tiempos.

🔴 **TASK-1830 — el correo del magic link está MUERTO en producción** (hallado 2026-09-05 por el canary nuevo): `RESEND_API_KEY is not configured`. Declaré el `*_SECRET_REF` sin montar el secreto, y `sendEmail` usa el cliente SÍNCRONO. Corregido en `services/auth-server/deploy.sh` (commit `38fbfaeeb`), **pendiente de redeploy del auth-server**. La respuesta HTTP es 202 idéntica por anti-enumeración, así que nadie se habría enterado hasta que una persona real reclamara. Gate nuevo: `pnpm auth-server:person-auth:canary` (22 ok en vivo; exit 2 = incompleto, 1 = rojo). El resto del carril autenticado quedó verificado en vivo por primera vez.

**TASK-1830 (EPIC-044 U03) — `code complete, rollout pendiente`** (sesión greenhouse-eo-18, 2026-09-04, develop; commits `7459d96d4` · `937087404` · `db2622ba9` · `5b57b73f9`). Autenticación de personas externas sin contraseñas detrás de `AUTH_SERVER_PERSON_AUTH_ENABLED=false`: sesión propia `__Host-efeonce_auth` que implementa el `SubjectSessionPort` que dejaba a `authorize` en `login_required`, magic link (selector/verificador, 15 min, un uso, anti-enumeración con piso de latencia), passkeys (credenciales descubribles, contador anti-clonación), TOTP de step-up y recuperación por re-invitación. 8 tablas `greenhouse_auth` aplicadas y verificadas contra PG real; capability `identity.auth_person.revoke` + `POST /api/admin/auth-server/persons/revoke`; 3 señales `auth.person.*`. **Infra creada:** llave KMS simétrica `auth-server-totp-envelope` (HSM, rotación 90 d) — la de firma es EC y no cifra. **Desviaciones declaradas:** ledger propio `person_auth_attempts` (el del portal tiene CHECK de NextAuth y GRANT a otro rol) y `sha256`+timing-safe en vez de bcrypt (evita 300-800 ms de CPU en un endpoint no autenticado). **Próximo paso:** prender el flag en staging — exige `AUTH_SERVER_OAUTH_ENABLED=true` + environment `efeonce-auth` en `active`, si no la sesión se crea pero `authorize` responde `environment_inactive` — verificar que el correo sale de verdad por Resend (la respuesta es idéntica por anti-enumeración: un correo muerto NO se reporta solo) y ejercitar passkey en dos navegadores. Gate: `pnpm auth-server:person-auth:smoke`. TASK-1835 (pantallas Efeonce ID, sesión greenhouse-eo-45) consume el contrato del flujo maestro §5.bis.

**TASK-1829 (EPIC-044 U02) — `code complete, rollout pendiente`** (greenhouse-eo-45; commits `263ee3a74` · `19d1658de` · `d31e6e913`). Superficie OAuth del emisor detrás de `AUTH_SERVER_OAUTH_ENABLED=false` (ya en producción por el release de arriba): metadata, CIMD primario + DCR compat, authorize/token/revoke/introspect/consent, JWT ES256 con `gv`, 7 tablas `greenhouse_auth` y 2 capabilities aplicadas, 3 señales `auth.oauth.*`; contrato `docs/architecture/EFEONCE_AUTH_SERVER_OAUTH_CONTRACT_V1.md`. Decisión del operador: `localhost` como loopback sólo para clientes públicos. Próximo paso: flag ON en staging (environment `efeonce-auth` a `active`, metadata validada, clientes CIMD/DCR de prueba); persona real exige TASK-1830 (`SubjectSessionPort`). `pnpm build` de producción no se corrió localmente (CI/Vercel lo construyeron). No se corrió el canary de Globe OAuth (hibernado).

**EPIC-044 (2026-09-03) — authorization server PROPIO, decidido por el operador; WorkOS descartado.** ADR aceptado
`docs/architecture/EFEONCE_NATIVE_AUTHORIZATION_SERVER_DECISION_V1.md`; epic `in-progress` con TASK-1626/1631/1813 y las
nuevas TASK-1828…1834 (runtime · OAuth/CIMD/tokens · personas sin contraseña · gateway multi-issuer · canaries · pentest ·
convergencia login). Emisor como segundo host del front door del gateway (≈ USD 15/mes medidos). DNS `auth.efeonce.org` →
`34.111.78.237` creado y verificado. Excepción EPIC-027 para `services/auth-server` **APROBADA** por el operador (Build Unit
ADR Delta 2026-09-03, fila Accepted en DECISIONS_INDEX); **TASK-1828 EN EJECUCIÓN (sesión Claude greenhouse-eo-a3, `/implement-task 1828`, 2026-09-03/04)**: Slice 0 (KMS HSM `auth-server-es256` v1 + SA) y Slice 1 (schema `greenhouse_auth`, `src/lib/auth-server/keys`, `services/auth-server`, workflow, gates; commit `765ff0ca7`) HECHOS; token real firmado por HSM y verificado con el JWKS de PG. Slice 2 HECHO: `https://auth.efeonce.org` vivo (cert ACTIVE; rev `auth-server-00002-gfh`, `AUTH_SERVER_ENABLED=true`): `/readyz` 200 (postgres/kms/activeKey ok), JWKS publicado; rotación ejercitada (KMS v2 activa, v1 `retiring` — retiro pendiente tras 1 h: `pnpm auth-server:rotate-key --retire VjbDUgwc5bd1zj5olC8VndMXKk_G60tLF8xRw945nI8` + `gcloud kms keys versions disable 1`); `tofu apply` en `efeonce-mcp` `6a144a5` (pusheado), allowlist + orquestador + señales `auth.*` + runbook. CI `Auth Server Deploy` verde en develop (rev `auth-server-00003-jtf`, GIT_SHA `02dc5d987`; el deployer necesitó `cloudkms.viewer` sobre la llave). Barrido documental hecho (ADR nativo §Delta 2026-09-04, `GREENHOUSE_IDENTITY_ACCESS_V2`, invariantes identity/ops, `cloud-infrastructure/CLOUD_RUN.md`, control plane de reliability, runbook MCP, doc funcional + manual del autorizador, rule `.claude/rules/auth-server.md`, skills, EPIC-044 y tasks 1829–1833). **Retiro de la llave v1 pendiente** (`pnpm auth-server:rotate-key --retire VjbDUgwc…nI8` + disable KMS v1); `AUTH_SERVER_JWKS_URL` en Vercel pendiente de autorización. Producción del emisor = `code complete, rollout pendiente` (release control plane). Otra sesión tiene WIP sin commit de TASK-1631 (`src/lib/identity/external-access/`, `reliability/registry.ts`, `event-catalog.ts`, entitlements): no acoplar; señales del emisor se agregan después de que ese WIP se commitee. Task ui-ux de login sin ID hasta
tener wireframe/flow reales. Siguiente ID libre `TASK-1835` / `EPIC-045`.
**TASK-1631 (U04) Slice 1, 2026-09-04 — code complete, rollout pendiente.** Binding aplicado en PG, dominio
`src/lib/identity/external-access/**`, rutas admin, reader del gateway `GET /api/platform/ecosystem/identity/binding` y 4
señales; smoke `pnpm identity:external-access:smoke`. **Staging verificado 2026-09-04** (develop `02dc5d987` pusheado coordinado con TASK-1828): 4 señales en `/api/admin/reliability`, rutas admin 200, lane ecosystem 401 sin consumer. **En producción** desde el release 2026-09-04 (run 33893120972; canary del lane 400/200 `environment_inactive`/401; emisor `efeonce-auth` en `draft`). **Próximo paso:** operador lee las 4 señales en `/admin/operations` prod con sesión humana; TASK-1829 emite tokens y pasa el environment a `active`; TASK-1831 consume el reader.
Paridad registry↔catálogo roja por 11 capabilities ajenas sin seed (task aparte).

Maggie/María Fernanda: cierre 4/4, unresolved=0; agosto ready. Método documentado en runbook/manual y
skills Payroll/Talent Codex/Claude; Finance histórico pendiente de conciliación. [Evidencia 03/09](docs/audits/payroll/MAGGIE_MARIA_FERNANDA_OFFBOARDING_CLOSURE_2026-09-03.md).

Valentina (03/09): misma persona/usuario/member, correo nuevo y elegibilidad SSO verificados; login
interactivo no probado. Último día anterior 30/05/2026, EO-CENG-0001 ending; EO-CENG-0002 activo desde
20/08, bruto mensual 530.973 (450.000 líquidos). Agosto 12/31: EO-CPAY-0002 pending_readiness,
neto 174.193,55, única falta boleta; sin obligación/orden nueva. Recuperación y evidencia abajo.

TASK-1349 **EN PRODUCCIÓN + recovery aplicada** (2026-09-03; release `62356c9b7fd4`, run `33779259694`, flag
`WORKFORCE_OFFBOARDING_MEMBER_DEACTIVATION_ENABLED` ON prod+staging). Recovery por los commands canónicos, autorizada
en chat: **Felipe** revisado `relationship_ended` con causal `termination` declarada por el operador → approved →
scheduled → executed; member inactivo, compensación cerrada al 02/06, mayo `full_period`, junio `exclude_from_cutoff`,
julio+ `exclude_entire_period`. **Luis Reyes y María Camila Hoyos**: lifecycle cerrado (relación employee terminada
al LWD real, member inactivo) y stubs SCIM cerrados como `access_only`. Snapshot inicial, sustituido por el cierre Maggie/María Fernanda de arriba: unresolved **1** (Maria Fernanda,
draft 07-29, decisión manual de HR), executed_member_still_active **0**, deprovisioned_without_case 0.

🔴 **«Colaboradores fantasma» (2026-09-03 ~17:50Z, resuelto):** la pre-nómina de septiembre mostró seis
`Colaborador <uuid>` sin contrato: sujetos sintéticos de mi live test con compensación abierta, que `derivePolicy`
trataba como salida decidida (`identity_only` ejecutado → `full_period`). Compensaciones cerradas por command,
`hasDecidedExitFact` ya excluye `identity_only`, el live test limpia al terminar; fix en PR #220 (`main`).

**Valentina Hoyos — restauración gobernada APLICADA por Codex a las 18:38:48Z:** member activo/status activo,
asignable y sin corte antiguo; asignación existente activa sin fecha final. Se verificaron alias Production hacia
`a824d073` y 100% del tráfico `ops-worker-00641-dl2` hacia el árbol corregido antes de aplicar. Las siete categorías
protegidas (relaciones, engagements, envíos, payables, usuario, obligación y orden) siguen idénticas; SSO elegible con
correo nuevo y rol collaborator. Clave `valentina-lifecycle-reentry-restore-2026-09-03`; no repetir ni usar el SQL retirado.
Eventos publicados 18:40:03Z y People completado 18:42:05Z; employee cerrado y datos protegidos idénticos.
**Release cerrado:** `33795564223` success, manifest `a824d073a5fb-c2cf99e9-1ba1-40b3-9d85-76ad0a8e8372`
released 19:30:49Z, health success y watchdog ok/4 de 4 workers. Dos intentos anteriores fueron abortados por
cancelaciones concurrentes; Claude se retiró y Codex cerró bajo un solo operador. La auditoría conserva el incidente
independiente de matching SHA/run ID. Readback final: recuperación y siete categorías protegidas intactas.
[Auditoría](docs/audits/payroll/VALENTINA_REHIRE_IDENTITY_RECOVERY_2026-09-03.md) ·
[runbook](docs/operations/runbooks/workforce-reentry-recovery.md).
Finance de Felipe (obligación junio + SII) sigue como dependencia sin command de anulación. UI: TASK-1814.

**Delta Claude 19:40Z — PR #220 CERRADO por Codex** (run `33795564223`, manifest released 19:30:49Z; ver arriba).
Attempts 1 y 2 `aborted` por cancelaciones cruzadas: el webhook empareja por `target_sha` antes que por
`workflow_run_id`, así que cancelar un run duplicado aborta el manifest ajeno (bug a tasquear). **Purga sintética
APLICADA 18:37Z:** 12 members `TASK-1349 live …` (253 filas, `scripts/workforce/purge-task1349-live-subjects.sql`);
265→253 members, 8 activos, reales. Barrido documental 20:10Z + [TASK-1815](docs/tasks/to-do/TASK-1815-release-webhook-reconciler-run-id-matching.md).

Offboarding: la [auditoría inicial](docs/audits/payroll/OFFBOARDING_ROOT_CAUSE_AND_REMEDIATION_2026-09-03.md)
es antecedente, no estado vigente. [TASK-1349](docs/tasks/in-progress/TASK-1349-offboarding-member-lifecycle-writeback.md)
conserva pendientes Finance; [TASK-1814](docs/tasks/to-do/TASK-1814-offboarding-case-review-recovery-ui.md) posee
la UI aún sin implementar. No repetir las recoveries cerradas para probar ese recorrido.

Cierre documental 03/09: tres subagentes sincronizaron Workforce/Talent, Contractors/Finance y Release/QA;
root integró identidad, arquitectura, tareas e índices. [Cobertura y límites](docs/audits/payroll/VALENTINA_DOCUMENTATION_SKILLS_CLOSURE_2026-09-03.md).
Bug independiente de correlación de releases por SHA/run ID sigue pendiente; el runbook documenta mitigación
con un coordinador y lectura de intentos/eventos, sin declararlo corregido.

Seguimiento OAuth (2026-09-02): [TASK-1813](docs/tasks/complete/TASK-1813-efeonce-mcp-oauth-client-interoperability.md)
creada `to-do`, sin implementar. Codex 0.152.0 rechazó discovery; metadata pública revalidada a las 22:51Z.
La [auditoría](docs/audits/EFEONCE_MCP_CODEX_OAUTH_INTEROPERABILITY_2026-09-02.md) identifica scopes sin cualificar
al apagar shim, fallback de deploy que lo reactiva y canary directo que no prueba discovery. El plan B histórico
de abajo no basta sin esos gates. Próximo paso: plan humano aprobado y coordinación con dueños de archivos;
no push/deploy ni mutación de Entra autorizados por esta creación. Incidente Git/Berel separado.

## 2026-09-03 — EPIC-043: Payroll confiable y operable desde chat

[EPIC-043](docs/epics/to-do/EPIC-043-payroll-reliability-and-agentic-api-parity.md), `to-do`, P0: doce tasks
TASK-1816–TASK-1827, con contratos y dependencias por unidad. Por instrucción del operador, TASK-731/1214/1215/730
quedaron `complete` por supersesión documental hacia TASK-1820/1821/1825/1827; sin certificar implementación.
TASK-1625/ISSUE-129–134 conservan trazabilidad; OAuth TASK-1813 e identidad TASK-1631 son dependencias compartidas.
Primer paso: plan y ADR acotado de TASK-1816, cálculo atómico/aprobación de versión.
[Baseline](docs/audits/payroll/PAYROLL_RELIABILITY_API_PARITY_PROGRAM_BASELINE_2026-09-03.md).
Sólo planificación/documentación; sin código, migraciones, envíos, pagos ni deploy.

## 2026-09-03 — TASK-1806 seguimiento: alerta Teams determinista + rutina de recordatorio del cutover ETV

Después del cierre `complete` de TASK-1806 (ver entrada debajo, release `bda12be7e33a`), el operador preguntó
quién vigila la señal `seo.etv_methodology.drift` — hoy sólo es pull vía `/admin/operations`, nadie se entera
si no lo abre. Autorizado en chat ("las 3 formas de vigilar"), se desplegaron dos capas nuevas: (1) cron
`ops-seo-etv-drift-watch` (Cloud Scheduler, diario 12:00 America/Santiago, sin flag) que llama
`checkAndAlertSeoEtvMethodologyDrift()` (`src/lib/growth/seo/etv-methodology/drift-alert.ts`), lee la señal
existente sin tocarla y avisa a Teams sólo si `severity=error` — endpoint `POST /seo/etv-methodology-drift-watch`,
dispatcher `sendManualTeamsAnnouncement`, destino nuevo `growth-seo-reliability-alerts`
(`src/config/manual-teams-announcements.ts`), mismo canal físico "EO - Admin" que `production-release-alerts`.
Commit `79a1c3f74` en `develop`. Verificado en vivo (revisión `ops-worker-00637-2ww`): llamada real respondió
`{"severity":"warning","alerted":false}` — correcto, hoy es `warning` no `error`. 6/6 tests verdes. (2) Rutina
`trig_015zxhP1D4yXfTacUm5HqmQU`, dispara una vez el 2026-09-17 13:00 America/Santiago tras la primera captura
improved desatendida, sin credenciales locales: sólo recuerda verificar manualmente, no ejecuta verificación real.

## 2026-09-03 — TASK-1806 COMPLETE: Improved ETV en producción (release `bda12be7e33a`), rebaseline versionado

Cuarto release del día: PR #218 squash (`main=bda12be7e33af93906805054146c5e17a8b9c328`, 12:42Z), orquestador
`33758619690` (13:01→13:14Z, un solo run, sin retry; los DOS gates `production` aprobados a 13:04:26Z/13:04:57Z),
manifest `released` (`bda12be7e33a-4bb99ca1-8077-451a-9611-5929f933a990`), watchdog `ok`, 3/4 workers en el
target y ops-worker change-gated en `d2ebdb8f3` (diff de árbol completo = sólo el ledger de flags). **Canary de
contrato 13:15:26Z:** lanes prod `domain-overview`/`url-visibility` de Berel sirven
`etvMethodology.version=improved_layout_clickstream_v2` `single_methodology`; `/health` del worker
(`00636-h6w`) improved en escritura y lectura; `/api/auth/health` 200. Vercel Production+staging con ambos
selectores improved (valores verificados por `env pull`); staging con cutover y **drill de rollback** ejercitado
(legacy → improved, 3 redeploys).

**Decisión:** el shadow (USD 1,095) mostró improved 6× mejor calibrado contra GSC en Berel (err. rel. 49 % vs
321 %), Jaccard 1,0 e historia continua; el operador aprobó `go_rebaseline` y el cutover. Rebaseline acotado:
historia improved de Berel 2025-09..2026-09 y de Comex 2025-09..2026-03 (backfill USD 0,2568, sembró 14 filas);
la de julio 2026 en adelante es `fully_recomputed`, antes `calibrated_approximation`; `breakpointDate=null`.
Efeonce se mide aparte (su org/CL/GSC); guard en `assertEtvShadowCohort` para que un bulk nunca mezcle
organizaciones; cohorte v2.

**Riesgos abiertos / pendientes con dueño:** (1) señal `seo.etv_methodology.drift` en `warning` hasta que las
filas contractuales del 27-29/08 salgan de la ventana de 7 días (≤ 2026-09-05); el cron del 16/17 será la
primera captura improved DESATENDIDA del worker — si escribiera otra cosa, es incidente. (2) Berel verá sus
cifras de tráfico estimado ≈ −60 % por cambio de fórmula, no por pérdida real: comunicarlo. (3) Sujetos sin fila
improved degradan `not_available_for_method` hasta su próxima captura (subfolder/url de Berel el día 17).
(4) Rollback a legacy sólo antes del 2026-11-01T00:00:00Z (selectores + deploy.sh + redeploy). Sin push de
docs de cierre hasta este commit; WIP ajeno en el árbol intacto.

## 2026-09-03 — Berel: cobertura temática y minería solicitadas por el operador

Fecha local 2026-09-02. [Estrategia](docs/operations/BEREL_EDITORIAL_COVERAGE_STRATEGY_V1.md) y skills
Berel/SEO-AEO/DataForSEO sincronizadas; Playbook Notion ampliado y confirmado por nueva lectura.
[Research](docs/audits/seo/BEREL_CAPILLARY_KEYWORD_MINING_2026-09-02.md): 14 runs succeeded,
1.517 keywords distintas, 13 SERPs, 52 PAA, costo US$1,23572. 27 intenciones propuestas; 60 keywords
representativas revisadas, el resto del CSV es triage explícito. El tutorial público de baño aparece
#2 en SERP fuera de los 49 cuerpos del Hub: no crear duplicado. Priorizar elección/protección/aplicación.
Ese corte describe discovery, no las ediciones posteriores en Notion. Continuidad 2026-09-03: N29 pasó
a Berelex Semibrillante tras Wiki/página/PDF; tutorial, ALT paso 3, ficha N2 y nota de tarea releídos.
Artes y copies sociales aún pendientes; no asumir paquete aprobado ni publicación Drupal. La skill
incorpora [control técnico y QA](docs/audits/seo/BEREL_TUTORIAL_GUARDRAILS_2026-09-03.md) para futuras piezas.
Etiquetado: [auditoría](docs/audits/seo/BEREL_PIECE_COUNT_CLASSIFICATION_2026-09-03.md), 51 correcciones
Notion releídas (formato/canal/tipo), sin otros cambios. Nov/dic: 65 tareas visuales por mes, no archivos
ni entregas; rollups numéricos no expuestos por MCP. Operador confirma solo etiquetas, sin migración.
Relectura oct–dic: 221 tareas, 196 visuales etiquetadas y 25 principales excluidas; sin nuevas escrituras.
Skills espejo exigen tipo/canal desde la creación y en QA. Histórico fuera de esos meses y N31 pendientes.
Distribución selectiva: [auditoría y continuación](docs/audits/seo/BEREL_SELECTIVE_SOCIAL_DISTRIBUTION_2026-09-03.md).
Playbooks/skills y matrices de 17 slots + principales actualizados; 34/34 releídas e historial intacto.
Aplicación terminada: 193 páginas modificadas releídas, 128/128 registros sociales; octubre excluido. Cupos 8 artículos de 3.000–5.000 palabras,
50 gráficas y 3 videos/mes (cortesía mayo–octubre extendida a nov/dic). Operador confirmó: las 50
incluyen blog/RRSS; superficies Blog/Facebook/Instagram/Pinterest. Priorización N52→Navidad aprobada:
4 banners N52 Cancelada sin etiquetas de reserva, historial intacto; 4 banners y 2 sociales N59 creados.
Conteo vivo + briefs: 50 gráficas + 3 videos/mes (41/44 tareas estáticas); N45/N46 En curso, N50/N54 con gates.
Siguiente paso: conciliar derivados/assets de N29 y mantener bloqueos de sistemas no validados.
Commit local solicitado del trabajo editorial propio; sin push/cambio de branch/release.
Cambios ajenos de SEO y OAuth preservados; este trabajo no resuelve ese incidente Git/MCP.

Corrección de numeración verificada: [mapa y readback 179/179](docs/audits/seo/BEREL_EDITORIAL_NUMBERING_2026-09-03.md).
Noviembre N43–N51 (Navidad adicional), diciembre N52–N59; números de párrafos/auditorías anteriores
son históricos. Módulo 16 en skills espejo; no renombrar archivos ni reutilizar IDs por número.
Complemento autorizado: el método SEO/AEO y DataForSEO excluido de `1fcc2ade3` se incorpora por separado:
referencia 09 de minería, routers/espejos, priorización §2.3, brief, manual y funcional; sin nueva compra ni push.
