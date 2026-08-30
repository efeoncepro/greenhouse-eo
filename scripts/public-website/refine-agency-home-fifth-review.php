<?php
/** Fifth operator review: product marks, remove Verk, hide launch, editable client avatars. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='fa8e73b18ea690d0e3fa6064cdf58c3b867d5728bed6d393dbe5edcbb89b47d2';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw)))WP_CLI::error('Home drift; inspect before retry.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$registered=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach(['ecosystem','hero'] as $module)if(!isset($registered['greenhouse_agency_'.$module]))WP_CLI::error('Required native widget missing.');
$protected=function()use($id){$out=['oldHome'=>hash('sha256',get_post_meta(2791,'_elementor_data',true)),'social'=>hash('sha256',get_post_meta(251300,'_elementor_data',true)),'aeo'=>hash('sha256',get_post_meta(250265,'_elementor_data',true)),'web'=>hash('sha256',get_post_meta(250816,'_elementor_data',true)),'meta'=>[]];foreach(get_post_meta($id) as $k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$changed=[];
foreach($elements as &$container)foreach($container['elements'] as &$node){
 $type=$node['widgetType']??'';$s=&$node['settings'];
 if($type==='greenhouse_agency_ecosystem'){
  if($node['id']!=='861a6e9')WP_CLI::error('Ecosystem identity mismatch.');
  foreach(['kortex_logo'=>'kortex-mark.svg','wave_logo'=>'wave-mark-negative.svg'] as $key=>$file)$s[$key]=['url'=>set_url_scheme(EO_Agency_Landing_Base_Widget::asset_url('@agency/'.$file),'https'),'id'=>0];
  foreach(['f003_icono_tabler','f004_icono_tabler','f006_icono_tabler','f022_texto','f023_texto','f024_texto','f025_descripcion'] as $key)unset($s[$key]);
  $s['show_launch_notice']='no';$changed[]=$node['id'];
 }
 if($type==='greenhouse_agency_hero'){
  foreach(['f026_texto','f027_texto','f028_texto','f029_texto'] as $key)unset($s[$key]);
  $definition=EO_Agency_Landing_Base_Widget::definition('hero');
  foreach(['proof_accessible_label','proof_density','proof_variant'] as $key)$s[$key]=$definition['defaults'][$key];
  foreach($definition['repeaters'] as $group)if($group['key']==='brands')$s['brands']=$group['defaults'];
  $changed[]=$node['id'];
 }
 unset($s);
}unset($container,$node);
if(count($changed)!==2)WP_CLI::error('Expected ecosystem and hero.');
$snapshot='_gh_home_fifth_review_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Decoded Elementor readback differs; inspect before retry.');
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'changedWidgets'=>$changed,'protectedUnchanged'=>true],JSON_PRETTY_PRINT);
