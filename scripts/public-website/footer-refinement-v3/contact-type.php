<?php
/**
 * Footer v3: the «Contacto» column typed as in the canvas (2026-10-31, operator: «los estilos de los textos de casa
 * matriz, los números de tlf tampoco están iguales al canvas»).
 *
 * The column inherited theme spacing the canvas does not have: the adapter's `p` (line-height 1.75) and Ohio's `li`
 * (14.8 px, line-height 1.6). Block-47 now states the canvas values itself: label and email at Poppins' normal line
 * height (1.4), the address at 1.6, 12 px under the email, phones at 13 px with their caption 1 px below.
 *
 * Guards: each replacement must match exactly once in block-47. Snapshot, readback, purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$P            = '#colophon:has([data-eo-footer-partners="v2"])';
$replacements = array(
	array( $P . ' .eo-footer-contact p{margin:0 0 14px}', $P . ' .eo-footer-contact p{margin:0 0 14px;line-height:1.6}' . "\n" . $P . ' .eo-footer-contact p:has(>a[href^="mailto:"]){margin-bottom:12px;line-height:1.4}' ),
	array( $P . ' .eo-footer-contact p.eo-footer-contact__label{margin:0 0 2px;font-weight:500;color:var(--eo-ft-paper)}', $P . ' .eo-footer-contact p.eo-footer-contact__label{margin:0 0 2px;font-weight:500;line-height:1.4;color:var(--eo-ft-paper)}' ),
	array( $P . ' .eo-footer-contact a{font-size:13px;line-height:1.6;', $P . ' .eo-footer-contact a{font-size:13px;line-height:1.4;' ),
	array( $P . ' .eo-footer-contact__phones li{display:flex;flex-direction:column;gap:1px;margin:0;padding:0}', $P . ' .eo-footer-contact__phones li{display:flex;flex-direction:column;gap:1px;margin:0;padding:0;font-size:13px;line-height:1.4}' ),
	array( $P . ' .eo-footer-contact__phones span{font-size:11px;line-height:1.5;', $P . ' .eo-footer-contact__phones span{font-size:11px;line-height:1.4;' ),
);

$blocks  = get_option( 'widget_block' );
$content = (string) ( $blocks[47]['content'] ?? '' );
foreach ( $replacements as list( $old, $new ) ) {
	$found = substr_count( $content, $old );
	if ( 1 !== $found ) { WP_CLI::error( 'block-47: expected one match, found ' . $found . ' for: ' . substr( $old, 0, 90 ) ); }
	$content = str_replace( $old, $new, $content );
}

$snapshot = '_gh_footer_v3_contact_type_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'block47' => $blocks[47]['content'] ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }
$blocks[47]['content'] = $content;
update_option( 'widget_block', $blocks );
if ( ( get_option( 'widget_block' )[47]['content'] ?? '' ) !== $content ) { WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_contact_typed', 'snapshot' => $snapshot ), JSON_PRETTY_PRINT ) . PHP_EOL;
