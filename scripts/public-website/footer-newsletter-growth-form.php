<?php
/**
 * Footer newsletter → canonical Growth Form (2026-10-31, operator: «si no es el Growth Form canónico de suscripción,
 * el mismo del blog, hay que corregir»).
 *
 * The footer column held Ohio's subscribe widget (`ohio_widget_subscribe-2`) rendering CF7 242255, whose Mailchimp
 * link is disconnected and which reaches HubSpot only through the collector. It is replaced by a block widget with the
 * same Glitch inline pill the blog uses (form `efeonce-blog-subscription`, same key and surface; consent by the notice,
 * delivery direct to HubSpot with subscription type 535702717). The renderer loads lazily when the footer nears the
 * viewport, and never twice. The old widget moves to inactive widgets; CF7 242255 is not touched.
 *
 * Guards: the column must hold exactly the old widget, the blog must still point to the same form, and Home's Elementor
 * data must not change. Snapshot first, readback after, cache purge.
 * Re-running it once the block is in place only refreshes the block's content (new snapshot each run).
 * Rollback: restore `sidebars_widgets` and `widget_block` from the snapshot option, then purge.
 */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }

$form_key = '6bc62588-a4a0-4214-9501-13b0c2948c81';
$surface  = 'fhsf-efeonce-blog-subscription';
$old_id   = 'ohio_widget_subscribe-2';

if ( get_option( 'eo_blog_glitch_form_key' ) !== $form_key || get_option( 'eo_blog_glitch_form_surface' ) !== $surface ) {
	WP_CLI::error( 'The blog no longer points to the expected Glitch form; reconcile before wiring the footer.' );
}
$sidebars = get_option( 'sidebars_widgets' );
$column   = null;
foreach ( $sidebars as $key => $widgets ) {
	if ( is_array( $widgets ) && in_array( $old_id, $widgets, true ) && 'wp_inactive_widgets' !== $key ) { $column = $key; }
}
$blocks   = get_option( 'widget_block' );
$update_n = null;
if ( null === $column ) {
	foreach ( $sidebars as $key => $widgets ) {
		if ( ! is_array( $widgets ) || 'wp_inactive_widgets' === $key || 1 !== count( $widgets ) || 0 !== strpos( (string) $widgets[0], 'block-' ) ) { continue; }
		$n = (int) substr( (string) $widgets[0], 6 );
		if ( false !== strpos( (string) ( $blocks[ $n ]['content'] ?? '' ), 'eo-footer-newsletter' ) ) {
			$column   = $key;
			$update_n = $n;
		}
	}
}
if ( null === $column || ( null === $update_n && array( $old_id ) !== array_values( $sidebars[ $column ] ) ) ) {
	WP_CLI::error( 'Footer newsletter column drift: expected only ' . $old_id . ' or the existing newsletter block.' );
}
if ( null === $update_n ) {
	foreach ( $blocks as $block ) {
		if ( is_array( $block ) && false !== strpos( (string) ( $block['content'] ?? '' ), 'eo-footer-newsletter' ) ) { WP_CLI::error( 'A footer newsletter block already exists outside the column.' ); }
	}
}
$home           = (int) get_option( 'page_on_front' );
$protected_home = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );

$content = <<<'HTML'
<!-- wp:html -->
<style>/* Footer newsletter: the canonical Glitch Growth Form, same form and surface as /blog/. Host styles only; nothing inside <greenhouse-form>. */
#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter{margin:0}
#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter h3.widget-title{color:var(--eo-ft-paper,#f7f8f6)!important;margin:0 0 12px}
#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter__lede{margin:0 0 18px;font:400 14px/1.6 EfeonceConsentText,Poppins,sans-serif;color:var(--eo-ft-text,rgba(247,248,246,.76));max-width:420px}
#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter greenhouse-form.eo-inline-pill{--ghf-font:'Poppins',system-ui,sans-serif;--ghf-inline-align:flex-start;--ghf-inline-note-align:left;--ghf-inline-tone:#6ec207;--ghf-inline-tone-hover:#8bd13a;--ghf-inline-tone-active:#a6dd68;--ghf-inline-on-tone:#001a33;display:block;width:100%;max-width:480px}
#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter greenhouse-form>a.ghf-fallback{display:inline-flex;align-items:center;height:52px;padding:0 26px;border-radius:999px;background:#6ec207;color:#001a33;font:500 16px Poppins,system-ui,sans-serif;text-decoration:none}
#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter greenhouse-form>.eo-footer-newsletter__note{margin:12px 0 0;font:400 12px/1.6 Poppins,system-ui,sans-serif;color:var(--eo-ft-text,rgba(247,248,246,.76))}
@media (max-width:767px){#colophon:has([data-eo-footer-partners="v2"]) .eo-footer-newsletter greenhouse-form.eo-inline-pill{max-width:none}}
</style>
<section class="eo-footer-newsletter" aria-labelledby="eo-footer-newsletter-title">
<h3 id="eo-footer-newsletter-title" class="title widget-title">Newsletter</h3>
<p class="eo-footer-newsletter__lede">Glitch: lo que pasa en IA, marketing y negocios, cada semana en tu correo.</p>
<greenhouse-form class="eo-inline-pill eo-inline-pill--glitch" form-key="6bc62588-a4a0-4214-9501-13b0c2948c81" surface="fhsf-efeonce-blog-subscription" base-url="https://greenhouse.efeoncepro.com" locale="es-CL" color-scheme="dark" appearance="bare"><a href="https://efeoncepro.com/blog/" class="ghf-fallback">Suscríbete a Glitch</a><p class="eo-footer-newsletter__note" aria-hidden="true">Al suscribirte aceptas la política de privacidad. Te das de baja cuando quieras.</p></greenhouse-form>
</section>
<script>(function(){var S='https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js';var el=document.querySelector('.eo-footer-newsletter greenhouse-form');if(!el)return;function load(){if(window.customElements&&customElements.get('greenhouse-form'))return;if(document.querySelector('script[src^="'+S+'"]'))return;var s=document.createElement('script');s.src=S;s.async=true;s.id='gh-growth-forms-renderer-latest-js';document.head.appendChild(s);}if(!('IntersectionObserver' in window)){load();return;}var io=new IntersectionObserver(function(es){for(var i=0;i<es.length;i++){if(es[i].isIntersecting){io.disconnect();load();return;}}},{rootMargin:'800px 0px'});io.observe(el);})();</script>
<!-- /wp:html -->
HTML;

$numeric = array_filter( array_keys( $blocks ), 'is_int' );
$new_n   = null === $update_n ? max( $numeric ) + 1 : $update_n;
$new_id  = 'block-' . $new_n;

$snapshot = '_gh_footer_newsletter_before_' . gmdate( 'Ymd_His' );
if ( ! add_option( $snapshot, array( 'sidebars_widgets' => $sidebars, 'widget_block' => $blocks, 'column' => $column ), '', false ) ) {
	WP_CLI::error( 'Backup failed.' );
}

$blocks[ $new_n ] = array( 'content' => $content );
update_option( 'widget_block', $blocks );
if ( null === $update_n ) {
	$sidebars[ $column ] = array( $new_id );
	$inactive            = (array) ( $sidebars['wp_inactive_widgets'] ?? array() );
	if ( ! in_array( $old_id, $inactive, true ) ) { $inactive[] = $old_id; }
	$sidebars['wp_inactive_widgets'] = $inactive;
	update_option( 'sidebars_widgets', $sidebars );
}

$after_sb = get_option( 'sidebars_widgets' );
$after_wb = get_option( 'widget_block' );
if ( array( $new_id ) !== array_values( $after_sb[ $column ] ) || ( $after_wb[ $new_n ]['content'] ?? '' ) !== $content ) {
	WP_CLI::error( 'Readback failed. Snapshot: ' . $snapshot );
}
if ( ! hash_equals( $protected_home, hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Protected Home changed. Snapshot: ' . $snapshot ); }

WP_CLI::runcommand( 'cache flush', array( 'return' => true ) );
WP_CLI::runcommand( 'kinsta cache purge --all', array( 'return' => true ) );
echo wp_json_encode( array( 'status' => null === $update_n ? 'footer_newsletter_wired' : 'footer_newsletter_updated', 'snapshot' => $snapshot, 'column' => $column, 'block' => $new_id, 'inactive' => $old_id ), JSON_PRETTY_PRINT ) . PHP_EOL;
