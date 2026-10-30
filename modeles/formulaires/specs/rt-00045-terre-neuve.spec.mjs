import { T } from '../../outils/formulaire-generer.mjs';
const champ = (id, type, requis, max, fr, en, exFr, exEn, extra) => Object.assign({ id, type, requis, max, libelle: T(fr, en), exemple: T(exFr || '', exEn || exFr || '') }, extra || {});
const URL = 'https://www.gov.nl.ca/dgsnl/files/5Tenants-Notice-to-Terminate-Standard00045.pdf';
export default {
  id: 'rt-00045-terre-neuve',
  source: { pdf: 'rt-00045-terre-neuve.pdf', url: URL, consulte: '2026-10-30' },
  pages: [2],
  def: {
    icone: 'sortie',
    section: 'logement',
    titre: T('Avis de fin de bail du locataire (Terre-Neuve-et-Labrador, RT-2018-00045)', 'Tenant’s notice to terminate (Newfoundland and Labrador, RT-2018-00045)'),
    description: T('Remplir le formulaire RT-2018-00045 du Residential Tenancies Office de Terre-Neuve-et-Labrador pour mettre fin à votre bail. Prêt à signer et à poster au propriétaire.', 'Fill in Newfoundland and Labrador Residential Tenancies Office form RT-2018-00045 to end your tenancy. Ready to sign and mail to your landlord.'),
    seo: {
      slug: T('avis-fin-de-bail-terre-neuve-rt-2018-00045', 'newfoundland-labrador-rt-2018-00045-tenant-notice-to-terminate'),
      titre: T('Formulaire RT-2018-00045 de Terre-Neuve-et-Labrador : avis du locataire | Capycom', 'Newfoundland and Labrador form RT-2018-00045: tenant’s notice | Capycom'),
      description: T('Outil gratuit : répondez à quelques questions et obtenez le formulaire RT-2018-00045 rempli, prêt à signer. Envoi par la poste possible.', 'Free tool: answer a few questions and get form RT-2018-00045 filled in, ready to sign. Mailing available.'),
      h1: T('Avis de fin de bail du locataire (Terre-Neuve-et-Labrador, RT-2018-00045)', 'Tenant’s Notice to Terminate (Newfoundland and Labrador, RT-2018-00045)'),
    },
    champs: [
      champ('type_location', 'choix', true, 2, 'Type de contrat de location', 'Type of rental agreement', '', '', { options: [
        { valeur: 'semaine', texteOfficiel: 'Week to week', fr: 'De semaine en semaine', en: 'Week to week', aide: T('Article 18(1)(a) : préavis d’au moins 7 jours avant la fin de la période de location.', 'Section 18(1)(a): notice of at least 7 days before the end of the rental period.') },
        { valeur: 'mois', texteOfficiel: 'Month to month', fr: 'De mois en mois', en: 'Month to month', aide: T('Article 18(1)(b) : préavis d’au moins 1 mois avant la fin de la période de location.', 'Section 18(1)(b): notice of at least 1 month before the end of the rental period.') },
        { valeur: 'terme', texteOfficiel: 'Fixed Term', fr: 'À durée fixe', en: 'Fixed term', aide: T('Article 18(1)(c) : préavis d’au moins 2 mois avant la fin du terme.', 'Section 18(1)(c): notice of at least 2 months before the end of the fixed term.') },
        { valeur: 'maison', texteOfficiel: 'Mobile Home Site', fr: 'Terrain de maison mobile', en: 'Mobile home site', aide: T('Article 18(3)(a) : préavis d’au moins 1 mois avant la fin de la période de location.', 'Section 18(3)(a): notice of at least 1 month before the end of the rental period.') },
      ] }),
      champ('log_ligne', 'texte', true, 90, 'Numéro et rue du logement', 'Street number and name of the rental unit', 'ex. 25 Water Street', 'e.g. 25 Water Street'),
      champ('log_apt', 'texte', false, 20, 'Appartement', 'Apartment number', 'ex. 4', 'e.g. 4'),
      champ('log_ville', 'texte', true, 60, 'Ville du logement', 'City or town of the rental unit', 'ex. St. John’s', 'e.g. St. John’s'),
      champ('log_cp', 'cp', true, 7, 'Code postal du logement', 'Postal code of the rental unit', 'A1C 1A1', 'A1C 1A1'),
      champ('autres_locataires', 'texte', false, 60, 'Deuxième locataire, s’il y en a', 'Second tenant, if any', 'ex. Marie Tremblay', 'e.g. Marie Tremblay'),
      champ('date_fin', 'date', true, 10, 'Date à laquelle vous quittez le logement', 'Date you will move out', '', ''),
    ],
    destinataire: T('Libre : indiquez le nom et l’adresse de votre propriétaire (dest_*). L’avis lui est remis ; il n’est pas envoyé au Residential Tenancies Office.', 'Free: give your landlord’s name and address (dest_*). The notice is given to your landlord; it is not sent to the Residential Tenancies Office.'),
    liens: [{ cle: 'page', fr: URL, en: URL, but: 'Formulaire RT-2018-00045 (gouvernement de Terre-Neuve-et-Labrador)' }],
    avertsPlus: [
      T('Le préavis doit comprendre une période de location complète. Exemple : pour un loyer mensuel payé le 1er, si le propriétaire reçoit l’avis au plus tard le 1er janvier, le bail peut se terminer le 31 janvier. Le jour de la réception et le jour du déménagement ne comptent pas dans le calcul.', 'The notice period must include a full rental period. Example: with rent paid monthly on the 1st, if your landlord receives the notice on or before January 1, the tenancy can end on January 31. The day the notice is received and the day you move out are not counted.'),
      T('Le départ d’un locataire met fin à la location pour tous les locataires au contrat. Livraison : en personne, dans la boîte aux lettres, par courrier recommandé ou messagerie (réputé remis le 5e jour après l’envoi par la poste), ou par voie électronique si le propriétaire a donné une adresse électronique.', 'One tenant ending the rental agreement ends it for all tenants. Delivery: in person, in the mailbox, by registered mail or courier (deemed served on the 5th day after mailing), or electronically if your landlord gave an electronic address.'),
    ],
  },
  exemple: { exp_nom: 'Julie Tremblay', exp_ligne: '55 Duckworth Street', exp_ville: 'St. John’s', exp_prov: 'Terre-Neuve-et-Labrador', exp_cp: 'A1C 1E3', dest_nom: 'Avalon Rentals Inc.', dest_ligne: '10 Harbour Drive', dest_ville: 'St. John’s', dest_prov: 'Terre-Neuve-et-Labrador', dest_cp: 'A1C 6H1', date_lettre: '2026-11-02', type_location: 'mois', log_ligne: '25 Water Street', log_apt: '4', log_ville: 'St. John’s', log_cp: 'A1C 1A1', autres_locataires: 'Marc Dubois', date_fin: '2027-01-31' },
  zones: [
    { w: 'Landlord Name', champ: 'dest_nom', fs: 11 },
    { w: 'Name Tenant 1', champ: 'exp_nom', fs: 11 },
    { w: 'Name Tenant 2', champ: 'autres_locataires', fs: 11 },
    { w: 'Street Number and Name', champ: 'log_ligne', fs: 11 },
    { w: 'Apartment Number', champ: 'log_apt', fs: 11 },
    { w: 'City or Town', champ: 'log_ville', fs: 11 },
    { w: 'Postal Code', champ: 'log_cp', fmt: 'cp', fs: 11 },
    { w: 'Date month day year', champ: 'date_fin', fmt: 'mois jj, aaaa', fs: 11 },
    { w: 'Week to week Section 181a allows the tenant to move out not less than 7 days before', k: 'x', champ: 'type_location', egal: 'semaine', labD: 'Week to week' },
    { w: 'Month to month Section 181b allows the tenant to move out not less than 1 month', k: 'x', champ: 'type_location', egal: 'mois', labD: 'Month to month' },
    { w: 'Fixed Term Section 181c allows the tenant to move out not less than 2 months before', k: 'x', champ: 'type_location', egal: 'terme', labD: 'Fixed Term' },
    { w: 'Mobile Home Site Section 183a allows the tenant to move out not less than 1 month', k: 'x', champ: 'type_location', egal: 'maison', labD: 'Mobile Home Site' },
    { w: 'Signature1', k: 'sig' },
    { w: 'Date month day year_2', champ: 'date_lettre', fmt: 'mois jj, aaaa', fs: 11 },
  ],
};
