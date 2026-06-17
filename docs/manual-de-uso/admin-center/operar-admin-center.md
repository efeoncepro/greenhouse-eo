# Operar Admin Center

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-06-15 por Codex
> **Modulo:** Admin Center
> **Rutas:** `/admin/*`, `/api/admin/*`
> **Documentacion relacionada:** `docs/documentation/admin-center/admin-center-operacion-end-to-end.md`, `docs/documentation/identity/identity-access-admin-center-end-to-end.md`, `docs/manual-de-uso/identity/operar-identity-access-admin-center.md`

## Para que sirve

Admin Center sirve para operar configuraciones internas de Greenhouse: acceso, tenants, vistas, permission sets, integraciones, email delivery, AI Tools, pricing catalog, service SLAs, calendario operacional y responsabilidades.

Este manual cubre el uso general del centro admin y cuando derivar a manuales especializados.

## Antes de empezar

Necesitas sesion interna con rol/capability admin. Ver una pantalla admin no significa tener permiso para ejecutar todas las acciones de esa pantalla.

Para cualquier cambio sensible, define:

- Dominio afectado.
- Owner o responsable.
- Capability requerida.
- Riesgo de datos/sync.
- Evidencia que debe quedar en audit.

## Diagnosticar acceso a una vista

1. Confirma usuario y tenant.
2. Revisa route group.
3. Revisa rol efectivo.
4. Busca la vista en `view_registry`.
5. Revisa grants en `role_view_assignments`.
6. Revisa overrides de usuario.
7. Revisa capability especifica si la accion es mutacion.
8. Si hay drift, abre task/migracion; no corrijas con SQL manual.

## Usar permission sets

1. Entra a Admin Center > Permission Sets.
2. Busca el set existente antes de crear uno nuevo.
3. Revisa vistas incluidas.
4. Asigna o revoca a rol/usuario segun la UI.
5. Confirma audit log.
6. Verifica con el usuario afectado.

## Revisar tenants y usuarios

1. Abre area de tenants/users.
2. Filtra por organizacion, estado o rol.
3. Revisa datos de sesion/acceso.
4. Si el problema viene de SCIM/Entra, usa el manual de SCIM.
5. No cambies identidad base sin entender source of truth.

## Operar integraciones desde Admin Center

1. Abre `/admin/integrations`.
2. Revisa health/freshness.
3. Para pause/resume/sync, sigue `operar-integraciones-y-sync.md`.
4. Documenta razon de cambios.

## Revisar email delivery y notifications

1. Abre `/admin/email-delivery` para correos.
2. Abre preview si necesitas probar template.
3. Revisa manual de comunicaciones para estados.
4. No reenvies por fuera de Greenhouse.

## Operar AI Tools

1. Abre `/admin/ai-tools`.
2. Administra catalogo, licencias y wallets.
3. Sigue manual AI Tooling para creditos/ledger.
4. No confundas creditos IA con facturacion.

## Operar pricing/product catalog

1. Abre el panel de catalogo correspondiente.
2. Revisa drift/sync con HubSpot cuando aplique.
3. Aplica aprobaciones o resoluciones desde la UI.
4. No trates precio/catalogo como ingreso cobrado.

## Operar Service SLAs

1. Revisa definiciones por servicio/organizacion/space.
2. Confirma vigencia y owner.
3. Revisa compliance projection si existe.
4. Cambia definiciones solo con owner del dominio.

## Operar calendario operacional

1. Revisa feriados/cierres/ventanas.
2. Confirma zona horaria y pais/regla.
3. Usa el calendario para planificar cierres, payroll, finance o releases.
4. No hardcodees fechas en otro modulo si ya existe calendario.

## Operar responsabilidades

1. Busca responsabilidad por miembro, space o workflow.
2. Revisa tipo y vigencia.
3. Asigna o revoca desde flujo gobernado.
4. Recuerda que responsabilidad operacional no siempre otorga permiso automatico.

## Problemas comunes

### Un admin ve la ruta pero falla al guardar

Puede tener view access pero no capability de mutacion.

### Una vista existe en codigo pero no aparece

Revisa `view_registry`, grants y route reachability.

### Un permission set no arregla una accion

Puede faltar capability, no vista.

### Pricing catalog muestra drift con HubSpot

Usa el flujo de resolucion de conflictos; no edites HubSpot/Greenhouse por separado sin sync governance.

## Que no hacer

- No usar Admin Center como bypass de Finance/Payroll/Commercial approvals.
- No dar permisos editando DB en caliente.
- No crear capabilities fuera del registry.
- No confundir responsibility con permiso.
- No ejecutar syncs, emails o writes productivos sin razon y evidencia.

## Referencias tecnicas

- `src/app/(dashboard)/admin/**`
- `src/app/api/admin/**`
- `src/lib/admin/**`
- `src/lib/entitlements/runtime.ts`
- `greenhouse_core.view_registry`
- `greenhouse_core.role_view_assignments`
- `greenhouse_core.user_view_overrides`
- `greenhouse_core.view_access_log`
