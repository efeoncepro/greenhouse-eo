# Home · Showreel modal

Scope: user-authorized hero action on WordPress Home 251731, 2026-08-30.
Rigor: ui-standard; source-led extension of the current navy/teal Home and its Experience module.
Source video: https://www.youtube.com/watch?v=yHUystNmtcQ (YouTube oEmbed confirms Efeonce Showreel 2025).

## Direction and primitive decision

Selected: cinematic dark player, one 16:9 surface, quiet label/title, 44px close target and secondary
YouTube recovery link. Navy frame, subtle teal border, dimmed blurred backdrop, brief fade/scale entry.
Rejected: inline expansion (reflows the hero); fake browser/demo chrome (misrepresents the showreel);
new fullscreen page (loses Home context). Extend `greenhouse_agency_experience`, retain hero trigger.
Use native dialog top layer for modality/background inertness; do not import private MUI primitives.
Reuse Home font, radius, secondary and motion tokens; scoped WordPress adapter CSS.

## Flow and states

Closed: no iframe or YouTube request. Click: open modal, focus close, instantiate validated YouTube
nocookie embed with autoplay requested. Actual playback remains provider/browser controlled.
Close/X/outside/Escape: remove iframe immediately, restore scroll and trigger focus. Repeat opening
creates one fresh player. Editor preview never creates a third-party player. Empty/invalid URL never
creates a frame; only allow known HTTPS YouTube hosts and eleven-character IDs.
Loading caption behind frame; permanent external recovery link, no fake success or player-state claim.
Reduced motion: no scale/fade. No changes to global header/footer or sticky agenda behavior.

## Responsive and verification

Desktop: max 1120px player, constrained by viewport height; readable header, close aligned right.
390px: 12px outer gutter, compact header, full-width 16:9 player, recovery link below; no horizontal scroll.
Landscape: viewport-height-derived width prevents controls clipping. Verify native dialog focus cycle,
Escape and close, repeat open, iframe lifecycle and URL allowlist; visual captures at 1280/890/390.
Browser in-app captures are primary evidence for this WordPress surface; private Greenhouse GVC routes
do not render this plugin. Record evidence/limits in the dated public-site audit before acceptance.
