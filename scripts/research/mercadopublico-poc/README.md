# TASK-673 Mercado Público POC

POC aislado para medir oportunidades comerciales en licitaciones públicas activas. No persiste en Greenhouse, Postgres ni BigQuery: solo lee la API pública de Mercado Público y genera CSV local.

## Setup

```bash
cd scripts/research/mercadopublico-poc
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
read -s MERCADO_PUBLICO_TICKET
export MERCADO_PUBLICO_TICKET
python match_licitaciones.py --limit 100
```

En ambientes compartidos Greenhouse, el secreto canónico vive como `MERCADO_PUBLICO_TICKET_SECRET_REF=greenhouse-mercado-publico-ticket`. Este POC Python standalone lee `MERCADO_PUBLICO_TICKET` para evitar acoplarse al runtime Next.js.

## Uso

```bash
python match_licitaciones.py
python match_licitaciones.py --limit 250 --sleep-seconds 0.15
python match_licitaciones.py --output /tmp/licitaciones-matched.csv
```

El listado `estado=activas` solo trae código, nombre y fecha de cierre. Para evaluar `descripcion` e `items`, el script hidrata el detalle de cada licitación por código, con retry/backoff y pausa configurable.

## Output

Por defecto escribe en `output/licitaciones-matched-YYYYMMDD-HHMMSS.csv`, ignorado por Git. El CSV incluye:

- `codigo_externo`
- `nombre`
- `descripcion_preview`
- `items_preview`
- `fecha_cierre`
- `dias_a_cierre`
- `servicios_matched`
- `signals_matched`
- `business_units`
- `keywords_hit`
- `matched_fields`
- `fit_score`

`servicios_matched` solo contiene slugs canónicos del catálogo Greenhouse. Señales no canónicas como `medios_pr_influencers` se registran en `signals_matched`.

## Límites conocidos

- Es un matcher determinístico por keywords; no usa embeddings ni LLM.
- No descarga adjuntos ni bases técnicas.
- No persiste trazas de sync ni watermarks.
- No modela tenant isolation porque no toca la base de datos.
- Los resultados deben revisarse manualmente antes de convertirlos en módulo productivo.
