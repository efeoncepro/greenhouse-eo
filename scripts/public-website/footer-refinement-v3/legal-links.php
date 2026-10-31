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
// Inline flow instead: the text node keeps zero size and only the button's margin separates the two links.
$rules    = "\n" . $host . '{font-size:0}'
	. "\n" . $host . '>*{font-size:11px;vertical-align:baseline}'
	. "\n" . $host . '>.efeonce-cookie-preferences{margin-left:28px}'
	. "\n" . '@media(max-width:600px){' . $host . '>*{font-size:10px}' . $host . '>.efeonce-cookie-preferences{margin-left:24px}}';

$blocks  = get_option( 'widget_block' );
$content = (string) ( $blocks[34]['content'] ?? '' );
if ( 1 !== substr_count( $content, $anchor ) ) { WP_CLI::error( 'Anchor rule not found exactly once.' ); }
if ( false !== strpos( $content, $anchor . $rules ) ) { WP_CLI::error( 'Already applied.' ); }
$found_first = substr_count( $content, $anchor . $first );
if ( $found_first > 1 ) { WP_CLI::error( 'First-pass rules found more than once.' ); }
$next = 1 === $found_first ? str_replace( $anchor . $first, $anchor . $rules, $content ) : str_replace( $anchor, $anchor . $rules, $content );

$snapshot = '_gh_footer_v3_legal_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'block34' => $content ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }
$blocks[34]['content'] = $next;
update_option( 'widget_block', $blocks );
if ( ( get_option( 'widget_block' )[34]['content'] ?? '' ) !== $blocks[34]['content'] ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_legal_links_spaced', 'snapshot' => $snapshot, 'block34' => hash( 'sha256', $blocks[34]['content'] ) ), JSON_PRETTY_PRINT ) . PHP_EOL;
