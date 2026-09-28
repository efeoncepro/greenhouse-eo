# Protección de Rutas Públicas — Conexiones a la Base de Datos

> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-09-28 por Claude (TASK-1876)
> **Ultima actualizacion:** 2026-09-28 por Claude
> **Documentacion tecnica:** [GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md](../../architecture/GREENHOUSE_POSTGRES_CONNECTION_POOLING_V1.md) §V1.3

## Qué problema resuelve

El portal tiene rutas que cualquiera puede llamar sin iniciar sesión: formularios, el Grader, postulaciones,
informes compartidos por enlace. Todas usan la misma base de datos que el resto del portal, y esa base es
única para desarrollo, staging y producción. Si alguien dispara muchas llamadas seguidas a una de esas rutas,
cada llamada abre conexiones y la base se queda sin espacio para atender a nadie más, incluidos los usuarios
de producción. Eso pasó el 18 de septiembre de 2026 (incidente ISSUE-174).

## Cómo funciona ahora

| Protección | En palabras simples |
|---|---|
| Límite en la puerta | Antes de llegar al portal, Vercel cuenta cuántas llamadas a rutas públicas hace cada dirección IP. Más de 20 en 10 segundos recibe «demasiadas solicitudes» (429) sin tocar la base. |
| Conexiones que no se quedan colgadas | Las conexiones abiertas desde Vercel se cierran solas tras 1 minuto sin uso (antes, 5 minutos). |
| Aviso cuando la base se llena | Google registra cada minuto cuántas conexiones hay. Si pasan de 85 por dos minutos, llega un aviso al canal de alertas, y el panel de fiabilidad muestra el pico del último día aunque ya haya pasado. |

## Qué ve una persona

- Un visitante normal no nota nada: 20 llamadas en 10 segundos es mucho más de lo que hace un navegador.
- Quien dispare una ráfaga recibe «demasiadas solicitudes» y puede reintentar unos segundos después.
- En producción el límite empieza en modo observación (sólo registra) hasta confirmar con tráfico real que no
  afecta a clientes; en staging ya bloquea.

## Qué no cubre

Un ataque repartido entre muchas direcciones IP no lo frena un límite por IP. Si el aviso muestra ese patrón,
el siguiente paso es un multiplexor de conexiones (TASK-847) o el modo de desafío del Firewall de Vercel.

> Detalle técnico: reglas en `src/lib/security/public-burst-guard/firewall-rules.ts`, timeout en
> `src/lib/postgres/client.ts`, señal en `src/lib/reliability/queries/postgres-connection-saturation.ts`.
> Operación: [manual](../../manual-de-uso/plataforma/operar-guard-rutas-publicas-y-saturacion-postgres.md).
