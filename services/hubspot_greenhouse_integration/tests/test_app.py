import base64
import hashlib
import hmac
import json
import importlib.util
import pathlib
import sys
import types
import unittest
from unittest.mock import MagicMock, patch

from services.hubspot_greenhouse_integration.contract import build_contract
from services.hubspot_greenhouse_integration.hubspot_client import HubSpotClient, HubSpotIntegrationError
from services.hubspot_greenhouse_integration.models import (
    build_company_profile,
    build_company_search_item,
    build_contact_profile,
    build_owner_profile,
)
from services.hubspot_greenhouse_integration.webhooks import (
    extract_company_ids_from_webhook_events,
    validate_hubspot_request_signature,
    HubSpotWebhookValidationError,
)


class HubSpotGreenhouseIntegrationAppTests(unittest.TestCase):
    def test_standalone_app_imports_from_service_source_root(self):
        # Monorepo layout (TASK-574): tests live at
        # services/hubspot_greenhouse_integration/tests/, so parents[1] is
        # the service source dir directly (previously in sibling layout the
        # tests were at repo root + /services/hubspot_greenhouse_integration).
        service_dir = pathlib.Path(__file__).resolve().parents[1]
        fake_flask = types.ModuleType("flask")

        class FakeFlask:
            def __init__(self, name):
                self.name = name
                self.config = {}

            def get(self, _path):
                def decorator(func):
                    return func

                return decorator

            def post(self, _path):
                def decorator(func):
                    return func

                return decorator

            def patch(self, _path):
                def decorator(func):
                    return func

                return decorator

        fake_flask.Flask = FakeFlask
        fake_flask.jsonify = lambda payload: payload
        fake_flask.request = object()
        sys.path.insert(0, str(service_dir))
        original_flask = sys.modules.get("flask")
        sys.modules["flask"] = fake_flask
        try:
            spec = importlib.util.spec_from_file_location(
                "standalone_service_app",
                service_dir / "app.py",
            )
            module = importlib.util.module_from_spec(spec)
            assert spec.loader is not None
            spec.loader.exec_module(module)
        finally:
            sys.path = [entry for entry in sys.path if entry != str(service_dir)]
            if original_flask is None:
                sys.modules.pop("flask", None)
            else:
                sys.modules["flask"] = original_flask

        self.assertTrue(hasattr(module, "app"))

    def test_contract_declares_company_owner_surface(self):
        contract = build_contract(
            {
                "service_name": "hubspot-greenhouse-integration",
                "service_version": "0.1.0",
                "business_line_prop": "linea_de_servicio",
                "service_module_prop": "servicios_especificos",
                "hubspot_app_client_secret": "",
                "greenhouse_base_url": "",
                "greenhouse_integration_api_token": "",
            }
        )

        self.assertEqual(contract["actions"]["company_owner"]["method"], "GET")
        self.assertEqual(contract["actions"]["owner_resolution"]["method"], "GET")
        self.assertEqual(contract["actions"]["owner_resolution"]["path"], "/owners/resolve?email={email}")
        self.assertEqual(contract["actions"]["company_search"]["method"], "GET")
        self.assertEqual(contract["actions"]["company_contacts"]["method"], "GET")
        self.assertEqual(contract["actions"]["company_deals"]["method"], "GET")
        self.assertEqual(contract["actions"]["company_deals"]["path"], "/companies/{hubspotCompanyId}/deals")
        self.assertEqual(contract["actions"]["company_lifecycle_update"]["method"], "PATCH")
        self.assertEqual(contract["actions"]["deal_create"]["method"], "POST")
        self.assertEqual(contract["actions"]["deal_create"]["path"], "/deals")
        self.assertEqual(contract["actions"]["deal_metadata"]["method"], "GET")
        self.assertEqual(contract["actions"]["deal_metadata"]["path"], "/deals/metadata")
        self.assertEqual(contract["actions"]["product_create"]["method"], "POST")
        self.assertEqual(contract["actions"]["product_update"]["method"], "PATCH")
        self.assertEqual(contract["actions"]["product_archive"]["method"], "POST")
        self.assertEqual(contract["actions"]["product_reconcile"]["path"], "/products/reconcile")
        self.assertEqual(contract["writeAuth"]["type"], "integration_token")
        self.assertIn("deal_create", contract["writeAuth"]["appliesTo"])
        self.assertIn("product_update", contract["writeAuth"]["appliesTo"])
        self.assertFalse(contract["realtime"]["supported"])
        self.assertEqual(contract["actions"]["hubspot_webhook"]["method"], "POST")
        self.assertIn("industry", contract["sourceFields"]["companies"])
        self.assertIn("gh_idempotency_key", contract["sourceFields"]["deals"])
        self.assertIn("dealtype", contract["sourceFields"]["deals"])
        self.assertIn("hs_priority", contract["sourceFields"]["deals"])
        self.assertIn("gh_last_write_at", contract["sourceFields"]["companies"])
        self.assertIn("email", contract["sourceFields"]["contacts"])
        self.assertIn("gh_product_code", contract["sourceFields"]["products"])
        self.assertIn("gh_business_line", contract["sourceFields"]["products"])
        self.assertIn("dealType", contract["dealCreateModel"]["optional"])
        self.assertIn("priority", contract["dealCreateModel"]["optional"])
        self.assertIn("dealTypeUsed", contract["dealCreateModel"]["response"])
        self.assertIn("priorityUsed", contract["dealCreateModel"]["response"])
        self.assertIn("email", contract["ownerResolutionModel"]["required"])
        self.assertIn("owner", contract["ownerResolutionModel"]["response"])
        self.assertIn("hubspotCompanyId", contract["companyDealsModel"]["required"])
        self.assertIn("deals", contract["companyDealsModel"]["response"])
        self.assertEqual(
            contract["dealMetadataModel"]["supportedPropertyLookups"],
            ["dealtype", "hs_priority"],
        )

    def test_hubspot_client_strips_access_token_whitespace(self):
        client = HubSpotClient(access_token=" token-with-newline\r\n", timeout_seconds=30)

        self.assertEqual(client.access_token, "token-with-newline")

    def test_build_owner_profile_returns_display_name(self):
        owner = {
            "email": "owner@example.com",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "userId": 77,
            "archived": False,
        }

        payload = build_owner_profile("42", owner)

        self.assertEqual(payload["hubspotOwnerId"], "42")
        self.assertEqual(payload["ownerDisplayName"], "Ada Lovelace")
        self.assertEqual(payload["ownerEmail"], "owner@example.com")

    def test_hubspot_client_resolve_owner_by_email_uses_email_filter_and_archived_fallback(self):
        client = HubSpotClient(access_token=" token-with-newline\r\n", timeout_seconds=30)

        active_owner = {
            "id": "41",
            "email": "other@example.com",
            "firstName": "Other",
            "lastName": "Owner",
            "userId": 11,
            "archived": False,
        }
        archived_owner = {
            "id": "42",
            "email": "owner@example.com",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "userId": 77,
            "archived": True,
        }

        with patch.object(
            HubSpotClient,
            "list_owners",
            side_effect=[
                [active_owner],
                [archived_owner],
            ],
        ) as list_owners:
            payload = client.resolve_owner_by_email(" Owner@Example.com ")

        self.assertEqual(payload, archived_owner)
        self.assertEqual(list_owners.call_args_list[0].kwargs["email"], "Owner@Example.com")
        self.assertFalse(list_owners.call_args_list[0].kwargs["archived"])
        self.assertTrue(list_owners.call_args_list[1].kwargs["archived"])

    def test_build_company_profile_returns_identity_owner_and_capabilities(self):
        company = {
            "id": "123",
            "properties": {
                "name": "Acme",
                "domain": "acme.com",
                "website": "https://acme.com",
                "industry": "Software",
                "country": "Chile",
                "city": "Santiago",
                "state": "RM",
                "lifecyclestage": "customer",
                "hs_current_customer": "true",
                "hubspot_team_id": "77",
                "hubspot_owner_id": "42",
                "gh_commercial_party_id": "EO-ORG-0001",
                "gh_last_quote_at": "2026-04-21T21:00:00.000Z",
                "gh_last_contract_at": "2026-04-21T21:30:00.000Z",
                "gh_active_contracts_count": "2",
                "gh_last_write_at": "2026-04-21T21:45:00.000Z",
                "gh_mrr_tier": "active_client",
                "linea_de_servicio": "Globe",
                "servicios_especificos": "Agencia Creativa;SEO / AEO",
            },
        }

        payload = build_company_profile(
            company,
            business_line_prop="linea_de_servicio",
            service_module_prop="servicios_especificos",
        )

        self.assertEqual(payload["identity"]["name"], "Acme")
        self.assertEqual(payload["owner"]["hubspotOwnerId"], "42")
        self.assertEqual(payload["lifecycle"]["ghCommercialPartyId"], "EO-ORG-0001")
        self.assertEqual(payload["lifecycle"]["ghActiveContractsCount"], 2)
        self.assertEqual(payload["lifecycle"]["ghLastWriteAt"], "2026-04-21T21:45:00.000Z")
        self.assertEqual(payload["capabilities"]["businessLines"], ["Globe"])
        self.assertEqual(
            payload["capabilities"]["serviceModules"],
            ["Agencia Creativa", "SEO / AEO"],
        )

    def test_build_company_search_item_returns_search_fields(self):
        company = {
            "id": "123",
            "updatedAt": "2026-04-22T12:00:00.000Z",
            "properties": {
                "name": "Carozzi",
                "domain": "carozzi.cl",
                "website": "https://carozzi.cl",
                "lifecyclestage": "lead",
            },
        }

        payload = build_company_search_item(company)

        self.assertEqual(payload["hubspotCompanyId"], "123")
        self.assertEqual(payload["displayName"], "Carozzi")
        self.assertEqual(payload["domain"], "carozzi.cl")
        self.assertEqual(payload["lifecyclestage"], "lead")
        self.assertEqual(payload["lastModifiedAt"], "2026-04-22T12:00:00.000Z")

    def test_build_contact_profile_returns_contact_fields(self):
        contact = {
            "id": "555",
            "properties": {
                "email": "person@example.com",
                "firstname": "Ada",
                "lastname": "Lovelace",
                "phone": "+56 9 1234 5678",
                "mobilephone": "+56 9 9999 9999",
                "jobtitle": "CTO",
                "lifecyclestage": "customer",
                "hs_lead_status": "OPEN",
                "company": "Acme",
            },
        }

        payload = build_contact_profile(contact)

        self.assertEqual(payload["hubspotContactId"], "555")
        self.assertEqual(payload["displayName"], "Ada Lovelace")
        self.assertEqual(payload["jobTitle"], "CTO")
        self.assertEqual(payload["hsLeadStatus"], "OPEN")

    def test_extract_company_ids_from_webhook_events_filters_capability_properties(self):
        events = [
            {
                "subscriptionType": "object.propertyChange",
                "objectTypeId": "0-2",
                "propertyName": "linea_de_servicio",
                "objectId": 101,
            },
            {
                "subscriptionType": "object.propertyChange",
                "objectTypeId": "0-2",
                "propertyName": "servicios_especificos",
                "objectId": 101,
            },
            {
                "subscriptionType": "object.propertyChange",
                "objectTypeId": "0-2",
                "propertyName": "industry",
                "objectId": 999,
            },
            {
                "subscriptionType": "object.propertyChange",
                "objectTypeId": "0-1",
                "propertyName": "linea_de_servicio",
                "objectId": 202,
            },
        ]

        company_ids = extract_company_ids_from_webhook_events(
            events,
            business_line_prop="linea_de_servicio",
            service_module_prop="servicios_especificos",
        )

        self.assertEqual(company_ids, ["101"])

    def test_validate_hubspot_request_signature_accepts_valid_v3_signature(self):
        body = b'[{"objectId":123}]'
        timestamp = "1700000000000"
        request_uri = "https://example.com/webhooks/hubspot"
        source = "POST" + request_uri + body.decode("utf-8") + timestamp
        signature = base64.b64encode(
            hmac.new(
                b"test-secret",
                source.encode("utf-8"),
                hashlib.sha256,
            ).digest()
        ).decode("utf-8")

        validate_hubspot_request_signature(
            app_secret="test-secret",
            signature_version="v3",
            method="POST",
            request_uri=request_uri,
            body=body,
            timestamp=timestamp,
            signature=signature,
            current_timestamp_ms=1700000000000,
        )

    def test_validate_hubspot_request_signature_accepts_valid_v1_signature(self):
        body = b'[{"objectId":123}]'
        signature = hashlib.sha256(b"test-secret" + body).hexdigest()

        validate_hubspot_request_signature(
            app_secret="test-secret",
            signature_version="v1",
            method="POST",
            request_uri="https://example.com/webhooks/hubspot",
            body=body,
            timestamp="",
            signature=signature,
        )

    def test_validate_hubspot_request_signature_rejects_bad_signature(self):
        with self.assertRaises(HubSpotWebhookValidationError):
            validate_hubspot_request_signature(
                app_secret="test-secret",
                signature_version="v3",
                method="POST",
                request_uri="https://example.com/webhooks/hubspot",
                body=b"[]",
                timestamp="1700000000000",
                signature="bad-signature",
                current_timestamp_ms=1700000000000,
            )

    def test_webhook_route_syncs_company_capabilities(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "hubspot_app_client_secret": "test-secret",
                "greenhouse_base_url": "https://greenhouse.example.com",
                "greenhouse_integration_api_token": "ghi-token",
                "business_line_prop": "linea_de_servicio",
                "service_module_prop": "servicios_especificos",
                "timeout_seconds": 30,
                "webhook_max_age_ms": 300000,
            }
        )
        client = app.test_client()
        payload = [
            {
                "subscriptionType": "object.propertyChange",
                "objectTypeId": "0-2",
                "propertyName": "linea_de_servicio",
                "objectId": 30825221458,
            }
        ]
        body = json.dumps(payload).encode("utf-8")
        signature = hashlib.sha256(b"test-secret" + body).hexdigest()

        fake_hubspot = MagicMock()
        fake_hubspot.get_company.return_value = {
            "id": "30825221458",
            "properties": {
                "linea_de_servicio": "globe",
                "servicios_especificos": "agencia_creativa;seo_aeo",
            },
        }
        fake_greenhouse = MagicMock()
        fake_greenhouse.sync_capabilities.return_value = {"status": "ok"}

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ), patch(
            "services.hubspot_greenhouse_integration.app.GreenhouseClient",
            return_value=fake_greenhouse,
        ):
            response = client.post(
                "/webhooks/hubspot",
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "X-HubSpot-Signature-Version": "v1",
                    "X-HubSpot-Signature": signature,
                },
                base_url="http://localhost",
            )

        self.assertEqual(response.status_code, 202)
        payload = response.get_json()
        self.assertEqual(payload["matchedCompanyIds"], ["30825221458"])
        self.assertEqual(payload["results"][0]["greenhouseStatus"], "synced")

    def test_company_contacts_route_returns_associated_contacts(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_company_contact_ids.return_value = ["42", "43"]
        fake_hubspot.get_contacts_by_ids.return_value = [
            {
                "id": "42",
                "properties": {
                    "email": "ada@example.com",
                    "firstname": "Ada",
                    "lastname": "Lovelace",
                    "jobtitle": "CTO",
                },
            },
            {
                "id": "43",
                "properties": {
                    "email": "grace@example.com",
                    "firstname": "Grace",
                    "lastname": "Hopper",
                    "jobtitle": "COO",
                },
            },
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/companies/30825221458/contacts")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["hubspotCompanyId"], "30825221458")
        self.assertEqual(payload["count"], 2)
        self.assertEqual(payload["contacts"][0]["hubspotContactId"], "42")
        self.assertEqual(payload["contacts"][1]["displayName"], "Grace Hopper")

    def test_company_search_route_returns_matching_companies(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "business_line_prop": "linea_de_servicio",
                "service_module_prop": "servicios_especificos",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.search_companies.return_value = [
            {
                "id": "53968999843",
                "updatedAt": "2026-04-22T11:00:00.000Z",
                "properties": {
                    "name": "Carozzi",
                    "domain": "carozzi.cl",
                    "website": "https://carozzi.cl",
                    "lifecyclestage": "lead",
                },
            }
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/companies/search?q=carozzi&limit=10")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["query"], "carozzi")
        self.assertEqual(payload["count"], 1)
        self.assertEqual(payload["companies"][0]["hubspotCompanyId"], "53968999843")
        self.assertEqual(payload["companies"][0]["displayName"], "Carozzi")

    def test_owner_resolution_route_returns_owner_profile_when_found(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.resolve_owner_by_email.return_value = {
            "id": "42",
            "email": "owner@example.com",
            "firstName": "Ada",
            "lastName": "Lovelace",
            "userId": 77,
            "archived": False,
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/owners/resolve?email=owner@example.com")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["email"], "owner@example.com")
        self.assertEqual(payload["owner"]["hubspotOwnerId"], "42")
        self.assertEqual(payload["owner"]["ownerEmail"], "owner@example.com")

    def test_owner_resolution_route_returns_null_owner_when_no_match(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.resolve_owner_by_email.return_value = None

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/owners/resolve?email=missing@example.com")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["email"], "missing@example.com")
        self.assertIsNone(payload["owner"])

    def test_hubspot_client_lists_company_deal_ids_with_pagination_and_dedupe(self):
        client = HubSpotClient(access_token="hubspot-token", timeout_seconds=30)
        page_one = MagicMock()
        page_one.status_code = 200
        page_one.json.return_value = {
            "results": [{"toObjectId": 10}, {"toObjectId": 11}],
            "paging": {"next": {"after": "cursor-1"}},
        }
        page_two = MagicMock()
        page_two.status_code = 200
        page_two.json.return_value = {
            "results": [{"toObjectId": 11}, {"toObjectId": 12}],
        }

        with patch.object(client.session, "get", side_effect=[page_one, page_two]) as session_get:
            deal_ids = client.list_company_deal_ids("12345")

        self.assertEqual(deal_ids, ["10", "11", "12"])
        self.assertEqual(session_get.call_count, 2)
        self.assertIn("/crm/v4/objects/companies/12345/associations/deals", session_get.call_args_list[0].args[0])

    def test_company_deals_route_returns_live_deal_profiles(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_company_deal_ids.return_value = ["200", "100"]
        fake_hubspot.get_deals_by_ids.return_value = [
            {
                "id": "100",
                "properties": {
                    "dealname": "Aguas Andinas Renewal",
                    "amount": "150000",
                    "deal_currency_code": "CLP",
                    "pipeline": "default",
                    "dealstage": "appointmentscheduled",
                    "dealtype": "newbusiness",
                    "hs_priority": "HIGH",
                    "hubspot_owner_id": "75788512",
                    "closedate": "2026-05-15",
                    "createdate": "2026-04-20T12:00:00.000Z",
                    "hs_lastmodifieddate": "2026-04-22T12:00:00.000Z",
                },
            },
            {
                "id": "200",
                "properties": {
                    "dealname": "Aguas Andinas Historic Deal",
                    "amount": "90000",
                    "deal_currency_code": "CLP",
                    "pipeline": "default",
                    "dealstage": "qualifiedtobuy",
                    "dealtype": "newbusiness",
                    "hs_priority": "MEDIUM",
                    "hubspot_owner_id": "75788512",
                    "closedate": "2026-04-30",
                    "createdate": "2026-04-18T12:00:00.000Z",
                    "hs_lastmodifieddate": "2026-04-23T12:00:00.000Z",
                },
            },
        ]
        fake_hubspot.list_deal_pipelines.return_value = [
            {
                "id": "default",
                "label": "Pipeline de ventas",
                "displayOrder": 0,
                "archived": False,
                "stages": [
                    {
                        "id": "appointmentscheduled",
                        "label": "Cita programada",
                        "displayOrder": 0,
                        "archived": False,
                        "metadata": {"isClosed": "false", "probability": "0.2"},
                    },
                    {
                        "id": "qualifiedtobuy",
                        "label": "Calificado para comprar",
                        "displayOrder": 1,
                        "archived": False,
                        "metadata": {"isClosed": "false", "probability": "0.4"},
                    },
                ],
            }
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/companies/27770331813/deals")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["hubspotCompanyId"], "27770331813")
        self.assertEqual(payload["count"], 2)
        self.assertEqual(payload["deals"][0]["hubspotDealId"], "200")
        self.assertEqual(payload["deals"][0]["pipelineLabel"], "Pipeline de ventas")
        self.assertEqual(payload["deals"][0]["stageLabel"], "Calificado para comprar")
        self.assertEqual(payload["deals"][0]["probabilityPct"], 40)
        self.assertFalse(payload["deals"][0]["isClosed"])

    def test_company_lifecycle_patch_requires_integration_token(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.patch(
            "/companies/30825221458/lifecycle",
            json={"lifecycleStage": "customer", "ghLastWriteAt": "2026-04-21T22:00:00.000Z"},
        )

        self.assertEqual(response.status_code, 401)

    def test_company_lifecycle_patch_updates_company_properties(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.update_company.return_value = {"id": "30825221458", "properties": {}}

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.patch(
                "/companies/30825221458/lifecycle",
                json={
                    "commercialPartyId": "cp-001",
                    "lifecycleStage": "customer",
                    "activeContractsCount": 2,
                    "lastQuoteAt": "2026-04-20T22:00:00.000Z",
                    "lastContractAt": "2026-04-21T22:00:00.000Z",
                    "ghLastWriteAt": "2026-04-21T22:01:00.000Z",
                    "mrrTier": "active_client",
                },
                headers={"x-greenhouse-integration-key": "ghi-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "updated")
        self.assertIn("lifecyclestage", payload["fieldsWritten"])
        self.assertIn("gh_last_write_at", payload["fieldsWritten"])

    def test_deal_create_requires_integration_token(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.post(
            "/deals",
            json={
                "idempotencyKey": "idem-1",
                "hubspotCompanyId": "30825221458",
                "dealName": "Smoke TASK-572",
                "origin": "greenhouse_quote_builder",
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_deal_create_creates_associations_and_returns_resolved_fields(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
                "business_line_prop": "linea_de_servicio",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.find_deal_by_idempotency_key.return_value = (None, True)
        fake_hubspot.create_deal.return_value = {"id": "hs-deal-1"}
        fake_hubspot.search_deals.return_value = [
            {
                "id": "hs-deal-1",
                "properties": {
                    "createdate": "2026-04-22T19:40:00.000Z",
                    "pipeline": "default",
                    "dealstage": "appointmentscheduled",
                    "dealtype": "newbusiness",
                    "hs_priority": "HIGH",
                    "hubspot_owner_id": "owner-42",
                },
            }
        ]
        fake_hubspot.get_deal.return_value = {
            "id": "hs-deal-1",
            "properties": {
                "pipeline": "default",
                "dealstage": "appointmentscheduled",
                "dealtype": "newbusiness",
                "hs_priority": "HIGH",
                "hubspot_owner_id": "owner-42",
            },
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/deals",
                json={
                    "idempotencyKey": "idem-1",
                    "hubspotCompanyId": "30825221458",
                    "hubspotContactId": "42",
                    "dealName": "Smoke TASK-572",
                    "amount": 12345,
                    "currency": "CLP",
                    "pipelineId": "default",
                    "stageId": "appointmentscheduled",
                    "dealType": "newbusiness",
                    "priority": "HIGH",
                    "ownerHubspotUserId": "owner-42",
                    "closeDate": "2026-04-22",
                    "businessLineCode": "globe",
                    "origin": "greenhouse_quote_builder",
                },
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["status"], "created")
        self.assertEqual(payload["hubspotDealId"], "hs-deal-1")
        self.assertEqual(payload["pipelineUsed"], "default")
        self.assertEqual(payload["stageUsed"], "appointmentscheduled")
        self.assertEqual(payload["dealTypeUsed"], "newbusiness")
        self.assertEqual(payload["priorityUsed"], "HIGH")
        self.assertEqual(payload["ownerUsed"], "owner-42")
        fake_hubspot.find_deal_by_idempotency_key.assert_called_once_with(
            "idem-1",
            properties=build_contract(app.config)["sourceFields"]["deals"],
        )
        fake_hubspot.create_deal.assert_called_once_with(
            {
                "dealname": "Smoke TASK-572",
                "gh_deal_origin": "greenhouse_quote_builder",
                "gh_idempotency_key": "idem-1",
                "amount": 12345,
                "deal_currency_code": "CLP",
                "pipeline": "default",
                "dealstage": "appointmentscheduled",
                "dealtype": "newbusiness",
                "hs_priority": "HIGH",
                "hubspot_owner_id": "owner-42",
                "closedate": "2026-04-22",
                "linea_de_servicio": "globe",
            }
        )
        fake_hubspot.create_default_association.assert_any_call(
            "deals", "hs-deal-1", "companies", "30825221458"
        )
        fake_hubspot.create_default_association.assert_any_call(
            "deals", "hs-deal-1", "contacts", "42"
        )

    def test_deal_create_reuses_existing_hubspot_deal_for_same_idempotency_key(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.find_deal_by_idempotency_key.return_value = (
            {
                "id": "hs-deal-existing",
                "properties": {
                    "createdate": "2026-04-22T19:40:00.000Z",
                    "pipeline": "default",
                    "dealstage": "qualifiedtobuy",
                    "hubspot_owner_id": "owner-1",
                },
            },
            True,
        )
        fake_hubspot.search_deals.return_value = [
            {
                "id": "hs-deal-existing",
                "properties": {
                    "createdate": "2026-04-22T19:40:00.000Z",
                    "pipeline": "default",
                    "dealstage": "qualifiedtobuy",
                    "hubspot_owner_id": "owner-1",
                },
            }
        ]
        fake_hubspot.get_deal.return_value = {
            "id": "hs-deal-existing",
            "properties": {
                "pipeline": "default",
                "dealstage": "qualifiedtobuy",
                "hubspot_owner_id": "owner-1",
            },
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/deals",
                json={
                    "idempotencyKey": "idem-1",
                    "hubspotCompanyId": "30825221458",
                    "dealName": "Smoke TASK-572",
                    "origin": "greenhouse_quote_builder",
                },
                headers={"x-greenhouse-integration-key": "ghi-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["hubspotDealId"], "hs-deal-existing")
        self.assertEqual(payload["stageUsed"], "qualifiedtobuy")
        fake_hubspot.create_deal.assert_not_called()
        fake_hubspot.find_deal_by_idempotency_key.assert_called_once()
        fake_hubspot.search_deals.assert_called_once()
        fake_hubspot.get_deal.assert_any_call(
            "hs-deal-existing",
            properties=build_contract(app.config)["sourceFields"]["deals"],
            associations=["companies", "contacts"],
        )
        fake_hubspot.create_default_association.assert_called_once_with(
            "deals", "hs-deal-existing", "companies", "30825221458"
        )

    def test_deal_create_maps_hubspot_rate_limit_to_retryable_response(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        # The real HubSpotClient._classify_error_code() sets error_code
        # = "HUBSPOT_RATE_LIMIT" on any 429, and the app's
        # _hubspot_error_response keys on that error_code (not status_code
        # alone) to map to the 429 response with Retry-After. The fake
        # exception must mirror that contract.
        fake_hubspot = MagicMock()
        fake_hubspot.find_deal_by_idempotency_key.side_effect = HubSpotIntegrationError(
            "rate limited",
            status_code=429,
            error_code="HUBSPOT_RATE_LIMIT",
            retry_after="7",
        )

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/deals",
                json={
                    "idempotencyKey": "idem-1",
                    "hubspotCompanyId": "30825221458",
                    "dealName": "Smoke TASK-572",
                    "origin": "greenhouse_quote_builder",
                },
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "7")
        payload = response.get_json()
        self.assertEqual(payload["code"], "HUBSPOT_RATE_LIMIT")

    def test_deal_create_archives_duplicate_concurrent_creates(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.find_deal_by_idempotency_key.return_value = (None, True)
        fake_hubspot.create_deal.return_value = {"id": "hs-deal-racy"}
        fake_hubspot.search_deals.return_value = [
            {
                "id": "hs-deal-canonical",
                "properties": {
                    "createdate": "2026-04-22T19:40:00.000Z",
                    "pipeline": "default",
                    "dealstage": "appointmentscheduled",
                },
            },
            {
                "id": "hs-deal-racy",
                "properties": {
                    "createdate": "2026-04-22T19:40:01.000Z",
                    "pipeline": "default",
                    "dealstage": "appointmentscheduled",
                },
            },
        ]
        fake_hubspot.get_deal.return_value = {
            "id": "hs-deal-canonical",
            "properties": {
                "pipeline": "default",
                "dealstage": "appointmentscheduled",
            },
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/deals",
                json={
                    "idempotencyKey": "idem-racy",
                    "hubspotCompanyId": "30825221458",
                    "dealName": "Smoke TASK-572",
                    "origin": "greenhouse_quote_builder",
                },
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["hubspotDealId"], "hs-deal-canonical")
        self.assertIn("archiving duplicate concurrent creates", payload["message"])
        fake_hubspot.archive_deal.assert_called_once_with("hs-deal-racy")

    def test_deal_metadata_returns_pipelines_and_property_options(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_deal_pipelines.return_value = [
            {
                "id": "default",
                "label": "Pipeline de ventas",
                "displayOrder": 0,
                "archived": False,
                "stages": [
                    {
                        "id": "appointmentscheduled",
                        "label": "Cita agendada",
                        "displayOrder": 0,
                        "archived": False,
                        "metadata": {"probability": "0.2"},
                    }
                ],
            }
        ]
        fake_hubspot.get_deal_property.side_effect = [
            {
                "name": "dealtype",
                "label": "Tipo de negocio",
                "type": "enumeration",
                "fieldType": "select",
                "hubspotDefined": True,
                "options": [
                    {
                        "value": "newbusiness",
                        "label": "Nuevo negocio",
                        "displayOrder": 0,
                        "hidden": False,
                    }
                ],
            },
            {
                "name": "hs_priority",
                "label": "Prioridad",
                "type": "enumeration",
                "fieldType": "select",
                "hubspotDefined": True,
                "options": [
                    {
                        "value": "HIGH",
                        "label": "Alta",
                        "displayOrder": 1,
                        "hidden": False,
                    }
                ],
            },
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/deals/metadata")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["objectType"], "deals")
        self.assertEqual(payload["pipelines"][0]["pipelineId"], "default")
        self.assertEqual(payload["pipelines"][0]["stages"][0]["stageId"], "appointmentscheduled")
        self.assertEqual(payload["properties"]["dealType"]["propertyName"], "dealtype")
        self.assertEqual(payload["properties"]["dealType"]["options"][0]["value"], "newbusiness")
        self.assertEqual(payload["properties"]["priority"]["propertyName"], "hs_priority")
        self.assertEqual(payload["properties"]["priority"]["options"][0]["value"], "HIGH")

    def test_deal_metadata_tolerates_missing_optional_property(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_deal_pipelines.return_value = []
        fake_hubspot.get_deal_property.side_effect = [
            {
                "name": "dealtype",
                "label": "Tipo de negocio",
                "type": "enumeration",
                "fieldType": "select",
                "hubspotDefined": True,
                "options": [],
            },
            HubSpotIntegrationError("not found", status_code=404),
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/deals/metadata")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertIsNotNone(payload["properties"]["dealType"])
        self.assertIsNone(payload["properties"]["priority"])

    def test_quote_create_requires_integration_token(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.post(
            "/quotes",
            json={
                "title": "Bata - TEST",
                "expirationDate": "2026-04-27",
                "associations": {"companyId": "29666506565"},
                "lineItems": [{"name": "Servicio", "quantity": 1, "unitPrice": 2923500}],
            },
        )

        self.assertEqual(response.status_code, 401)

    def test_quote_create_creates_company_deal_and_contact_associations(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_quote.return_value = {"id": "hs-quote-1"}
        fake_hubspot.create_line_item.return_value = {"id": "li-1"}
        fake_hubspot.get_quote.return_value = {
            "id": "hs-quote-1",
            "properties": {
                "hs_quote_number": "HQ-1",
                "hs_status": "DRAFT",
                "hs_quote_link": "https://app.hubspot.com/quotes/hs-quote-1",
            },
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/quotes",
                json={
                    "title": "Bata - TEST",
                    "expirationDate": "2026-04-27",
                    "language": "es",
                    "locale": "es-cl",
                    "associations": {
                        "companyId": "29666506565",
                        "dealId": "59465365539",
                        "contactIds": ["87929193780"],
                    },
                    "lineItems": [
                        {"name": "Servicio", "quantity": 1, "unitPrice": 2923500}
                    ],
                },
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["hubspotQuoteId"], "hs-quote-1")
        self.assertEqual(payload["quoteNumber"], "HQ-1")
        self.assertEqual(payload["quoteLink"], "https://app.hubspot.com/quotes/hs-quote-1")
        fake_hubspot.create_default_association.assert_any_call(
            "line_items", "li-1", "quotes", "hs-quote-1"
        )
        fake_hubspot.create_default_association.assert_any_call(
            "quotes", "hs-quote-1", "deals", "59465365539"
        )
        fake_hubspot.create_default_association.assert_any_call(
            "quotes", "hs-quote-1", "companies", "29666506565"
        )
        fake_hubspot.create_default_association.assert_any_call(
            "quotes", "hs-quote-1", "contacts", "87929193780"
        )

    def test_product_create_requires_integration_token(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.post(
            "/products",
            json={"name": "Starter Plan", "sku": "PRD-001"},
        )

        self.assertEqual(response.status_code, 401)

    def test_product_create_accepts_gh_custom_properties(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "unitPrice": 99,
                    "customProperties": {
                        "gh_product_code": "PRD-001",
                        "gh_source_kind": "service",
                        "gh_last_write_at": "2026-04-22T12:00:00.000Z",
                        "gh_archived_by_greenhouse": False,
                        "gh_business_line": None,
                    },
                },
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 201)
        payload = response.get_json()
        self.assertEqual(payload["hubspotProductId"], "hs-42")
        fake_hubspot.create_product.assert_called_once_with(
            {
                "name": "Starter Plan",
                "hs_sku": "PRD-001",
                "price": 99,
                "gh_product_code": "PRD-001",
                "gh_source_kind": "service",
                "gh_last_write_at": "2026-04-22T12:00:00.000Z",
                "gh_archived_by_greenhouse": False,
                "gh_business_line": "",
            }
        )

    def test_product_patch_requires_integration_token(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.patch(
            "/products/hs-42",
            json={"name": "Starter Plan v2"},
        )

        self.assertEqual(response.status_code, 401)

    def test_product_patch_returns_contract_compatible_shape_and_custom_properties(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.update_product.return_value = {"id": "hs-42", "properties": {}}

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.patch(
                "/products/hs-42",
                json={
                    "name": "Starter Plan v2",
                    "description": None,
                    "unitPrice": 149,
                    "customProperties": {
                        "gh_last_write_at": "2026-04-22T12:30:00.000Z",
                        "gh_business_line": "globe",
                    },
                },
                headers={"x-greenhouse-integration-key": "ghi-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "updated")
        self.assertEqual(payload["hubspotProductId"], "hs-42")
        self.assertIn("name", payload["fieldsWritten"])
        self.assertIn("gh_last_write_at", payload["fieldsWritten"])
        fake_hubspot.update_product.assert_called_once_with(
            "hs-42",
            {
                "name": "Starter Plan v2",
                "description": "",
                "price": 149,
                "gh_last_write_at": "2026-04-22T12:30:00.000Z",
                "gh_business_line": "globe",
            },
        )

    def test_product_patch_rejects_non_gh_custom_properties(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.patch(
            "/products/hs-42",
            json={
                "customProperties": {
                    "hs_forbidden": "value",
                }
            },
            headers={"Authorization": "Bearer ghi-token"},
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("gh_*", response.get_json()["error"])

    # ------------------------------------------------------------------
    # TASK-587 / TASK-603 — HubSpot Products Outbound Contract v2 tests.
    # The middleware branches on the `X-Contract-Version: v2` header and
    # maps 16 new fields + COGS to native HubSpot properties.
    # ------------------------------------------------------------------

    def _build_v2_app_and_client(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        return app, app.test_client()

    def test_create_product_v2_accepts_prices_by_currency(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "pricesByCurrency": {"CLP": 1000, "USD": 1},
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 201)
        fake_hubspot.create_product.assert_called_once()
        props = fake_hubspot.create_product.call_args.args[0]
        self.assertEqual(props["hs_price_clp"], 1000)
        self.assertEqual(props["hs_price_usd"], 1)
        self.assertNotIn("hs_price_clf", props)

    def test_create_product_v2_accepts_cogs(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "costOfGoodsSold": 500,
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 201)
        props = fake_hubspot.create_product.call_args.args[0]
        self.assertEqual(props["cost_of_goods_sold"], 500)

    def test_create_product_v2_rejects_margin_fields(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "marginPct": 0.2,
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("marginPct", response.get_json()["error"])
        fake_hubspot.create_product.assert_not_called()

    def test_create_product_v2_rejects_invalid_product_type(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "productType": "weird",
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 400)
        self.assertIn("Invalid productType", response.get_json()["error"])
        fake_hubspot.create_product.assert_not_called()

    def test_create_product_v2_accepts_all_classification_fields(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "productType": "service",
                    "pricingModel": "flat",
                    "productClassification": "standalone",
                    "bundleType": "none",
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 201)
        props = fake_hubspot.create_product.call_args.args[0]
        self.assertEqual(props["hs_product_type"], "service")
        self.assertEqual(props["hs_pricing_model"], "flat")
        self.assertEqual(props["hs_product_classification"], "standalone")
        self.assertEqual(props["hs_bundle_type"], "none")

    def test_create_product_v2_resolves_owner_by_email(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.resolve_owner_by_email.return_value = {
            "id": "123",
            "email": "foo@bar.com",
        }
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "commercialOwnerEmail": "foo@bar.com",
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 201)
        fake_hubspot.resolve_owner_by_email.assert_called_once_with("foo@bar.com")
        props = fake_hubspot.create_product.call_args.args[0]
        self.assertEqual(props["hubspot_owner_id"], "123")

    def test_create_product_v2_handles_missing_owner_gracefully(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.resolve_owner_by_email.return_value = None
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "commercialOwnerEmail": "ghost@nowhere.com",
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 201)
        fake_hubspot.resolve_owner_by_email.assert_called_once_with("ghost@nowhere.com")
        props = fake_hubspot.create_product.call_args.args[0]
        self.assertNotIn("hubspot_owner_id", props)

    def test_create_product_v2_maps_image_urls_to_semicolon_joined(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "imageUrls": ["a.jpg", "b.jpg"],
                },
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 201)
        props = fake_hubspot.create_product.call_args.args[0]
        self.assertEqual(props["hs_images"], "a.jpg;b.jpg")

    def test_update_product_v2_accepts_partial_v2_fields(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.update_product.return_value = {"id": "hs-42", "properties": {}}

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.patch(
                "/products/hs-42",
                json={"pricesByCurrency": {"USD": 9.99}},
                headers={
                    "Authorization": "Bearer ghi-token",
                    "X-Contract-Version": "v2",
                },
            )

        self.assertEqual(response.status_code, 200)
        fake_hubspot.update_product.assert_called_once()
        call_args = fake_hubspot.update_product.call_args
        self.assertEqual(call_args.args[0], "hs-42")
        self.assertEqual(call_args.args[1], {"hs_price_usd": 9.99})

    def test_create_product_v1_still_works_without_header(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.create_product.return_value = {
            "id": "hs-42",
            "properties": {"name": "Starter Plan", "hs_sku": "PRD-001"},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products",
                json={
                    "name": "Starter Plan",
                    "sku": "PRD-001",
                    "unitPrice": 99,
                    "billingFrequency": "monthly",
                    "billingPeriodCount": 1,
                },
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 201)
        # v1 legacy behavior: billingFrequency/billingPeriodCount map to the
        # older HS property names; no v2 fan-out fields appear.
        fake_hubspot.create_product.assert_called_once_with(
            {
                "name": "Starter Plan",
                "hs_sku": "PRD-001",
                "price": 99,
                "hs_recurring_billing_period": "monthly",
                "hs_recurring_billing_frequency": 1,
            }
        )

    # ------------------------------------------------------------------
    # TASK-604 — HubSpot Products Inbound Rehydration v2 tests.
    # GET /products and GET /products/<id> branch on
    # `X-Contract-Version: v2` to return the v2 shape (prices by currency,
    # resolved owner, classification fields, parsed image URLs).
    # ------------------------------------------------------------------

    def test_get_products_v1_default_without_header(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_all_products.return_value = [
            {
                "id": "hs-1",
                "properties": {
                    "name": "Plan A",
                    "hs_sku": "PRD-A",
                    "price": "10",
                    "hs_price_usd": "1",
                    "hubspot_owner_id": "999",
                    "hs_images": "a.jpg;b.jpg",
                },
            }
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/products")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["count"], 1)
        product = payload["products"][0]
        # v1 shape has no v2-only keys.
        self.assertNotIn("pricesByCurrency", product)
        self.assertNotIn("owner", product)
        self.assertNotIn("imageUrls", product)
        self.assertNotIn("productType", product)
        # Owner resolver must NOT be called in v1 mode.
        fake_hubspot.get_owner.assert_not_called()

    def test_get_products_v2_with_header_returns_prices_by_currency(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_all_products.return_value = [
            {
                "id": "hs-1",
                "properties": {
                    "name": "Plan A",
                    "hs_sku": "PRD-A",
                    "hs_price_clp": "1000",
                    "hs_price_usd": "1.25",
                    "hs_price_clf": None,
                },
            }
        ]

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get(
                "/products",
                headers={"X-Contract-Version": "v2"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        product = payload["products"][0]
        self.assertIn("pricesByCurrency", product)
        prices = product["pricesByCurrency"]
        # Six currency keys must always be present in v2 shape.
        self.assertEqual(
            set(prices.keys()),
            {"CLP", "USD", "CLF", "COP", "MXN", "PEN"},
        )
        self.assertEqual(prices["CLP"], 1000.0)
        self.assertEqual(prices["USD"], 1.25)
        self.assertIsNone(prices["CLF"])
        self.assertIsNone(prices["COP"])

    def test_get_products_v2_resolves_owner(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_all_products.return_value = [
            {
                "id": "hs-1",
                "properties": {
                    "name": "Plan A",
                    "hs_sku": "PRD-A",
                    "hubspot_owner_id": "999",
                },
            }
        ]
        fake_hubspot.get_owner.return_value = {
            "id": "999",
            "email": "owner@example.com",
            "firstName": "Grace",
            "lastName": "Hopper",
            "userId": "42",
            "archived": False,
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get(
                "/products",
                headers={"X-Contract-Version": "v2"},
            )

        self.assertEqual(response.status_code, 200)
        product = response.get_json()["products"][0]
        self.assertIsNotNone(product["owner"])
        self.assertEqual(product["owner"]["hubspotOwnerId"], "999")
        self.assertEqual(product["owner"]["ownerEmail"], "owner@example.com")
        self.assertEqual(product["owner"]["ownerFirstName"], "Grace")
        self.assertEqual(product["owner"]["ownerLastName"], "Hopper")
        self.assertEqual(product["owner"]["ownerDisplayName"], "Grace Hopper")
        fake_hubspot.get_owner.assert_called_once_with("999")

    def test_get_products_v2_caches_owner_across_products(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_all_products.return_value = [
            {
                "id": f"hs-{i}",
                "properties": {
                    "name": f"Plan {i}",
                    "hs_sku": f"PRD-{i}",
                    "hubspot_owner_id": "999",
                },
            }
            for i in range(3)
        ]
        fake_hubspot.get_owner.return_value = {
            "id": "999",
            "email": "owner@example.com",
            "firstName": "Grace",
            "lastName": "Hopper",
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get(
                "/products",
                headers={"X-Contract-Version": "v2"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.get_json()["products"]), 3)
        # All 3 products share owner_id=999 — resolver should be called once.
        fake_hubspot.get_owner.assert_called_once_with("999")

    def test_get_product_detail_v2_parses_image_urls(self):
        app, client = self._build_v2_app_and_client()

        fake_hubspot = MagicMock()
        fake_hubspot.get_product.return_value = {
            "id": "hs-42",
            "properties": {
                "name": "Plan X",
                "hs_sku": "PRD-X",
                "hs_images": "a.jpg;b.jpg",
            },
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get(
                "/products/hs-42",
                headers={"X-Contract-Version": "v2"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["imageUrls"], ["a.jpg", "b.jpg"])
        # Owner id not present → no owner lookup attempted.
        fake_hubspot.get_owner.assert_not_called()

    def test_product_archive_requires_integration_token(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        response = client.post("/products/hs-42/archive", json={"reason": "cleanup"})

        self.assertEqual(response.status_code, 401)

    def test_product_archive_endpoint_archives_product(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
                "greenhouse_integration_api_token": "ghi-token",
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.post(
                "/products/hs-42/archive",
                json={"reason": "source_deactivated_in_greenhouse"},
                headers={"Authorization": "Bearer ghi-token"},
            )

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "archived")
        self.assertEqual(payload["hubspotProductId"], "hs-42")
        fake_hubspot.archive_product.assert_called_once_with("hs-42")

    def test_product_reconcile_returns_page_and_next_cursor(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_products_page.return_value = {
            "results": [
                {
                    "id": "hs-42",
                    "archived": False,
                    "properties": {
                        "name": "Starter Plan",
                        "hs_sku": "PRD-001",
                        "price": "99",
                        "description": "Base subscription",
                        "gh_product_code": "PRD-001",
                        "gh_source_kind": "service",
                        "gh_last_write_at": "2026-04-22T12:00:00.000Z",
                    },
                }
            ],
            "paging": {"next": {"after": "cursor-2"}},
        }

        # Preserve HubSpotClient.RECONCILE_PRODUCT_PROPERTIES on the patched
        # class: without this, app code reads it as an auto-MagicMock and
        # the call assertion below fails with properties=<MagicMock>.
        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ) as mock_class:
            mock_class.RECONCILE_PRODUCT_PROPERTIES = HubSpotClient.RECONCILE_PRODUCT_PROPERTIES
            response = client.get("/products/reconcile?limit=250")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["nextCursor"], "active:cursor-2")
        self.assertEqual(payload["items"][0]["hubspotProductId"], "hs-42")
        self.assertEqual(payload["items"][0]["gh_product_code"], "PRD-001")
        self.assertEqual(payload["items"][0]["price"], 99.0)
        fake_hubspot.list_products_page.assert_called_once_with(
            limit=100,
            after=None,
            archived=False,
            properties=HubSpotClient.RECONCILE_PRODUCT_PROPERTIES,
        )

    def test_product_reconcile_rolls_to_archived_cursor(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        fake_hubspot = MagicMock()
        fake_hubspot.list_products_page.return_value = {
            "results": [],
            "paging": {},
        }

        with patch(
            "services.hubspot_greenhouse_integration.app.HubSpotClient",
            return_value=fake_hubspot,
        ):
            response = client.get("/products/reconcile?includeArchived=true")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["nextCursor"], "archived:")

    def test_product_reconcile_rejects_invalid_cursor(self):
        try:
            from services.hubspot_greenhouse_integration.app import create_app
        except ImportError as exc:
            self.skipTest(f"Flask runtime not installed in local test environment: {exc}")

        app = create_app()
        app.config.update(
            {
                "hubspot_access_token": "hubspot-token",
                "timeout_seconds": 30,
            }
        )
        client = app.test_client()

        response = client.get("/products/reconcile?cursor=broken")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.get_json()["error"], "Invalid cursor")


if __name__ == "__main__":
    unittest.main()
