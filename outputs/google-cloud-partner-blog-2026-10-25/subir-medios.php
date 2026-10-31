<?php
// Reviewed new-media batch, idempotent per article manifest + role + source fingerprint.
if(!defined('ABSPATH')||!class_exists('WP_CLI'))exit;
require_once ABSPATH.'wp-admin/includes/file.php';
require_once ABSPATH.'wp-admin/includes/image.php';
require_once ABSPATH.'wp-admin/includes/media.php';
$config=json_decode(file_get_contents($args[0]??''),true);
if(!$config||($config['manifest']??'')!=='efeonce-google-cloud-partner-announcement'||count($args)!==1+count($config['assets']))WP_CLI::error('Invalid reviewed asset batch.');
if(!current_user_can('upload_files')||!user_can(1,'edit_posts'))WP_CLI::error('Media/author capabilities missing.');
$plan=array();
foreach($config['assets']as$i=>$a){
 $file=$args[$i+1];$size=getimagesize($file);
 if(!in_array($a['role'],array('cover','opening'),true)||!hash_equals($a['sha256'],hash_file('sha256',$file))||$size[0]!==$a['width']||$size[1]!==$a['height']||$size['mime']!==$a['mime'])WP_CLI::error('Asset precondition failed.');
 $existing=get_posts(array('post_type'=>'attachment','post_status'=>'inherit','numberposts'=>2,'meta_query'=>array(array('key'=>'_greenhouse_asset_manifest','value'=>$config['manifest']),array('key'=>'_greenhouse_asset_role','value'=>$a['role']))));
 if(count($existing)>1)WP_CLI::error('Ambiguous existing asset.');
 if($existing&&get_post_meta($existing[0]->ID,'_greenhouse_asset_sha256',true)!==$a['sha256'])WP_CLI::error('Asset role already has another source fingerprint.');
 $plan[]=array('role'=>$a['role'],'existing'=>$existing?(int)$existing[0]->ID:0,'file'=>$file,'asset'=>$a);
}
if(($config['mode']??'dry-run')!=='apply'){echo wp_json_encode(array('mode'=>'dry-run','assets'=>array_map(static fn($p)=>array('role'=>$p['role'],'existing'=>$p['existing'],'sha256'=>$p['asset']['sha256']),$plan)),JSON_PRETTY_PRINT);return;}
$receipt=array('manifest'=>$config['manifest'],'assets'=>array());
foreach($plan as$p){
 $a=$p['asset'];$id=$p['existing'];
 if(!$id){
  $tmp=wp_tempnam($a['filename']);copy($p['file'],$tmp);
  $id=media_handle_sideload(array('name'=>$a['filename'],'tmp_name'=>$tmp),0,$a['title'],array('post_author'=>1,'post_excerpt'=>$a['caption'],'post_content'=>'Illustration created with AI assistance for the Efeonce Google partnership announcement.'));
  if(is_wp_error($id))WP_CLI::error('Upload failed for '.$a['role']);
  update_post_meta($id,'_wp_attachment_image_alt',wp_slash($a['alt']));
  update_post_meta($id,'_greenhouse_asset_manifest',$config['manifest']);
  update_post_meta($id,'_greenhouse_asset_role',$a['role']);
  update_post_meta($id,'_greenhouse_asset_sha256',$a['sha256']);
 }
 $md=wp_get_attachment_metadata($id);
 if((int)$md['width']!==$a['width']||(int)$md['height']!==$a['height']||get_post_mime_type($id)!==$a['mime'])WP_CLI::error('Media readback mismatch.');
 $receipt['assets'][]=array('role'=>$a['role'],'id'=>(int)$id,'url'=>wp_get_attachment_url($id),'alt'=>get_post_meta($id,'_wp_attachment_image_alt',true),'width'=>(int)$md['width'],'height'=>(int)$md['height'],'mime'=>get_post_mime_type($id),'sourceSha256'=>$a['sha256'],'outcome'=>$p['existing']?'reused':'created');
}
echo wp_json_encode($receipt,JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);
