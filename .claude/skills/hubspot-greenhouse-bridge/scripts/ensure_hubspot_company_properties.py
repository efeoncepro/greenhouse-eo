import argparse
import json
import os
import sys
from typing import Any

import requests


HUBSPOT_API = "https://api.hubapi.com"
DEFAULT_GROUP_NAME = "companyinformation"
REQUIRED_PROPERTY_KEYS = ("name", "label", "description", "type", "fieldType")


def _headers(token: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


def _parse_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or response.reason

    message = payload.get("message") or payload.get("status") or response.reason
    errors = payload.get("errors") or []
    if not errors:
        return message

    details = []
    for err in errors:
        err_message = err.get("message")
        context = err.get("context")
        if context:
            err_message = f"{err_message} | context={json.dumps(context, ensure_ascii=True)}"
        if err_message:
            details.append(err_message)
    return f"{message} | {'; '.join(details)}" if details else message


def _sanitize_options(options: list[dict[str, Any]] | None) -> list[dict[str, Any]]:
    sanitized = []
    for option in options or []:
        sanitized.append(
            {
                "label": option.get("label"),
                "value": option.get("value"),
                "displayOrder": option.get("displayOrder"),
                "hidden": option.get("hidden", False),
                "description": option.get("description"),
            }
        )
    return sanitized


def _normalize_property(raw: dict[str, Any]) -> dict[str, Any]:
    for key in REQUIRED_PROPERTY_KEYS:
        if raw.get(key) in (None, ""):
            raise ValueError(f"Property is missing required key: {key}")

    normalized = {
        "name": str(raw["name"]).strip(),
        "label": str(raw["label"]).strip(),
        "description": str(raw["description"]).strip(),
        "type": str(raw["type"]).strip(),
        "fieldType": str(raw["fieldType"]).strip(),
        "groupName": str(raw.get("groupName") or DEFAULT_GROUP_NAME).strip(),
    }
    if not normalized["name"]:
        raise ValueError("Property name cannot be blank")

    options = _sanitize_options(raw.get("options"))
    if normalized["type"] == "enumeration" and not options:
        raise ValueError(
            f"Enumeration property {normalized['name']} must include options"
        )
    if options:
        normalized["options"] = options
    return normalized


def load_spec(path: str) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if isinstance(payload, dict):
        properties = payload.get("properties")
    elif isinstance(payload, list):
        properties = payload
    else:
        raise ValueError("Spec must be a JSON object or array")

    if not isinstance(properties, list) or not properties:
        raise ValueError("Spec must contain a non-empty properties list")

    return [_normalize_property(entry) for entry in properties]


def get_property(token: str, property_name: str) -> dict[str, Any] | None:
    response = requests.get(
        f"{HUBSPOT_API}/crm/v3/properties/companies/{property_name}",
        headers=_headers(token),
        timeout=30,
    )
    if response.status_code == 404:
        return None
    response.raise_for_status()
    return response.json()


def properties_match(existing: dict[str, Any], desired: dict[str, Any]) -> bool:
    comparable_keys = ("label", "description", "type", "fieldType", "groupName")
    for key in comparable_keys:
        if existing.get(key) != desired.get(key):
            return False
    return _sanitize_options(existing.get("options")) == _sanitize_options(
        desired.get("options")
    )


def plan_property(token: str, desired: dict[str, Any]) -> dict[str, Any]:
    existing = get_property(token, desired["name"])
    if existing is None:
        return {
            "name": desired["name"],
            "action": "create",
            "detail": "property missing in HubSpot companies",
        }
    if properties_match(existing, desired):
        return {
            "name": desired["name"],
            "action": "exists",
            "detail": "property already aligned",
        }
    return {
        "name": desired["name"],
        "action": "update",
        "detail": "property exists but differs from desired spec",
    }


def apply_property(token: str, desired: dict[str, Any]) -> tuple[str, int, str]:
    existing = get_property(token, desired["name"])
    if existing is None:
        response = requests.post(
            f"{HUBSPOT_API}/crm/v3/properties/companies",
            headers=_headers(token),
            json=desired,
            timeout=30,
        )
        if 200 <= response.status_code < 300:
            return "created", response.status_code, "ok"
        return "error", response.status_code, _parse_error(response)

    if properties_match(existing, desired):
        return "exists", 200, "already aligned"

    patch_payload = dict(desired)
    patch_payload.pop("name", None)
    response = requests.patch(
        f"{HUBSPOT_API}/crm/v3/properties/companies/{desired['name']}",
        headers=_headers(token),
        json=patch_payload,
        timeout=30,
    )
    if 200 <= response.status_code < 300:
        return "updated", response.status_code, "ok"
    return "error", response.status_code, _parse_error(response)


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Validate, plan, and optionally create or align HubSpot company "
            "properties from a JSON spec."
        )
    )
    parser.add_argument("--spec", required=True, help="Path to the JSON property spec")
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate the spec locally without calling HubSpot",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Create or patch properties in HubSpot instead of plan-only mode",
    )
    return parser


def main() -> int:
    args = _build_parser().parse_args()

    try:
        properties = load_spec(args.spec)
    except Exception as exc:
        print(f"Spec validation failed: {exc}", file=sys.stderr)
        return 1

    if args.validate_only:
        print(
            json.dumps(
                {
                    "status": "valid",
                    "properties": [prop["name"] for prop in properties],
                    "count": len(properties),
                },
                ensure_ascii=True,
                indent=2,
            )
        )
        return 0

    token = os.environ.get("HUBSPOT_ACCESS_TOKEN")
    if not token:
        print("HUBSPOT_ACCESS_TOKEN is not set", file=sys.stderr)
        return 1

    had_error = False
    for prop in properties:
        if args.apply:
            status, status_code, detail = apply_property(token, prop)
            print(
                f"companies.{prop['name']}: {status} "
                f"(status={status_code}, detail={detail})"
            )
            if status == "error":
                had_error = True
            continue

        try:
            plan = plan_property(token, prop)
            print(json.dumps(plan, ensure_ascii=True))
        except Exception as exc:
            had_error = True
            print(
                json.dumps(
                    {
                        "name": prop["name"],
                        "action": "error",
                        "detail": str(exc),
                    },
                    ensure_ascii=True,
                )
            )

    return 1 if had_error else 0


if __name__ == "__main__":
    raise SystemExit(main())
