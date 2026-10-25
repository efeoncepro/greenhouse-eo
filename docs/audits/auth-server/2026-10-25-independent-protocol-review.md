# Revisión separada de protocolos Auth/Rooms

TASK-1833. Autorización: Julio sustituyó la contratación externa por trabajo de los agentes disponibles.
Revisor inicial `login_discovery`; refutación de código y regresión por coordinador `/root`.
No certificación de tercero; agentes del mismo proveedor. Trabajo local sobre fuente propia y fixtures
aislados; sin ataques al runtime compartido ni correo real.

## Hallazgo confirmado: retorno magic-link

Severidad **media**: `sanitizeReturnTo` rechazaba LF/CR/backslash pero admitía HTAB entre las dos barras
de un retorno relativo. El parser WHATWG puede normalizar ese valor como destino de otro origen.
El agente informó reproducción local mediante el router real, mail/store en memoria y Chromium con
resolución limitada a loopback. No se acreditó robo de sesión/token ni explotación productiva.

Corrección: `src/lib/auth-server/persons/magic-link.ts` rechaza C0/DEL/C1 antes de trim, verifica origen
normalizado, rechaza network-path generado por dot segments y devuelve sólo path/search/hash. El consumo
revalida también continuaciones persistidas antes del parche; sólo cambiar la emisión dejaba registros previos vulnerables.

Refutación del coordinador: lectura del diff y de `persons/return-to-security.test.ts`, y ejecución separada
de las siguientes suites a18:59:50 America/Santiago:

```sh
pnpm exec vitest run src/lib/auth-server/persons/return-to-security.test.ts src/lib/auth-server/persons/person-auth-flow.test.ts src/lib/auth-server/first-party/protocol.test.ts --reporter=dot
```

Resultado: **146 PASS, cero omitidos**. Incluye controles Unicode/control, dot segments, retorno legítimo
con parámetros, idempotencia del saneamiento y registros antiguos; la autenticación válida conserva sesión
sin redirección hostil. Corrección local verificada; todavía no desplegada.

## Comprobaciones independientes adicionales

- First-party/OTP/GC/señales:134 PASS,12 pruebas SQL omitidas en el runner sin conexión. No se cuentan
  esos omitidos como PASS ni se suman suites solapadas para inflar cobertura.
- `python3 scripts/qa/verify-auth-first-party-local-pg.py --otp-smoke`: PASS con PostgreSQL aislado,
  autoridad local, una entrega sólo en memoria, idempotencia, proof ES256 acotado y denegación de replay.
  El proceso detuvo PostgreSQL y eliminó directorio/configuración temporales al terminar.
- La revisión separada del workflow identificó un falso match de referencias de secretos de distinto
  proyecto; corregido en `rooms-config-drift.py`, nueve testsPASS. No fue explotación del runtime.
- Remitente OTP usa subdominio verificado con seguimiento desactivado; evidencia de proveedor y límites
  en [preflight](../identity/TASK-2067-production-preflight-2026-10-25.md). Eso no prueba recepción de correo.

## Cobertura pendiente y bloqueo automático

La revisión de fuente CIMD detectó validación DNS seguida de una segunda resolución no fijada al abrir
conexión, rangosIPv6 comparados por texto y DNS fuera del plazo del fetch. Se preparan correcciones defensivas
y regresiones locales; el resultado final se registra en el [catálogo](AUTH_SERVER_RED_TEAM_2026-10-25.md).
La severidad/alcance no presume exfiltración: HTTPS y validación de certificado continúan siendo fronteras relevantes.

Una subtarea de validación ofensiva fue detenida por revisión automática de seguridad con la razón
«possible cybersecurity risk». No se reintentó con reformulaciones, otro proveedor ni un servicio contratado.
Se continúa únicamente la corrección defensiva y pruebas permitidas. No se declara completada la validación
ofensiva bloqueada ni la refutación de todos los casos del catálogo. Canary productivo, publicación de fixes,
simulacros pendientes y observación temporal mantienen sus criterios abiertos.
