from flask import Flask, jsonify, request

try:
    from .config import build_runtime_config
    from .contract import build_contract
    from .greenhouse_client import GreenhouseClient
    from .hubspot_client import HubSpotClient, HubSpotIntegrationError
    from .models import (
        build_company_profile,
        build_contact_profile,
        build_line_item_profile,
        build_owner_profile,
        build_product_profile,
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
    from models import build_company_profile, build_contact_profile, build_line_item_profile, build_owner_profile, build_product_profile, build_quote_profile, build_service_profile
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

    # ------------------------------------------------------------------
    # Products (TASK-211)
    # ------------------------------------------------------------------

    @app.get("/products")
    def product_catalog():
        try:
            client = _client()
            products_raw = client.list_all_products()
            products = [build_product_profile(p) for p in products_raw]
            return jsonify({"count": len(products), "products": products})
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.get("/products/<product_id>")
    def product_detail(product_id: str):
        try:
            product = _client().get_product(product_id)
            return jsonify(build_product_profile(product))
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.post("/products")
    def create_product_endpoint():
        try:
            body = request.get_json(force=True) or {}
            name = body.get("name")
            sku = body.get("sku")
            if not name or not sku:
                return jsonify({"error": "name and sku are required"}), 400

            props: dict[str, Any] = {
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
            if body.get("isRecurring") is not None:
                props["hs_recurring"] = body["isRecurring"]
            if body.get("billingFrequency"):
                props["hs_recurring_billing_period"] = body["billingFrequency"]
            if body.get("billingPeriodCount") is not None:
                props["hs_recurring_billing_frequency"] = body["billingPeriodCount"]

            created = _client().create_product(props)
            created_props = created.get("properties") or {}
            return jsonify({
                "hubspotProductId": str(created.get("id")),
                "name": created_props.get("name"),
                "sku": created_props.get("hs_sku"),
            }), 201
        except HubSpotIntegrationError as exc:
            return jsonify({"error": str(exc), "status_code": exc.status_code}), (
                exc.status_code or 502
            )

    @app.patch("/products/<product_id>")
    def update_product_endpoint(product_id: str):
        try:
            body = request.get_json(force=True) or {}
            props: dict[str, Any] = {}
            if body.get("name"):
                props["name"] = body["name"]
            if body.get("sku"):
                props["hs_sku"] = body["sku"]
            if body.get("description") is not None:
                props["description"] = body["description"]
            if body.get("unitPrice") is not None:
                props["price"] = body["unitPrice"]
            if body.get("costOfGoodsSold") is not None:
                props["cost_of_goods_sold"] = body["costOfGoodsSold"]

            if not props:
                return jsonify({"error": "No fields to update"}), 400

            updated = _client().update_product(product_id, props)
            return jsonify(build_product_profile(updated))
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

                # Associate line item → quote (type 67)
                client.create_association("line_items", li_id, "quotes", hs_quote_id, 67)

            # 3. Associate to deal if provided
            associations = body.get("associations") or {}
            deal_id = associations.get("dealId")
            if deal_id:
                client.create_association("quotes", hs_quote_id, "deals", deal_id, 64)

            # 4. Associate to company if provided
            company_id = associations.get("companyId")
            if company_id:
                client.create_association("quotes", hs_quote_id, "companies", company_id, 69)

            # 5. Associate to contacts if provided
            for contact_id in associations.get("contactIds") or []:
                client.create_association("quotes", hs_quote_id, "contacts", contact_id, 70)

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
