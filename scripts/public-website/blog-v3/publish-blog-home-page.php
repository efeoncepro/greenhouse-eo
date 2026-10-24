<?php
/**
 * TASK-2051 — Cutover of /blog/ (#18456) to the blog home v3. LIVE WRITE: run only with explicit operator approval,
 * after the eo-blog-home plugin is installed and active, and in the same window as the ohio-child theme package that
 * empties EO_SITE_NAV_EXCLUDED_PAGES (otherwise the old page gets the canonical header over Ohio's sidebar header).
 *
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/blog-v3/publish-blog-home-page.php --wp-user 12
 *   pnpm public-website:wpcli -- --eval-file ./scripts/public-website/blog-v3/publish-blog-home-page.php --wp-user 12 rollback <snapshot option>
 *
 * Apply: snapshot (Elementor data and settings + every Ohio meta it changes) into an option, then
 *   - Elementor body = one full-width container with the [eo_blog_home] shortcode, saved through Document::save;
 *   - Ohio: no header spacer (dark hero → canonical bar in its `top` state), header style back to the site default
 *     (drops the sidebar header style6), no side margins, no page custom CSS (its `.card` rules would reach the
 *     template); switcher and social bar stay hidden as today.
 * Readback, cache flush and Kinsta purge. Rollback restores the snapshot exactly.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$id = 18456;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'blog' ) { WP_CLI::error( 'Page identity drift.' ); }
if ( ! class_exists( 'EOBH_Front' ) ) { WP_CLI::error( 'eo-blog-home is not active.' ); }

$meta = array(
	'page_header_add_cap'          => '0',
	'page_header_menu_style'       => 'inherit',
	'page_full_width_margins_size' => '0px',
	'page_custom_css'              => '',
	'page_dark_mode_switcher'      => '0',
	'page_social_links_visibility' => '0',
	'page_sidebar_position'        => 'without',
	'page_add_top_padding'         => '0',
	'page_add_wrapper'             => '0',
	'page_breadcrumbs_visibility'  => '0',
	'page_header_title_visibility' => '0',
);
$keys = array_merge( array_keys( $meta ), array( '_elementor_data', '_elementor_page_settings', '_elementor_edit_mode' ) );

$restore = function ( array $snapshot ) use ( $id ) {
	foreach ( $snapshot as $key => $s ) {
		if ( $s['exists'] ) { update_post_meta( $id, $key, wp_slash( $s['value'] ) ); } else { delete_post_meta( $id, $key ); }
	}
	clean_post_cache( $id );
	if ( class_exists( '\Elementor\Plugin' ) ) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
};

if ( isset( $args[0] ) && 'rollback' === $args[0] ) {
	$snapshot = get_option( $args[1] ?? '' );
	if ( ! is_array( $snapshot ) ) { WP_CLI::error( 'Snapshot option not found.' ); }
	$restore( $snapshot );
	WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
	WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
	WP_CLI::success( 'Restored from ' . $args[1] );
	return;
}

$snapshot = array();
foreach ( $keys as $key ) {
	$snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false );
}
$name = '_gh_blog_home_v3_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }

$elements = array(
	array(
		'id'       => 'eobhroot',
		'elType'   => 'container',
		'settings' => array( 'content_width' => 'full_width', 'padding' => array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true ) ),
		'elements' => array(
			array( 'id' => 'eobhcode', 'elType' => 'widget', 'widgetType' => 'shortcode', 'settings' => array( 'shortcode' => '[eo_blog_home]' ), 'elements' => array() ),
		),
		'isInner'  => false,
	),
);

$document = \Elementor\Plugin::$instance->documents->get( $id );
if ( ! $document ) { WP_CLI::error( 'Elementor document not found. Snapshot: ' . $name ); }
$document->save( array( 'elements' => $elements, 'settings' => $document->get_settings() ) );
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }

clean_post_cache( $id );
$saved = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( '[eo_blog_home]' !== ( $saved[0]['elements'][0]['settings']['shortcode'] ?? null ) ) { $restore( $snapshot ); WP_CLI::error( 'Readback failed (Elementor body); restored. Snapshot: ' . $name ); }
foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== $value ) { $restore( $snapshot ); WP_CLI::error( 'Readback failed: ' . $key . '; restored. Snapshot: ' . $name ); }
}

\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'blog_home_v3_published', 'page' => $id, 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES ) . PHP_EOL;
