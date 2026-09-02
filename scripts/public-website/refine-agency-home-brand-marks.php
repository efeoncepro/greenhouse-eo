<?php
/** Operator brand review: official Greenhouse/Globe Media only; preserve all copy. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='0e09940d8697b456bd9b3cee971a6a8ccfdf7b4b6eb2b428939224d7c19d6fcd';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw)))WP_CLI::error('Home drift; inspect before retry.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$registered=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach(['ecosystem'] as $module)if(!isset($registered['greenhouse_agency_'.$module]))WP_CLI::error('Required native widget missing.');
$protected=function()use($id){$out=['oldHome'=>hash('sha256',get_post_meta(2791,'_elementor_data',true)),'social'=>hash('sha256',get_post_meta(251300,'_elementor_data',true)),'meta'=>[]];foreach(get_post_meta($id) as $k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$changed=[];
foreach($elements as &$container)foreach($container['elements'] as &$node){
 $type=$node['widgetType']??'';$s=&$node['settings'];
 if($type==='greenhouse_agency_ecosystem'){
  if($node['id']!=='861a6e9')WP_CLI::error('Ecosystem identity mismatch.');
  $s['f001_imagen']=['url'=>set_url_scheme(EO_Agency_Landing_Base_Widget::asset_url('@agency/greenhouse-mark-negative.svg'),'https'),'id'=>0];
  $s['globe_logo']=['url'=>set_url_scheme(EO_Agency_Landing_Base_Widget::asset_url('@agency/globe-mark-negative.svg'),'https'),'id'=>0];
  unset($s['f005_icono_tabler']);$changed[]=$node['id'];
 }
 unset($s);
}unset($container,$node);
if(count($changed)!==1)WP_CLI::error('Expected one ecosystem widget.');
$snapshot='_gh_home_brand_marks_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Decoded Elementor readback differs; inspect before retry.');
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'changedWidgets'=>$changed,'protectedUnchanged'=>true],JSON_PRETTY_PRINT);
