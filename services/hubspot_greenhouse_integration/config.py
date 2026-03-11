import os


HUBSPOT_API = "https://api.hubapi.com"
SERVICE_VERSION = "0.1.0"
DEFAULT_TIMEOUT_SECONDS = int(
    os.environ.get("HUBSPOT_GREENHOUSE_INTEGRATION_TIMEOUT_SECONDS", "30")
)
DEFAULT_BUSINESS_LINE_PROP = os.environ.get(
    "HUBSPOT_GREENHOUSE_BUSINESS_LINE_PROP", "linea_de_servicio"
)
DEFAULT_SERVICE_MODULE_PROP = os.environ.get(
    "HUBSPOT_GREENHOUSE_SERVICE_MODULE_PROP", "servicios_especificos"
)


def build_runtime_config() -> dict:
    return {
        "service_name": "hubspot-greenhouse-integration",
        "service_version": SERVICE_VERSION,
        "hubspot_api": HUBSPOT_API,
        "timeout_seconds": DEFAULT_TIMEOUT_SECONDS,
        "hubspot_access_token": os.environ.get("HUBSPOT_ACCESS_TOKEN", ""),
        "business_line_prop": DEFAULT_BUSINESS_LINE_PROP,
        "service_module_prop": DEFAULT_SERVICE_MODULE_PROP,
    }
