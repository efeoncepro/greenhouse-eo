<?php
/**
 * Remote side of `pnpm public-website:landing-dock` (TASK-2043): runs one `wp eo-dock` command of the eo-landing-dock
 * plugin and prints its result between markers, so the local CLI can read it apart from WP-CLI noise.
 * Input JSON: {"command": "list"|"snapshot"|"set"|"unset", "page": 242601}; a second input file is the config for `set`.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
if ( ! class_exists( 'EOLD_Store' ) ) { WP_CLI::error( 'The eo-landing-dock plugin is not active.' ); }
$in      = json_decode( file_get_contents( $args[0] ?? '' ), true );
$command = $in['command'] ?? '';
$page    = (string) (int) ( $in['page'] ?? 0 );
echo "---EOLD-BEGIN---\n";
switch ( $command ) {
	case 'list':
		WP_CLI::run_command( array( 'eo-dock', 'list' ) );
		break;
	case 'snapshot':
		WP_CLI::run_command( array( 'eo-dock', 'snapshot', $page ) );
		break;
	case 'set':
		WP_CLI::run_command( array( 'eo-dock', 'set', $page ), array( 'file' => $args[1] ?? '' ) );
		break;
	case 'unset':
		WP_CLI::run_command( array( 'eo-dock', 'unset', $page ) );
		break;
	default:
		WP_CLI::error( 'Unknown command: ' . $command );
}
echo "---EOLD-END---\n";
