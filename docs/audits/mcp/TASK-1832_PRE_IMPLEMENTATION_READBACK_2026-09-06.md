# TASK-1832 — readback previo a implementación

- Fecha UTC: `2026-09-06T14:57:34Z`
- Alcance: lectura de `greenhouse_app` mediante `greenhouse_ops`; sin DDL/DML, flags, cuentas, sesiones,
  invitaciones, bindings ni grants nuevos.
- Estado de código: `develop` en `f67b59450`; plan pendiente de checkpoint humano.

## Resultado

### Procedencia y superficies 360

- Existen `30` perfiles con `identity_profiles.data_origin='smoke_test'`.
- Los `30` aparecen hoy en `greenhouse_serving.person_360` porque la view sólo excluye `status='merged'`.
- Ninguno de esos perfiles tiene `person_memberships`, `client_users` ni contacto CRM enlazado.
- Seis perfiles `external_contact` provienen de smokes de identidad externa. En los seis, los source links están
  inactivos; sus invitaciones y bindings están revocados y el environment de prueba está retirado.
- Es correcto conservar audit/history, pero no es correcto que el reader 360 siga sirviendo esos perfiles.
  Esto convierte la exclusión específica de `smoke_test` en criterio load-bearing de TASK-1832.

### Buzones

- Los seis perfiles externos existentes usan únicamente el dominio sintético `efeonce.invalid`.
- Ninguna de esas invitaciones registra entrega real.
- Por tanto, el estado actual no cubre un buzón Microsoft 365 ni uno Google y no puede probar entrega, magic
  link, scanner-safe POST ni continuidad de identidad entre navegadores/clientes.

### Organización canary

El inventario de organizaciones activas no-cliente contiene múltiples proveedores/prospectos reales y no deben
reutilizarse como fixture. El único candidato con nombre explícitamente diagnóstico es:

| Public ID | Nombre | Tipo | Lifecycle | Origen | Espacios | Memberships | Bindings externos |
|---|---|---|---|---|---:|---:|---:|
| `EO-ORG-0050` | `ZZ Diagnostico (descartable - ignorar)` | `other` | `disqualified` | `manual` | 0 | 0 | 0 |

No es una fila vacía: ya tiene identificador tributario, commercial party y tres referencias de lifecycle. La
tabla `organization_lifecycle_history` tiene FK `ON DELETE RESTRICT` y triggers que impiden `UPDATE/DELETE`, por
lo que esta fila **queda descartada** bajo el requisito de poder eliminar el canary después. No se seleccionó ni
modificó.

El fixture elegible debe ser una organización dedicada creada después de este checkpoint, inactiva, no-cliente,
sin tax ID, HubSpot, spaces, memberships, commercial facts ni historia de lifecycle. El audit append-only de
identidad externa usa IDs desacoplados y no tiene FK a la organización, por lo que puede preservarse después del
hard delete. El test live de persistencia de TASK-1836 ya demuestra que una organización aislada e inactiva sin
historia puede eliminarse cuando primero se limpian sus referencias exactas; TASK-1832 debe convertir ese patrón
de fixture en command gobernado, dry-run y manifiesto, no copiar SQL de test a un script operativo.

## Decisiones pendientes

1. Aprobar el plan P0/Alto de `docs/tasks/plans/TASK-1832-plan.md` para iniciar ADR/código local.
2. Aprobar específicamente la creación futura de una organización canary dedicada. `EO-ORG-0050` queda
   rechazada por no ser eliminable sin destruir historia append-only. La aprobación del plan no crea la fila.
3. Identificar las dos cuentas controladas para la matriz: una Microsoft 365 y una Google. Plus-addressing no
   sustituye la segunda infraestructura.

El template que deberá completarse antes del primer write es
[`TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md`](TASK-1832_CANARY_ASSET_MANIFEST_TEMPLATE.md).

Ninguna de estas decisiones autoriza por sí sola migration apply, datos, flags, push, PR o deploy.
