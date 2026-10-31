<?php
/**
 * Footer v3: legal links without the « | » (2026-10-31, operator: «¿no sientes que esto está muy pegado?»).
 *
 * The bar and the «Preferencias de cookies» button are injected by the consent plugin (eo-measurement-consent, its
 * `efeonce-cookie-preferences-mount` script appends a ' | ' text node). The footer adapter (block-34) lays the two links
 * out with space instead: the container's font-size at 0 so the stray text node takes no room, the size restored on each
 * link and a left margin on the button. Clean fix still open: stop appending the separator in the plugin.
 *
 * Guards: one exact match of the anchor rule (and of the first-pass rules it replaces). Snapshot first, readback after,
 * cache purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$P        = '#colophon:has([data-eo-footer-partners="v2"])';
$host     = $P . ' .site-footer-copyright .holder>.-right[data-efeonce-cookie-links]';
$anchor   = $P . ' .site-footer-copyright a,' . $P . ' .efeonce-cookie-preferences{font:inherit;color:var(--eo-ft-text);background-image:none;min-height:24px}';
// First pass (14:23) used a flex row: the ' | ' text node became an anonymous flex item and doubled the gap (56 px).
$first    = "\n" . $host . '{display:inline-flex;flex-wrap:wrap;align-items:center;gap:8px 28px;font-size:0}'
	. "\n" . $host . '>*{font-size:11px}'
	. "\n" . '@media(max-width:600px){' . $host . '{gap:8px 24px}' . $host . '>*{font-size:10px}}';
// Second pass (14:24), inline flow: the text node keeps zero size and only the button's margin separates the two links.
$second   = "\n" . $host . '{font-size:0}'
	. "\n" . $host . '>*{font-size:11px;vertical-align:baseline}'
	. "\n" . $host . '>.efeonce-cookie-preferences{margin-left:28px}'
	. "\n" . '@media(max-width:600px){' . $host . '>*{font-size:10px}' . $host . '>.efeonce-cookie-preferences{margin-left:24px}}';
// Third pass (14:37): the canvas hover without !important; the link kept its color because ohio-child global-fixes.css
// pins every footer link to rgba(255,255,255,.75) !important on all pages but Home.
$third    = $second
	. "\n" . $host . '>*{transition:color 200ms cubic-bezier(0.4,0,0.2,1)}'
	. "\n" . $host . '>a:hover,' . $host . '>.efeonce-cookie-preferences:hover{color:var(--eo-ft-accent);text-decoration:none;background-image:none;animation:none}';
// Current: the canvas hover — both links turn teal, without Ohio's animated underline on the link or the consent
// plugin's underline on the button. The colour carries !important to beat the legacy global fix (same as the ground).
$rules    = $second
	. "\n" . $host . '>*{transition:color 200ms cubic-bezier(0.4,0,0.2,1)}'
	. "\n" . $host . '>a:hover,' . $host . '>.efeonce-cookie-preferences:hover{color:var(--eo-ft-accent)!important;text-decoration:none;background-image:none;animation:none}';

$blocks  = get_option( 'widget_block' );
$content = (string) ( $blocks[34]['content'] ?? '' );
if ( 1 !== substr_count( $content, $anchor ) ) { WP_CLI::error( 'Anchor rule not found exactly once.' ); }
if ( false !== strpos( $content, $anchor . $rules ) ) { WP_CLI::error( 'Already applied.' ); }
$next = null;
foreach ( array( $third, $second, $first ) as $previous ) {
	$found = substr_count( $content, $anchor . $previous );
	if ( $found > 1 ) { WP_CLI::error( 'Earlier legal-link rules found more than once.' ); }
	if ( 1 === $found ) { $next = str_replace( $anchor . $previous, $anchor . $rules, $content ); break; }
}
if ( null === $next ) { $next = str_replace( $anchor, $anchor . $rules, $content ); }

$snapshot = '_gh_footer_v3_legal_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'block34' => $content ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }
$blocks[34]['content'] = $next;
update_option( 'widget_block', $blocks );
if ( ( get_option( 'widget_block' )[34]['content'] ?? '' ) !== $blocks[34]['content'] ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_legal_links_spaced', 'snapshot' => $snapshot, 'block34' => hash( 'sha256', $blocks[34]['content'] ) ), JSON_PRETTY_PRINT ) . PHP_EOL;
