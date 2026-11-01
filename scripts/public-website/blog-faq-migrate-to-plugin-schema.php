<?php
/**
 * Moves published blog FAQs from a pasted FAQPage JSON-LD to the automatic schema of efeonce-editorial-blocks ≥ 0.3.0
 * (docs/public-site/BLOG_FAQ_BLOCK_ANALYSIS_V1.md §7): every core/details whose question is in the pasted FAQPage
 * gets the «Pregunta frecuente» style, and the core/html block with the FAQPage leaves the content.
 *
 * Edits are textual and local (the details opener comment, its <details> class and the one core/html block); the rest
 * of the content keeps its exact bytes, so nothing is re-serialized. A post is written only when the schema the
 * plugin would build from the new content equals the pasted one, question by question (names and answer texts).
 *
 *   Dry run (default): reports per post id, modified time, content sha256, matches and parity. Writes nothing.
 *     pnpm public-website:wpcli -- --eval-file scripts/public-website/blog-faq-migrate-to-plugin-schema.php \
 *       --input-file tmp/faq-migration/config.json --wp-user 12
 *   Apply: the same config with "mode": "apply" and, per post, the "modified" and "sha256" the dry run printed.
 *
 * config.json: { "mode": "dry-run" | "apply", "posts": { "<id>": { "modified": "...", "sha256": "..." } } }
 * Rollback per post: the option printed as "snapshot" holds the previous content; restore it with wp_update_post.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'EO_Faq' ) ) { WP_CLI::error( 'efeonce-editorial-blocks ≥ 0.3.0 (EO_Faq) is not loaded.' ); }
$config = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $config ) || empty( $config['posts'] ) ) { WP_CLI::error( 'Expected config.json with posts.' ); }
$apply = 'apply' === ( $config['mode'] ?? 'dry-run' );

$norm = static function ( string $s ): string {
	return trim( (string) preg_replace( '/\s+/u', ' ', html_entity_decode( $s, ENT_QUOTES | ENT_HTML5, 'UTF-8' ) ) );
};
// WordPress may store emoji as HTML entities; compare contents through the same encoding.
$same = static function ( string $a, string $b ): bool {
	return wp_encode_emoji( $a ) === wp_encode_emoji( $b );
};

$report = array();
foreach ( $config['posts'] as $id => $guard ) {
	$id   = (int) $id;
	$post = get_post( $id );
	if ( ! $post || 'post' !== $post->post_type ) { WP_CLI::error( "Post $id not found." ); }
	$old = (string) $post->post_content;
	$row = array( 'id' => $id, 'modified' => $post->post_modified_gmt, 'sha256' => hash( 'sha256', $old ) );

	// 1. The pasted FAQPage: exactly one core/html block that holds it.
	$html_re = '~\n*<!-- wp:html -->\s*<script type="application/ld\+json">(.*?)</script>\s*<!-- /wp:html -->\n*~s';
	preg_match_all( $html_re, $old, $m, PREG_SET_ORDER );
	$m = array_values( array_filter( $m, static fn( $x ) => EO_Faq::has_inline_faqpage( '<script type="application/ld+json">' . $x[1] . '</script>' ) ) );
	if ( 1 !== count( $m ) ) { WP_CLI::error( "Post $id: expected one FAQPage core/html block, found " . count( $m ) . '.' ); }
	$faq = json_decode( $m[0][1], true );
	$questions = array();
	foreach ( (array) ( $faq['mainEntity'] ?? array() ) as $q ) {
		$questions[] = array( 'name' => $norm( (string) $q['name'] ), 'answer' => $norm( (string) ( $q['acceptedAnswer']['text'] ?? '' ) ) );
	}
	$names = array_column( $questions, 'name' );

	// 2. Style the details whose question is in the FAQPage.
	$styled = 0;
	$new    = preg_replace_callback(
		'~<!-- wp:details (\{[^\n]*?\}) -->\n<details class="wp-block-details"~',
		static function ( $d ) use ( $names, $norm, &$styled ) {
			$attrs = json_decode( $d[1], true );
			if ( ! is_array( $attrs ) || ! in_array( $norm( (string) ( $attrs['summary'] ?? '' ) ), $names, true ) || isset( $attrs['className'] ) ) {
				return $d[0];
			}
			$attrs['className'] = EO_Faq::CLASS_NAME;
			$styled++;

			return '<!-- wp:details ' . wp_json_encode( $attrs, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . " -->\n<details class=\"wp-block-details " . EO_Faq::CLASS_NAME . '"';
		},
		$old
	);
	// 3. Drop the pasted FAQPage (keep one blank line between the neighbours).
	$new = str_replace( $m[0][0], "\n\n", $new );

	// 4. Parity: the schema the plugin builds from the new content = the pasted one.
	$items  = EO_Faq::items( parse_blocks( $new ) );
	$built  = array_map( static fn( $i ) => array( 'name' => $norm( $i['question'] ), 'answer' => $norm( $i['answer'] ) ), $items );
	$diff   = array();
	foreach ( $questions as $n => $q ) {
		if ( ( $built[ $n ]['name'] ?? null ) !== $q['name'] ) { $diff[] = array( 'n' => $n + 1, 'field' => 'name', 'pasted' => $q['name'], 'built' => $built[ $n ]['name'] ?? null ); }
		elseif ( $built[ $n ]['answer'] !== $q['answer'] ) { $diff[] = array( 'n' => $n + 1, 'field' => 'answer', 'pasted' => $q['answer'], 'built' => $built[ $n ]['answer'] ); }
	}
	$row += array(
		'questions' => count( $questions ),
		'styled'    => $styled,
		'built'     => count( $built ),
		'inlineLeft' => EO_Faq::has_inline_faqpage( $new ),
		'parity'    => ! $diff && count( $built ) === count( $questions ) && $styled === count( $questions ),
		'diff'      => $diff,
		'newSha256' => hash( 'sha256', $new ),
		'bytes'     => array( strlen( $old ), strlen( $new ) ),
	);

	if ( $apply ) {
		if ( ! $row['parity'] || $row['inlineLeft'] ) { WP_CLI::error( "Post $id: parity failed, nothing written. " . wp_json_encode( $row ) ); }
		if ( ( $guard['modified'] ?? '' ) !== $post->post_modified_gmt || ! hash_equals( (string) ( $guard['sha256'] ?? '' ), $row['sha256'] ) ) {
			WP_CLI::error( "Post $id changed since the dry run (modified or sha256): nothing written." );
		}
		$keep = array( 'post_title' => $post->post_title, 'post_name' => $post->post_name, 'post_date_gmt' => $post->post_date_gmt, 'post_author' => $post->post_author, 'post_status' => $post->post_status, 'post_excerpt' => $post->post_excerpt );
		$cats = wp_get_post_terms( $id, array( 'category', 'post_tag' ), array( 'fields' => 'ids' ) );
		$fmt  = taxonomy_exists( 'eo_format' ) ? wp_get_post_terms( $id, 'eo_format', array( 'fields' => 'ids' ) ) : array();
		$meta = get_post_meta( $id );
		unset( $meta['_edit_lock'], $meta['_edit_last'] );
		$option = '_gh_faq_migration_' . $id . '_' . gmdate( 'Ymd_His' );
		add_option( $option, array( 'content' => $old, 'modified' => $post->post_modified_gmt, 'sha256' => $row['sha256'] ), '', false );
		$res = wp_update_post( array( 'ID' => $id, 'post_content' => wp_slash( $new ) ), true );
		if ( is_wp_error( $res ) ) { WP_CLI::error( "Post $id: " . $res->get_error_message() . " Snapshot: $option" ); }
		clean_post_cache( $id );
		$after = get_post( $id );
		$read  = (string) $after->post_content;
		foreach ( $keep as $k => $v ) {
			if ( (string) $after->$k !== (string) $v ) { WP_CLI::warning( "Post $id: $k changed after the update. Snapshot: $option" ); }
		}
		if ( wp_get_post_terms( $id, array( 'category', 'post_tag' ), array( 'fields' => 'ids' ) ) != $cats || ( taxonomy_exists( 'eo_format' ) && wp_get_post_terms( $id, 'eo_format', array( 'fields' => 'ids' ) ) != $fmt ) ) {
			WP_CLI::warning( "Post $id: terms changed after the update. Snapshot: $option" );
		}
		$meta_after = get_post_meta( $id );
		unset( $meta_after['_edit_lock'], $meta_after['_edit_last'] );
		$lost = array_diff( array_keys( $meta ), array_keys( $meta_after ) );
		if ( $lost ) { WP_CLI::warning( "Post $id: metas missing after the update: " . implode( ',', $lost ) . ". Snapshot: $option" ); }
		$row['snapshot'] = $option;
		$row['readback'] = $same( $read, $new );
		$row['readbackItems'] = count( EO_Faq::items( parse_blocks( $read ) ) );
	}
	$report[] = $row;
}
if ( $apply ) { WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true, 'exit_error' => false ) ); }
echo wp_json_encode( array( 'mode' => $apply ? 'apply' : 'dry-run', 'posts' => $report ), JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
