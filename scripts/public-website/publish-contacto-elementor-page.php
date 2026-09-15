<?php
/** Guarded Elementor cutover of the approved Contacto page body. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected the local surface credential input.' ); }
$id = 20729;
$expected = '820ff6b05a7c3beae229ab1686cb73434f621df3b878308a60d76bd8e2bf92b4';
$current = get_post_meta( $id, '_elementor_data', true );
if ( ! current_user_can( 'edit_post', $id ) || get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'contacto' || ! hash_equals( $expected, hash( 'sha256', $current ) ) ) {
	WP_CLI::error( 'Contacto identity or content drift. Inspect before retry.' );
}
$secrets = json_decode( file_get_contents( $args[0] ), true );
foreach ( array( 'formSurfaceId', 'formEmbedKey', 'ctaSurfaceId', 'ctaEmbedKey' ) as $key ) {
	if ( empty( $secrets[ $key ] ) || ! is_string( $secrets[ $key ] ) ) { WP_CLI::error( 'Surface credential input is incomplete.' ); }
}
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
$required_widgets = array(
	'greenhouse_contact_hero',
	'greenhouse_contact_form',
	'greenhouse_contact_meeting_band',
	'greenhouse_contact_channels',
	'greenhouse_contact_faq',
);
foreach ( $required_widgets as $widget_name ) {
	if ( ! isset( $widgets[ $widget_name ] ) ) { WP_CLI::error( 'Widget absent: ' . $widget_name ); }
}
$home = (int) get_option( 'page_on_front' );
$protected = array( $home => hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) );
$shell = array();
foreach ( array( 'page_on_front', 'sidebars_widgets', 'widget_block', 'theme_mods_ohio-child', 'ohio_options' ) as $option ) { $shell[ $option ] = get_option( $option ); }
$document = \Elementor\Plugin::$instance->documents->get( $id );
$zero = array( 'unit' => 'px', 'top' => '0', 'right' => '0', 'bottom' => '0', 'left' => '0', 'isLinked' => true );
$definitions = array(
	array(
		'type' => 'greenhouse_contact_hero',
		'title' => '01 · Hero Nexa',
		'settings' => array(
			'eyebrow' => 'Contacto',
			'title' => 'Tu próximo paso empieza con una conversación',
			'body' => 'Cuéntanos qué necesitas. Te orientamos y dirigimos tu mensaje al equipo adecuado.',
			'mobile_title' => 'Empecemos por escucharte.',
			'mobile_body' => 'Cuéntanos qué necesitas. Nexa te ayuda a dirigir tu mensaje al equipo adecuado.',
			'nexa_note' => "Te escucha.\nTe orienta.\nTe conecta.",
			'nexa_quote' => 'Las grandes cosas también empiezan con un mensaje.',
			'hero_image' => array( 'url' => EO_ELEMENTOR_WIDGETS_URL . 'assets/img/contact/contacto-nexa-hero.png', 'id' => 0 ),
			'audio_url' => array( 'url' => EO_ELEMENTOR_WIDGETS_URL . 'assets/audio/nexa-contacto.mp3', 'id' => 0 ),
		),
	),
	array(
		'type' => 'greenhouse_contact_form',
		'title' => '02 · Formulario y agenda',
		'settings' => array(
			'heading' => '¿Cómo podemos ayudarte?',
			'intro' => 'Elige un motivo y cuéntanos lo esencial. Dirigiremos tu mensaje al equipo adecuado.',
			'form_slug' => 'efeonce-contacto',
			'form_surface_id' => $secrets['formSurfaceId'],
			'form_embed_key' => $secrets['formEmbedKey'],
			'meeting_cta' => 'contacto-discovery-meeting',
			'cta_surface_id' => $secrets['ctaSurfaceId'],
			'cta_embed_key' => $secrets['ctaEmbedKey'],
		),
	),
	array(
		'type' => 'greenhouse_contact_meeting_band',
		'title' => '03 · Banda de agenda',
		'settings' => array(
			'title' => 'Conversemos sobre tu próximo desafío',
			'body' => 'Elige un horario para hablar de tu proyecto, idea o desafío con nuestro equipo.',
			'meeting_cta' => 'contacto-discovery-meeting',
			'cta_surface_id' => $secrets['ctaSurfaceId'],
			'cta_embed_key' => $secrets['ctaEmbedKey'],
		),
	),
	array(
		'type' => 'greenhouse_contact_channels',
		'title' => '04 · Otros canales',
		'settings' => array(
			'email' => 'hola@efeoncepro.com',
			'chile_phone' => '+56 9 3732 3064',
			'chile_600_phone' => '600 914 0660',
			'us_phone' => '+1 (239) 235-2073',
			'headquarters_address' => 'Dr. Manuel Barros Borgoño 71, oficina 1105, Providencia, Chile',
			'coverage_url' => 'https://efeoncepro.com/nosotros/',
		),
	),
	array( 'type' => 'greenhouse_contact_faq', 'title' => '05 · Preguntas frecuentes', 'settings' => array() ),
);
$elements = array();
foreach ( $definitions as $definition ) {
	$settings = array_merge(
		$definition['settings'],
		array( '_title' => $definition['title'], '_margin' => $zero, '_padding' => $zero )
	);
	$elements[] = array(
		'id' => substr( md5( 'contacto-section-' . $definition['type'] ), 0, 7 ),
		'elType' => 'container',
		'isInner' => false,
		'settings' => array(
			'_title' => $definition['title'],
			'content_width' => 'full',
			'flex_direction' => 'column',
			'flex_gap' => array( 'column' => '0', 'row' => '0', 'unit' => 'px', 'isLinked' => true ),
			'padding' => $zero,
			'margin' => $zero,
			'css_classes' => 'gh-contact-section',
		),
		'elements' => array(
			array(
				'id' => substr( md5( 'contacto-widget-' . $definition['type'] ), 0, 7 ),
				'elType' => 'widget',
				'widgetType' => $definition['type'],
				'settings' => $settings,
				'elements' => array(),
			),
		),
	);
}
$snapshot = '_gh_contacto_before_' . gmdate( 'Ymd_His' );
if ( ! add_option(
	$snapshot,
	array(
		'post' => get_post( $id, ARRAY_A ),
		'meta' => get_post_meta( $id ),
		'elements' => $document->get_elements_data(),
		'settings' => $document->get_settings(),
		'protected' => $protected,
		'shell' => $shell,
	),
	'',
	false
) ) { WP_CLI::error( 'Backup failed.' ); }

$asset = WP_PLUGIN_DIR . '/eo-elementor-widgets/assets/img/contact/contacto-nexa-hero.png';
if ( ! is_readable( $asset ) ) { WP_CLI::error( 'Nexa social image missing. Snapshot: ' . $snapshot ); }
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$temp = wp_tempnam( 'contacto-nexa-hero.png' );
copy( $asset, $temp );
$attachment = media_handle_sideload(
	array( 'name' => 'efeonce-contacto-nexa.png', 'tmp_name' => $temp ),
	$id,
	'Nexa acompaña la página de contacto de Efeonce'
);
if ( is_wp_error( $attachment ) ) { WP_CLI::error( 'Media import failed. Snapshot: ' . $snapshot ); }
update_post_meta( $attachment, '_wp_attachment_image_alt', 'Nexa, influencer AI de Efeonce, acompaña la conversación de contacto.' );

$settings = $document->get_settings();
$settings['post_featured_image'] = array( 'id' => $attachment, 'url' => wp_get_attachment_url( $attachment ) );
$settings['hide_title'] = 'yes';
$settings['page_layout'] = 'default';
$settings['custom_css'] = 'body.page-id-20729{overflow-x:clip}body.page-id-20729 .elementor.elementor-20729,body.page-id-20729 .gh-contact-section,body.page-id-20729 .gh-contact-section>.e-con-inner,body.page-id-20729 .gh-contact-section>.elementor-widget,body.page-id-20729 .gh-contact-section .elementor-widget-container{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;gap:0!important}body.page-id-20729 .page-container.-full-w,body.page-id-20729 .page-container.-full-w>.page-content,body.page-id-20729 .entry-content{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important}body.page-id-20729 .site-content,body.page-id-20729 .page-container,body.page-id-20729 .page-content,body.page-id-20729 .entry-content{overflow:visible}';
if ( false === $document->save( array( 'elements' => $elements, 'settings' => $settings ) ) ) { WP_CLI::error( 'Elementor save failed. Snapshot: ' . $snapshot ); }
foreach ( array(
	'page_add_wrapper' => '0',
	'page_add_top_padding' => '0',
	'page_full_width_margins_size' => '0px',
	'page_breadcrumbs_visibility' => '0',
	'page_header_title_visibility' => '0',
) as $key => $value ) { update_post_meta( $id, $key, $value ); }
$title = 'Contacto | Conversemos con Efeonce';
$description = 'Cuéntanos qué necesitas o agenda una reunión con Efeonce. Dirigiremos tu mensaje al equipo adecuado.';
$meta = array(
	'_eo_contacto_landing_enabled' => '1',
	'_gh_contacto_schema' => 'contactoElementor.v1',
	'_yoast_wpseo_title' => $title,
	'_yoast_wpseo_metadesc' => $description,
	'_yoast_wpseo_opengraph-title' => $title,
	'_yoast_wpseo_opengraph-description' => $description,
	'_yoast_wpseo_twitter-title' => $title,
	'_yoast_wpseo_twitter-description' => $description,
	'_yoast_wpseo_canonical' => 'https://efeoncepro.com/contacto/',
	'_yoast_wpseo_meta-robots-noindex' => '2',
	'_yoast_wpseo_meta-robots-nofollow' => '',
	'_yoast_wpseo_bctitle' => 'Contacto',
	'_yoast_wpseo_focuskw' => 'contacto Efeonce',
	'_yoast_wpseo_opengraph-image' => wp_get_attachment_url( $attachment ),
	'_yoast_wpseo_opengraph-image-id' => (string) $attachment,
	'_yoast_wpseo_twitter-image' => wp_get_attachment_url( $attachment ),
	'_yoast_wpseo_twitter-image-id' => (string) $attachment,
	'_thumbnail_id' => (string) $attachment,
);
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
wp_update_post( array( 'ID' => $id, 'post_status' => 'publish' ) );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
$actual = json_decode( get_post_meta( $id, '_elementor_data', true ), true );
if ( count( $actual ) !== count( $required_widgets ) ) { WP_CLI::error( 'Unexpected saved document. Snapshot: ' . $snapshot ); }
foreach ( $required_widgets as $index => $widget_name ) {
	if ( ( $actual[ $index ]['elements'][0]['widgetType'] ?? '' ) !== $widget_name ) { WP_CLI::error( 'Widget readback failed. Snapshot: ' . $snapshot ); }
}
foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== (string) $value ) { WP_CLI::error( 'Metadata readback failed: ' . $key ); }
}
foreach ( $protected as $post_id => $hash ) {
	if ( ! hash_equals( $hash, hash( 'sha256', get_post_meta( $post_id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Unrelated page changed.' ); }
}
foreach ( $shell as $key => $value ) {
	if ( get_option( $key ) !== $value ) { WP_CLI::error( 'Global site chrome changed.' ); }
}
\Elementor\Plugin::$instance->files_manager->clear_cache();
clean_post_cache( $id );
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode(
	array(
		'status' => 'published_verified',
		'postId' => $id,
		'url' => get_permalink( $id ),
		'snapshot' => $snapshot,
		'attachmentId' => $attachment,
		'hash' => hash( 'sha256', get_post_meta( $id, '_elementor_data', true ) ),
		'widgets' => count( $actual ),
		'protectedUnchanged' => true,
		'globalChromePreserved' => true,
	),
	JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
) . PHP_EOL;
