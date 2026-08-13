# ISSUE-152 — El target SEO de Berel mide Chile para una marca cuya demanda está en México

- **Estado:** `open`
- **Detectado:** 2026-08-13, durante la verificación de `TASK-1661` (datos de mercado por keyword)
- **Ambiente:** Producción (base compartida; el cron `ops-seo-rank-capture` está ACTIVO)
- **Severidad:** Alta — no rompe nada, y eso es lo peligroso: produce una serie que se ve sana y no
  mide lo que dice medir
- **Dominio:** `growth.seo`
- **Relacionado:** `TASK-1303` (rank capture, dueña del cron), `TASK-1661` (donde se detectó),
  `TASK-1310` (report cliente que consume esta serie)

## Síntoma

El target `seot-berel-fase0` está configurado con `location_code = '2152'` y `market = 'CL'` (Chile).
La demanda de esas mismas keywords vive en México.

## Evidencia

Consultas al mismo endpoint (`keyword_overview`), mismas keywords, mismo idioma, cambiando sólo el
mercado (verificado 2026-08-13):

| Keyword | Chile (`2152`, lo configurado) | México (`2484`) |
|---|---:|---:|
| `berel` | **30** /mes | **49.500** /mes |
| `berel pintura` | sin fila | 49.500 /mes |
| `pinturas berel precios` | sin fila | 6.600 /mes |
| `colores para recamaras` | 10 /mes | 12.100 /mes |
| `pintura` | 18.100 /mes | 135.000 /mes |

La marca tiene **1.650× más búsquedas de su propio nombre en México que en Chile**. Un nombre de marca
con 30 búsquedas/mes no tiene audiencia en ese país. Además, el propio set monitoreado contiene
términos de español mexicano (`colores para recamaras` — en Chile se dice *dormitorio*).

## Impacto

```sql
SELECT COUNT(*) AS snapshots, MIN(capture_date), MAX(capture_date), COUNT(DISTINCT keyword)
  FROM greenhouse_growth.seo_rank_snapshots s
  JOIN greenhouse_growth.seo_targets t USING (seo_target_id)
 WHERE t.root_domain LIKE '%berel%';
```

**238 snapshots, 31 keywords, del 2025-08-08 al 2026-08-13, USD 0,9967 pagados al proveedor.** Un año
de serie de rankings medida contra el SERP equivocado. 142 de esas mediciones traen posición, así que
la serie **se ve poblada y sana**: nada en el dashboard delata el problema.

Consecuencias:

- La evolución de posiciones de Berel describe un mercado que no es el suyo.
- El cruce SEO↔AEO (`readSeoAeoGap`) usa esa posición como lente SEO.
- El report cliente de `TASK-1310` mostraría un país incorrecto.
- La captura de mercado de `TASK-1661` heredó el error: las 31 capturas de hoy son de Chile.

## Confirmado por el operador (2026-08-13)

**Berel es de México.** El mercado correcto es `2484`/`es`. La hipótesis del dato queda confirmada y
la pregunta "¿será expansión deliberada a Chile?" queda descartada.

## Causa raíz

El target se creó en fase 0 con el mercado por defecto del portafolio (Chile, que es donde opera
Efeonce) en vez del mercado del cliente. No hay validación que contraste el mercado declarado contra
dónde está la demanda real de las keywords del set.

## Por qué NO se corrigió de una vez

Cambiar `location_code` **bifurca la serie histórica**: los 238 snapshots existentes son mediciones de
Chile y la tabla es append-only (no se pueden reescribir ni borrar). Qué pasa con ellos es una
decisión de datos con dueño humano, no un `UPDATE`.

## Solución propuesta

1. ~~Confirmar con el operador cuál es el mercado objetivo real.~~ **Confirmado: México.**
2. **Target nuevo para México + pausar el de Chile.** NO cambiar `location_code` in-place: los 238
   snapshots de Chile quedarían colgando de un target que dice ser México, mezclando dos mercados
   bajo una misma serie **sin ningún marcador que lo delate**. Eso es peor que el problema original.
   Con target nuevo, ambas series quedan íntegras y el lane sirve la de México porque el de Chile
   deja de estar `active`.
3. Re-trackear las 31 keywords sobre el target de México (`trackKeywords`); la membresía es
   append-only y por target, así que no se pierde nada.
4. Revisar si **otros targets** tienen el mismo default heredado.
5. **Guardrail para que no se repita:** al configurar un target, contrastar el volumen del nombre de
   marca en el mercado declarado contra los mercados vecinos y advertir cuando la demanda esté
   claramente en otro país. Es barato (una llamada) y ataca la causa, no el síntoma.

## Verificación al cerrar

- El mercado del target coincide con la demanda medida de sus keywords.
- La serie histórica quedó explicada: o vive en otro target, o está marcada como de otro mercado.
- El resto de los targets fue auditado con el mismo criterio.

## Hallazgo secundario — `keyword_difficulty` no es confiable en español

Verificado con tres sondas independientes (`keyword_overview`, `keyword_overview` con
`include_serp_info: true`, y el endpoint dedicado `bulk_keyword_difficulty`): las tres coinciden, así
que **el parser de Greenhouse es correcto** y el valor lo devuelve el proveedor.

Pero el valor devuelto no es creíble: `pintura` sale con **KD 0 y 135.000 búsquedas/mes en México**.
El campo sí distingue `null` de `0` (`berel` devuelve `null` en Chile y `8` en México), así que el `0`
no es "sin dato": es un 0 afirmado que se leería como "trivialmente fácil".

**Mientras no se contraste con una segunda fuente, la columna de dificultad no se muestra a un
cliente.** El volumen sí es utilizable; la dificultad no.


## Relación con ISSUE-153

El fix propuesto (dos targets, uno pausado) funciona **sólo porque el de Chile deja de estar
`active`**: el lane resuelve el target con `ORDER BY created_at DESC LIMIT 1` entre los activos. Si
alguien reactiva el de Chile, el lane cambia de país **en silencio**. Esa fragilidad es
`ISSUE-153` y no la introduce este fix — la expone.
