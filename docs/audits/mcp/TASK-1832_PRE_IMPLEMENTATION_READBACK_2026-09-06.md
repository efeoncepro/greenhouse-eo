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

No es una fila vacía: ya tiene identificador tributario, commercial party y tres referencias de lifecycle.
Reutilizarla evita crear otra organización en Account 360, pero exige aprobación explícita del operador y el
registry/purpose canary debe impedir que adquiera elegibilidad comercial. No se seleccionó ni modificó.

## Decisiones pendientes

1. Aprobar el plan P0/Alto de `docs/tasks/plans/TASK-1832-plan.md` para iniciar ADR/código local.
2. Aprobar o rechazar `EO-ORG-0050` como organización canary exacta. Crear otra organización no está autorizado
   por inferencia y además necesitaría resolver su visibilidad en Account 360.
3. Identificar las dos cuentas controladas para la matriz: una Microsoft 365 y una Google. Plus-addressing no
   sustituye la segunda infraestructura.

Ninguna de estas decisiones autoriza por sí sola migration apply, datos, flags, push, PR o deploy.
