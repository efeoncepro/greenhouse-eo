# Manual — Conectar Google Search Console a una marca

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0 · **Ultima actualizacion:** 2026-06-29 por Claude (TASK-1282)
>
> **Para que sirve:** conectar la propiedad de Google Search Console de una marca cliente para que Greenhouse lea sus datos reales de busqueda (Search Analytics, solo lectura). Modelo operador-mediado estilo Semrush: conectas tu cuenta de Google una vez y eliges la propiedad de cada cliente desde un menu.

## Antes de empezar

- Necesitas la capability `growth.search_console.connect` (operador interno admin/account/operations/ai_tooling_admin). Sin ella ves el estado pero no los botones.
- El flujo esta **ON en staging**. En produccion aun no (pendiente release control plane).
- **Prerrequisito clave:** la cuenta de Google con la que vas a consentir debe **tener acceso a la propiedad** del cliente en Search Console. El modelo normal: el cliente comparte su propiedad de Search Console con tu correo de operador (ej. `jreyes@efeoncepro.com`). Si tu cuenta no ve la propiedad, no aparecera en el menu.

## Paso a paso

1. Entra al recorrido del cliente: **Agencia → Spaces → (cliente) → ciclo de vida**, o directo a `/agency/clients/<organizationId>/lifecycle`.
2. Ubica el panel **Google Search Console**. Si dice "No conectado", haz clic en **"Conectar con Google"**.
3. Google te lleva a la pantalla de consentimiento. **Inicia sesion con la cuenta de operador** que tiene acceso a la propiedad del cliente.
   - Como la app esta en modo External sin verificar todavia, Google muestra un aviso **"Google no verifico esta app"**. Es esperado: haz clic en **"Configuracion avanzada" → "Ir a Greenhouse Search Console"** para continuar.
4. Acepta el permiso de **solo lectura** de Search Console.
5. Vuelves al panel. Ahora aparece un **menu desplegable con todas tus propiedades**. **Elige la del cliente** (ej. `sc-domain:berel.com`).
6. La conexion pasa a **Conectado** mostrando la propiedad + "Ultima verificacion". Listo: Greenhouse ya lee los datos de busqueda de esa marca.

## Que significan los estados

- **No conectado:** nadie conecto. Boton "Conectar con Google".
- **Pendiente:** tu cuenta esta conectada, falta elegir la propiedad del menu.
- **Conectado:** propiedad elegida y activa.
- **Acceso revocado:** Google revoco el acceso → boton "Reconectar".

## Que no hacer

- No compartas el correo/credenciales del operador fuera del equipo: ese token ve todas las propiedades que te compartieron.
- No elijas una propiedad que no sea del cliente correcto — cada conexion ata una propiedad a una organizacion.
- No esperes datos si la propiedad no esta compartida con tu cuenta: simplemente no aparecera en el menu.

## Problemas comunes

| Sintoma | Causa probable | Solucion |
|---|---|---|
| Google dice **"Acceso bloqueado: org_internal"** | La app esta en modo Internal (solo `@efeonce.org`) | Pasar la app a External en Google Auth Platform (ya hecho para staging). |
| **"No pudimos obtener tus propiedades"** | El runtime no puede leer el token (falta grant `secretAccessor` al SA `greenhouse-portal@` para `search-console-token-*`) | Verificar/aplicar el grant de lectura; ver nota tecnica abajo. |
| El menu no muestra la propiedad del cliente | Tu cuenta de Google no tiene acceso a esa propiedad en Search Console | El cliente debe compartir su propiedad con tu correo de operador. |
| **"La conexion se revoco o expiro"** | Google revoco el acceso | Reconectar desde el panel. |

## Verificar que funciona (operador tecnico)

- Estado en la base: la fila `greenhouse_growth.search_console_connections` de la org debe quedar `status=active` con el `site_url` elegido y `token_secret_ref` apuntando a `search-console-token-operator-<userId>`.
- El reader `readSearchConsoleAnalytics(orgId, …)` debe devolver filas reales de Search Analytics (consultas con clics/impresiones).

## Referencias tecnicas

- Funcional: [conexion-search-console.md](../../documentation/growth/conexion-search-console.md)
- Arquitectura/patron: [GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md](../../architecture/GREENHOUSE_SOURCE_SYNC_PIPELINES_V1.md)
- Spec: [TASK-1282](../../tasks/in-progress/TASK-1282-growth-search-console-multitenant-connection.md)
- **Nota IAM (load-bearing):** el SA runtime `greenhouse-portal@` necesita DOS grants condicionados al prefijo `search-console-token-*`: `secretVersionAdder` (escribir el token) **y** `secretAccessor` (leerlo). El segundo es facil de olvidar — sin el, el listado de propiedades falla con "No pudimos obtener tus propiedades".
