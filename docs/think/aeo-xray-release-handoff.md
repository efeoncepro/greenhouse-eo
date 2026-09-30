# AEO X-Ray — handoff de entrega y foundation pendiente

Actualizado 30/09/2026. Owners: TASK-1950 (dominio/acceso),TASK-1951 (Think/composición).
[Dossier detallado](aeo-xray-implementation-dossier-2026-09-30.md) ·
[Auditoría actual](aeo-xray-completion-audit-2026-09-30.md).

## Estado operativo real

El operador cerró la muestra Banco Pichincha y autorizó documentación/commit. La entrega ya vive en
Think, **sin promover Greenhouse**: branch main, SHA `be8d4841e1124818bd7f4c88d0d7ad7b970e5122`,
deployment `dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB`, URL deployment
`https://efeonce-think-h8b4a3n16-efeonce-7670142f.vercel.app`, alias `https://think.efeoncepro.com`.
Readback HTTP actual 200 y headers private/no-store/noindex/no-referrer/nosniff. Release READY/alias/SHA
registrados en `.captures/aeo-xray-selector/release.json` del runtime.

La key de envío queda en el registro comercial privado/conversación, nunca en este doc. La demo
multipieza usa `sample_`: paquete Think, sin requests Greenhouse. El registry se acepta con AXIS;
media `?asset=<id>` responde 302 a paths estáticos públicos. No es grant, no autentica destinatario,
no expira automáticamente ni revoca por request. El `expiresAt` de compatibilidad no es un TTL.

Conservar legacy,4 etapas,2 piezas y su coreografía. Telón 1400 ms, easing `.65,0,.35,1`, parser de unidades
CSS compilado corregido;44 checks local y producción. Motion 49 checks local. Los medios incluyen 3 feeds,
Story y MP4 producido; no publicaciones del banco. Revisión de fuentes/imágenes/SEO/AEO en el dossier.

## Cambiar o retirar la entrega actual

1. Inspeccionar Think git status y editar exclusivamente payload/media/componentes requeridos.
2. Validar contrato, revisar copy/fuentes/procedencia y ejecutar gates proporcionales + capturas reales.
3. Commit/push Think según autorización, esperar deployment READY y verificar SHA exacto/alias.
4. Abrir enlace real del cliente y comprobar ambos artefactos/4 pasos/medios/telón/motion.
5. Retiro: eliminar registro y media publicados, redeploy y comprobar 404 efectivo en alias.
   No atribuir retiro a borrado local, ni suponer revocación inmediata/CDN de un grant.

Rollback Think: redeploy del SHA previo que conserva registry/media. Si el objetivo es retirar la muestra,
no restaurarla por accidente al elegir deployment anterior. Preservar el registro privado de qué versión
se envió; el backend futuro de ediciones inmutables no está operativo para este carril.

## Unidad futura Greenhouse: preparada, no autorizada para promover

| Repo | Contenido | Gate |
|---|---|---|
| AXIS | Contrato/tokens 0.1.0 y distribución con provenance | Verificar hash/pinning, no mezclar otras líneas |
| Greenhouse | `src/lib/aeo-xray`, adapters API, entitlements/redaction/storage/tipos y migración | Aislar hunks propios; migración/actor/storage/flags/readback pendientes |
| Think | Reader `xrg_` y SSR compartido | Canary real provider/consumer y compatibilidad de media; sample seguirá independiente |

No publicar Greenhouse por inferencia del envío. El árbol compartido tiene WIP ajeno; sólo stagear
paths/hunks propios revisados. No mover TASK-1950/1951 a complete sin evidencia del alcance restante.

## Secuencia futura: provider/grant Greenhouse (requiere autorización separada)

1. Cargar de nuevo la skill de release, playbook y control plane vigentes. Verificar workflow y target exactos de cada repo, WIP concurrente, rollback y package hashes. No inferir éxito productivo de un push.
2. Aplicar por el carril de migraciones gobernado `20260930140916208_task-1950-aeo-xray-editions-sharing.sql` al entorno objetivo; comprobar schema `greenhouse_xray`, constraints y permisos. El ensayo PG efímero existente no prueba ese entorno.
3. Desplegar provider Greenhouse con lectura nueva cerrada por defecto. Verificar storage privado `xray_source`, no servirlo como asset público. Confirmar actor interno activo y organización operadora (`is_operating_entity`); el ID del prospecto no concede autoridad. OAuth delegado X-Ray no está habilitado por esta implementación.
4. Distribuir contrato idéntico y desplegar Think. Confirmar `GREENHOUSE_API_BASE` hacia el provider correcto y los mecanismos de acceso existentes `GREENHOUSE_THINK_KEY`/`GREENHOUSE_API_BYPASS` sólo cuando correspondan al entorno. No imprimir sus valores. No configurar `XRAY_CASE_DIR`/`XRAY_DEMO_DIR` como acceso público.
5. Configurar el origen HTTPS permitido por `AEO_XRAY_PUBLIC_BASE_URL`; fijar `AEO_XRAY_RATE_SALT` por el carril de secretos. La lectura sólo se abre con `AEO_XRAY_SHARING_ENABLED` igual a `true` exacto; registrar valor y redeploy/readback, no sólo presencia. No trasladar flags de Insights.
6. Ejecutar primero un caso sintético con el actor real: create → upload privado → patch con expectedRevision → edition → grant. Seguir [endpoints del manual](radiografia-aeo-manual.md#preparar-y-compartir-una-edición-nueva). Registrar IDs y hashes; el bearer se entrega una sola vez y no se guarda en logs/evidencias.
7. Completar el canary de abajo en provider y consumer. Sólo después preparar la edición Pichincha con contenido/medios revisados, condiciones reverificadas y aprobación visual del operador. La fecha/TTL del enlace empieza en emisión, no en el día de elaboración del contenido.
8. Envío de email exige instrucción expresa de envío; preparar el texto/enlaces no envía el correo.

## Canary obligatorio

- Actor permitido puede autorar; actor externo, revocado, expirado u organización ajena no puede leer/alterar el caso. Contexto prospecto nunca amplía permisos.
- Documento y cada imagen autorizados responden; no hay bearer en HTML, canonical, OG, analytics o logs. Headers efectivos en provider y Think: private/no-store, no-referrer y noindex; fixture-client no abre en build desplegado.
- Editar el draft no modifica la edición; emisión idempotente conserva hash, conflicto de revisión no sobrescribe.
- Revocar grant y volver a solicitar documento e imágenes por ambos orígenes deniega acceso. Retirar edición deniega todos sus grants; desconocido, expirado, límite y upstream caído no muestran datos anteriores.
- Recorrer cuatro etapas en ambas piezas; inspector, linaje social, TOC, motion/reduced-motion, teclado y móvil. Comparar capturas reales contra la referencia bancaria y regresión SKY.
- Medir bytes, carga y layout en entorno objetivo; registrar viewport, caché y método. No presentar benchmark de demo como CWV de pichincha.pe.

## Rollback

Cerrar la nueva lectura y verificar la denegación antes de revertir a los deployments/versiones registrados. Conservar el schema aditivo, snapshots y revocaciones; no ejecutar un down destructivo ni restaurar grants revocados. Legacy debe permanecer operativo. Registrar readback del cierre y del legacy, no sólo la acción solicitada.

## Estado de salida

Entrega independiente Think operativa y aceptada por el operador. Foundation/grants Greenhouse:
code complete parcial, rollout pendiente. Owner Platform/Growth; siguiente paso sólo después de
una autorización específica de rollout del provider. No marcar tareas completas por el sample.
