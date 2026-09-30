export function validateXrayExperience(input, blocks, assets, path) {
    const issues = [];
    const fail = (code, p) => issues.push({ code, path: p, message: code });
    const obj = (v) => !!v && typeof v === "object" && !Array.isArray(v);
    const text = (v) => typeof v === "string" && v.trim().length > 0;

    const fields = (v, keys, p) => {
        if (obj(v))
            for (const k of Object.keys(v))
                if (!keys.includes(k))
                    fail("experience-field-unknown", `${p}.${k}`);
    };

    const required = (v, keys, p) => {
        for (const k of keys)
            if (!obj(v) || !text(v[k]))
                fail("experience-text-required", `${p}.${k}`);
    };

    const array = (v, p, min = 0) => {
        if (!Array.isArray(v) || v.length < min) {
            fail("experience-array-invalid", p);
            
return [];
        }

        
return v;
    };

    const coupling = (v, p) => {
        if (!obj(v))
            return;

        if (v.sourceScope !== undefined) {
            if (["verified", "measured"].includes(v.sourceStatus) && (!text(v.source) || !text(v.asOf)))
                fail("stat-source-date-required", p);
            if (v.scope !== undefined && v.scope !== v.sourceScope)
                fail("scope-invalid", p);
            v = { ...v, scope: v.sourceScope };
        }

        if (v.sourceStatus !== undefined &&
            !["proposed", "implemented", "verified", "measured"].includes(v.sourceStatus))
            fail("evidence-status-invalid", p);
        if (v.scope !== undefined && !["block", "page", "site"].includes(v.scope))
            fail("scope-invalid", p);
        if (v.scope === "page" || v.scope === "site") {
            if (v.coupleId !== undefined)
                fail("annotation-target-invalid", p);
        }
        else if (!blocks.has(v.coupleId))
            fail("reference-missing", `${p}.coupleId`);
    };

    if (!obj(input)) {
        fail("experience-required", path);
        
return issues;
    }

    fields(input, [
        "thesis",
        "meta",
        "gap",
        "machine",
        "flow",
        "atomsIntro",
        "atoms",
        "evidence",
        "ui",
    ], path);
    required(input, ["thesis", "atomsIntro"], path);

    if (input.meta !== undefined) {
        if (!obj(input.meta))
            fail("experience-meta-invalid", path);
        else {
            fields(input.meta, [
                "instrument",
                "sampleFor",
                "sampleTitle",
                "kicker",
                "preparedAt",
                "preparedBy",
            ], `${path}.meta`);
            for (const v of Object.values(input.meta))
                if (!text(v))
                    fail("experience-text-required", `${path}.meta`);
        }
    }

    const g = input.gap;

    fields(g, [
        "kicker",
        "headline",
        "lead",
        "serpTitle",
        "serpBadge",
        "serpSummary",
        "serpNote",
        "serp",
        "diagnosisLabel",
        "punch",
        "punchNote",
        "punchWhy",
        "punchOpportunity",
        "asideLabel",
        "aside",
    ], `${path}.gap`);
    required(g, [
        "kicker",
        "headline",
        "serpTitle",
        "serpNote",
        "punch",
        "punchNote",
        "aside",
    ], `${path}.gap`);

    if (obj(g)) {
        for (const [k, v] of Object.entries(g))
            if (k !== "serp" && typeof v !== "string")
                fail("experience-text-required", `${path}.gap.${k}`);
        array(g.serp, `${path}.gap.serp`).forEach((r, i) => {
            required(r, ["domain", "kind"], `${path}.gap.serp.${i}`);
            if (!Number.isInteger(r?.pos) || r.pos < 1)
                fail("serp-position-invalid", `${path}.gap.serp.${i}`);
        });
    }

    const flow = array(input.flow, `${path}.flow`, 4);

    if (JSON.stringify(flow.map((v) => v?.step)) !==
        JSON.stringify(["", "articulo", "radiografia", "atomizacion"]))
        fail("original-flow-required", `${path}.flow`);
    flow.forEach((f, i) => {
        fields(f, ["step", "label", "next"], `${path}.flow.${i}`);
        required(f, ["label"], `${path}.flow.${i}`);
        if (typeof f?.next !== "string")
            fail("experience-text-required", `${path}.flow.${i}.next`);
    });
    const m = input.machine;

    if (!obj(m))
        fail("machine-required", `${path}.machine`);
    else {
        fields(m, ["seo", "og", "headings", "alts", "jsonld", "craft"], `${path}.machine`);
        for (const group of ["seo", "og", "jsonld", "craft"])
            array(m[group], `${path}.machine.${group}`).forEach((n, i) => {
                const p = `${path}.machine.${group}.${i}`;

                fields(n, [
                    "id",
                    "coupleId",
                    "scope",
                    "sourceScope",
                    "sourceStatus",
                    "label",
                    "value",
                    "detail",
                    "why",
                    "tier",
                    "type",
                    "metric",
                    "code",
                    "stat",
                    "statNote",
                    "source",
                    "asOf",
                ], p);
                coupling(n, p);
                required(n, group === "jsonld"
                    ? ["id", "type", "metric", "why"]
                    : group === "craft"
                        ? ["label", "detail", "why"]
                        : group === "seo"
                            ? ["id", "label", "value", "why"]
                            : ["id", "label", "value"], p);
                if (![1, 2, 3].includes(n?.tier))
                    fail("tier-invalid", p);
                if (group === "jsonld" && !obj(n?.code))
                    fail("structured-data-invalid", p);
            });
        required(m.headings, ["why"], `${path}.machine.headings`);
        coupling(m.headings, `${path}.machine.headings`);
        array(m.headings?.tree, `${path}.machine.headings.tree`).forEach((h, i) => {
            coupling(h, `${path}.machine.headings.tree.${i}`);
            required(h, ["text"], `${path}.machine.headings.tree.${i}`);
            if (![1, 2, 3, 4, 5, 6].includes(h?.level))
                fail("heading-level-invalid", path);
        });
        array(m.alts, `${path}.machine.alts`).forEach((a, i) => {
            coupling(a, `${path}.machine.alts.${i}`);
            required(a, ["alt", "why"], `${path}.machine.alts.${i}`);
        });
    }

    const e = input.evidence;

    required(e, ["intro", "honesty"], `${path}.evidence`);
    fields(e, ["intro", "facts", "fanOut", "honesty"], `${path}.evidence`);
    array(e?.facts, `${path}.evidence.facts`).forEach((f, i) => {
        const p = `${path}.evidence.facts.${i}`;

        coupling(f, p);
        required(f, ["label", "value", "note", "source", "asOf"], p);
        if (typeof f?.headline !== "boolean")
            fail("boolean-invalid", p);
        if (f?.headline === true && (!text(f.big) || !text(f.bigUnit)))
            fail("headline-display-required", p);
    });
    required(e?.fanOut, ["title", "note"], `${path}.evidence.fanOut`);
    array(e?.fanOut?.items, `${path}.evidence.fanOut.items`).forEach((f, i) => {
        required(f, ["q", "coveredBy"], `${path}.evidence.fanOut.items.${i}`);
        if (typeof f?.covered !== "boolean")
            fail("boolean-invalid", path);
        if (f?.covered && !blocks.has(f.coveredBy))
            fail("reference-missing", `${path}.evidence.fanOut.items.${i}.coveredBy`);
    });
    const atomIds = new Set();

    array(input.atoms, `${path}.atoms`, 1).forEach((a, i) => {
        const p = `${path}.atoms.${i}`;

        fields(a, [
            "id",
            "coupleId",
            "scope",
            "sourceScope",
            "sourceStatus",
            "kind",
            "bornFrom",
            "why",
            "honesty",
            "deliverable",
            "stat",
            "statNote",
            "source",
            "asOf",
            "video",
            "reel",
            "showsImages",
            "code",
            "post",
        ], p);
        required(a, ["id", "kind", "bornFrom", "why", "honesty"], p);
        coupling(a, p);
        if (atomIds.has(a?.id))
            fail("id-duplicate", p);
        atomIds.add(a?.id);
        array(a?.deliverable, `${p}.deliverable`, 2).forEach((d, j) => required(d, ["k", "v"], `${p}.deliverable.${j}`));

        for (const kind of ["video", "reel"])
            if (a?.[kind] !== undefined) {
                const v = a[kind];

                required(v, ["assetId", "posterAssetId", "alt"], `${p}.${kind}`);
                fields(v, [
                    "assetId",
                    "posterAssetId",
                    "alt",
                    "label",
                    "title",
                    "description",
                    "disclosure",
                ], `${p}.${kind}`);
                if (!assets.has(v?.assetId) || !assets.has(v?.posterAssetId))
                    fail("reference-missing", `${p}.${kind}`);
            }

        if (a?.post !== undefined) {
            required(a.post, ["hook", "body", "cta"], `${p}.post`);
            fields(a.post, ["hook", "body", "cta", "imageAssetId", "alt"], `${p}.post`);
            if (a.post?.imageAssetId &&
                (!assets.has(a.post.imageAssetId) || !text(a.post.alt)))
                fail("reference-missing", `${p}.post`);
        }
    });

    const uiKeys = [
        "disclaimerLabel",
        "disclaimerBody",
        "paneArticleTitle",
        "paneArticleSubtitle",
        "paneMachineTab",
        "paneEvidenceTab",
        "hintDesktop",
        "hintMobile",
        "whyLabel",
        "schemaNote",
        "sourceLabel",
        "thesisLabel",
        "licenseTitle",
        "licenseNote",
        "backToArticle",
        "bylineBy",
        "readTime",
        "instrumentTitle",
        "specimenChip",
        "producesLabel",
        "producesLabelOne",
        "flowNext",
        "flowOf",
        "srProduces",
        "closing",
        "verifyTitle",
        "verifyNote",
    ];

    required(input.ui, uiKeys, `${path}.ui`);
    fields(input.ui, [...uiKeys, "verifySteps"], `${path}.ui`);
    array(input.ui?.verifySteps, `${path}.ui.verifySteps`, 2).forEach((v, i) => required(v, ["what", "how"], `${path}.ui.verifySteps.${i}`));

    const stats = (v, p) => {
        if (Array.isArray(v)) {
            v.forEach((x, i) => stats(x, `${p}.${i}`));
            
return;
        }

        if (!obj(v))
            return;
        if (v.stat !== undefined &&
            (!text(v.stat) || !text(v.source) || !text(v.asOf)))
            fail("stat-source-date-required", p);
        for (const [k, x] of Object.entries(v))
            if (k !== "code")
                stats(x, `${p}.${k}`);
    };

    stats(input, path);
    
return issues;
}

/** The instrument describes the same specimen: compare only original explicit bindings, never factual estimates. */
export function validateXrayMachineConsistency(input, artifact, assets, path) {
    const issues = [];
    const drift = (code, p) => issues.push({ code, path: p, message: code });
    const stable = (value) => JSON.stringify(value, (_key, item) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);
    const values = { 'meta-title': artifact.seo.title, 'meta-description': artifact.seo.description, canonical: artifact.seo.canonical, 'og-title': artifact.seo.title, 'og-description': artifact.seo.description, 'og-url': artifact.seo.canonical };

    for (const group of ['seo', 'og'])
        input.machine[group].forEach((node, index) => {
            if (node.id && Object.hasOwn(values, node.id) && node.value !== values[node.id])
                drift('machine-metadata-drift', `${path}.machine.${group}.${index}.value`);
        });

    const headings = artifact.blocks.flatMap(block => {
        if (block.kind === 'hero')
            return [{ coupleId: block.id, level: 1, text: block.title }];
        if (block.kind === 'heading')
            return [{ coupleId: block.id, level: block.level, text: block.text }];
        if (block.kind === 'faq')
            return [{ coupleId: block.id, level: 2, text: block.title ?? 'Preguntas frecuentes' }];
        
return [];
    });

    const declared = input.machine.headings.tree.map(({ coupleId, level, text }) => ({ coupleId, level, text }));

    if (stable(headings) !== stable(declared))
        drift('machine-heading-tree-drift', `${path}.machine.headings.tree`);
    input.machine.alts.forEach((node, index) => {
        if (!node.coupleId)
            return; // Page/site guidance is not an assertion about a specimen image.
        const block = artifact.blocks.find(block => block.id === node.coupleId);

        if (!block || !['hero', 'image'].includes(block.kind) || !block.assetId) {
            drift('machine-alt-target-invalid', `${path}.machine.alts.${index}.coupleId`);
            
return;
        }

        const asset = assets.find(asset => asset.id === block.assetId);

        if (asset && node.alt !== asset.alt)
            drift('machine-alt-drift', `${path}.machine.alts.${index}.alt`);
    });
    input.machine.jsonld.forEach((node, index) => {
        const nodePath = `${path}.machine.jsonld.${index}.code`;

        // page-schema is the original binding to the producer's target schema, not the host demo's metadata.
        if (node.id === 'page-schema' && artifact.seo.structuredData && stable(node.code) !== stable(artifact.seo.structuredData))
            drift('machine-schema-drift', nodePath);

        if (node.type === 'FAQPage' && node.coupleId) {
            const block = artifact.blocks.find(block => block.id === node.coupleId);

            if (block?.kind !== 'faq') {
                drift('machine-schema-target-invalid', nodePath);
                
return;
            }

            const actual = Array.isArray(node.code?.mainEntity) ? node.code.mainEntity.map((entry) => ({ question: entry?.name, answer: entry?.acceptedAnswer?.text })) : null;

            if (stable(actual) !== stable(block.items))
                drift('machine-faq-drift', nodePath);
        }
    });
    
return issues;
}
