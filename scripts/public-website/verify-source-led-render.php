<?php
/**
 * Render fingerprint of the source-led landing widgets, without WordPress: minimal WP/Elementor stand-ins, then for
 * every module of each landing it records name, title, keywords, style/script dependencies, the editor controls
 * (register_controls) and the HTML of render_module() under four settings probes (defaults; form + anchor + motion
 * off; one edited text field; one edited FAQ row). Prints one sha256 per landing/module plus a total, so a refactor of
 * the shared base can be proven render-identical:
 *
 *   php scripts/public-website/verify-source-led-render.php > before.json   (on the old base)
 *   php scripts/public-website/verify-source-led-render.php > after.json    (on the new base) → diff must be empty
 *
 * Env PUBLIC_SITE_RUNTIME_ROOT selects the runtime checkout. Read-only.
 */
namespace Elementor {
	abstract class Widget_Base {
		public $controls = array();
		protected function get_settings_for_display() { return array(); }
		public function get_id() { return 'x'; }
		public function start_controls_section( $id, $args ) { $this->controls[] = array( 'section', $id, $args ); }
		public function end_controls_section() { $this->controls[] = array( 'end' ); }
		public function add_control( $id, $args ) { $this->controls[] = array( 'control', $id, $args ); }
	}
	class Repeater {
		private $c = array();
		public function add_control( $id, $args ) { $this->c[ $id ] = $args; }
		public function get_controls() { return $this->c; }
	}
}

namespace {
	define( 'ABSPATH', '/' );
	$root = getenv( 'PUBLIC_SITE_RUNTIME_ROOT' ) ?: '/Users/jreye/Documents/efeonce-public-site-runtime';
	$P    = rtrim( $root, '/' ) . '/wp-content/plugins/eo-elementor-widgets/';
	define( 'EO_ELEMENTOR_WIDGETS_PATH', $P );
	define( 'EO_ELEMENTOR_WIDGETS_URL', 'https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets/' );
	define( 'EO_ELEMENTOR_WIDGETS_VERSION', '1' );
	$GLOBALS['gh_registered'] = array();
	function esc_attr( $s ) { return htmlspecialchars( (string) $s, ENT_QUOTES ); }
	function esc_html( $s ) { return htmlspecialchars( (string) $s, ENT_NOQUOTES ); }
	function esc_url( $s ) { return (string) $s; }
	function sanitize_title( $s ) { return preg_replace( '/[^a-z0-9-]/', '', strtolower( (string) $s ) ); }
	function sanitize_text_field( $s ) { return trim( (string) $s ); }
	function wp_strip_all_tags( $s ) { return strip_tags( (string) $s ); }
	function wp_json_encode( $d, $f = 0 ) { return json_encode( $d, $f ); }
	function trailingslashit( $s ) { return rtrim( $s, '/' ) . '/'; }
	function home_url( $p = '' ) { return 'https://efeoncepro.com' . $p; }
	function get_queried_object_id() { return 1; }
	function get_permalink( $i ) { return 'https://efeoncepro.com/servicios/x/'; }
	function wp_trim_words( $s, $n = 55, $more = '' ) { $w = preg_split( '/\s+/', trim( (string) $s ) ); return count( $w ) > $n ? implode( ' ', array_slice( $w, 0, $n ) ) . $more : implode( ' ', $w ); }
	function wp_script_is( $h = '', $l = '' ) { return true; }
	function wp_enqueue_script( $h ) { $GLOBALS['gh_registered'][] = 'enqueue:' . $h; }
	function add_action() {}
	function add_filter() {}
	function wp_style_is( $h = '', $l = '' ) { return false; }
	function wp_register_style( $h, $src = '', $deps = array(), $v = '' ) { $GLOBALS['gh_registered'][] = 'style:' . $h . ':' . $src . ':' . implode( ',', (array) $deps ); }
	function wp_register_script( $h, $src = '', $deps = array(), $v = '', $f = false ) { $GLOBALS['gh_registered'][] = 'script:' . $h . ':' . $src . ':' . implode( ',', (array) $deps ); }
	function file_exists_stub() {}

	$landings = array(
		'medios'      => array( 'base' => 'EO_Medios_Landing_Base_Widget', 'file' => 'class-eo-medios-landing-widgets.php' ),
		'performance' => array( 'base' => 'EO_Performance_Landing_Base_Widget', 'file' => 'class-eo-performance-landing-widgets.php' ),
		'inbound'     => array( 'base' => 'EO_Inbound_Landing_Base_Widget', 'file' => 'class-eo-inbound-landing-widgets.php' ),
		'agenda'      => array( 'base' => 'EO_Agenda_Landing_Base_Widget', 'file' => 'class-eo-agenda-landing-widgets.php' ),
		'nosotros'    => array( 'base' => 'EO_Nosotros_Landing_Base_Widget', 'file' => 'class-eo-nosotros-landing-widgets.php' ),
	);
	$out = array();
	foreach ( $landings as $landing => $cfg ) {
		require $P . 'includes/widgets/' . $cfg['file'];
		foreach ( get_declared_classes() as $class ) {
			if ( ! is_subclass_of( $class, $cfg['base'] ) || ( new ReflectionClass( $class ) )->isAbstract() ) { continue; }
			$GLOBALS['gh_registered'] = array();
			$w      = new $class();
			$module = $class::MODULE;
			$rc     = new ReflectionMethod( $w, 'register_controls' );
			$rc->invoke( $w );
			$base = $cfg['base'];
			$def  = $base::definition( $module );
			$text = null;
			foreach ( $def['fields'] ?? array() as $f ) { if ( 'text' === $f['type'] ) { $text = $f['key']; break; } }
			$probes = array(
				'defaults' => array(),
				'form'     => array( 'form_key' => '71ea684f-1ad9-4656-982b-159e4de46dd8', 'form_surface' => 'fhsf-x', 'anchor' => 'Ancla Probe', 'motion' => 'no' ),
				'text'     => $text ? array( $text => 'Probe <b>&</b> "texto"' ) : array(),
				'faq'      => array(),
			);
			foreach ( $def['repeaters'] ?? array() as $g ) {
				$row = $g['defaults'][0];
				foreach ( $g['fields'] as $f ) { if ( in_array( $f['type'], array( 'text', 'textarea' ), true ) ) { $row[ $f['key'] ] = 'Fila editada ' . $f['key']; } }
				$probes['faq'][ $g['key'] ] = array( $row );
			}
			$renders = array();
			foreach ( $probes as $name => $settings ) { $renders[ $name ] = $base::render_module( $module, $settings, 'w-' . $module ); }
			$fingerprint = array(
				'name' => $w->get_name(), 'title' => $w->get_title(), 'keywords' => $w->get_keywords(), 'icon' => $w->get_icon(), 'categories' => $w->get_categories(),
				'styles' => $w->get_style_depends(), 'scripts' => $w->get_script_depends(), 'registered' => $GLOBALS['gh_registered'],
				'controls' => $w->controls, 'renders' => $renders,
			);
			$out[ $landing ][ $module ] = hash( 'sha256', json_encode( $fingerprint ) );
		}
		ksort( $out[ $landing ] );
	}
	$out['total'] = hash( 'sha256', json_encode( $out ) );
	echo json_encode( $out, JSON_PRETTY_PRINT ) . PHP_EOL;
}
