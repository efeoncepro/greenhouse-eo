#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import os
import re
import sys
import time
import unicodedata
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import requests
import yaml

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional local convenience.
    load_dotenv = None


API_BASE_URL = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json"
DEFAULT_TIMEOUT_SECONDS = 30
DEFAULT_SLEEP_SECONDS = 0.2
DEFAULT_RETRIES = 4
CSV_FIELDS = [
    "codigo_externo",
    "nombre",
    "descripcion_preview",
    "items_preview",
    "fecha_cierre",
    "dias_a_cierre",
    "servicios_matched",
    "signals_matched",
    "business_units",
    "keywords_hit",
    "matched_fields",
    "fit_score",
]


@dataclass(frozen=True)
class Match:
    kind: str
    slug: str
    bu: str
    keyword_hit: str
    matched_field: str


def normalize(value: Any) -> str:
    text = "" if value is None else str(value)
    text = unicodedata.normalize("NFD", text)
    text = "".join(char for char in text if unicodedata.category(char) != "Mn")
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def truncate_preview(value: str, limit: int = 220) -> str:
    compact = re.sub(r"\s+", " ", value or "").strip()
    if len(compact) <= limit:
        return compact
    return f"{compact[: limit - 1].rstrip()}..."


def parse_date(value: Any) -> datetime | None:
    if not value:
        return None

    raw = str(value).strip()
    candidates = [
        raw.replace("Z", "+00:00"),
        raw.split(".")[0],
        raw.split("T")[0],
    ]

    for candidate in candidates:
        try:
            parsed = datetime.fromisoformat(candidate)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except ValueError:
            continue

    return None


def days_until(value: Any, now: datetime) -> int | None:
    parsed = parse_date(value)
    if parsed is None:
        return None

    return (parsed.date() - now.date()).days


def request_json(
    session: requests.Session,
    params: dict[str, str],
    *,
    timeout_seconds: int,
    retries: int,
) -> dict[str, Any]:
    last_error: Exception | None = None

    for attempt in range(retries + 1):
        try:
            response = session.get(API_BASE_URL, params=params, timeout=timeout_seconds)

            if response.status_code == 429 or response.status_code >= 500:
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after and retry_after.isdigit() else 2**attempt
                time.sleep(min(delay, 30))
                continue

            response.raise_for_status()
            payload = response.json()

            if not isinstance(payload, dict):
                raise ValueError("Mercado Publico returned a non-object JSON payload")

            return payload
        except (requests.RequestException, ValueError) as error:
            last_error = error
            if attempt >= retries:
                break
            time.sleep(min(2**attempt, 30))

    raise RuntimeError(f"Mercado Publico request failed after {retries + 1} attempts: {last_error}")


def fetch_licitaciones_activas(
    session: requests.Session,
    ticket: str,
    *,
    timeout_seconds: int,
    retries: int,
) -> list[dict[str, Any]]:
    payload = request_json(
        session,
        {"estado": "activas", "ticket": ticket},
        timeout_seconds=timeout_seconds,
        retries=retries,
    )

    listado = payload.get("Listado")
    if not isinstance(listado, list):
        raise RuntimeError("Mercado Publico active tender payload does not include Listado[]")

    return [item for item in listado if isinstance(item, dict)]


def fetch_licitacion_detalle(
    session: requests.Session,
    ticket: str,
    codigo: str,
    *,
    timeout_seconds: int,
    retries: int,
) -> dict[str, Any] | None:
    payload = request_json(
        session,
        {"codigo": codigo, "ticket": ticket},
        timeout_seconds=timeout_seconds,
        retries=retries,
    )

    listado = payload.get("Listado")
    if not isinstance(listado, list) or not listado:
        return None

    detalle = listado[0]
    return detalle if isinstance(detalle, dict) else None


def item_texts(items: Any) -> list[str]:
    if not isinstance(items, dict):
        return []

    listado = items.get("Listado")
    if not isinstance(listado, list):
        return []

    values: list[str] = []
    item_fields = (
        "NombreProducto",
        "Descripcion",
        "EspecificacionComprador",
        "Categoria",
        "UnidadMedida",
    )

    for item in listado:
        if not isinstance(item, dict):
            continue
        for field in item_fields:
            value = item.get(field)
            if value:
                values.append(str(value))

    return values


def build_match_texts(licitacion: dict[str, Any]) -> dict[str, str]:
    nombre = str(licitacion.get("Nombre") or "")
    descripcion = str(licitacion.get("Descripcion") or "")
    items = " ".join(item_texts(licitacion.get("Items")))

    return {
        "nombre": nombre,
        "descripcion": descripcion,
        "items": items,
    }


def matches_exclusion(texts: dict[str, str], exclusions: list[str]) -> bool:
    combined = normalize(" ".join(texts.values()))
    return any(contains_keyword(combined, normalize(exclusion)) for exclusion in exclusions)


def contains_keyword(normalized_text: str, normalized_keyword: str) -> bool:
    if not normalized_text or not normalized_keyword:
        return False

    return f" {normalized_keyword} " in f" {normalized_text} "


def match_bucket(
    bucket: dict[str, Any],
    texts: dict[str, str],
    *,
    kind: str,
) -> list[Match]:
    matches: list[Match] = []
    normalized_texts = {field: normalize(value) for field, value in texts.items()}

    for slug, config in bucket.items():
        if not isinstance(config, dict):
            continue

        bu = str(config.get("bu") or "")
        keywords = config.get("keywords") or []
        if not isinstance(keywords, list):
            continue

        for raw_keyword in keywords:
            keyword = str(raw_keyword)
            normalized_keyword = normalize(keyword)
            if not normalized_keyword:
                continue

            for field, normalized_text in normalized_texts.items():
                if contains_keyword(normalized_text, normalized_keyword):
                    matches.append(
                        Match(
                            kind=kind,
                            slug=str(slug),
                            bu=bu,
                            keyword_hit=keyword,
                            matched_field=field,
                        )
                    )

    unique: dict[tuple[str, str, str, str], Match] = {}
    for match in matches:
        unique[(match.kind, match.slug, match.keyword_hit, match.matched_field)] = match

    return list(unique.values())


def match_licitacion(licitacion: dict[str, Any], catalog: dict[str, Any]) -> list[Match]:
    texts = build_match_texts(licitacion)
    exclusions = catalog.get("global_exclusions") or []

    if isinstance(exclusions, list) and matches_exclusion(texts, [str(item) for item in exclusions]):
        return []

    service_matches = match_bucket(catalog.get("services") or {}, texts, kind="service")
    signal_matches = match_bucket(catalog.get("signals") or {}, texts, kind="signal")
    return service_matches + signal_matches


def compute_fit_score(matches: list[Match], fecha_cierre: Any, now: datetime) -> int:
    if not matches:
        return 0

    matched_services = {match.slug for match in matches if match.kind == "service"}
    matched_fields = {match.matched_field for match in matches}
    score = 50
    score += min(max(len(matched_services) - 1, 0) * 5, 20)

    if "items" in matched_fields:
        score += 8
    if "descripcion" in matched_fields:
        score += 5

    remaining_days = days_until(fecha_cierre, now)
    if remaining_days is not None:
        if remaining_days >= 10:
            score += 10
        elif remaining_days < 5:
            score -= 15

    return max(score, 0)


def join_unique(values: list[str]) -> str:
    return ";".join(sorted({value for value in values if value}))


def row_for_match(licitacion: dict[str, Any], matches: list[Match], now: datetime) -> dict[str, Any]:
    texts = build_match_texts(licitacion)

    return {
        "codigo_externo": licitacion.get("CodigoExterno") or "",
        "nombre": licitacion.get("Nombre") or "",
        "descripcion_preview": truncate_preview(texts["descripcion"]),
        "items_preview": truncate_preview(texts["items"]),
        "fecha_cierre": licitacion.get("FechaCierre") or "",
        "dias_a_cierre": days_until(licitacion.get("FechaCierre"), now),
        "servicios_matched": join_unique([m.slug for m in matches if m.kind == "service"]),
        "signals_matched": join_unique([m.slug for m in matches if m.kind == "signal"]),
        "business_units": join_unique([m.bu for m in matches]),
        "keywords_hit": join_unique([m.keyword_hit for m in matches]),
        "matched_fields": join_unique([m.matched_field for m in matches]),
        "fit_score": compute_fit_score(matches, licitacion.get("FechaCierre"), now),
    }


def default_output_path() -> Path:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return Path(__file__).parent / "output" / f"licitaciones-matched-{stamp}.csv"


def export_csv(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=CSV_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def print_summary(
    *,
    total_fetched: int,
    total_processed: int,
    total_hydrated: int,
    total_matched: int,
    rows: list[dict[str, Any]],
) -> None:
    bu_counter: Counter[str] = Counter()
    field_counter: Counter[str] = Counter()

    for row in rows:
        bu_counter.update([value for value in str(row["business_units"]).split(";") if value])
        field_counter.update([value for value in str(row["matched_fields"]).split(";") if value])

    print("=== TASK-673 Mercado Publico POC Summary ===")
    print(f"total_fetched: {total_fetched}")
    print(f"total_processed: {total_processed}")
    print(f"total_hydrated: {total_hydrated}")
    print(f"total_matched: {total_matched}")
    print(f"distribution_by_bu: {dict(sorted(bu_counter.items()))}")
    print(f"distribution_by_matched_field: {dict(sorted(field_counter.items()))}")
    print("top_10_by_fit_score:")

    for row in sorted(rows, key=lambda item: int(item["fit_score"] or 0), reverse=True)[:10]:
        print(
            f"- {row['fit_score']} | {row['codigo_externo']} | "
            f"{row['servicios_matched'] or row['signals_matched']} | {row['nombre']}"
        )


def load_catalog(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as handle:
        payload = yaml.safe_load(handle)

    if not isinstance(payload, dict):
        raise RuntimeError(f"Catalog must be a YAML object: {path}")
    if not isinstance(payload.get("services"), dict):
        raise RuntimeError("Catalog must include services")

    return payload


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Match active Mercado Publico tenders against Greenhouse services.")
    parser.add_argument("--keywords", type=Path, default=Path(__file__).parent / "keywords.yaml")
    parser.add_argument("--output", type=Path, default=default_output_path())
    parser.add_argument("--limit", type=int, default=None, help="Optional cap for active tenders processed.")
    parser.add_argument("--sleep-seconds", type=float, default=DEFAULT_SLEEP_SECONDS)
    parser.add_argument("--timeout-seconds", type=int, default=DEFAULT_TIMEOUT_SECONDS)
    parser.add_argument("--retries", type=int, default=DEFAULT_RETRIES)
    parser.add_argument("--skip-detail", action="store_true", help="Only match fields present in estado=activas listing.")
    return parser.parse_args()


def main() -> int:
    if load_dotenv:
        load_dotenv()

    args = parse_args()
    ticket = os.environ.get("MERCADO_PUBLICO_TICKET")
    if not ticket:
        print("ERROR: MERCADO_PUBLICO_TICKET is not defined", file=sys.stderr)
        return 2

    catalog = load_catalog(args.keywords)
    now = datetime.now(timezone.utc)
    session = requests.Session()
    session.headers.update({"User-Agent": "GreenhouseEO/1.0 TASK-673-mercadopublico-poc"})

    licitaciones = fetch_licitaciones_activas(
        session,
        ticket,
        timeout_seconds=args.timeout_seconds,
        retries=args.retries,
    )
    selected = licitaciones[: args.limit] if args.limit else licitaciones

    rows: list[dict[str, Any]] = []
    hydrated_count = 0

    for index, licitacion in enumerate(selected, start=1):
        codigo = str(licitacion.get("CodigoExterno") or "")
        enriched = dict(licitacion)

        if codigo and not args.skip_detail:
            try:
                detail = fetch_licitacion_detalle(
                    session,
                    ticket,
                    codigo,
                    timeout_seconds=args.timeout_seconds,
                    retries=args.retries,
                )
                if detail:
                    enriched.update(detail)
                    hydrated_count += 1
            except RuntimeError as error:
                print(f"WARN: detail fetch failed for {codigo}: {error}", file=sys.stderr)

            if args.sleep_seconds > 0 and index < len(selected):
                time.sleep(args.sleep_seconds)

        matches = match_licitacion(enriched, catalog)
        if matches:
            rows.append(row_for_match(enriched, matches, now))

    export_csv(rows, args.output)
    print_summary(
        total_fetched=len(licitaciones),
        total_processed=len(selected),
        total_hydrated=hydrated_count,
        total_matched=len(rows),
        rows=rows,
    )
    print(f"csv_output: {args.output}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
