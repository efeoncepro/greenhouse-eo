import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Any
from urllib.parse import unquote, urlparse

try:
    from .greenhouse_client import GreenhouseClient
    from .hubspot_client import HubSpotClient, HubSpotIntegrationError
    from .models import split_multivalue
except ImportError:
    from greenhouse_client import GreenhouseClient
    from hubspot_client import HubSpotClient, HubSpotIntegrationError
    from models import split_multivalue


CAPABILITY_SOURCE_SYSTEM = "hubspot_crm"
CAPABILITY_SOURCE_OBJECT_TYPE = "company"
WEBHOOK_ALLOWED_MAX_AGE_MS = 300000
COMPANY_OBJECT_TYPE_IDS = {"0-2"}


class HubSpotWebhookValidationError(RuntimeError):
    pass


def validate_hubspot_request_signature_v1(
    *,
    app_secret: str,
    body: bytes,
    signature: str,
) -> None:
    normalized_secret = app_secret.strip()
    if not normalized_secret:
        raise HubSpotWebhookValidationError("HUBSPOT_APP_CLIENT_SECRET is not set")

    if not signature:
        raise HubSpotWebhookValidationError("Missing X-HubSpot-Signature")

    expected_signature = hashlib.sha256(
        (normalized_secret + body.decode("utf-8")).encode("utf-8")
    ).hexdigest()
    if not hmac.compare_digest(expected_signature, signature):
        raise HubSpotWebhookValidationError("Invalid HubSpot webhook signature")


def _normalize_uri(uri: str) -> str:
    parsed = urlparse(uri)
    path = unquote(parsed.path or "")
    query = f"?{parsed.query}" if parsed.query else ""
    return f"{parsed.scheme}://{parsed.netloc}{path}{query}"


def validate_hubspot_request_signature(
    *,
    app_secret: str,
    signature_version: str,
    method: str,
    request_uri: str,
    body: bytes,
    timestamp: str,
    signature: str,
    max_age_ms: int = WEBHOOK_ALLOWED_MAX_AGE_MS,
    current_timestamp_ms: int | None = None,
) -> None:
    if signature_version.lower() == "v1":
        validate_hubspot_request_signature_v1(
            app_secret=app_secret,
            body=body,
            signature=signature,
        )
        return

    normalized_secret = app_secret.strip()
    if not normalized_secret:
        raise HubSpotWebhookValidationError("HUBSPOT_APP_CLIENT_SECRET is not set")

    if not signature:
        raise HubSpotWebhookValidationError("Missing X-HubSpot-Signature-v3")

    if not timestamp:
        raise HubSpotWebhookValidationError("Missing X-HubSpot-Request-Timestamp")

    try:
        request_timestamp_ms = int(timestamp)
    except ValueError as exc:
        raise HubSpotWebhookValidationError("Invalid X-HubSpot-Request-Timestamp") from exc

    now_ms = current_timestamp_ms if current_timestamp_ms is not None else time.time_ns() // 1_000_000
    if abs(now_ms - request_timestamp_ms) > max_age_ms:
        raise HubSpotWebhookValidationError("Expired HubSpot webhook request")

    raw_string = (
        method.upper() + _normalize_uri(request_uri) + body.decode("utf-8") + timestamp
    )
    digest = hmac.new(
        normalized_secret.encode("utf-8"),
        raw_string.encode("utf-8"),
        hashlib.sha256,
    ).digest()
    expected_signature = base64.b64encode(digest).decode("utf-8")
    if not hmac.compare_digest(expected_signature, signature):
        raise HubSpotWebhookValidationError("Invalid HubSpot webhook signature")


def extract_company_ids_from_webhook_events(
    events: list[dict[str, Any]],
    *,
    business_line_prop: str,
    service_module_prop: str,
) -> list[str]:
    company_ids: list[str] = []
    supported_property_names = {business_line_prop, service_module_prop}
    for event in events:
        subscription_type = str(event.get("subscriptionType") or "").strip()
        object_id = event.get("objectId")
        property_name = str(event.get("propertyName") or "").strip()
        is_supported_subscription = subscription_type in {
            "company.propertyChange",
            "object.propertyChange",
        }
        object_type_id = str(event.get("objectTypeId") or "").strip()
        if not is_supported_subscription:
            continue
        if subscription_type == "object.propertyChange" and object_type_id not in COMPANY_OBJECT_TYPE_IDS:
            continue
        if property_name not in supported_property_names:
            continue
        if object_id is None:
            continue
        company_ids.append(str(object_id))
    deduped: list[str] = []
    seen = set()
    for company_id in company_ids:
        if company_id in seen:
            continue
        seen.add(company_id)
        deduped.append(company_id)
    return deduped


@dataclass
class HubSpotWebhookSyncResult:
    hubspot_company_id: str
    business_lines: list[str]
    service_modules: list[str]
    greenhouse_status: str
    greenhouse_response: dict[str, Any] | None = None
    error: str | None = None


def sync_company_capabilities_from_hubspot(
    *,
    hubspot_client: HubSpotClient,
    greenhouse_client: GreenhouseClient,
    hubspot_company_id: str,
    business_line_prop: str,
    service_module_prop: str,
) -> HubSpotWebhookSyncResult:
    try:
        company = hubspot_client.get_company(
            hubspot_company_id,
            properties=[business_line_prop, service_module_prop],
        )
    except HubSpotIntegrationError as exc:
        return HubSpotWebhookSyncResult(
            hubspot_company_id=hubspot_company_id,
            business_lines=[],
            service_modules=[],
            greenhouse_status="hubspot_error",
            error=str(exc),
        )

    properties = company.get("properties") or {}
    business_lines = split_multivalue(properties.get(business_line_prop))
    service_modules = split_multivalue(properties.get(service_module_prop))

    try:
        response = greenhouse_client.sync_capabilities(
            source_system=CAPABILITY_SOURCE_SYSTEM,
            source_object_type=CAPABILITY_SOURCE_OBJECT_TYPE,
            source_object_id=str(company.get("id") or hubspot_company_id),
            business_lines=business_lines,
            service_modules=service_modules,
        )
    except Exception as exc:  # pragma: no cover - defensive wrapper for webhook runtime
        return HubSpotWebhookSyncResult(
            hubspot_company_id=hubspot_company_id,
            business_lines=business_lines,
            service_modules=service_modules,
            greenhouse_status="greenhouse_error",
            error=str(exc),
        )

    return HubSpotWebhookSyncResult(
        hubspot_company_id=hubspot_company_id,
        business_lines=business_lines,
        service_modules=service_modules,
        greenhouse_status="synced",
        greenhouse_response=response,
    )


def parse_webhook_events(body: bytes) -> list[dict[str, Any]]:
    if not body:
        return []

    payload = json.loads(body.decode("utf-8"))
    if not isinstance(payload, list):
        raise HubSpotWebhookValidationError("Webhook payload must be a JSON array")

    normalized_events = [event for event in payload if isinstance(event, dict)]
    return normalized_events
