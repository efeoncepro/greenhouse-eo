<?php
/**
 * Replaces the body of /servicios-contratar-hubspot/ (page 244079) with the HubSpot v2 modules (design of 2026-10-16).
 * Inputs: page-scoped custom CSS template (hubspot-v2-source/page-custom.css, __ID__ = page id) and the Growth Form JSON
 * { "formKey", "surface" } (hubspot-v2-source/form.json). Header and footer stay Ohio's.
 *
 * Before writing it stores one rollback option with the previous Elementor tree, document settings, every page_* /
 * _page_* meta and the featured image; then preflights every widget, saves through Document::save(), copies the Ohio
 * page contract of /servicios/agencia-de-medios/ (251981: full bleed, light header on dark hero, no sidebar) and reads
 * everything back. Refuses if the live tree changed since the hash passed in GH_EXPECT_HASH (when set).
 * Rollback: restore `_elementor_data` + settings via Document::save() and the metas from the printed snapshot option.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected: <page-custom.css> <form.json>.' ); }
$id = 244079; $ohio_source = 251981;
if ( get_post_field( 'post_name', $id ) !== 'servicios-contratar-hubspot' || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Page identity drift.' ); }
if ( get_post_field( 'post_name', $ohio_source ) !== 'agencia-de-medios' ) { WP_CLI::error( 'Ohio source identity drift.' ); }
$form         = json_decode( (string) file_get_contents( $args[1] ), true );
$form_key     = (string) ( $form['formKey'] ?? '' );
$form_surface = (string) ( $form['surface'] ?? '' );
if ( ! preg_match( '/^[0-9a-f-]{36}$/', $form_key ) || ! preg_match( '/^fhsf-[a-z0-9-]+$/', $form_surface ) ) { WP_CLI::error( 'Invalid form key or surface.' ); }
$template = trim( (string) file_get_contents( $args[0] ) );
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$current = (string) get_post_meta( $id, '_elementor_data', true );
$expect  = getenv( 'GH_EXPECT_HASH' );
if ( $expect && ! hash_equals( $expect, hash( 'sha256', $current ) ) ) { WP_CLI::error( 'Live tree changed since inspection.' ); }

$modules = array(
	'hero' => '01 · Hero', 'marquesina' => '02 · Marquesina', 'numeros' => '03 · Números y clientes', 'punto' => '04 · ¿En qué punto estás?',
	'diferencia' => '05 · La diferencia', 'resultados' => '06 · Tres capas y cuatro resultados', 'riesgo' => '07 · Sin riesgo',
	'agentes' => '08 · Agentes', 'metodo' => '09 · Cómo trabajamos', 'seguridad' => '10 · Seguridad y privacidad', 'caso' => '11 · Caso ANAM',
	'partner' => '12 · Partner Gold', 'preguntas' => '13 · Preguntas frecuentes', 'agenda' => '14 · Agenda y formulario',
);
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_hubspot_v2_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_hubspot_v2_' . $module ); }
	try {
		$widgets[ 'greenhouse_hubspot_v2_' . $module ]->get_controls();
		$probe = EO_Hubspot_V2_Landing_Base_Widget::render_module( $module, array( 'form_key' => $form_key, 'form_surface' => $form_surface ), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable.' ); }
$settings = $document->get_settings();
$all      = get_post_meta( $id );
$ohio     = array_filter( array_keys( get_post_meta( $ohio_source ) ), fn( $k ) => 0 === strpos( $k, 'page_' ) || 0 === strpos( $k, '_page_' ) );
$snapshot = array( 'elementor_data' => $current, 'settings' => $settings, 'thumbnail' => get_post_meta( $id, '_thumbnail_id', true ), 'metas' => array() );
foreach ( array_unique( array_merge( $ohio, array_filter( array_keys( $all ), fn( $k ) => 0 === strpos( $k, 'page_' ) || 0 === strpos( $k, '_page_' ) ) ) ) as $k ) {
	$snapshot['metas'][ $k ] = metadata_exists( 'post', $id, $k ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $k, true ) ) : array( 'exists' => false );
}
$name = '_gh_hubspot_v2_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 249582, 251279, 251981 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $title ) {
	$widget_settings = array( '_title' => $title, '_margin' => $zero, '_padding' => $zero );
	if ( 'agenda' === $module ) { $widget_settings += array( 'form_key' => $form_key, 'form_surface' => $form_surface ); }
	$elements[] = array(
		'id' => substr( md5( 'hsv2-section-' . $module ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero, 'css_classes' => 'gh-hsv2-section clb__dark_section',
		),
		'elements' => array( array( 'id' => substr( md5( 'hsv2-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'greenhouse_hubspot_v2_' . $module, 'settings' => $widget_settings, 'elements' => array() ) ),
	);
}
$settings['hide_title'] = 'yes';
$settings['custom_css'] = str_replace( '__ID__', (string) $id, $template );
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed. Snapshot: ' . $name ); }

$source_metas = get_post_meta( $ohio_source );
foreach ( $ohio as $k ) { update_post_meta( $id, $k, maybe_unserialize( $source_metas[ $k ][0] ) ); }

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document. Snapshot: ' . $name ); }
foreach ( array_keys( $modules ) as $index => $module ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_hubspot_v2_' . $module ) { WP_CLI::error( 'Widget readback failed. Snapshot: ' . $name ); }
}
foreach ( $ohio as $k ) { if ( get_post_meta( $id, $k, true ) != maybe_unserialize( $source_metas[ $k ][0] ) ) { WP_CLI::error( 'Ohio meta readback failed: ' . $k . '. Snapshot: ' . $name ); } }
foreach ( $protected as $post_id => $hash ) { if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id ); } }
foreach ( $shell as $key => $value ) { if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); } }

clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'republished_verified', 'postId' => $id, 'url' => get_permalink( $id ), 'previousHash' => hash( 'sha256', $current ), 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'widgets' => count( $actual ), 'ohioMetas' => count( $ohio ), 'snapshot' => $name ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
