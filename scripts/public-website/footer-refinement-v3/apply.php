<?php
/**
 * Footer v3 (2026-10-31, operator chose the four-column proposal from the Contacto canvas, page «Footer»).
 *
 * Exact replacements on the live footer blocks, written at their source rules instead of overrides:
 * - block-34 (adapter): night-blue AXIS ground #000f1f with a #1d3a57 top line and dividers, columns rebalanced
 *   (300 · 170 · 360 · 300 at 1440), partner logos sized by optical weight (--eo-logo-h) with equal gaps, careers link as
 *   an outline pill with a paper dot.
 * - block-31 (careers): «Ver vacantes» pill markup.
 * The Glitch column (block-46) is refreshed separately by footer-newsletter-growth-form.php.
 *
 * Guards: each block must still hash to what was exported and every replacement must match exactly once; otherwise
 * nothing is written. Snapshot first, readback after, cache purge. Rollback: restore `widget_block` from the snapshot.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$P = '#colophon:has([data-eo-footer-partners="v2"])';

$expected = array(
	31 => '8da14c4ab20985de746e4a2c641a8a46680d33c274ceca8c5b9c1457857d598a',
	34 => 'f52063a220b9579745a597d2dd62a52f32f79a0daa428631e256e4928da3350c',
);

$logos = array( 'HubSpot' => array( 92, 25 ), 'Salesforce' => array( 58, 30 ), 'Adobe' => array( 80, 22 ), 'Microsoft' => array( 99, 22 ), 'AWS' => array( 54, 29 ), 'Google Cloud' => array( 108, 19 ), 'Claude' => array( 108, 22 ), 'OpenAI' => array( 104, 24 ), 'BytePlus' => array( 108, 20 ) );

$careers_css = $P . ' .eo-footer-careers a.eo-footer-careers-cta{gap:12px;min-height:40px;height:40px;box-sizing:border-box;padding:0 5px 0 16px;border:1px solid color-mix(in srgb,var(--eo-ft-paper) 22%,transparent);border-radius:999px;background:color-mix(in srgb,var(--eo-ft-paper) 5%,transparent);color:var(--eo-ft-paper);font-weight:500;transition:border-color 200ms cubic-bezier(0.4,0,0.2,1)}'
	. "\n" . $P . ' .eo-footer-careers-dot{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:999px;background:var(--eo-ft-paper);color:var(--eo-ft-ink);transition:background-color 200ms cubic-bezier(0.4,0,0.2,1)}'
	. "\n" . $P . ' .eo-footer-careers-dot svg{display:block;transition:transform 300ms cubic-bezier(0.2,0,0,1)}'
	. "\n" . $P . ' .eo-footer-careers a.eo-footer-careers-cta:hover{border-color:var(--eo-ft-accent);color:var(--eo-ft-paper)}'
	. "\n" . $P . ' .eo-footer-careers a.eo-footer-careers-cta:hover .eo-footer-careers-dot{background:var(--eo-ft-accent)}'
	. "\n" . $P . ' .eo-footer-careers a.eo-footer-careers-cta:hover .eo-footer-careers-dot svg{transform:translate(1px,-1px)}'
	. "\n" . $P . ' .eo-footer-careers-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
	. "\n" . '@media (prefers-reduced-motion:reduce){' . $P . ' .eo-footer-careers-dot svg{transition:none}}';

$replacements = array(
	34 => array(
		array( $P . '{--eo-ft-paper:#f7f8f6;', $P . '{background-color:#000f1f;border-top:1px solid #1d3a57;--eo-ft-line:#1d3a57;--eo-ft-paper:#f7f8f6;', 1 ),
		array( 'grid-template-columns:1.05fr .65fr 1.4fr .95fr;', 'grid-template-columns:minmax(0,1fr) minmax(0,.57fr) minmax(0,1.2fr) minmax(0,1fr);', 1 ),
		array( 'border-top:1px solid color-mix(in srgb,var(--eo-ft-paper) 14%,transparent)', 'border-top:1px solid var(--eo-ft-line)', 2 ),
		array( '.eo-footer-partner-list{display:grid;grid-template-columns:repeat(9,minmax(0,1fr));align-items:center;gap:24px;', '.eo-footer-partner-list{display:flex;justify-content:space-between;align-items:center;gap:24px;', 1 ),
		array( '.eo-footer-partner-list img{display:block;max-width:100%;height:auto;object-fit:contain;', '.eo-footer-partner-list img{display:block;width:auto;max-width:100%;height:var(--eo-logo-h,24px);object-fit:contain;', 1 ),
		array( '.eo-footer-partner-list{grid-template-columns:repeat(5,minmax(0,1fr));gap:16px 24px}', '.eo-footer-partner-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));justify-items:center;gap:16px 24px}', 1 ),
		array( '.eo-footer-partner-list{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 16px}', '.eo-footer-partner-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));justify-items:center;gap:12px 16px}' . "\n" . $P . ' .eo-footer-partner-list img{height:calc(var(--eo-logo-h,24px) * .88)}', 1 ),
		array( $P . ' .eo-footer-careers a{color:var(--eo-ft-paper);border-bottom:1px solid color-mix(in srgb,var(--eo-ft-paper) 35%,transparent)}', $careers_css, 1 ),
	),
	31 => array(
		array(
			'<a class="-undash" href="https://greenhouse.efeoncepro.com/public/careers" target="_blank" rel="noopener noreferrer">Ver vacantes y postular <span aria-hidden="true">↗</span></a>',
			'<a class="-undash eo-footer-careers-cta" href="https://greenhouse.efeoncepro.com/public/careers" target="_blank" rel="noopener noreferrer">Ver vacantes <span class="eo-footer-careers-dot" aria-hidden="true"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 7l-10 10"/><path d="M8 7l9 0l0 9"/></svg></span><span class="eo-footer-careers-sr">(se abre en una pestaña nueva)</span></a>',
			1,
		),
	),
);
foreach ( $logos as $alt => $sizes ) {
	$replacements[34][] = array( 'style="width:' . $sizes[0] . 'px" alt="' . $alt . '"', 'style="--eo-logo-h:' . $sizes[1] . 'px" alt="' . $alt . '"', 1 );
}

$blocks   = get_option( 'widget_block' );
$sidebars = get_option( 'sidebars_widgets' );
$next     = $blocks;
foreach ( $expected as $n => $hash ) {
	$content = (string) ( $blocks[ $n ]['content'] ?? '' );
	if ( ! hash_equals( $hash, hash( 'sha256', $content ) ) ) { WP_CLI::error( 'block-' . $n . ' drift. Re-export before applying.' ); }
	foreach ( $replacements[ $n ] as list( $old, $new, $times ) ) {
		$found = substr_count( $content, $old );
		if ( $found !== $times ) { WP_CLI::error( 'block-' . $n . ': expected ' . $times . ' match(es), found ' . $found . ' for: ' . substr( $old, 0, 90 ) ); }
		$content = str_replace( $old, $new, $content );
	}
	$next[ $n ]['content'] = $content;
}
$home           = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );

$snapshot = '_gh_footer_v3_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'widget_block' => $blocks, 'sidebars_widgets' => $sidebars ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }
update_option( 'widget_block', $next );

$after = get_option( 'widget_block' );
$out   = array();
foreach ( $expected as $n => $hash ) {
	if ( ( $after[ $n ]['content'] ?? '' ) !== $next[ $n ]['content'] ) { WP_CLI::error( 'Readback failed on block-' . $n . '. Snapshot: ' . $snapshot ); }
	$out[ 'block-' . $n ] = hash( 'sha256', $after[ $n ]['content'] );
}
if ( get_option( 'sidebars_widgets' ) !== $sidebars ) { WP_CLI::error( 'Sidebars changed unexpectedly. Snapshot: ' . $snapshot ); }
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_v3_applied', 'snapshot' => $snapshot, 'hashes' => $out ), JSON_PRETTY_PRINT ) . PHP_EOL;
