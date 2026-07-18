# Web Agéntica cover iteration V1

> **Estado:** candidatos locales; ninguno seleccionado, derivado, subido ni integrado.
> **Generador:** built-in `image_gen`.
> **Fecha:** 2026-07-18.
> **Concept ID:** `WAG-V01`; la portada publicada/privada vigente no fue reemplazada.

## Diagnóstico del cover vigente

El cover actual tiene centro óptico fuerte y comunica convergencia, pero usa códigos muy frecuentes de IA:
mano humana, interfaz azul, malla luminosa y estética sci-fi. Además, sus archivos locales en `tmp/` no coinciden
con las dimensiones registradas en el manifest, por lo que no deben usarse como lineage durable de una nueva
versión.

## Candidatos

| ID | Dirección | Tesis | Premium | Ownability | Crop | Riesgo principal |
|---|---|---:|---:|---:|---:|---|
| A | Shared threshold | 9/10 | 8/10 | 7/10 | 9/10 | conserva mano y portal; todavía roza sci-fi |
| B | Dual surface | 7/10 | 9/10 | 9/10 | 8/10 | se lee como libro físico más que como web |
| C | Second visitor | 8/10 | 9/10 | 9/10 | 9/10 | puede sugerir dos sistemas enfrentados si no se refina el núcleo |

## Recomendación

Usar **C** como base de una segunda iteración. Tiene el lenguaje más propio, evita personajes/robots/dashboard y
traduce mejor gobierno, accesos y evidencia. El refinamiento debe convertir las dos placas centrales en una sola
infraestructura continua con dos entradas y un mismo registro, reduciendo el contraste “dos bandos”.

No integrar todavía. La siguiente ronda debe:

1. editar C, no regenerar su identidad desde cero;
2. probar crop `1600×900`, OG `1440×757` y card cuadrada;
3. componer cualquier firma con activos oficiales después de aprobar el master;
4. generar WebP featured + JPEG OG desde el master seleccionado;
5. registrar hashes/bytes/dimensiones reales y subir nuevos Media IDs sin sobrescribir URLs cacheadas;
6. actualizar WAG-V01 con lineage `supersedes`, snapshot/rollback y QA privado.

## Provenance

- `wag-cover-a-shared-threshold.png` — SHA-256 `685665a3cbc82c7d2cb25109b486983b5f6efb3059726b10a00400cf85063efd`.
- `wag-cover-b-dual-surface.png` — SHA-256 `e51e3d974cf15133ef2acc76f80f0866826d185c0c8c55d2b75678a489ff0eb1`.
- `wag-cover-c-second-visitor.png` — SHA-256 `55cdccd629644e39d469deefcadf8b467895fe0c83ef8f1dd470359ec7a85539`.

Todos miden `1672×941`, RGB. No contienen texto/logos y son masters conceptuales sin derechos de terceros
declarados. Los prompts exactos viven en `prompts/`; una versión seleccionada debe promover prompt, request/tool
provenance y derivados al manifest durable antes de integración.
