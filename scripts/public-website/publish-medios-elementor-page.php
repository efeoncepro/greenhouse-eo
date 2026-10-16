<?php
/**
 * Creates and publishes /servicios/agencia-de-medios/ (child of /servicios/, page 251077) with the Agencia de Medios
 * modules. Inputs: the page-scoped custom CSS template (medios-source/page-custom.css, __ID__ = new page id) and a JSON
 * file with the published Growth Form { "formKey", "surface" } (medios-source/form.json). Header and footer stay Ohio's. Refuses to run if the slug already exists.
 * Rollback: move the created page to draft (wp post update <id> --post_status=draft), purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 2 ) { WP_CLI::error( 'Expected: <page-custom.css> <form.json>.' ); }
$css_file     = $args[0];
$form         = json_decode( (string) file_get_contents( $args[1] ), true );
$form_key     = (string) ( $form['formKey'] ?? '' );
$form_surface = (string) ( $form['surface'] ?? '' );
if ( ! preg_match( '/^[0-9a-f-]{36}$/', $form_key ) || ! preg_match( '/^fhsf-[a-z0-9-]+$/', $form_surface ) ) { WP_CLI::error( 'Invalid form key or surface.' ); }
$parent = 251077;
if ( get_post_field( 'post_name', $parent ) !== 'servicios' || get_post_status( $parent ) !== 'publish' ) { WP_CLI::error( 'Parent /servicios/ drift.' ); }
if ( get_page_by_path( 'servicios/agencia-de-medios', OBJECT, 'page' ) ) { WP_CLI::error( 'Slug already exists. Inspect before retry.' ); }
$template = trim( (string) file_get_contents( $css_file ) );
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$modules = array(
	'hero' => '01 · Hero', 'canales' => '02 · Canales', 'numeros' => '03 · Números', 'diferencia' => '04 · La diferencia',
	'ciclo' => '05 · Todo el ciclo', 'modo' => '06 · ¿Cómo vendes?', 'senal' => '07 · La señal', 'performance' => '08 · Performance',
	'pantallas' => '09 · Pantallas', 'medicion' => '10 · Medición', 'equipo' => '11 · Equipo', 'cobro' => '12 · Cómo cobramos',
	'metodo' => '13 · Método', 'partners' => '14 · Partners', 'preguntas' => '15 · Preguntas frecuentes', 'agenda' => '16 · Agenda y formulario',
);
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_medios_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_medios_' . $module ); }
	try {
		$widgets[ 'greenhouse_medios_' . $module ]->get_controls();
		$probe = EO_Medios_Landing_Base_Widget::render_module( $module, array( 'form_key' => $form_key, 'form_surface' => $form_surface ), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home      = (int) get_option( 'page_on_front' );
$protected = array();
foreach ( array( $home, 249582, 251279 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Agencia de Medios', 'post_name' => 'agencia-de-medios', 'post_parent' => $parent, 'post_author' => get_current_user_id() ), true );
if ( is_wp_error( $id ) ) { WP_CLI::error( 'Page creation failed: ' . $id->get_error_message() ); }
update_post_meta( $id, '_elementor_edit_mode', 'builder' );
update_post_meta( $id, '_elementor_template_type', 'wp-page' );
update_post_meta( $id, '_wp_page_template', 'default' );

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $title ) {
	$widget_settings = array( '_title' => $title, '_margin' => $zero, '_padding' => $zero );
	if ( 'agenda' === $module ) { $widget_settings += array( 'form_key' => $form_key, 'form_surface' => $form_surface ); }
	$elements[] = array(
		'id' => substr( md5( 'medios-section-' . $module ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero,
			'css_classes' => 'gh-medios-section ' . ( 'cobro' === $module ? 'clb__light_section' : 'clb__dark_section' ),
		),
		'elements' => array( array( 'id' => substr( md5( 'medios-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'greenhouse_medios_' . $module, 'settings' => $widget_settings, 'elements' => array() ) ),
	);
}
$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable for ' . $id ); }
$settings = $document->get_settings();
$settings['hide_title'] = 'yes';
$settings['custom_css'] = str_replace( '__ID__', (string) $id, $template );
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed for draft ' . $id ); }

// Ohio page contract shared with the other service landings: no headline/breadcrumbs, full bleed, light header on dark hero.
$meta = array(
	'page_add_wrapper' => '0', 'page_add_top_padding' => '0', 'page_full_width_margins_size' => '0px',
	'page_breadcrumbs_visibility' => '0', 'page_header_title_visibility' => '0', 'page_header_logo_style' => 'light_variant',
	'page_header_menu_style_settings' => 'custom', 'page_header_menu_text_typo' => '{"color":"rgba(255,255,255,0.78)"}',
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document. Draft ' . $id . ' left unpublished.' ); }
foreach ( array_keys( $modules ) as $index => $module ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_medios_' . $module ) { WP_CLI::error( 'Widget readback failed. Draft ' . $id . ' left unpublished.' ); }
}
foreach ( $meta as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== (string) $value ) { WP_CLI::error( 'Metadata readback failed: ' . $key ); } }
foreach ( $protected as $post_id => $hash ) { if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id ); } }
foreach ( $shell as $key => $value ) { if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); } }

$published = wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ), true );
if ( is_wp_error( $published ) ) { WP_CLI::error( 'Publish failed: ' . $published->get_error_message() ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'published_verified', 'postId' => $id, 'url' => get_permalink( $id ), 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'widgets' => count( $actual ), 'protectedUnchanged' => true, 'globalChromePreserved' => true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
