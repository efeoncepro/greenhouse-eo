<?php
/** Four published, corresponding landings. Eight other cards remain unlinked. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='a2353611fe5f0346779410c1cdcd0d2ca9a3428dc3ba5a195a260f7ca6941601';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw)))WP_CLI::error('Home drift; inspect before retry.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$widget=\Elementor\Plugin::$instance->widgets_manager->get_widget_types('greenhouse_agency_servicios');
$controls=$widget?$widget->get_controls():[];
if(($controls['services']['fields']['landing_link']['type']??'')!=='url')WP_CLI::error('Native landing URL control missing.');
$mapping=['1f26a48'=>['SEO y AEO',251078],'da9da52'=>['Contenido y creatividad',251279],'61841ad'=>['CRM y automation',244079],'e1a4b68'=>['Desarrollo web y CMS',250816]];
foreach($mapping as [$title,$target])if(get_post_status($target)!=='publish')WP_CLI::error('Destination not published: '.$target);
$protected=function()use($id){$out=['pages'=>[],'meta'=>[]];foreach([2791,251300,250265,250816,251078,251279,244079]as$other)$out['pages'][$other]=hash('sha256',get_post_meta($other,'_elementor_data',true));foreach(get_post_meta($id)as$k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$changes=[];$matched=0;
foreach($elements as &$container)foreach($container['elements'] as &$node){
 if(($node['widgetType']??'')!=='greenhouse_agency_servicios')continue;
 if($node['id']!=='2deaab2'||count($node['settings']['services'])!==12)WP_CLI::error('Service identity/count drift.');
 $matched++;
 foreach($node['settings']['services'] as &$row){
  if(!isset($mapping[$row['_id']]))continue;
  [$title,$target]=$mapping[$row['_id']];if($row['f004_subtitulo']!==$title||!empty($row['landing_link']['url']))WP_CLI::error('Service row drift: '.$row['_id']);
  $url=set_url_scheme(get_permalink($target),'https');$row['landing_link']=['url'=>$url,'is_external'=>'','nofollow'=>''];$changes[]=['title'=>$title,'target'=>$target,'url'=>$url];
 }unset($row);
}unset($container,$node);
if($matched!==1||count($changes)!==4)WP_CLI::error('Expected exactly four links in one services widget.');
$snapshot='_gh_home_service_links_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Readback differs; inspect snapshot '.$snapshot);
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'links'=>$changes,'protectedUnchanged'=>true],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
