import re
from typing import Any


MULTI_VALUE_SPLIT_RE = re.compile(r"[;,\n|]+")


def split_multivalue(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        items = []
        for entry in value:
            items.extend(split_multivalue(entry))
        return _dedupe_strings(items)
    if isinstance(value, (int, float, bool)):
        return [str(value)]

    raw = str(value).strip()
    if not raw:
        return []

    parts = MULTI_VALUE_SPLIT_RE.split(raw)
    if len(parts) == 1:
        return [raw]
    return _dedupe_strings(parts)


def _dedupe_strings(values: list[str]) -> list[str]:
    seen = set()
    deduped = []
    for value in values:
        normalized = value.strip()
        if not normalized:
            continue
        key = normalized.casefold()
        if key in seen:
            continue
        seen.add(key)
        deduped.append(normalized)
    return deduped


def _display_name(owner: dict[str, Any]) -> str | None:
    first_name = str(owner.get("firstName") or "").strip()
    last_name = str(owner.get("lastName") or "").strip()
    full_name = " ".join(part for part in (first_name, last_name) if part).strip()
    return full_name or None


def build_company_profile(
    company: dict[str, Any],
    *,
    business_line_prop: str,
    service_module_prop: str,
) -> dict[str, Any]:
    props = company.get("properties") or {}
    return {
        "hubspotCompanyId": str(company.get("id")),
        "identity": {
            "hubspotCompanyId": str(company.get("id")),
            "name": props.get("name"),
            "domain": props.get("domain"),
            "website": props.get("website"),
            "industry": props.get("industry"),
            "country": props.get("country"),
            "city": props.get("city"),
            "state": props.get("state"),
        },
        "lifecycle": {
            "lifecyclestage": props.get("lifecyclestage"),
            "hs_current_customer": props.get("hs_current_customer"),
            "hubspotTeamId": props.get("hubspot_team_id"),
        },
        "capabilities": {
            "businessLines": split_multivalue(props.get(business_line_prop)),
            "serviceModules": split_multivalue(props.get(service_module_prop)),
        },
        "owner": {
            "hubspotOwnerId": props.get("hubspot_owner_id"),
        },
        "source": {
            "sourceSystem": "hubspot_crm",
            "sourceObjectType": "company",
            "sourceObjectId": str(company.get("id")),
        },
    }


def build_owner_profile(owner_id: str, owner: dict[str, Any]) -> dict[str, Any]:
    return {
        "hubspotOwnerId": str(owner_id),
        "ownerEmail": owner.get("email"),
        "ownerFirstName": owner.get("firstName"),
        "ownerLastName": owner.get("lastName"),
        "ownerDisplayName": _display_name(owner),
        "userId": owner.get("userId"),
        "archived": owner.get("archived"),
    }
