<?php
require_once __DIR__ . '/helpers.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    json_out(['error' => 'Méthode non autorisée'], 405);
}

auth_required();

$apiKey = getenv('GROQ_API_KEY') ?: '';
if ($apiKey === '') {
    json_out(['error' => 'Assistant non configuré (variable serveur GROQ_API_KEY)'], 503);
}

$b        = body();
$modeRaw  = $b['mode'] ?? 'assist';
$mode     = $modeRaw === 'memo_litige' ? 'memo_litige' : 'assist';
$messages = is_array($b['messages'] ?? null) ? $b['messages'] : [];
$summary  = isset($b['dossier_summary']) ? (string)$b['dossier_summary'] : '';

function kb_concat(): string
{
    $dir = __DIR__ . DIRECTORY_SEPARATOR . 'kb';
    if (!is_dir($dir)) {
        return '';
    }
    $files = [];
    foreach (scandir($dir) ?: [] as $f) {
        if (substr((string)$f, -3) !== '.md') {
            continue;
        }
        $files[] = $f;
    }
    sort($files);
    $parts = [];
    foreach ($files as $f) {
        $p = file_get_contents($dir . DIRECTORY_SEPARATOR . $f);
        if ($p !== false && $p !== '') {
            $parts[] = $p;
        }
    }
    return implode("\n\n---\n\n", $parts);
}

$kb = kb_concat();

$sanitized = [];
foreach ($messages as $m) {
    if (!is_array($m) || !isset($m['role'], $m['content'])) {
        continue;
    }
    $role = ($m['role'] === 'assistant') ? 'assistant' : 'user';
    $txt  = (string)$m['content'];
    if (function_exists('mb_substr')) {
        $txt = mb_substr($txt, 0, 14000);
    } else {
        $txt = substr($txt, 0, 14000);
    }
    $sanitized[] = ['role' => $role, 'content' => $txt];
}

$sanitized = array_slice($sanitized, -22);
if (!$sanitized || $sanitized[array_key_last($sanitized)]['role'] !== 'user') {
    json_out(['error' => 'Fournissez au moins un message utilisateur en fin de conversation.'], 422);
}

$dossBlock = '';
if ($summary !== '') {
    if (function_exists('mb_strlen') && function_exists('mb_substr')) {
        $dossBlock = mb_strlen($summary) > 20000 ? mb_substr($summary, 0, 20000) : $summary;
    } else {
        $dossBlock = strlen($summary) > 20000 ? substr($summary, 0, 20000) : $summary;
    }
}

$prudence = '# Rappels de prudence'
    . "\n- L’outil propose des **brouillons** ou pistes rédactionnelles ; pas de décision automatique sans relecture humaine."
    . "\n- Ne pas présenter comme définitives les références légales ou jurisprudentielles sans **vérifier** sur sources officielles."
    . "\n- Synthèses internes (non exhaustives) :\n\n"
    . (trim((string)$kb) !== '' ? trim($kb) . "\n\n---\n\n" : '');

if ($mode === 'memo_litige') {
    $system = $prudence
        . "Tu aides l’équipe à produire un **brouillon** de mémo argumenté ou de note de synthèse (contentieux ou stratégique).\n"
        . "- Réponds **en français** sauf indication contraire.\n"
        . '- Structure : problématiques, faits, régime pertinent, arguments / contre‑arguments envisageables, demandes, liste des pièces à contrôler.';
    if ($dossBlock !== '') {
        $system .= "\n\n## Contexte fourni dans l’espace bureau\n\n" . $dossBlock . "\n";
    }
} else {
    $system = $prudence
        . "Tu es un assistant rédactionnel pour l'espace bureau **NUMAFRIQ**.\n"
        . "- Projets digitaux : mails, plans, présentations, check‑lists livrables, suivis.\n"
        . "- Réponses utiles puis détaillables ; ton cordial.\n";
}

$upstreamMsgs = [['role' => 'system', 'content' => $system]];
foreach ($sanitized as $row) {
    $upstreamMsgs[] = $row;
}

$payload = json_encode([
    'model'       => 'llama-3.3-70b-versatile',
    'messages'    => $upstreamMsgs,
    'temperature' => $mode === 'memo_litige' ? 0.35 : 0.45,
    'max_tokens'  => 8192,
], JSON_UNESCAPED_UNICODE);

if (!function_exists('curl_init')) {
    json_out(['error' => 'Extension CURL requise sur le serveur PHP'], 500);
}

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $apiKey,
    ],
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_TIMEOUT    => 120,
]);

$respBody = curl_exec($ch);
$curlErr  = curl_error($ch);
$status   = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($respBody === false) {
    json_out(['error' => 'Erreur réseau vers le modèle', 'detail' => $curlErr], 502);
}

$data = json_decode($respBody, true);
if ($status >= 400) {
    $hint = $data['error']['message'] ?? substr($respBody, 0, 200);
    json_out(['error' => 'Fournisseur LLM indisponible', 'detail' => $hint], 502);
}

$reply = $data['choices'][0]['message']['content'] ?? null;
if (!is_string($reply) || trim($reply) === '') {
    json_out(['error' => 'Réponse invalide du modèle'], 502);
}

json_out(['reply' => trim($reply), 'mode' => $mode]);
