<?php
/**
 * TASK-2057 — perfil de autor de Julio Reyes (usuario 1) en efeoncepro.com, aprobado por el operador el 2026-10-24.
 * Uso (una vez): pnpm public-website:wpcli -- --eval-file <este archivo> --input-file julio-autor-azul-foto-1080.png --wp-user 1
 * Imprime los valores anteriores (para revertir) y los nuevos. Avatar anterior: adjunto 244826.
 */
if ( ! defined( 'WP_CLI' ) ) { exit; }
$uid = 1;
$png = $args[0] ?? '';
if ( '' === $png || ! file_exists( $png ) ) { WP_CLI::error( 'Pasa la foto con --input-file.' ); }

global $wpdb;
$avatar_key = $wpdb->get_blog_prefix() . 'user_avatar';
$before     = array(
	'avatar'      => get_user_meta( $uid, $avatar_key, true ),
	'schema'      => get_user_meta( $uid, 'wpseo_user_schema', true ),
	'job_title'   => get_user_meta( $uid, 'job_title', true ),
	'bio_short'   => get_user_meta( $uid, 'eo_author_bio_short', true ),
	'description' => get_user_meta( $uid, 'description', true ),
);

require_once ABSPATH . 'wp-admin/includes/file.php';
require_once ABSPATH . 'wp-admin/includes/media.php';
require_once ABSPATH . 'wp-admin/includes/image.php';
$tmp = wp_tempnam( 'julio-reyes-autor.png' );
copy( $png, $tmp );
$att = media_handle_sideload( array( 'name' => 'julio-reyes-autor-2026-10.png', 'tmp_name' => $tmp ), 0, 'Julio Reyes' );
if ( is_wp_error( $att ) ) { WP_CLI::error( 'No se pudo subir la foto: ' . $att->get_error_message() ); }
update_post_meta( $att, '_wp_attachment_image_alt', 'Julio Reyes' );

$role   = 'Managing & GTM Director';
$schema = $before['schema'];
$schema = is_string( $schema ) ? json_decode( $schema, true ) : $schema;
$schema = is_array( $schema ) ? $schema : array();
$schema['jobTitle'] = $role;

update_user_meta( $uid, $avatar_key, (int) $att );
update_user_meta( $uid, 'wpseo_user_schema', $schema );
update_user_meta( $uid, 'job_title', $role );
update_user_meta( $uid, 'eo_author_bio_short', 'Más de 12 años diseñando sistemas de marketing, crecimiento y operaciones creativas para empresas medianas y grandes de Latinoamérica: banca, manufactura, retail y SaaS.' );
update_user_meta( $uid, 'description', 'Managing & GTM Director de Efeonce Group. Más de 12 años diseñando sistemas de marketing, crecimiento y operaciones creativas para empresas medianas y grandes de Latinoamérica, en banca, manufactura, retail y SaaS. Escribe sobre Loop Marketing, IA aplicada, SEO/AEO, Creative Operations y diseño de sistemas donde tecnología, datos y criterio humano trabajan juntos.' );
if ( class_exists( 'EO_Cache_Purge' ) ) { EO_Cache_Purge::bump(); }
clean_user_cache( $uid );

WP_CLI::line( wp_json_encode( array(
	'before' => $before,
	'after'  => array(
		'avatar'     => (int) $att,
		'avatar_url' => wp_get_attachment_url( $att ),
		'avatar_96'  => get_avatar_url( $uid, array( 'size' => 96 ) ),
		'schema'     => get_user_meta( $uid, 'wpseo_user_schema', true ),
		'bio_short'  => get_user_meta( $uid, 'eo_author_bio_short', true ),
	),
), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
