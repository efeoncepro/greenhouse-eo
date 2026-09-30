/** TASK-1950. Portable candidate: renderer and client content remain consumer-owned. */
export declare const aeoXray: {
    readonly version: "0.1.0";
    readonly lifecycle: "candidate";
    readonly shell: {
        readonly ground: "#091951";
        readonly ink: "#ffffff";
        readonly accent: "#0375db";
        readonly muted: "#cfe4fa";
    };
    readonly canvas: {
        readonly background: "#ffffff";
        readonly ink: "#001a33";
        readonly muted: "#5b6b7c";
        readonly rule: "#e3e7ec";
    };
    readonly layout: {
        readonly maxWidth: "76rem";
        readonly readingWidth: "46rem";
        readonly inspectorWidth: "24rem";
        readonly mobileBreakpoint: "48rem";
        readonly gap: "1.5rem";
        readonly padding: "1.5rem";
    };
    readonly typography: {
        readonly hero: "clamp(2.5rem, 5vw, 4.5rem)";
        readonly h2: "clamp(1.75rem, 3vw, 2.75rem)";
        readonly h3: "1.5rem";
        readonly body: "1.0625rem";
        readonly small: "0.8125rem";
        readonly readingLineHeight: 1.75;
        readonly headingLineHeight: 1.15;
    };
    readonly spacing: {
        readonly xs: "0.5rem";
        readonly sm: "1rem";
        readonly md: "1.5rem";
        readonly lg: "2.5rem";
        readonly xl: "4rem";
        readonly section: "6rem";
    };
    readonly hero: {
        readonly minHeight: "32rem";
        readonly mobileMinHeight: "24rem";
    };
    readonly radius: {
        readonly xs: "2px";
        readonly sm: "4px";
        readonly md: "6px";
        readonly lg: "8px";
        readonly xl: "10px";
        readonly xxl: "12px";
        readonly display: "16px";
        readonly round: "9999px";
    };
    readonly motion: {
        readonly duration: {
            readonly instant: "75ms";
            readonly short: "150ms";
            readonly standard: "200ms";
            readonly medium: "300ms";
            readonly long: "400ms";
            readonly extended: "600ms";
        };
        readonly ease: {
            readonly emphasized: "cubic-bezier(0.2, 0, 0, 1)";
            readonly standard: "cubic-bezier(0.4, 0, 0.2, 1)";
            readonly emphasizedAccelerate: "cubic-bezier(0.3, 0, 0.8, 0.15)";
            readonly linear: "linear";
        };
        readonly reducedMotion: "prefers-reduced-motion: reduce";
    };
    readonly fonts: {
        readonly "Roboto Slab": "Roboto Slab Variable, Georgia, serif";
        readonly "system-sans": "system-ui, sans-serif";
        readonly "system-serif": "Georgia, serif";
        readonly Poppins: "Poppins, system-ui, sans-serif";
        readonly Geist: "Geist, system-ui, sans-serif";
        readonly "Bricolage Grotesque": "Bricolage Grotesque, system-ui, sans-serif";
    };
    readonly accessibility: {
        readonly normalTextContrast: 4.5;
        readonly largeTextContrast: 3;
        readonly targetSizePx: 44;
        readonly reducedMotion: true;
    };
    readonly categories: readonly ["technical", "on-page", "aeo", "conversion"];
    readonly evidenceStates: readonly ["proposed", "implemented", "verified", "measured"];
    readonly choreography: {
        readonly preset: "original-xray";
        readonly source: "efeonce-think/src/styles/aeo-xray.css";
        readonly sharedHeroMs: 420;
        readonly instrumentEnterMs: 420;
        readonly instrumentExitMs: 260;
        readonly instrumentTravel: "14%";
        readonly pageFadeOutMs: 180;
        readonly pageRiseMs: 320;
        readonly pageRiseDistance: "10px";
        readonly couplingMs: 140;
        readonly pulseMs: 320;
        readonly mobileSheetMs: 220;
        readonly enterEase: "cubic-bezier(0.2, 0, 0, 1)";
        readonly exitEase: "cubic-bezier(0.4, 0, 1, 1)";
        readonly reducedMotion: "none";
    };
    readonly defaultMode: "read";
    readonly demoRobots: "noindex,nofollow";
};
export type AeoXrayTokens = typeof aeoXray;
