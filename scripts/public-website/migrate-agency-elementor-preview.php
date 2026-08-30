<?php
/** One-page migration from HTML preview to structured Elementor widgets. */
if ( ! defined( 'ABSPATH' ) || ! class_exists( 'WP_CLI' ) ) { exit; }
$id = 251731;
$expected = '573622673e1320cbcea56175af4889f010222a8ba3c6b35035048d4467f3151a';
if ( get_post_meta( $id, '_gh_task1358_preview_contract', true ) !== 'task-1358-home-claude-preview-v1' || get_post_field( 'post_name', $id ) !== 'home-claude-design-preview' || ! hash_equals( $expected, hash( 'sha256', get_post_meta( $id, '_elementor_data', true ) ) ) ) { WP_CLI::error( 'Preview identity/content drift; inspect before retrying.' ); }
$home = (int) get_option( 'page_on_front' );
if ( $home === $id ) { WP_CLI::error( 'Preview is already Home; this migration must not touch Home.' ); }
$home_hash = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );
$doc = \Elementor\Plugin::$instance->documents->get( $id );
$modules = array( 'hero','trust','problem','reframe','motor','work','servicios','stack','proof-engine','ecosystem','method','cases','social-proof','comparison','faq','agenda','experience' );
$anchors = array( 'hero'=>'top','motor'=>'motor','work'=>'trabajos','servicios'=>'servicios','proof-engine'=>'proof-engine','ecosystem'=>'ecosistema','method'=>'metodo','cases'=>'casos','faq'=>'faq','agenda'=>'agenda' );
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
$elements = array();
foreach ( $modules as $index => $module ) {
	$name = 'greenhouse_agency_' . str_replace( '-', '_', $module );
	if ( ! isset( $widgets[ $name ] ) ) { WP_CLI::error( 'Widget not registered: ' . $name ); }
	$definition = $widgets[ $name ]->content_schema();
	$settings = $definition['defaults'];
	foreach($definition['fields'] as $field)if(in_array($field['type'],array('media','slot'),true)&&isset($settings[$field['key']]['url']))$settings[$field['key']]['url']=\EO_Agency_Landing_Base_Widget::asset_url($settings[$field['key']]['url']);
	foreach ( $definition['repeaters'] as $group ) {
		$settings[ $group['key'] ] = $group['defaults'];
		foreach ( $settings[ $group['key'] ] as &$row ) {
			$row['row_label'] = $group['variants'][ $row['_layout'] ]['label'];
			foreach($group['fields'] as $field)if(in_array($field['type'],array('media','slot'),true)&&isset($row[$field['key']]['url']))$row[$field['key']]['url']=\EO_Agency_Landing_Base_Widget::asset_url($row[$field['key']]['url']);
		}
		unset( $row );
	}
	$settings['anchor'] = $anchors[ $module ] ?? '';
	$settings['motion'] = 'yes';
	$settings['_title'] = $definition['title'];
	$settings['_margin'] = array( 'unit'=>'px','top'=>'0','right'=>'0','bottom'=>'0','left'=>'0','isLinked'=>true );
	$settings['_padding'] = $settings['_margin'];
	$element = array( 'id'=>substr(md5('agency-'.$module),0,7), 'elType'=>'widget', 'widgetType'=>$name, 'settings'=>$settings, 'elements'=>array() );
	$elements[] = array( 'id'=>substr(md5('agency-section-'.$module),0,7), 'elType'=>'container', 'isInner'=>false, 'settings'=>array( '_title'=>sprintf('%02d · %s',$index+1,$definition['title']), 'content_width'=>'full','flex_direction'=>'column','flex_gap'=>array('column'=>'0','row'=>'0','isLinked'=>true,'unit'=>'px'),'padding'=>$settings['_padding'],'margin'=>$settings['_margin'],'css_classes'=>'gh-agency-section gh-agency-section--'.$module.' clb__'.$definition['scheme'].'_section' ), 'elements'=>array($element) );
}
$snapshot = '_gh_backup_before_agency_elementor_' . gmdate('Ymd\THis\Z');
update_post_meta( $id, $snapshot, wp_json_encode( array( 'post'=>get_post($id,ARRAY_A),'meta'=>get_post_meta($id),'elements'=>$doc->get_elements_data(),'settings'=>$doc->get_settings(),'home'=>$home,'homeHash'=>$home_hash ) ) );
$settings = $doc->get_settings();
$settings['hide_title'] = 'yes';
$settings['page_layout'] = 'default';
$settings['custom_css'] = 'body.page-id-251731 .elementor.elementor-251731,body.page-id-251731 .gh-agency-section,body.page-id-251731 .gh-agency-section>.e-con-inner,body.page-id-251731 .gh-agency-section>.elementor-widget,body.page-id-251731 .gh-agency-section .elementor-widget-container{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;gap:0!important}body.page-id-251731 .page-container.-full-w,body.page-id-251731 .page-container.-full-w>.page-content,body.page-id-251731 .entry-content{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important}body.page-id-251731 .gh-agency-section{left:0!important;right:0!important;inset-inline-start:0!important;inset-inline-end:0!important}body.page-id-251731{overflow-x:clip}';
$doc->save( array( 'elements'=>$elements, 'settings'=>$settings ) );
if ( $home !== (int)get_option('page_on_front') || !hash_equals($home_hash,hash('sha256',get_post_meta($home,'_elementor_data',true))) ) { WP_CLI::error('Home guard failed; restore snapshot.'); }
update_post_meta($id,'_gh_agency_module_schema','agencyModule.v1');
\Elementor\Plugin::$instance->files_manager->clear_cache();
clean_post_cache($id);
WP_CLI::runcommand('cache flush',array('return'=>true));
WP_CLI::runcommand('kinsta cache purge --all',array('return'=>true));
$saved=json_decode(get_post_meta($id,'_elementor_data',true),true);
$names=[];foreach($saved as $container){foreach($container['elements'] as $widget){$names[]=$widget['widgetType'];}}
echo wp_json_encode(array('status'=>'modular_preview_saved','postId'=>$id,'containers'=>count($saved),'widgets'=>$names,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'snapshot'=>$snapshot,'home'=>$home,'homeUnchanged'=>true,'noindex'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true)),JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
