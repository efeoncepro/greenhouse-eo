import { aeoXray } from './aeo-xray-tokens.js';
import { validateXrayExperience, validateXrayMachineConsistency, } from "./aeo-xray-experience.js";
export const AXIS_AEO_XRAY_CONTRACT = {
    id: "efeonce.aeo-xray",
    // 0.2.0 suma bloques opcionales de experiencia temprana; 0.1.0 sigue vigente sin cambios.
    version: "0.2.0",
    lifecycle: "candidate",
    owner: "efeonce-aeo-xray",
    anatomy: ["shell", "artifact", "block", "annotation", "evidence", "source"],
    // Los campos que todo contrato publicado declara (DesignPatternContract); salen de los tokens `aeoXray`.
    states: ["proposed", "implemented", "verified", "measured"],
    accessibility: ["text-4.5-normal", "text-3-large", "target-44px", "reduced-motion-respected", "evidence-status-visible"],
    responsive: ["desktop-instrument", "mobile-sheet"],
    motion: ["original-xray-choreography", "reduced-motion-none"],
    consumers: ["efeonce-think", "greenhouse-aeo-xray"],
    evidence: ["TASK-1950", "tokens:aeoXray"],
};
export const AXIS_AEO_XRAY_ADAPTER_CHECKS = [
    "demo-noindex",
    "content-escaped",
    "no-active-bank-form",
    "scoped-annotations",
    "keyboard-and-mobile",
    "contrast",
    "asset-authorization",
    "source-dates-visible",
    "evidence-status-visible",
];
/** Accepts unknown at the trust boundary. No HTML, CSS, auth or mutable case state belongs here. */
export function validateAeoXrayIntent(input) {
    const issues = [];
    const issue = (code, path, message = code) => issues.push({ code, path, message });
    const obj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
    const text = (v) => typeof v === "string" && v.trim().length > 0;
    const id = (v) => typeof v === "string" && /^[a-z][a-z0-9-]{0,95}$/.test(v);
    const date = (v) => typeof v === "string" &&
        /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v) &&
        Number.isFinite(Date.parse(v)) &&
        new Date(v).toISOString().slice(0, 10) === v.slice(0, 10);
    const url = (v) => {
        try {
            const u = new URL(v);
            return u.protocol === "https:" && !u.username && !u.password;
        }
        catch {
            return false;
        }
    };
    const fields = (v, keys, path) => {
        for (const k of Object.keys(v))
            if (!keys.includes(k))
                issue("unknown-field", `${path}.${k}`);
    };
    const optionalText = (v, keys, path) => {
        for (const k of keys)
            if (v[k] !== undefined && !text(v[k]))
                issue("text-invalid", `${path}.${k}`);
    };
    const required = (v, keys, path) => {
        for (const k of keys)
            if (!text(v[k]))
                issue("text-required", `${path}.${k}`);
    };
    if (!obj(input))
        return [{ code: "intent-required", path: "", message: "Object required" }];
    fields(input, [
        "contract",
        "version",
        "locale",
        "title",
        "preparedFor",
        "preparedAt",
        "artifacts",
        "sources",
        "assets",
        "brand",
        "flow",
    ], "");
    if (input.contract !== "efeonce.aeo-xray" || !["0.1.0", "0.2.0"].includes(input.version))
        issue("contract-version-unsupported", "contract");
    required(input, ["locale", "title", "preparedFor"], "");
    if (!date(input.preparedAt))
        issue("date-invalid", "preparedAt");
    for (const key of ["artifacts", "sources", "assets"])
        if (!Array.isArray(input[key]))
            issue("array-required", key);
    if (issues.length)
        return issues;
    const collect = (arr, path) => {
        const ids = new Set();
        arr.forEach((v, i) => {
            if (!obj(v) || !id(v.id))
                issue("id-invalid", `${path}.${i}`);
            else if (ids.has(v.id))
                issue("id-duplicate", `${path}.${i}.id`);
            else
                ids.add(v.id);
        });
        return ids;
    };
    const sourceIds = collect(input.sources, "sources"), assetIds = collect(input.assets, "assets"), artifactIds = collect(input.artifacts, "artifacts");
    const refs = (v, pool, path) => {
        if (!Array.isArray(v))
            issue("references-required", path);
        else
            v.forEach((s, i) => {
                if (!pool.has(s))
                    issue("reference-missing", `${path}.${i}`);
            });
    };
    input.sources.forEach((s, i) => {
        if (!obj(s))
            return;
        const p = `sources.${i}`;
        fields(s, ["id", "label", "url", "accessedAt"], p);
        required(s, ["label"], p);
        if (!url(s.url))
            issue("url-invalid", `${p}.url`);
        if (!date(s.accessedAt))
            issue("date-invalid", `${p}.accessedAt`);
    });
    input.assets.forEach((a, i) => {
        if (!obj(a))
            return;
        const p = `assets.${i}`;
        fields(a, ["id", "ref", "alt", "width", "height", "credit", "sourceId", "approval"], p);
        required(a, ["alt", "credit"], p);
        if (a.approval !== "approved")
            issue("asset-not-approved", p);
        if (!sourceIds.has(a.sourceId))
            issue("reference-missing", `${p}.sourceId`);
        for (const k of ["width", "height"])
            if (!Number.isInteger(a[k]) || a[k] <= 0)
                issue("dimension-invalid", `${p}.${k}`);
        if (!obj(a.ref))
            issue("asset-ref-invalid", p);
        else {
            fields(a.ref, a.ref.kind === "public"
                ? ["kind", "url"]
                : ["kind", "assetId", "sha256"], `${p}.ref`);
            if (a.ref.sha256 !== undefined && !/^[a-f0-9]{64}$/.test(a.ref.sha256))
                issue("asset-hash-invalid", p);
            if (a.ref.kind === "public"
                ? !url(a.ref.url)
                : a.ref.kind !== "protected" || !text(a.ref.assetId))
                issue("asset-ref-invalid", p);
        }
    });
    const blockIds = new Map();
    input.artifacts.forEach((a, i) => {
        if (obj(a) && Array.isArray(a.blocks))
            blockIds.set(a.id, collect(a.blocks, `artifacts.${i}.blocks`));
    });
    const cta = (c, p) => {
        if (!obj(c)) {
            issue("cta-invalid", p);
            return;
        }
        fields(c, ["label", "artifactId", "blockId", "href"], p);
        required(c, ["label"], p);
        optionalText(c, ["artifactId", "blockId", "href"], p);
        if (Boolean(c.artifactId) === Boolean(c.href))
            issue("cta-target-exclusive", p);
        if (c.href && !url(c.href))
            issue("url-invalid", p);
        if (c.artifactId && !artifactIds.has(c.artifactId))
            issue("reference-missing", p);
        if (c.blockId && !blockIds.get(c.artifactId)?.has(c.blockId))
            issue("reference-missing", p);
    };
    if (!input.artifacts.length)
        issue("artifacts-empty", "artifacts");
    input.artifacts.forEach((a, i) => {
        if (!obj(a))
            return;
        const p = `artifacts.${i}`;
        fields(a, [
            "id",
            "kind",
            "title",
            "summary",
            "byline",
            "blocks",
            "annotations",
            "seo",
            "experience",
        ], p);
        required(a, ["title", "summary"], p);
        if (!["landing", "article"].includes(a.kind))
            issue("artifact-kind-invalid", p);
        if (a.kind === "article" && !obj(a.byline))
            issue("byline-required", p);
        if (obj(a.byline)) {
            fields(a.byline, ["author", "publishedAt", "reviewer"], `${p}.byline`);
            required(a.byline, ["author"], `${p}.byline`);
            optionalText(a.byline, ["reviewer"], `${p}.byline`);
            if (!date(a.byline.publishedAt))
                issue("date-invalid", `${p}.byline.publishedAt`);
        }
        if (!obj(a.seo))
            issue("seo-required", p);
        else {
            fields(a.seo, [
                "title",
                "description",
                "canonical",
                "robots",
                "lang",
                "structuredData",
            ], `${p}.seo`);
            required(a.seo, ["title", "description", "robots", "lang"], `${p}.seo`);
            if (!url(a.seo.canonical))
                issue("url-invalid", `${p}.seo.canonical`);
            if (a.seo.structuredData !== undefined && !obj(a.seo.structuredData))
                issue("structured-data-invalid", `${p}.seo`);
        }
        if (Array.isArray(a.blocks) &&
            a.blocks.filter((b) => obj(b) && b.kind === "hero").length > 1)
            issue("hero-duplicate", `${p}.blocks`);
        if (!Array.isArray(a.blocks) || !a.blocks.length)
            issue("blocks-required", p);
        else
            a.blocks.forEach((b, j) => {
                if (!obj(b))
                    return;
                const q = `${p}.blocks.${j}`;
                const keys = {
                    hero: ["eyebrow", "title", "text", "assetId", "cta"],
                    heading: ["level", "text", "anchor", "short"],
                    paragraph: ["text"],
                    "answer-capsule": ["text"],
                    "pull-quote": ["text"],
                    toc: ["title"],
                    "internal-links": ["title", "items"],
                    sources: ["title", "items"],
                    list: ["items", "ordered"],
                    table: ["columns", "rows", "caption"],
                    image: ["assetId", "caption", "role"],
                    quote: ["text", "attribution"],
                    faq: ["items", "title", "anchor", "short"],
                    cta: ["title", "text", "action"],
                };
                if (typeof b.kind !== "string" || !Object.hasOwn(keys, b.kind)) {
                    issue("block-kind-invalid", q);
                    return;
                }
                fields(b, ["id", "kind", "sourceIds", ...keys[b.kind]], q);
                optionalText(b, ["eyebrow", "title", "text", "caption", "attribution", "assetId"], q);
                if (b.ordered !== undefined && typeof b.ordered !== "boolean")
                    issue("boolean-invalid", `${q}.ordered`);
                if (b.sourceIds !== undefined)
                    refs(b.sourceIds, sourceIds, `${q}.sourceIds`);
                if ([
                    "hero",
                    "heading",
                    "paragraph",
                    "quote",
                    "answer-capsule",
                    "pull-quote",
                ].includes(b.kind))
                    required(b, ["text"], q);
                if (["toc", "internal-links", "sources"].includes(b.kind))
                    required(b, ["title"], q);
                if (["internal-links", "sources"].includes(b.kind)) {
                    if (!Array.isArray(b.items) || !b.items.length)
                        issue("links-invalid", q);
                    else
                        b.items.forEach((l, k) => {
                            if (!obj(l) || !text(l.text) || !url(l.href))
                                issue("links-invalid", `${q}.items.${k}`);
                            else
                                fields(l, ["text", "href", "note"], `${q}.items.${k}`);
                        });
                }
                if (b.anchor !== undefined && !/^[a-z][a-z0-9-]*$/.test(b.anchor))
                    issue("anchor-invalid", q);
                if (b.short !== undefined && !text(b.short))
                    issue("text-invalid", q);
                if (b.kind === "image" &&
                    b.role !== undefined &&
                    !["hero", "body"].includes(b.role))
                    issue("image-role-invalid", q);
                if (b.kind === "hero") {
                    required(b, ["title"], q);
                    if (b.cta)
                        cta(b.cta, `${q}.cta`);
                }
                if (b.kind === "heading" && ![2, 3].includes(b.level))
                    issue("heading-level-invalid", q);
                if ((b.kind === "image" && !b.assetId) ||
                    (b.assetId && !assetIds.has(b.assetId)))
                    issue("reference-missing", `${q}.assetId`);
                if (b.kind === "quote")
                    required(b, ["attribution"], q);
                if (b.kind === "cta")
                    cta(b.action, `${q}.action`);
                if (b.kind === "list" &&
                    (!Array.isArray(b.items) || !b.items.length || !b.items.every(text)))
                    issue("list-invalid", q);
                if (b.kind === "table" &&
                    (!Array.isArray(b.columns) ||
                        !b.columns.length ||
                        !b.columns.every(text) ||
                        !Array.isArray(b.rows) ||
                        !b.rows.length ||
                        !b.rows.every((r) => Array.isArray(r) &&
                            r.length === b.columns.length &&
                            r.every(text)) ||
                        !text(b.caption)))
                    issue("table-invalid", q);
                if (b.kind === "faq" && Array.isArray(b.items))
                    b.items.forEach((x, k) => {
                        if (obj(x))
                            fields(x, ["question", "answer"], `${q}.items.${k}`);
                    });
                if (b.kind === "faq" &&
                    (!Array.isArray(b.items) ||
                        !b.items.length ||
                        !b.items.every((x) => obj(x) && text(x.question) && text(x.answer))))
                    issue("faq-invalid", q);
            });
        if (a.experience !== undefined)
            issues.push(...validateXrayExperience(a.experience, blockIds.get(a.id) ?? new Set(), assetIds, `${p}.experience`));
        if (a.experience !== undefined && !issues.some(issue => issue.path.startsWith(p))) {
            issues.push(...validateXrayMachineConsistency(a.experience, a, input.assets, `${p}.experience`));
        }
        if (!Array.isArray(a.annotations))
            issue("annotations-required", p);
        else {
            collect(a.annotations, `${p}.annotations`);
            a.annotations.forEach((n, j) => {
                if (!obj(n))
                    return;
                const q = `${p}.annotations.${j}`;
                fields(n, [
                    "id",
                    "scope",
                    "blockId",
                    "category",
                    "title",
                    "explanation",
                    "status",
                    "sourceIds",
                    "evidence",
                ], q);
                required(n, ["title", "explanation"], q);
                if (!["block", "page", "site"].includes(n.scope))
                    issue("scope-invalid", q);
                if (n.scope === "block"
                    ? !blockIds.get(a.id)?.has(n.blockId)
                    : n.blockId !== undefined)
                    issue("annotation-target-invalid", q);
                if (!aeoXray.categories.includes(n.category))
                    issue("category-invalid", q);
                if (!aeoXray.evidenceStates.includes(n.status))
                    issue("evidence-status-invalid", q);
                refs(n.sourceIds, sourceIds, `${q}.sourceIds`);
                if (n.status !== "proposed" && !obj(n.evidence))
                    issue("evidence-required", q);
                if (obj(n.evidence)) {
                    fields(n.evidence, ["description", "asOf", "sourceIds"], `${q}.evidence`);
                    required(n.evidence, ["description"], q);
                    if (!date(n.evidence.asOf))
                        issue("date-invalid", q);
                    refs(n.evidence.sourceIds, sourceIds, `${q}.evidence.sourceIds`);
                    if (["verified", "measured"].includes(n.status) &&
                        !n.evidence.sourceIds?.length)
                        issue("measurement-source-required", q);
                }
            });
        }
    });
    if (input.brand !== undefined) {
        const b = input.brand;
        if (!obj(b))
            issue("brand-invalid", "brand");
        else {
            fields(b, [
                "name",
                "accent",
                "ink",
                "action",
                "actionText",
                "fontFamily",
                "displayFontFamily",
                "logoAssetId",
                "logoOnDarkAssetId",
            ], "brand");
            required(b, ["name", "accent"], "brand");
            for (const k of ["accent", "ink", "action", "actionText"])
                if (b[k] !== undefined && !/^#[a-fA-F0-9]{6}$/.test(b[k]))
                    issue("color-invalid", `brand.${k}`);
            for (const k of ["fontFamily", "displayFontFamily"])
                if (b[k] !== undefined && !Object.hasOwn(aeoXray.fonts, b[k]))
                    issue("font-invalid", `brand.${k}`);
            if (b.logoAssetId && !assetIds.has(b.logoAssetId))
                issue("reference-missing", "brand.logoAssetId");
            if (b.logoOnDarkAssetId !== undefined && !assetIds.has(b.logoOnDarkAssetId))
                issue("reference-missing", "brand.logoOnDarkAssetId");
        }
    }
    if (!obj(input.flow))
        issue("flow-required", "flow");
    else {
        fields(input.flow, ["entryArtifactId", "links"], "flow");
        if (!artifactIds.has(input.flow.entryArtifactId))
            issue("reference-missing", "flow.entryArtifactId");
        if (!Array.isArray(input.flow.links))
            issue("array-required", "flow.links");
        else
            input.flow.links.forEach((l, i) => {
                if (!obj(l)) {
                    issue("link-invalid", `flow.links.${i}`);
                    return;
                }
                fields(l, ["fromArtifactId", "toArtifactId", "label"], `flow.links.${i}`);
                if (!artifactIds.has(l.fromArtifactId) ||
                    !artifactIds.has(l.toArtifactId) ||
                    !text(l.label))
                    issue("link-invalid", `flow.links.${i}`);
            });
    }
    return issues;
}
export function resolveAeoXrayIntent(input) {
    const issues = validateAeoXrayIntent(input);
    if (issues.length)
        return { status: "invalid", issues };
    return JSON.parse(JSON.stringify({
        ...input,
        status: "resolved",
        schema: "axis.aeo-xray-composition.v1",
        tokens: aeoXray,
        adapterChecks: AXIS_AEO_XRAY_ADAPTER_CHECKS,
    }));
}
