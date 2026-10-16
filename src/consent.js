// Page de consentement Capycom, servie par le Worker. Deux langues, aucun script, aucune ressource externe.

const TEXTES = {
  fr: {
    titre: 'Autoriser la connexion à Capycom',
    intro: (c) => `<strong>${c}</strong> demande l'accès à votre compte Capycom.`,
    permet: 'Cette application pourra :',
    liste: [
      'estimer le prix d\'une lettre',
      'préparer et créer des courriers (brouillons) au nom de votre compte',
      'consulter le statut de vos courriers et annuler un brouillon'
    ],
    nePeutPas: 'Elle ne peut pas payer : c\'est vous qui payez sur capycom.ca, après avoir vérifié la lettre et les adresses.',
    cle: 'Votre clé d\'API Capycom',
    aide: (lien) => `Dans votre espace client, <a href="${lien}" target="_blank" rel="noopener noreferrer">Informations personnelles</a>, carte « Accès par API », « Générer une clé ». La clé n'est affichée qu'une fois. Attention : générer une nouvelle clé remplace l'ancienne.`,
    confidentialite: 'Votre clé est placée, chiffrée, dans l\'accès remis à l\'application. Elle n\'est pas enregistrée sur ce serveur, et le contenu de vos lettres n\'y est pas conservé.',
    retour: (h) => `Après votre accord, vous serez renvoyé vers <strong>${h}</strong>. Le nom de l'application est celui qu'elle déclare, Capycom ne le vérifie pas.`,
    autoriser: 'Autoriser',
    annuler: 'Annuler',
    autreLangue: 'English',
    erreurs: {
      cle_invalide: 'Cette clé n\'est pas reconnue. Vérifiez qu\'elle est complète et qu\'elle n\'a pas été remplacée par une nouvelle.',
      cle_vide: 'Collez votre clé d\'API.',
      indisponible: 'Capycom ne répond pas pour le moment. Réessayez dans quelques minutes.',
      expire: 'Cette demande a expiré. Retournez dans l\'application et relancez la connexion.'
    }
  },
  en: {
    titre: 'Authorize the connection to Capycom',
    intro: (c) => `<strong>${c}</strong> is asking for access to your Capycom account.`,
    permet: 'This application will be able to:',
    liste: [
      'estimate the price of a letter',
      'prepare and create mail items (drafts) on behalf of your account',
      'check the status of your mail items and cancel a draft'
    ],
    nePeutPas: 'It cannot pay: you pay yourself on capycom.ca, after checking the letter and the addresses.',
    cle: 'Your Capycom API key',
    aide: (lien) => `In your account, <a href="${lien}" target="_blank" rel="noopener noreferrer">Personal information</a>, "API access" card, "Generate a key". The key is shown only once. Note: generating a new key replaces the old one.`,
    confidentialite: 'Your key is placed, encrypted, inside the access granted to the application. It is not stored on this server, and the content of your letters is not kept here.',
    retour: (h) => `Once you agree, you will be sent back to <strong>${h}</strong>. The application name is the one it declares; Capycom does not verify it.`,
    autoriser: 'Authorize',
    annuler: 'Cancel',
    autreLangue: 'Français',
    erreurs: {
      cle_invalide: 'This key is not recognized. Check that it is complete and has not been replaced by a newer one.',
      cle_vide: 'Paste your API key.',
      indisponible: 'Capycom is not answering right now. Try again in a few minutes.',
      expire: 'This request has expired. Go back to the application and start the connection again.'
    }
  }
};

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function choisirLangue(request, url) {
  const l = url.searchParams.get('lang');
  if (l === 'fr' || l === 'en') return l;
  return /^\s*fr/i.test(request.headers.get('accept-language') || '') ? 'fr' : 'en';
}

const CSS = `
:root{color-scheme:light dark;--bleu:#27406b;--fond:#f4f6fa;--carte:#fff;--texte:#1b2430;--doux:#5a6577;--bord:#d5dbe6;--err:#b3261e}
@media (prefers-color-scheme:dark){:root{--fond:#12161d;--carte:#1b2029;--texte:#e8ecf3;--doux:#9aa6b8;--bord:#323a49;--err:#ff8a80}}
*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:var(--fond);color:var(--texte)}
main{max-width:520px;margin:0 auto;padding:24px 16px 48px}
.marque{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;color:var(--bleu);font-weight:700;font-size:20px}
@media (prefers-color-scheme:dark){.marque{color:#9db7e8}}
.marque a{font-weight:400;font-size:14px;color:var(--doux)}
.carte{background:var(--carte);border:1px solid var(--bord);border-radius:12px;padding:24px}
h1{font-size:22px;margin:0 0 12px}p{margin:0 0 12px}ul{margin:0 0 12px;padding-left:20px}li{margin:2px 0}
label{display:block;font-weight:600;margin:16px 0 6px}
input[type=password],input[type=text]{width:100%;padding:12px;border:1px solid var(--bord);border-radius:8px;font:inherit;background:transparent;color:inherit}
input:focus{outline:2px solid var(--bleu);outline-offset:1px}
.aide,.petit{color:var(--doux);font-size:14px}.erreur{color:var(--err);font-weight:600;margin:12px 0 0}
.actions{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}
button{font:inherit;font-weight:600;padding:12px 20px;border-radius:8px;border:1px solid var(--bleu);cursor:pointer}
button.principal{background:var(--bleu);color:#fff}button.second{background:transparent;color:inherit;border-color:var(--bord)}
a{color:var(--bleu)}@media (prefers-color-scheme:dark){a{color:#9db7e8}}
`;

export function pageConsentement({ lang, nomClient, hoteRetour, req, lienAide, action, erreur }) {
  const T = TEXTES[lang];
  const autre = lang === 'fr' ? 'en' : 'fr';
  const msg = erreur ? T.erreurs[erreur] || T.erreurs.cle_invalide : '';
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${esc(T.titre)} | Capycom</title><style>${CSS}</style></head>
<body><main>
<div class="marque"><span>Capycom</span><a href="${esc(action)}?req=${encodeURIComponent(req)}&amp;lang=${autre}">${T.autreLangue}</a></div>
<div class="carte">
<h1>${esc(T.titre)}</h1>
<p>${T.intro(esc(nomClient))}</p>
<p>${esc(T.permet)}</p>
<ul>${T.liste.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
<p>${esc(T.nePeutPas)}</p>
<form method="post" action="${esc(action)}" autocomplete="off">
<input type="hidden" name="req" value="${esc(req)}"><input type="hidden" name="lang" value="${lang}">
<label for="cle">${esc(T.cle)}</label>
<input id="cle" name="cle" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" required>
<p class="aide">${T.aide(esc(lienAide))}</p>
${msg ? `<p class="erreur" role="alert">${esc(msg)}</p>` : ''}
<p class="petit">${esc(T.confidentialite)}</p>
<p class="petit">${T.retour(esc(hoteRetour))}</p>
<div class="actions"><button class="principal" type="submit" name="decision" value="oui">${esc(T.autoriser)}</button>
<button class="second" type="submit" name="decision" value="non" formnovalidate>${esc(T.annuler)}</button></div>
</form></div></main></body></html>`;
}

export function pageErreur(lang, titre, detail) {
  const T = TEXTES[lang];
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(titre)} | Capycom</title><style>${CSS}</style></head><body><main><div class="marque"><span>Capycom</span></div><div class="carte"><h1>${esc(titre)}</h1><p>${esc(detail)}</p></div></main></body></html>`;
}

export { TEXTES };
