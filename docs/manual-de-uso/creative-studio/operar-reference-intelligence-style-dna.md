# Operar Reference Intelligence / Style DNA en Globe

> Runbook · TASK-1494 · estado: desplegado internal-only; canary positivo bloqueado

## Preflight

Antes de habilitar un análisis real, confirmar en el runtime objetivo:

- migración `0009_reference_intelligence_style_dna.sql` aplicada y con readback tenant-scoped;
- asset provenance y bucket privado configurados (`GLOBE_LAB_INPUT_BUCKET`), sin acceso público;
- `GLOBE_LAB_PROVIDER=vertex` o `composite`; `fake` no ofrece análisis semántico;
- `GLOBE_LAB_ENABLED=true`, cap diario vigente y grants/capability del caller verificados;
- ADC/WIF de la runtime SA permite usar Vertex; no montar API keys ni imprimir tokens;
- rollback acordado: apagar `GLOBE_LAB_ENABLED` o volver el provider a `fake` y redesplegar.

Al 2026-07-22 la migración, bucket, provider `composite`, kill switch, cap y despliegue fueron verificados en
el runtime internal. El workspace `greenhouse-org:efeonce` devolvió cero assets de provenance, por lo que el
canary positivo no debe ejecutarse hasta que exista una imagen interna no sensible, activa, limpia, con
derechos/consentimiento verificados y `eligibleForGeneration=true` por el flujo gobernado normal.

## Analizar una referencia

Despachar por el command canónico `globe.lab.reference.analyze`:

```json
{
  "referenceAssetId": "asset_...",
  "analysisModelVersion": "style-dna-gemini-2.5-flash-v1"
}
```

No enviar bytes, URLs, bucket keys, nombres de modelo alternativos ni payloads del proveedor. Un éxito retorna
`profile` y `cacheStatus`. Guardar `profileRef`; un segundo command sobre los mismos bytes debe responder `hit`.

## Leer y usar evidencia

1. Leer `globe.lab.reference.profile.get` con el `profileRef` dentro del mismo workspace.
2. Revisar que paleta, scores, composición, `referenceRights`, versiones de modelo/algoritmo y `producedAt`
   estén presentes; los scores son confianza, no calidad.
3. Crear/versionar estilos con `globe.producer.style.create` y
   `globe.producer.style.version.create`; el caller declara modos/fuerza y compatibilidad, nunca una instrucción
   compilada.
4. Antes de un run, resolver `globe.producer.style.materialize` o usar el selector de estilo soportado. La
   evidencia efectiva debe fijar `styleId`, versión y `profileRef`.
5. `globe.producer.route.recommend` es read-only: comprobar que no reservó créditos. Registrar por separado la
   recomendación, selección humana y ejecución con `globe.producer.route.decision.record`.

## Canary autorizado

Con una referencia interna no sensible y un cap bajo:

1. ejecutar un primer análisis y comprobar `miss` + aumento acotado del fence;
2. repetirlo y comprobar `hit` sin nuevo gasto;
3. leer el perfil por API y verificar que no expone bytes, storage handles ni texto crudo del proveedor;
4. materializar un estilo y ejecutar una ruta compatible, verificando la evidencia aplicada;
5. probar asset de otro workspace, versión inventada, MIME no imagen, derechos no elegibles, provider ausente y
   kill switch OFF; todos deben fallar cerrados con errores saneados;
6. registrar revisión/imagen desplegada, migración, configuración no secreta, consumo y readback en
   `GLOBE_RUNTIME_HANDOFF.md`.

No habilitar `GLOBE_ASSET_PROVENANCE_ENABLED`, insertar filas manualmente ni promover una ruta de generación
solo para fabricar el fixture del canary. Esos cambios tienen gates de seguridad/readiness propios. Cuando un
asset elegible exista naturalmente, repetir este canary con cap máximo de 10 créditos; el estimate vigente del
analizador es 4 créditos.

## Diagnóstico

- `invalid_request`: payload o versión distinta de `style-dna-gemini-2.5-flash-v1`.
- `not_found`: asset/perfil ausente, ajeno o no elegible.
- `dependency_unavailable`: revisar store, bucket, provider y ADC sin mostrar sus valores.
- `conflict`: existe un lease activo; no forzar un segundo gasto, esperar expiración/reconciliación.
- `policy_blocked`: el Lab está apagado; no eludir el kill switch.

Documentación funcional: [Style DNA](../../documentation/creative-studio/efeonce-globe-reference-intelligence-style-dna.md).
