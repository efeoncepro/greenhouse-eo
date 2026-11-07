"""Internal, provisional cost review. Not a V3 price or an approved pricing policy.

Historical only: freezes v13, the source of the superseded manual review.
New work must use the V3 programme artifact in pricing-v3-2026-10-27.
V3 workload and blocked quote outputs are generated separately by the V3 CLI.
"""
import hashlib
import json
from decimal import Decimal as D
from pathlib import Path

ROOT = Path(__file__).resolve().parents[5]
OUT = Path(__file__).resolve().parent
DATE = "2026-10-27"
# Reproduce the former review; never refresh its numbers from a later current pointer.
catalog_ref = "data/pricing/v3-operating/catalog.review-v13.json"
catalog_path = ROOT / catalog_ref
catalog = json.loads(catalog_path.read_text())

def effective(kind, predicate):
    rows = [r for r in catalog["records"] if r["kind"] == kind
            and r["source"]["effectiveFrom"] <= DATE <= r["source"]["effectiveUntil"]
            and predicate(r["value"])]
    return max(rows, key=lambda r: r["revision"])

allocation = effective("allocation", lambda v: v["policyId"] == "allocation:shared")
capacity = D(allocation["value"]["hoursPerFteMonth"])
plans = {
    "setup": {"ECG-008": 24, "ECG-009": 24, "performance-lead-assumption": 8,
              "ECG-031": 32, "ECG-012": 24, "ECG-021": 16, "ECG-011": 24, "ECG-016": 8},
    "monthly": {"ECG-008": 56, "ECG-009": 20, "ECG-019": 24,
                "performance-lead-assumption": 11, "ECG-011": 10},
}
fees = {"setup": D("5400"), "monthly": D("5200")}
source = {"reference": "estimate:armor-discovery-scope-2026-10-27",
          "effectiveFrom": DATE, "effectiveUntil": "2026-12-31", "status": "estimated"}
def money(value):
    return str(value.quantize(D("0.01")))

results = {}
for phase, plan in plans.items():
    lines = []
    fixed, work = [], []
    for profile, hours in plan.items():
        if profile == "performance-lead-assumption":
            monthly = D("5500")
            origin = "Performance pricing pack V1: unvalidated Performance Lead assumption"
        else:
            record = effective("cost", lambda v: v["profileId"] == profile)
            if record["value"]["localization"] != {"kind": "reference_adjusted", "referenceCountry": "CL"}:
                raise ValueError("Revisit talent-country assumption")
            monthly = sum(D(c["amount"]) for c in record["value"]["components"])
            origin = record["recordId"] + "@" + str(record["revision"])
        cost = monthly * D(hours) / capacity
        lines.append({"profile": profile, "hours": hours, "fte": str(D(hours)/capacity),
                      "monthlyReferenceCost": str(monthly), "cost": money(cost), "source": origin})
        fixed.append({"workId": profile, "label": profile + " " + phase,
                      "hoursPerMonth": str(hours), "source": source})
        work.append({"lineId": profile, "driverShares": [],
                     "fixedWorkShares": [{"workId": profile, "share": "1"}],
                     "reason": "Estimated separate work package; no buyer-approved dedication or reserved roster."})
    team = sum(D(l["monthlyReferenceCost"]) * D(l["hours"]) / capacity for l in lines)
    loaded = team * D("1.12")
    # The reserve scenario uses the presented phase cost, then rounds the reserve once.
    reserve = D(money(D(money(loaded)) * D("0.12")))
    reserved = D(money(loaded)) + reserve
    results[phase] = {"lines": lines, "hours": sum(plan.values()), "teamCost": money(team),
                      "loadedCost": money(loaded), "feeProposed": str(fees[phase]),
                      "baseMargin": str(1-loaded/fees[phase]),
                      "additionalReserveScenario": money(reserve),
                      "costWithReserveScenario": money(reserved),
                      "marginWithReserveScenario": str(1-reserved/fees[phase]),
                      "basePriceAt55PercentMargin": money(loaded / D("0.45"))}
    workload = {"schemaVersion": "pricing-v3-workload/1", "version": "armor-" + phase + "-review-2026-10-27",
                "mode": "simulation", "capacity": {"productiveHoursPerFteMonth": str(capacity),
                "scheduledHoursPerFteMonth": str(capacity),
                "source": {**allocation["source"], "status": "estimated"}},
                "drivers": [], "fixedWork": fixed, "lines": work, "rounding": {"fteStep": "0.000001"}}
    (OUT / (phase + ".workload.json")).write_text(json.dumps(workload, ensure_ascii=False, indent=2)+"\n")

base = D(results["setup"]["loadedCost"]) + 3 * D(results["monthly"]["loadedCost"])
reserved = D(results["setup"]["costWithReserveScenario"]) + 3 * D(results["monthly"]["costWithReserveScenario"])
results["term"] = {"hours": 160+3*121, "fee": "21000", "mediaCeiling": "18000",
                   "combinedPlanningEnvelope": "39000", "loadedCost": money(base),
                   "costWithReserveScenario": money(reserved),
                   "baseMargin": str(1-base/D(21000)),
                   "marginWithReserveScenario": str(1-reserved/D(21000))}
review = {"state": "hypothesis_only", "date": DATE, "binding": False,
          "notAV3CalculatedQuote": True, "catalogVersion": catalog["version"],
          "catalogSha256": hashlib.sha256(catalog_path.read_bytes()).hexdigest(),
          "capacityHoursPerFteMonth": str(capacity),
          "assumptions": ["All roster costs use Chile-reference target costs; actual roster unassigned.",
                          "Performance Lead 5500/month and overhead 12% come from hypothesis-only Performance pack.",
                          "Additional 12% reserve is a prudential sensitivity, not an approved Performance V3 rule.",
                          "No market factor or engagement multiplier invented; therefore no V3-derived price.",
                          "USD and tax treatment require commercial/Finance confirmation.",
                          "Setup occurs within days 1-14 of the same 90-day service; operations cover days 1-90."],
          "results": results}
(OUT / "cost-review.json").write_text(json.dumps(review, ensure_ascii=False, indent=2)+"\n")

# A diagnostic-only single-role brief: it is deliberately not a priced representation of the entire scope.
brief = {"schemaVersion": "pricing-v3-brief/1", "mode": "simulation", "quoteDate": DATE,
         "offerId": "performance-commerce-distribution", "engagementCode": "monthly",
         "engagementForm": "on_demand", "accountId": "armor-90d-diagnostic-only",
         "offerMarketCountry": "EC", "outputCurrency": "USD", "periods": 3,
         "lines": [{"lineId": "paid-media-diagnostic", "profile": "ECG-008", "talentCountry": "CL",
                    "headcount": 1, "dedication": {"unit": "hours_per_month", "value": "56"},
                    "dedicationEvidence": source, "allocationMode": "shared",
                    "allocationPolicyId": "allocation:shared", "kitId": "managed-service-core", "choices": []}],
         "taxTreatment": {"kind": "not_resolved"}}
(OUT / "diagnostic.brief.json").write_text(json.dumps(brief, ensure_ascii=False, indent=2)+"\n")
print(json.dumps(results["term"], indent=2))
