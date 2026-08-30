<?php
/** Third operator review: only FAQ contact copy, comparison closing, and CRM icon Media. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='750ee98c1aa3468e6430e279df960c0b367d8792eb8e84802be0c94b029e6960';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw)))WP_CLI::error('Home drift; inspect before retry.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$registered=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach(['faq','comparison','servicios'] as $module)if(!isset($registered['greenhouse_agency_'.$module]))WP_CLI::error('Required native widget missing.');
$protected=function()use($id){$out=['oldHome'=>hash('sha256',get_post_meta(2791,'_elementor_data',true)),'social'=>hash('sha256',get_post_meta(251300,'_elementor_data',true)),'meta'=>[]];foreach(get_post_meta($id) as $k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$changed=[];
foreach($elements as &$container)foreach($container['elements'] as &$node){
 $type=$node['widgetType']??'';$s=&$node['settings'];
 if($type==='greenhouse_agency_faq'){
  unset($s['f001_destino'],$s['f002_icono_tabler'],$s['f010_texto']);
  $s['f009_descripcion']='Conversemos sobre tu pregunta en una reunión de 30 minutos.';$changed[]=$node['id'];
 }
 if($type==='greenhouse_agency_comparison'){
  $s['f063_texto']='Marketing, tecnología y datos.';$s['f064_descripcion']=' Conectados en una misma operación.';$changed[]=$node['id'];
 }
 if($type==='greenhouse_agency_servicios'){
  $matches=0;foreach($s['services'] as &$row)if(($row['_id']??'')==='61841ad'&&($row['_layout']??'')==='layout_4'){$row['icon_media']=['url'=>set_url_scheme(EO_Agency_Landing_Base_Widget::asset_url('@agency/hubspot.svg'),'https'),'id'=>0];$matches++;}unset($row);
  if($matches!==1)WP_CLI::error('CRM row identity mismatch.');$changed[]=$node['id'];
 }
 unset($s);
}unset($container,$node);
if(count($changed)!==3)WP_CLI::error('Expected three target widgets.');
$snapshot='_gh_home_followup_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Decoded Elementor readback differs; inspect before retry.');
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'changedWidgets'=>$changed,'protectedUnchanged'=>true],JSON_PRETTY_PRINT);
