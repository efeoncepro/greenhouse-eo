/** Original X-Ray narrative/instrument contract, portable media references only. No replacement flow DSL. */
export type XrayCoupling = {
    coupleId?: string;
    scope?: "block" | "page" | "site";
    sourceScope?: "block" | "page" | "site";
    sourceStatus?: "proposed" | "implemented" | "verified" | "measured";
};
export type XrayLegacyStat = {
    stat?: string;
    statNote?: string;
    source?: string;
    asOf?: string;
};
export type XrayMachineNode = XrayCoupling & XrayLegacyStat & {
    id?: string;
    label?: string;
    value?: string;
    detail?: string;
    why?: string;
    tier?: 1 | 2 | 3;
    type?: string;
    metric?: string;
    code?: Record<string, unknown>;
};
export type XrayMedia = {
    assetId: string;
    posterAssetId: string;
    alt: string;
    label?: string;
    title?: string;
    description?: string;
    disclosure?: string;
};
export type AxisAeoXrayExperience = {
    thesis: string;
    meta?: {
        instrument?: string;
        sampleFor?: string;
        sampleTitle?: string;
        kicker?: string;
        preparedAt?: string;
        preparedBy?: string;
    };
    gap: {
        kicker: string;
        headline: string;
        lead?: string;
        serpTitle: string;
        serpBadge?: string;
        serpSummary?: string;
        serpNote: string;
        serp: {
            pos: number;
            domain: string;
            kind: string;
        }[];
        diagnosisLabel?: string;
        punch: string;
        punchNote: string;
        punchWhy?: string;
        punchOpportunity?: string;
        asideLabel?: string;
        aside: string;
    };
    machine: {
        seo: XrayMachineNode[];
        og: XrayMachineNode[];
        headings: XrayCoupling & {
            why: string;
            tree: (XrayCoupling & {
                level: number;
                text: string;
            })[];
        };
        alts: (XrayCoupling & {
            alt: string;
            why: string;
        })[];
        jsonld: XrayMachineNode[];
        craft: XrayMachineNode[];
    };
    flow: {
        step: "" | "articulo" | "radiografia" | "atomizacion";
        label: string;
        next: string;
    }[];
    atomsIntro: string;
    atoms: (XrayCoupling & XrayLegacyStat & {
        id: string;
        kind: string;
        bornFrom: string;
        why: string;
        honesty: string;
        deliverable: {
            k: string;
            v: string;
        }[];
        video?: XrayMedia;
        reel?: XrayMedia;
        showsImages?: boolean;
        code?: Record<string, unknown>;
        post?: {
            hook: string;
            body: string;
            cta: string;
            imageAssetId?: string;
            alt?: string;
        };
    })[];
    evidence: {
        intro: string;
        facts: (XrayCoupling & {
            label: string;
            value: string;
            note: string;
            source: string;
            asOf: string;
            headline: boolean;
            big?: string;
            bigUnit?: string;
        })[];
        fanOut: {
            title: string;
            note: string;
            items: {
                q: string;
                coveredBy: string;
                covered: boolean;
            }[];
        };
        honesty: string;
    };
    /** 0.2.0 · bloques opcionales de experiencia temprana: el cliente vive cómo sería trabajar con el productor. */
    aiPanel?: XrayAiPanel;
    today?: XrayToday;
    review?: XrayReview;
    measure?: XrayMeasure;
    nextStep?: XrayNextStep;
    ui: Record<string, string | {
        what: string;
        how: string;
    }[]>;
};
/** Muestra real del panel de respuestas de IA: preguntas observadas, si aparece la marca, qué cita y si el dato es correcto. */
export type XrayAiPanel = {
    title: string;
    intro: string;
    surface: string;
    market: string;
    asOf: string;
    method: string;
    note: string;
    rows: {
        question: string;
        kind: "generic" | "brand";
        appears: boolean;
        accuracy: "correct" | "incorrect" | "not-mentioned";
        citesOwnSite: boolean;
        cited: string[];
        detail: string;
        surface?: string;
        asOf?: string;
    }[];
};
/** Lo que la máquina lee hoy de la página real del cliente frente a lo que leería con la pieza. */
export type XrayToday = {
    title: string;
    intro: string;
    url: string;
    asOf: string;
    method: string;
    note: string;
    rows: {
        label: string;
        today: string;
        proposed: string;
        verdict: "keep" | "improve" | "add";
    }[];
};
/** Cómo llegaría la pieza a revisión: cada dato con su documento, responsable y estado. */
export type XrayReview = {
    title: string;
    intro: string;
    version: string;
    note: string;
    items: {
        claim: string;
        coupleId: string;
        document: string;
        owner: string;
        status: "pending" | "approved" | "changes";
    }[];
    comments: {
        role: string;
        text: string;
        coupleId?: string;
    }[];
};
/** Señales con que el productor mediría la pieza, en el vocabulario de su propuesta. */
export type XrayMeasure = {
    title: string;
    intro: string;
    items: {
        label: string;
        question: string;
        method: string;
    }[];
};
/** Siguiente paso concreto al terminar el recorrido. */
export type XrayNextStep = {
    title: string;
    body: string;
    ctaLabel: string;
    ctaHref: string;
    note?: string;
};
export declare function validateXrayExperience(input: unknown, blocks: Set<string>, assets: Set<string>, path: string): {
    code: string;
    path: string;
    message: string;
}[];
/** The instrument describes the same specimen: compare only original explicit bindings, never factual estimates. */
export declare function validateXrayMachineConsistency(input: AxisAeoXrayExperience, artifact: {
    seo: {
        title: string;
        description: string;
        canonical: string;
        structuredData?: Record<string, unknown>;
    };
    blocks: Array<Record<string, any>>;
}, assets: Array<{
    id: string;
    alt: string;
}>, path: string): {
    code: string;
    path: string;
    message: string;
}[];
