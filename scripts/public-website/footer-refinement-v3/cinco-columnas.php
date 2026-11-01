<?php
/**
 * Footer v3, five columns (2026-10-31, operator: «con 5 columnas se veía bien», canvas board «Footer propuesto · cinco
 * columnas»). Runs after apply.php.
 *
 * - block-17 (under the logo): the address moves out; the brand column now says who we serve, with the five flags of
 *   the countries we work in (the same circular flags Contacto uses).
 * - block-47 (new, sidebar footer-4, placed as column 3): «Contacto» with casa matriz, hola@ and the 600 / US phones.
 * - block-34 (adapter): five-column grid and explicit placement per breakpoint; the night-blue ground gets !important,
 *   because the legacy theme rule `body:not(.home):not(.front-page) .site-footer { background-color: #161519 !important }`
 *   (ohio-child/assets/css/global-fixes.css) pins the old charcoal on every page but Home.
 * - Copyright: «© [ohio_current_year] Efeonce Group SpA. Todos los derechos reservados.» (ACF option).
 *
 * Guards: exact hashes for blocks 17 and 34, exact sidebar and copyright values, one match per replacement. Snapshot
 * first, readback after, cache purge. Rollback: restore the options in the snapshot.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$P         = '#colophon:has([data-eo-footer-partners="v2"])';
$flags     = 'https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets/assets/img/contact/flags/';
$copy_key  = 'options_global_footer_copyright_left';
$copy_old  = '© [ohio_current_year] Efeonce Group SpA.';
$copy_new  = '© [ohio_current_year] Efeonce Group SpA. Todos los derechos reservados.';
$expected  = array(
	17 => '1930d10ae23a022148d3c1d3200128e7dfab6c4cca55c777041f5ec5fa2a1523',
	34 => '90ef7ea8be96275803802ea9fc9c2eaa514d7a72b80e434a1f18588b5ad6cd7d',
);

$flag_imgs = '';
foreach ( array( 'cl' => 'Chile', 'co' => 'Colombia', 'mx' => 'México', 'pe' => 'Perú', 'us' => 'Estados Unidos' ) as $code => $name ) {
	$flag_imgs .= '<img src="' . $flags . $code . '.svg" alt="' . $name . '" width="22" height="22" loading="lazy" decoding="async">';
}
$block17 = "<!-- wp:html -->\n"
	. '<div class="eo-footer-coverage"><p>Trabajamos con organizaciones en Latinoamérica y Estados Unidos.</p>'
	. '<div class="eo-footer-flags" role="img" aria-label="Chile, Colombia, México, Perú y Estados Unidos">' . $flag_imgs . '</div></div>'
	. "\n<!-- /wp:html -->";

$block47 = "<!-- wp:html -->\n<style>/* Footer v3: contact column and coverage flags. */\n"
	. $P . ' .eo-footer-coverage p{margin:0 0 12px;max-width:26ch}' . "\n"
	. $P . ' .eo-footer-flags{display:flex;align-items:center}' . "\n"
	. $P . ' .eo-footer-flags img{display:block;width:22px;height:22px;border-radius:50%;object-fit:cover;box-shadow:0 0 0 2px #000f1f}' . "\n"
	. $P . ' .eo-footer-flags img+img{margin-left:-6px}' . "\n"
	. $P . ' .eo-footer-contact p{margin:0 0 14px}' . "\n"
	. $P . ' .eo-footer-contact p.eo-footer-contact__label{margin:0 0 2px;font-weight:500;color:var(--eo-ft-paper)}' . "\n"
	. $P . ' .eo-footer-contact a{font-size:13px;line-height:1.6;color:var(--eo-ft-paper);background-image:none;text-decoration:none}' . "\n"
	. $P . ' .eo-footer-contact a:hover{color:var(--eo-ft-accent)}' . "\n"
	. $P . ' .eo-footer-contact__phones{display:grid;gap:10px;list-style:none;margin:0;padding:0}' . "\n"
	. $P . ' .eo-footer-contact__phones li{display:flex;flex-direction:column;gap:1px;margin:0;padding:0}' . "\n"
	. $P . ' .eo-footer-contact__phones span{font-size:11px;line-height:1.5;color:color-mix(in srgb,var(--eo-ft-paper) 55%,transparent)}' . "\n"
	. '@media (max-width:600px){' . $P . ' .eo-footer-contact__phones{grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}}' . "\n"
	. "</style>\n"
	. '<section class="eo-footer-contact" aria-labelledby="eo-footer-contact-title"><h2 id="eo-footer-contact-title">Contacto</h2>'
	. '<p class="eo-footer-contact__label">Casa matriz</p><p>Dr. Manuel Barros Borgoño 71, of. 1105<br>Providencia, Santiago de Chile</p>'
	. '<p><a class="-undash" href="mailto:hola@efeoncepro.com">hola@efeoncepro.com</a></p>'
	. '<ul class="eo-footer-contact__phones">'
	. '<li><a class="-undash" href="tel:6009140660">600 914 0660</a><span>Solo desde Chile</span></li>'
	. '<li><a class="-undash" href="tel:+12392352073">+1 (239) 235-2073</a><span>Estados Unidos</span></li>'
	. '</ul></section>'
	. "\n<!-- /wp:html -->";

// Order matters: the 600 px rows move first so the 1100 px rewrite never collides with them.
$replacements_34 = array(
	array( $P . '{background-color:#000f1f;border-top', $P . '{background-color:#000f1f!important;border-top' ),
	array( 'grid-template-columns:minmax(0,1fr) minmax(0,.57fr) minmax(0,1.2fr) minmax(0,1fr);', 'grid-template-columns:minmax(0,1fr) minmax(0,.52fr) minmax(0,.92fr) minmax(0,1.16fr) minmax(0,.8fr);' ),
	array( $P . ' #block-31{grid-column:4;grid-row:1}', $P . ' #block-31{grid-column:5;grid-row:1}' . "\n" . $P . ' #block-47{grid-column:3;grid-row:1}' . "\n" . $P . ' .widgets>.widgets-column:nth-child(3){grid-column:4;grid-row:1}' ),
	array( $P . ' #block-34{grid-row:4}', $P . ' #block-34{grid-row:5}' ),
	array( $P . ' #block-31{grid-column:1/-1;grid-row:3}', $P . ' #block-31{grid-column:1/-1;grid-row:4}' ),
	array( $P . ' .widgets>.widgets-column:nth-child(3){grid-column:1/-1;grid-row:2}', $P . ' .widgets>.widgets-column:nth-child(3){grid-column:1/-1;grid-row:3}' . "\n" . $P . ' #block-47{grid-column:1/-1;grid-row:2}' ),
	array( $P . ' #block-34{grid-row:3}', $P . ' #block-34{grid-row:4}' ),
	array( $P . ' #block-31{grid-column:2;grid-row:2}', $P . ' #block-31{grid-column:1;grid-row:3}' . "\n" . $P . ' #block-47{grid-column:1;grid-row:2}' . "\n" . $P . ' .widgets>.widgets-column:nth-child(3){grid-column:2;grid-row:2}' ),
);

$blocks   = get_option( 'widget_block' );
$sidebars = get_option( 'sidebars_widgets' );
foreach ( $expected as $n => $hash ) {
	if ( ! hash_equals( $hash, hash( 'sha256', (string) ( $blocks[ $n ]['content'] ?? '' ) ) ) ) { WP_CLI::error( 'block-' . $n . ' drift. Re-export before applying.' ); }
}
if ( isset( $blocks[47] ) ) { WP_CLI::error( 'block-47 already exists.' ); }
if ( array( 'block-31', 'block-34' ) !== array_values( (array) ( $sidebars['ohio-sidebar-footer-4'] ?? array() ) ) ) { WP_CLI::error( 'Footer column 4 drift.' ); }
if ( get_option( $copy_key ) !== $copy_old ) { WP_CLI::error( 'Copyright drift.' ); }

$content = $blocks[34]['content'];
foreach ( $replacements_34 as list( $old, $new ) ) {
	$found = substr_count( $content, $old );
	if ( 1 !== $found ) { WP_CLI::error( 'block-34: expected one match, found ' . $found . ' for: ' . substr( $old, 0, 90 ) ); }
	$content = str_replace( $old, $new, $content );
}
$next        = $blocks;
$next[34]    = array( 'content' => $content );
$next[17]    = array( 'content' => $block17 );
$next[47]    = array( 'content' => $block47 );
$next_sb     = $sidebars;
$next_sb['ohio-sidebar-footer-4'] = array( 'block-47', 'block-31', 'block-34' );

$home           = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );
$snapshot       = '_gh_footer_v3_cinco_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'widget_block' => $blocks, 'sidebars_widgets' => $sidebars, $copy_key => $copy_old ), '', false ) ) { WP_CLI::error( 'Backup failed.' ); }

update_option( 'widget_block', $next );
update_option( 'sidebars_widgets', $next_sb );
update_option( $copy_key, $copy_new );

$after = get_option( 'widget_block' );
foreach ( array( 17, 34, 47 ) as $n ) {
	if ( ( $after[ $n ]['content'] ?? '' ) !== $next[ $n ]['content'] ) { WP_CLI::error( 'Readback failed on block-' . $n . '. Snapshot: ' . $snapshot ); }
}
if ( get_option( 'sidebars_widgets' ) !== $next_sb || get_option( $copy_key ) !== $copy_new ) { WP_CLI::error( 'Readback failed on sidebars or copyright. Snapshot: ' . $snapshot ); }
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => 'footer_v3_five_columns_applied', 'snapshot' => $snapshot, 'block34' => hash( 'sha256', $content ) ), JSON_PRETTY_PRINT ) . PHP_EOL;
