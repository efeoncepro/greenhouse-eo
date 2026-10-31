<?php
/**
 * Guarded structural update for Contacto v2 (2026-10-31): the meeting band becomes the page closing
 * («¿Lo conversamos?»), so its container moves after the FAQ. Copy and widget settings are untouched.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$id        = 20729;
$expected  = '64d95ff1d8786648a8c2ee1c4522b35e9e909ee7bafbf905236655aa47c956f0';
$container = '48aab3e';
$raw       = get_post_meta( $id, '_elementor_data', true );
if (
	! current_user_can( 'edit_post', $id ) ||
	'publish' !== get_post_status( $id ) ||
	'contacto' !== get_post_field( 'post_name', $id ) ||
	! hash_equals( $expected, hash( 'sha256', $raw ) )
) {
	WP_CLI::error( 'Contacto identity or content drift. Inspect before retry.' );
}

$document = \Elementor\Plugin::$instance->documents->get( $id );
$elements = $document->get_elements_data();
$settings = $document->get_settings();

$index = null;
foreach ( $elements as $i => $node ) {
	if ( ( $node['id'] ?? '' ) === $container ) { $index = $i; }
}
if ( null === $index ) { WP_CLI::error( 'Closing container absent: ' . $container ); }
$band = $elements[ $index ];
if ( 'greenhouse_contact_meeting_band' !== ( $band['elements'][0]['widgetType'] ?? '' ) ) {
	WP_CLI::error( 'Container ' . $container . ' does not hold the meeting band.' );
}
array_splice( $elements, $index, 1 );
$elements[] = $band;

$home           = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );
$shell          = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $key ) {
	$shell[ $key ] = get_option( $key );
}
$snapshot = '_gh_contacto_before_v2_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array(
	'post'     => get_post( $id, ARRAY_A ),
	'meta'     => get_post_meta( $id ),
	'elements' => $document->get_elements_data(),
	'settings' => $settings,
), '', false ) ) {
	WP_CLI::error( 'Backup failed.' );
}

if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) {
	WP_CLI::error( 'Elementor save failed. Snapshot: ' . $snapshot );
}

$after = json_decode( get_post_meta( $id, '_elementor_data', true ), true );
$order = array_map( function ( $node ) { return $node['elements'][0]['widgetType'] ?? ''; }, $after );
if ( 'greenhouse_contact_meeting_band' !== end( $order ) || 5 !== count( $order ) ) {
	WP_CLI::error( 'Readback order unexpected: ' . implode( ',', $order ) . '. Snapshot: ' . $snapshot );
}
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) {
	WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot );
}
foreach ( $shell as $key => $value ) {
	if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); }
}

\Elementor\Plugin::$instance->files_manager->clear_cache();
clean_post_cache( $id );
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array(
	'status'                => 'closing_reordered_verified',
	'postId'                => $id,
	'snapshot'              => $snapshot,
	'order'                 => $order,
	'hash'                  => hash( 'sha256', get_post_meta( $id, '_elementor_data', true ) ),
	'globalChromePreserved' => true,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
