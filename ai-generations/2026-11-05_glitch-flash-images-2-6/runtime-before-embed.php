<?php
/**
 * Blog editorial styles: Efeonce block styles for native Gutenberg blocks of the blog posts, plus the Ohio host fix
 * that the Efeonce mention needs inside a post.
 *
 * Ohio leaves the native blocks almost bare (the pullquote is two thick black rules; a list is a list), so Content
 * Factory had nothing worth emitting beyond paragraphs. These styles give the posts the editorial pieces of the blog,
 * scoped to their own class, without new blocks or JavaScript:
 *
 * - core/pullquote, 0.8.0: «Destacado Efeonce» (`is-style-efeonce-destacado`) and «Destacado claro»
 *   (`is-style-efeonce-destacado-claro`) for the thesis a section stands on (ring → sphere, no quotation marks), and
 *   «Cita Efeonce» (`is-style-efeonce-cita`) and «Cita clara» (`is-style-efeonce-cita-clara`) for a real quote with
 *   its attribution in <cite>. pullquote_classes marks short lines and swaps the final period for the sphere.
 * - core/list «Pasos» (`is-style-efeonce-pasos`, ordered lists): numbered steps.
 * - core/list «Recuadro» (`is-style-efeonce-recuadro`): a paper panel for a short set worth seeing at once.
 * - core/table «Tabla Efeonce» (`is-style-efeonce-tabla`, 0.6.0): a paper panel with the header rule in the line accent;
 *   under 600 px each row becomes a card and each cell shows the name of its column, which label_table_cells copies
 *   from the header into `data-label` when the block renders.
 *
 * La órbita rules applied (review of 2026-10-24): colors only from efeonceGraphicLine (navy, paper, dark and the line
 * accents), the accent of the post's topic line (current_topic), the accent only in graphics or text ≥ 24 px, no
 * sphere as a bullet or ornament (one sphere per piece) and no filled discs.
 *
 * Ohio host fixes (`ohio-host.css`, front end only). Centered images: core centers figure.aligncenter only in block
 * themes, so Ohio left it on the left. Mention: Ohio paints a hover underline with `.links-underline a:not(.button):not(.tag):not(.-undash):hover`
 * (specificity 0,5,1), stronger than the AXIS `a.axis-mention.axis-mention:is(:hover,:focus-visible)` (0,3,1). Its
 * full-height `currentColor` gradient covered the whole pill in navy and hid the text in blog posts (2026-10-24). The
 * AXIS stylesheet is a byte copy and is not forked: this host rule only neutralizes Ohio's effect on mentions.
 *
 * Design: greenhouse-eo docs/public-site/BLOG_EDITORIAL_BLOCK_STYLES_V1.md.
 *
 * @package Efeonce_Editorial_Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

final class EO_Editorial_Styles {

	const STYLES = array(
		'core/pullquote' => array(
			'efeonce-destacado'        => 'Destacado Efeonce',
			'efeonce-destacado-claro'  => 'Destacado claro',
			'efeonce-cita'             => 'Cita Efeonce',
			'efeonce-cita-clara'       => 'Cita clara',
		),
		'core/list'      => array(
			'efeonce-pasos'    => 'Pasos',
			'efeonce-recuadro' => 'Recuadro',
		),
		'core/table'     => array( 'efeonce-tabla' => 'Tabla Efeonce' ),
	);

	/** A Destacado line up to this many characters is short and gets the larger size (`is-eo-corta`). */
	const SHORT_LINE = 80;

	/** `_eo_line` meta key; lines and resolver live in the content model (EO_CM_Util::LINES, line_of). */
	const LINE_META = '_eo_line';

	public static function init(): void {
		add_action( 'init', array( __CLASS__, 'register' ) );
		add_action( 'init', array( __CLASS__, 'register_meta' ) );
		add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_host' ), 30 );
		add_filter( 'render_block_core/table', array( __CLASS__, 'label_table_cells' ), 10, 2 );
		add_filter( 'render_block_core/pullquote', array( __CLASS__, 'pullquote_classes' ), 10, 2 );
	}

	/**
	 * «Tabla Efeonce»: copies each header cell's text into `data-label` on the body cells of its column, so the phone
	 * layout (one card per row) can name every value. Only for that style and only when the table has a header; any
	 * other table is returned untouched. Pure over its inputs.
	 */
	public static function label_table_cells( string $html, array $block ): string {
		$class = (string) ( $block['attrs']['className'] ?? '' );
		if ( false === strpos( $class, 'is-style-efeonce-tabla' ) || ! class_exists( 'WP_HTML_Tag_Processor' ) ) {
			return $html;
		}
		if ( ! preg_match( '#<thead\b[^>]*>(.*?)</thead>#is', $html, $head ) ) {
			return $html;
		}
		preg_match_all( '#<th\b[^>]*>(.*?)</th>#is', $head[1], $cells );
		$labels = array_map(
			static fn( $cell ) => trim( html_entity_decode( wp_strip_all_tags( $cell ), ENT_QUOTES, 'UTF-8' ) ),
			$cells[1]
		);
		if ( ! array_filter( $labels, 'strlen' ) ) {
			return $html;
		}
		$tags   = new WP_HTML_Tag_Processor( $html );
		$column = 0;
		while ( $tags->next_tag() ) {
			$name = $tags->get_tag();
			if ( 'TR' === $name ) {
				$column = 0;
			} elseif ( 'TD' === $name || 'TH' === $name ) {
				if ( 'TD' === $name && '' !== ( $labels[ $column ] ?? '' ) ) {
					$tags->set_attribute( 'data-label', $labels[ $column ] );
				}
				++$column;
			}
		}

		return $tags->get_updated_html();
	}

	/**
	 * Destacado (`efeonce-destacado` and `-claro`): the sphere closes the line, so the final period of the last paragraph
	 * is removed; a line that ends in other punctuation (?, !, …, quotes) keeps it and gets `is-eo-sin-esfera`. A line of
	 * up to SHORT_LINE characters gets `is-eo-corta`. Any other pullquote is returned untouched. Pure over its inputs.
	 */
	public static function pullquote_classes( string $html, array $block ): string {
		$class = (string) ( $block['attrs']['className'] ?? '' );
		if ( ! preg_match( '/(^|\s)is-style-efeonce-destacado(-claro)?(\s|$)/', $class ) ) {
			return $html;
		}
		$add = array();
		preg_match_all( '#<p\b[^>]*>(.*?)</p>#is', $html, $paras );
		$text = trim( html_entity_decode( wp_strip_all_tags( implode( ' ', $paras[1] ) ), ENT_QUOTES, 'UTF-8' ) );
		if ( '' !== $text && mb_strlen( $text ) <= self::SHORT_LINE ) {
			$add[] = 'is-eo-corta';
		}
		$last = preg_match( '/(.)$/u', $text, $end ) ? $end[1] : '';
		if ( '.' === $last && ! preg_match( '/\.\.$|…$/u', $text ) ) {
			$html = preg_replace( '#\.((?:\s*</(?:strong|b|em|span)>)*)\s*</p>(?![\s\S]*</p>)#i', '$1</p>', $html, 1 );
		} elseif ( '' !== $last ) {
			$add[] = 'is-eo-sin-esfera';
		}
		if ( ! $add ) {
			return $html;
		}

		return (string) preg_replace( '#<figure\b([^>]*?)\bclass="([^"]*)"#i', '<figure$1class="$2 ' . implode( ' ', $add ) . '"', $html, 1 );
	}

	public static function register(): void {
		foreach ( self::STYLES as $block => $styles ) {
			foreach ( $styles as $name => $label ) {
				register_block_style( $block, array( 'name' => $name, 'label' => $label ) );
			}
			wp_enqueue_block_style(
				$block,
				array(
					'handle' => 'eo-editorial-' . str_replace( 'core/', '', $block ),
					'src'    => plugins_url( 'editorial.css', __FILE__ ),
					'path'   => __DIR__ . '/editorial.css',
					'ver'    => EFEONCE_EDITORIAL_BLOCKS_VERSION,
				)
			);
		}
	}

	/** `_eo_line`: the service line of one post when its category does not say it (paid media in Marketing Digital). */
	public static function register_meta(): void {
		register_post_meta(
			'post',
			self::LINE_META,
			array(
				'type'              => 'string',
				'single'            => true,
				'show_in_rest'      => false,
				'sanitize_callback' => static function ( $value ) {
					return class_exists( 'EO_CM_Util' ) ? EO_CM_Util::line_key( (string) $value ) : '';
				},
				'auth_callback'     => static function () {
					return current_user_can( 'edit_posts' );
				},
			)
		);
	}

	/** A known line key, or '' (delegates to EO_CM_Util::line_key). */
	public static function line_or_empty( string $line ): string {
		return class_exists( 'EO_CM_Util' ) ? EO_CM_Util::line_key( $line ) : '';
	}

	/** Ohio host fixes, after the AXIS mention stylesheet (handle `axis-mention` of eo-elementor-widgets). */
	public static function enqueue_host(): void {
		wp_enqueue_style(
			'eo-ohio-host',
			plugins_url( 'ohio-host.css', __FILE__ ),
			wp_style_is( 'axis-mention', 'registered' ) ? array( 'axis-mention' ) : array(),
			EFEONCE_EDITORIAL_BLOCKS_VERSION
		);
		$topic = self::current_topic();
		if ( $topic ) {
			wp_add_inline_style( 'eo-ohio-host', self::line_css( $topic ) );
		}
	}

	/**
	 * Line of the queried post with the same resolver as its home card: EO_CM_Util::line_of (its `_eo_line` meta, or
	 * the line of its topic by EO_Home_Readers::topic_of over EO_CM_Util::TOPICS). Marketing con Manzanitas: the
	 * accent is the line of the theme. Null outside a single post.
	 */
	public static function current_topic(): ?array {
		if ( ! is_singular( 'post' ) || ! class_exists( 'EO_Home_Readers' ) || ! class_exists( 'EO_CM_Util' ) ) {
			return null;
		}
		$id    = (int) get_queried_object_id();
		$terms = wp_get_post_categories( $id, array( 'fields' => 'all' ) );
		$terms = is_wp_error( $terms ) ? array() : $terms;
		$cats  = array_map( static fn( $t ) => (string) $t->slug, $terms );
		$ids   = array_map( static fn( $t ) => (int) $t->term_id, $terms );
		$slug  = EO_Home_Readers::topic_of( $cats, (int) get_post_meta( $id, '_yoast_wpseo_primary_category', true ), $ids );

		return '' === $slug ? null : EO_CM_Util::line_of( $id, $slug );
	}

	/** The line of a topic as the two variables the editorial styles read: accent on paper (`deep`) and on dark. Pure. */
	public static function line_css( array $topic ): string {
		$hex   = static fn( $v ) => preg_match( '/^#[0-9a-f]{6}$/i', (string) $v ) ? strtolower( (string) $v ) : '';
		$light = $hex( $topic['deep'] ?? '' );
		$dark  = $hex( $topic['accent'] ?? '' );
		if ( '' === $light || '' === $dark ) {
			return '';
		}

		return ':root{--eo-line-on-light:' . $light . ';--eo-line-on-dark:' . $dark . ';}';
	}
}
