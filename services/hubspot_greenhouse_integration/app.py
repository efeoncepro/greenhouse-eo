from flask import Flask, jsonify, request

try:
    from .config import build_runtime_config
    from .contract import build_contract
    from .greenhouse_client import GreenhouseClient
    from .hubspot_client import HubSpotClient, HubSpotIntegrationError
    from .models import (
        build_company_profile,
        build_contact_profile,
        build_owner_profile,
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
    from models import build_company_profile, build_contact_profile, build_owner_profile, build_service_profile
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
