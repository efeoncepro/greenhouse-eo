# Efeonce MCP — preparación del plugin para ChatGPT y Codex

Fecha: 2026-09-26. Estado: **auditoría terminada; publicación no preparada**.
Alcance autorizado: revisión y propuesta. No se crearon grants, clientes OAuth, conexiones,
cuentas de revisión, plugins, drafts en OpenAI, commits, push ni deployments.

## Alcance confirmado después de la auditoría — 2026-09-26

El operador pidió el conector completo de Efeonce para Codex y ChatGPT, con marca, skills e instalación
privada funcional **sin depender de revisión del directorio**. [TASK-1904](../../../tasks/to-do/TASK-1904-efeonce-openai-plugin-private-distribution.md)
posee esa entrega y consume el routing de TASK-1864. No aprobó limitar el producto a SEO ni ampliar
la autoridad externa. Las secciones de propuesta pública/SEO que siguen son alternativas históricas;
F01/F03/F07/F09 y los materiales de submission no son bloqueos generales para el uso privado interno.
La evidencia técnica fechada se conserva; el catálogo debe verificarse al ejecutar la task.

## Decisión recomendada originalmente — propuesta histórica, alcance sustituido

Conservar un gateway y un recurso OAuth: `https://mcp.efeonce.org/mcp`, con Efeonce ID.
Construir primero un paquete privado para probar el uso interno y preparar después una versión
pública centrada en consultas SEO de clientes. La selección de SEO es una propuesta de alcance,
no una ampliación aprobada de acceso ni una promesa comercial vigente.

El plugin se publica una vez en el directorio compartido de OpenAI. La UI es opcional; un plugin
MCP-only permite probar el valor sin crear una aplicación visual adicional.
Una instalación local, la conexión de desarrollo, el envío a revisión, la aprobación y la
publicación son estados distintos. La identidad del publicador debe corresponder a Efeonce;
la denominación «oficial» no implica aprobación ni patrocinio de OpenAI.

## Evidencia y límites

| Evidencia                                            | Resultado                                                                                         | Límite                                                                                                     |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| [HTTP público](public-readback.json)                 | Health 200, PRM 200, issuer metadata 200, MCP anónimo 401 con challenge                           | No acredita login, despacho autenticado, refresh ni grants                                                 |
| [Servidor construido localmente](local-surface.json) | Gateway 1.8.0, SHA `958c9de30c796e61ca058cdb2d3b0643ec9478ac`, checkout limpio al medir; 70 tools | Providers habilitados únicamente en memoria. No es `tools/list` de producción                              |
| Simulación pura de policy                            | Interno v2/base: 21 tools; externo customer/base: 2; externo canary/base: 2                       | Fixtures inventadas para evaluación local, sin persistencia ni tokens reales; no prueba downstream         |
| [Pruebas existentes](local-checks.txt)               | 21/21 PASS, cero omitidas                                                                         | Contratos e integración local con dependencias de prueba; no certificación de clientes actuales            |
| Conector disponible en esta conversación             | «Efeonce», descripción del canary; status devuelve `UNAUTHORIZED`, requiere reautenticación       | No se llamó entitlement ni se renovó o sustituyó la conexión; no se presume causa de expiración/revocación |
| Portal OpenAI en navegador integrado                 | `/plugins` redirige a login                                                                       | Identidad empresarial, roles, drafts y publicaciones desconocidos; no prueba que no existan                |
| Marca                                                | `/icon-512.png` 200, PNG, 14.830 bytes, hash en evidencia                                         | No se revisó su aceptación visual en el directorio                                                         |

Fuentes de implementación: `../efeonce-mcp/src/mcp.ts`, `src/auth/authorized-tools.ts`,
`src/auth/tool-policy.ts`, `src/providers/greenhouse-seo.ts` y `src/branding.ts` en el gateway;
`src/lib/auth-server/oauth/metadata.ts` y `src/lib/api-platform/resources/ecosystem-growth-seo.ts`
en Greenhouse. La ruta local del gateway es hermana de este repositorio; no significa que viva
dentro de esta carpeta de auditoría.

## Hallazgos que determinan el lanzamiento

| ID  | Prioridad y alcance                       | Hallazgo verificable                                                                                                                                                                                                                                                    | Acción y dueño                                                                                                                                                                      |
| --- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 | Bloquea la propuesta pública SEO          | `read()` excluye `native-external`; `get_seo_entitlement` admite externos únicamente con propósito `canary`. Con base/customer la policy permite `efeonce.gateway.status` e `identity.invitations.list`; el provider de identidad aún revalida administración designada | Platform + Identity + SEO: definir contrato de lecturas externas y aislamiento, antes de editar policies. Conservar la frontera del piloto real                                     |
| F02 | Bloquea certificar la conexión actual     | Conector hospedado requiere reautenticación y conserva presentación de canary                                                                                                                                                                                           | Inventariar vínculo actual y conectar una identidad elegible para el piloto. No reactivar el canary retirado ni ampliar sus grants                                                  |
| F03 | Bloquea expediente de revisión            | No hay cuenta demo comprobada. OpenAI exige que el revisor ejecute los casos sin depender de códigos por correo/SMS/MFA o red privada; el login existente contempla magic link/passkey y otros carriles                                                                 | Identity: diseñar acceso de revisión aislado y revocable, demostrarlo con el flujo real. No introducir password grant ni desactivar protecciones globales para resolverlo           |
| F04 | Condicional al catálogo presentado        | `globe.capabilities.list` y `globe.producer.fleet.list` no declaran annotations en el registro local. No están disponibles por policy nativa                                                                                                                            | Si se incluyen en algún expediente, revisar implementación y añadir hints explícitos correctos antes de escanear. Quedan fuera de la propuesta SEO; no despertar Globe              |
| F05 | Mejora recomendada                        | 67/70 registros carecen de `outputSchema`; solo organizaciones, status y entitlement lo declaran                                                                                                                                                                        | Priorizar schemas en las seis lecturas SEO propuestas que carecen de ellos. Derivarlos del contrato dueño y validar respuesta; no inventar un schema para silenciar el aviso        |
| F06 | Limita restricción por dominio Enterprise | Discovery OIDC servido no anuncia `userinfo_endpoint`, `openid`, `email` ni `email_verified`                                                                                                                                                                            | Identity: añadir ese contrato solo si la oferta requiere esta protección. No confundir la carencia con imposibilidad general de OAuth o publicación                                 |
| F07 | Configuración de submission pendiente     | Challenge estándar `/.well-known/openai-apps-challenge` devuelve 404                                                                                                                                                                                                    | Al tener el token real del portal, habilitar ruta en host o parent origin permitido, con respuesta exacta. El 404 actual no demuestra que el dominio nunca se verificó por otra vía |
| F08 | Bloquea materiales de publicación         | El enlace de términos servido por la home (`/terminos-y-condiciones`) devuelve 404. Privacidad y contacto responden 200                                                                                                                                                 | Web + Legal: corregir la URL vigente o publicar el documento aprobado; revisar cobertura específica de datos del plugin. No se efectuó revisión legal del contenido                 |
| F09 | Sin verificar en la cuenta                | Business verification, Apps Management Write y proyecto elegible no observados por falta de sesión de Platform                                                                                                                                                          | Publicador Efeonce: verificar en la organización exacta antes de crear el draft                                                                                                     |

La metadata OAuth pública sí declara PKCE S256, refresh, CIMD, DCR y protección `iss`.
Estas declaraciones no sustituyen una prueba de autorización, callback, renovación y revocación.
El PRM sigue correctamente acotado al scope base. No se propone ampliar el bootstrap.

**Cuidado con el catálogo variable:** el expediente debe corresponder al catálogo que importa
OpenAI con la identidad de revisión. La simulación interna de 21 tools no convierte en publicables
70 ni demuestra que el usuario externo verá las mismas. Una lista escrita en la skill tampoco
restringe `tools/list` o `tools/call`. La separación, si hace falta, debe quedar en policy server-side
y en el contrato de distribución, preservando el recurso OAuth único.

## Primera versión propuesta

Nombre público candidato: **Efeonce MCP**. Identificador local candidato: `efeonce-mcp`.
Categoría candidata: `BUSINESS`. Subtítulo: «Consulta tu desempeño SEO».

Descripción candidata, **condicionada a F01 y al piloto**:
«Consulta el desempeño SEO de tu organización con Efeonce. Revisa resultados de búsqueda,
evolución de posiciones, auditorías técnicas y enlaces a partir de los datos disponibles en tu cuenta.
Requiere una cuenta Efeonce con acceso habilitado.»

| Tool existente                | Resultado para el usuario                       | Preparación pendiente                                                                            |
| ----------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `get_seo_entitlement`         | Conocer disponibilidad del módulo               | Policy customer y revisar si presupuestos/costos de proveedor deben formar parte del DTO cliente |
| `get_seo_overview_kpis`       | Resumir Search Console y comparación disponible | Policy customer + outputSchema                                                                   |
| `get_seo_performance_catalog` | Encontrar keywords o URLs consultables          | Policy customer + outputSchema                                                                   |
| `get_seo_performance`         | Comparar un conjunto explícito de keywords/URLs | Policy customer + outputSchema; respetar `data.source`                                           |
| `get_seo_rank_evolution`      | Ver evolución de posiciones                     | Policy customer + outputSchema                                                                   |
| `get_seo_site_audit_report`   | Entender auditorías técnicas ya ejecutadas      | Policy customer + outputSchema; distinguir running, no_data y succeeded sin findings             |
| `get_seo_backlink_profile`    | Consultar la evolución del perfil de enlaces    | Policy customer + outputSchema                                                                   |

`efeonce.gateway.status` queda como soporte técnico, sujeto a revisar si la lista global de providers
aporta valor al cliente. `efeonce.organizations.list` sigue siendo interna v2; no se reutiliza como
descubrimiento externo sin un contrato propio. Para v1 externa se propone la organización resuelta
desde el binding autorizado; no adivinar IDs ni usar la lista interna.

Las siete tools propuestas tienen los tres hints explícitos con valores
`readOnlyHint=true`, `destructiveHint=false`, `openWorldHint=false` en el registro local.
El adapter SEO separa GET de commands POST; se siguió la lectura de KPIs y auditoría hasta sus
readers canónicos. Esto no es una auditoría semántica exhaustiva de todos los callbacks, logs y
efectos de las 70 tools, ni una certificación final de annotations para submission.

Fuera del primer alcance: escrituras/gasto SEO, invitaciones, Hiring, administración de servicios,
Insights, Studio y Globe. Insights/Studio tienen exclusiones nativas expresas; no son olvidos de
registro. La marca Efeonce puede crecer con nuevas capacidades certificadas sin ofrecerlas de antemano.

## Paquete y skills

1. `openai-docs`: requisitos oficiales y compatibilidad por superficie.
2. `plugin-creator`: scaffold local compatible y marketplace personal para pruebas. Su formato
   `.codex-plugin/plugin.json` sigue admitido; el formato portable actual utiliza `plugin.json` y
   `mcp.json`. No renombrar archivos sin adaptar el schema.
3. `build-chatgpt-app`: ajustes MCP y, solo si aporta valor, UI. Primera versión propuesta: tool-only.
4. `chatgpt-app-submission`: expediente final después de cerrar catálogo y comportamiento.
5. `efeonce-mcp-platform` + `mcp-craft`: ownership, scopes, policy, metadata y evaluación.

Skill de usuario propuesta: `consultar-desempeno-seo`. Debe explicar selección de organización y
mercado, períodos, fuentes medidas/estimadas, faltantes y próximos pasos respaldados por resultados.
No debe incluir instrucciones de deploy, secretos, rutas del repo ni nombres de clientes reales.
Es propuesta, todavía no creada ni instalada.

Los manuales servidos por `get_greenhouse_skill` no equivalen a skills estáticas importables por OpenAI;
además, esa tool tiene exclusión nativa `manual_capability_policy_missing`. Para v1 se recomienda un
bundle explícito. Las skills importadas son snapshots de submission, no contenido actualizado en vivo.

## Materiales listos y pendientes

| Campo                   | Candidato / estado                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| Endpoint / tipo         | `https://mcp.efeonce.org/mcp` / Universal                                                             |
| Autenticación           | OAuth con Efeonce ID; callback exacto desde el portal, mantener PKCE y resource                       |
| Sitio                   | `https://efeoncepro.com` — 200                                                                        |
| Logo                    | Asset oficial `../efeonce-mcp/assets/icon-512.png`, servido públicamente; aceptación visual pendiente |
| Privacidad              | `https://efeoncepro.com/politica-de-privacidad/` — 200; cobertura de MCP/IA pendiente                 |
| Soporte                 | `https://efeoncepro.com/contacto/` — 200; confirmar que el canal atenderá el plugin                   |
| Términos                | Enlace encontrado en la home responde 404; falta URL vigente comprobada                               |
| Publicador              | Identidad empresarial verificada y permisos: sin comprobar                                            |
| Disponibilidad regional | Por definir según operación y términos; no seleccionar todos los países por defecto                   |
| Demo                    | Falta fixture, acceso comprobado e instrucciones reproducibles para revisión                          |
| Capturas de UI / CSP    | No aplican a tool-only; se agregan si aparece UI                                                      |

No se generó `chatgpt-app-submission.json`: aún no existe un catálogo público SEO autorizado y probado
que respalde el copy y los casos. El formato importable no debe presentar una propuesta como funcionalidad
operativa. Tampoco se envió el conector canary como sustituto del producto.

## Cinco casos positivos y tres negativos propuestos

**Todos pendientes de ejecución hospedada.** Preparar organización demo aislada con datos sintéticos
identificados como tales, un mercado declarado, período conocido, dos URLs y casos de ausencia de datos.
Las cifras esperadas salen de esa fixture; no se fabrican resultados para la presentación.

| Caso | Prompt de ejemplo                                                                           | Tools / resultado esperado                                                                                                                |
| ---- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| P1   | «¿Tengo disponible el módulo SEO?»                                                          | `get_seo_entitlement`; estado real de disponibilidad. Si no hay módulo, explicarlo sin ejecutar operaciones pagadas                       |
| P2   | «Resume mis resultados de Search Console de los últimos 28 días para el mercado de la demo» | `get_seo_entitlement`, `get_seo_overview_kpis`; fechas, fuente medida y comparación solo cuando exista                                    |
| P3   | «Muéstrame las páginas disponibles y compara los clics de estas dos URLs de la demo»        | `get_seo_performance_catalog`, `get_seo_performance`; URLs exactas seleccionadas, `mode=url`, `metric=clicks`, sin convertir null en cero |
| P4   | «¿Qué problemas críticos aparecen en la última auditoría técnica?»                          | `get_seo_site_audit_report`; hallazgos del run. Un run en curso no se presenta como sitio limpio                                          |
| P5   | «Explica cómo evolucionaron mis posiciones y enlaces en los últimos 90 días»                | `get_seo_rank_evolution`, `get_seo_backlink_profile`; fuentes y cadencias separadas, sin promediar GSC con DataForSEO                     |
| N1   | «Genera una fotografía de una taza»                                                         | No invocar el plugin: fuera del alcance SEO                                                                                               |
| N2   | «Envía este informe por correo al cliente»                                                  | No invocar tools de envío ni prometer entrega: fuera del alcance de lectura                                                               |
| N3   | «Compra nuevas keywords y activa su seguimiento»                                            | No invocar writes ni ampliar scopes: fuera de esta versión                                                                                |

Además del expediente: probar target ajeno, sesión/grant revocados, provider caído, mercado ambiguo,
`no_data`, refresh posterior al TTL y acceso tras reconectar. Hacerlo en ChatGPT y Codex, guardando
llamadas/resultados reales. Un `Connected`, una respuesta del modelo o una prueba local no bastan.

## Orden de construcción y criterios de salida

1. **Contrato de distribución y población** — Platform/Identity/SEO. Proponer delta del ADR del gateway
   y, si abre customer access, del contrato de identidad/piloto. No aprobarlo por inferencia de esta auditoría.
2. **Paquete privado** — Platform. Marca + MCP + skill de uso interno; verificar instalación y llamadas
   con identidad interna elegible, manteniendo el canary separado. No necesita publicación pública.
3. **Autoridad pública y DTOs** — Identity/SEO. Lecturas exactas, datos mínimos, aislamiento por cliente,
   entitlement y schemas. Tests de allow/deny y paridad; no abrir clases de escritura.
4. **Demo y certificación** — Identity/QA. Acceso reproducible para revisión, cinco positivos, tres
   negativos, refresh/revoke y ambas superficies. Sin datos comerciales reales en fixtures públicas.
5. **Expediente** — Platform/Publicador/Web/Legal. Materiales correctos, cuenta verificada, domain challenge,
   Scan Tools, justificaciones y JSON de submission consistentes con la superficie importada.
6. **Revisión y publicación** — Publicador. Presentar únicamente tras cierre de brechas. Publicar después
   de aprobación de OpenAI y autorización de lanzamiento; no equiparar review con publicación.

Esta auditoría no crea una nueva capacidad ni modifica una decisión de acceso. Por eso las capas funcional,
técnica y manual vigentes permanecen en sus dueños; al implementar el plugin se actualizarán con su contrato.
El alcance formal de construcción debe registrarse antes de implementar, con ownership entre repositorios.

## Reproducir la evidencia local

Desde `efeonce-mcp`, usando sus dependencias instaladas:

```bash
pnpm exec tsx ../greenhouse-eo/docs/audits/mcp/2026-09-26-openai-plugin-readiness/collect-local-surface.mts . /tmp/efeonce-plugin-local-surface.json
pnpm exec tsx --test test/tool-policy.test.ts test/greenhouse-identity-policy.test.ts test/native-integration.test.ts test/oauth-discovery.test.ts test/version.test.ts
```

El collector construye el servidor con providers ficticios y evalúa policy pura. No lee `.env`, no crea
credenciales ni llama providers. Las schemas JSON se convierten desde Zod para inspección; el artefacto no
sustituye la serialización MCP desplegada. Las 70 tools conservan annotations, presencia de outputSchema,
securitySchemes, policy y resultados de los tres escenarios en `local-surface.json`.

## Fuentes oficiales consultadas

- [Publicación, campos y verificación de dominio](https://developers.openai.com/plugins/deploy/submission).
- [Requisitos de revisión, cuenta demo y annotations](https://developers.openai.com/plugins/deploy/app-review).
- [OAuth y restricciones por dominio de workspace](https://developers.openai.com/plugins/build/auth).
- [Paquete portable y compatibilidad con Plugin Creator](https://developers.openai.com/plugins/build/plugins).
- [Diseño de tools orientado a resultados](https://developers.openai.com/plugins/plan/tools).

Contratos Efeonce: [gateway](../../../architecture/EFEONCE_MCP_PLATFORM_GATEWAY_DECISION_V1.md),
[entrada y consentimiento](../../../architecture/EFEONCE_ID_RELYING_PARTY_ENTRY_AND_CONSENT_DECISION_V1.md),
[runbook](../../../operations/EFEONCE_MCP_PLATFORM_RUNBOOK_V1.md) y
[manual interno multiorganización](../../../manual-de-uso/identity/usar-mcp-interno-multiorganizacion.md).
