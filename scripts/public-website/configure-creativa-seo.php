<?php
/**
 * Yoast metadata for /agencia-creativa/ (page 249582). Native Yoast fields only; Yoast stays the owner of
 * WebPage/WebSite/Organization. Guarded by the expected previous values; snapshot option printed below.
 * Rollback: restore each field from the snapshot (delete the ones that did not exist), rebuild the indexable, purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$id = 249582;
if ( get_post_status( $id ) !== 'publish' || get_post_field( 'post_name', $id ) !== 'agencia-creativa' ) { WP_CLI::error( 'Page identity drift.' ); }
$expected = array(
	'_yoast_wpseo_title'   => 'Agencia Creativa en LATAM',
	'_yoast_wpseo_metadesc' => 'Descubre cómo nuestra Agencia Creativa ha ayudado a más de 120 marcas en LATAM a escalar con impacto y resultados medibles.',
);
foreach ( $expected as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Unexpected current value for ' . $key . '. Inspect before retry.' ); }
}
$title       = 'Agencia creativa que escala tu equipo de marketing | Efeonce';
$description = 'Sumamos personas, tecnología y procesos a tu equipo de marketing para producir más y llegar antes al mercado, sin que tu marca pierda consistencia.';
$social      = 'Agencia creativa que escala tu equipo de marketing';
$social_desc = 'Un squad creativo que se suma a tu equipo: más piezas y formatos con el mismo criterio, IA con revisión humana y cada entrega a la vista.';
$meta = array(
	'_yoast_wpseo_title'                 => $title,
	'_yoast_wpseo_metadesc'              => $description,
	'_yoast_wpseo_opengraph-title'       => $social,
	'_yoast_wpseo_opengraph-description' => $social_desc,
	'_yoast_wpseo_twitter-title'         => $social,
	'_yoast_wpseo_twitter-description'   => $social_desc,
);
$snapshot = array();
foreach ( array_keys( $meta ) as $key ) { $snapshot[ $key ] = metadata_exists( 'post', $id, $key ) ? array( 'exists' => true, 'value' => get_post_meta( $id, $key, true ) ) : array( 'exists' => false ); }
$name = '_gh_creativa_seo_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $name, $snapshot, '', false ) ) { WP_CLI::error( 'Snapshot failed.' ); }
foreach ( $meta as $key => $value ) { update_post_meta( $id, $key, $value ); }
foreach ( $meta as $key => $value ) {
	if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed: ' . $key . '. Snapshot: ' . $name ); }
}
if ( (string) get_post_meta( $id, '_thumbnail_id', true ) !== '249672' ) { WP_CLI::error( 'Featured image drift. Snapshot: ' . $name ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'seo_metadata_updated', 'postId' => $id, 'snapshot' => $name, 'fields' => array_keys( $meta ) ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
