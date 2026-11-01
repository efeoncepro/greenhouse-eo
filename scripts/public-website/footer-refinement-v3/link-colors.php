<?php
/**
 * Footer v3: link colours as in the canvas, on every page (2026-10-31, operator: «los hover de Explora y sus items
 * ¿también funcionan? en el sitio no funcionaban»).
 *
 * ohio-child/assets/css/global-fixes.css pins every footer link and paragraph to rgba(255,255,255,.75) !important on
 * all pages but Home, so the adapter's hovers (and the paper links of the contact column) only worked on Home. The
 * adapter owns the footer chrome, so it restates the canvas colours with !important in one marked block:
 * Explora, Contacto, «Volver arriba» and the social icons; the paper colour of the contact links, the «Casa matriz»
 * label and «Ver vacantes». Clean fix still open: drop those footer rules from global-fixes.css (it has no governed
 * deploy lane today) and remove the !important here.
 *
 * Social icons stay paper at rest and on hover, as in the canvas.
 *
 * Guards: `</style>` present exactly once in block-34; re-running replaces the marked block. Snapshot, readback, purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$P      = '#colophon:has([data-eo-footer-partners="v2"])';
$marker = '/* Footer v3 link colours (canvas). */';
$rules  = "\n" . $marker
	. "\n" . $P . ' .eo-footer-explore a:hover,' . $P . ' .eo-footer-top:hover,' . $P . ' .eo-footer-contact a:hover{color:var(--eo-ft-accent)!important}'
	. "\n" . $P . ' .eo-footer-contact a,' . $P . ' .eo-footer-contact p.eo-footer-contact__label{color:var(--eo-ft-paper)!important}'
	. "\n" . $P . ' .social-networks a.network,' . $P . ' .social-networks a.network:hover{color:var(--eo-ft-paper)!important}'
	. "\n" . $P . ' .eo-footer-careers a.eo-footer-careers-cta,' . $P . ' .eo-footer-careers a.eo-footer-careers-cta:hover{color:var(--eo-ft-paper)!important}'
	. "\n" . $P . ' :is(.eo-footer-explore a,.eo-footer-contact a,.eo-footer-top,.social-networks a.network){transition:color 200ms cubic-bezier(0.4,0,0.2,1)}'
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

$snapshot = '_gh_footer_v3_links_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'block34' => $content ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }
$blocks[34]['content'] = str_replace( '</style>', $rules . '</style>', $base );
update_option( 'widget_block', $blocks );
if ( ( get_option( 'widget_block' )[34]['content'] ?? '' ) !== $blocks[34]['content'] ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_link_colours_applied', 'snapshot' => $snapshot, 'block34' => hash( 'sha256', $blocks[34]['content'] ) ), JSON_PRETTY_PRINT ) . PHP_EOL;
