<?php
/**
 * TASK-2048/2049 — the portfolio pages' switch and editorial options, in one guarded write:
 *   `enabled`: '0' (page 247116 keeps /portafolio/), 'preview' (only with ?eop_preview=<token>, noindex) or '1';
 *   `order`: slugs in display order (the rest follow); `tally`: the agency-wide figures of the index.
 * `"newToken": true` creates a preview token and prints the preview URL once (it is not stored anywhere else).
 * Prints the state before and after, the rollback input. Purges the Kinsta cache when the switch changes.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/set-portfolio-switch.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( (string) file_get_contents( $args[0] ), true );
if ( ! is_array( $in ) || ! class_exists( 'EOP_Render' ) ) { WP_CLI::error( 'eo-portfolio 0.4+ and a JSON object are required.' ); }

$before = array(
	'enabled' => (string) get_option( EOP_Render::OPTION, '0' ),
	'order'   => get_option( EOP_Render::ORDER, array() ),
	'tally'   => get_option( EOP_Render::TALLY, array() ),
);
if ( isset( $in['enabled'] ) ) {
	if ( ! in_array( (string) $in['enabled'], array( '0', 'preview', '1' ), true ) ) { WP_CLI::error( 'enabled must be 0, preview or 1.' ); }
	if ( '1' === (string) $in['enabled'] && ! EOP_Store::published() ) { WP_CLI::error( 'No published project: turning the pages on would leave /portafolio/ without its index.' ); }
	update_option( EOP_Render::OPTION, (string) $in['enabled'], true );
}
if ( isset( $in['order'] ) ) {
	if ( ! is_array( $in['order'] ) ) { WP_CLI::error( 'order must be a list of slugs.' ); }
	update_option( EOP_Render::ORDER, array_values( array_map( 'sanitize_title', $in['order'] ) ), false );
}
if ( isset( $in['tally'] ) ) {
	$keys = array( 'pieces', 'campaigns', 'brands' );
	if ( ! is_array( $in['tally'] ) || array_diff( array_keys( $in['tally'] ), $keys ) ) { WP_CLI::error( 'tally takes pieces, campaigns and brands.' ); }
	update_option( EOP_Render::TALLY, array_map( fn( $v ) => sanitize_text_field( (string) $v ), $in['tally'] ), false );
}
$preview = null;
if ( ! empty( $in['newToken'] ) ) {
	$token = wp_generate_password( 32, false, false );
	update_option( EOP_Render::TOKEN, $token, false );
	$preview = home_url( '/' . EOP_Store::base() . '/?eop_preview=' . $token );
}
$purge = $before['enabled'] !== (string) get_option( EOP_Render::OPTION, '0' ) || isset( $in['order'] ) || isset( $in['tally'] ) ? EOP_Cache::purge( '*', 0 ) : 'not-needed';
echo wp_json_encode( array(
	'before'  => $before,
	'after'   => array( 'enabled' => (string) get_option( EOP_Render::OPTION, '0' ), 'order' => get_option( EOP_Render::ORDER, array() ), 'tally' => get_option( EOP_Render::TALLY, array() ) ),
	'preview' => $preview,
	'purge'   => $purge,
), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT ) . PHP_EOL;
