import { T } from '../../outils/formulaire-generer.mjs';
const champ = (id, type, requis, max, fr, en, exFr, exEn, extra) => Object.assign({ id, type, requis, max, libelle: T(fr, en), exemple: T(exFr || '', exEn || exFr || '') }, extra || {});
export default {
  id: 'n9-ontario',
  source: { pdf: 'n9-ontario.pdf', url: 'https://tribunalsontario.ca/ltb/forms/', consulte: '2026-10-30' },
  def: {
    section: 'logement',
    titre: T('Avis de fin de bail du locataire (Ontario, N9)', 'Tenant’s notice to end the tenancy (Ontario, N9)'),
    description: T('Remplir le formulaire N9 de la Commission de la location immobilière de l’Ontario pour quitter votre logement. Formulaire prêt à signer et à poster au propriétaire.', 'Fill in the Ontario Landlord and Tenant Board form N9 to move out of your rental unit. Ready to sign and mail to your landlord.'),
    seo: {
      slug: T('avis-fin-de-bail-ontario-n9', 'ontario-n9-tenant-notice-to-end-tenancy'),
      titre: T('Formulaire N9 de l’Ontario : avis de fin de bail du locataire | Capycom', 'Ontario form N9: tenant’s notice to end the tenancy | Capycom'),
      description: T('Outil gratuit : répondez à quelques questions et obtenez le formulaire N9 rempli, prêt à signer. Envoi par la poste possible.', 'Free tool: answer a few questions and get form N9 filled in, ready to sign. Mailing available.'),
      h1: T('Formulaire N9 : avis de fin de bail du locataire (Ontario)', 'Form N9: Tenant’s Notice to End the Tenancy (Ontario)'),
    },
    champs: [
      champ('adresse_logement', 'texte', true, 160, 'Adresse du logement que vous quittez', 'Address of the rental unit you are leaving', 'ex. 25, rue Rideau, app. 4, Ottawa ON K1N 5X8', 'e.g. 25 Rideau Street, Unit 4, Ottawa ON K1N 5X8'),
      champ('autres_locataires', 'texte', false, 120, 'Autres locataires au bail, s’il y en a', 'Other tenants on the lease, if any', 'ex. Marie Tremblay', 'e.g. Marie Tremblay'),
      champ('date_fin', 'date', true, 10, 'Dernier jour de votre location (date de fin)', 'Last day of your tenancy (termination date)'),
      champ('tel', 'tel', false, 20, 'Votre numéro de téléphone', 'Your phone number', '613 555 1234', '613 555 1234'),
      champ('sig_prenom', 'texte', false, 40, 'Prénom à inscrire dans la section signature (si le découpage automatique du nom ne convient pas)', 'First name to write in the signature section (if the automatic split of your name is wrong)'),
      champ('sig_nom', 'texte', false, 40, 'Nom de famille à inscrire dans la section signature (si le découpage automatique ne convient pas)', 'Last name to write in the signature section (if the automatic split is wrong)'),
    ],
    destinataire: T('Libre : indiquez le nom et l’adresse de votre propriétaire (dest_*). Le N9 doit lui être remis ; la Commission ne le reçoit pas.', 'Free: give your landlord’s name and address (dest_*). The N9 must be given to your landlord; the Board does not receive it.'),
    liens: [
      { cle: 'page', fr: 'https://tribunalsontario.ca/ltb/forms/', en: 'https://tribunalsontario.ca/ltb/forms/', but: 'Formulaires de la Commission de la location immobilière (N9)' },
    ],
    avertsPlus: [
      T('Pour la plupart des locations (par exemple au mois), la date de fin doit tomber au moins 60 jours après la remise de l’avis et correspondre au dernier jour d’une période de location (par exemple le dernier jour du mois). Des exceptions existent (location à la journée ou à la semaine, bail à durée fixe, avis de 10 jours après un N12 ou un N13, résidence de soins). Lisez les renseignements imprimés au dos du formulaire.', 'For most tenancies (for example monthly), the termination date must be at least 60 days after you give the notice and be the last day of a rental period (for example the last day of the month). Exceptions exist (daily or weekly tenancy, fixed term lease, 10 days’ notice after an N12 or N13, care home). Read the information printed on the form.'),
      T('Le N9 doit être signé, puis remis au propriétaire : la date de fin est calculée à partir du jour où il le reçoit.', 'The N9 must be signed and given to your landlord: the termination date counts from the day he or she receives it.'),
    ],
  },
  exemple: { exp_nom: 'Julie Marie Tremblay', exp_ligne: '25 rue Rideau, app. 4', exp_ville: 'Ottawa', exp_prov: 'Ontario', exp_cp: 'K1N 5X8', dest_nom: 'Gestion Immobilière Rideau inc.', dest_ligne: '100 Elgin Street', dest_ville: 'Ottawa', dest_prov: 'Ontario', dest_cp: 'K1P 1C1', date_lettre: '2026-11-02', adresse_logement: '25 rue Rideau, app. 4, Ottawa ON K1N 5X8', autres_locataires: 'Marc Dubois', date_fin: '2027-01-31', tel: '613 555 1234' },
  zones: [
    { w: 'TO_TenameName', lab: 'To', champ: 'dest_nom', fs: 11 },
    { w: 'From_LandlordName', lab: 'From', champs: ['exp_nom', 'autres_locataires'], fs: 11 },
    { w: 'RentalUnitAddress', champ: 'adresse_logement', fs: 11 },
    { w: 'TerminationDate', champ: 'date_fin', k: 'comb', motif: '__/__/____', fmt: 'jjmmaaaa', fs: 11 },
    { w: 'SelectSign', i: 0, k: 'x', toujours: true, labD: 'Tenant' },
    { w: 'RFirstName', k: 'comb', n: 40, champ: 'exp_nom', fmt: 'prenom', pref: 'sig_prenom', fs: 11 },
    { w: 'RLastName', k: 'comb', n: 40, champ: 'exp_nom', fmt: 'nom', pref: 'sig_nom', fs: 11 },
    { w: 'RDayPhone', k: 'comb', motif: '(___)___-____', champ: 'tel', fmt: 'tel10', fs: 11 },
    { w: 'Signature', k: 'sig' },
    { w: 'SignDate', champ: 'date_lettre', fmt: 'jj/mm/aaaa', fs: 11 },
  ],
};
