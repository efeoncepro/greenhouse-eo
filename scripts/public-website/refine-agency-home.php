<?php
/** Apply the six operator annotations to the existing native Elementor Home only. */
if ( ! defined('ABSPATH') || ! class_exists('WP_CLI') ) { exit; }
$id=251731;
$expected='d7cfbe17b45a55cacc7360122735fc44da61aefdc5159d33af2e8e3cd079ea9f';
$raw=get_post_meta($id,'_elementor_data',true);
if ((int)get_option('page_on_front')!==$id || get_post_status($id)!=='publish' || !hash_equals($expected,hash('sha256',$raw))) { WP_CLI::error('Home identity/content drift. Inspect before retrying.'); }
$doc=\Elementor\Plugin::$instance->documents->get($id);
$registered=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();
foreach(['trust','work','stack','agenda'] as $module)if(!isset($registered['greenhouse_agency_'.$module]))WP_CLI::error('Required Elementor widget is not registered.');
$elements=json_decode($raw,true);
$original=$elements;
$page_settings=$doc->get_settings();
$protected=function()use($id){
 $out=['home'=>(int)get_option('page_on_front'),'oldHome'=>hash('sha256',get_post_meta(2791,'_elementor_data',true)),'social'=>hash('sha256',get_post_meta(251300,'_elementor_data',true)),'meta'=>[]];
 foreach(get_post_meta($id) as $k=>$v)if((strpos($k,'ohio')!==false||strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_wp_page_template','_thumbnail_id','_elementor_page_settings'],true)))$out['meta'][$k]=$v;
 return $out;
};
$before=$protected();
$rows=[
 [[248637,'SKY · Campaña'],[248778,'Bresler · Campaña'],[248638,'Gobierno de Santiago · Campaña'],[246382,'Mirador San Pablo · Oficinas'],[246383,'Flick · Despacho']],
 [[246351,'Eusari · Email marketing'],[247008,'Fivest · Campaña'],[246377,'Lipigas · Campaña'],[248793,'Ghamadent · Sitio web'],[246364,'Flick · Comercio electrónico']]
];
$oldHome=get_post_meta(2791,'_elementor_data',true);
foreach($rows as $row)foreach($row as [$attachment,$label]){
 $url=wp_get_attachment_url($attachment);
 if(!$url||strpos($url,'https://efeoncepro.com/wp-content/uploads/')!==0||strpos(stripslashes($oldHome),(string)$attachment)===false)WP_CLI::error('Attachment provenance guard failed.');
 $m=wp_get_attachment_metadata($attachment);
 if(empty($m['width'])||$m['width']<$m['height'])WP_CLI::error('Expected landscape carousel artwork.');
}
$found=[];
$walk=function(&$nodes)use(&$walk,&$found,$rows){foreach($nodes as &$node){
 $type=$node['widgetType']??'';
 if(strpos($type,'greenhouse_agency_')===0){
  $module=str_replace('_','-',substr($type,strlen('greenhouse_agency_')));
  if(in_array($module,['trust','work','stack','agenda'],true)){
   if(isset($found[$module]))WP_CLI::error('Duplicate target module.');
   $s=&$node['settings'];$found[$module]=$node['id'];
   if($module==='trust'){$s['logo_speed']='slow';$s['logo_density']='compact';unset($s['brands'],$s['f002_texto']);}
   if($module==='stack'){$s['hubspot_logo']=['url'=>set_url_scheme(EO_Agency_Landing_Base_Widget::asset_url('@agency/hubspot.svg'),'https'),'id'=>0];unset($s['f011_icono_tabler']);}
   if($module==='agenda'){
    $d=EO_Agency_Landing_Base_Widget::definition('agenda');$keys=array_column($d['fields'],'key');
    foreach(array_keys($s) as $key)if(preg_match('/^f\d+_/',$key)&&!in_array($key,$keys,true))unset($s[$key]);
    $s['meeting_url']=['url'=>'https://efeoncepro.com/agenda/','is_external'=>'','nofollow'=>''];
   }
   if($module==='work')foreach($rows as $index=>$items){
    $key='work_'.$index;$existing=$s[$key];$s[$key]=[];
    foreach($items as $i=>[$attachment,$label]){
     $item=$existing[$i];$item['f001_multimedia']=['id'=>$attachment,'url'=>wp_get_attachment_url($attachment)];
     $item['row_label']=$label;$item['f002_texto']=$label;$item['media_alt']=$label;$s[$key][]=$item;
    }
   }
   unset($s);
  }
 }
 if(!empty($node['elements']))$walk($node['elements']);
}unset($node);};
$walk($elements);
if(count($found)!==4)WP_CLI::error('Expected four existing editable modules.');
$snapshot='_gh_home_review_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$page_settings,'protected'=>$before], '', false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$page_settings]);
// Elementor synchronizes the featured image even when this mutation only changes widgets.
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
$saved=json_decode(get_post_meta($id,'_elementor_data',true),true);
if($before!==$protected())WP_CLI::error('Protected settings drift. Restore snapshot '.$snapshot);
if($saved!==$elements)WP_CLI::error('Elementor decoded readback differs. Inspect snapshot '.$snapshot);
\Elementor\Plugin::$instance->files_manager->clear_cache();
clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);
WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','postId'=>$id,'snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'workImages'=>10,'modules'=>$found,'protectedUnchanged'=>true],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES).PHP_EOL;
