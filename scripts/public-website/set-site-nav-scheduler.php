<?php
/**
 * Sets the menu's meeting scheduler (TASK-2042 Slice 3): option `eo_site_nav_scheduler` with the Growth CTA slug, its
 * WordPress surface and the surface embed key, read from a JSON input file so the key never appears in a command line
 * or in the output. The key comes from `.auth/site-nav-meeting-cta-surface.json`, written by Greenhouse
 * `scripts/growth/publish-site-nav-meeting-cta.ts`; re-running that script rotates the key, and this one must follow.
 * Input: {"cta": "site-nav-discovery-meeting", "surface": "csur-…", "key": "…"} or {"clear": true} to remove it (the
 * menu CTA then follows its fallback page). Purges the caches, because the launcher lives in the HTML of every page.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/set-site-nav-scheduler.php --input-file <json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$input = json_decode( file_get_contents( $args[0] ), true );
if ( ! is_array( $input ) ) { WP_CLI::error( 'Unreadable input.' ); }
if ( ! function_exists( 'eo_site_nav_scheduler' ) ) { WP_CLI::error( 'The ohio-child adapter is not loaded.' ); }
$before = (bool) eo_site_nav_scheduler();
if ( ! empty( $input['clear'] ) ) {
	delete_option( 'eo_site_nav_scheduler' );
} else {
	$value = array( 'cta' => (string) ( $input['cta'] ?? '' ), 'surface' => (string) ( $input['surface'] ?? '' ), 'key' => (string) ( $input['key'] ?? '' ) );
	update_option( 'eo_site_nav_scheduler', $value, true );
	if ( ! eo_site_nav_scheduler() ) {
		update_option( 'eo_site_nav_scheduler', array(), true );
		WP_CLI::error( 'The scheduler values are not valid (slug, csur-… surface, key); the option was emptied.' );
	}
}
$purge = class_exists( 'EOSN_Cache' ) ? EOSN_Cache::purge( EOSN_Store::default_site(), 0 ) : 'unavailable';
$now   = eo_site_nav_scheduler();
echo wp_json_encode( array( 'status' => 'site_nav_scheduler_set', 'before' => $before, 'set' => (bool) $now, 'cta' => $now['cta'] ?? null, 'surface' => $now['surface'] ?? null, 'purge' => $purge ) ) . PHP_EOL;
