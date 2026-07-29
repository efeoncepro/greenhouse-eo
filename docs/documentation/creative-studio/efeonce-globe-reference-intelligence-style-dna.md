# Efeonce Globe — Reference Intelligence / Style DNA

> Documentación funcional · TASK-1494 · estado: desplegado internal-only; canary positivo bloqueado

Style DNA convierte una imagen de referencia gobernada en evidencia reusable. El resultado no es una nota
libre ni un porcentaje decorativo: es un perfil versionado con paleta ponderada, descriptores visuales con
confianza y una lectura estructurada de composición.

## Flujo funcional

1. Una persona o consumer autorizado elige un asset de imagen ya ingresado y gobernado en su workspace.
2. Globe valida en provenance que el asset pertenece al workspace, está activo, limpio, con derechos
   verificados y habilitado para generación.
3. Globe resuelve los bytes privadamente por su huella `sha256`. El archivo no viaja en el command ni vuelve en
   el reader.
4. La paleta se calcula localmente de forma estable. Estilo y composición se analizan por el mismo seam de
   proveedor del Model Lab, detrás de kill switch y spend fence.
5. El perfil queda cacheado por workspace, hash y versión fija de análisis. Repetir los mismos bytes devuelve
   el perfil guardado y no vuelve a invocar al proveedor.
6. El perfil puede originar un estilo/preset versionado. Al usarlo, Globe materializa server-side los modos
   `match-palette` y/o `match-composition` con una fuerza entre 0 y 1.

## Qué puede reutilizar Producer

- perfiles Style DNA con provenance y derechos preservados;
- estilos versionados con autor, compatibilidad por modalidad/ruta y conditioning inmutable;
- recomendación automática read-only, determinística para versiones fijadas de catálogo/política y sin gasto;
- evidencia separada de ruta recomendada, selección humana y ruta efectivamente ejecutada.

El browser no guarda instrucciones de proveedor ni elige modelos internos. Solo selecciona ids/versiones
gobernadas y recibe proyecciones seguras.

## Estados honestos

- `cacheStatus=miss`: se produjo y persistió un perfil nuevo.
- `cacheStatus=hit`: el perfil ya existía; no hubo análisis facturable nuevo.
- `policy_blocked`: el kill switch está apagado.
- `dependency_unavailable`: falta store, bucket privado, adapter o dependencia de runtime.
- `not_found`: la referencia/perfil no existe en ese workspace o no es elegible; no revela recursos ajenos.
- `conflict`: otro owner conserva el lease de análisis para la misma clave.

## Disponibilidad

Los nueve commands/readers viven en el API Contract Spine y conservan Full API Parity. `mcp` continúa
`policy-blocked`. Al 2026-07-22, migración, provider, bucket, flag y despliegue están activos internal-only en
el SHA `a5e128935577`; API y Studio sirven el 100% desde sus revisiones nuevas. Los negativos live fallan
cerrados como corresponde. El canary positivo todavía no puede producir `miss → hit`: el workspace interno
no contiene assets de provenance y no se habilitará ingesta ni generación sin completar sus gates propios.

Arquitectura: [Model Lab — extensión Style DNA](../../architecture/creative-studio/EFEONCE_GLOBE_MODEL_LAB_V1.md#extensión-reference-intelligence--style-dna-task-1494).
Operación: [Operar Style DNA](../../manual-de-uso/creative-studio/operar-reference-intelligence-style-dna.md).
