# Auth: corrección de despliegue retenida en PR — 2026-10-26

Estado: **PR abiertas; no integrado ni desplegado**. El operador pidió expresamente dejar Auth en PR
tras aclarar que su runtime vive en `greenhouse-eo`, separado del main de Rooms. No fusionar por
inferencia ni presentar preparación como publicación.

- [PR263 → main](https://github.com/efeoncepro/greenhouse-eo/pull/263), HEAD `5e1fc255472427ae245a3a3548ee28fff794f7f6`: nueve paths, control/tests/docs y sólo dos rutas en metadata del watchdog.
- [PR264 → develop](https://github.com/efeoncepro/greenhouse-eo/pull/264), HEAD `aabd6d78d1d73ead4956cce15abc1efd7208472c`: seis paths de control/tests. Sin código de producto Auth ni UI, sin historial local ajeno.
- Contrato propuesto: único servicio production, sólo main/production, checkout SHA exacto publicado,
  lock único sin cancelar deploy activo, drift de flags/montajes/Resend production v1/Sentry production.
  Guard impide sustituir una fuente viva no promovida por código anterior/divergente antes del build.

## Evidencia y límites

22 pruebas Python y 14 Vitest de drift/paridad/watchdog PASS, ambos gates de workers, bash-n, lint/types
y hook normal PASS; árbol publicable main exportado y verificado. Sin bypass de hooks.
CI general inicial detectó dos contratos omitidos en main (21.046 PASS/616skip) y uno en develop
(21.355 PASS/626skip): fixture Cloud Run antiguo y espejo de rutas. Ambos fueron corregidos en los
HEAD arriba; CI general de esos HEAD **pendiente** al cierre. No atribuirle resultado verde aún.

Readback antes de retención: `auth-server-00168-vzb`,100% tráfico,
`GIT_SHA=754a2a28045ebfc9353c86a2d6236ecf59dd805e`, imagen
`sha256:122e2acbed9961741c3c71307f0c9fc616a213f02f59f1ea00a990056e1a8987`.
First-party/OTP false, montajes OTP ausentes y Sentry production; health/ready/discovery200.
No se cambió Cloud Run, variables GitHub, flags, correo ni la PR262. Ningún merge main/develop.

## Integración futura

Revisar CI de los HEAD exactos. Publicar sólo main no neutraliza el workflow remoto de develop:
GitHub evalúa el YAML de la rama receptora. El test modificado bajo `src/lib/**` coincide con filtros
de deploy de artifact/commercial/ico-batch/ops en develop. Antes de integrar264 resolver explícitamente
esa activación indirecta; no disparar esos workers por tratarse de un test. Se investigó una protección
temporal pero **no se aplicó**: ningún workflow ajeno fue deshabilitado/habilitado ni job cancelado.
Después263 debe bloquear antes del build mientras main no contenga el runtime vivo; no forzar un
release amplio para convertirlo en verde. Releer tráfico/imagen/configuración tras una integración autorizada.
