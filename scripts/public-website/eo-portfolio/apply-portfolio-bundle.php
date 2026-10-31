<?php
/**
 * TASK-2049 — loads a bundle `{ "projects": [...] }` through `wp eo-portfolio apply` (the same save service as the admin
 * and the CLI, all or nothing), calling the command class in this process so the eval's user is the editor. It refuses if any project already
 * exists: the first load starts from nothing, later changes go through `pnpm public-website:portfolio`.
 * With `"publish": true` in the input it also publishes each one (approval gate included) with `publishMessage`.
 * With `"update": true` it applies changes to existing projects too: each document carries the `revision` it was
 * edited from, and a project saved in between makes the whole bundle fail (conflict) without writing anything.
 *
 *   pnpm -s public-website:wpcli -- --eval-file scripts/public-website/eo-portfolio/apply-portfolio-bundle.php --input-file <bundle.json> --wp-user 12
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( count( $args ?? array() ) !== 1 ) { WP_CLI::error( 'Expected one JSON input.' ); }
$in = json_decode( (string) file_get_contents( $args[0] ) );
if ( ! is_object( $in ) || empty( $in->projects ) || empty( $in->message ) ) { WP_CLI::error( 'Input must carry projects and a message.' ); }
if ( ! class_exists( 'EOP_Store' ) ) { WP_CLI::error( 'eo-portfolio is not active.' ); }

$existing = array_filter( $in->projects, fn( $doc ) => null !== EOP_Store::post_for( $doc->slug ) );
if ( $existing && empty( $in->publish ) && empty( $in->update ) ) {
	WP_CLI::error( 'These projects already exist; load changes with pnpm public-website:portfolio: ' . implode( ', ', array_map( fn( $d ) => $d->slug, $existing ) ) );
}
if ( ! $existing || ! empty( $in->update ) ) {
	$file = wp_tempnam( 'eop-bundle' );
	file_put_contents( $file, wp_json_encode( array( 'projects' => $in->projects ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) );
	( new EOP_CLI() )->apply( array(), array( 'file' => $file, 'message' => (string) $in->message, 'format' => 'json' ) );
	unlink( $file );
}
if ( ! empty( $in->publish ) ) {
	foreach ( $in->projects as $doc ) {
		( new EOP_CLI() )->publish( array( $doc->slug ), array( 'message' => (string) $in->publishMessage ) );
	}
}
( new EOP_CLI() )->list_( array(), array( 'format' => 'json' ) );
