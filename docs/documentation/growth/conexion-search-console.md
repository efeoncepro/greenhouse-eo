> **Tipo de documento:** Documentacion funcional (lenguaje simple)
> **Version:** 1.0
> **Creado:** 2026-06-29 por Claude (TASK-1282)
> **Ultima actualizacion:** 2026-06-29 por Claude (TASK-1282, rollout staging + redesign property-picker)
> **Documentacion tecnica:** [GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md](../../architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md) · [TASK-1282](../../tasks/in-progress/TASK-1282-growth-search-console-multitenant-connection.md)

# Conexion a Google Search Console (Growth)

## Que hace

Permite que Greenhouse lea los **datos reales de busqueda de Google** (Search Analytics: que consultas trajeron clics e impresiones) de la propiedad de Search Console de cada marca cliente. Con esos datos, el portal puede medir la visibilidad organica real de la marca (SEO/AEO) en vez de estimarla.

Ejemplo real: para Grupo Berel, una vez conectada la propiedad `sc-domain:berel.com`, Greenhouse ve que la consulta "berel" trajo 2.807 clics y 21.045 impresiones en los ultimos 30 dias, "pinturas berel" 1.654 clics, etc.

Es **solo lectura**: Greenhouse nunca modifica nada en la Search Console del cliente.

## Como funciona (en simple)

El modelo es **operador-mediado** (como Semrush): un operador de Efeonce conecta **su** cuenta de Google una sola vez, y esa cuenta ve todas las propiedades que los clientes le compartieron. Luego, para cada cliente, el operador elige del menu cual propiedad medir.

1. **Conectar la cuenta (una vez).** El operador entra al recorrido del cliente (Account 360 → tab de ciclo de vida) y hace clic en **"Conectar con Google"**. Google le pide consentimiento (solo lectura de Search Console). Greenhouse guarda un **token de operador** (uno solo, reutilizable entre clientes) de forma segura.
2. **Elegir la propiedad.** Apenas vuelve, el panel muestra un **menu desplegable con todas las propiedades** que la cuenta puede ver. El operador elige la del cliente (ej. `sc-domain:berel.com`). No hay que escribir nada a mano.
3. **Listo.** La conexion queda **Conectada** y Greenhouse puede leer los datos de busqueda de esa propiedad.

Si el acceso se revoca en Google, el panel lo muestra como **Acceso revocado** y ofrece reconectar — nunca muestra datos falsos ni $0.

> Detalle tecnico: el token (refresh) vive en Google Secret Manager, nunca en la base de datos. La fila por organizacion guarda solo metadata (que propiedad, estado, quien conecto) + una referencia al secreto. Patron canonico "el token ES el scope" en `GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md`.

## Quien lo puede operar

Operadores internos de Growth/Account con la capability `growth.search_console.connect` (hoy: admin, account, operations, ai_tooling_admin internos). Quien no la tiene ve el estado pero no los botones (solo lectura).

## Quien consume estos datos

- El **AI Visibility / AEO Grader** (EPIC-020) y el motor de medicion, para cruzar la visibilidad en buscadores con la visibilidad en respuestas de IA.
- Superficies de reporte de busqueda por cliente (a futuro).
- Nexa (puede reportar el estado de conexion por el mismo contrato gobernado).

Todos consumen el **mismo reader canonico** (`readSearchConsoleAnalytics`), no cada uno su propia logica.

## Estados de la conexion

| Estado | Que significa |
|---|---|
| No conectado | Nadie conecto todavia. Boton "Conectar con Google". |
| Pendiente | La cuenta se conecto, falta elegir la propiedad del menu. |
| Conectado | Propiedad elegida y activa; Greenhouse lee Search Analytics. |
| Acceso revocado | Google revoco el acceso; hay que reconectar. |

## Estado del rollout (2026-06-29)

- **staging:** conexion **ON y verificada end-to-end** (Grupo Berel conectado, reader trajo datos reales). App OAuth de Google en modo **External / En produccion** (sin verificacion de Google todavia → el cliente ve un aviso de "app no verificada" al consentir, normal en onboarding guiado).
- **produccion:** pendiente (via release control plane + opcionalmente verificacion de Google para quitar el aviso).

> Detalle tecnico: flag `GROWTH_SEARCH_CONSOLE_ENABLED`. Manual de operacion: [conectar-search-console.md](../../manual-de-uso/growth/conectar-search-console.md).
