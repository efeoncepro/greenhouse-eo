# TASK-673 — Mercado Público Licitaciones Intelligence (POC + Validación de Matcher)

<!-- ═══════════════════════════════════════════════════════════
     ZONE 0 — IDENTITY & TRIAGE
     ═══════════════════════════════════════════════════════════ -->

## Status

- Lifecycle: `complete`
- Priority: `P2`
- Impact: `Medio`
- Effort: `Bajo`
- Type: `implementation`
- Epic: `none`
- Status real: `Implementado`
- Rank: `TBD`
- Domain: `commercial`
- Checkpoint: `auto`
- Blocked by: `none`
- Branch: `develop`
- Legacy ID: `none`
- GitHub Issue: `none`

## Summary

POC standalone (script único) que consume la API pública de Mercado Público (ChileCompra), aplica un matcher de keywords + exclusiones contra el listado diario de licitaciones activas, y emite un CSV con las licitaciones que tienen fit con el catálogo de servicios de Efeonce. Es validación de feasibility del matcher antes de invertir en un módulo de Greenhouse.

Este POC informa el módulo naciente `Comercial > Licitaciones Públicas` descrito en `docs/research/RESEARCH-007-commercial-public-tenders-module.md`. No implementa el módulo productivo ni reemplaza el helper server-side ya creado para detalle y adjuntos.

## Why This Task Exists

Efeonce no tiene un canal sistemático para detectar licitaciones públicas con fit comercial. Hoy se descubren ad-hoc por relaciones personales de los Account Managers o por casualidad. Mercado Público publica ~4.000 licitaciones diarias y muchas caen dentro del catálogo de servicios de Efeonce (creatividad, audiovisual, digital, web, CRM, medios, PR), pero filtrarlas a mano es inviable.

Antes de construir un módulo de Greenhouse para esto, necesitamos validar:

1. Que el matcher de keywords+exclusiones detecta licitaciones reales con fit (recall razonable)
2. Que no produce demasiados falsos positivos (precision razonable)
3. Que el firehose diario de la API es manejable dentro del límite de 10K requests/día del ticket

Este POC es deliberadamente desechable. No vive en Greenhouse, no persiste data, no tiene UI. Solo prueba la hipótesis para informar el diseño del módulo de producción (TASK futura).

## Goal

- Script Python ejecutable que descarga el listado de licitaciones activas del día desde la API de Mercado Público
- Matcher determinístico que clasifica cada licitación por servicios del catálogo Efeonce y bandera exclusiones usando `Nombre`, `Descripcion` e `Items` cuando estén disponibles en el payload
- CSV de salida con: código, nombre, fecha cierre, servicios matched, BU, fit_score, campos matched y preview de descripción/items
- Documento corto de hallazgos (`docs/research/TASK-673-findings.md`) con: # licitaciones procesadas, # matches, distribución de matches por campo (`nombre`, `descripcion`, `items`), % falsos positivos detectados a ojo en una muestra de 50, keywords a agregar/quitar para v2

<!-- ═══════════════════════════════════════════════════════════
     ZONE 1 — CONTEXT & CONSTRAINTS
     ═══════════════════════════════════════════════════════════ -->

## Architecture Alignment

Revisar y respetar:

- `docs/architecture/Greenhouse_Services_Architecture_v1.md` — catálogo canónico de los 14 servicios y sus BU primarias/posibles
- `docs/architecture/GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` — slugs canónicos de business lines (`globe`, `efeonce_digital`, `reach`, `wave`, `crm_solutions`)
- `docs/tasks/complete/TASK-016-business-units-canonical.md` — task histórica que consolidó el catálogo canónico de business units/business lines
- `docs/architecture/GREENHOUSE_COMMERCIAL_FINANCE_DOMAIN_BOUNDARY_V1.md` — frontera canónica Commercial vs Finance
- `docs/research/RESEARCH-007-commercial-public-tenders-module.md` — research del módulo `Comercial > Licitaciones Públicas`

Reglas obligatorias:

- Los slugs de servicio deben coincidir 1:1 con `ef_servicio_especifico` del catálogo (ej. `agencia_creativa`, `produccion_audiovisual`, etc.)
- Los slugs de BU deben coincidir 1:1 con los del registry de Business Units canónicas
- El POC NO modifica nada de Greenhouse — vive aislado, en su propia carpeta
- NO persistir data en Postgres ni BigQuery — solo CSV en disco
- NO commitear el ticket de la API — debe leerse de variable de entorno (`MERCADO_PUBLICO_TICKET`)
- El listado `estado=activas` trae solo campos resumidos (`CodigoExterno`, `Nombre`, `FechaCierre`, `CodigoEstado`). Para usar `Descripcion` e `Items`, el POC hidrata detalle por `codigo` con retry/backoff y rate-limit conservador. Sus resultados siguen siendo baseline/lower-bound: UNSPSC avanzado, adjuntos parseados y scoring productivo quedan para V2/productivo.

## Normative Docs

- API oficial Mercado Público: https://api.mercadopublico.cl/ (sección "Información disponible")
- Endpoint de listado usado: `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?estado=activas&ticket={TICKET}`
- Endpoint de detalle usado por cada licitación evaluada: `https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json?codigo={CODIGO}&ticket={TICKET}`
- Límite de servicio: 10.000 requests/día por ticket — el POC hace 1 request de listado + N requests de detalle para poder evaluar `Descripcion` e `Items`; debe soportar `--limit` para runs acotados.

## Dependencies & Impact

### Depends on

- Ticket de API Mercado Público activo, consumido desde variable de entorno o Secret Manager fuera del repo
- Python 3.11+ disponible en el entorno de ejecución

### Blocks / Impacts

- TASK futura (no creada aún) — diseño del módulo de Mercado Público Intelligence en Greenhouse. Los hallazgos de este POC informarán esa task.

### Files owned

- `scripts/research/mercadopublico-poc/match_licitaciones.py`
- `scripts/research/mercadopublico-poc/keywords.yaml`
- `scripts/research/mercadopublico-poc/README.md`
- `scripts/research/mercadopublico-poc/requirements.txt`
- `docs/research/TASK-673-findings.md`

### Current Repo State

#### Already exists

- Catálogo canónico de 14 servicios en `Greenhouse_Services_Architecture_v1.md`
- Registry de business lines en `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` y contexto histórico en `TASK-016-business-units-canonical.md`
- Research del módulo en `docs/research/RESEARCH-007-commercial-public-tenders-module.md`
- Helper server-side en `src/lib/integrations/mercado-publico/tenders.ts` para detalle por código, descubrimiento de adjuntos y descarga de documentos desde ficha pública

#### Gap

- No existe matcher de fit comercial para oportunidades Mercado Público
- No existe POC standalone para medir ruido/precisión del matching contra el listado diario de licitaciones activas
- No existe la carpeta `scripts/research/` aún — se crea con esta task

<!-- ═══════════════════════════════════════════════════════════
     ZONE 2 — PLAN MODE
     El agente que toma esta task ejecuta Discovery y produce
     plan.md según TASK_PROCESS.md. No llenar al crear la task.
     ═══════════════════════════════════════════════════════════ -->

<!-- ═══════════════════════════════════════════════════════════
     ZONE 3 — EXECUTION SPEC
     ═══════════════════════════════════════════════════════════ -->

## Scope

### Slice 1 — Setup y fetcher

- Crear estructura `scripts/research/mercadopublico-poc/`
- `requirements.txt` con `requests`, `pyyaml`, `python-dotenv`
- Función `fetch_licitaciones_activas(ticket: str) -> dict` que llama al endpoint de listado y retorna el JSON crudo
- Función `fetch_licitacion_detalle(ticket: str, codigo: str) -> dict | None` que hidrata `Descripcion` e `Items` desde el endpoint por código
- Manejo de errores: timeout, ticket inválido, respuesta vacía, HTTP 429 con backoff y reintentos
- Lectura del ticket desde `os.environ["MERCADO_PUBLICO_TICKET"]`

### Slice 2 — Catálogo de keywords

- `keywords.yaml` con la estructura definida en Detailed Spec §1
- 14 servicios canónicos cubiertos en `services`
- Señales no canónicas cubiertas en `signals`, partiendo por `medios_pr_influencers` para no contaminar `servicios_matched`
- Lista de exclusiones globales

### Slice 3 — Matcher

- Función `normalize(text) -> str` que hace lowercase, remueve tildes y puntuación
- Función `build_match_texts(lic: dict) -> dict[str, str]` que extrae y normaliza texto por campo:
  - `nombre`: `Nombre`
  - `descripcion`: `Descripcion`
  - `items`: concatenación defensiva de `Items.Listado[*].NombreProducto`, `Items.Listado[*].Descripcion`, `Items.Listado[*].EspecificacionComprador` y equivalentes si existen
- Función `match_licitacion(lic: dict, catalog: dict) -> List[ServiceMatch]` con la lógica:
  1. Construir textos por campo (`nombre`, `descripcion`, `items`) y un texto combinado para exclusiones
  2. Si matchea cualquier exclusión global → retornar lista vacía
  3. Para cada servicio en catalog, buscar si alguna keyword aparece como substring en cada campo
  4. Retornar lista de matches con `servicio`, `bu`, `keyword_hit`, `matched_field`
  5. Dedupe por `servicio + keyword_hit + matched_field`
- Registrar en README/findings que esta versión hidrata detalle por código para evaluar `Descripcion` e `Items`, pero deja UNSPSC avanzado, adjuntos y scoring productivo para V2/productivo.
- Función `compute_fit_score(matches, fecha_cierre, fecha_hoy) -> int`:
  - Base 50 si hay al menos un match
  - +5 por cada servicio adicional matched (cap a +20)
  - +8 si hay al menos un match en `items`
  - +5 si hay al menos un match en `descripcion`
  - +10 si días a cierre >= 10
  - 0 si 5 <= días a cierre < 10
  - -15 si días a cierre < 5
  - (NOTA: tipo de licitación NO se computa en POC porque el endpoint de listado no lo trae — agregar como follow-up para v2)

### Slice 4 — Output CSV + findings

- Función `export_csv(matched: List[dict], path: str)` que escribe:
  - `codigo_externo`, `nombre`, `descripcion_preview`, `items_preview`, `fecha_cierre`, `servicios_matched` (joined `;`), `business_units` (joined `;`), `keywords_hit` (joined `;`), `matched_fields` (joined `;`), `fit_score`, `dias_a_cierre`
- Imprimir summary stats al stdout: total fetched, total matched, distribución por BU, distribución por `matched_field`, top 10 por fit_score
- Crear `docs/research/TASK-673-findings.md` con secciones vacías para llenar manualmente:
  - Date of run
  - Sample size
  - Quantitative findings (auto-poblado desde stdout del script)
  - Qualitative review (manual: revisar 50 matches a ojo y anotar falsos positivos)
  - Keywords to add
  - Keywords to remove
  - Recommended next steps for production module

## Out of Scope

- Persistencia en BigQuery o Postgres
- Fetch de adjuntos, documentos y UNSPSC avanzado
- UI / dashboard
- Notificaciones por email o Slack
- Cron / scheduling automático
- Multi-tenant (el POC corre solo para Efeonce, no para clientes)
- Embeddings / NLP / LLM scoring
- Categorías UNSPSC (requiere fetch de detalle)
- Integración con Greenhouse, Notion, HubSpot u otros sistemas

## Detailed Spec

### §1. Estructura de `keywords.yaml`

```yaml
servicios:

  agencia_creativa:
    bu: globe
    keywords:
      - "agencia creativa"
      - "campaña publicitaria"
      - "campaña comunicacional"
      - "campaña de difusión"
      - "campaña de marketing"
      - "creatividad publicitaria"
      - "conceptualización creativa"
      - "identidad visual"
      - "identidad gráfica"
      - "identidad de marca"
      - "branding"
      - "manual de marca"
      - "brandbook"
      - "naming"
      - "isologotipo"
      - "rediseño de marca"

  produccion_audiovisual:
    bu: globe
    keywords:
      - "producción audiovisual"
      - "producción de video"
      - "spot publicitario"
      - "spot de televisión"
      - "registro audiovisual"
      - "cobertura audiovisual"
      - "cobertura fotográfica"
      - "fotografía profesional"
      - "cápsula audiovisual"
      - "cápsula de video"
      - "documental"
      - "animación"
      - "motion graphics"
      - "post producción"
      - "edición de video"
      - "realización audiovisual"

  social_media_content:
    bu: globe
    keywords:
      - "redes sociales"
      - "social media"
      - "community manager"
      - "gestión de redes"
      - "administración de redes"
      - "contenido digital"
      - "contenido para redes"
      - "parrilla de contenidos"
      - "plan de contenidos"
      - "gestión de contenidos digitales"

  social_care_sac:
    bu: efeonce_digital
    keywords:
      - "atención digital al ciudadano"
      - "atención al cliente digital"
      - "moderación de comentarios"
      - "gestión de comentarios"
      - "monitoreo de menciones"
      - "social listening"

  performance_paid_media:
    bu: efeonce_digital
    keywords:
      - "pauta digital"
      - "publicidad digital"
      - "campaña digital"
      - "google ads"
      - "meta ads"
      - "performance digital"
      - "marketing digital"
      - "gestión de campañas digitales"
      - "compra programática"
      - "programmatic"

  seo_aeo:
    bu: efeonce_digital
    keywords:
      - "SEO"
      - "posicionamiento web"
      - "posicionamiento orgánico"
      - "optimización de buscadores"
      - "search engine optimization"
      - "auditoría SEO"

  email_marketing_automation:
    bu: efeonce_digital
    keywords:
      - "email marketing"
      - "mailing masivo"
      - "envío de correos masivos"
      - "newsletter"
      - "marketing automation"
      - "automatización de marketing"

  data_analytics:
    bu: efeonce_digital
    keywords:
      - "analítica digital"
      - "analítica web"
      - "google analytics"
      - "dashboard de marketing"
      - "reportería digital"
      - "business intelligence marketing"
      - "looker studio"
      - "data studio"

  research_estrategia:
    bu: efeonce_digital
    keywords:
      - "estudio de mercado"
      - "investigación de mercado"
      - "estudio cuantitativo"
      - "estudio cualitativo"
      - "focus group"
      - "encuesta de percepción"
      - "encuesta de satisfacción"
      - "segmentación de audiencias"
      - "research"

  desarrollo_web:
    bu: wave
    keywords:
      - "desarrollo web"
      - "desarrollo de sitio web"
      - "diseño y desarrollo web"
      - "sitio web"
      - "página web"
      - "plataforma web"
      - "portal web"
      - "intranet"
      - "landing page"
      - "e-commerce"
      - "comercio electrónico"
      - "tienda online"
      - "CMS"
      - "wordpress"
      - "drupal"
      - "rediseño web"
      - "migración web"

  diseno_ux:
    bu: wave
    keywords:
      - "diseño UX"
      - "experiencia de usuario"
      - "UX/UI"
      - "diseño UX/UI"
      - "prototipo de aplicación"
      - "wireframe"
      - "diseño de interfaz"
      - "estudio de usabilidad"
      - "user experience"

  consultoria_crm:
    bu: crm_solutions
    keywords:
      - "implementación CRM"
      - "consultoría CRM"
      - "sistema CRM"
      - "gestión de relación con clientes"
      - "fidelización digital"
      - "customer relationship management"

  licenciamiento_hubspot:
    bu: crm_solutions
    keywords:
      - "hubspot"
      - "licencias hubspot"

  implementacion_onboarding:
    bu: crm_solutions
    keywords:
      - "onboarding CRM"
      - "configuración CRM"
      - "puesta en marcha CRM"

signals:
  medios_pr_influencers:
    bu: reach
    keywords:
      - "agencia de medios"
      - "central de medios"
      - "planificación de medios"
      - "compra de medios"
      - "avisaje"
      - "difusión publicitaria"
      - "campaña de medios"
      - "relaciones públicas"
      - "RRPP"
      - "comunicaciones estratégicas"
      - "vocería"
      - "vocerías"
      - "estrategia de comunicaciones"
      - "publicity"
      - "gestión de prensa"
      - "marketing de influencia"
      - "influencers"

exclusiones_globales:
  # Infraestructura física
  - "agua potable"
  - "alcantarillado"
  - "red eléctrica"
  - "redes eléctricas"
  - "red sanitaria"
  - "red de gas"
  - "red de incendio"
  - "vialidad"
  - "asfalto"
  - "hormigón"
  - "pavimento"
  - "obras civiles"
  - "obras viales"
  # Salud asistencial
  - "video laringoscopio"
  - "videocolonoscopio"
  - "videoendoscopio"
  - "broncoscopio"
  - "ecógrafo"
  - "videovigilancia"
  - "CCTV"
  - "circuito cerrado"
  # Insumos físicos
  - "producción de uniformes"
  - "producción agrícola"
  - "producción ganadera"
  - "alimentos"
  - "banquetería"
  - "combustible"
  - "ferretería"
  - "repuestos"
  - "neumáticos"
  # Mantenciones físicas
  - "mantención de vehículos"
  - "mantención de edificios"
  - "mantención de calderas"
  - "mantención de ascensores"
  - "aseo y limpieza"
  - "servicio de aseo"
```

### §2. Estructura del CSV de salida

```
codigo_externo,nombre,descripcion_preview,items_preview,fecha_cierre,dias_a_cierre,servicios_matched,business_units,keywords_hit,matched_fields,fit_score
1029940-4-LE26,"SERVICIOS DE DISEÑO POLÍTICA NACIONAL DE MUSEOS","Diseño de identidad visual...","Servicio de diseño gráfico...",2026-05-04T18:00:00,8,"agencia_creativa","globe","identidad visual","descripcion;items",68
```

### §3. Estructura de `match_licitaciones.py` (esqueleto)

```python
import os
import sys
import csv
import unicodedata
import string
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml

API_URL = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json"
KEYWORDS_PATH = Path(__file__).parent / "keywords.yaml"

def normalize(text: str) -> str:
    text = text.lower()
    text = "".join(c for c in unicodedata.normalize("NFD", text) if unicodedata.category(c) != "Mn")
    text = text.translate(str.maketrans("", "", string.punctuation))
    return " ".join(text.split())

def load_catalog(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)

def fetch_licitaciones_activas(ticket: str) -> dict:
    response = requests.get(
        API_URL,
        params={"estado": "activas", "ticket": ticket},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()

def truncate_preview(text: str, max_len: int = 180) -> str:
    normalized = " ".join((text or "").split())
    return normalized[:max_len]

def build_match_texts(lic: dict) -> dict[str, str]:
    items = lic.get("Items") or {}
    raw_items = items.get("Listado") if isinstance(items, dict) else []
    item_chunks = []
    if isinstance(raw_items, list):
        for item in raw_items:
            if not isinstance(item, dict):
                continue
            item_chunks.extend([
                str(item.get("NombreProducto") or ""),
                str(item.get("Descripcion") or ""),
                str(item.get("EspecificacionComprador") or ""),
                str(item.get("EspecificacionesComprador") or ""),
            ])
    return {
        "nombre": str(lic.get("Nombre") or ""),
        "descripcion": str(lic.get("Descripcion") or ""),
        "items": " ".join(chunk for chunk in item_chunks if chunk),
    }

def match_licitacion(lic: dict, catalog: dict) -> list:
    texts = build_match_texts(lic)
    combined_norm = normalize(" ".join(texts.values()))
    # Exclusiones primero
    for excl in catalog.get("exclusiones_globales", []):
        if normalize(excl) in combined_norm:
            return []
    # Match positivo
    matches = []
    seen = set()
    for servicio_id, config in catalog["servicios"].items():
        for field, text in texts.items():
            text_norm = normalize(text)
            if not text_norm:
                continue
            for kw in config["keywords"]:
                if normalize(kw) in text_norm:
                    key = (servicio_id, kw, field)
                    if key in seen:
                        continue
                    seen.add(key)
                    matches.append({
                        "servicio": servicio_id,
                        "bu": config["bu"],
                        "keyword_hit": kw,
                        "matched_field": field,
                    })
                    break
    return matches

def compute_fit_score(matches: list, fecha_cierre_iso: str) -> tuple[int, int]:
    if not matches:
        return 0, 0
    score = 50
    servicios = {m["servicio"] for m in matches}
    matched_fields = {m["matched_field"] for m in matches}
    score += min(len(servicios) - 1, 4) * 5
    if "items" in matched_fields:
        score += 8
    if "descripcion" in matched_fields:
        score += 5
    try:
        cierre = datetime.fromisoformat(fecha_cierre_iso.replace("Z", "+00:00"))
        if cierre.tzinfo is None:
            cierre = cierre.replace(tzinfo=timezone.utc)
        dias = (cierre - datetime.now(timezone.utc)).days
        if dias >= 10:
            score += 10
        elif dias < 5:
            score -= 15
    except Exception:
        dias = -1
    return score, dias

def export_csv(rows: list, path: Path) -> None:
    fieldnames = [
        "codigo_externo", "nombre", "descripcion_preview", "items_preview",
        "fecha_cierre", "dias_a_cierre", "servicios_matched", "business_units",
        "keywords_hit", "matched_fields", "fit_score",
    ]
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)

def main():
    ticket = os.environ.get("MERCADO_PUBLICO_TICKET")
    if not ticket:
        print("ERROR: MERCADO_PUBLICO_TICKET no está definido", file=sys.stderr)
        sys.exit(1)

    catalog = load_catalog(KEYWORDS_PATH)
    print(f"Fetching licitaciones activas...", file=sys.stderr)
    data = fetch_licitaciones_activas(ticket)
    total = data.get("Cantidad", 0)
    listado = data.get("Listado", [])
    print(f"Fetched {total} licitaciones", file=sys.stderr)

    rows = []
    bu_counter = {}
    field_counter = {}
    for lic in listado:
        nombre = lic.get("Nombre", "")
        texts = build_match_texts(lic)
        matches = match_licitacion(lic, catalog)
        if not matches:
            continue
        fecha_cierre = lic.get("FechaCierre", "")
        score, dias = compute_fit_score(matches, fecha_cierre)
        servicios = sorted({m["servicio"] for m in matches})
        bus = sorted({m["bu"] for m in matches})
        keywords_hit = sorted({m["keyword_hit"] for m in matches})
        matched_fields = sorted({m["matched_field"] for m in matches})
        for bu in bus:
            bu_counter[bu] = bu_counter.get(bu, 0) + 1
        for field in matched_fields:
            field_counter[field] = field_counter.get(field, 0) + 1
        rows.append({
            "codigo_externo": lic.get("CodigoExterno", ""),
            "nombre": nombre,
            "descripcion_preview": truncate_preview(texts["descripcion"]),
            "items_preview": truncate_preview(texts["items"]),
            "fecha_cierre": fecha_cierre,
            "dias_a_cierre": dias,
            "servicios_matched": ";".join(servicios),
            "business_units": ";".join(bus),
            "keywords_hit": ";".join(keywords_hit),
            "matched_fields": ";".join(matched_fields),
            "fit_score": score,
        })

    rows.sort(key=lambda r: r["fit_score"], reverse=True)
    output_path = Path(f"licitaciones-matched-{datetime.now().strftime('%Y%m%d')}.csv")
    export_csv(rows, output_path)

    print(f"\n=== SUMMARY ===", file=sys.stderr)
    print(f"Total fetched: {total}", file=sys.stderr)
    print(f"Total matched: {len(rows)}", file=sys.stderr)
    print(f"By BU:", file=sys.stderr)
    for bu, count in sorted(bu_counter.items(), key=lambda x: -x[1]):
        print(f"  {bu}: {count}", file=sys.stderr)
    print(f"By matched field:", file=sys.stderr)
    for field, count in sorted(field_counter.items(), key=lambda x: -x[1]):
        print(f"  {field}: {count}", file=sys.stderr)
    print(f"\nTop 10 by fit_score:", file=sys.stderr)
    for r in rows[:10]:
        print(f"  [{r['fit_score']}] {r['codigo_externo']} — {r['nombre'][:80]}", file=sys.stderr)
    print(f"\nCSV exported to: {output_path}", file=sys.stderr)

if __name__ == "__main__":
    main()
```

### §4. README.md del POC

Debe incluir:

- Cómo setup (`pip install -r requirements.txt`)
- Cómo definir `MERCADO_PUBLICO_TICKET`
- Cómo correr (`python match_licitaciones.py`)
- Output esperado
- Disclaimer: este es un POC de research, no se mantiene como sistema de producción
- Disclaimer: el matcher usa solo campos disponibles en el listado `estado=activas` (`Nombre`, `Descripcion`, `Items` si vienen); subestima oportunidades donde el fit aparece solo en detalle enriquecido, UNSPSC o adjuntos

<!-- ═══════════════════════════════════════════════════════════
     ZONE 4 — VERIFICATION & CLOSING
     ═══════════════════════════════════════════════════════════ -->

## Acceptance Criteria

- [ ] Script `match_licitaciones.py` corre exitosamente con `MERCADO_PUBLICO_TICKET` válido y produce un CSV
- [ ] El CSV contiene al menos los 11 campos especificados en Slice 4
- [ ] El stdout incluye summary stats con total fetched, total matched, distribución por BU, distribución por `matched_field`, y top 10 por score
- [ ] Cada match registra `matched_fields` con al menos uno de `nombre`, `descripcion`, `items`
- [ ] `keywords.yaml` cubre los 14 servicios del catálogo y registra `medios_pr_influencers` como `signals`, no como servicio canónico
- [ ] Slugs de servicios y BU coinciden 1:1 con el catálogo canónico (validado con grep contra `Greenhouse_Services_Architecture_v1.md`, `GREENHOUSE_BUSINESS_LINES_ARCHITECTURE_V1.md` y `TASK-016-business-units-canonical.md`)
- [ ] `docs/research/TASK-673-findings.md` existe con la estructura definida en Slice 4 (puede tener secciones manuales sin llenar — el agente solo deja el esqueleto)
- [ ] El ticket NO está hardcodeado ni commiteado en ningún archivo
- [ ] El POC vive aislado en `scripts/research/mercadopublico-poc/` y no toca ninguna parte de Greenhouse

## Verification

- Validación manual: correr el script con un ticket válido en local, revisar el CSV producido, verificar que tiene >0 filas y que las top entries por score parecen plausibles
- `python -c "import yaml; yaml.safe_load(open('scripts/research/mercadopublico-poc/keywords.yaml'))"` no falla
- `rg "<prefijo-real-del-ticket>" scripts docs .env.example project_context.md Handoff.md` retorna vacío cuando se reemplace el placeholder por el prefijo real local del ticket (no hay ticket commiteado)
- `pnpm lint` y `pnpm build` deben correr para esta ejecución aunque el POC sea Python aislado, porque la task se implementa dentro del repo Greenhouse y esta sesión lo exige como gate final.

## Closing Protocol

- [ ] `Lifecycle` del markdown sincronizado con estado real (`in-progress` al tomarla, `complete` al cerrarla)
- [ ] El archivo vive en la carpeta correcta (`to-do/`, `in-progress/` o `complete/`)
- [ ] `docs/tasks/README.md` sincronizado con el cierre
- [ ] `Handoff.md` actualizado con: fuente de ticket usada sin exponer valor ni datos personales; aprendizajes sobre la API; recomendación para v2
- [ ] Si el POC produjo hallazgos relevantes → crear TASK derivada para módulo de producción en Greenhouse
- [ ] El CSV producido NO se commitea al repo (es un artefacto, no código)

## Follow-ups

- Diseñar TASK siguiente para módulo de producción en Greenhouse: ¿BU de Reach? ¿Vista en Home/Nexa? ¿Notificaciones a Account Managers?
- Diseñar en V2 el fetch productivo de detalle, adjuntos y documentos con cache, cuotas, observabilidad y persistencia; el POC solo hidrata detalle mínimo para scoring exploratorio.
- Considerar embeddings (Vertex AI Text Embeddings) como re-ranker sobre los matches de keywords si precision/recall del POC son insuficientes
- Evaluar si conviene solicitar tickets adicionales para continuidad operacional y cupos independientes, respetando las condiciones de uso de ChileCompra.

## Open Questions

- ¿El ticket actual debe seguir siendo el canal único del POC, o se solicitan tickets adicionales para otros miembros habilitados del equipo? Cada ticket tiene cupo independiente de 10K/día, sujeto a condiciones de uso de ChileCompra.
- ¿Las licitaciones cerradas o adjudicadas tienen valor para benchmark histórico (ver qué tipo de licitaciones gana la competencia)? Ese sería un caso de uso V2 con scope distinto.
