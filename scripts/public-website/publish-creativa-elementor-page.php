<?php
/**
 * Guarded Elementor cutover of /agencia-creativa/ (page 249582) to the Agencia Creativa modules.
 * Input: the page-scoped custom CSS (creativa-source/page-custom.css). Header and footer stay Ohio's.
 * Rollback: restore the snapshot option printed below (elements + settings + metas) with Document::save.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the page custom CSS input.' ); }
$id        = 249582;
$expected  = 'cdc078d25a3ba71df65e3597ba8354f3aa3b826e061ebdf5dd61e31f90c01c90';
$thumbnail = '249672';
$current   = get_post_meta( $id, '_elementor_data', true );
if ( ! current_user_can( 'edit_post', $id ) || get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-creativa' || ! hash_equals( $expected, hash( 'sha256', (string) $current ) ) ) {
	WP_CLI::error( 'Agencia Creativa identity or content drift. Inspect before retry.' );
}
if ( (string) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { WP_CLI::error( 'Featured image drift. Inspect before retry.' ); }
$custom_css = trim( (string) file_get_contents( $args[0] ) );
if ( false === strpos( $custom_css, 'page-id-249582' ) || preg_match( '/<\/?(script|style)/i', $custom_css ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$modules = array(
	'hero' => array( '01 · Hero', 'dark' ), 'portafolio' => array( '02 · Portafolio', 'light' ), 'rutas' => array( '03 · Rutas', 'dark' ),
	'formatos' => array( '04 · Formatos', 'light' ), 'marca' => array( '05 · Sistema de marca', 'dark' ), 'produccion' => array( '06 · Producción', 'light' ),
	'ia' => array( '07 · IA', 'dark' ), 'equipo' => array( '08 · Equipo y capacidades', 'light' ), 'studio' => array( '09 · Creative Studio', 'dark' ),
	'compra' => array( '10 · Cómo se compra', 'light' ), 'control' => array( '11 · Control', 'dark' ), 'prueba' => array( '12 · Caso Sky Airline', 'light' ),
	'diagnostico' => array( '13 · Diagnóstico y formulario', 'dark' ), 'preguntas' => array( '14 · Preguntas frecuentes', 'light' ), 'cierre' => array( '15 · Cierre', 'dark' ),
);
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_creativa_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_creativa_' . $module ); }
	// Preflight: Document::save writes page settings before elements, so a control error must abort before any write.
	try {
		$widgets[ 'greenhouse_creativa_' . $module ]->get_controls();
		$probe = EO_Creativa_Landing_Base_Widget::render_module( $module, array(), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 251279 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$document = \Elementor\Plugin::$instance->documents->get( $id );
$snapshot = '_gh_creativa_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'post' => get_post( $id, ARRAY_A ), 'meta' => get_post_meta( $id ), 'elements' => $document->get_elements_data(), 'settings' => $document->get_settings(), 'protected' => $protected ), '', false ) ) {
	WP_CLI::error( 'Backup failed.' );
}

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $config ) {
	$elements[] = array(
		'id' => substr( md5( 'creativa-section-' . $module ), 0, 7 ),
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
				'id' => substr( md5( 'creativa-widget-' . $module ), 0, 7 ),
				'elType' => 'widget',
				'widgetType' => 'greenhouse_creativa_' . $module,
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
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_creativa_' . $module ) { WP_CLI::error( 'Widget readback failed. Snapshot: ' . $snapshot ); }
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
