from flask import Flask, jsonify

from .config import build_runtime_config
from .contract import build_contract
from .hubspot_client import HubSpotClient, HubSpotIntegrationError
from .models import build_company_profile, build_owner_profile


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.update(build_runtime_config())

    def _client() -> HubSpotClient:
        return HubSpotClient(
            access_token=app.config["hubspot_access_token"],
            timeout_seconds=app.config["timeout_seconds"],
        )

    @app.get("/health")
    def health():
        return jsonify(
            {
                "service": app.config["service_name"],
                "version": app.config["service_version"],
                "status": "ok",
                "hubspotConfigured": bool(app.config["hubspot_access_token"]),
                "realtime": False,
            }
        )

    @app.get("/contract")
    def contract():
        return jsonify(build_contract(app.config))

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

    return app


app = create_app()
