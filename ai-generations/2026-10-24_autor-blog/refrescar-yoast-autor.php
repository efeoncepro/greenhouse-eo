<?php
/**
 * TASK-2057 — tras cambiar la foto y el cargo de Julio: meta descripción del archivo de autor sin «fundador» y
 * reconstrucción del indexable de autor de Yoast (og:image con la foto nueva).
 * Uso: pnpm public-website:wpcli -- --eval-file <este archivo> --wp-user 1
 */
if ( ! defined( 'WP_CLI' ) ) { exit; }
$uid    = 1;
$before = (string) get_user_meta( $uid, 'wpseo_metadesc', true );
update_user_meta( $uid, 'wpseo_metadesc', 'Julio Reyes es Managing & GTM Director de Efeonce Group. Escribe sobre IA, marketing, SEO/AEO y operaciones creativas en Latinoamérica.' );
$r = wp_update_user( array( 'ID' => $uid ) ); // fires profile_update: Yoast's author indexable watcher rebuilds it.
if ( function_exists( 'YoastSEO' ) ) {
	$repo = YoastSEO()->classes->get( \Yoast\WP\SEO\Repositories\Indexable_Repository::class );
	$idx  = $repo->find_by_id_and_type( $uid, 'user', false );
	if ( $idx ) {
		$builder = YoastSEO()->classes->get( \Yoast\WP\SEO\Builders\Indexable_Builder::class );
		$idx     = $builder->build_for_id_and_type( $uid, 'user', $idx );
	}
}
clean_user_cache( $uid );
WP_CLI::line( wp_json_encode( array(
	'metadesc_before' => $before,
	'metadesc_after'  => get_user_meta( $uid, 'wpseo_metadesc', true ),
	'update'          => is_wp_error( $r ) ? $r->get_error_message() : $r,
	'og_image'        => isset( $idx ) && $idx ? $idx->open_graph_image : null,
), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
