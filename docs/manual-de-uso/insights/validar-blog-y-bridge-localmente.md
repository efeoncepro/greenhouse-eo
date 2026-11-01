# Validar localmente medición Blog y bridge operativo

Herramienta de TASK-2094, candidata. No crea cuentas ni informes reales. Ver
[contrato](../../architecture/EFEONCE_INSIGHTS_BLOG_MEASUREMENT_CONTRACT_V1.md) y
[evaluación](../../audits/client-portal/2026-11-01-sky-real-component-validation/README.md).

## Ejecutar

Requiere macOS con `/usr/bin/sandbox-exec`, PostgreSQL 16 instalado en
`/opt/homebrew/opt/postgresql@16/bin`, Node y dependencias locales del repositorio.
Desde la raíz:

```sh
node scripts/experiments/sky-measurement-bridge/run-local.mjs
```

No acepta argumentos, host, URL ni credenciales. No cargar .env ni usar comandos de migración, doctor cloud,
conexiones compartidas o corridas proveedor para ejecutar esta suite. El runner crea `/tmp/sky-2094-*`,
inicializa PG sin red IP y verifica data_directory; luego invoca su config Vitest dentro del sandbox.
Los archivos `.local-spec.ts` sólo entran por esta config y quedan fuera de los patrones normales de Vitest.
El setup rechaza ejecución sin socket privado. Tablas de dependencia son mínimas, fixtures sintéticas.

Resultado transitorio: `.captures/sky-2094-results.json` (ignorado). El runner devuelve código no-cero ante
fallo y detiene/retira su cluster en finally, también ante fallo de tests. Una interrupción fatal del proceso
puede requerir revisar exclusivamente su propio directorio; nunca detener todos los postgres de la máquina.

## Interpretar

- PASS de CURRENT GAP significa reproducción de un problema vigente.
- PASS del contrato certifica reglas sobre recibos sintéticos, no veracidad de un proveedor ni permisos.
- complete_candidate no emite ni autoriza un informe. Preview_only deja motivos explícitos.
- Las pruebas con PG prueban los componentes importados y SQL copiado, no la instalación productiva.
- No sumar estos casos a los 59 escenarios integrales pendientes ni al simulador anterior.

Para actualizar la evidencia versionada, conservar resultados por caso y hashes de las fuentes ejercitadas,
separar las fronteras mock y escribir qué nuevas afirmaciones quedaron probadas. Mantener propuestas las
reglas de suficiencia y el ADR hasta contar con evidencia de acceso, ownership e historia completa.
