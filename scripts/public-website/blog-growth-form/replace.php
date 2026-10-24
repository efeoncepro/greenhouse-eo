<?php
/** Blog subscription-only cutover. Inputs: guarded spec.json, page-scoped host.css. */
if (!defined('ABSPATH') || count($args ?? []) !== 2) { throw new Exception('Expected spec and CSS files'); }
$spec=json_decode(file_get_contents($args[0]),true);$css=file_get_contents($args[1]);
$id=18456;$target='4246f0d';
if(get_post_type($id)!=='page'||get_post_status($id)!=='publish'||get_post_field('post_name',$id)!=='blog')throw new Exception('Page identity drift');
$raw=get_post_meta($id,'_elementor_data',true);$hash=hash('sha256',$raw);
if(!hash_equals($spec['expectedDataSha']??'',$hash))throw new Exception('Tree drift: '.$hash);
if(strpos($css,'.eo-blog-subscription')===false||preg_match('/<\/?(style|script)/i',$css))throw new Exception('Invalid CSS');
$tree=json_decode($raw,true);$before=$tree;$found=0;$original=null;
$html='<style>'.$css.'</style><div class="eo-growth-form eo-blog-subscription" id="suscripcion"><greenhouse-form form-key="6bc62588-a4a0-4214-9501-13b0c2948c81" surface="fhsf-efeonce-blog-subscription" locale="es-CL" appearance="bare" color-scheme="light" base-url="https://greenhouse.efeoncepro.com">Activa JavaScript para cargar el formulario de suscripción.</greenhouse-form></div><script>(function(){if(!customElements.get("greenhouse-form")&&!document.querySelector("script[src*=\"growth-forms/renderer\"]")){var s=document.createElement("script");s.src="https://greenhouse.efeoncepro.com/growth-forms/renderer-latest.js";s.defer=true;document.head.appendChild(s);}})();</script>';
$change=function(&$nodes)use(&$change,&$found,&$original,$target,$html){foreach($nodes as &$n){if(($n['id']??'')===$target){$found++;$original=$n;if(($n['widgetType']??'')!=='ohio_contact_form'||($n['settings']['form']??'')!=='17852')throw new Exception('Target identity drift');$n['widgetType']='html';$n['settings']=['html'=>$html];}if(!empty($n['elements']))$change($n['elements']);}};$change($tree);if($found!==1)throw new Exception('Expected one target');
$widgets=\Elementor\Plugin::$instance->widgets_manager->get_widget_types();$types=[];
$preflight=function($nodes)use(&$preflight,&$types,$widgets){foreach($nodes as $n){if(isset($n['widgetType'])){$type=$n['widgetType'];if(!isset($widgets[$type]))throw new Exception('Unknown widget '.$type);$widgets[$type]->get_controls();$instance=\Elementor\Plugin::$instance->elements_manager->create_element_instance($n);if(!$instance)throw new Exception('No instance '.$type);ob_start();try{$instance->print_element();}finally{ob_end_clean();}$types[$type]=true;}if(!empty($n['elements']))$preflight($n['elements']);}};$preflight($tree);
$doc=\Elementor\Plugin::$instance->documents->get($id,false);$settings=$doc->get_settings();$thumb=get_post_thumbnail_id($id);
$metas=[];foreach(array_keys(get_post_meta($id)) as $k){if(preg_match('/^(page_|_page_|_yoast_|_thumbnail_id$)/',$k))$metas[$k]=get_post_meta($id,$k,true);}
$shell=[];foreach(['page_on_front','sidebars_widgets','widget_block','theme_mods_ohio-child','ohio_options'] as $k)$shell[$k]=get_option($k);
$cf7hash=hash('sha256',get_post_meta(17852,'_form',true));$footerhash=hash('sha256',get_post_meta(242255,'_form',true));
$report=['pageId'=>$id,'target'=>$target,'beforeSha'=>$hash,'preflightTypes'=>array_keys($types),'dryRun'=>empty($spec['apply'])];
if(empty($spec['apply'])){echo wp_json_encode($report,JSON_PRETTY_PRINT);return;}
if(($spec['workerCompatible']??false)!==true||($spec['publishedFormVerified']??false)!==true||($spec['measurementVerified']??false)!==true)throw new Exception('Activation gates missing');
$snapshot=['elementor_data'=>$raw,'settings'=>$settings,'raw_settings'=>get_post_meta($id,'_elementor_page_settings',true),'controls_usage'=>get_post_meta($id,'_elementor_controls_usage',true),'post_content'=>get_post_field('post_content',$id),'thumbnail'=>$thumb,'metas'=>$metas,'target'=>$original,'created_at'=>gmdate('c')];
$name='_gh_blog_subscription_before_'.gmdate('Ymd_His');if(!add_option($name,$snapshot,'',false))throw new Exception('Snapshot failed');
if($thumb)$settings['post_featured_image']=['id'=>$thumb,'url'=>wp_get_attachment_url($thumb)];
if(false===$doc->save(['elements'=>$tree,'settings'=>$settings]))throw new Exception('Save failed; snapshot '.$name);
clean_post_cache($id);if($thumb&&get_post_thumbnail_id($id)!=$thumb)set_post_thumbnail($id,$thumb);
$actual=json_decode(get_post_meta($id,'_elementor_data',true),true);
if($actual!=$tree)throw new Exception('Saved tree differs; inspect snapshot '.$name.' before retry');
foreach($metas as $k=>$v)if(get_post_meta($id,$k,true)!=$v)throw new Exception('Protected meta drift '.$k.' snapshot '.$name);
$afterSettings=$doc->get_settings();foreach($snapshot['settings'] as $k=>$v){if($k!=='post_featured_image'&&($afterSettings[$k]??null)!=$v)throw new Exception('Settings drift '.$k.' snapshot '.$name);}
foreach($shell as $k=>$v)if(get_option($k)!==$v)throw new Exception('Shell drift '.$k);
if($cf7hash!==hash('sha256',get_post_meta(17852,'_form',true))||$footerhash!==hash('sha256',get_post_meta(242255,'_form',true)))throw new Exception('CF7 drift');
\Elementor\Plugin::$instance->files_manager->clear_cache();
WP_CLI::runcommand('cache flush',['return'=>true]);WP_CLI::runcommand('kinsta cache purge --all',['return'=>true]);
$report+=['status'=>'saved_verified','snapshot'=>$name,'afterSha'=>hash('sha256',get_post_meta($id,'_elementor_data',true))];
echo wp_json_encode($report,JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
