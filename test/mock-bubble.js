// Faux serveur Capycom (Bubble) pour les tests : ne contacte aucun vrai service.

export const CLE_VALIDE = 'cle-test-0123456789abcdefghijklmnop';
export const API = 'https://capycom.test/version-test/api/1.1/wf';

export function creerMock() {
  const appels = [];
  const courriers = new Map();
  const pdfs = new Map(); // url -> Uint8Array
  const clientsCimd = new Map(); // url -> document
  const etat = { derniers: {}, indisponible: false };

  async function fetchMock(url, init = {}) {
    url = String(url);
    if (clientsCimd.has(url)) return new Response(JSON.stringify(clientsCimd.get(url)), { status: 200, headers: { 'content-type': 'application/json' } });
    if (pdfs.has(url)) return new Response(pdfs.get(url), { status: 200, headers: { 'content-type': 'application/pdf' } });
    if (!url.startsWith(API + '/')) return new Response('not found', { status: 404 });
    if (etat.indisponible) throw new Error('réseau coupé');
    const nom = url.slice(API.length + 1);
    const corps = init.body ? JSON.parse(init.body) : {};
    appels.push({ nom, corps });
    etat.derniers[nom] = corps;
    const rep = (response, status = 200) => new Response(JSON.stringify({ status: 'success', response }), { status, headers: { 'content-type': 'application/json' } });
    const refuse = () => rep({ statut: 'erreur', erreur: 'cle_invalide', message: 'Invalid key', message_fr: 'Clé invalide' });

    if (nom === 'api_estimer_prix') {
      const n = corps.nombre_feuilles;
      if (!Number.isInteger(n) || n < 1 || n > 20) return rep({ statut: 'erreur', erreur: 'nombre_feuilles_invalide', message: 'Invalid sheet count', message_fr: 'Nombre de feuilles invalide' });
      const prix = corps.couleur ? n * 1.2 : n * 0.5;
      return rep({ statut: 'ok', nombre_feuilles: n, couleur: !!corps.couleur, enveloppe: 'petite', montant_enveloppe: 0.3, montant_feuilles: prix, nombre_timbres: 1, montant_timbres: 2.5600000000000005, total_avant_taxes: 3.3600000000000003 + (n - 1) * 0.5, devise: 'CAD' });
    }
    if (corps.cle !== CLE_VALIDE) return refuse();

    if (nom === 'api_creer_courrier') {
      const contenu = corps.pdf && corps.pdf.contents;
      if (!contenu || !atob(contenu).startsWith('%PDF-')) return rep({ statut: 'erreur', erreur: 'pdf_invalide', message: 'Invalid PDF', message_fr: 'PDF invalide' });
      if (!/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(corps.dest_code_postal)) return rep({ statut: 'erreur', erreur: 'code_postal_invalide', message: 'Invalid postal code', message_fr: 'Code postal invalide' });
      etat.dernierPdf = Buffer.from(contenu, 'base64');
      let nbPages = 1;
      try { nbPages = (await (await import('pdf-lib')).PDFDocument.load(etat.dernierPdf)).getPageCount(); } catch { /* PDF de test inhabituel */ }
      const idem = corps.cle_idempotence;
      if (idem && [...courriers.values()].find((c) => c.idem === idem)) {
        const c = [...courriers.values()].find((x) => x.idem === idem);
        return rep(c.reponse);
      }
      const id = '1791565001023x' + String(courriers.size + 1).padStart(6, '0');
      const reponse = {
        statut: 'ok', id_courrier: id, statut_courrier: 'brouillon', reference: '', canal: 'api', nombre_feuilles: nbPages, couleur: !!corps.couleur,
        enveloppe: 'petite', montant_enveloppe: 0.3, montant_feuilles: 0.5, nombre_timbres: 1, montant_timbres: 2.56, total_avant_taxes: 3.3600000000000003, devise: 'CAD',
        destinataire: corps.dest_nom, expediteur: corps.exp_nom,
        lien_paiement: `https://capycom.test/login?courrier=${id}&Parameter 1=1&Parameter 2=1`,
        lien_paiement_test: `https://capycom.test/version-test/login?courrier=${id}&Parameter 1=1&Parameter 2=1`
      };
      courriers.set(id, { idem, reponse, statut: 'brouillon' });
      return rep(reponse);
    }
    if (nom === 'api_statut_courrier') {
      const c = courriers.get(corps.id_courrier);
      if (!c) return rep({ statut: 'erreur', erreur: 'introuvable', message: 'Not found', message_fr: 'Introuvable' });
      return rep({ ...c.reponse, statut_courrier: c.statut });
    }
    if (nom === 'api_annuler_brouillon') {
      const c = courriers.get(corps.id_courrier);
      if (!c) return rep({ statut: 'erreur', erreur: 'introuvable', message: 'Not found', message_fr: 'Introuvable' });
      if (c.statut !== 'brouillon') return rep({ statut: 'erreur', erreur: 'non_annulable', message: 'Not cancellable', message_fr: 'Non annulable' });
      c.statut = 'annule';
      return rep({ statut: 'ok', id_courrier: corps.id_courrier, statut_courrier: 'annule' });
    }
    if (nom === 'api_lister_courriers') {
      const out = { statut: 'ok' };
      [...courriers.entries()].slice(-5).forEach(([id, c], i) => {
        out[`courrier_${i + 1}_id`] = id; out[`courrier_${i + 1}_statut`] = c.statut; out[`courrier_${i + 1}_total_avant_taxes`] = 3.3600000000000003;
      });
      return rep(out);
    }
    return new Response('{}', { status: 404 });
  }
  return { fetch: fetchMock, appels, courriers, pdfs, clientsCimd, etat };
}
