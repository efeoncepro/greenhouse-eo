<?php
/** Operator-requested copy-only edit; existing native Elementor text controls. */
if (!defined('ABSPATH') || !class_exists('WP_CLI')) exit;
$id=251731;$expected='b3dada4b994a67624ce5f85a441e1df99d347ecea2b5fd2cb6f72f99c824911e';
$raw=get_post_meta($id,'_elementor_data',true);
if((int)get_option('page_on_front')!==$id||get_post_status($id)!=='publish'||!hash_equals($expected,hash('sha256',$raw)))WP_CLI::error('Home drift; inspect before retry.');
$doc=\Elementor\Plugin::$instance->documents->get($id);$original=json_decode($raw,true);$elements=$original;$settings=$doc->get_settings();
$protected=function()use($id){$out=['pages'=>[],'meta'=>[]];foreach([2791,251300,250265,250816] as $other)$out['pages'][$other]=hash('sha256',get_post_meta($other,'_elementor_data',true));foreach(get_post_meta($id) as $k=>$v)if(strpos($k,'page_header')===0||strpos($k,'page_footer')===0||strpos($k,'_yoast_wpseo_')===0||in_array($k,['_thumbnail_id','_wp_page_template','_elementor_page_settings'],true))$out['meta'][$k]=$v;return $out;};
$before=$protected();$changes=[];
$replacements=[
 'greenhouse_agency_problem'=>['f005_texto','El problema · diagnóstico','El costo de trabajar por separado'],
 'greenhouse_agency_reframe'=>['f001_texto','El reencuadre','Un equipo. Una misma dirección.'],
];
foreach($elements as &$container)foreach($container['elements'] as &$node){
 $type=$node['widgetType']??'';if(!isset($replacements[$type]))continue;
 [$field,$old,$new]=$replacements[$type];
 if(trim($node['settings'][$field]??'')!==$old)WP_CLI::error('Copy drift: '.$type);
 $node['settings'][$field]=$new;$changes[]=['widget'=>$node['id'],'field'=>$field,'before'=>$old,'after'=>$new];
}unset($container,$node);
if(count($changes)!==2)WP_CLI::error('Expected exactly two labels.');
$snapshot='_gh_home_narrative_labels_'.gmdate('Ymd_His');
if(!add_option($snapshot,['post'=>get_post($id,ARRAY_A),'elements'=>$original,'settings'=>$settings,'protected'=>$before],'',false))WP_CLI::error('Snapshot failed.');
$doc->save(['elements'=>$elements,'settings'=>$settings]);
if(isset($before['meta']['_thumbnail_id'][0]))update_post_meta($id,'_thumbnail_id',$before['meta']['_thumbnail_id'][0]);
if($before!==$protected())WP_CLI::error('Protected metadata drift; snapshot '.$snapshot);
if(json_decode(get_post_meta($id,'_elementor_data',true),true)!==$elements)WP_CLI::error('Readback differs; inspect snapshot '.$snapshot);
\Elementor\Plugin::$instance->files_manager->clear_cache();clean_post_cache($id);
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
echo wp_json_encode(['status'=>'saved_verified','snapshot'=>$snapshot,'hash'=>hash('sha256',get_post_meta($id,'_elementor_data',true)),'changes'=>$changes,'protectedUnchanged'=>true],JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE);
