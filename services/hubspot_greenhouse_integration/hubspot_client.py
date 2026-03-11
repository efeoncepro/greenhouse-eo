from typing import Any

import requests

try:
    from .config import HUBSPOT_API
except ImportError:
    # Allow standalone execution when Cloud Run deploys from this subdirectory.
    from config import HUBSPOT_API


class HubSpotIntegrationError(RuntimeError):
    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


def _parse_error(response: requests.Response) -> str:
    try:
        payload = response.json()
    except ValueError:
        return response.text or response.reason

    message = payload.get("message") or payload.get("status") or response.reason
    errors = payload.get("errors") or []
    if not errors:
        return message

    details = []
    for err in errors:
        err_message = err.get("message")
        context = err.get("context")
        if context:
            err_message = f"{err_message} | context={context}"
        if err_message:
            details.append(err_message)
    return f"{message} | {'; '.join(details)}" if details else message


class HubSpotClient:
    def __init__(self, *, access_token: str, timeout_seconds: int):
        normalized_access_token = access_token.strip()
        if not normalized_access_token:
            raise HubSpotIntegrationError("HUBSPOT_ACCESS_TOKEN is not set")
        self.access_token = normalized_access_token
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }

    def get_company(self, company_id: str, *, properties: list[str]) -> dict[str, Any]:
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/objects/companies/{company_id}",
            headers=self._headers(),
            params={"properties": ",".join(properties)},
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def get_owner(self, owner_id: str) -> dict[str, Any]:
        response = self.session.get(
            f"{HUBSPOT_API}/crm/v3/owners/{owner_id}",
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        if response.status_code >= 400:
            raise HubSpotIntegrationError(
                _parse_error(response),
                status_code=response.status_code,
            )
        return response.json()

    def list_company_contact_ids(self, company_id: str, *, limit: int = 100) -> list[str]:
        contact_ids: list[str] = []
        after: str | None = None

        while True:
            params: dict[str, str | int] = {"limit": limit}
            if after:
                params["after"] = after

            response = self.session.get(
                f"{HUBSPOT_API}/crm/v4/objects/companies/{company_id}/associations/contacts",
                headers=self._headers(),
                params=params,
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )

            payload = response.json()
            for result in payload.get("results") or []:
                contact_id = result.get("toObjectId")
                if contact_id is not None:
                    contact_ids.append(str(contact_id))

            paging = payload.get("paging") or {}
            next_page = paging.get("next") or {}
            after = next_page.get("after")
            if not after:
                break

        deduped_contact_ids: list[str] = []
        seen = set()
        for contact_id in contact_ids:
            if contact_id in seen:
                continue
            seen.add(contact_id)
            deduped_contact_ids.append(contact_id)
        return deduped_contact_ids

    def get_contacts_by_ids(
        self,
        contact_ids: list[str],
        *,
        properties: list[str],
    ) -> list[dict[str, Any]]:
        if not contact_ids:
            return []

        results: list[dict[str, Any]] = []
        for start in range(0, len(contact_ids), 100):
            batch_ids = contact_ids[start : start + 100]
            response = self.session.post(
                f"{HUBSPOT_API}/crm/v3/objects/contacts/batch/read",
                headers=self._headers(),
                json={
                    "properties": properties,
                    "inputs": [{"id": contact_id} for contact_id in batch_ids],
                },
                timeout=self.timeout_seconds,
            )
            if response.status_code >= 400:
                raise HubSpotIntegrationError(
                    _parse_error(response),
                    status_code=response.status_code,
                )
            payload = response.json()
            results.extend(payload.get("results") or [])
        return results
