<?php
/**
 * Retires the legacy Performance page (242862, /servicio-gestion-campanas-publicitarias/) in favour of
 * /servicios/performance-marketing/ (TASK-1865), in one guarded window:
 *   1. a plain 301 in Yoast Premium (legacy → new), after repointing any redirect that targets the legacy URL;
 *   2. the legacy page goes private (kept, recoverable);
 *   3. the primary-menu item 242915 points to the new page (only its object id changes; label, parent, order kept).
 * Input: the new page id. Snapshots are stored in an option printed at the end.
 * Rollback: delete the created redirect (WPSEO_Redirect_Manager::delete_redirects), restore the repointed targets,
 * set 242862 back to publish, restore _menu_item_object_id of 242915 from the snapshot, purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the new page id.' ); }
$new = (int) ( is_numeric( $args[0] ) ? $args[0] : trim( (string) file_get_contents( $args[0] ) ) ); $legacy = 242862; $item = 242915; $menu = 61;
$legacy_path = '/servicio-gestion-campanas-publicitarias/';
$new_path    = '/servicios/performance-marketing/';

if ( get_post_field( 'post_name', $new ) !== 'performance-marketing' || get_post_status( $new ) !== 'publish' || (int) get_post_field( 'post_parent', $new ) !== 251077 ) { WP_CLI::error( 'New page identity drift.' ); }
if ( get_post_field( 'post_name', $legacy ) !== 'servicio-gestion-campanas-publicitarias' ) { WP_CLI::error( 'Legacy identity drift.' ); }
if ( get_post_type( $item ) !== 'nav_menu_item' || (int) get_post_meta( $item, '_menu_item_object_id', true ) !== $legacy ) { WP_CLI::error( 'Menu item drift.' ); }
if ( ( get_nav_menu_locations()['primary'] ?? 0 ) !== $menu ) { WP_CLI::error( 'Primary menu drift.' ); }
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API unavailable.' ); }

$read_menu = function () use ( $menu ) {
	$out = array();
	foreach ( wp_get_nav_menu_items( $menu, array( 'post_status' => 'any' ) ) as $it ) {
		$out[ $it->ID ] = array( $it->title, (int) $it->menu_item_parent, (int) get_post_field( 'menu_order', $it->ID ), get_post_status( $it->ID ), (int) get_post_meta( $it->ID, '_menu_item_object_id', true ) );
	}
	return $out;
};

$manager  = new WPSEO_Redirect_Manager();
$origins  = array( trim( $legacy_path, '/' ), trim( $legacy_path, '/' ) . '/' );
foreach ( $origins as $origin ) { if ( $manager->get_redirect( $origin ) ) { WP_CLI::error( 'Redirect origin already exists: ' . $origin ); } }

// Chains: any redirect that lands on the legacy URL is repointed straight to the new page.
$repoint = array();
foreach ( $manager->get_all_redirects() as $redirect ) {
	if ( trim( (string) $redirect->get_target(), '/' ) === trim( $legacy_path, '/' ) || rtrim( (string) $redirect->get_target(), '/' ) === rtrim( home_url( $legacy_path ), '/' ) ) {
		$repoint[] = array( 'origin' => $redirect->get_origin(), 'target' => $redirect->get_target(), 'type' => (int) $redirect->get_type(), 'format' => $redirect->get_format() );
	}
}

$snapshot = array(
	'menu'          => $read_menu(),
	'itemObjectId'  => $legacy,
	'legacyStatus'  => get_post_status( $legacy ),
	'repointed'     => $repoint,
	'createdOrigin' => $origins[0],
);
$name = '_gh_performance_migration_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }

foreach ( $repoint as $r ) {
	$old = new WPSEO_Redirect( $r['origin'], $r['target'], $r['type'], $r['format'] );
	$upd = new WPSEO_Redirect( $r['origin'], $new_path, $r['type'], $r['format'] );
	if ( ! $manager->update_redirect( $old, $upd ) ) { WP_CLI::error( 'Chain repoint failed: ' . $r['origin'] . '. Snapshot: ' . $name ); }
}

if ( ! $manager->create_redirect( new WPSEO_Redirect( $origins[0], $new_path, 301, 'plain' ) ) ) { WP_CLI::error( 'Redirect creation failed. Snapshot: ' . $name ); }
$stored = $manager->get_redirect( $origins[0] );
if ( ! $stored instanceof WPSEO_Redirect || trim( $stored->get_target(), '/' ) !== trim( $new_path, '/' ) || 301 !== (int) $stored->get_type() || 'plain' !== $stored->get_format() ) { WP_CLI::error( 'Redirect readback failed. Snapshot: ' . $name ); }

$private = wp_update_post( array( 'ID' => $legacy, 'post_status' => 'private' ), true );
if ( is_wp_error( $private ) || get_post_status( $legacy ) !== 'private' ) { WP_CLI::error( 'Legacy status change failed. Snapshot: ' . $name ); }

update_post_meta( $item, '_menu_item_object_id', (string) $new );
$after  = $read_menu();
$before = $snapshot['menu'];
foreach ( $before as $id => $row ) {
	$expected = $row;
	if ( $id === $item ) { $expected[4] = $new; }
	if ( ( $after[ $id ] ?? null ) !== $expected ) { WP_CLI::error( 'Menu changed beyond the target item: ' . $id . '. Snapshot: ' . $name ); }
}
if ( count( $after ) !== count( $before ) ) { WP_CLI::error( 'Menu size changed. Snapshot: ' . $name ); }

wp_cache_delete( 'last_changed', 'posts' );
clean_post_cache( $legacy );
clean_post_cache( $item );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $legacy, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'legacy_retired', 'redirect' => array( $origins[0], $new_path, 301 ), 'repointedChains' => count( $repoint ), 'legacyStatus' => get_post_status( $legacy ), 'menuItem' => array( $item, get_permalink( $new ) ), 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
