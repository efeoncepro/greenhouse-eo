from __future__ import annotations

import re
from typing import Any
from urllib.parse import urlparse


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


def _company_display_name(props: dict[str, Any], fallback_id: str) -> str:
    for value in (
        props.get("name"),
        props.get("domain"),
        props.get("website"),
    ):
        normalized = str(value or "").strip()
        if normalized:
            return normalized
    return f"HubSpot Company {fallback_id}"


def _normalize_domain(value: Any) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None

    if "://" not in raw:
        raw = f"https://{raw}"

    try:
        hostname = urlparse(raw).hostname or ""
    except ValueError:
        return None

    normalized = hostname.lower().removeprefix("www.").strip()
    return normalized or None


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
            "ghCommercialPartyId": props.get("gh_commercial_party_id"),
            "ghLastQuoteAt": props.get("gh_last_quote_at"),
            "ghLastContractAt": props.get("gh_last_contract_at"),
            "ghActiveContractsCount": _safe_number(props.get("gh_active_contracts_count")),
            "ghLastWriteAt": props.get("gh_last_write_at"),
            "ghMrrTier": props.get("gh_mrr_tier"),
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


def build_company_search_item(company: dict[str, Any]) -> dict[str, Any]:
    props = company.get("properties") or {}
    company_id = str(company.get("id"))
    website = props.get("website")
    domain = props.get("domain") or _normalize_domain(website)

    return {
        "hubspotCompanyId": company_id,
        "displayName": _company_display_name(props, company_id),
        "domain": domain,
        "website": website,
        "lifecyclestage": props.get("lifecyclestage"),
        "lastModifiedAt": props.get("hs_lastmodifieddate") or company.get("updatedAt"),
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


def build_contact_profile(contact: dict[str, Any]) -> dict[str, Any]:
    props = contact.get("properties") or {}
    return {
        "hubspotContactId": str(contact.get("id")),
        "email": props.get("email"),
        "firstName": props.get("firstname"),
        "lastName": props.get("lastname"),
        "displayName": " ".join(
            part
            for part in (
                str(props.get("firstname") or "").strip(),
                str(props.get("lastname") or "").strip(),
            )
            if part
        ).strip()
        or None,
        "phone": props.get("phone"),
        "mobilePhone": props.get("mobilephone"),
        "jobTitle": props.get("jobtitle"),
        "lifecyclestage": props.get("lifecyclestage"),
        "hsLeadStatus": props.get("hs_lead_status"),
        "company": props.get("company"),
    }


def build_product_profile(product: dict[str, Any]) -> dict[str, Any]:
    props = product.get("properties") or {}
    is_recurring = str(props.get("hs_recurring") or "").lower() in ("true", "1", "yes")
    return {
        "identity": {
            "productId": str(product.get("id")),
            "name": props.get("name") or props.get("hs_product_name"),
            "sku": props.get("hs_sku"),
            "hubspotProductId": str(product.get("id")),
        },
        "pricing": {
            "unitPrice": _safe_number(props.get("price")),
            "costOfGoodsSold": _safe_number(props.get("cost_of_goods_sold")),
            "currency": None,
            "tax": _safe_number(props.get("tax")),
        },
        "billing": {
            "isRecurring": is_recurring,
            "frequency": props.get("hs_recurring_billing_period"),
            "periodCount": _safe_number(props.get("hs_recurring_billing_frequency")),
        },
        "metadata": {
            "description": props.get("description") or props.get("hs_product_description"),
            "isArchived": bool(product.get("archived")),
            "createdAt": props.get("createdate"),
            "lastModifiedAt": props.get("hs_lastmodifieddate"),
        },
        "source": {
            "sourceSystem": "hubspot",
            "sourceObjectType": "product",
            "sourceObjectId": str(product.get("id")),
        },
    }


def build_product_reconcile_item(product: dict[str, Any]) -> dict[str, Any]:
    props = product.get("properties") or {}
    return {
        "hubspotProductId": str(product.get("id")),
        "gh_product_code": props.get("gh_product_code"),
        "gh_source_kind": props.get("gh_source_kind"),
        "gh_last_write_at": props.get("gh_last_write_at"),
        "name": props.get("name") or props.get("hs_product_name"),
        "sku": props.get("hs_sku"),
        "price": _safe_number(props.get("price")),
        "description": props.get("description") or props.get("hs_product_description"),
        "isArchived": bool(product.get("archived")),
    }


def build_line_item_profile(li: dict[str, Any]) -> dict[str, Any]:
    props = li.get("properties") or {}
    return {
        "identity": {
            "lineItemId": str(li.get("id")),
            "hubspotLineItemId": str(li.get("id")),
            "hubspotProductId": props.get("hs_product_id"),
        },
        "content": {
            "name": props.get("name"),
            "description": props.get("description"),
            "quantity": _safe_number(props.get("quantity")) or 1,
            "unitPrice": _safe_number(props.get("price")) or 0,
            "discountPercent": _safe_number(props.get("discount_percentage")),
            "discountAmount": _safe_number(props.get("discount")),
            "taxAmount": _safe_number(props.get("tax")),
            "totalAmount": _safe_number(props.get("amount")) or 0,
        },
        "billing": {
            "frequency": props.get("hs_billing_frequency"),
            "period": _safe_number(props.get("hs_billing_period")),
        },
        "source": {
            "sourceSystem": "hubspot",
            "sourceObjectType": "line_item",
            "sourceObjectId": str(li.get("id")),
        },
    }


def build_quote_profile(quote: dict[str, Any]) -> dict[str, Any]:
    props = quote.get("properties") or {}
    associations = quote.get("associations") or {}

    # Extract associated IDs
    deal_ids = [
        str(r.get("id"))
        for r in (associations.get("deals", {}).get("results") or [])
    ]
    company_ids = [
        str(r.get("id"))
        for r in (associations.get("companies", {}).get("results") or [])
    ]
    contact_ids = [
        str(r.get("id"))
        for r in (associations.get("contacts", {}).get("results") or [])
    ]
    line_items = associations.get("line_items", {}).get("results") or associations.get("line items", {}).get("results") or []

    return {
        "identity": {
            "quoteId": str(quote.get("id")),
            "title": props.get("hs_title"),
            "quoteNumber": props.get("hs_quote_number"),
            "hubspotQuoteId": str(quote.get("id")),
        },
        "financial": {
            "amount": _safe_number(props.get("hs_quote_amount")),
            "currency": props.get("hs_currency"),
            "discount": _safe_number(props.get("hs_discount_percentage")),
        },
        "dates": {
            "createDate": props.get("createdate"),
            "expirationDate": props.get("hs_expiration_date"),
            "lastModifiedDate": props.get("hs_lastmodifieddate"),
        },
        "status": {
            "approvalStatus": props.get("hs_status"),
            "signatureStatus": None,
        },
        "associations": {
            "dealId": deal_ids[0] if deal_ids else None,
            "companyId": company_ids[0] if company_ids else None,
            "contactIds": contact_ids,
            "lineItemCount": len(line_items),
        },
        "source": {
            "sourceSystem": "hubspot",
            "sourceObjectType": "quote",
            "sourceObjectId": str(quote.get("id")),
        },
    }


def _safe_number(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def build_service_profile(service: dict[str, Any]) -> dict[str, Any]:
    props = service.get("properties") or {}
    return {
        "hubspotServiceId": str(service.get("id")),
        "identity": {
            "name": props.get("hs_object_id"),
            "pipelineStage": props.get("ef_pipeline_stage"),
            "hsPipeline": props.get("hs_pipeline"),
            "hsPipelineStage": props.get("hs_pipeline_stage"),
        },
        "classification": {
            "lineaDeServicio": props.get("ef_linea_de_servicio"),
            "servicioEspecifico": props.get("ef_servicio_especifico"),
            "modalidad": props.get("ef_modalidad"),
            "billingFrequency": props.get("ef_billing_frequency"),
            "country": props.get("ef_country"),
        },
        "financial": {
            "totalCost": _safe_number(props.get("ef_total_cost")),
            "amountPaid": _safe_number(props.get("ef_amount_paid")),
            "currency": props.get("ef_currency"),
        },
        "dates": {
            "startDate": props.get("ef_start_date"),
            "targetEndDate": props.get("ef_target_end_date"),
            "createdAt": props.get("createdate"),
            "updatedAt": props.get("hs_lastmodifieddate"),
        },
        "references": {
            "spaceId": props.get("ef_space_id"),
            "organizationId": props.get("ef_organization_id"),
            "notionProjectId": props.get("ef_notion_project_id"),
            "hubspotOwnerId": props.get("hubspot_owner_id"),
        },
        "source": {
            "sourceSystem": "hubspot_crm",
            "sourceObjectType": "p_services",
            "sourceObjectId": str(service.get("id")),
        },
    }
