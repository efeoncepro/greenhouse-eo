<?php
/**
 * Publishes the Home modules (rediseño 2026-10-28, canvas «Home Efeonce en órbita») between the site's global
 * navigation and the Ohio footer. Inputs (files, the wpcli wrapper forwards only files): <page-custom.css>
 * (inicio-source/page-custom.css, __ID__ = page id), <spec.json> and, optionally, <meeting.json> (the 0600 file of the
 * global menu's scheduler CTA, .auth/site-nav-meeting-cta-surface.json: { surfaceId, embedKey }) for the agenda launcher:
 *   { "mode": "preview" }                       → creates /home-orbita-preview-20261029/ (publish, noindex, not in menus) for QA.
 *   { "mode": "replace", "pageId": 251731, "expectedDataSha": "<sha256 of the live _elementor_data>" }
 *                                                → replaces the body of the front page in place.
 * Replace snapshots the previous Elementor data/settings, featured image, Ohio page_* metas and Yoast metas into
 * `_gh_home_orbita_before_<UTC>` (JSON) before writing and keeps the front page's own Ohio and Yoast metas. The preview
 * copies the front page's Ohio page_* metas. The featured image is read before Document::save() and restored/verified
 * after it. Rollback (replace): rollback-inicio-elementor-page.php with the snapshot key, purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! in_array( count( $args ?? array() ), array( 2, 3 ), true ) ) { WP_CLI::error( 'Expected: <page-custom.css> <spec.json> [<meeting.json>].' ); }
$template = trim( (string) file_get_contents( $args[0] ) );
$spec     = json_decode( (string) file_get_contents( $args[1] ), true );
$meeting  = isset( $args[2] ) ? json_decode( (string) file_get_contents( $args[2] ), true ) : array();
$meeting_surface = (string) ( $meeting['surfaceId'] ?? '' );
$meeting_key     = (string) ( $meeting['embedKey'] ?? '' );
if ( isset( $args[2] ) && ( ! preg_match( '/^csur-[0-9a-f-]{36}$/', $meeting_surface ) || strlen( $meeting_key ) < 20 ) ) { WP_CLI::error( 'Invalid meeting CTA surface or key.' ); }
$mode = (string) ( $spec['mode'] ?? '' );
if ( ! in_array( $mode, array( 'preview', 'replace' ), true ) ) { WP_CLI::error( 'Unknown mode.' ); }
if ( false === strpos( $template, '__ID__' ) || preg_match( '/<\/?(script|style)/i', $template ) ) { WP_CLI::error( 'Unexpected custom CSS input.' ); }

$modules = array(
	'hero' => '01 · Hero', 'marcas' => '02 · Marcas y plataformas', 'motor' => '03 · Un solo motor', 'lineas' => '04 · Líneas de servicio',
	'trabajo' => '05 · Trabajo', 'aeo' => '06 · Efeonce | AEO', 'agentes' => '07 · Agentes con contexto', 'greenhouse' => '08 · Greenhouse',
	'metodo' => '09 · Método', 'respaldo' => '10 · Testimonios y comparación', 'faq' => '11 · Preguntas frecuentes', 'agenda' => '12 · Conversemos',
);
$light   = array( 'marcas', 'motor', 'trabajo', 'agentes', 'respaldo', 'agenda' );
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach ( array_keys( $modules ) as $module ) {
	if ( ! isset( $widgets[ 'greenhouse_inicio_' . $module ] ) ) { WP_CLI::error( 'Widget absent: greenhouse_inicio_' . $module ); }
	try {
		$widgets[ 'greenhouse_inicio_' . $module ]->get_controls();
		$probe = EO_Inicio_Landing_Base_Widget::render_module( $module, array( 'meeting_surface' => $meeting_surface, 'meeting_embed_key' => $meeting_key ), 'preflight' );
		if ( '' === $probe || preg_match( '/%%[^%\s]+%%/', $probe ) ) { WP_CLI::error( 'Render preflight failed: ' . $module ); }
	} catch ( \Throwable $e ) {
		WP_CLI::error( 'Control preflight failed for ' . $module . ': ' . $e->getMessage() );
	}
}

$home = (int) get_option( 'page_on_front' );
if ( 251731 !== $home ) { WP_CLI::error( 'Front page drift: ' . $home ); }
$protected = array();
foreach ( array( 249582, 251279, 251981, 251997, 244079, 242601, 251583, 249770 ) as $post_id ) { $protected[ $post_id ] = hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ); }
if ( 'preview' === $mode ) { $protected[ $home ] = hash( 'sha256', (string) get_post_meta( $home, '_elementor_data', true ) ); }
$shell = array();
foreach ( array( 'page_on_front', 'show_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }

$snapshot_key = '';
if ( 'preview' === $mode ) {
	if ( get_page_by_path( 'home-orbita-preview-20261029', OBJECT, 'page' ) ) { WP_CLI::error( 'Preview page already exists. Inspect before retry.' ); }
	$id = wp_insert_post( array( 'post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Home La órbita (preview)', 'post_name' => 'home-orbita-preview-20261029', 'post_author' => get_current_user_id() ), true );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Page creation failed: ' . $id->get_error_message() ); }
	update_post_meta( $id, '_yoast_wpseo_meta-robots-noindex', '1' );
	update_post_meta( $id, '_yoast_wpseo_meta-robots-nofollow', '1' );
	// Same Ohio page contract as the front page (header overlay over a dark hero, full bleed, no sidebar).
	foreach ( get_post_meta( $home ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) ) { update_post_meta( $id, $key, wp_slash( maybe_unserialize( $values[0] ) ) ); } }
} else {
	$id = (int) ( $spec['pageId'] ?? 0 );
	if ( $home !== $id || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Target page drift.' ); }
	$live_sha = hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) );
	if ( ! hash_equals( (string) ( $spec['expectedDataSha'] ?? '' ), $live_sha ) ) { WP_CLI::error( 'Live Elementor data changed since discovery: ' . $live_sha ); }
	$before = array( 'post_title' => get_post_field( 'post_title', $id ) );
	foreach ( get_post_meta( $id ) as $key => $values ) {
		if ( in_array( $key, array( '_elementor_data', '_elementor_page_settings', '_elementor_edit_mode', '_elementor_template_type', '_elementor_version', '_elementor_controls_usage', '_thumbnail_id', '_wp_page_template' ), true ) || 0 === strpos( $key, 'page_' ) || 0 === strpos( $key, '_yoast_wpseo_' ) ) {
			$before[ $key ] = $values[0];
		}
	}
	$snapshot_key = '_gh_home_orbita_before_' . gmdate( 'Ymd_His' );
	update_post_meta( $id, $snapshot_key, wp_slash( wp_json_encode( $before ) ) );
	if ( '' === (string) get_post_meta( $id, $snapshot_key, true ) ) { WP_CLI::error( 'Snapshot failed; nothing changed.' ); }
}
$thumbnail   = (int) get_post_meta( $id, '_thumbnail_id', true );
$page_metas  = array();
foreach ( get_post_meta( $id ) as $key => $values ) { if ( 0 === strpos( $key, 'page_' ) || 0 === strpos( $key, '_yoast_wpseo_' ) ) { $page_metas[ $key ] = $values[0]; } }
update_post_meta( $id, '_elementor_edit_mode', 'builder' );
update_post_meta( $id, '_elementor_template_type', 'wp-page' );
update_post_meta( $id, '_wp_page_template', 'default' );

$zero     = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$elements = array();
foreach ( $modules as $module => $title ) {
	$scheme   = in_array( $module, $light, true ) ? 'clb__light_section' : 'clb__dark_section';
	$settings = array( '_title' => $title, '_margin' => $zero, '_padding' => $zero );
	if ( 'agenda' === $module && '' !== $meeting_key ) { $settings += array( 'meeting_surface' => $meeting_surface, 'meeting_embed_key' => $meeting_key ); }
	$elements[] = array(
		'id' => substr( md5( 'inicio-section-' . $module ), 0, 7 ), 'elType' => 'container', 'isInner' => false,
		'settings' => array(
			'_title' => $title, 'content_width' => 'full', 'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero, 'margin' => $zero,
			'css_classes' => 'gh-inicio-section ' . $scheme,
		),
		'elements' => array( array( 'id' => substr( md5( 'inicio-widget-' . $module ), 0, 7 ), 'elType' => 'widget', 'widgetType' => 'greenhouse_inicio_' . $module, 'settings' => $settings, 'elements' => array() ) ),
	);
}
$document = \Elementor\Plugin::$instance->documents->get( $id, false );
if ( ! $document ) { WP_CLI::error( 'Elementor document unavailable for ' . $id ); }
$settings               = 'preview' === $mode ? $document->get_settings() : array();
$settings['hide_title'] = 'yes';
$settings['custom_css'] = str_replace( '__ID__', (string) $id, $template );
if ( $thumbnail > 0 ) { $settings['post_featured_image'] = array( 'id' => $thumbnail, 'url' => (string) wp_get_attachment_url( $thumbnail ) ); }
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed for ' . $id . ( $snapshot_key ? '. Restore ' . $snapshot_key : '' ) ); }
if ( $thumbnail > 0 && (int) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { update_post_meta( $id, '_thumbnail_id', $thumbnail ); }
if ( $thumbnail > 0 && (int) get_post_meta( $id, '_thumbnail_id', true ) !== $thumbnail ) { WP_CLI::error( 'Featured image lost after save' . ( $snapshot_key ? '. Restore ' . $snapshot_key : '' ) ); }
// The page's own Ohio and Yoast metas stay as they were (a save can touch them).
foreach ( $page_metas as $key => $value ) { if ( (string) get_post_meta( $id, $key, true ) !== (string) maybe_unserialize( $value ) && ! is_array( maybe_unserialize( $value ) ) ) { update_post_meta( $id, $key, wp_slash( maybe_unserialize( $value ) ) ); } }

$actual = json_decode( (string) get_post_meta( $id, '_elementor_data', true ), true );
if ( ! is_array( $actual ) || count( $actual ) !== count( $modules ) ) { WP_CLI::error( 'Unexpected saved document for ' . $id . ( $snapshot_key ? '. Restore ' . $snapshot_key : '' ) ); }
foreach ( array_keys( $modules ) as $index => $module ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== 'greenhouse_inicio_' . $module ) { WP_CLI::error( 'Widget readback failed for ' . $id ); }
}
foreach ( $protected as $post_id => $hash ) { if ( ! hash_equals( $hash, hash( 'sha256', (string) get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed: ' . $post_id ); } }
foreach ( $shell as $key => $value ) { if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed: ' . $key ); } }

if ( 'preview' === $mode ) {
	$published = wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ), true );
	if ( is_wp_error( $published ) ) { WP_CLI::error( 'Publish failed: ' . $published->get_error_message() ); }
}
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => $mode . '_verified', 'postId' => $id, 'url' => get_permalink( $id ), 'snapshot' => $snapshot_key, 'meetingLauncher' => '' !== $meeting_key, 'thumbnail' => (int) get_post_meta( $id, '_thumbnail_id', true ), 'hash' => hash( 'sha256', (string) get_post_meta( $id, '_elementor_data', true ) ), 'widgets' => count( $actual ), 'protectedUnchanged' => true, 'globalChromePreserved' => true ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
