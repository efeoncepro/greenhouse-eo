<?php
/** Native WordPress widgets only. Inputs: payload.json, then assets in payload order. */
function eo_hash($v) { return hash('sha256', wp_json_encode($v)); }
function eo_assert($ok, $message) { if (!$ok) throw new Exception($message); }
$p=json_decode(file_get_contents($args[0]),true,512,JSON_THROW_ON_ERROR);
eo_assert(get_option('home')===$p['home'] && (int)get_option('page_on_front')===$p['frontId'],'site_identity_drift');
eo_assert(current_user_can('edit_theme_options') && current_user_can('upload_files'),'missing_permission');
$key='eo_footer_refresh_20261014_v1';
$blocks=get_option('widget_block');$sidebars=get_option('sidebars_widgets');
$snapshot=get_option($key);
$mode=$p['mode']??'readback';
if($mode==='apply' && !$snapshot){
 eo_assert(eo_hash($sidebars)===$p['expectedSidebarsHash'],'sidebars_drift');
 foreach($p['expectedWidgets'] as $id=>$hash)eo_assert(eo_hash($blocks[(int)$id])===$hash,'widget_drift_'.$id);
 eo_assert(($sidebars['ohio-sidebar-footer-4']??[])===['block-14','block-34'],'unexpected_sidebar4');
 $protected=[];
 foreach($sidebars as $sid=>$ids)if(strpos($sid,'ohio-sidebar-footer-')===0)foreach($ids as $id){
  preg_match('/^(.*)-(\d+)$/',$id,$m);
  if($id!=='block-34' && $id!=='block-45')$protected[$id]=eo_hash(get_option('widget_'.$m[1])[(int)$m[2]]);
 }
 $snapshot=['createdAt'=>gmdate('c'),'before'=>['blocks'=>[34=>$blocks[34],45=>$blocks[45]],'sidebars'=>$sidebars], 'protected'=>$protected,'frontHash'=>eo_hash([get_post($p['frontId'])->post_content,get_post_meta($p['frontId'],'_elementor_data',true),get_post_meta($p['frontId'],'_elementor_page_settings',true)]),'templateHash'=>hash_file('sha256',get_stylesheet_directory().'/parts/elements/footer.php'),'state'=>'prepared'];
 eo_assert(add_option($key,$snapshot,'',false),'snapshot_already_exists');
}
eo_assert(is_array($snapshot),'snapshot_missing');
if($mode==='apply' && $snapshot['state']==='prepared'){
 eo_assert(eo_hash($sidebars)===$p['expectedSidebarsHash'],'sidebars_drift_before_write');
 foreach($p['expectedWidgets'] as $id=>$hash)eo_assert(eo_hash($blocks[(int)$id])===$hash,'widget_drift_before_write_'.$id);
 require_once ABSPATH.'wp-admin/includes/file.php';require_once ABSPATH.'wp-admin/includes/media.php';require_once ABSPATH.'wp-admin/includes/image.php';
 $render=$p['partners'];$media=[];
 foreach($p['assets'] as $i=>$asset){
  eo_assert(isset($args[$i+1]) && hash_file('sha256',$args[$i+1])===$asset['sha256'],'asset_hash_mismatch_'.$asset['key']);
  $found=get_posts(['post_type'=>'attachment','post_status'=>'inherit','posts_per_page'=>1,'meta_key'=>'_eo_footer_asset_sha256','meta_value'=>$asset['sha256'],'fields'=>'ids']);
  $id=$found[0]??null;
  if(!$id){$tmp=wp_tempnam($asset['file']);eo_assert(copy($args[$i+1],$tmp),'asset_copy_failed');$id=media_handle_sideload(['name'=>$asset['file'],'tmp_name'=>$tmp],0,$asset['name'].' — firma corporativa v3.1');eo_assert(!is_wp_error($id),'asset_upload_failed');update_post_meta($id,'_eo_footer_asset_sha256',$asset['sha256']);update_post_meta($id,'_wp_attachment_image_alt',$asset['name']);}
  $url=wp_get_attachment_url($id);eo_assert((bool)$url,'asset_url_missing');
  $media[]=['id'=>(int)$id,'key'=>$asset['key'],'url'=>$url,'sha256'=>$asset['sha256']];$render=str_replace('{{'.$asset['key'].'}}',$url,$render);
 }
 eo_assert(strpos($render,'{{')===false,'unresolved_placeholder');
 // Store the exact intended state before writes: readback detects partial completion on errors.
 $after=[34=>array_replace($blocks[34],['content'=>$render]),45=>array_replace($blocks[45],['content'=>$p['navigation']])];
 $snapshot['after']=$after;$snapshot['media']=$media;update_option($key,$snapshot,false);
 $fresh=get_option('widget_block');foreach($p['expectedWidgets'] as $id=>$hash)eo_assert(eo_hash($fresh[(int)$id])===$hash,'concurrent_widget_edit_'.$id);
 foreach($after as $id=>$value)$fresh[$id]=$value;update_option('widget_block',$fresh);
 $freshSidebars=get_option('sidebars_widgets');eo_assert(eo_hash($freshSidebars)===$p['expectedSidebarsHash'],'concurrent_sidebar_edit');
 $freshSidebars['ohio-sidebar-footer-4']=['block-34'];update_option('sidebars_widgets',$freshSidebars);
 $snapshot['state']='applied';$snapshot['appliedAt']=gmdate('c');update_option($key,$snapshot,false);
}
if($mode==='rollback'){
 eo_assert($snapshot['state']==='applied','rollback_state_guard');$fresh=get_option('widget_block');
 foreach($snapshot['after'] as $id=>$v)eo_assert(eo_hash($fresh[$id])===eo_hash($v),'rollback_widget_drift_'.$id);
 $ss=get_option('sidebars_widgets');eo_assert($ss['ohio-sidebar-footer-4']===['block-34'],'rollback_sidebar_drift');
 foreach($snapshot['before']['blocks'] as $id=>$v)$fresh[$id]=$v;update_option('widget_block',$fresh);
 $ss['ohio-sidebar-footer-4']=$snapshot['before']['sidebars']['ohio-sidebar-footer-4'];update_option('sidebars_widgets',$ss);
 $snapshot['state']='rolled_back';update_option($key,$snapshot,false);
}
$blocks=get_option('widget_block');$ss=get_option('sidebars_widgets');$checks=[];
foreach($snapshot['protected'] as $id=>$hash){preg_match('/^(.*)-(\d+)$/',$id,$m);$checks[$id]=eo_hash(get_option('widget_'.$m[1])[(int)$m[2]])===$hash;}
foreach($snapshot['before']['sidebars'] as $sid=>$value)if($sid!=='ohio-sidebar-footer-4')$checks['sidebar:'.$sid]=eo_hash($ss[$sid])===eo_hash($value);
$checks['front']=eo_hash([get_post($p['frontId'])->post_content,get_post_meta($p['frontId'],'_elementor_data',true),get_post_meta($p['frontId'],'_elementor_page_settings',true)])===$snapshot['frontHash'];
$checks['template']=hash_file('sha256',get_stylesheet_directory().'/parts/elements/footer.php')===$snapshot['templateHash'];
$expected=$snapshot['state']==='rolled_back'?$snapshot['before']['blocks']:($snapshot['after']??[]);
foreach($expected as $id=>$value)$checks['owned:'.$id]=eo_hash($blocks[$id])===eo_hash($value);
$checks['sidebar4']=$ss['ohio-sidebar-footer-4']===($snapshot['state']==='rolled_back'?$snapshot['before']['sidebars']['ohio-sidebar-footer-4']:['block-34']);
echo wp_json_encode(['snapshotOption'=>$key,'state'=>$snapshot['state'],'checks'=>$checks,'allChecksPass'=>!in_array(false,$checks,true),'ownedHashes'=>[34=>eo_hash($blocks[34]),45=>eo_hash($blocks[45])],'media'=>$snapshot['media']??[]],JSON_PRETTY_PRINT|JSON_UNESCAPED_SLASHES);
eo_assert(!in_array(false,$checks,true),'readback_failed_do_not_retry_apply');
