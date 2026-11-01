<?php
/**
 * Retires the published Ohio theme demo pages (homedemo*-elementor: imported theme samples, indexable and in the sitemap;
 * operator request 2026-10-29: «Limpiemos eso»). Each listed page goes to the trash (reversible, never a permanent delete);
 * the published ones also get a governed Yoast Premium 301 to the front page. Input JSON: {"dryRun": true|false}.
 * Guards: exact id + title + status per page, none is the front page or in a menu, and no origin already redirects.
 * Rollback: wp_untrash_post( <id> ) and restore its status; delete the redirect of each origin through
 * WPSEO_Redirect_Manager::delete_redirects().
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in    = json_decode( (string) file_get_contents( $args[0] ), true );
$front = (int) get_option( 'page_on_front' );
if ( 251731 !== $front ) { WP_CLI::error( 'Front page drift: ' . $front ); }
// id => [title, status, slug of the published URL or '' for drafts/private]
$pages = array(
	21460  => array( 'Demo 1: Creative Agency', 'publish', 'homedemo1-elementor' ),
	21466  => array( 'Demo 8: Creative Agency', 'publish', 'homedemo8-elementor' ),
	20305  => array( 'Demo 17: Showcase Slider', 'publish', 'homedemo17-elementor' ),
	18734  => array( 'Demo 27: Corporate', 'publish', 'homedemo27-elementor' ),
	225984 => array( 'Demo 35: Blog Magazine', 'publish', 'homedemo35-elementor' ),
);
if ( ! class_exists( 'WPSEO_Redirect_Manager' ) || ! class_exists( 'WPSEO_Redirect' ) ) { WP_CLI::error( 'Yoast Premium redirect API not available.' ); }
$manager = new WPSEO_Redirect_Manager();
$plan    = array();
foreach ( $pages as $id => $expect ) {
	$post = get_post( $id );
	if ( ! $post || 'page' !== $post->post_type || $post->post_title !== $expect[0] || $post->post_status !== $expect[1] || $id === $front ) { WP_CLI::error( 'Drift on page ' . $id ); }
	if ( $expect[2] && $post->post_name !== $expect[2] ) { WP_CLI::error( 'Slug drift on page ' . $id . ': ' . $post->post_name ); }
	$refs = get_posts( array( 'post_type' => 'nav_menu_item', 'numberposts' => -1, 'meta_key' => '_menu_item_object_id', 'meta_value' => (string) $id, 'fields' => 'ids' ) );
	if ( $refs ) { WP_CLI::error( 'Page ' . $id . ' is in a menu.' ); }
	if ( $expect[2] ) {
		foreach ( array( $expect[2], '/' . $expect[2], $expect[2] . '/', '/' . $expect[2] . '/' ) as $variant ) { if ( $manager->get_redirect( $variant ) ) { WP_CLI::error( 'Origin already redirects: ' . $variant ); } }
	}
	$plan[] = array( 'id' => $id, 'title' => $expect[0], 'status' => $expect[1], 'redirect' => $expect[2] ? '/' . $expect[2] . '/ → /' : '' );
}
if ( ! empty( $in['dryRun'] ) ) { echo wp_json_encode( array( 'dryRun' => true, 'plan' => $plan ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL; return; }

$done = array();
foreach ( $pages as $id => $expect ) {
	if ( $expect[2] ) {
		if ( ! $manager->create_redirect( new WPSEO_Redirect( $expect[2], '/', 301, 'plain' ) ) ) { WP_CLI::error( 'Redirect failed for ' . $expect[2] . '. Done so far: ' . wp_json_encode( $done ) ); }
		$stored = $manager->get_redirect( $expect[2] );
		if ( ! ( $stored instanceof WPSEO_Redirect ) || '' !== trim( $stored->get_target(), '/' ) || 301 !== (int) $stored->get_type() ) { WP_CLI::error( 'Redirect readback mismatch for ' . $expect[2] . '. Done so far: ' . wp_json_encode( $done ) ); }
	}
	if ( ! wp_trash_post( $id ) || 'trash' !== get_post_status( $id ) ) { WP_CLI::error( 'Trash failed for ' . $id . '. Done so far: ' . wp_json_encode( $done ) ); }
	if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
	$done[] = array( 'id' => $id, 'statusBefore' => $expect[1], 'redirect' => $expect[2] ? '/' . $expect[2] . '/ → /' : '' );
}
if ( 'publish' !== get_post_status( $front ) ) { WP_CLI::error( 'Front page not published after retirement.' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'retired', 'pages' => $done ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
