import os


HUBSPOT_API = "https://api.hubapi.com"
SERVICE_VERSION = "0.1.0"
DEFAULT_TIMEOUT_SECONDS = int(
    os.environ.get("HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_SECONDS", "30")
)
DEFAULT_WEBHOOK_MAX_AGE_MS = int(
    os.environ.get("HUBSPOT_GREENHOUSE_WEBHOOK_MAX_AGE_MS", "300000")
)
DEFAULT_BUSINESS_LINE_PROP = os.environ.get(
    "HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP", "linea_de_servicio"
)
DEFAULT_SERVICE_MODULE_PROP = os.environ.get(
    "HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP", "servicios_especificos"
)
DEFAULT_GREENHOUSE_BASE_URL = os.environ.get("GREENHOUSE_BASE_URL", "").strip()
DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN = os.environ.get(
    "GREENHOUSE_INTEGRATION_API_TOKEN", ""
).strip()
DEFAULT_HUBSPOT_APP_CLIENT_SECRET = os.environ.get(
    "HUBSPOT_APP_CLIENT_SECRET", ""
).strip()


def build_runtime_config() -> dict:
    access_token = os.environ.get("HUBSPOT_ACCESS_TOKEN", "").strip()
    return {
        "service_name": "hubspot-greenhouse-integration",
        "service_version": SERVICE_VERSION,
        "hubspot_api": HUBSPOT_API,
        "timeout_seconds": DEFAULT_TIMEOUT_SECONDS,
        "webhook_max_age_ms": DEFAULT_WEBHOOK_MAX_AGE_MS,
        "hubspot_access_token": access_token,
        "hubspot_app_client_secret": DEFAULT_HUBSPOT_APP_CLIENT_SECRET,
        "greenhouse_base_url": DEFAULT_GREENHOUSE_BASE_URL,
        "greenhouse_integration_api_token": DEFAULT_GREENHOUSE_INTEGRATION_API_TOKEN,
        "business_line_prop": DEFAULT_BUSINESS_LINE_PROP,
        "service_module_prop": DEFAULT_SERVICE_MODULE_PROP,
    }
