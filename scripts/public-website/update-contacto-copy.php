<?php
/** Guarded, copy-only Elementor update for Contacto. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$id = 20729;
$expected = 'ecff03ee3a92f3b594a82008553aa8f4a97462e9d3a16c2a43c7c85b0fd3d7d7';
$raw = get_post_meta( $id, '_elementor_data', true );
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
$changes = array(
	'greenhouse_contact_hero' => array(
		'body' => 'Cuéntanos qué necesitas. Te orientamos y dirigimos tu mensaje al equipo adecuado.',
		'mobile_body' => 'Cuéntanos qué necesitas. Nexa te ayuda a dirigir tu mensaje al equipo adecuado.',
	),
	'greenhouse_contact_form' => array(
		'heading' => '¿Cómo podemos ayudarte?',
		'intro' => 'Elige un motivo y cuéntanos lo esencial. Dirigiremos tu mensaje al equipo adecuado.',
	),
	'greenhouse_contact_meeting_band' => array(
		'title' => 'Conversemos sobre tu próximo desafío',
		'body' => 'Elige un horario para hablar de tu proyecto, idea o desafío con nuestro equipo.',
	),
);
$seen = array();
$walk = function ( &$nodes ) use ( &$walk, &$changes, &$seen ) {
	foreach ( $nodes as &$node ) {
		$type = $node['widgetType'] ?? '';
		if ( isset( $changes[ $type ] ) ) {
			if ( isset( $seen[ $type ] ) ) { WP_CLI::error( 'Duplicate target widget: ' . $type ); }
			$node['settings'] = array_merge( $node['settings'] ?? array(), $changes[ $type ] );
			$seen[ $type ] = true;
		}
		if ( ! empty( $node['elements'] ) ) { $walk( $node['elements'] ); }
	}
};
$walk( $elements );
foreach ( array_keys( $changes ) as $type ) {
	if ( empty( $seen[ $type ] ) ) { WP_CLI::error( 'Target widget absent: ' . $type ); }
}

$home = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $key ) {
	$shell[ $key ] = get_option( $key );
}
$snapshot = '_gh_contacto_before_copy_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array(
	'post' => get_post( $id, ARRAY_A ),
	'meta' => get_post_meta( $id ),
	'elements' => $document->get_elements_data(),
	'settings' => $settings,
), '', false ) ) {
	WP_CLI::error( 'Backup failed.' );
}

if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) {
	WP_CLI::error( 'Elementor save failed. Snapshot: ' . $snapshot );
}

$description = 'Cuéntanos qué necesitas o agenda una reunión con Efeonce. Dirigiremos tu mensaje al equipo adecuado.';
foreach ( array(
	'_yoast_wpseo_metadesc',
	'_yoast_wpseo_opengraph-description',
	'_yoast_wpseo_twitter-description',
) as $key ) {
	update_post_meta( $id, $key, $description );
}
if ( function_exists( 'YoastSEO' ) ) {
	YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' );
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
	'status' => 'copy_updated_verified',
	'postId' => $id,
	'snapshot' => $snapshot,
	'hash' => hash( 'sha256', get_post_meta( $id, '_elementor_data', true ) ),
	'widgetsUpdated' => array_keys( $seen ),
	'globalChromePreserved' => true,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
