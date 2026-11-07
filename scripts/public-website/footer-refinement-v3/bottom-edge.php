<?php
/**
 * Footer v3: no light line under the footer, on every page (2026-11-01, operator: «se genera una línea blanca abajo»).
 *
 * Cause, measured live on 11 pages: the hidden scheduler launchers printed after `.site` in wp_footer
 * (`.eo-site-nav-scheduler` from ohio-child/assets/css/meeting-dialog.css, `.eo-landing-dock-scheduler` inline in the
 * eo-landing-dock plugin) are `position:absolute` 1×1 boxes with no `top`, so they sit at their static place: right
 * below the footer. They stretch the document by 1 px plus the footer's fractional bottom, and that strip shows the page
 * canvas — white on /blog/, AEO and Redes Sociales, #161519 on Contacto.
 *
 * The adapter owns the footer edge, so it pins both launchers to the top of the body (they stay invisible and out of
 * the tab order) and adds a 1 px shadow in the footer colour to cover the sub-pixel rounding (a box-shadow paints
 * without growing the scroll area). Clean fix still open: `top:0;left:0` on both launchers in the runtime repo
 * (theme lane for meeting-dialog.css, plugin release for eo-landing-dock); then this block's first rule can go.
 *
 * Guards: `</style>` present exactly once in block-34; re-running replaces the marked block. Snapshot, readback, purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$P      = '#colophon:has([data-eo-footer-partners="v2"])';
$marker = '/* Footer v3 bottom edge (no canvas line). */';
$rules  = "\n" . $marker
	. "\n" . '.eo-site-nav-scheduler,.eo-landing-dock-scheduler{top:0;left:0}'
	. "\n" . $P . '{box-shadow:0 1px 0 #000f1f}'
	. "\n";

$blocks  = get_option( 'widget_block' );
$content = (string) ( $blocks[34]['content'] ?? '' );
if ( 1 !== substr_count( $content, '</style>' ) ) { WP_CLI::error( 'Expected exactly one </style> in block-34.' ); }
$base = $content;
// Re-running replaces the marked block (it always sits right before </style>), so the rules can be tuned in place.
if ( false !== ( $at = strpos( $content, "\n" . $marker ) ) ) {
	$end = strpos( $content, '</style>', $at );
	if ( false === $end || 1 !== substr_count( $content, $marker ) ) { WP_CLI::error( 'Marked block not found cleanly.' ); }
	$base = substr( $content, 0, $at ) . substr( $content, $end );
}
if ( str_replace( '</style>', $rules . '</style>', $base ) === $content ) { WP_CLI::error( 'Already applied.' ); }

$snapshot = '_gh_footer_v3_edge_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'block34' => $content ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }
$blocks[34]['content'] = str_replace( '</style>', $rules . '</style>', $base );
update_option( 'widget_block', $blocks );
if ( ( get_option( 'widget_block' )[34]['content'] ?? '' ) !== $blocks[34]['content'] ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_bottom_edge_applied', 'snapshot' => $snapshot, 'block34' => hash( 'sha256', $blocks[34]['content'] ) ), JSON_PRETTY_PRINT ) . PHP_EOL;
