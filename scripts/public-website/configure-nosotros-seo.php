<?php
/**
 * Nosotros (/about-us-efeonce/, 249770) — meta description with the declared Why (rediseño 2026-10-23).
 * Snapshots the Yoast description fields into option `_gh_nosotros_seo_before_<UTC>` ({ key: { exists, value } }) before
 * writing; social descriptions are updated only when they already carry the old copy. Rollback: restore each field
 * from the option (delete the ones with exists=false), rebuild the Yoast indexable and purge Kinsta.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$id   = 249770;
$desc = 'No te entregamos crecimiento: lo construimos contigo y te dejamos más capaz de sostenerlo. Estrategia, creatividad, medios, datos y tecnología.';
if ( get_post_field( 'post_name', $id ) !== 'about-us-efeonce' || get_post_status( $id ) !== 'publish' ) { WP_CLI::error( 'Target page drift.' ); }
$keys   = array( '_yoast_wpseo_metadesc', '_yoast_wpseo_opengraph-description', '_yoast_wpseo_twitter-description' );
$before = array();
foreach ( $keys as $key ) { $before[ $key ] = array( 'exists' => metadata_exists( 'post', $id, $key ), 'value' => (string) get_post_meta( $id, $key, true ) ); }
$snapshot = '_gh_nosotros_seo_before_' . gmdate( 'Ymd_His' );
add_option( $snapshot, $before, '', 'no' );
if ( get_option( $snapshot ) !== $before ) { WP_CLI::error( 'Snapshot failed; nothing changed.' ); }
$old = $before['_yoast_wpseo_metadesc']['value'];
update_post_meta( $id, '_yoast_wpseo_metadesc', $desc );
foreach ( array( '_yoast_wpseo_opengraph-description', '_yoast_wpseo_twitter-description' ) as $key ) {
	if ( $before[ $key ]['exists'] && '' !== $old && $before[ $key ]['value'] === $old ) { update_post_meta( $id, $key, $desc ); }
}
if ( get_post_meta( $id, '_yoast_wpseo_metadesc', true ) !== $desc ) { WP_CLI::error( 'Readback failed. Restore ' . $snapshot ); }
clean_post_cache( $id );
if ( function_exists( 'YoastSEO' ) ) { YoastSEO()->classes->get( 'Yoast\\WP\\SEO\\Builders\\Indexable_Builder' )->build_for_id_and_type( $id, 'post' ); }
WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
$after = array();
foreach ( $keys as $key ) { $after[ $key ] = get_post_meta( $id, $key, true ); }
echo wp_json_encode( array( 'status' => 'seo_updated', 'snapshot' => $snapshot, 'before' => $before, 'after' => $after ), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
