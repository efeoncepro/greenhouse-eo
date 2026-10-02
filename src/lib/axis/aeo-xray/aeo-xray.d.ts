import { aeoXray } from './aeo-xray-tokens.js';
import { type AxisAeoXrayExperience } from "./aeo-xray-experience.js";
export type { AxisAeoXrayExperience } from "./aeo-xray-experience.js";
export declare const AXIS_AEO_XRAY_CONTRACT: {
    readonly id: "efeonce.aeo-xray";
    readonly version: "0.1.0";
    readonly lifecycle: "candidate";
    readonly owner: "efeonce-aeo-xray";
    readonly anatomy: readonly ["shell", "artifact", "block", "annotation", "evidence", "source"];
    readonly consumers: readonly ["efeonce-think", "greenhouse-aeo-xray"];
    readonly evidence: readonly ["TASK-1950", "tokens:aeoXray"];
};
export type AxisAeoXrayCta = {
    label: string;
    artifactId?: string;
    blockId?: string;
    href?: string;
};
export type AxisAeoXrayBlock = {
    id: string;
    sourceIds?: string[];
} & ({
    kind: "hero";
    eyebrow?: string;
    title: string;
    text: string;
    assetId?: string;
    cta?: AxisAeoXrayCta;
} | {
    kind: "heading";
    level: 2 | 3;
    text: string;
    anchor?: string;
    short?: string;
} | {
    kind: "paragraph" | "answer-capsule" | "pull-quote";
    text: string;
} | {
    kind: "toc";
    title: string;
} | {
    kind: "internal-links" | "sources";
    title: string;
    items: {
        text: string;
        href: string;
        note?: string;
    }[];
} | {
    kind: "list";
    items: string[];
    ordered?: boolean;
} | {
    kind: "table";
    columns: string[];
    rows: string[][];
    caption: string;
} | {
    kind: "image";
    assetId: string;
    caption?: string;
    role?: "hero" | "body";
} | {
    kind: "quote";
    text: string;
    attribution: string;
} | {
    kind: "faq";
    title?: string;
    anchor?: string;
    short?: string;
    items: {
        question: string;
        answer: string;
    }[];
} | {
    kind: "cta";
    title?: string;
    text?: string;
    action: AxisAeoXrayCta;
});
export type AxisAeoXrayAnnotation = {
    id: string;
    scope: "block" | "page" | "site";
    blockId?: string;
    category: "technical" | "on-page" | "aeo" | "conversion";
    title: string;
    explanation: string;
    status: "proposed" | "implemented" | "verified" | "measured";
    sourceIds: string[];
    evidence?: {
        description: string;
        asOf: string;
        sourceIds: string[];
    };
};
export type AxisAeoXrayArtifact = {
    id: string;
    kind: "landing" | "article";
    title: string;
    summary: string;
    byline?: {
        author: string;
        publishedAt: string;
        reviewer?: string;
    };
    experience?: AxisAeoXrayExperience;
    blocks: AxisAeoXrayBlock[];
    annotations: AxisAeoXrayAnnotation[];
    seo: {
        title: string;
        description: string;
        canonical: string;
        robots: string;
        lang: string;
        structuredData?: Record<string, unknown>;
    };
};
export type AxisAeoXrayIntent = {
    contract: "efeonce.aeo-xray";
    version: "0.1.0";
    locale: string;
    title: string;
    preparedFor: string;
    preparedAt: string;
    artifacts: AxisAeoXrayArtifact[];
    sources: {
        id: string;
        label: string;
        url: string;
        accessedAt: string;
    }[];
    assets: {
        id: string;
        ref: {
            kind: "public";
            url: string;
        } | {
            kind: "protected";
            assetId: string;
            sha256?: string;
        };
        alt: string;
        width: number;
        height: number;
        credit: string;
        sourceId: string;
        approval: "approved";
    }[];
    brand?: {
        name: string;
        accent: string;
        ink?: string;
        action?: string;
        actionText?: string;
        fontFamily?: keyof typeof aeoXray.fonts;
        displayFontFamily?: keyof typeof aeoXray.fonts;
        logoAssetId?: string;
    };
    flow: {
        entryArtifactId: string;
        links: {
            fromArtifactId: string;
            toArtifactId: string;
            label: string;
        }[];
    };
};
export type AxisAeoXrayIssue = {
    code: string;
    path: string;
    message: string;
};
export declare const AXIS_AEO_XRAY_ADAPTER_CHECKS: readonly ["demo-noindex", "content-escaped", "no-active-bank-form", "scoped-annotations", "keyboard-and-mobile", "contrast", "asset-authorization", "source-dates-visible", "evidence-status-visible"];
export type AxisAeoXrayManifest = AxisAeoXrayIntent & {
    status: "resolved";
    schema: "axis.aeo-xray-composition.v1";
    tokens: typeof aeoXray;
    adapterChecks: typeof AXIS_AEO_XRAY_ADAPTER_CHECKS;
};
/** Accepts unknown at the trust boundary. No HTML, CSS, auth or mutable case state belongs here. */
export declare function validateAeoXrayIntent(input: unknown): AxisAeoXrayIssue[];
export declare function resolveAeoXrayIntent(input: unknown): AxisAeoXrayManifest | {
    status: "invalid";
    issues: AxisAeoXrayIssue[];
};
