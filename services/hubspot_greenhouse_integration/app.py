from __future__ import annotations

from hmac import compare_digest
import time
from typing import Any

from flask import Flask, jsonify, request

try:
    from .config import build_runtime_config
    from .contract import build_contract
    from .greenhouse_client import GreenhouseClient
    from .hubspot_client import HubSpotClient, HubSpotIntegrationError
    from .models import (
        build_company_profile,
        build_company_search_item,
        build_contact_profile,
        build_deal_profile,
        build_line_item_profile,
        build_owner_profile,
        build_product_profile,
        build_product_profile_v2,
        build_product_reconcile_item,
        build_quote_profile,
        build_service_profile,
    )
    from .webhooks import (
        extract_company_ids_from_webhook_events,
        parse_webhook_events,
        sync_company_capabilities_from_hubspot,
        validate_hubspot_request_signature,
        HubSpotWebhookValidationError,
    )
except ImportError:
    # Allow standalone execution when Cloud Run deploys from this subdirectory.
    from config import build_runtime_config
    from contract import build_contract
    from greenhouse_client import GreenhouseClient
    from hubspot_client import HubSpotClient, HubSpotIntegrationError
    from models import (
        build_company_profile,
        build_company_search_item,
        build_contact_profile,
        build_deal_profile,
        build_line_item_profile,
        build_owner_profile,
        build_product_profile,
        build_product_profile_v2,
        build_product_reconcile_item,
        build_quote_profile,
        build_service_profile,
    )
    from webhooks import (
        extract_company_ids_from_webhook_events,
        parse_webhook_events,
        sync_company_capabilities_from_hubspot,
        validate_hubspot_request_signature,
        HubSpotWebhookValidationError,
    )


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.update(build_runtime_config())
    deal_idempotency_property = "gh_idempotency_key"
    supported_deal_origins = {"greenhouse_quote_builder"}

    def _client() -> HubSpotClient:
        return HubSpotClient(
            access_token=app.config["hubspot_access_token"],
            timeout_seconds=app.config["timeout_seconds"],
        )

    def _greenhouse_client() -> GreenhouseClient:
        return GreenhouseClient(
            base_url=app.config["greenhouse_base_url"],
            api_token=app.config["greenhouse_integration_api_token"],
            timeout_seconds=app.config["timeout_seconds"],
        )

    def _extract_integration_token() -> str | None:
        authorization = request.headers.get("Authorization", "").strip()
        if authorization.lower().startswith("bearer "):
            return authorization[len("bearer ") :].strip() or None

        return request.headers.get("x-greenhouse-integration-key", "").strip() or None

    def _require_integration_write_auth():
        expected = app.config["greenhouse_integration_api_token"].strip()
        if not expected:
            return jsonify({"error": "GREENHOUSE_INTEGRATION_API_TOKEN is not set"}), 500

        provided = _extract_integration_token()
        if not provided or not compare_digest(provided, expected):
            return jsonify({"error": "Unauthorized"}), 401

        return None

    def _normalize_hubspot_write_value(value: Any) -> Any:
        if value is None:
            return ""
        return value

    def _extract_greenhouse_custom_properties(body: dict[str, Any]) -> dict[str, Any]:
        raw = body.get("customProperties")
        if raw is None:
            return {}
        if not isinstance(raw, dict):
            raise ValueError("customProperties must be an object")

        props: dict[str, Any] = {}
        for key, value in raw.items():
            prop_name = str(key or "").strip()
            if not prop_name.startswith("gh_"):
                raise ValueError("customProperties only supports gh_* keys")
            if isinstance(value, (dict, list, tuple, set)):
                raise ValueError(f"customProperties[{prop_name}] must be a scalar value")
            props[prop_name] = _normalize_hubspot_write_value(value)
        return props

    # -------------------------------------------------------------------------
    # TASK-587 / TASK-603 — HubSpot Products Outbound Contract v2 helpers.
    #
    # Requests opt into the v2 payload shape by sending the header
    # ``X-Contract-Version: v2``. Older callers (no header or ``v1``) keep the
    # legacy behavior intact so the middleware can dual-write during the
    # validation window.
    # -------------------------------------------------------------------------

    V2_CONTRACT_VERSION_HEADER = "X-Contract-Version"
    V2_CONTRACT_VERSION_VALUE = "v2"

    V2_ALLOWED_PRODUCT_TYPES = {"service", "inventory", "non_inventory"}

    V2_FORBIDDEN_PRODUCT_FIELDS = (
        "marginPct",
        "margin_pct",
        "targetMarginPct",
        "target_margin_pct",
        "floorMarginPct",
        "floor_margin_pct",
        "effectiveMarginPct",
        "effective_margin_pct",
        "costBreakdown",
        "cost_breakdown",
    )

    V2_PRICE_CURRENCY_TO_PROPERTY = (
        ("CLP", "hs_price_clp"),
        ("USD", "hs_price_usd"),
        ("CLF", "hs_price_clf"),
        ("COP", "hs_price_cop"),
        ("MXN", "hs_price_mxn"),
        ("PEN", "hs_price_pen"),
    )

    def _is_v2_request(flask_request) -> bool:
        header_value = (flask_request.headers.get(V2_CONTRACT_VERSION_HEADER) or "").strip().lower()
        return header_value == V2_CONTRACT_VERSION_VALUE

    def _reject_v2_forbidden_fields(body: dict[str, Any]) -> None:
        for field in V2_FORBIDDEN_PRODUCT_FIELDS:
            if field in body:
                raise ValueError(
                    f"HubSpot v2 contract rejects {field}: Greenhouse governance (TASK-347/TASK-603)"
                )

    def _extract_v2_prices(body: dict[str, Any]) -> dict[str, Any]:
        raw = body.get("pricesByCurrency")
        if raw is None:
            return {}
        if not isinstance(raw, dict):
            raise ValueError("pricesByCurrency must be an object")

        props: dict[str, Any] = {}
        for currency, prop_name in V2_PRICE_CURRENCY_TO_PROPERTY:
            if currency not in raw:
                continue
            value = raw[currency]
            if value is None:
                props[prop_name] = ""
            elif isinstance(value, bool):
                raise ValueError(f"pricesByCurrency[{currency}] must be a number")
            elif isinstance(value, (int, float)):
                props[prop_name] = value
            else:
                raise ValueError(f"pricesByCurrency[{currency}] must be a number")
        return props

    def _extract_v2_classification(body: dict[str, Any]) -> dict[str, Any]:
        props: dict[str, Any] = {}

        if "productType" in body:
            product_type = body["productType"]
            if product_type is None or product_type == "":
                props["hs_product_type"] = ""
            else:
                normalized = str(product_type).strip()
                if normalized not in V2_ALLOWED_PRODUCT_TYPES:
                    raise ValueError(
                        "Invalid productType: must be service|inventory|non_inventory"
                    )
                props["hs_product_type"] = normalized

        if "pricingModel" in body:
            props["hs_pricing_model"] = _normalize_hubspot_write_value(body["pricingModel"])

        # TASK-605 hotfix 2026-04-24: HubSpot rejects writes to these as
        # READ_ONLY_VALUE (HS manages them internally, not settable via
        # public API). Accept in payload for forward-compat (e.g. if
        # HubSpot opens them later) but skip emission to HS.
        #
        # - productClassification → hs_product_classification (READ_ONLY)
        # - bundleType → hs_bundle_type (READ_ONLY)
        #
        # GH retains the values in product_catalog as SoT; drift detector
        # will not flag them since HS returns its own defaults.

        return props

    def _extract_v2_references(body: dict[str, Any]) -> dict[str, Any]:
        props: dict[str, Any] = {}
        if "categoryCode" in body:
            props["categoria_de_item"] = _normalize_hubspot_write_value(body["categoryCode"])
        if "unitCode" in body:
            props["unidad"] = _normalize_hubspot_write_value(body["unitCode"])
        if "taxCategoryCode" in body:
            props["hs_tax_category"] = _normalize_hubspot_write_value(body["taxCategoryCode"])
        return props

    def _extract_v2_recurring(body: dict[str, Any]) -> dict[str, Any]:
        props: dict[str, Any] = {}

        # TASK-605 hotfix 2026-04-24: `hs_recurring` does not exist as a
        # property in portal 48713323 (PROPERTY_DOESNT_EXIST). Recurrence
        # is captured implicitly via hs_recurring_billing_period +
        # recurringbillingfrequency. Skip emission of the boolean flag.
        #
        # If operators ever need a boolean indicator, a custom property
        # `gh_is_recurring` can be added in the portal — but current
        # billing_period = null is the canonical "not recurring" signal.

        if "recurringBillingFrequency" in body:
            props["recurringbillingfrequency"] = _normalize_hubspot_write_value(
                body["recurringBillingFrequency"]
            )
        if "recurringBillingPeriodCode" in body:
            props["hs_recurring_billing_period"] = _normalize_hubspot_write_value(
                body["recurringBillingPeriodCode"]
            )
        return props

    def _extract_v2_owner(client: HubSpotClient, body: dict[str, Any]) -> dict[str, Any]:
        # Direct owner id wins over email resolution to allow callers that
        # already resolved the owner upstream (e.g. cached binding) to skip the
        # HubSpot round-trip.
        if "hubspotOwnerId" in body and body["hubspotOwnerId"] not in (None, ""):
            return {"hubspot_owner_id": _normalize_hubspot_write_value(body["hubspotOwnerId"])}

        if "commercialOwnerEmail" in body:
            email = body["commercialOwnerEmail"]
            if email is None or str(email).strip() == "":
                # Explicit null/empty clears the owner on HubSpot.
                return {"hubspot_owner_id": ""}

            try:
                owner = client.resolve_owner_by_email(str(email).strip())
            except HubSpotIntegrationError:
                # Re-raise so the endpoint can map to a 5xx response.
                raise
            if owner is None:
                app.logger.warning(
                    "HubSpot v2 product write: commercialOwnerEmail did not resolve to an owner; omitting hubspot_owner_id"
                )
                return {}
            owner_id = owner.get("id")
            if owner_id in (None, ""):
                app.logger.warning(
                    "HubSpot v2 product write: resolved owner is missing id; omitting hubspot_owner_id"
                )
                return {}
            return {"hubspot_owner_id": str(owner_id)}

        return {}

    def _extract_v2_marketing(body: dict[str, Any]) -> dict[str, Any]:
        props: dict[str, Any] = {}
        if "marketingUrl" in body:
            props["hs_url"] = _normalize_hubspot_write_value(body["marketingUrl"])

        if "imageUrls" in body:
            raw_images = body["imageUrls"]
            if raw_images is None:
                props["hs_images"] = ""
            elif isinstance(raw_images, (list, tuple)):
                cleaned = []
                for item in raw_images:
                    if item is None:
                        continue
                    text = str(item).strip()
                    if text:
                        cleaned.append(text)
                props["hs_images"] = ";".join(cleaned) if cleaned else ""
            else:
                raise ValueError("imageUrls must be an array of strings")
        return props

    def _build_v2_product_properties(
        client: HubSpotClient,
        body: dict[str, Any],
        *,
        require_create_fields: bool,
    ) -> dict[str, Any]:
        _reject_v2_forbidden_fields(body)

        props: dict[str, Any] = {}

        # Core identity — name/sku/description mirror v1 behavior so v2 callers
        # can still rely on the canonical HubSpot property names.
        if require_create_fields:
            name = body.get("name")
            sku = body.get("sku")
            if not name or not sku:
                raise ValueError("name and sku are required")
            props["name"] = name
            props["hs_sku"] = sku
        else:
            if "name" in body:
                props["name"] = _normalize_hubspot_write_value(body["name"])
            if "sku" in body:
                props["hs_sku"] = _normalize_hubspot_write_value(body["sku"])

        if "description" in body:
            props["description"] = _normalize_hubspot_write_value(body["description"])
        if "descriptionRichHtml" in body:
            props["hs_rich_text_description"] = _normalize_hubspot_write_value(
                body["descriptionRichHtml"]
            )

        if "unitPrice" in body:
            props["price"] = _normalize_hubspot_write_value(body["unitPrice"])
        if "costOfGoodsSold" in body:
            # TASK-603: COGS is unblocked outbound. Governance decision
            # supersedes the TASK-347 ban for this field only.
            props["cost_of_goods_sold"] = _normalize_hubspot_write_value(body["costOfGoodsSold"])
        if "tax" in body:
            props["tax"] = _normalize_hubspot_write_value(body["tax"])

        props.update(_extract_v2_prices(body))
        props.update(_extract_v2_classification(body))
        props.update(_extract_v2_references(body))
        props.update(_extract_v2_recurring(body))
        props.update(_extract_v2_owner(client, body))
        props.update(_extract_v2_marketing(body))
        props.update(_extract_greenhouse_custom_properties(body))

        return props

    def _parse_reconcile_cursor(raw_cursor: str | None) -> tuple[str, str | None]:
        cursor = (raw_cursor or "").strip()
        if not cursor:
            return "active", None

        stage, _, after = cursor.partition(":")
        if stage not in {"active", "archived"}:
            raise ValueError("Invalid cursor")
        return stage, after or None

    def _next_reconcile_cursor(stage: str, after: str | None) -> str | None:
        if after:
            return f"{stage}:{after}"
        return None

    def _normalize_required_text(body: dict[str, Any], field: str) -> str:
        value = str(body.get(field) or "").strip()
        if not value:
            raise ValueError(f"{field} is required")
        return value

    def _normalize_optional_text(body: dict[str, Any], field: str) -> str | None:
        value = str(body.get(field) or "").strip()
        return value or None

    def _normalize_optional_number(body: dict[str, Any], field: str) -> int | float | None:
        value = body.get(field)
        if value is None or value == "":
            return None
        if isinstance(value, bool):
            raise ValueError(f"{field} must be a number")
        if isinstance(value, (int, float)):
            return value
        try:
            parsed = float(str(value).strip())
        except ValueError as exc:
            raise ValueError(f"{field} must be a number") from exc
        if parsed.is_integer():
            return int(parsed)
        return parsed

    def _deal_properties_payload(
        body: dict[str, Any],
        *,
        include_idempotency_property: bool,
    ) -> dict[str, Any]:
        props: dict[str, Any] = {
            "dealname": _normalize_required_text(body, "dealName"),
            "gh_deal_origin": _normalize_required_text(body, "origin"),
        }
        if include_idempotency_property:
            props[deal_idempotency_property] = _normalize_required_text(
                body, "idempotencyKey"
            )

        amount = _normalize_optional_number(body, "amount")
        if amount is not None:
            props["amount"] = amount

        currency = _normalize_optional_text(body, "currency")
        if currency:
            props["deal_currency_code"] = currency

        pipeline_id = _normalize_optional_text(body, "pipelineId")
        if pipeline_id:
            props["pipeline"] = pipeline_id

        stage_id = _normalize_optional_text(body, "stageId")
        if stage_id:
            props["dealstage"] = stage_id

        deal_type = _normalize_optional_text(body, "dealType")
        if deal_type:
            props["dealtype"] = deal_type

        priority = _normalize_optional_text(body, "priority")
        if priority:
            props["hs_priority"] = priority

        owner_id = _normalize_optional_text(body, "ownerHubspotUserId")
        if owner_id:
            props["hubspot_owner_id"] = owner_id

        close_date = _normalize_optional_text(body, "closeDate")
        if close_date:
            props["closedate"] = close_date

        business_line_code = _normalize_optional_text(body, "businessLineCode")
        if business_line_code:
            props[app.config["business_line_prop"]] = business_line_code

        return props

    def _build_deal_response(
        deal: dict[str, Any],
    ) -> tuple[dict[str, Any], str]:
        deal_id = str(deal.get("id") or "")
        if not deal_id:
            raise ValueError("HubSpot deal payload is missing id")

        props = deal.get("properties") or {}
        payload = {
            "status": "created",
            "hubspotDealId": deal_id,
            "pipelineUsed": props.get("pipeline"),
            "stageUsed": props.get("dealstage"),
            "dealTypeUsed": props.get("dealtype"),
            "priorityUsed": props.get("hs_priority"),
            "ownerUsed": props.get("hubspot_owner_id"),
        }
        return payload, deal_id

    def _build_deal_pipeline_metadata(pipelines: list[dict[str, Any]]) -> list[dict[str, Any]]:
        payload: list[dict[str, Any]] = []
        for pipeline in pipelines:
            stages_payload: list[dict[str, Any]] = []
            for stage in pipeline.get("stages") or []:
                metadata = stage.get("metadata")
                stages_payload.append(
                    {
                        "stageId": str(stage.get("id") or ""),
                        "label": stage.get("label"),
                        "displayOrder": stage.get("displayOrder"),
                        "archived": bool(stage.get("archived")),
                        "metadata": metadata if isinstance(metadata, dict) else {},
                    }
                )

            payload.append(
                {
                    "pipelineId": str(pipeline.get("id") or ""),
                    "label": pipeline.get("label"),
                    "displayOrder": pipeline.get("displayOrder"),
                    "archived": bool(pipeline.get("archived")),
                    "stages": stages_payload,
                }
            )
        return payload

    def _build_deal_pipeline_index(
        pipelines: list[dict[str, Any]],
    ) -> tuple[dict[str, str | None], dict[tuple[str, str], dict[str, Any]]]:
        pipeline_labels_by_id: dict[str, str | None] = {}
        stage_metadata_by_key: dict[tuple[str, str], dict[str, Any]] = {}

        for pipeline in _build_deal_pipeline_metadata(pipelines):
            pipeline_id = str(pipeline.get("pipelineId") or "")
            pipeline_labels_by_id[pipeline_id] = pipeline.get("label")

            for stage in pipeline.get("stages") or []:
                stage_id = str(stage.get("stageId") or "")
                if not stage_id:
                    continue
                stage_metadata_by_key[(pipeline_id, stage_id)] = stage

        return pipeline_labels_by_id, stage_metadata_by_key

    def _build_deal_property_metadata(
        property_name: str,
        prop: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        if prop is None:
            return None

        options_payload: list[dict[str, Any]] = []
        for option in prop.get("options") or []:
            options_payload.append(
                {
                    "value": option.get("value"),
                    "label": option.get("label"),
                    "description": option.get("description"),
                    "displayOrder": option.get("displayOrder"),
                    "hidden": bool(option.get("hidden")),
                }
            )

        return {
            "propertyName": property_name,
            "label": prop.get("label"),
            "type": prop.get("type"),
            "fieldType": prop.get("fieldType"),
            "hubspotDefined": bool(prop.get("hubspotDefined")),
            "options": options_payload,
        }

    def _associated_record_ids(record: dict[str, Any], key: str) -> set[str]:
        associations = record.get("associations") or {}
        results = (associations.get(key) or {}).get("results") or []
        ids: set[str] = set()
        for result in results:
            assoc_id = result.get("id") or result.get("toObjectId")
            if assoc_id is not None:
                ids.add(str(assoc_id))
        return ids

    def _ensure_deal_associations(
        client: HubSpotClient,
        *,
        deal: dict[str, Any],
        company_id: str,
        contact_id: str | None,
    ) -> None:
        deal_id = str(deal.get("id") or "")
        if not deal_id:
            raise ValueError("HubSpot deal payload is missing id")

        company_ids = _associated_record_ids(deal, "companies")
        if company_ids and company_id not in company_ids:
            raise ValueError(
                "idempotencyKey is already associated to a different hubspotCompanyId"
            )
        if company_id not in company_ids:
            client.create_default_association("deals", deal_id, "companies", company_id)

        if contact_id and contact_id not in _associated_record_ids(deal, "contacts"):
            client.create_default_association("deals", deal_id, "contacts", contact_id)

    def _deal_idempotency_sort_key(deal: dict[str, Any]) -> tuple[str, str]:
        props = deal.get("properties") or {}
        created_at = str(props.get("createdate") or "9999-12-31T23:59:59.999Z")
        deal_id = str(deal.get("id") or "")
        return created_at, deal_id

    def _resolve_idempotent_deal(
        client: HubSpotClient,
        *,
        idempotency_key: str,
        deal_fields: list[str],
        fallback_deal: dict[str, Any] | None = None,
    ) -> tuple[dict[str, Any], bool]:
        matches: list[dict[str, Any]] = []

        for attempt, delay_seconds in enumerate((0.0, 0.2, 0.5, 1.0)):
            if delay_seconds > 0:
                time.sleep(delay_seconds)

            matches = client.search_deals(
                property_name=deal_idempotency_property,
                property_value=idempotency_key,
                properties=deal_fields,
                limit=10,
            )
            if matches:
                break

        if not matches:
            if fallback_deal is None:
                raise ValueError("HubSpot idempotency search returned no deal")
            return fallback_deal, False

        ranked_matches = sorted(matches, key=_deal_idempotency_sort_key)
        canonical = ranked_matches[0]
        canonical_id = str(canonical.get("id") or "")
        archived_duplicates = False

        for duplicate in ranked_matches[1:]:
            duplicate_id = str(duplicate.get("id") or "")
            if not duplicate_id or duplicate_id == canonical_id:
                continue
            try:
                client.archive_deal(duplicate_id)
                archived_duplicates = True
            except HubSpotIntegrationError as exc:
                if exc.status_code != 404:
                    raise

        return canonical, archived_duplicates

    def _hubspot_error_response(exc: HubSpotIntegrationError):
        status = exc.status_code or 502
        code = exc.error_code or "HUBSPOT_UPSTREAM"
        response_status = 502
        headers: dict[str, str] = {}

        if code == "HUBSPOT_AUTH":
            response_status = 401
        elif code == "HUBSPOT_RATE_LIMIT":
            response_status = 429
            if exc.retry_after:
                headers["Retry-After"] = str(exc.retry_after)
        elif code == "HUBSPOT_VALIDATION":
            response_status = 422

        return (
            jsonify(
                {
                    "error": str(exc),
                    "code": code,
                    "status_code": status,
                }
            ),
            response_status,
            headers,
        )

    @app.get("/health")
    def health():
        return jsonify(
            {
                "service": app.config["service_name"],
                "version": app.config["service_version"],
                "status": "ok",
                "hubspotConfigured": bool(app.config["hubspot_access_token"]),
                "realtime": bool(
                    app.config["hubspot_app_client_secret"]
                    and app.config["greenhouse_base_url"]
                    and app.config["greenhouse_integration_api_token"]
                ),
            }
        )

    @app.get("/contract")
    def contract():
        return jsonify(build_contract(app.config))

    @app.get("/deals/metadata")
    def deal_metadata():
        try:
            client = _client()
            property_aliases = {
                "dealType": "dealtype",
                "priority": "hs_priority",
            }
            properties: dict[str, Any] = {}

            for alias, property_name in property_aliases.items():
                try:
                    properties[alias] = _build_deal_property_metadata(
                        property_name,
                        client.get_deal_property(property_name),
                    )
                except HubSpotIntegrationError as exc:
                    if exc.status_code == 404:
                        properties[alias] = None
                        continue
                    raise

            return jsonify(
                {
                    "objectType": "deals",
                    "pipelines": _build_deal_pipeline_metadata(
                        client.list_deal_pipelines()
                    ),
                    "properties": properties,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/companies/<company_id>")
    def company_profile(company_id: str):
        try:
            company = _client().get_company(
                company_id,
                properties=build_contract(app.config)["sourceFields"]["companies"],
            )
            return jsonify(
                build_company_profile(
                    company,
                    business_line_prop=app.config["business_line_prop"],
                    service_module_prop=app.config["service_module_prop"],
                )
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/companies/search")
    def company_search():
        raw_query = request.args.get("q", "").strip()
        raw_limit = request.args.get("limit", "").strip()

        if len(raw_query) < 2:
            return jsonify({"query": raw_query, "count": 0, "companies": []})

        try:
            limit = int(raw_limit) if raw_limit else 20
        except ValueError:
            return jsonify({"error": "limit must be an integer"}), 400

        try:
            companies = _client().search_companies(
                raw_query,
                properties=build_contract(app.config)["sourceFields"]["companies"],
                limit=limit,
            )
            return jsonify(
                {
                    "query": raw_query,
                    "count": len(companies),
                    "companies": [
                        build_company_search_item(company) for company in companies
                    ],
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/companies/<company_id>/owner")
    def company_owner(company_id: str):
        try:
            company = _client().get_company(
                company_id,
                properties=["hubspot_owner_id"],
            )
            owner_id = (company.get("properties") or {}).get("hubspot_owner_id")
            if not owner_id:
                return jsonify(
                    {
                        "hubspotCompanyId": company_id,
                        "owner": None,
                        "detail": "Company has no hubspot_owner_id",
                    }
                )

            owner = _client().get_owner(str(owner_id))
            return jsonify(
                {
                    "hubspotCompanyId": company_id,
                    "owner": build_owner_profile(str(owner_id), owner),
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/owners/resolve")
    def owner_resolution():
        email = request.args.get("email", "").strip()
        if not email:
            return jsonify({"error": "email is required"}), 400

        try:
            owner = _client().resolve_owner_by_email(email)
            return jsonify(
                {
                    "email": email,
                    "owner": build_owner_profile(str(owner.get("id")), owner) if owner else None,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/companies/<company_id>/contacts")
    def company_contacts(company_id: str):
        try:
            contract = build_contract(app.config)
            client = _client()
            contact_ids = client.list_company_contact_ids(company_id)
            contacts = client.get_contacts_by_ids(
                contact_ids,
                properties=contract["sourceFields"]["contacts"],
            )
            contacts_by_id = {
                str(contact.get("id")): build_contact_profile(contact)
                for contact in contacts
            }
            ordered_contacts = [
                contacts_by_id[contact_id]
                for contact_id in contact_ids
                if contact_id in contacts_by_id
            ]
            return jsonify(
                {
                    "hubspotCompanyId": company_id,
                    "count": len(ordered_contacts),
                    "contacts": ordered_contacts,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/companies/<company_id>/deals")
    def company_deals(company_id: str):
        try:
            contract = build_contract(app.config)
            client = _client()
            deal_ids = client.list_company_deal_ids(company_id)
            if not deal_ids:
                return jsonify(
                    {
                        "hubspotCompanyId": company_id,
                        "count": 0,
                        "deals": [],
                    }
                )

            deals_raw = client.get_deals_by_ids(
                deal_ids,
                properties=contract["sourceFields"]["deals"],
            )
            pipeline_labels_by_id, stage_metadata_by_key = _build_deal_pipeline_index(
                client.list_deal_pipelines()
            )
            deals_by_id = {
                str(deal.get("id")): build_deal_profile(
                    deal,
                    pipeline_labels_by_id=pipeline_labels_by_id,
                    stage_metadata_by_key=stage_metadata_by_key,
                )
                for deal in deals_raw
            }
            ordered_deals = [
                deals_by_id[deal_id]
                for deal_id in deal_ids
                if deal_id in deals_by_id
            ]
            ordered_deals.sort(
                key=lambda deal: (
                    str(deal.get("lastModifiedAt") or ""),
                    str(deal.get("hubspotDealId") or ""),
                ),
                reverse=True,
            )

            return jsonify(
                {
                    "hubspotCompanyId": company_id,
                    "count": len(ordered_deals),
                    "deals": ordered_deals,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/services/<service_id>")
    def service_profile(service_id: str):
        try:
            contract = build_contract(app.config)
            service = _client().get_service(
                service_id,
                properties=contract["sourceFields"]["services"],
            )
            return jsonify(build_service_profile(service))
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/companies/<company_id>/services")
    def company_services(company_id: str):
        try:
            contract = build_contract(app.config)
            client = _client()
            service_ids = client.list_company_service_ids(company_id)
            services = client.get_services_by_ids(
                service_ids,
                properties=contract["sourceFields"]["services"],
            )
            services_by_id = {
                str(svc.get("id")): build_service_profile(svc)
                for svc in services
            }
            ordered_services = [
                services_by_id[service_id]
                for service_id in service_ids
                if service_id in services_by_id
            ]
            return jsonify(
                {
                    "hubspotCompanyId": company_id,
                    "count": len(ordered_services),
                    "services": ordered_services,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.patch("/companies/<company_id>/lifecycle")
    def update_company_lifecycle(company_id: str):
        auth_error = _require_integration_write_auth()
        if auth_error:
            return auth_error

        try:
            body = request.get_json(force=True) or {}
            props: dict[str, Any] = {}

            if body.get("lifecycleStage"):
                props["lifecyclestage"] = body["lifecycleStage"]
            if body.get("commercialPartyId"):
                props["gh_commercial_party_id"] = body["commercialPartyId"]
            if body.get("lastQuoteAt"):
                props["gh_last_quote_at"] = body["lastQuoteAt"]
            if body.get("lastContractAt"):
                props["gh_last_contract_at"] = body["lastContractAt"]
            if body.get("activeContractsCount") is not None:
                props["gh_active_contracts_count"] = body["activeContractsCount"]
            if body.get("ghLastWriteAt"):
                props["gh_last_write_at"] = body["ghLastWriteAt"]
            if body.get("mrrTier"):
                props["gh_mrr_tier"] = body["mrrTier"]

            if not props:
                return jsonify({"error": "No lifecycle fields to update"}), 400

            _client().update_company(company_id, props)

            return jsonify(
                {
                    "status": "updated",
                    "hubspotCompanyId": company_id,
                    "fieldsWritten": list(props.keys()),
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.post("/deals")
    def create_deal_endpoint():
        auth_error = _require_integration_write_auth()
        if auth_error:
            return auth_error

        try:
            body = request.get_json(force=True) or {}
            hubspot_company_id = _normalize_required_text(body, "hubspotCompanyId")
            origin = _normalize_required_text(body, "origin")
            if origin not in supported_deal_origins:
                return jsonify({"error": "origin is not supported"}), 400

            idempotency_key = _normalize_required_text(body, "idempotencyKey")
            contact_id = _normalize_optional_text(body, "hubspotContactId")
            client = _client()
            deal_fields = build_contract(app.config)["sourceFields"]["deals"]
            existing, idempotency_property_supported = (
                client.find_deal_by_idempotency_key(
                    idempotency_key,
                    properties=deal_fields,
                )
            )
            deal_properties = _deal_properties_payload(
                body,
                include_idempotency_property=idempotency_property_supported,
            )

            reused_existing = existing is not None
            if existing:
                canonical, archived_duplicates = _resolve_idempotent_deal(
                    client,
                    idempotency_key=idempotency_key,
                    deal_fields=deal_fields,
                    fallback_deal=existing,
                )
                deal_id = str(canonical.get("id") or "")
                reused_existing = True
                hydrated = client.get_deal(
                    deal_id,
                    properties=deal_fields,
                    associations=["companies", "contacts"],
                )
            else:
                created = client.create_deal(deal_properties)
                created_id = str(created.get("id") or "")
                if not created_id:
                    raise ValueError("HubSpot create_deal returned no id")

                archived_duplicates = False
                deal_id = created_id
                if idempotency_property_supported:
                    canonical, archived_duplicates = _resolve_idempotent_deal(
                        client,
                        idempotency_key=idempotency_key,
                        deal_fields=deal_fields,
                        fallback_deal=created,
                    )
                    deal_id = str(canonical.get("id") or created_id)
                    reused_existing = deal_id != created_id

                hydrated = client.get_deal(
                    deal_id,
                    properties=deal_fields,
                    associations=["companies", "contacts"],
                )

            _ensure_deal_associations(
                client,
                deal=hydrated,
                company_id=hubspot_company_id,
                contact_id=contact_id,
            )

            final_deal = client.get_deal(
                deal_id,
                properties=deal_fields,
            )
            payload, _ = _build_deal_response(final_deal)
            if reused_existing:
                payload["message"] = "Reused existing HubSpot deal for idempotencyKey"
                if archived_duplicates:
                    payload["message"] += " after archiving duplicate concurrent creates"
                return jsonify(payload), 200
            if not idempotency_property_supported:
                payload["message"] = (
                    "Created deal, but durable idempotency is inactive until "
                    "gh_idempotency_key exists in HubSpot."
                )
            elif archived_duplicates:
                payload["message"] = (
                    "Created HubSpot deal and archived duplicate concurrent creates"
                )

            return jsonify(payload), 201
        except ValueError as exc:
            return jsonify({"error": str(exc), "code": "INVALID_REQUEST"}), 400
        except HubSpotIntegrationError as exc:
            return _hubspot_error_response(exc)

    # ------------------------------------------------------------------
    # Products (TASK-211)
    # ------------------------------------------------------------------

    @app.get("/products")
    def product_catalog():
        try:
            client = _client()
            products_raw = client.list_all_products(
                properties=build_contract(app.config)["sourceFields"]["products"],
            )

            if _is_v2_request(request):
                # TASK-604 — v2 inbound rehydration. Cache owner lookups
                # across products in a single GET /products call so we
                # issue 1 HubSpot owners request per unique owner, not per
                # product.
                owner_cache: dict[str, dict[str, Any] | None] = {}

                def cached_owner_resolver(owner_id: str) -> dict[str, Any] | None:
                    if owner_id in owner_cache:
                        return owner_cache[owner_id]
                    try:
                        owner_cache[owner_id] = client.get_owner(owner_id)
                    except HubSpotIntegrationError:
                        owner_cache[owner_id] = None
                    return owner_cache[owner_id]

                products = [
                    build_product_profile_v2(p, owner_resolver=cached_owner_resolver)
                    for p in products_raw
                ]
            else:
                products = [build_product_profile(p) for p in products_raw]

            return jsonify({"count": len(products), "products": products})
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/products/<product_id>")
    def product_detail(product_id: str):
        try:
            client = _client()
            product = client.get_product(
                product_id,
                properties=build_contract(app.config)["sourceFields"]["products"],
            )

            if _is_v2_request(request):
                # TASK-604 — single-product GET resolves owner once at most.
                def owner_resolver(owner_id: str) -> dict[str, Any] | None:
                    try:
                        return client.get_owner(owner_id)
                    except HubSpotIntegrationError:
                        return None

                return jsonify(
                    build_product_profile_v2(product, owner_resolver=owner_resolver)
                )

            return jsonify(build_product_profile(product))
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.post("/products")
    def create_product_endpoint():
        auth_error = _require_integration_write_auth()
        if auth_error:
            return auth_error

        try:
            body = request.get_json(force=True) or {}

            if _is_v2_request(request):
                # TASK-587 / TASK-603 — v2 contract: 16 new fields + COGS
                # unblocked + owner resolution + fan-out to native HS props.
                client = _client()
                props = _build_v2_product_properties(
                    client, body, require_create_fields=True
                )
                created = client.create_product(props)
            else:
                # Legacy v1 contract — preserved verbatim during the dual-write
                # window so in-flight callers keep working.
                name = body.get("name")
                sku = body.get("sku")
                if not name or not sku:
                    return jsonify({"error": "name and sku are required"}), 400

                props = {
                    "name": name,
                    "hs_sku": sku,
                }
                if body.get("description"):
                    props["description"] = body["description"]
                if body.get("unitPrice") is not None:
                    props["price"] = body["unitPrice"]
                if body.get("costOfGoodsSold") is not None:
                    props["cost_of_goods_sold"] = body["costOfGoodsSold"]
                if body.get("tax") is not None:
                    props["tax"] = body["tax"]
                # TASK-605 hotfix: skip hs_recurring (PROPERTY_DOESNT_EXIST in
                # portal 48713323). Recurrence captured via billing_period.
                if body.get("billingFrequency"):
                    props["hs_recurring_billing_period"] = body["billingFrequency"]
                if body.get("billingPeriodCount") is not None:
                    props["hs_recurring_billing_frequency"] = body["billingPeriodCount"]
                props.update(_extract_greenhouse_custom_properties(body))

                created = _client().create_product(props)

            created_props = created.get("properties") or {}
            return jsonify({
                "hubspotProductId": str(created.get("id")),
                "name": created_props.get("name"),
                "sku": created_props.get("hs_sku"),
            }), 201
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.patch("/products/<product_id>")
    def update_product_endpoint(product_id: str):
        auth_error = _require_integration_write_auth()
        if auth_error:
            return auth_error

        try:
            body = request.get_json(force=True) or {}
            if body.get("isArchived") is True:
                return jsonify({"error": "Use POST /products/<id>/archive to archive a product"}), 400

            if _is_v2_request(request):
                # TASK-587 / TASK-603 — v2 contract applied as a partial update.
                client = _client()
                props = _build_v2_product_properties(
                    client, body, require_create_fields=False
                )
            else:
                client = _client()
                props = {}
                if "name" in body:
                    props["name"] = _normalize_hubspot_write_value(body["name"])
                if "sku" in body:
                    props["hs_sku"] = _normalize_hubspot_write_value(body["sku"])
                if "description" in body:
                    props["description"] = _normalize_hubspot_write_value(body["description"])
                if "unitPrice" in body:
                    props["price"] = _normalize_hubspot_write_value(body["unitPrice"])
                if "costOfGoodsSold" in body:
                    props["cost_of_goods_sold"] = _normalize_hubspot_write_value(body["costOfGoodsSold"])
                if "tax" in body:
                    props["tax"] = _normalize_hubspot_write_value(body["tax"])
                # TASK-605 hotfix: skip hs_recurring (PROPERTY_DOESNT_EXIST).
                if "billingFrequency" in body:
                    props["hs_recurring_billing_period"] = _normalize_hubspot_write_value(body["billingFrequency"])
                if "billingPeriodCount" in body:
                    props["hs_recurring_billing_frequency"] = _normalize_hubspot_write_value(body["billingPeriodCount"])
                props.update(_extract_greenhouse_custom_properties(body))

            if not props:
                return jsonify({"error": "No fields to update"}), 400

            updated = client.update_product(product_id, props)
            return jsonify(
                {
                    "status": "updated",
                    "hubspotProductId": str(updated.get("id") or product_id),
                    "fieldsWritten": list(props.keys()),
                }
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.post("/products/<product_id>/archive")
    def archive_product_endpoint(product_id: str):
        auth_error = _require_integration_write_auth()
        if auth_error:
            return auth_error

        try:
            _client().archive_product(product_id)
            return jsonify(
                {
                    "status": "archived",
                    "hubspotProductId": product_id,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/products/reconcile")
    def reconcile_products():
        try:
            limit = request.args.get("limit", default=100, type=int) or 100
            limit = max(1, min(limit, 100))
            include_archived = (
                request.args.get("includeArchived", "").strip().lower()
                in {"1", "true", "yes"}
            )
            stage, after = _parse_reconcile_cursor(request.args.get("cursor"))
            page = _client().list_products_page(
                limit=limit,
                after=after,
                archived=(stage == "archived"),
                properties=HubSpotClient.RECONCILE_PRODUCT_PROPERTIES,
            )
            items = [
                build_product_reconcile_item(product)
                for product in (page.get("results") or [])
            ]

            paging = page.get("paging") or {}
            next_page = paging.get("next") or {}
            next_cursor = _next_reconcile_cursor(stage, next_page.get("after"))
            if not next_cursor and include_archived and stage == "active":
                next_cursor = "archived:"

            return jsonify(
                {
                    "status": "ok",
                    "items": items,
                    "nextCursor": next_cursor,
                }
            )
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    # ------------------------------------------------------------------
    # Line Items (TASK-211)
    # ------------------------------------------------------------------

    @app.get("/quotes/<quote_id>/line-items")
    def quote_line_items(quote_id: str):
        try:
            client = _client()
            li_ids = client.list_quote_line_item_ids(quote_id)
            if not li_ids:
                return jsonify({"hubspotQuoteId": quote_id, "count": 0, "lineItems": []})

            line_items_raw = client.get_line_items_by_ids(li_ids)
            line_items = [build_line_item_profile(li) for li in line_items_raw]
            return jsonify({
                "hubspotQuoteId": quote_id,
                "count": len(line_items),
                "lineItems": line_items,
            })
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    # ------------------------------------------------------------------
    # Quotes (TASK-210)
    # ------------------------------------------------------------------

    @app.get("/companies/<company_id>/quotes")
    def company_quotes(company_id: str):
        try:
            client = _client()
            quote_ids = client.list_company_quote_ids(company_id)
            if not quote_ids:
                return jsonify(
                    {
                        "hubspotCompanyId": company_id,
                        "count": 0,
                        "quotes": [],
                    }
                )

            quotes_raw = client.get_quotes_by_ids(quote_ids)
            # Enrich each quote with associations (batch read doesn't include them)
            quotes = []
            for q in quotes_raw:
                try:
                    enriched = client.get_quote(str(q.get("id")))
                    quotes.append(build_quote_profile(enriched))
                except HubSpotIntegrationError:
                    # Fall back to basic profile without associations
                    quotes.append(build_quote_profile(q))

            return jsonify(
                {
                    "hubspotCompanyId": company_id,
                    "count": len(quotes),
                    "quotes": quotes,
                }
            )
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.post("/quotes")
    def create_quote():
        auth_error = _require_integration_write_auth()
        if auth_error:
            return auth_error

        try:
            body = request.get_json(force=True) or {}
            client = _client()

            title = body.get("title")
            expiration_date = body.get("expirationDate")
            if not title or not expiration_date:
                return jsonify({"error": "title and expirationDate are required"}), 400

            # 1. Create quote draft
            quote_props = {
                "hs_title": title,
                "hs_expiration_date": expiration_date,
                "hs_status": "DRAFT",
            }
            if body.get("language"):
                quote_props["hs_language"] = body["language"]
            if body.get("locale"):
                quote_props["hs_locale"] = body["locale"]

            sender = body.get("sender") or {}
            if sender.get("firstName"):
                quote_props["hs_sender_firstname"] = sender["firstName"]
            if sender.get("lastName"):
                quote_props["hs_sender_lastname"] = sender["lastName"]
            if sender.get("email"):
                quote_props["hs_sender_email"] = sender["email"]
            if sender.get("companyName"):
                quote_props["hs_sender_company_name"] = sender["companyName"]

            created_quote = client.create_quote(quote_props)
            hs_quote_id = str(created_quote.get("id"))

            # 2. Create and associate line items
            line_item_ids = []
            for li in body.get("lineItems") or []:
                li_props = {
                    "name": li.get("name", "Item"),
                    "quantity": li.get("quantity", 1),
                    "price": li.get("unitPrice", 0),
                }
                if li.get("description"):
                    li_props["description"] = li["description"]

                created_li = client.create_line_item(li_props)
                li_id = str(created_li.get("id"))
                line_item_ids.append(li_id)

                # Use HubSpot default unlabeled associations for standard objects.
                client.create_default_association("line_items", li_id, "quotes", hs_quote_id)

            # 3. Associate to deal if provided
            associations = body.get("associations") or {}
            deal_id = associations.get("dealId")
            if deal_id:
                client.create_default_association("quotes", hs_quote_id, "deals", deal_id)

            # 4. Associate to company if provided
            company_id = associations.get("companyId")
            if company_id:
                client.create_default_association(
                    "quotes", hs_quote_id, "companies", company_id
                )

            # 5. Associate to contacts if provided
            for contact_id in associations.get("contactIds") or []:
                client.create_default_association(
                    "quotes", hs_quote_id, "contacts", contact_id
                )

            # 6. Read back to get computed fields
            final_quote = client.get_quote(hs_quote_id)
            final_props = final_quote.get("properties") or {}

            return jsonify(
                {
                    "hubspotQuoteId": hs_quote_id,
                    "quoteNumber": final_props.get("hs_quote_number"),
                    "status": final_props.get("hs_status", "DRAFT"),
                    "quoteLink": final_props.get("hs_quote_link"),
                    "associations": {
                        "dealId": deal_id,
                        "lineItemIds": line_item_ids,
                    },
                }
            ), 201
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.post("/webhooks/hubspot")
    def hubspot_webhook():
        try:
            signature_version = request.headers.get(
                "X-HubSpot-Signature-Version", "v3"
            )
            signature_header = (
                "X-HubSpot-Signature"
                if signature_version.lower() == "v1"
                else "X-HubSpot-Signature-v3"
            )
            validate_hubspot_request_signature(
                app_secret=app.config["hubspot_app_client_secret"],
                signature_version=signature_version,
                method=request.method,
                request_uri=request.url,
                body=request.get_data(cache=True),
                timestamp=request.headers.get("X-HubSpot-Request-Timestamp", ""),
                signature=request.headers.get(signature_header, ""),
                max_age_ms=app.config["webhook_max_age_ms"],
            )
            events = parse_webhook_events(request.get_data(cache=True))
            company_ids = extract_company_ids_from_webhook_events(
                events,
                business_line_prop=app.config["business_line_prop"],
                service_module_prop=app.config["service_module_prop"],
            )
        except HubSpotWebhookValidationError as exc:
            return jsonify({"error": str(exc)}), 401
        except ValueError as exc:
            return jsonify({"error": str(exc)}), 400

        if not company_ids:
            return jsonify(
                {
                    "receivedEvents": len(events),
                    "matchedCompanyIds": [],
                    "processed": 0,
                    "status": "ignored",
                }
            ), 202

        results = [
            sync_company_capabilities_from_hubspot(
                hubspot_client=_client(),
                greenhouse_client=_greenhouse_client(),
                hubspot_company_id=company_id,
                business_line_prop=app.config["business_line_prop"],
                service_module_prop=app.config["service_module_prop"],
            )
            for company_id in company_ids
        ]

        response_payload = {
            "receivedEvents": len(events),
            "matchedCompanyIds": company_ids,
            "processed": len(results),
            "results": [
                {
                    "hubspotCompanyId": result.hubspot_company_id,
                    "businessLines": result.business_lines,
                    "serviceModules": result.service_modules,
                    "greenhouseStatus": result.greenhouse_status,
                    "error": result.error,
                }
                for result in results
            ],
        }
        has_errors = any(result.error for result in results)
        return jsonify(response_payload), (207 if has_errors else 202)

    return app


app = create_app()
