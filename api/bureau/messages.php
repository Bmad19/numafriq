<?php require_once __DIR__ . '/helpers.php'; db_init();
$method=$_SERVER['REQUEST_METHOD']; $action=$_GET['action']??''; $since=(int)($_GET['since']??0);

if ($method==='GET' && $action==='list') {
    auth_required();
    $db=get_db();
    $q = $since
        ? "SELECT m.*,u.full_name as sender_name,u.avatar FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id>? ORDER BY m.created_at ASC"
        : "SELECT m.*,u.full_name as sender_name,u.avatar FROM messages m JOIN users u ON u.id=m.sender_id ORDER BY m.created_at ASC LIMIT 100";
    $s=$db->prepare($q);
    $since ? $s->execute([$since]) : $s->execute([]);
    json_out($s->fetchAll());
}
if ($method==='POST' && $action==='send') {
    $me=auth_required(); $b=body();
    if (!trim($b['content']??'')) json_out(['error'=>'Message vide'],400);
    $db=get_db();
    $db->prepare("INSERT INTO messages (sender_id,channel,content) VALUES (?,?,?)")->execute([$me['id'],$b['channel']??'general',trim($b['content'])]);
    $id=$db->lastInsertId();
    $msg=$db->prepare("SELECT m.*,u.full_name as sender_name,u.avatar FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?");
    $msg->execute([$id]);
    json_out(['success'=>true,'message'=>$msg->fetch()]);
}
json_out(['error'=>'Action non trouvée'],404);
