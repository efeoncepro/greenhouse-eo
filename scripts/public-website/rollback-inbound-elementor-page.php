<?php
/**
 * Rollback of the Inbound Marketing redesign (2026-10-18) on page 242601. Input: a JSON file
 * { "snapshot": "_gh_inbound_v2_before_<UTC>", "seoSnapshot": "_gh_inbound_seo_before_<UTC>" } (both printed by the
 * publisher and the SEO configurator). Restores the previous Elementor data/settings, featured image, Ohio page_* metas
 * and Yoast metas; metas that did not exist before are deleted. The new attachment (OG) is left in the library.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected: <rollback.json>.' ); }
$spec = json_decode( (string) file_get_contents( $args[0] ), true );
$id   = 242601;
if ( get_post_field( 'post_name', $id ) !== 'agencia-inbound-marketing' ) { WP_CLI::error( 'Target page drift.' ); }
$before = json_decode( (string) get_post_meta( $id, (string) ( $spec['snapshot'] ?? '' ), true ), true );
if ( ! is_array( $before ) || empty( $before['_elementor_data'] ) ) { WP_CLI::error( 'Snapshot missing or empty.' ); }
foreach ( get_post_meta( $id ) as $key => $values ) {
	if ( 0 === strpos( $key, 'page_' ) && ! array_key_exists( $key, $before ) ) { delete_post_meta( $id, $key ); }
}
foreach ( $before as $key => $value ) {
	if ( 'post_title' === $key ) { continue; }
	update_post_meta( $id, $key, wp_slash( maybe_unserialize( $value ) ) );
}
if ( ! array_key_exists( '_thumbnail_id', $before ) ) { delete_post_meta( $id, '_thumbnail_id' ); }
$seo = get_option( (string) ( $spec['seoSnapshot'] ?? '' ) );
if ( is_array( $seo ) ) {
	foreach ( $seo as $key => $state ) {
		if ( array_key_exists( $key, $before ) ) { continue; }
		if ( ! empty( $state['exists'] ) ) { update_post_meta( $id, $key, $state['value'] ); } else { delete_post_meta( $id, $key ); }
	}
}
clean_post_cache( $id );
if ( class_exists( '\Elementor\Plugin' ) ) { \Elementor\Plugin::$instance->files_manager->clear_cache(); }
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'rolled_back', 'postId' => $id, 'dataSha' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ) ) ) . PHP_EOL;
