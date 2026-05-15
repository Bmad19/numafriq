<?php
// ── NUMAFRIQ — Notifications WhatsApp ────────────────────────────────────────
// SOLUTION : Meta WhatsApp Cloud API (officielle, GRATUITE jusqu'à 1000 msg/mois)
//
// SETUP EN 5 MIN (1 seule fois) :
// 1. Allez sur https://developers.facebook.com
// 2. Créez une app "Business" → ajoutez le produit "WhatsApp"
// 3. Récupérez le "Token d'accès temporaire" et le "Phone Number ID"
// 4. Dans WhatsApp → API Setup, ajoutez +22656191930 comme numéro destinataire
// 5. Collez ci-dessous :
// ─────────────────────────────────────────────────────────────────────────────

define('META_ACCESS_TOKEN', '');       // Token Meta (commence par EAA...)
define('META_PHONE_NUMBER_ID', '');    // Phone Number ID (ex: 123456789012345)
define('WA_RECIPIENT',  '+22656191930'); // Votre numéro de réception
define('WA_PHONE_CLEAN', '22656191930'); // Sans le +

// ── Envoi via Meta WhatsApp Cloud API ────────────────────────────────────────
function sendWhatsApp(string $message): array {
    $link = 'https://wa.me/' . WA_PHONE_CLEAN . '?text=' . urlencode($message);

    // ── Si le token Meta est configuré ───────────────────────────────────────
    if (META_ACCESS_TOKEN !== '' && META_PHONE_NUMBER_ID !== '') {
        $url     = 'https://graph.facebook.com/v20.0/' . META_PHONE_NUMBER_ID . '/messages';
        $payload = json_encode([
            'messaging_product' => 'whatsapp',
            'to'                => WA_RECIPIENT,
            'type'              => 'text',
            'text'              => ['body' => $message],
        ]);

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => [
                'Authorization: Bearer ' . META_ACCESS_TOKEN,
                'Content-Type: application/json',
            ],
            CURLOPT_TIMEOUT        => 15,
        ]);

        $response = curl_exec($ch);
        $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error    = curl_error($ch);
        curl_close($ch);

        if (!$error && $code === 200) {
            return ['sent' => true, 'method' => 'meta_cloud_api'];
        }
        // Log l'erreur silencieusement
        error_log("WhatsApp Meta API erreur {$code}: " . $response);
    }

    // ── Fallback : log en base de données ────────────────────────────────────
    // (Le message sera consultable dans l'espace bureau)
    return ['sent' => false, 'method' => 'pending', 'wa_link' => $link];
}

// ── Templates de messages ─────────────────────────────────────────────────────
function waMsgContact(string $name, string $email, string $phone, string $service, string $budget, string $message): string {
    return "🔔 *Nouveau projet NUMAFRIQ*\n\n" .
           "👤 *Nom :* {$name}\n" .
           "📧 *Email :* {$email}\n" .
           "📞 *Tél :* {$phone}\n\n" .
           "🛠 *Service :* {$service}\n" .
           "💰 *Budget :* {$budget}\n\n" .
           "💬 *Message :*\n{$message}\n\n" .
           "⏰ " . date('d/m/Y H:i');
}

function waMsgClientRegister(string $name, string $email, string $company): string {
    return "✅ *Nouveau client NUMAFRIQ*\n\n" .
           "👤 *Nom :* {$name}\n" .
           "📧 *Email :* {$email}\n" .
           "🏢 *Entreprise :* " . ($company ?: 'Non précisé') . "\n\n" .
           "💬 Un client vient de créer son espace client.\n" .
           "⏰ " . date('d/m/Y H:i');
}

function waMsgClientMessage(string $clientName, string $content): string {
    return "💬 *Message client NUMAFRIQ*\n\n" .
           "👤 *De :* {$clientName}\n\n" .
           "📝 *Message :*\n{$content}\n\n" .
           "➡️ Répondez dans l'espace bureau.\n" .
           "⏰ " . date('d/m/Y H:i');
}

function waMsgChat(string $userName, string $userPhone, string $subject): string {
    return "🤖 *Lead via chat NUMAFRIQ*\n\n" .
           "👤 *Nom :* {$userName}\n" .
           "📞 *Tél :* {$userPhone}\n\n" .
           "🎯 *Sujet :* {$subject}\n\n" .
           "💡 Contact capturé via le chat IA NUMA.\n" .
           "⏰ " . date('d/m/Y H:i');
}

function waMsgCareerApplication(
    string $fullName,
    string $email,
    string $phone,
    string $position,
    string $contract,
    string $cvName
): string {
    return "📋 *Nouvelle candidature — Recrutements & placement*\n\n" .
           "👤 *Nom :* {$fullName}\n" .
           "📧 *Email :* {$email}\n" .
           "📞 *Tél :* {$phone}\n\n" .
           "💼 *Poste visé :* {$position}\n" .
           "📄 *Contrat :* {$contract}\n" .
           "📎 *CV :* {$cvName}\n\n" .
           "➡️ Fichier sur le serveur : dossier api/uploads/cvs/\n" .
           "⏰ " . date('d/m/Y H:i');
}
