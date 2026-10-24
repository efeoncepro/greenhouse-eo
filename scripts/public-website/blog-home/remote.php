<?php
/**
 * Remote side of `pnpm public-website:blog-home` (TASK-2050/2051): every read and every governed write of the blog
 * home content model, through the plugin's own registered meta, taxonomies and readers (never a parallel shape).
 * Input file 1: JSON `{ "op": "...", "apply": bool, ...params }`. Input file 2 (optional): an image to import.
 *
 * Writes are a plan unless `apply` is true. An applied write prints the previous values (`before`) as its rollback,
 * reads back what it wrote, resets the readers cache and purges /blog/. The caller (cli.ts) keeps the ledger.
 * Manual: docs/manual-de-uso/public-site/operar-portada-blog-por-cli.md
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$in = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
if ( ! is_array( $in ) || empty( $in['op'] ) ) { WP_CLI::error( 'Expected a JSON input with an op.' ); }
foreach ( array( 'EO_Home_Readers', 'EO_Format_Taxonomy', 'EO_Resource_Registry', 'EO_Event_Type', 'EO_Cache_Purge' ) as $class ) {
	if ( ! class_exists( $class ) ) { WP_CLI::error( $class . ' is missing: efeonce-editorial-blocks 0.2.0 is not active.' ); }
}

$op    = (string) $in['op'];
$apply = ! empty( $in['apply'] );
$now   = time();
$page  = 18456;

$out = static function ( array $payload ): void {
	echo wp_json_encode( $payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE ) . PHP_EOL;
};

/** Resolves a post of type $type by id or slug (published, draft or future). */
$find = static function ( $ref, string $type = 'post' ): int {
	if ( is_numeric( $ref ) ) {
		$id = (int) $ref;
		if ( get_post_type( $id ) !== $type ) { WP_CLI::error( "#{$id} is not a {$type}." ); }

		return $id;
	}
	$found = get_posts( array( 'post_type' => $type, 'name' => sanitize_title( (string) $ref ), 'post_status' => array( 'publish', 'future', 'draft', 'private' ), 'numberposts' => 1, 'fields' => 'ids' ) );
	if ( ! $found ) { WP_CLI::error( "No {$type} with slug «{$ref}»." ); }

	return (int) $found[0];
};

$snapshot = static function ( int $id, array $keys ): array {
	$s = array();
	foreach ( $keys as $k ) {
		$s[ $k ] = metadata_exists( 'post', $id, $k ) ? get_post_meta( $id, $k, true ) : null;
	}

	return $s;
};

$finish = static function ( string $reason ): void {
	EO_Home_Readers::reset();
	EO_Cache_Purge::purge_now( 'cli:' . $reason );
};

/** Imports the optional second input file (an image) once per content hash; returns the attachment id. */
$import = static function ( string $alt ) use ( $args ): int {
	$file = $args[1] ?? '';
	if ( '' === $file || ! is_readable( $file ) ) { WP_CLI::error( 'No image input file.' ); }
	$hash  = hash_file( 'sha256', $file );
	$found = get_posts( array( 'post_type' => 'attachment', 'post_status' => 'inherit', 'numberposts' => 1, 'fields' => 'ids', 'meta_key' => '_eo_cli_sha256', 'meta_value' => $hash ) );
	if ( $found ) {
		return (int) $found[0];
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	$name = preg_replace( '/^greenhouse-wpcli-[a-f0-9]+-\d+-/', '', basename( $file ) );
	$tmp  = wp_tempnam( $name );
	copy( $file, $tmp );
	$id = media_handle_sideload( array( 'name' => $name, 'tmp_name' => $tmp ), 0, $alt );
	if ( is_wp_error( $id ) ) { WP_CLI::error( 'Image import failed: ' . $id->get_error_message() ); }
	update_post_meta( $id, '_wp_attachment_image_alt', $alt );
	update_post_meta( $id, '_eo_cli_sha256', $hash );

	return (int) $id;
};

$slide_row = static function ( array $s ) use ( $now ): array {
	$row = array( 'source' => $s['source'] ?? '', 'id' => $s['id'] ?? 0, 'title' => $s['title'] ?? '' );
	if ( 'post' === ( $s['source'] ?? '' ) ) {
		$row['format']    = $s['format'] ?? '';
		$row['why']       = ! empty( $s['pinned'] ) ? 'fijada' : ( in_array( $s['format'] ?? '', array( 'glitch-flash', 'glitch-edicion' ), true ) ? 'glitch' : 'reciente' );
		$row['pin_until'] = (string) get_post_meta( (int) $s['id'], '_eo_pin_until', true );
		$row['hero']      = array( 'light' => (string) get_post_meta( (int) $s['id'], '_eo_hero_light', true ), 'bold' => (string) get_post_meta( (int) $s['id'], '_eo_hero_bold', true ), 'image' => (int) get_post_meta( (int) $s['id'], '_eo_hero_image', true ) );
		$row['scrim']     = empty( $row['hero']['image'] );
	} else {
		$row['kind'] = $s['kind'] ?? '';
		$row['why']  = 'recurso ' . ( $s['kind'] ?? '' );
		$row['url']  = $s['url'] ?? '';
	}

	return $row;
};

switch ( $op ) {
	case 'status':
		$counts = array();
		foreach ( EO_Format_Taxonomy::TERMS as $slug => $def ) {
			$t               = get_term_by( 'slug', $slug, EO_Format_Taxonomy::TAXONOMY );
			$counts[ $slug ] = $t ? (int) $t->count : 0;
		}
		$published = (int) wp_count_posts( 'post' )->publish;
		$events    = array();
		foreach ( get_posts( array( 'post_type' => EO_Event_Type::TYPE, 'post_status' => array( 'publish', 'future', 'draft' ), 'numberposts' => 20, 'fields' => 'ids' ) ) as $eid ) {
			$e        = EO_Event_Type::record( (int) $eid );
			$events[] = array( 'id' => $e['id'], 'title' => $e['title'], 'status' => get_post_status( $eid ), 'state' => EO_Event_Type::state( $e, $now ), 'start' => $e['start'] ? gmdate( 'c', $e['start'] ) : null, 'key_art' => $e['key_art'], 'form_key' => $e['form_key'] );
		}
		$resources = array_map( static fn( $r ) => array( 'id' => $r['id'], 'kind' => $r['kind'], 'title' => $r['title'], 'url' => $r['url'], 'placements' => $r['placements'], 'reviewed_at' => $r['reviewed_at'], 'stale' => $r['stale'], 'shown' => EO_Resource_Registry::showable( $r ) ), EO_Resource_Registry::all( $now ) );
		$shortcode = (string) get_post_meta( $page, '_elementor_data', true );
		$out(
			array(
				'op'           => 'status',
				'flag'         => (string) get_option( 'eo_content_model_enabled', 'missing' ),
				'blog_page'    => array( 'id' => $page, 'url' => get_permalink( $page ), 'uses_shortcode' => false !== strpos( $shortcode, '[eo_blog_home]' ) ),
				'plugins'      => array( 'eo-blog-home' => class_exists( 'EOBH_Front' ), 'efeonce-editorial-blocks' => defined( 'EFEONCE_EDITORIAL_BLOCKS_VERSION' ) ? EFEONCE_EDITORIAL_BLOCKS_VERSION : 'active' ),
				'posts'        => array( 'published' => $published, 'without_format' => $published - array_sum( $counts ), 'by_format' => $counts ),
				'slider'       => array_map( $slide_row, EO_Home_Readers::featured( $now ) ),
				'resources'    => $resources,
				'events'       => $events,
				'purge_log'    => array_slice( (array) get_option( 'eo_cm_purge_log', array() ), -5 ),
			)
		);
		break;

	case 'slider':
		$out( array( 'op' => 'slider', 'slides' => array_map( $slide_row, EO_Home_Readers::featured( $now ) ) ) );
		break;

	case 'post':
		$id   = $find( $in['post'] ?? '' );
		$keys = array( '_eo_pin_until', '_eo_pinned_at', '_eo_hero_light', '_eo_hero_bold', '_eo_hero_image', '_eo_video_duration' );
		$p    = array_values( array_filter( EO_Home_Readers::index(), static fn( $x ) => (int) $x['id'] === $id ) );
		$out( array( 'op' => 'post', 'id' => $id, 'title' => get_the_title( $id ), 'url' => get_permalink( $id ), 'format' => EO_Format_Taxonomy::of( $id ), 'meta' => $snapshot( $id, $keys ), 'featured_image' => (int) get_post_thumbnail_id( $id ), 'auto_slide_candidate' => $p ? EO_Home_Readers::auto_slide_candidate( $p[0] ) : false ) );
		break;

	case 'pin':
	case 'unpin':
		$id     = $find( $in['post'] ?? '' );
		$until  = 'pin' === $op ? EO_Home_Pins::sanitize_utc( $in['until'] ?? '' ) : '';
		if ( 'pin' === $op && ( '' === $until || strtotime( $until ) <= $now ) ) { WP_CLI::error( 'Pin needs a future --until date (UTC).' ); }
		$before = $snapshot( $id, array( '_eo_pin_until', '_eo_pinned_at' ) );
		$plan   = array( 'op' => $op, 'post' => $id, 'title' => get_the_title( $id ), 'before' => $before, 'after' => array( '_eo_pin_until' => $until ) );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		if ( 'pin' === $op ) { update_post_meta( $id, '_eo_pin_until', $until ); } else { delete_post_meta( $id, '_eo_pin_until' ); delete_post_meta( $id, '_eo_pinned_at' ); }
		if ( (string) get_post_meta( $id, '_eo_pin_until', true ) !== $until ) { WP_CLI::error( 'Readback failed.' ); }
		$finish( $op );
		$out( $plan + array( 'applied' => true, 'slider' => array_map( $slide_row, EO_Home_Readers::featured( $now ) ) ) );
		break;

	case 'format':
		$id     = $find( $in['post'] ?? '' );
		$format = (string) ( $in['format'] ?? '' );
		if ( ! isset( EO_Format_Taxonomy::TERMS[ $format ] ) ) { WP_CLI::error( 'Unknown format. Valid: ' . implode( ', ', array_keys( EO_Format_Taxonomy::TERMS ) ) ); }
		$plan = array( 'op' => 'format', 'post' => $id, 'title' => get_the_title( $id ), 'before' => EO_Format_Taxonomy::of( $id ), 'after' => $format );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		$set = wp_set_object_terms( $id, array( $format ), EO_Format_Taxonomy::TAXONOMY, false );
		if ( is_wp_error( $set ) || EO_Format_Taxonomy::of( $id ) !== $format ) { WP_CLI::error( 'Readback failed.' ); }
		$finish( 'format' );
		$out( $plan + array( 'applied' => true ) );
		break;

	case 'line':
		// The service line of one post when its category does not say it (`_eo_line`); `off` returns it to its topic.
		$id   = $find( $in['post'] ?? '' );
		$raw  = strtolower( trim( (string) ( $in['line'] ?? '' ) ) );
		$line = 'off' === $raw ? '' : EO_CM_Util::line_key( $raw );
		if ( 'off' !== $raw && '' === $line ) { WP_CLI::error( 'Unknown line. Valid: ' . implode( ', ', array_keys( EO_CM_Util::LINES ) ) . ', off' ); }
		$plan = array( 'op' => 'line', 'post' => $id, 'title' => get_the_title( $id ), 'url' => get_permalink( $id ), 'before' => (string) get_post_meta( $id, EO_CM_Util::LINE_META, true ), 'after' => $line );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		if ( '' === $line ) { delete_post_meta( $id, EO_CM_Util::LINE_META ); } else { update_post_meta( $id, EO_CM_Util::LINE_META, $line ); }
		clean_post_cache( $id );
		if ( (string) get_post_meta( $id, EO_CM_Util::LINE_META, true ) !== $line || get_permalink( $id ) !== $plan['url'] ) { WP_CLI::error( 'Readback failed.' ); }
		$finish( 'line' );
		// The article changes color too: purge its page, not only /blog/.
		$kinsta = isset( $GLOBALS['kinsta_cache']->kinsta_cache_purge ) ? $GLOBALS['kinsta_cache']->kinsta_cache_purge : null;
		if ( $kinsta && method_exists( $kinsta, 'initiate_purge' ) ) { $kinsta->initiate_purge( $id ); }
		$out( $plan + array( 'applied' => true ) );
		break;

	case 'client':
	case 'reviewed':
		// Rail cards (TASK-2051 v2): the client of a case (`_eo_client`, its logo on the card) and the editor's «última
		// revisión» (`_eo_reviewed_at`, the «Actualizado» badge for 30 days). `off` clears it.
		$id    = $find( $in['post'] ?? '' );
		$raw   = trim( (string) ( $in['value'] ?? '' ) );
		$key   = 'client' === $op ? EO_Home_Pins::CLIENT_META : EO_Home_Pins::REVIEWED_META;
		$value = 'off' === $raw ? '' : ( 'client' === $op ? EO_Home_Pins::sanitize_client( $raw ) : EO_Home_Pins::sanitize_day( $raw ) );
		if ( 'off' !== $raw && '' === $value ) { WP_CLI::error( 'client' === $op ? 'Unknown client. Valid: ' . implode( ', ', array_keys( EO_Home_Adapter::RAIL_CLIENTS ) ) . ', off' : 'Expected AAAA-MM-DD or off.' ); }
		$plan = array( 'op' => $op, 'post' => $id, 'title' => get_the_title( $id ), 'before' => (string) get_post_meta( $id, $key, true ), 'after' => $value );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		if ( '' === $value ) { delete_post_meta( $id, $key ); } else { update_post_meta( $id, $key, $value ); }
		clean_post_cache( $id );
		if ( (string) get_post_meta( $id, $key, true ) !== $value ) { WP_CLI::error( 'Readback failed.' ); }
		$finish( $op );
		$out( $plan + array( 'applied' => true ) );
		break;

	case 'hero':
		$id     = $find( $in['post'] ?? '' );
		$keys   = array( '_eo_hero_light', '_eo_hero_bold', '_eo_hero_image' );
		$before = $snapshot( $id, $keys );
		$after  = array();
		if ( ! empty( $in['clear'] ) ) {
			$after = array_fill_keys( $keys, null );
		}
		foreach ( array( 'light' => '_eo_hero_light', 'bold' => '_eo_hero_bold' ) as $field => $key ) {
			if ( isset( $in[ $field ] ) ) { $after[ $key ] = sanitize_text_field( (string) $in[ $field ] ); }
		}
		if ( isset( $in['attachment'] ) ) {
			$att = (int) $in['attachment'];
			if ( ! wp_attachment_is_image( $att ) ) { WP_CLI::error( "#{$att} is not an image attachment." ); }
			$after['_eo_hero_image'] = $att;
		}
		$wants_image = ! empty( $in['image_file'] );
		if ( $wants_image && empty( $in['alt'] ) ) { WP_CLI::error( 'An imported image needs --alt.' ); }
		if ( ! $after && ! $wants_image ) { WP_CLI::error( 'Nothing to change: pass --light, --bold, --attachment, --image or --clear.' ); }
		$plan = array( 'op' => 'hero', 'post' => $id, 'title' => get_the_title( $id ), 'before' => $before, 'after' => $after + ( $wants_image ? array( '_eo_hero_image' => '(imagen importada)' ) : array() ) );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		if ( $wants_image ) { $after['_eo_hero_image'] = $import( (string) $in['alt'] ); }
		foreach ( $after as $key => $value ) {
			if ( null === $value || '' === $value ) { delete_post_meta( $id, $key ); } else { update_post_meta( $id, $key, $value ); }
		}
		foreach ( $after as $key => $value ) {
			if ( (string) get_post_meta( $id, $key, true ) !== (string) ( $value ?? '' ) ) { WP_CLI::error( 'Readback failed: ' . $key ); }
		}
		$finish( 'hero' );
		$out( array_merge( $plan, array( 'after' => $after, 'applied' => true ) ) );
		break;

	case 'card':
		// The rail card's own image (`_eo_card_image`; the featured image stays the OG image) and its focal point
		// (`_eo_card_focus`, «70% 30%»): the portrait card crops a 16:9 cover at the center otherwise.
		$id     = $find( $in['post'] ?? '' );
		$keys   = array( EO_Home_Pins::CARD_IMAGE_META, EO_Home_Pins::CARD_FOCUS_META );
		$before = $snapshot( $id, $keys );
		$after  = ! empty( $in['clear'] ) ? array_fill_keys( $keys, null ) : array();
		if ( isset( $in['focus'] ) ) {
			$focus = 'off' === trim( (string) $in['focus'] ) ? '' : EO_Home_Pins::sanitize_focus( $in['focus'] );
			if ( 'off' !== trim( (string) $in['focus'] ) && '' === $focus ) { WP_CLI::error( 'Expected --focus "x% y%" (0–100) or off.' ); }
			$after[ EO_Home_Pins::CARD_FOCUS_META ] = $focus;
		}
		if ( isset( $in['attachment'] ) ) {
			$att = (int) $in['attachment'];
			if ( ! wp_attachment_is_image( $att ) ) { WP_CLI::error( "#{$att} is not an image attachment." ); }
			$after[ EO_Home_Pins::CARD_IMAGE_META ] = $att;
		}
		$wants_image = ! empty( $in['image_file'] );
		if ( $wants_image && empty( $in['alt'] ) ) { WP_CLI::error( 'An imported image needs --alt.' ); }
		if ( ! $after && ! $wants_image ) { WP_CLI::error( 'Nothing to change: pass --attachment, --image, --focus or --clear.' ); }
		$plan = array( 'op' => 'card', 'post' => $id, 'title' => get_the_title( $id ), 'featured_image' => (int) get_post_thumbnail_id( $id ), 'before' => $before, 'after' => $after + ( $wants_image ? array( EO_Home_Pins::CARD_IMAGE_META => '(imagen importada)' ) : array() ) );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		if ( $wants_image ) { $after[ EO_Home_Pins::CARD_IMAGE_META ] = $import( (string) $in['alt'] ); }
		foreach ( $after as $key => $value ) {
			if ( null === $value || '' === $value || 0 === $value ) { delete_post_meta( $id, $key ); } else { update_post_meta( $id, $key, $value ); }
		}
		clean_post_cache( $id );
		foreach ( $after as $key => $value ) {
			if ( (string) get_post_meta( $id, $key, true ) !== (string) ( $value ?: '' ) ) { WP_CLI::error( 'Readback failed: ' . $key ); }
		}
		if ( (int) get_post_thumbnail_id( $id ) !== $plan['featured_image'] ) { WP_CLI::error( 'The featured image changed: it must stay the OG image.' ); }
		$finish( 'card' );
		$out( array_merge( $plan, array( 'after' => $after, 'applied' => true ) ) );
		break;

	case 'resource-upsert':
	case 'event-upsert':
		$is_event = 'event-upsert' === $op;
		$type     = $is_event ? EO_Event_Type::TYPE : EO_Resource_Registry::TYPE;
		$prefix   = $is_event ? '_eo_event_' : '_eo_res_';
		$data     = (array) ( $in['data'] ?? array() );
		$meta     = (array) ( $data['meta'] ?? array() );
		if ( empty( $data['title'] ) ) { WP_CLI::error( 'data.title is required.' ); }
		if ( $is_event ) {
			$start = EO_Home_Pins::sanitize_utc( $meta['start_utc'] ?? '' );
			if ( '' === $start ) { WP_CLI::error( 'meta.start_utc (ISO 8601) is required.' ); }
			$blob = wp_json_encode( $data );
			if ( preg_match( '#(zoom\.us/j/|teams\.microsoft\.com/l/meetup|meet\.google\.com/|webinar.*(pwd|passcode)=)#i', (string) $blob ) ) { WP_CLI::error( 'A private meeting link must never be stored in an event (PDR-029).' ); }
		} else {
			$kind = EO_Resource_Registry::sanitize_kind( $meta['kind'] ?? '' );
			if ( '' === $kind || empty( $meta['url'] ) ) { WP_CLI::error( 'meta.kind (' . implode( ', ', array_keys( EO_Resource_Registry::KINDS ) ) . ') and meta.url are required.' ); }
		}
		$id = 0;
		if ( ! empty( $data['id'] ) ) {
			$id = $find( $data['id'], $type );
		} elseif ( ! empty( $data['slug'] ) ) {
			$found = get_posts( array( 'post_type' => $type, 'name' => sanitize_title( (string) $data['slug'] ), 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids' ) );
			$id    = $found ? (int) $found[0] : 0;
		} elseif ( ! $is_event ) {
			$found = get_posts( array( 'post_type' => $type, 'post_status' => 'any', 'numberposts' => 1, 'fields' => 'ids', 'meta_query' => array( array( 'key' => '_eo_res_kind', 'value' => $meta['kind'] ), array( 'key' => '_eo_res_url', 'value' => esc_url_raw( (string) $meta['url'] ) ) ) ) );
			$id    = $found ? (int) $found[0] : 0;
		}
		$keys   = array_map( static fn( $k ) => $prefix . $k, array_keys( $meta ) );
		$before = $id ? array( 'post' => array( 'title' => get_the_title( $id ), 'status' => get_post_status( $id ), 'excerpt' => get_post_field( 'post_excerpt', $id ) ), 'meta' => $snapshot( $id, $keys ) ) : null;
		$plan   = array( 'op' => $op, 'id' => $id ?: '(nuevo)', 'before' => $before, 'after' => $data );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		$postarr = array( 'post_type' => $type, 'post_title' => (string) $data['title'], 'post_status' => (string) ( $data['status'] ?? 'publish' ) );
		foreach ( array( 'slug' => 'post_name', 'excerpt' => 'post_excerpt', 'content' => 'post_content' ) as $field => $col ) {
			if ( isset( $data[ $field ] ) ) { $postarr[ $col ] = (string) $data[ $field ]; }
		}
		$postarr['post_author'] = (int) ( $data['author'] ?? 12 );
		$id = $id ? wp_update_post( array( 'ID' => $id ) + $postarr, true ) : wp_insert_post( $postarr, true );
		if ( is_wp_error( $id ) ) { WP_CLI::error( 'Write failed: ' . $id->get_error_message() ); }
		if ( ! empty( $in['image_file'] ) ) {
			if ( empty( $in['alt'] ) ) { WP_CLI::error( 'An imported image needs --alt.' ); }
			$meta[ $is_event ? 'key_art' : 'image' ] = $import( (string) $in['alt'] );
		}
		foreach ( $meta as $k => $v ) {
			update_post_meta( (int) $id, $prefix . $k, $v );
		}
		$record = $is_event ? EO_Event_Type::record( (int) $id ) : EO_Resource_Registry::record( (int) $id, $now );
		if ( $is_event ) {
			$record['state'] = EO_Event_Type::state( $record, $now );
		} else {
			$record['shown'] = EO_Resource_Registry::showable( $record );
		}
		$finish( $op );
		$out( array( 'op' => $op, 'id' => (int) $id, 'before' => $before, 'record' => $record, 'applied' => true ) );
		break;

	case 'resource-review':
		$id     = $find( $in['id'] ?? '', EO_Resource_Registry::TYPE );
		$before = (string) get_post_meta( $id, '_eo_res_reviewed_at', true );
		$day    = gmdate( 'Y-m-d', $now );
		if ( ! $apply ) { $out( array( 'op' => $op, 'id' => $id, 'before' => $before, 'after' => $day, 'applied' => false ) ); break; }
		update_post_meta( $id, '_eo_res_reviewed_at', $day );
		$finish( $op );
		$out( array( 'op' => $op, 'id' => $id, 'before' => $before, 'after' => $day, 'applied' => true, 'shown' => EO_Resource_Registry::showable( EO_Resource_Registry::record( $id, $now ) ) ) );
		break;

	case 'retire':
		$type   = 'event' === ( $in['kind'] ?? '' ) ? EO_Event_Type::TYPE : EO_Resource_Registry::TYPE;
		$id     = $find( $in['id'] ?? '', $type );
		$field  = EO_Event_Type::TYPE === $type ? '_eo_event_status' : null;
		$before = array( 'status' => get_post_status( $id ), 'event_status' => $field ? get_post_meta( $id, $field, true ) : null );
		$plan   = array( 'op' => $op, 'type' => $type, 'id' => $id, 'title' => get_the_title( $id ), 'before' => $before, 'after' => $field ? array( 'event_status' => 'cancelled' ) : array( 'status' => 'draft' ) );
		if ( ! $apply ) { $out( $plan + array( 'applied' => false ) ); break; }
		if ( $field ) { update_post_meta( $id, $field, 'cancelled' ); } else { wp_update_post( array( 'ID' => $id, 'post_status' => 'draft' ) ); }
		$finish( $op );
		$out( $plan + array( 'applied' => true ) );
		break;

	case 'flag':
		$want   = (string) ( $in['value'] ?? '' );
		if ( ! in_array( $want, array( '0', '1' ), true ) ) { WP_CLI::error( 'Flag value must be 0 or 1.' ); }
		$before = (string) get_option( 'eo_content_model_enabled', 'missing' );
		if ( ! $apply ) { $out( array( 'op' => 'flag', 'before' => $before, 'after' => $want, 'applied' => false ) ); break; }
		update_option( 'eo_content_model_enabled', $want, true );
		if ( (string) get_option( 'eo_content_model_enabled' ) !== $want ) { WP_CLI::error( 'Readback failed.' ); }
		flush_rewrite_rules( false );
		WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
		WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
		$out( array( 'op' => 'flag', 'before' => $before, 'after' => $want, 'applied' => true ) );
		break;

	case 'subscription':
		// The real Glitch subscription of the home: a published Growth Form key (inline_pill) or 'off'.
		$key     = (string) ( $in['form_key'] ?? '' );
		$surface = (string) ( $in['surface'] ?? 'fhsf-efeonce-blog-subscription' );
		if ( 'off' !== $key && ! preg_match( '/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/', $key ) ) { WP_CLI::error( 'subscription needs a Growth Form key (UUID) or off.' ); }
		$before = array( 'form_key' => (string) get_option( 'eo_blog_glitch_form_key', '' ), 'surface' => (string) get_option( 'eo_blog_glitch_form_surface', '' ) );
		$after  = 'off' === $key ? array( 'form_key' => '', 'surface' => '' ) : array( 'form_key' => $key, 'surface' => $surface );
		if ( ! $apply ) { $out( array( 'op' => $op, 'before' => $before, 'after' => $after, 'applied' => false ) ); break; }
		if ( '' === $after['form_key'] ) {
			delete_option( 'eo_blog_glitch_form_key' );
			delete_option( 'eo_blog_glitch_form_surface' );
		} else {
			update_option( 'eo_blog_glitch_form_key', $after['form_key'], false );
			update_option( 'eo_blog_glitch_form_surface', $after['surface'], false );
		}
		$finish( $op );
		$out( array( 'op' => $op, 'before' => $before, 'after' => $after, 'applied' => true ) );
		break;

	case 'archive':
		// «Archivo del blog» (TASK-2055): eo_blog_archive_enabled '0' (Ohio), 'preview' (only ?eoba_preview=<token>), '1'.
		$want = (string) ( $in['value'] ?? '' );
		if ( ! in_array( $want, array( '0', 'preview', '1' ), true ) ) { WP_CLI::error( 'archive needs 0, preview or 1.' ); }
		if ( ! class_exists( 'EOBH_Archive' ) || ! class_exists( 'EO_Archive_Adapter' ) ) { WP_CLI::error( 'EOBH_Archive or EO_Archive_Adapter is missing: deploy eo-blog-home and the content model first.' ); }
		$before = array( 'value' => (string) get_option( 'eo_blog_archive_enabled', '0' ), 'token' => '' !== (string) get_option( 'eo_blog_archive_preview_token', '' ) );
		if ( ! $apply ) { $out( array( 'op' => 'archive', 'before' => $before, 'after' => array( 'value' => $want ), 'applied' => false ) ); break; }
		if ( 'preview' === $want && '' === (string) get_option( 'eo_blog_archive_preview_token', '' ) ) {
			update_option( 'eo_blog_archive_preview_token', wp_generate_password( 20, false ), false );
		}
		update_option( 'eo_blog_archive_enabled', $want, true );
		if ( (string) get_option( 'eo_blog_archive_enabled' ) !== $want ) { WP_CLI::error( 'Readback failed.' ); }
		// Public archives change only when the template goes on for everyone or back off: then the whole page cache goes.
		if ( '1' === $want || '1' === $before['value'] ) {
			WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
			WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
		}
		$token = (string) get_option( 'eo_blog_archive_preview_token', '' );
		$out( array( 'op' => 'archive', 'before' => $before, 'after' => array( 'value' => $want ), 'applied' => true, 'preview' => 'preview' === $want ? array( 'query' => 'eoba_preview=' . $token, 'example' => home_url( '/category/hubspot/?eoba_preview=' . $token ) ) : null ) );
		break;

	case 'topic-descriptions':
		// Category descriptions (TASK-2055): the text under a topic's title and its meta description; with ≥ 4 posts the
		// topic becomes indexable. `descriptions`: { slug: text }. `before` holds the previous texts (the rollback).
		$want = (array) ( $in['descriptions'] ?? array() );
		if ( ! $want ) { WP_CLI::error( 'topic-descriptions needs { "descriptions": { "slug": "text" } }.' ); }
		$before = array();
		foreach ( $want as $slug => $text ) {
			$term = get_term_by( 'slug', (string) $slug, 'category' );
			if ( ! $term ) { WP_CLI::error( "No category «{$slug}»." ); }
			if ( mb_strlen( (string) $text ) > 200 ) { WP_CLI::error( "Description of «{$slug}» is longer than 200 characters." ); }
			$before[ $slug ] = (string) $term->description;
		}
		if ( ! $apply ) { $out( array( 'op' => $op, 'before' => $before, 'after' => $want, 'applied' => false ) ); break; }
		$after = array();
		foreach ( $want as $slug => $text ) {
			$term = get_term_by( 'slug', (string) $slug, 'category' );
			$r    = wp_update_term( (int) $term->term_id, 'category', array( 'description' => (string) $text ) );
			if ( is_wp_error( $r ) ) { WP_CLI::error( $r->get_error_message() ); }
			clean_term_cache( (int) $term->term_id, 'category' );
			$after[ $slug ] = (string) get_term( (int) $term->term_id, 'category' )->description;
			if ( $after[ $slug ] !== (string) $text ) { WP_CLI::error( "Readback failed for «{$slug}»." ); }
		}
		WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
		WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
		$out( array( 'op' => $op, 'before' => $before, 'after' => $after, 'applied' => true ) );
		break;

	case 'purge':
		if ( ! $apply ) { $out( array( 'op' => 'purge', 'pages' => EO_Cache_Purge::pages(), 'applied' => false ) ); break; }
		$finish( 'manual' );
		$out( array( 'op' => 'purge', 'pages' => EO_Cache_Purge::pages(), 'applied' => true, 'purge_log' => array_slice( (array) get_option( 'eo_cm_purge_log', array() ), -2 ) ) );
		break;

	default:
		WP_CLI::error( 'Unknown op: ' . $op );
}
