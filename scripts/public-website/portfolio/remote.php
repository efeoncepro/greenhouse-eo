<?php
/**
 * Remote half of `pnpm public-website:portfolio`, run by `pnpm public-website:wpcli`. It only forwards an allowlisted
 * `wp eo-portfolio` subcommand to the plugin, in process, so the agent CLI goes through the same door and the same
 * save service as the admin screen. No logic of its own. Output is wrapped in markers for the caller.
 * Inputs: request JSON {"command", "positional": [], "assoc": {}} and, for validate/apply, the document file.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'EOP_Store' ) ) { WP_CLI::error( 'eo-portfolio is not active on this site.' ); }
$request = json_decode( (string) file_get_contents( $args[0] ?? '' ), true );
$allowed = array( 'list', 'export', 'validate', 'apply', 'publish', 'unpublish', 'revisions', 'log', 'restore' );
if ( ! is_array( $request ) || ! in_array( $request['command'] ?? '', $allowed, true ) ) {
	WP_CLI::error( 'Unknown portfolio command; allowed: ' . implode( ', ', $allowed ) );
}
$positional = array_map( 'strval', $request['positional'] ?? array() );
$assoc      = is_array( $request['assoc'] ?? null ) ? $request['assoc'] : array();
foreach ( $positional as $value ) {
	if ( ! preg_match( '/^[a-z0-9-]+$/', $value ) ) { WP_CLI::error( 'Invalid argument: ' . $value ); }
}
if ( in_array( $request['command'], array( 'validate', 'apply' ), true ) ) {
	if ( empty( $args[1] ) || ! is_readable( $args[1] ) ) { WP_CLI::error( 'Missing document input.' ); }
	$assoc['file'] = $args[1];
}
unset( $assoc['snapshot'] );
echo "---EOP-BEGIN---\n";
WP_CLI::run_command( array_merge( array( 'eo-portfolio', $request['command'] ), $positional ), $assoc );
echo "\n---EOP-END---\n";
