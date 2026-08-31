<?php
/** Publish the approved body on the existing canonical page, preserving native site chrome and URL. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=244079;
$expected='b453e9d1ba9a4094c886d230b5436bd293e036cec69f0d43d821614b4d0b35ce';
if(get_post_field('post_name',$id)!=='servicios-contratar-hubspot'||!hash_equals($expected,hash('sha256',get_post_meta($id,'_elementor_data',true))))WP_CLI::error('Page identity/content drift. Inspect before retrying.');
$thumbnail=get_post_meta($id,'_thumbnail_id',true);
$home = (int) get_option( 'page_on_front' );
if ( $home === $id ) { WP_CLI::error( 'Preview is already Home; this migration must not touch Home.' ); }
$home_hash = hash( 'sha256', get_post_meta( $home, '_elementor_data', true ) );
$doc = \Elementor\Plugin::$instance->documents->get( $id );
$modules = array('hero','proof','hubs','atlas','sectors','licensing','assessment','delivery','proof-ledger','faq','conversion');
$anchors = array('hero'=>'top','hubs'=>'hubs','atlas'=>'familias','sectors'=>'sectores','licensing'=>'licencias','assessment'=>'alcance','delivery'=>'metodo','faq'=>'faq','conversion'=>'evaluacion');
$widgets = \Elementor\Plugin::$instance->widgets_manager->get_widget_types();
$elements = array();
foreach ( $modules as $index => $module ) {
	$name = 'greenhouse_hubspot_' . str_replace( '-', '_', $module );
	if ( ! isset( $widgets[ $name ] ) ) { WP_CLI::error( 'Widget not registered: ' . $name ); }
	$definition = $widgets[ $name ]->content_schema();
	$settings = $definition['defaults'];
	foreach($definition['fields'] as $field)if(in_array($field['type'],array('media','slot'),true)&&isset($settings[$field['key']]['url']))$settings[$field['key']]['url']=set_url_scheme(\EO_Hubspot_Landing_Base_Widget::asset_url($settings[$field['key']]['url']),'https');
	foreach ( $definition['repeaters'] as $group ) {
		$settings[ $group['key'] ] = $group['defaults'];
		foreach ( $settings[ $group['key'] ] as &$row ) {
			$row['row_label'] = $group['variants'][ $row['_layout'] ]['label'];
			foreach($group['fields'] as $field)if(in_array($field['type'],array('media','slot'),true)&&isset($row[$field['key']]['url']))$row[$field['key']]['url']=set_url_scheme(\EO_Hubspot_Landing_Base_Widget::asset_url($row[$field['key']]['url']),'https');
		}
		unset( $row );
	}
	$settings['anchor'] = $anchors[ $module ] ?? '';
	$settings['motion'] = 'yes';
	if($module==='conversion'){$settings['form_key']='bb220383-530e-4b3c-891f-bbdc75d7d112';$settings['form_surface']='fhsf-efeonce-hubspot-scope';}
	$settings['_title'] = $definition['title'];
	$settings['_margin'] = array( 'unit'=>'px','top'=>'0','right'=>'0','bottom'=>'0','left'=>'0','isLinked'=>true );
	$settings['_padding'] = $settings['_margin'];
	$element = array( 'id'=>substr(md5('hubspot-'.$module),0,7), 'elType'=>'widget', 'widgetType'=>$name, 'settings'=>$settings, 'elements'=>array() );
	$elements[] = array( 'id'=>substr(md5('hubspot-section-'.$module),0,7), 'elType'=>'container', 'isInner'=>false, 'settings'=>array( '_title'=>sprintf('%02d · %s',$index+1,$definition['title']), 'content_width'=>'full','flex_direction'=>'column','flex_gap'=>array('column'=>'0','row'=>'0','isLinked'=>true,'unit'=>'px'),'padding'=>$settings['_padding'],'margin'=>$settings['_margin'],'css_classes'=>'gh-hubspot-section gh-hubspot-section--'.$module.' clb__'.$definition['scheme'].'_section' ), 'elements'=>array($element) );
}
$snapshot = '_gh_backup_before_hubspot_elementor_' . gmdate('Ymd\THis\Z');
update_post_meta( $id, $snapshot, array( 'post'=>get_post($id,ARRAY_A),'meta'=>get_post_meta($id),'elements'=>$doc->get_elements_data(),'settings'=>$doc->get_settings(),'home'=>$home,'homeHash'=>$home_hash ) );
$settings = $doc->get_settings();
$settings['post_featured_image']=['id'=>(int)$thumbnail,'url'=>wp_get_attachment_url((int)$thumbnail)];
$settings['hide_title'] = 'yes';
$settings['page_layout'] = 'default';
$settings['custom_css'] = 'body.page-id-244079 .elementor.elementor-244079,body.page-id-244079 .gh-hubspot-section,body.page-id-244079 .gh-hubspot-section>.e-con-inner,body.page-id-244079 .gh-hubspot-section>.elementor-widget,body.page-id-244079 .gh-hubspot-section .elementor-widget-container{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important;gap:0!important}body.page-id-244079 .page-container.-full-w,body.page-id-244079 .page-container.-full-w>.page-content,body.page-id-244079 .entry-content{width:100%!important;max-width:100%!important;margin:0!important;padding:0!important}body.page-id-244079 .gh-hubspot-section{left:0!important;right:0!important;inset-inline-start:0!important;inset-inline-end:0!important}body.page-id-244079{overflow-x:clip}';
$saved_ok=$doc->save(array('elements'=>$elements,'settings'=>$settings));
if(false===$saved_ok)WP_CLI::error('Elementor save failed. Snapshot: '.$snapshot);
foreach(array('page_add_wrapper'=>'0','page_add_top_padding'=>'0','page_full_width_margins_size'=>'0px','page_breadcrumbs_visibility'=>'0','page_header_add_cap'=>'0','page_header_title_visibility'=>'0','page_header_logo_style'=>'light_variant','page_header_menu_style_settings'=>'custom','page_header_menu_text_typo'=>'{"color":"rgba(255,255,255,0.78)"}') as $key=>$value)update_post_meta($id,$key,$value);
update_post_meta($id,'_yoast_wpseo_title','Implementación y operación de HubSpot | Efeonce');
update_post_meta($id,'_yoast_wpseo_metadesc','Habilitamos HubSpot Hub por Hub y después lo operamos contigo. Implementación, migración y operación con Efeonce, Solutions Partner Gold.');
update_post_meta($id,'_yoast_wpseo_canonical',get_permalink($id));
update_post_meta($id,'_yoast_wpseo_meta-robots-noindex','2');
wp_update_post(array('ID'=>$id,'post_status'=>'publish'));
if((string)$thumbnail!==(string)get_post_meta($id,'_thumbnail_id',true))WP_CLI::error('Featured image guard failed.');
if ( $home !== (int)get_option('page_on_front') || !hash_equals($home_hash,hash('sha256',get_post_meta($home,'_elementor_data',true))) ) { WP_CLI::error('Home guard failed; restore snapshot.'); }
update_post_meta($id,'_gh_hubspot_module_schema','hubspotModule.v1');
\Elementor\Plugin::$instance->files_manager->clear_cache();
clean_post_cache($id);
WP_CLI::runcommand('cache flush',array('return'=>true));
WP_CLI::runcommand('kinsta cache purge --all',array('return'=>true));
$saved=json_decode(get_post_meta($id,'_elementor_data',true),true);
$names=[];foreach($saved as $container){foreach($container['elements'] as $widget){$names[]=$widget['widgetType'];}}
echo wp_json_encode(array('status'=>'hubspot_landing_published','postId'=>$id,'containers'=>count($saved),'widgets'=>$names,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'snapshot'=>$snapshot,'home'=>$home,'homeUnchanged'=>true,'noindex'=>get_post_meta($id,'_yoast_wpseo_meta-robots-noindex',true)),JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
