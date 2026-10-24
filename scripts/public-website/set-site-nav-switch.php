<?php
/**
 * Guarded switch of the global site navigation (TASK-2042): sets `eo_site_nav_enabled` (`off` | `pilot` | `on`) and the
 * pilot page list, then purges every cache, because the menu lives in the HTML of every page.
 * Refuses to turn the menu on unless the plugin is active, the adapter is loaded and a published document exists.
 * Input: one JSON file, {"mode": "on"} or {"mode": "pilot", "pilot": [123, 456]} or {"mode": "off"}.
 * Rollback: run it again with {"mode": "off"}; the result prints the previous values.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/set-site-nav-switch.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$input = json_decode( file_get_contents( $args[0] ), true );
$mode  = $input['mode'] ?? '';
if ( ! in_array( $mode, array( 'off', 'pilot', 'on' ), true ) ) { WP_CLI::error( 'mode must be off, pilot or on.' ); }
$pilot = array_values( array_filter( array_map( 'absint', (array) ( $input['pilot'] ?? array() ) ) ) );

if ( 'off' !== $mode ) {
	require_once ABSPATH . 'wp-admin/includes/plugin.php';
	if ( ! is_plugin_active( 'eo-site-nav/eo-site-nav.php' ) ) { WP_CLI::error( 'The EO Navegación plugin is not active.' ); }
	if ( ! function_exists( 'eo_site_nav_print_header' ) ) { WP_CLI::error( 'The ohio-child adapter is not loaded.' ); }
	if ( ! EOSN_Store::document( EOSN_Store::default_site() ) ) { WP_CLI::error( 'No published navigation document.' ); }
	if ( 'pilot' === $mode ) {
		if ( ! $pilot ) { WP_CLI::error( 'pilot needs at least one page ID.' ); }
		foreach ( $pilot as $id ) {
			if ( 'publish' !== get_post_status( $id ) ) { WP_CLI::error( 'Pilot page is not published: ' . $id ); }
		}
	}
}

$previous = array( 'mode' => get_option( 'eo_site_nav_enabled', '(absent)' ), 'pilot' => get_option( 'eo_site_nav_pilot_pages', array() ) );
update_option( 'eo_site_nav_enabled', $mode );
if ( 'pilot' === $mode ) { update_option( 'eo_site_nav_pilot_pages', $pilot ); }
$purge = class_exists( 'EOSN_Cache' ) ? EOSN_Cache::purge( EOSN_Store::default_site(), 0 ) : 'unavailable';
if ( 'unavailable' === $purge ) { WP_CLI::warning( 'No PHP purge available: run `kinsta cache purge --all`.' ); }

echo wp_json_encode(
	array(
		'status'   => 'site_nav_switch_set',
		'mode'     => get_option( 'eo_site_nav_enabled' ),
		'pilot'    => get_option( 'eo_site_nav_pilot_pages' ),
		'previous' => $previous,
		'purge'    => $purge,
		'at'       => gmdate( 'c' ),
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES
) . PHP_EOL;
