<?php
/**
 * Remote side of `pnpm public-website:site-nav` (TASK-2042): runs one `wp eo-nav` command of the EO Navegación plugin
 * and prints its result between markers, so the local CLI can read it apart from WP-CLI noise.
 * Input JSON: {"command": "export"|"revisions"|"restore"|"validate", "revision": 3, "message": "…"}; a second input file
 * is the document for `validate`.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$in      = json_decode( file_get_contents( $args[0] ?? '' ), true );
$command = $in['command'] ?? '';
$site    = EOSN_Store::default_site();
echo "---EOSN-BEGIN---\n";
switch ( $command ) {
	case 'export':
		$document = EOSN_Store::document( $site, isset( $in['revision'] ) ? (int) $in['revision'] : null );
		if ( ! $document ) { WP_CLI::error( 'No document for that revision.' ); }
		echo EOSN_Store::encode( $document ) . "\n";
		break;
	case 'revisions':
		echo wp_json_encode( EOSN_Store::revisions( $site ) ) . "\n";
		break;
	case 'validate':
		WP_CLI::run_command( array( 'eo-nav', 'validate' ), array( 'file' => $args[1] ?? '' ) );
		break;
	case 'restore':
		if ( empty( $in['revision'] ) || empty( $in['message'] ) ) { WP_CLI::error( 'restore needs revision and message.' ); }
		WP_CLI::run_command( array( 'eo-nav', 'restore', (string) (int) $in['revision'] ), array( 'message' => (string) $in['message'] ) );
		break;
	default:
		WP_CLI::error( 'Unknown command: ' . $command );
}
echo "---EOSN-END---\n";
