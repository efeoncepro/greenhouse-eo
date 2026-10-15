<?php
/**
 * Guarded Elementor cutover of /agencia-creativa-v2/ (page 251279) to the «Producción creativa a escala» modules,
 * compiled from the approved canvas artboard Escala.dc.html. Diagnóstico and cierre reuse the /agencia-creativa/ widgets.
 * Input: the page-scoped custom CSS (creativa-source/page-custom-v2.css). Header and footer stay Ohio's.
 * Rollback: restore the snapshot option printed below (elements + settings + metas) with Document::save.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the page custom CSS input.' ); }
$id        = 251279;
$expected  = '84804acccd2af869d0a45308640ee5ae7444f992c58915fc20bad6dbd65c85e4';
$thumbnail = '249740';
$current   = get_post_meta( $id, '_elementor_data', true );
if ( ! current_user_can( 'edit_post', $id ) || get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-creativa-v2' || ! hash_equals( $expected, hash( 'sha256', (string) $current ) ) ) {
	WP_CLI::error( 'Agencia Creativa v2 identity or content drift. Inspect before retry.' );
}
if ( (string) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { WP_CLI::error( 'Featured image drift. Inspect before retry.' ); }
$custom_css = trim( (string) file_get_contents( $args[0] ) );
if ( false === strpos( $custom_css, 'page-id-251279' ) || preg_match( '/<\/?(script|style)/i', $custom_css ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$modules = array(
	'escala-hero' => array( '01 · Hero · Creatividad a escala', 'dark' ), 'escala-problema' => array( '02 · El problema', 'light' ),
	'escala-motor' => array( '03 · Cómo trabajamos (motor)', 'dark' ), 'escala-cadena' => array( '04 · Cómo escalamos', 'light' ),
	'escala-metricas' => array( '05 · Qué medimos y cómo', 'dark' ), 'escala-logros' => array( '06 · Lo que logramos (Sky)', 'light' ),
	'escala-studio' => array( '07 · Creative Studio', 'dark' ), 'escala-campana' => array( '08 · Una campaña en cada mercado', 'light' ),
	'diagnostico' => array( '09 · Diagnóstico y formulario', 'dark' ), 'escala-faq' => array( '10 · Preguntas frecuentes', 'light' ),
	'cierre' => array( '11 · Cierre', 'dark' ),
);
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	$widget_name = 'greenhouse_creativa_' . str_replace( '-', '_', $module );
	if ( ! isset( $widgets[ $widget_name ] ) ) { WP_CLI::error( 'Widget absent: ' . $widget_name ); }
	// Preflight: Document::save writes page settings before elements, so a control error must abort before any write.
	try {
		$widgets[ $widget_name ]->get_controls();
		$probe = EO_Creativa_Landing_Base_Widget::render_module( $module, array(), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 249582 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$document = \Elementor\Plugin::$instance->documents->get( $id );
$snapshot = '_gh_creative_v2_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'post' => get_post( $id, ARRAY_A ), 'meta' => get_post_meta( $id ), 'elements' => $document->get_elements_data(), 'settings' => $document->get_settings(), 'protected' => $protected ), '', false ) ) {
	WP_CLI::error( 'Backup failed.' );
}

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $config ) {
	$elements[] = array(
		'id' => substr( md5( 'creative-v2-section-' . $module ), 0, 7 ),
		'elType' => 'container',
		'isInner' => false,
		'settings' => array(
			'_title' => $config[0],
			'content_width' => 'full',
			'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero,
			'margin' => $zero,
			'css_classes' => 'gh-creativa-section ' . ( 'dark' === $config[1] ? 'clb__dark_section' : 'clb__light_section' ),
		),
		'elements' => array(
			array(
				'id' => substr( md5( 'creative-v2-widget-' . $module ), 0, 7 ),
				'elType' => 'widget',
				'widgetType' => 'greenhouse_creativa_' . str_replace( '-', '_', $module ),
				'settings' => array( '_title' => $config[0], '_margin' => $zero, '_padding' => $zero ),
				'elements' => array(),
			),
		),
	);
}
$settings               = $document->get_settings();
$settings['hide_title'] = 'yes';
$settings['custom_css'] = $custom_css;
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed. Snapshot: ' . $snapshot ); }

// Ohio page contract shared with Home and the v2 satellite: no headline/breadcrumbs, full bleed, light header on dark hero.
$meta = array(
	'page_add_wrapper' => '0',
	'page_add_top_padding' => '0',
	'page_full_width_margins_size' => '0px',
	'page_breadcrumbs_visibility' => '0',
	'page_header_title_visibility' => '0',
	'page_header_logo_style' => 'light_variant',
	'page_header_menu_style_settings' => 'custom',
	'page_header_menu_text_typo' => '{"color":"rgba(255,255,255,0.78)"}',
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
clean_post_cache( $id );

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document. Snapshot: ' . $snapshot ); }
foreach ( array_keys( $modules ) as $index => $module ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_creativa_' . str_replace( '-', '_', $module ) ) { WP_CLI::error( 'Widget readback failed. Snapshot: ' . $snapshot ); }
}
foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== (string) $value ) { WP_CLI::error( 'Metadata readback failed: ' . $key . '. Snapshot: ' . $snapshot ); }
}
if ( (string) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) {
	update_post_meta( $id, '_thumbnail_id', $thumbnail );
	WP_CLI::warning( 'Featured image drifted during save and was restored to ' . $thumbnail . '.' );
}
foreach ( $protected as $post_id => $hash ) {
	if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id ); }
}
foreach ( $shell as $key => $value ) {
	if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); }
}
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode(
	array(
		'status' => 'published_verified',
		'postId' => $id,
		'url' => get_permalink( $id ),
		'snapshot' => $snapshot,
		'previousHash' => $expected,
		'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ),
		'widgets' => count( $actual ),
		'thumbnail' => get_post_meta( $id, '_thumbnail_id', true ),
		'protectedUnchanged' => true,
		'globalChromePreserved' => true,
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
) . PHP_EOL;
