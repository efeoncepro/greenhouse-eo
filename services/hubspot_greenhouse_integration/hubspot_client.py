from typing import Any

import requests

from .config import HUBSPOT_API


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
        if not access_token:
            raise HubSpotIntegrationError("HUBSPOT_ACCESS_TOKEN is not set")
        self.access_token = access_token
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
