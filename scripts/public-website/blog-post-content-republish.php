<?php
/**
 * Replaces the post_content of published blog posts with a reviewed Content Factory render, nothing else.
 *
 * Guards per post: the id is a published post, post_modified_gmt and the content sha256 equal what the dry run saw,
 * and the FAQ the plugin builds from the new content (EO_Faq::items) is the same as from the live content (questions
 * and answers), so a recomposition never changes the FAQ schema by accident. Title, slug, date, author, excerpt,
 * status, terms and metas are read before and after; any change is reported.
 *
 *   pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-post-content-republish.php \
 *     --input-file tmp/editorial-republish/config.json --input-file tmp/editorial-republish/<id>.html … --wp-user 12
 *
 * config.json: { "mode": "dry-run" | "apply", "posts": [ { "id": 244765, "modified": "…", "sha256": "…" }, … ] }
 * The content files follow config.json in the same order as "posts". Dry run prints modified/sha256 to pin.
 * Rollback per post: the printed "snapshot" option holds the previous content.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$config = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $config ) || empty( $config['posts'] ) || count( $args ) !== 1 + count( $config['posts'] ) ) {
	WP_CLI::error( 'Expected config.json followed by one content file per post.' );
}
$apply = 'apply' === ( $config['mode'] ?? 'dry-run' );
$faq   = static function ( string $c ): array {
	if ( ! class_exists( 'EO_Faq' ) ) { return array(); }
	return array_map( static fn( $i ) => array( $i['question'], $i['answer'] ), EO_Faq::items( parse_blocks( $c ) ) );
};
$report = array();
foreach ( $config['posts'] as $n => $entry ) {
	$id   = (int) $entry['id'];
	$post = get_post( $id );
	if ( ! $post || 'post' !== $post->post_type || 'publish' !== $post->post_status ) { WP_CLI::error( "Post $id is not a published post." ); }
	$old = (string) $post->post_content;
	$new = (string) file_get_contents( $args[ $n + 1 ] );
	if ( '' === trim( $new ) || false !== strpos( $new, '<!-- wp:heading {"level":1' ) ) { WP_CLI::error( "Post $id: empty content or an H1 in the body." ); }
	$row = array(
		'id'        => $id,
		'modified'  => $post->post_modified_gmt,
		'sha256'    => hash( 'sha256', $old ),
		'newSha256' => hash( 'sha256', $new ),
		'faqSame'   => $faq( $old ) === $faq( $new ),
		'faqCount'  => count( $faq( $new ) ),
		'styles'    => array(
			'destacado' => substr_count( $new, 'wp-block-pullquote is-style-efeonce-destacado' ),
			'pasos'     => substr_count( $new, 'class="is-style-efeonce-pasos"' ),
			'recuadro'  => substr_count( $new, 'class="is-style-efeonce-recuadro"' ),
			'centradas' => substr_count( $new, 'wp-block-image aligncenter' ),
		),
		'bytes'     => array( strlen( $old ), strlen( $new ) ),
	);
	if ( $apply ) {
		if ( ! $row['faqSame'] ) { WP_CLI::error( "Post $id: the FAQ would change; nothing written." ); }
		if ( ( $entry['modified'] ?? '' ) !== $post->post_modified_gmt || ! hash_equals( (string) ( $entry['sha256'] ?? '' ), $row['sha256'] ) ) {
			WP_CLI::error( "Post $id changed since the dry run: nothing written." );
		}
		$keep = array( 'post_title', 'post_name', 'post_date_gmt', 'post_author', 'post_status', 'post_excerpt' );
		$was  = array_combine( $keep, array_map( static fn( $k ) => (string) $post->$k, $keep ) );
		$tax  = array( 'category', 'post_tag' );
		if ( taxonomy_exists( 'eo_format' ) ) { $tax[] = 'eo_format'; }
		$terms = wp_get_post_terms( $id, $tax, array( 'fields' => 'ids' ) );
		$metas = array_diff( array_keys( get_post_meta( $id ) ), array( '_edit_lock', '_edit_last' ) );
		$option = '_gh_post_republish_' . $id . '_' . gmdate( 'Ymd_His' );
		add_option( $option, array( 'content' => $old, 'modified' => $post->post_modified_gmt, 'sha256' => $row['sha256'] ), '', false );
		$res = wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( $new ) ), true );
		if ( is_wp_error( $res ) ) { WP_CLI::error( "Post $id: " . $res->get_error_message() . " Snapshot: $option" ); }
		clean_post_cache( $id );
		$after = get_post( $id );
		$changed = array();
		foreach ( $was as $k => $v ) { if ( (string) $after->$k !== $v ) { $changed[] = $k; } }
		if ( wp_get_post_terms( $id, $tax, array( 'fields' => 'ids' ) ) != $terms ) { $changed[] = 'terms'; }
		$lost = array_diff( $metas, array_keys( get_post_meta( $id ) ) );
		if ( $lost ) { $changed[] = 'metas:' . implode( ',', $lost ); }
		$row['snapshot'] = $option;
		$row['readback'] = wp_encode_emoji( (string) $after->post_content ) === wp_encode_emoji( $new );
		$row['readbackFaqSame'] = $faq( (string) $after->post_content ) === $faq( $old );
		$row['changedFields'] = $changed;
		if ( $changed ) { WP_CLI::warning( "Post $id: " . implode( ', ', $changed ) . " changed. Snapshot: $option" ); }
	}
	$report[] = $row;
}
if ( $apply ) { WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true, 'exit_error' => false ) ); }
echo wp_json_encode( array( 'mode' => $apply ? 'apply' : 'dry-run', 'posts' => $report ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
