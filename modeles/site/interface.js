
/* Capycom : modèles de lettres par sections, assistant RC66. Formulaire, signature, aperçu en fenêtre, PDF / Word / ODT (dans le navigateur) et envoi par la poste.
   Monté dans le groupe Bubble d'id HTML "capy-lettres-zone". La langue de l'interface suit le titre de la page (id "capy-titre-page").
   Le bouton Bubble "capy-btn-poste" crée le brouillon puis appelle window.capyLettre.envoyer(idCourrier). */
(function () {
  if (window.capyLettre) return;
  // Moteur, définitions et fonds de formulaires : sources uniques du dépôt « 11-Capycom MCP », dossier modeles/ (injectés par construire-site.mjs)
  var CM = window.CapyModeles, DEF = window.CapyModelesDef, FONDS = window.CapyModelesFonds;
  if (!CM || !DEF || !FONDS) { console.log('CAPYCOM modele : moteur ou définitions introuvables'); return; }


  var PROVINCES = CM.PROVINCES;
  function prov(fr) { return CM.prov(fr); }

  /* ------------------------------------------------------------ textes de l'interface */
  var UI = {
    fr: {
      choisir: 'Choisissez un modèle', vous: 'Vous (expéditeur)', vousAide: 'Votre nom et votre adresse apparaissent en haut de la lettre.',
      dest: 'Destinataire', destAide: 'L’entreprise ou la personne à qui vous écrivez. Son adresse figure souvent sur vos factures.',
      details: 'Détails de la lettre', nomComplet: 'Prénom et nom', contact: 'Téléphone ou courriel', opt: '(facultatif)',
      organisme: 'Entreprise, organisme ou personne', service: 'Service ou à l’attention de',
      rech: 'Rechercher l’adresse', rechPh: 'ex. 150 rue Elgin, Ottawa', rechBtn: 'Rechercher', rechAucun: 'Aucune adresse trouvée. Remplissez les champs à la main.',
      rechErreur: 'La recherche ne répond pas. Remplissez les champs à la main.', rechEnCours: 'Recherche…',
      osm: 'Recherche d’adresse : données © OpenStreetMap. Seule l’adresse tapée est envoyée, pas le contenu de votre lettre.',
      ligne: 'Numéro et rue (app. si besoin)', ville: 'Ville', province: 'Province', choisirProv: 'Choisir…', cp: 'Code postal',
      dateLettre: 'Date de la lettre', langueLettre: 'Langue de la lettre', telecharger: 'Télécharger votre lettre', fmtPdf: 'PDF', fmtDocx: 'Word (.docx)', fmtOdt: 'LibreOffice (.odt)',
      apercu: 'Aperçu', manque: 'Il manque des informations. Les champs à compléter sont en rouge.',
      cpInvalide: 'Le code postal ne semble pas valide (format A1A 1A1).',
      tropLong: 'La lettre dépasse une page. Raccourcissez les textes libres pour pouvoir l’envoyer au prix affiché.',
      pdfOk: 'Votre lettre est téléchargée.', envoi: 'Préparation de votre lettre…',
      envoiErreur: 'Un problème est survenu pendant la préparation. Vous allez être redirigé vers votre lettre pour la vérifier.',
      note: 'La lettre est créée dans votre navigateur. Rien n’est envoyé tant que vous ne choisissez pas l’envoi par la poste. La recherche d’adresse utilise OpenStreetMap : seule l’adresse tapée lui est envoyée.',
      sigTitre: 'Signature', sigAide: 'Facultatif. La signature est placée en bas de la lettre, avec la date. Sans signature, un espace est laissé pour signer à la main après impression.',
      sigAucune: 'Aucune', sigDessiner: 'Dessiner', sigPhoto: 'Photo', sigEcrire: 'Écrire mon nom',
      sigDessinAide: 'Dessinez votre signature ici (souris ou doigt)', sigEffacer: 'Effacer', sigCouleur: 'Couleur',
      sigPhotoAide: 'Photographiez votre signature sur une feuille blanche, puis choisissez la photo.', sigTransp: 'Retirer le fond blanc',
      sigNom: 'Nom à signer', sigExemple: 'Votre nom', sigTrop: 'Cette image est trop lourde (15 Mo maximum).', sigPhotoErreur: 'Impossible de lire cette image.',
      lienPied: 'Ajouter « Modèle gratuit : capycom.ca » discrètement en pied de page',
      apercuBtn: 'Aperçu', apercuTitre: 'Aperçu de la lettre', fermer: 'Fermer'
    },
    en: {
      choisir: 'Choose a template', vous: 'You (sender)', vousAide: 'Your name and address appear at the top of the letter.',
      dest: 'Recipient', destAide: 'The company or person you are writing to. Their address is often on your bills.',
      details: 'Letter details', nomComplet: 'First and last name', contact: 'Phone or email', opt: '(optional)',
      organisme: 'Company, organization or person', service: 'Department or attention',
      rech: 'Search for the address', rechPh: 'e.g. 150 Elgin Street, Ottawa', rechBtn: 'Search', rechAucun: 'No address found. Fill in the fields by hand.',
      rechErreur: 'The search is not responding. Fill in the fields by hand.', rechEnCours: 'Searching…',
      osm: 'Address search: data © OpenStreetMap. Only the address you type is sent, never the content of your letter.',
      ligne: 'Street number and name (unit if needed)', ville: 'City', province: 'Province', choisirProv: 'Choose…', cp: 'Postal code',
      dateLettre: 'Letter date', langueLettre: 'Letter language', telecharger: 'Download your letter', fmtPdf: 'PDF', fmtDocx: 'Word (.docx)', fmtOdt: 'LibreOffice (.odt)',
      apercu: 'Preview', manque: 'Some information is missing. The fields to fill in are shown in red.',
      cpInvalide: 'The postal code does not look valid (format A1A 1A1).',
      tropLong: 'The letter is longer than one page. Shorten the free text fields to send it at the price shown.',
      pdfOk: 'Your letter has been downloaded.', envoi: 'Preparing your letter…',
      envoiErreur: 'Something went wrong while preparing your letter. You will be taken to your letter to check it.',
      note: 'The letter is created in your browser. Nothing is sent until you choose to send it by mail. Address search uses OpenStreetMap: only the address you type is sent to it.',
      sigTitre: 'Signature', sigAide: 'Optional. The signature goes at the bottom of the letter, next to the date. With no signature, a blank space is left so you can sign by hand after printing.',
      sigAucune: 'None', sigDessiner: 'Draw', sigPhoto: 'Photo', sigEcrire: 'Type my name',
      sigDessinAide: 'Draw your signature here (mouse or finger)', sigEffacer: 'Clear', sigCouleur: 'Colour',
      sigPhotoAide: 'Take a photo of your signature on white paper, then pick the photo.', sigTransp: 'Remove the white background',
      sigNom: 'Name to sign', sigExemple: 'Your name', sigTrop: 'This image is too large (15 MB maximum).', sigPhotoErreur: 'This image cannot be read.',
      lienPied: 'Add a discreet “Free template: capycom.ca” in the footer',
      apercuBtn: 'Preview', apercuTitre: 'Letter preview', fermer: 'Close'
    }
  };

  var MODELES = DEF.modeles.map(function (d) {
    var m = { id: d.id, fr: d.titre.fr, en: d.titre.en, champs: (d.champs || []).map(function (c) {
      return { id: c.id, fr: c.libelle.fr, en: c.libelle.en, type: c.type || 'text', req: !!c.requis, phfr: c.exemple ? c.exemple.fr : '', phen: c.exemple ? c.exemple.en : '', max: c.max || 120 };
    }) };
    // types de la définition (neutres) vers ceux de l'interface
    m.champs.forEach(function (c) { c.type = { 'texte': 'text', 'texte-long': 'textarea' }[c.type] || c.type; });
    if (d.type !== 'lettre') m.type = 'assistant';
    if (d.avertissement) m.avert = d.avertissement;
    return m;
  });
  function modele(id) { for (var i = 0; i < MODELES.length; i++) if (MODELES[i].id === id) return MODELES[i]; return MODELES[0]; }

  /* ------------------------------------------------------------ état */
  var etat = { modele: 'resiliation', vue: 'sections', section: 'contrats', ui: 'fr', lettre: null, v: {}, envoiEnCours: false };

  function aujourdhui() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  etat.v.date_lettre = aujourdhui();
  etat.v.delai = '10';

  function langueLettre() { return etat.lettre || etat.ui; }
  function t(k) { return UI[etat.ui][k]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function val(id) { var v = (etat.v[id] || '').trim(); return !v && etat.apercuMode ? etiquette(id) : v; }
  function dateTexte(iso, l) { return CM.dateTexte(iso, l); }


  function cpNormal(s) { return CM.cpNormal(s); }
  function cpValide(s) { return CM.cpValide(s); }





  /* ------------------------------------------------------------ contenu de la lettre (aperçu et PDF) */
  function composer() { return CM.composerLettre(etat.modele, val, langueLettre()); }

  /* ------------------------------------------------------------ mise en page (le PDF et l'aperçu lisent les mêmes positions, en mm) */
  var PAGE = CM.PAGE;


  function dimSig(sig, maxW, maxH) { return CM.dimSig(sig, maxW, maxH); }


  // La mise en page vient du moteur (plan de dessin neutre) ; ici on ne fait que tracer le plan avec jsPDF.
  function construirePdf() {
    var sig = signatureImage();
    var r = CM.planLettre(etat.modele, etat.v, { ui: etat.ui, lettre: etat.lettre, lienPied: etat.lienPied, sig: sig, get: val });
    var pdf = CM.rendreJsPdf(window.jspdf.jsPDF, r.plan, { sig: sig });
    return { pdf: pdf, tient: r.tient, ops: r.ops };
  }
  // Aperçu HTML : mêmes éléments, positionnés en mm sur une page lettre.
  function pageHtml(ops) {
    var h = '<div class="pv-page">';
    ops.forEach(function (o) {
      if (o.t === 'text') {
        var top = (o.y - o.fs * 0.3528 * 0.85).toFixed(2);
        var st = 'top:' + top + 'mm;font-size:' + o.fs + 'pt;color:' + o.c + ';font-weight:' + (o.b ? 700 : 400) + ';';
        if (o.a === 'center') st += 'left:0;width:' + PAGE.W + 'mm;text-align:center;'; else st += 'left:' + o.x + 'mm;';
        h += '<div class="pv-t" style="' + st + '">' + esc(o.s) + '</div>';
      } else if (o.t === 'line') {
        h += '<div class="pv-l" style="left:' + o.x1 + 'mm;top:' + o.y1 + 'mm;width:' + (o.x2 - o.x1) + 'mm;background:' + o.c + '"></div>';
      } else if (o.t === 'img') {
        h += '<img class="pv-i" alt="" src="' + o.src + '" style="left:' + o.x + 'mm;top:' + o.y + 'mm;width:' + o.w + 'mm;height:' + o.h + 'mm">';
      }
    });
    return h + '</div>';
  }

  /* ------------------------------------------------------------ signature (dessin, photo ou police manuscrite) */
  var COULEURS = [
    { hex: '#111111', fr: 'Noir', en: 'Black' }, { hex: '#1d3fa8', fr: 'Bleu', en: 'Blue' },
    { hex: '#0b2a5c', fr: 'Bleu nuit', en: 'Navy' }, { hex: '#5a3416', fr: 'Brun', en: 'Brown' }
  ];
  var POLICES = [
    { css: "'Great Vibes', cursive", nom: 'Great Vibes', px: 78 },
    { css: "'Dancing Script', cursive", nom: 'Dancing Script', px: 66, poids: '600 ' },
    { css: "'Homemade Apple', cursive", nom: 'Homemade Apple', px: 50 }
  ];
  etat.sig = { mode: 'none', couleur: '#111111', police: 0, texte: '', traits: [], photoBrut: null, photoUrl: null, photoW: 0, photoH: 0, transp: true };
  etat.lienPied = true;
  etat.apercuMode = false;
  (function chargerPolices() {
    try {
      if (!document.getElementById('capy-ml-polices')) {
        var lk = document.createElement('link'); lk.id = 'capy-ml-polices'; lk.rel = 'stylesheet';
        lk.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&family=Great+Vibes&family=Homemade+Apple&display=swap';
        document.head.appendChild(lk);
      }
      if (document.fonts && document.fonts.load) {
        POLICES.forEach(function (p) {
          document.fonts.load((p.poids || '') + p.px + 'px ' + p.css.split(',')[0]).then(function () {
            if (etat.sig.mode === 'police' && racine) rendreSignature();
          }).catch(function () {});
        });
      }
    } catch (e) {}
  })();

  function rogner(canvas, marge) {
    var w = canvas.width, h = canvas.height, d = canvas.getContext('2d').getImageData(0, 0, w, h).data;
    var x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      if (d[(y * w + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - marge); y0 = Math.max(0, y0 - marge); x1 = Math.min(w - 1, x1 + marge); y1 = Math.min(h - 1, y1 + marge);
    var c = document.createElement('canvas'); c.width = x1 - x0 + 1; c.height = y1 - y0 + 1;
    c.getContext('2d').drawImage(canvas, x0, y0, c.width, c.height, 0, 0, c.width, c.height);
    return c;
  }
  function tracerTraits(ctx, traits, k, couleur) {
    ctx.strokeStyle = couleur; ctx.fillStyle = couleur; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.6 * k;
    traits.forEach(function (tr) {
      if (tr.length === 1) { ctx.beginPath(); ctx.arc(tr[0][0] * k, tr[0][1] * k, 1.3 * k, 0, 7); ctx.fill(); return; }
      ctx.beginPath(); ctx.moveTo(tr[0][0] * k, tr[0][1] * k);
      for (var i = 1; i < tr.length - 1; i++) {
        var mx = (tr[i][0] + tr[i + 1][0]) / 2, my = (tr[i][1] + tr[i + 1][1]) / 2;
        ctx.quadraticCurveTo(tr[i][0] * k, tr[i][1] * k, mx * k, my * k);
      }
      var z = tr[tr.length - 1]; ctx.lineTo(z[0] * k, z[1] * k); ctx.stroke();
    });
  }
  function signatureImage() {
    var s = etat.sig, c, r;
    if (s.mode === 'dessin') {
      if (!s.traits.length) return null;
      c = document.createElement('canvas'); c.width = 1120; c.height = 360;
      tracerTraits(c.getContext('2d'), s.traits, 2, s.couleur);
      r = rogner(c, 6);
      return r ? { url: r.toDataURL('image/png'), w: r.width, h: r.height } : null;
    }
    if (s.mode === 'photo') return s.photoUrl ? { url: s.photoUrl, w: s.photoW, h: s.photoH } : null;
    if (s.mode === 'police') {
      var txt = (s.texte || '').trim() || (etat.v.exp_nom || '').trim();
      if (!txt) return null;
      var p = POLICES[s.police] || POLICES[0], px = p.px * 2;
      c = document.createElement('canvas'); var x = c.getContext('2d');
      x.font = (p.poids || '') + px + 'px ' + p.css;
      c.width = Math.ceil(x.measureText(txt).width) + px; c.height = Math.ceil(px * 1.7);
      x = c.getContext('2d'); x.font = (p.poids || '') + px + 'px ' + p.css; x.fillStyle = s.couleur; x.textBaseline = 'alphabetic';
      x.fillText(txt, px / 2, px * 1.15);
      r = rogner(c, 8);
      return r ? { url: r.toDataURL('image/png'), w: r.width, h: r.height } : null;
    }
    return null;
  }
  function traiterPhoto() {
    var src = etat.sig.photoBrut;
    if (!src) { etat.sig.photoUrl = null; return; }
    var c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    var x = c.getContext('2d'); x.drawImage(src, 0, 0);
    if (etat.sig.transp) {
      var im = x.getImageData(0, 0, c.width, c.height), d = im.data, n = d.length / 4, hist = new Uint32Array(256), i;
      for (i = 0; i < n; i++) hist[((299 * d[i * 4] + 587 * d[i * 4 + 1] + 114 * d[i * 4 + 2]) / 1000) | 0]++;
      var cum = 0, papier = 255;
      for (i = 0; i < 256; i++) { cum += hist[i]; if (cum >= n * 0.6) { papier = i; break; } }
      papier = Math.max(papier, 120);
      var haut = papier * 0.9, bas = papier * 0.5;
      for (i = 0; i < n; i++) {
        var lum = (299 * d[i * 4] + 587 * d[i * 4 + 1] + 114 * d[i * 4 + 2]) / 1000;
        var a = lum >= haut ? 0 : lum <= bas ? 1 : (haut - lum) / (haut - bas);
        d[i * 4] = d[i * 4] * 0.55; d[i * 4 + 1] = d[i * 4 + 1] * 0.55; d[i * 4 + 2] = d[i * 4 + 2] * 0.55; d[i * 4 + 3] = Math.round(a * 255);
      }
      x.putImageData(im, 0, 0);
      var r = rogner(c, 6); if (r) c = r;
    }
    var k = Math.min(1, 700 / Math.max(c.width, c.height));
    if (k < 1) { var c2 = document.createElement('canvas'); c2.width = Math.round(c.width * k); c2.height = Math.round(c.height * k); c2.getContext('2d').drawImage(c, 0, 0, c2.width, c2.height); c = c2; }
    etat.sig.photoUrl = c.toDataURL('image/png'); etat.sig.photoW = c.width; etat.sig.photoH = c.height;
  }
  function lirePhoto(fichier) {
    if (!fichier) return;
    if (fichier.size > 15 * 1024 * 1024) { message(t('sigTrop')); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var img = new Image();
      img.onload = function () {
        var k = Math.min(1, 1400 / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        var x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        etat.sig.photoBrut = c; traiterPhoto(); rendreSignature(); message('');
      };
      img.onerror = function () { message(t('sigPhotoErreur')); };
      img.src = fr.result;
    };
    fr.readAsDataURL(fichier);
  }
  function rangeeCouleurs() {
    return '<div class="ml-couleurs" role="group" aria-label="' + esc(t('sigCouleur')) + '"><span class="ml-couleurs-lib">' + esc(t('sigCouleur')) + '</span>' +
      COULEURS.map(function (c) {
        return '<button type="button" class="ml-coul' + (etat.sig.couleur === c.hex ? ' actif' : '') + '" data-sigcouleur="' + c.hex + '" style="background:' + c.hex + '" aria-label="' + esc(c[etat.ui]) + '" title="' + esc(c[etat.ui]) + '"></button>';
      }).join('') + '</div>';
  }
  function contenuSignature() {
    var s = etat.sig, h = '<h3>' + esc(t('sigTitre')) + '</h3><p class="ml-aide">' + esc(t('sigAide')) + '</p>';
    h += '<div class="ml-langue ml-sig-modes">' + [['none', t('sigAucune')], ['dessin', t('sigDessiner')], ['photo', t('sigPhoto')], ['police', t('sigEcrire')]].filter(function (m) { return !(estAssistant() && m[0] === 'police'); }).map(function (m) {
      return '<button type="button" data-sigmode="' + m[0] + '" class="' + (s.mode === m[0] ? 'actif' : '') + '">' + esc(m[1]) + '</button>';
    }).join('') + '</div>';
    if (s.mode === 'dessin') {
      h += '<div class="ml-sig-zone' + (s.traits.length ? '' : ' vide') + '"><canvas id="ml-sig-canvas" width="560" height="180"></canvas><span class="ml-sig-ph">' + esc(t('sigDessinAide')) + '</span></div>' +
        rangeeCouleurs() + '<div class="ml-actions"><button type="button" class="ml-btn" data-sigeffacer="1">' + esc(t('sigEffacer')) + '</button></div>';
    } else if (s.mode === 'photo') {
      h += '<p class="ml-aide ml-sig-aide2">' + esc(t('sigPhotoAide')) + '</p><input type="file" id="ml-sig-fichier" accept="image/*">' +
        '<label class="ml-check"><input type="checkbox" data-sigtransp="1"' + (s.transp ? ' checked' : '') + '> ' + esc(t('sigTransp')) + '</label>' +
        (s.photoUrl ? '<div class="ml-sig-vignette"><img alt="" src="' + s.photoUrl + '"></div>' : '');
    } else if (s.mode === 'police') {
      var nom = (s.texte || '').trim() || (etat.v.exp_nom || '').trim();
      h += '<div class="ml-champ"><label for="ml-sig-texte">' + esc(t('sigNom')) + '</label><input type="text" id="ml-sig-texte" value="' + esc(s.texte) + '" placeholder="' + esc(etat.v.exp_nom || '') + '" maxlength="40" autocomplete="off"></div>' +
        '<div class="ml-polices">' + POLICES.map(function (p, i) {
          return '<button type="button" class="ml-police' + (s.police === i ? ' actif' : '') + '" data-sigpolice="' + i + '" style="font-family:' + p.css + ';color:' + s.couleur + '">' + esc(nom || t('sigExemple')) + '</button>';
        }).join('') + '</div>' + rangeeCouleurs();
    }
    return h;
  }
  function rendreSignature() {
    var b = document.getElementById('ml-sig'); if (!b) return;
    b.innerHTML = contenuSignature();
    redessinerCanvas();
  }
  function redessinerCanvas() {
    var cv = document.getElementById('ml-sig-canvas'); if (!cv) return;
    var x = cv.getContext('2d'); x.clearRect(0, 0, cv.width, cv.height);
    tracerTraits(x, etat.sig.traits, 1, etat.sig.couleur);
    var z = cv.parentNode; if (z) z.classList.toggle('vide', !etat.sig.traits.length);
  }
  var trait = null;
  function pointCanvas(e, cv) {
    var r = cv.getBoundingClientRect();
    return [(e.clientX - r.left) * cv.width / r.width, (e.clientY - r.top) * cv.height / r.height];
  }
  function brancherDessin() {
    racine.addEventListener('pointerdown', function (e) {
      var cv = e.target && e.target.id === 'ml-sig-canvas' ? e.target : null; if (!cv) return;
      e.preventDefault(); try { cv.setPointerCapture(e.pointerId); } catch (x) {}
      trait = [pointCanvas(e, cv)]; etat.sig.traits.push(trait); redessinerCanvas();
    });
    racine.addEventListener('pointermove', function (e) {
      if (!trait || !e.target || e.target.id !== 'ml-sig-canvas') return;
      e.preventDefault();
      var p = pointCanvas(e, e.target), q = trait[trait.length - 1];
      if (Math.abs(p[0] - q[0]) + Math.abs(p[1] - q[1]) < 1.5) return;
      trait.push(p); redessinerCanvas();
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) { racine.addEventListener(ev, function () { trait = null; }); });
  }

  /* ------------------------------------------------------------ rendu */
  var racine;
  function champHtml(id, label, opts) {
    opts = opts || {};
    var lab = '<label for="ml-' + id + '">' + esc(label) + (opts.req ? '' : ' <span class="opt">' + esc(t('opt')) + '</span>') + '</label>';
    var v = esc(etat.v[id] || '');
    var ph = opts.ph ? ' placeholder="' + esc(opts.ph) + '"' : '';
    var max = ' maxlength="' + (opts.max || 120) + '"';
    var inp;
    if (opts.type === 'textarea') inp = '<textarea id="ml-' + id + '" data-k="' + id + '"' + ph + max + '>' + v + '</textarea>';
    else if (opts.type === 'provpays') {
      inp = '<input type="text" id="ml-' + id + '" data-k="' + id + '" value="' + v + '"' + ph + max + ' list="ml-dl-prov" autocomplete="off"><datalist id="ml-dl-prov">' + PROVINCES_RC.concat([{ fr: 'Autre pays', en: 'Other country' }]).map(function (p) { return '<option value="' + esc(etat.ui === 'fr' ? p.fr : p.en) + '">'; }).join('') + '</datalist>';
    } else if (opts.type === 'province' || opts.type === 'provinceRc') {
      inp = '<select id="ml-' + id + '" data-k="' + id + '"><option value="">' + esc(t('choisirProv')) + '</option>' +
        (opts.type === 'provinceRc' || /^rc/.test(id) ? PROVINCES_RC : PROVINCES).map(function (p) { return '<option value="' + esc(p.fr) + '"' + (etat.v[id] === p.fr ? ' selected' : '') + '>' + esc(etat.ui === 'fr' ? p.fr : p.en) + '</option>'; }).join('') + '</select>';
    } else {
      var ty = opts.type === 'date' ? 'date' : (opts.type === 'tel' ? 'tel' : 'text'), im = (opts.type === 'montant' || opts.type === 'nombre') ? ' inputmode="decimal"' : (opts.type === 'nas' || opts.type === 'tel') ? ' inputmode="numeric"' : '';
      inp = '<input type="' + ty + '" id="ml-' + id + '" data-k="' + id + '" value="' + v + '"' + ph + max + im + ' autocomplete="off">';
    }
    return '<div class="ml-champ" data-champ="' + id + '">' + lab + inp + '</div>';
  }
  function blocAdresse(pfx) {
    return '<div class="ml-champ"><label>' + esc(t('rech')) + ' <span class="opt">' + esc(t('opt')) + '</span></label>' +
      '<div class="ml-recherche"><input type="text" id="ml-' + pfx + '_q" placeholder="' + esc(t('rechPh')) + '" autocomplete="off">' +
      '<button type="button" class="ml-btn" data-rech="' + pfx + '">' + esc(t('rechBtn')) + '</button></div>' +
      '<ul class="ml-resultats" id="ml-' + pfx + '_res"></ul></div>' +
      champHtml(pfx + '_ligne', t('ligne'), { req: true, max: 90 }) +
      '<div class="ml-ligne">' + champHtml(pfx + '_ville', t('ville'), { req: true, max: 60 }) + champHtml(pfx + '_prov', t('province'), { req: true, type: 'province' }) + '</div>' +
      '<div class="ml-ligne">' + champHtml(pfx + '_cp', t('cp'), { req: true, max: 7, ph: 'K1A 0B1' }) + '<div class="ml-champ ml-vide"></div></div>';
  }
  function carteLien() {
    return '<label class="ml-check ml-check-lien"><input type="checkbox" data-optlien="1"' + (etat.lienPied ? ' checked' : '') + '> ' + esc(t('lienPied')) + '</label>';
  }
  function formulaireStandard() {
    var M = modele(etat.modele), u = etat.ui;
    var h = '<div class="ml-form">';
    h += '<div class="ml-carte"><h3>' + esc(M[u]) + '</h3>';
    h += M.avert ? '<div class="ml-avert">' + esc(M.avert[u]) + '</div>' : '';
    M.champs.forEach(function (c) { h += champHtml(c.id, c[u], { req: c.req, type: c.type, ph: u === 'fr' ? c.phfr : c.phen, max: c.max }); });
    h += '<div class="ml-ligne">' + champHtml('date_lettre', t('dateLettre'), { req: true, type: 'date' }) +
      '<div class="ml-champ"><label>' + esc(t('langueLettre')) + '</label><div class="ml-langue">' +
      '<button type="button" data-lettre="fr" class="' + (langueLettre() === 'fr' ? 'actif' : '') + '">Français</button>' +
      '<button type="button" data-lettre="en" class="' + (langueLettre() === 'en' ? 'actif' : '') + '">English</button></div></div></div>';
    h += '</div>';
    h += '<div class="ml-carte"><h3>' + esc(t('vous')) + '</h3><p class="ml-aide">' + esc(t('vousAide')) + '</p>' +
      champHtml('exp_nom', t('nomComplet'), { req: true, max: 80 }) + blocAdresse('exp') + champHtml('exp_contact', t('contact'), { max: 80 }) + '</div>';
    h += '<div class="ml-carte"><h3>' + esc(t('dest')) + '</h3><p class="ml-aide">' + esc(t('destAide')) + '</p>' +
      champHtml('dest_nom', t('organisme'), { req: true, max: 80 }) + champHtml('dest_service', t('service'), { max: 80 }) + blocAdresse('dest') + '</div>';
    h += '<div class="ml-carte" id="ml-sig">' + contenuSignature() + '</div>';
    h += '<div class="ml-telechargement"><p class="ml-titre-tel">' + esc(t('telecharger')) + '</p>' + carteLien() + '<div class="ml-actions">' +
      '<button type="button" class="ml-btn ml-btn-plein" data-format="pdf">⤓ ' + esc(t('fmtPdf')) + '</button>' +
      '<button type="button" class="ml-btn" data-format="docx">⤓ ' + esc(t('fmtDocx')) + '</button>' +
      '<button type="button" class="ml-btn" data-format="odt">⤓ ' + esc(t('fmtOdt')) + '</button></div>';
    h += '<p class="ml-message" id="ml-message"></p></div>';
    h += '<p class="ml-note">' + esc(t('note')) + '</p>';
    h += '</div>';
    return h;
  }
  function rendre() {
    var y = window.pageYOffset, h;
    if (etat.vue === 'sections') h = vueSections();
    else if (etat.vue === 'section') h = vueSection();
    else if (modele(etat.modele).type === 'assistant') h = fil() + rcRendre() + autresModeles();
    else h = fil() + formulaireStandard() + autresModeles();
    racine.innerHTML = h;
    redessinerCanvas();
    majInterfaceBubble();
    window.scrollTo(0, y);
  }
  // Le bouton Bubble « Envoyer par la poste » et sa carte ne servent que sur le formulaire standard (l'assistant a ses propres boutons).
  function majInterfaceBubble() {
    var bt = document.getElementById('capy-btn-poste'); if (!bt) return;
    var carte = bt.closest('.bubble-element.Group');
    var visible = etat.vue === 'modele' && modele(etat.modele).type !== 'assistant';
    if (carte) carte.style.display = visible ? '' : 'none';
  }
  function apercu() {}

  /* ------------------------------------------------------------ aperçu flottant (fenêtre) */
  function etiquette(id) {
    var u = etat.ui, base = { exp_nom: t('nomComplet'), exp_ligne: t('ligne'), exp_ville: t('ville'), exp_cp: 'A1A 1A1', dest_nom: t('organisme'), dest_ligne: t('ligne'), dest_ville: t('ville'), dest_cp: 'A1A 1A1', exp_prov: '', dest_prov: '', date_lettre: '' };
    if (id in base) return base[id] ? '[' + base[id] + ']' : '';
    var f = ''; modele(etat.modele).champs.forEach(function (c) { if (c.id === id) f = c[u]; });
    return f ? '[' + f + ']' : '';
  }
  function ajusterApercu() {
    var m = document.getElementById('capy-ml-modal'); if (!m || m.style.display === 'none') return;
    var zone = m.querySelector('.pv-zone'), page = m.querySelector('.pv-page'); if (!zone || !page) return;
    var pxW = PAGE.W * 3.7795, pxH = PAGE.H * 3.7795, kw = (zone.clientWidth - 24) / pxW, kh = (zone.clientHeight - 24) / pxH, k = Math.min(1, kw, Math.max(kh, 0.6));
    page.style.transform = 'scale(' + k + ')';
    zone.querySelector('.pv-cadre').style.cssText = 'width:' + (pxW * k) + 'px;height:' + (PAGE.H * 3.7795 * k) + 'px';
  }
  function fermerApercu() {
    var m = document.getElementById('capy-ml-modal'); if (m) m.style.display = 'none';
    document.documentElement.style.overflow = '';
  }
  function ouvrirApercu() {
    if (!window.jspdf) { alert('jsPDF not loaded'); return; }
    var r; etat.apercuMode = true;
    try { r = construirePdf(); } finally { etat.apercuMode = false; }
    var m = document.getElementById('capy-ml-modal');
    if (!m) {
      m = document.createElement('div'); m.id = 'capy-ml-modal'; document.body.appendChild(m);
      m.addEventListener('click', function (e) {
        if (e.target === m || e.target.closest('[data-pvfermer]')) { fermerApercu(); return; }
        if (e.target.closest('[data-pvpdf]')) { var v = valider(); if (v) { telecharger('pdf', v); fermerApercu(); } else fermerApercu(); }
      });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerApercu(); });
      window.addEventListener('resize', ajusterApercu);
    }
    m.innerHTML = '<div class="pv-boite" role="dialog" aria-modal="true" aria-label="' + esc(t('apercuTitre')) + '"><div class="pv-tete"><strong>' + esc(t('apercuTitre')) + '</strong>' +
      '<button type="button" class="pv-x" data-pvfermer="1" aria-label="' + esc(t('fermer')) + '">×</button></div>' +
      (r.tient ? '' : '<div class="pv-alerte">' + esc(t('tropLong')) + '</div>') +
      '<div class="pv-zone"><div class="pv-cadre">' + pageHtml(r.ops) + '</div></div>' +
      '<div class="pv-pied"><button type="button" class="ml-btn" data-pvfermer="1">' + esc(t('fermer')) + '</button>' +
      '<button type="button" class="ml-btn ml-btn-plein" data-pvpdf="1">⤓ ' + esc(t('fmtPdf')) + '</button></div></div>';
    m.style.display = 'flex'; document.documentElement.style.overflow = 'hidden';
    ajusterApercu();
  }
  function boutonFlottant() {
    var b = document.getElementById('capy-ml-flottant');
    if (!b) {
      b = document.createElement('button'); b.id = 'capy-ml-flottant'; b.type = 'button';
      b.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg><span></span>';
      b.addEventListener('click', ouvrirApercu);
      document.body.appendChild(b);
    }
    b.lastChild.textContent = t('apercuBtn');
    b.style.display = document.getElementById('capy-lettres-zone') && etat.vue === 'modele' && modele(etat.modele).type !== 'assistant' ? 'flex' : 'none';
  }

  /* ------------------------------------------------------------ validation */
  function requis() {
    var r = ['exp_nom', 'exp_ligne', 'exp_ville', 'exp_prov', 'exp_cp', 'dest_nom', 'dest_ligne', 'dest_ville', 'dest_prov', 'dest_cp', 'date_lettre'];
    modele(etat.modele).champs.forEach(function (c) { if (c.req) r.push(c.id); });
    return r;
  }
  function message(txt, ok) {
    var m = document.getElementById('ml-message'); if (!m) return;
    m.textContent = txt || ''; m.className = 'ml-message' + (ok ? ' ok' : ''); m.style.display = txt ? 'block' : 'none';
  }
  /* ---- message d'erreur qui nomme les champs à compléter */
  function libelleChamp(id) {
    var b = racine && racine.querySelector('[data-champ="' + id + '"]'), fr = etat.ui === 'fr', txt = '';
    if (/_stat$/.test(id)) txt = fr ? 'Statut (cochez au moins une ligne)' : 'Status (tick at least one line)';
    else if (b) {
      var l = b.querySelector('label');
      if (l) { var c = l.cloneNode(true); Array.prototype.forEach.call(c.querySelectorAll('.opt'), function (x) { x.parentNode.removeChild(x); }); txt = c.textContent; }
    }
    txt = (txt || id).replace(/\s+/g, ' ').replace(/[\s:*]+$/, '').trim();
    if (txt.length > 60) txt = txt.slice(0, 57).replace(/\s+\S*$/, '') + '…';
    var pre = '';
    if (/^exp_/.test(id)) pre = fr ? 'Expéditeur' : 'Sender';
    else if (/^dest_/.test(id)) pre = fr ? 'Destinataire' : 'Recipient';
    else if (/^cr_c(\d)_/.test(id)) pre = (fr ? 'Compte ' : 'Account ') + id.match(/^cr_c(\d)_/)[1];
    else if (/^cr_p_/.test(id)) pre = fr ? 'Adresse précédente' : 'Previous address';
    else if (/^cr_a_/.test(id)) pre = fr ? 'Adresse actuelle' : 'Current address';
    else if (/^rcp_/.test(id)) pre = fr ? 'Adresse postale' : 'Mailing address';
    else if (/^rcd_/.test(id)) pre = fr ? 'Adresse de résidence' : 'Home address';
    else if (/^rc_s_/.test(id)) pre = fr ? 'Époux ou conjoint' : 'Spouse or partner';
    else if (/^rc_e1_/.test(id)) pre = fr ? 'Enfant 1' : 'Child 1';
    else if (/^rc_e2_/.test(id)) pre = fr ? 'Enfant 2' : 'Child 2';
    else if (/^rc_sch_y_/.test(id)) pre = fr ? 'RC66SCH, vous' : 'RC66SCH, you';
    else if (/^rc_sch_s_/.test(id)) pre = fr ? 'RC66SCH, conjoint' : 'RC66SCH, partner';
    return pre ? pre + ' : ' + txt : txt;
  }
  function msgChamps(ids, debutFr, debutEn) {
    var vus = {}, noms = [];
    ids.forEach(function (id) { var n = libelleChamp(id); if (!vus[n]) { vus[n] = 1; noms.push(n); } });
    var fr = etat.ui === 'fr', max = 8, liste = noms.slice(0, max).join(fr ? ' ; ' : '; ') + (noms.length > max ? (fr ? ' et ' + (noms.length - max) + ' autre(s)' : ' and ' + (noms.length - max) + ' more') : '');
    return (fr ? debutFr : debutEn) + ' ' + liste + '. ' + (fr ? 'Ces champs sont en rouge.' : 'These fields are shown in red.');
  }
  function msgManque(ids) { return msgChamps(ids, 'À compléter ou corriger :', 'To complete or correct:'); }
  function msgCp(ids) { return msgChamps(ids, 'Code postal à vérifier (format A1A 1A1) :', 'Postal code to check (format A1A 1A1):'); }

  function valider() {
    var premier = null;
    racine.querySelectorAll('.ml-err').forEach(function (e) { e.classList.remove('ml-err'); });
    var cpKo = ['exp_cp', 'dest_cp'].filter(function (id) { return val(id) && !cpValide(val(id)); });
    var manque = CM.manquesLettre(modele(etat.modele).champs, etat.v, {}).filter(function (id) { return cpKo.indexOf(id) === -1; });
    manque.concat(cpKo).forEach(function (id) {
      var b = racine.querySelector('[data-champ="' + id + '"]'); if (b) { b.classList.add('ml-err'); b.setAttribute('data-err', etat.ui === 'fr' ? 'Champ nécessaire pour la validation' : 'Required field to continue'); if (!premier) premier = b; }
    });
    if (manque.length || cpKo.length) {
      message(manque.length ? msgManque(manque.concat(cpKo)) : msgCp(cpKo));
      if (premier && premier.scrollIntoView) premier.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    if (!window.jspdf) { message('PDF : jsPDF not loaded'); return false; }
    var r = construirePdf();
    if (!r.tient) { message(t('tropLong')); return false; }
    message('');
    return r;
  }

  /* ------------------------------------------------------------ recherche d'adresse (OpenStreetMap / Nominatim, sur clic) */
  var resultats = {};
  function rechercher(pfx) {
    var q = (document.getElementById('ml-' + pfx + '_q') || {}).value || '';
    var ul = document.getElementById('ml-' + pfx + '_res');
    if (!q.trim() || !ul) return;
    ul.style.display = 'block'; ul.innerHTML = '<li class="vide">' + esc(t('rechEnCours')) + '</li>';
    var url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=ca&accept-language=' + (etat.ui === 'fr' ? 'fr' : 'en') + '&q=' + encodeURIComponent(q.trim());
    fetch(url, { headers: { 'Accept': 'application/json' } }).then(function (r) { return r.json(); }).then(function (data) {
      resultats[pfx] = (data || []).filter(function (x) { return x.address; });
      if (!resultats[pfx].length) { ul.innerHTML = '<li class="vide">' + esc(t('rechAucun')) + '</li>'; return; }
      ul.innerHTML = resultats[pfx].map(function (x, i) { return '<li data-res="' + pfx + '" data-i="' + i + '">' + esc(x.display_name) + '</li>'; }).join('');
    }).catch(function () { ul.innerHTML = '<li class="vide">' + esc(t('rechErreur')) + '</li>'; });
  }
  function choisir(pfx, i) {
    var x = (resultats[pfx] || [])[i]; if (!x) return;
    var a = x.address || {};
    var rue = a.road || a.pedestrian || a.street || a.footway || '';
    var ligne = ((a.house_number ? a.house_number + ' ' : '') + rue).trim();
    if (!ligne) ligne = x.name || '';
    var ville = a.city || a.town || a.village || a.municipality || a.hamlet || a.suburb || '';
    var p = '';
    (/^rc/.test(pfx) ? PROVINCES_RC : PROVINCES).forEach(function (pr) { pr.osm.forEach(function (n) { if ((a.state || '').indexOf(n) !== -1) p = pr.fr; }); });
    etat.v[pfx + '_ligne'] = ligne; etat.v[pfx + '_ville'] = ville; if (p) etat.v[pfx + '_prov'] = p; etat.v[pfx + '_cp'] = a.postcode ? cpNormal(a.postcode) : (etat.v[pfx + '_cp'] || '');
    [pfx + '_ligne', pfx + '_ville', pfx + '_prov', pfx + '_cp'].forEach(function (id) { var e = document.getElementById('ml-' + id); if (e) e.value = etat.v[id] || ''; });
    [pfx + '_ligne', pfx + '_ville', pfx + '_prov', pfx + '_cp'].forEach(function (id) { var b = racine.querySelector('[data-champ="' + id + '"]'); if (b && val(id)) b.classList.remove('ml-err'); });
    var ul = document.getElementById('ml-' + pfx + '_res'); if (ul) { ul.style.display = 'none'; ul.innerHTML = ''; }
    apercu();
    var focus = document.getElementById('ml-' + pfx + (a.postcode ? '_ligne' : '_cp')); if (focus) focus.focus();
  }

  /* ------------------------------------------------------------ événements */
  function brancher() {
    racine.addEventListener('input', function (e) {
      if (e.target.id === 'ml-sig-texte') {
        etat.sig.texte = e.target.value;
        var nm = (etat.sig.texte || '').trim() || (etat.v.exp_nom || '').trim() || t('sigExemple');
        racine.querySelectorAll('.ml-police').forEach(function (x) { x.textContent = nm; });
        return;
      }
      if (e.target.getAttribute('data-k') === 'exp_nom' && etat.sig.mode === 'police' && !(etat.sig.texte || '').trim()) {
        var nm2 = (e.target.value || '').trim() || t('sigExemple');
        racine.querySelectorAll('.ml-police').forEach(function (x) { x.textContent = nm2; });
      }
    });
    brancherDessin();
    racine.addEventListener('input', function (e) { var k = e.target.getAttribute('data-k'); if (k === 'cr_decl') { var mm = document.getElementById('ml-cr-mots'); if (mm) mm.textContent = mots(e.target.value) + ' / ' + crLimiteMots() + L(' mots', ' words'); } if (k) { etat.v[k] = e.target.value; apercu(); var b = e.target.closest('.ml-err'); if (b) b.classList.remove('ml-err'); } });
    racine.addEventListener('change', function (e) {
      if (rcChange(e.target)) return;
      if (e.target.id === 'ml-sig-fichier') { lirePhoto(e.target.files && e.target.files[0]); return; }
      if (e.target.getAttribute('data-sigtransp')) { etat.sig.transp = e.target.checked; traiterPhoto(); rendreSignature(); return; }
      if (e.target.getAttribute('data-optlien')) { etat.lienPied = e.target.checked; return; }
    });
    racine.addEventListener('change', function (e) { var k = e.target.getAttribute('data-k'); if (k) { if (/_cp$/.test(k) && cpValide(e.target.value)) { e.target.value = cpNormal(e.target.value); } etat.v[k] = e.target.value; apercu(); } });
    racine.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && e.target.id && /_q$/.test(e.target.id)) { e.preventDefault(); rechercher(e.target.id.replace(/^ml-/, '').replace(/_q$/, '')); }
    });
    racine.addEventListener('click', function (e) {
      var b = e.target.closest('button, li'); if (!b) return;
      if (crClic(b)) return;
      if (rcClic(b, e)) return;
      if (b.getAttribute('data-vue')) { allerA('sections'); return; }
      if (b.getAttribute('data-section')) { allerA('section', b.getAttribute('data-section')); return; }
      if (b.getAttribute('data-sigmode')) { etat.sig.mode = b.getAttribute('data-sigmode'); rendreSignature(); return; }
      if (b.getAttribute('data-sigcouleur')) { etat.sig.couleur = b.getAttribute('data-sigcouleur'); rendreSignature(); return; }
      if (b.getAttribute('data-sigpolice')) { etat.sig.police = parseInt(b.getAttribute('data-sigpolice'), 10); rendreSignature(); return; }
      if (b.getAttribute('data-sigeffacer')) { etat.sig.traits = []; redessinerCanvas(); return; }
      if (b.getAttribute('data-modele')) { allerA('modele', b.getAttribute('data-modele')); return; }
      if (b.getAttribute('data-lettre')) { etat.lettre = b.getAttribute('data-lettre'); racine.querySelectorAll('[data-lettre]').forEach(function (x) { x.classList.toggle('actif', x === b); }); apercu(); return; }
      if (b.getAttribute('data-rech')) { rechercher(b.getAttribute('data-rech')); return; }
      if (b.getAttribute('data-res')) { choisir(b.getAttribute('data-res'), parseInt(b.getAttribute('data-i'), 10)); return; }
      if (b.getAttribute('data-format')) {
        var r = valider(); if (!r) return;
        telecharger(b.getAttribute('data-format'), r); message(t('pdfOk'), true);
      }
    });
    // Le bouton Bubble « Envoyer par la poste » ne part que si le formulaire est complet.
    ['pointerdown', 'mousedown', 'touchstart', 'click'].forEach(function (ev) {
      document.addEventListener(ev, function (e) {
        var b = e.target && e.target.closest ? e.target.closest('#capy-btn-poste') : null;
        if (!b) return;
        if (etat.envoiEnCours) { e.stopPropagation(); e.preventDefault(); return; }
        var ass = estAssistant();
        if (ev === 'click' && !(ass ? rcPretPoste() : valider())) { e.stopPropagation(); e.preventDefault(); }
        else if (ev !== 'click' && !(ass ? rcPosteManques().length === 0 : formulaireComplet())) { e.stopPropagation(); }
      }, true);
    });
  }
  function formulaireComplet() { return CM.manquesLettre(modele(etat.modele).champs, etat.v, {}).length === 0; }
  function nomFichier(ext) { return CM.nomBase(modele(etat.modele)[langueLettre()] + ' ' + val('dest_nom'), 'lettre') + '.' + (ext || 'pdf'); }


  /* ------------------------------------------------------------ URL, titre et métadonnées de chaque vue : /modeles-lettres, /modeles-lettres/<section>, /modeles-lettres/<modèle> */
  var SLUGS = {}, TITRES = {}, DESCRIPTIONS = {}, H1S = {};
  DEF.modeles.forEach(function (d) { SLUGS[d.id] = d.seo.slug; TITRES[d.id] = d.seo.titre; DESCRIPTIONS[d.id] = d.seo.description; H1S[d.id] = d.seo.h1; });



  function routeDepuisUrl() {
    var m = window.location.pathname.match(/\/modeles-lettres\/([^\/?#]+)/);
    if (!m) return { vue: 'sections' };
    var s = decodeURIComponent(m[1]).toLowerCase(), id, i;
    for (id in SLUGS) {
      if (SLUGS[id].fr === s || id === s) return { vue: 'modele', id: id, l: 'fr' };
      if (SLUGS[id].en === s) return { vue: 'modele', id: id, l: 'en' };
    }
    for (i = 0; i < SECTIONS.length; i++) {
      if (SECTIONS[i].slug.fr === s || SECTIONS[i].id === s) return { vue: 'section', id: SECTIONS[i].id, l: 'fr' };
      if (SECTIONS[i].slug.en === s) return { vue: 'section', id: SECTIONS[i].id, l: 'en' };
    }
    return { vue: 'sections' };
  }
  function seoVue() {
    var u = etat.ui;
    if (etat.vue === 'modele') return { chemin: SLUGS[etat.modele][u], titre: TITRES[etat.modele][u], desc: DESCRIPTIONS[etat.modele][u], h1: H1S[etat.modele][u] };
    if (etat.vue === 'section') { var s = section(etat.section); return { chemin: s.slug[u], titre: s[u] + (u === 'fr' ? ' : modèles de lettres gratuits | Capycom' : ': free letter templates | Capycom'), desc: s.seo[u], h1: s[u] }; }
    var o = etat.seo0 || {};
    return { chemin: '', titre: o.titre && o.l === u ? o.titre : (u === 'fr' ? 'Modèles de lettres gratuits (PDF, Word) | Capycom' : 'Free letter templates (PDF, Word) | Capycom'),
      desc: o.desc && o.l === u ? o.desc : (u === 'fr' ? 'Modèles de lettres gratuits : résiliation, remboursement, contestation de facture, changement d’adresse, allocation pour enfants. Téléchargez-les ou faites-les poster au Canada.' : 'Free letter templates: cancellation, refund, bill dispute, change of address, child benefit. Download them or have them mailed in Canada.'),
      h1: o.h1 && o.l === u ? o.h1 : (u === 'fr' ? 'Modèles de lettres' : 'Letter templates') };
  }
  function majUrl(pousser) {
    try {
      var chemin = window.location.pathname, i = chemin.indexOf('/modeles-lettres');
      if (i === -1) return;
      var v = seoVue(), base = chemin.slice(0, i) + '/modeles-lettres', nouveau = v.chemin ? base + '/' + v.chemin : base;
      var dejaProfond = /\/modeles-lettres\/[^\/?#]+/.test(chemin);
      if (nouveau !== chemin && (pousser || dejaProfond)) {
        var cible = nouveau + window.location.search + window.location.hash;
        if (pousser) window.history.pushState(window.history.state, '', cible); else window.history.replaceState(window.history.state, '', cible);
      }
      document.title = v.titre;
      var h1 = document.getElementById('capy-titre-page');
      if (h1) { h1.textContent = v.h1; h1.setAttribute('data-capy-txt', h1.textContent); h1.setAttribute('data-capy-l', etat.ui); }
      var md = document.querySelector('meta[name="description"]'); if (md) md.setAttribute('content', v.desc);
      var od = document.querySelector('meta[property="og:description"]'); if (od) od.setAttribute('content', v.desc);
      var ot = document.querySelector('meta[property="og:title"]'); if (ot) ot.setAttribute('content', v.titre);
      var cn = document.querySelector('link[rel="canonical"]'); if (cn) cn.setAttribute('href', window.location.origin + window.location.pathname);
    } catch (e) { console.log('CAPYCOM modele url', e); }
  }
  function surRetour() {
    var rt = routeDepuisUrl();
    etat.vue = rt.vue;
    if (rt.vue === 'modele') { etat.modele = rt.id; etat.section = sectionDe(rt.id); etat.lettre = rt.l !== etat.ui ? rt.l : null; }
    else if (rt.vue === 'section') etat.section = rt.id;
    rendre(); majUrl(false);
  }

  /* ------------------------------------------------------------ Word (.docx) et OpenDocument (.odt), générés dans le navigateur */
  function xml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  var tableCrc = null;
  function crc32(u8) {
    if (!tableCrc) { tableCrc = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tableCrc[n] = c >>> 0; } }
    var crc = 0xFFFFFFFF;
    for (var i = 0; i < u8.length; i++) crc = (crc >>> 8) ^ tableCrc[(crc ^ u8[i]) & 255];
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStocke(fichiers, type) {   // zip sans compression (suffit pour quelques Ko de XML, et obligatoire pour le mimetype ODT)
    var enc = new TextEncoder(), morceaux = [], central = [], decalage = 0;
    fichiers.forEach(function (f) {
      var nom = enc.encode(f.nom), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
      var h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0, true); h.setUint16(8, 0, true);
      h.setUint16(10, 0, true); h.setUint16(12, 0x21, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true);
      h.setUint32(22, data.length, true); h.setUint16(26, nom.length, true); h.setUint16(28, 0, true);
      morceaux.push(h.buffer, nom, data);
      var c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0, true); c.setUint16(10, 0, true);
      c.setUint16(12, 0, true); c.setUint16(14, 0x21, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, nom.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
      c.setUint32(38, 0, true); c.setUint32(42, decalage, true);
      central.push(c.buffer, nom);
      decalage += 30 + nom.length + data.length;
    });
    var tailleCentral = central.reduce(function (t, x) { return t + (x.byteLength !== undefined ? x.byteLength : x.length); }, 0);
    var fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCentral, true); fin.setUint32(16, decalage, true);
    return new Blob(morceaux.concat(central, [fin.buffer]), { type: type });
  }
  function octets(url) {
    var b = atob(url.split(',')[1]), u = new Uint8Array(b.length);
    for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  }
  // Mêmes blocs que le PDF : expéditeur, destinataire décalé à droite, objet, corps ; date, signature et identité vont dans le pied de page du document.
  function structureDoc() {
    var L = composer(), fr = langueLettre() === 'fr', P = [];
    function add(lignes, o) { o = o || {}; P.push({ lignes: lignes, gras: !!o.gras, apres: o.apres || 0, ind: o.ind || 0 }); }
    L.exp.forEach(function (s, i) { add([s], { gras: i === 0, apres: i === L.exp.length - 1 ? 20 : 0 }); });
    L.dest.forEach(function (s, i) { add([s], { gras: i === 0, ind: 1, apres: i === L.dest.length - 1 ? 26 : 0 }); });
    add([(fr ? 'Objet : ' : 'Re: ') + L.objet], { gras: true, apres: 12 });
    add([L.salut], { apres: 10 });
    L.corps.forEach(function (p) { add(String(p).split('\n'), { apres: 10 }); });
    add([L.politesse], { apres: 10 });
    if (L.politesse2) add([L.politesse2], { apres: 10 });
    return { P: P, L: L, sig: signatureImage(), lien: etat.lienPied ? (fr ? 'Modèle gratuit : capycom.ca' : 'Free template: capycom.ca') : '' };
  }
  function docx() {
    var S = structureDoc(), L = S.L, sig = S.sig;
    var IND = 4600;   // décalage du destinataire et de la signature (twips, 8,1 cm)
    var corps = S.P.map(function (p) {
      var rpr = p.gras ? '<w:rPr><w:b/></w:rPr>' : '';
      var runs = p.lignes.map(function (l, i) { return (i ? '<w:r><w:br/></w:r>' : '') + '<w:r>' + rpr + '<w:t xml:space="preserve">' + xml(l) + '</w:t></w:r>'; }).join('');
      return '<w:p><w:pPr><w:spacing w:after="' + p.apres * 20 + '"/>' + (p.ind ? '<w:ind w:left="' + IND + '"/>' : '') + '</w:pPr>' + runs + '</w:p>';
    }).join('');
    var W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
    var R = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
    var WP = 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"';
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var imageRun = '';
    if (sig) {
      var d = dimSig(sig, 62, 20), cx = Math.round(d.w * 36000), cy = Math.round(d.h * 36000);
      imageRun = '<w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0"><wp:extent cx="' + cx + '" cy="' + cy + '"/><wp:docPr id="1" name="Signature"/><wp:cNvGraphicFramePr><a:graphicFrameLocks xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" noChangeAspect="1"/></wp:cNvGraphicFramePr>' +
        '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="0" name="signature.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' + cx + '" cy="' + cy + '"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>';
    }
    var cellG = '<w:tc><w:tcPr><w:tcW w:w="' + IND + '" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr><w:p><w:pPr><w:spacing w:before="120" w:after="0"/></w:pPr><w:r><w:t xml:space="preserve">' + xml(L.dateLigne) + '</w:t></w:r></w:p></w:tc>';
    var cellD = '<w:tc><w:tcPr><w:tcW w:w="' + (9406 - IND) + '" w:type="dxa"/><w:vAlign w:val="bottom"/></w:tcPr>' +
      '<w:p><w:pPr><w:spacing w:before="' + (sig ? 0 : 700) + '" w:after="0"/></w:pPr>' + imageRun + '</w:p>' +
      '<w:p><w:pPr><w:pBdr><w:top w:val="single" w:sz="4" w:space="2" w:color="888888"/></w:pBdr><w:spacing w:before="40" w:after="0"/><w:ind w:right="900"/></w:pPr><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">' + xml(L.nom) + '</w:t></w:r></w:p></w:tc>';
    function ligneCentre(txt, couleur, taille, avant, bordure) {
      return '<w:p><w:pPr>' + (bordure ? '<w:pBdr><w:top w:val="single" w:sz="4" w:space="4" w:color="CCCCCC"/></w:pBdr>' : '') + '<w:spacing w:before="' + avant + '" w:after="0"/><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:color w:val="' + couleur + '"/><w:sz w:val="' + taille + '"/><w:szCs w:val="' + taille + '"/></w:rPr><w:t xml:space="preserve">' + xml(txt) + '</w:t></w:r></w:p>';
    }
    var pied = '<w:ftr ' + W + ' ' + R + ' ' + WP + '><w:tbl><w:tblPr><w:tblW w:w="9406" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="' + IND + '"/><w:gridCol w:w="' + (9406 - IND) + '"/></w:tblGrid><w:tr>' + cellG + cellD + '</w:tr></w:tbl>' +
      ligneCentre(L.pied, '666666', 16, 360, true) + (S.lien ? ligneCentre(S.lien, '999999', 15, 0, false) : '') + '</w:ftr>';
    var fichiers = [
      { nom: '[Content_Types].xml', data: x + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/></Types>' },
      { nom: '_rels/.rels', data: x + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
      { nom: 'word/_rels/document.xml.rels', data: x + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>' },
      { nom: 'word/styles.xml', data: x + '<w:styles ' + W + '><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial" w:cs="Arial" w:eastAsia="Arial"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="' + (langueLettre() === 'fr' ? 'fr-CA' : 'en-CA') + '"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="0" w:line="288" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style></w:styles>' },
      { nom: 'word/footer1.xml', data: x + pied },
      { nom: 'word/document.xml', data: x + '<w:document ' + W + ' ' + R + '><w:body>' + corps + '<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="1417" w:right="1417" w:bottom="1134" w:left="1417" w:header="708" w:footer="567" w:gutter="0"/></w:sectPr></w:body></w:document>' }
    ];
    if (sig) {
      fichiers.push({ nom: 'word/_rels/footer1.xml.rels', data: x + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature.png"/></Relationships>' });
      fichiers.push({ nom: 'word/media/signature.png', data: octets(sig.url) });
    }
    return zipStocke(fichiers, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  }
  function odt() {
    var S = structureDoc(), L = S.L, sig = S.sig;
    var styles = {}, auto = '';
    function nomStyle(p) {
      var k = (p.gras ? 'G' : 'N') + p.apres + (p.ind ? 'D' : '');
      if (!styles[k]) {
        styles[k] = 'P' + Object.keys(styles).length;
        auto += '<style:style style:name="' + styles[k] + '" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="' + (p.apres * 0.0353).toFixed(3) + 'cm"' + (p.ind ? ' fo:margin-left="8.1cm"' : '') + '/>' + (p.gras ? '<style:text-properties fo:font-weight="bold"/>' : '') + '</style:style>';
      }
      return styles[k];
    }
    function texteOdt(l) { return xml(l).replace(/ {2,}/g, function (m) { return ' <text:s text:c="' + (m.length - 1) + '"/>'; }); }
    var corps = S.P.map(function (p) { return '<text:p text:style-name="' + nomStyle(p) + '">' + p.lignes.map(texteOdt).join('<text:line-break/>') + '</text:p>'; }).join('');
    var NS = 'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0" office:version="1.2"';
    var x = '<?xml version="1.0" encoding="UTF-8"?>';
    var lang = langueLettre() === 'fr' ? 'fo:language="fr" fo:country="CA"' : 'fo:language="en" fo:country="CA"';
    var imageOdt = '';
    if (sig) {
      var d = dimSig(sig, 62, 20);
      imageOdt = '<draw:frame draw:style-name="fr1" text:anchor-type="as-char" svg:width="' + (d.w / 10).toFixed(3) + 'cm" svg:height="' + (d.h / 10).toFixed(3) + 'cm"><draw:image xlink:href="Pictures/signature.png" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/></draw:frame>';
    }
    var autoStyles = '<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21.59cm" fo:page-height="27.94cm" style:print-orientation="portrait" fo:margin-top="2.5cm" fo:margin-bottom="1cm" fo:margin-left="2.5cm" fo:margin-right="2.5cm"/><style:footer-style><style:header-footer-properties fo:min-height="0cm" fo:margin-top="0.4cm" style:dynamic-spacing="true"/></style:footer-style></style:page-layout>' +
      '<style:style style:name="Tpied" style:family="table"><style:table-properties style:width="16.59cm" table:align="left"/></style:style>' +
      '<style:style style:name="Tc1" style:family="table-column"><style:table-column-properties style:column-width="8.1cm"/></style:style>' +
      '<style:style style:name="Tc2" style:family="table-column"><style:table-column-properties style:column-width="8.49cm"/></style:style>' +
      '<style:style style:name="Tcell" style:family="table-cell"><style:table-cell-properties fo:padding="0cm" fo:border="none"/></style:style>' +
      '<style:style style:name="Pdate" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0.2cm" fo:margin-bottom="0cm"/></style:style>' +
      '<style:style style:name="Psig" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="' + (sig ? '0cm' : '1.2cm') + '" fo:margin-bottom="0cm"/></style:style>' +
      '<style:style style:name="Pnom" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0.07cm" fo:margin-bottom="0cm" fo:margin-right="1.5cm" fo:border-top="0.5pt solid #888888" fo:padding-top="0.08cm"/><style:text-properties fo:font-weight="bold"/></style:style>' +
      '<style:style style:name="Pid" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0.6cm" fo:margin-bottom="0cm" fo:text-align="center" fo:border-top="0.5pt solid #cccccc" fo:padding-top="0.12cm"/><style:text-properties fo:font-size="8pt" fo:color="#666666"/></style:style>' +
      '<style:style style:name="Plien" style:family="paragraph" style:parent-style-name="Standard"><style:paragraph-properties fo:margin-top="0cm" fo:margin-bottom="0cm" fo:text-align="center"/><style:text-properties fo:font-size="7.5pt" fo:color="#999999"/></style:style>' +
      '<style:style style:name="fr1" style:family="graphic"><style:graphic-properties style:vertical-pos="bottom" style:vertical-rel="baseline" style:horizontal-pos="from-left" style:horizontal-rel="paragraph" fo:padding="0cm" fo:border="none"/></style:style>';
    var piedXml = '<style:footer><table:table table:name="PiedSignature" table:style-name="Tpied"><table:table-column table:style-name="Tc1"/><table:table-column table:style-name="Tc2"/><table:table-row>' +
      '<table:table-cell table:style-name="Tcell" office:value-type="string"><text:p text:style-name="Pdate">' + texteOdt(L.dateLigne) + '</text:p></table:table-cell>' +
      '<table:table-cell table:style-name="Tcell" office:value-type="string"><text:p text:style-name="Psig">' + imageOdt + '</text:p><text:p text:style-name="Pnom">' + texteOdt(L.nom) + '</text:p></table:table-cell>' +
      '</table:table-row></table:table><text:p text:style-name="Pid">' + texteOdt(L.pied) + '</text:p>' + (S.lien ? '<text:p text:style-name="Plien">' + texteOdt(S.lien) + '</text:p>' : '') + '</style:footer>';
    var fichiers = [
      { nom: 'mimetype', data: 'application/vnd.oasis.opendocument.text' },
      { nom: 'META-INF/manifest.xml', data: x + '<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2"><manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.text"/><manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/><manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>' + (sig ? '<manifest:file-entry manifest:full-path="Pictures/signature.png" manifest:media-type="image/png"/>' : '') + '</manifest:manifest>' },
      { nom: 'styles.xml', data: x + '<office:document-styles ' + NS + '><office:font-face-decls><style:font-face style:name="Arial" svg:font-family="Arial"/></office:font-face-decls><office:styles><style:default-style style:family="paragraph"><style:paragraph-properties fo:line-height="120%"/><style:text-properties style:font-name="Arial" fo:font-size="12pt" ' + lang + '/></style:default-style><style:style style:name="Standard" style:family="paragraph" style:class="text"/></office:styles><office:automatic-styles>' + autoStyles + '</office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1">' + piedXml + '</style:master-page></office:master-styles></office:document-styles>' },
      { nom: 'content.xml', data: x + '<office:document-content ' + NS + '><office:font-face-decls><style:font-face style:name="Arial" svg:font-family="Arial"/></office:font-face-decls><office:automatic-styles>' + auto + '</office:automatic-styles><office:body><office:text>' + corps + '</office:text></office:body></office:document-content>' }
    ];
    if (sig) fichiers.push({ nom: 'Pictures/signature.png', data: octets(sig.url) });
    return zipStocke(fichiers, 'application/vnd.oasis.opendocument.text');
  }
  function telecharger(format, r) {
    if (format === 'pdf') { r.pdf.save(nomFichier('pdf')); return; }
    var blob = format === 'docx' ? docx() : odt();
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nomFichier(format);
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  /* ------------------------------------------------------------ envoi par la poste (appelé par le workflow Bubble après création du brouillon) */
  function envoyer(idCourrier) {
    var base = window.location.origin + (window.location.pathname.indexOf('/version-test') === 0 ? '/version-test' : '');
    var RACINE = base + '/api/1.1/wf/';
    if (etat.envoiEnCours) return;
    if (estAssistant()) { rcEnvoyer(idCourrier); return; }
    var r = valider();
    if (!r) { console.log('CAPYCOM modele : formulaire incomplet, brouillon ' + idCourrier + ' laissé vide'); return; }
    etat.envoiEnCours = true;
    var ov = document.getElementById('capy-ml-overlay'); if (ov) { ov.textContent = t('envoi'); ov.style.display = 'flex'; }
    var contenu = r.pdf.output('datauristring').split(',')[1];
    function post(wf, corps) {
      return fetch(RACINE + wf, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
        .then(function (x) { return x.json().then(function (j) { console.log('CAPYCOM ' + wf, x.status, JSON.stringify(j).slice(0, 300)); if (!x.ok) throw new Error(wf + ' ' + x.status); return j; }); });
    }
    function texteAdresse(pfx) {
      var p = prov(val(pfx + '_prov'));
      return [val(pfx + '_nom'), val(pfx + '_ligne'), val(pfx + '_ville'), p ? p.en : '', cpNormal(val(pfx + '_cp')), 'Canada'].join('\n');
    }
    var adresses = {
      id_courrier: idCourrier,
      dest_nom: val('dest_nom') + (val('dest_service') ? ', ' + val('dest_service') : ''), dest_ligne: val('dest_ligne'), dest_ville: val('dest_ville'),
      dest_province: val('dest_prov'), dest_code_postal: cpNormal(val('dest_cp')),
      exp_nom: val('exp_nom'), exp_ligne: val('exp_ligne'), exp_ville: val('exp_ville'), exp_province: val('exp_prov'), exp_code_postal: cpNormal(val('exp_cp'))
    };
    adresses.dest_texte = texteAdresse('dest').replace(val('dest_nom'), adresses.dest_nom);
    adresses.exp_texte = texteAdresse('exp');
    post('creer_page_vide', { id_courrier: idCourrier })
      .then(function (d1) {
        var idPage = d1.response && d1.response.id_page; if (!idPage) throw new Error('id_page');
        return post('generer_pdf', { contenu_base64: { filename: nomFichier(), contents: contenu, private: true, attach_to: idPage }, id_page_cible: idPage });
      })
      .then(function () { return post('completer_courrier_modele', adresses); })
      .then(function () { window.location.href = base + '/5-summary/' + idCourrier; })
      .catch(function (err) {
        console.log('CAPYCOM erreur envoi modele', err && err.message);
        if (ov) ov.textContent = t('envoiErreur');
        setTimeout(function () { window.location.href = base + '/1-mail/' + idCourrier; }, 3500);
      });
  }

  /* ------------------------------------------------------------ langue de l'interface (suit le titre Bubble de la page) */
  function langueUi() {
    var titre = document.getElementById('capy-titre-page');
    var txt = titre ? (titre.textContent || '') : '';
    if (titre && titre.getAttribute('data-capy-txt') === txt) return titre.getAttribute('data-capy-l') || 'fr';   // texte posé par ce script : on garde sa langue
    return /^\s*Letter/i.test(txt) ? 'en' : 'fr';
  }

  /* ------------------------------------------------------------ sections de modèles (accueil, section, modèle) */
  var SECTIONS = DEF.commun.sections.map(function (s) { return { id: s.id, fr: s.titre.fr, en: s.titre.en, modeles: s.modeles, slug: s.slug, desc: s.description, seo: s.seo }; });
  var DESC_MODELE = {};
  DEF.modeles.forEach(function (d) { DESC_MODELE[d.id] = d.description; });
  function section(id) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].id === id) return SECTIONS[i]; return SECTIONS[0]; }
  function sectionDe(idModele) { for (var i = 0; i < SECTIONS.length; i++) if (SECTIONS[i].modeles.indexOf(idModele) !== -1) return SECTIONS[i].id; return SECTIONS[0].id; }
  function estAssistant() { return etat.vue === 'modele' && modele(etat.modele).type === 'assistant'; }

  var ICONES = {credit: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 3v6c0 4.5-3.2 7.7-8 9-4.8-1.3-8-4.5-8-9V6z"/><path d="M8.5 12.2l2.4 2.4 4.6-4.8"/></svg>',resiliation: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9.5 12.5l5 5M14.5 12.5l-5 5"/></svg>',adresse: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',remboursement: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4v16l2.5-1.5L9 20l3-1.5L15 20l2.5-1.5L20 20V4z"/><path d="M8 9h8M8 13h5"/></svg>',contestation: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17.2v.1"/></svg>',demeure: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2"/><path d="M9 3h6"/></svg>',rc66: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.5 20c0-3.2 2.5-5.5 5.5-5.5s5.5 2.3 5.5 5.5"/><path d="M15 15.2c2.7-.6 5.5 1 5.5 4.3"/></svg>',s_contrats: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',s_argent: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 15h2"/></svg>',s_logement: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',s_gouv: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10l9-6 9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/></svg>'};
  var ICONE_SECTION = { contrats: 's_contrats', argent: 's_argent', logement: 's_logement', gouv: 's_gouv' };
  function icone(cle) { return ICONES[cle] ? '<span class="ml-ico" aria-hidden="true">' + ICONES[cle] + '</span>' : ''; }
  function icSec(id) { return icone(ICONE_SECTION[id]); }
  function tuile(id) {
    var M = modele(id), u = etat.ui, off = M.type === 'assistant';
    return '<button type="button" class="ml-tuile" data-modele="' + id + '">' +
      (off ? '<span class="ml-badge">' + esc(u === 'fr' ? 'Formulaire officiel' : 'Official form') + '</span>' : '') +
      '<span class="ml-tuile-tete">' + icone(id) + '<span class="ml-tuile-t">' + esc(M[u]) + '</span></span><span class="ml-tuile-d">' + esc(DESC_MODELE[id][u]) + '</span>' +
      '<span class="ml-tuile-go">' + esc(u === 'fr' ? 'Remplir' : 'Fill in') + ' →</span></button>';
  }
  function vueSections() {
    var u = etat.ui;
    return '<div class="ml-sections">' + SECTIONS.map(function (s) {
      var n = s.modeles.length, aff = s.modeles.slice(0, 3);
      return '<section class="ml-sec"><div class="ml-sec-tete"><div><h2>' + icSec(s.id) + esc(s[u]) + '</h2><p>' + esc(s.desc[u]) + '</p></div>' +
        (n > 3 ? '<button type="button" class="ml-lien" data-section="' + s.id + '">' + esc(u === 'fr' ? 'Tout voir (' + n + ')' : 'See all (' + n + ')') + ' →</button>' : '') +
        '</div><div class="ml-tuiles">' + aff.map(tuile).join('') + '</div></section>';
    }).join('') + '</div>' +
      '<p class="ml-note">' + esc(t('note')) + '</p>';
  }
  function fil() {
    var u = etat.ui, h = '<nav class="ml-fil" aria-label="' + (u === 'fr' ? 'Fil d’Ariane' : 'Breadcrumb') + '"><button type="button" data-vue="sections">' + esc(u === 'fr' ? 'Tous les modèles' : 'All templates') + '</button>';
    if (etat.vue === 'section') h += '<span aria-hidden="true">›</span><span class="ml-fil-ici">' + esc(section(etat.section)[u]) + '</span>';
    if (etat.vue === 'modele') h += '<span aria-hidden="true">›</span><button type="button" data-section="' + etat.section + '">' + esc(section(etat.section)[u]) + '</button><span aria-hidden="true">›</span><span class="ml-fil-ici">' + esc(modele(etat.modele)[u]) + '</span>';
    return h + '</nav>';
  }
  function vueSection() {
    var s = section(etat.section), u = etat.ui;
    return fil() + '<div class="ml-sec-tete ml-sec-seule"><div><h2>' + icSec(s.id) + esc(s[u]) + '</h2><p>' + esc(s.desc[u]) + '</p></div></div><div class="ml-tuiles">' + s.modeles.map(tuile).join('') + '</div>';
  }
  function autresModeles() {
    var s = section(etat.section), u = etat.ui, autres = s.modeles.filter(function (m) { return m !== etat.modele; });
    if (!autres.length) return '';
    return '<div class="ml-autres"><p class="ml-autres-t">' + esc(u === 'fr' ? 'Autres modèles de cette section' : 'Other templates in this section') + '</p><div class="ml-tuiles">' + autres.map(tuile).join('') + '</div></div>';
  }
  function allerA(vue, id, sansHistorique) {
    etat.vue = vue;
    if (vue === 'section') etat.section = id;
    if (vue === 'modele') { etat.modele = id; etat.section = sectionDe(id); etat.lettre = null; }
    message('');
    rendre();
    majUrl(!sansHistorique);
    var z = document.getElementById('capy-lettres-zone');
    if (z && z.scrollIntoView && !sansHistorique) { try { z.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { z.scrollIntoView(); } }
  }


  var PROVINCES_RC = CM.PROVINCES_RC;
  function provRc(fr) { return CM.provRc(fr); }
  var CENTRES = DEF.commun.centres;
  function centreDe(provFr) {
    var p = provRc(provFr); if (!p) return null;
    if (p.ab === 'QC') return CENTRES.jonquiere;
    if (['PE', 'NB', 'NS', 'ON', 'NL'].indexOf(p.ab) !== -1) return CENTRES.sudbury;
    return CENTRES.winnipeg;
  }
  var LIENS_RC = {};
  Object.keys(DEF.commun.liens).forEach(function (k) { LIENS_RC[k] = DEF.commun.liens[k].fr; LIENS_RC[k + 'En'] = DEF.commun.liens[k].en; });
  // Moteur : lecture des réponses (étapes actives, réponses manquantes, pièces) pour le RC66 et pour le crédit
  function moteurRc() { return CM.ctxRc(etat.v, { rc: etat.rc }); }
  function moteurCr() { return CM.ctxCr(etat.v, { ui: etat.ui, cr: etat.cr }); }
  function docsUi(docs) {
    return docs.map(function (d) {
      var x = { id: d.id, req: d.req, titre: d[etat.ui].titre, aide: d[etat.ui].aide };
      if (d.lien) x.lien = [d.lien.cle, d.lien[etat.ui]];
      return x;
    });
  }
  function lienRc(k) { return etat.ui === 'fr' ? LIENS_RC[k] : LIENS_RC[k + 'En']; }
  function L(fr, en) { return etat.ui === 'fr' ? fr : en; }
  function aRc(k, txt) { return '<a href="' + lienRc(k) + '" target="_blank" rel="noopener noreferrer">' + esc(txt) + '</a>'; }

  etat.rc = { etape: 0, stade: 'quest', raccourci: false, deux: false, perso: false, docs: {}, prix: null, prixEnCours: false, erreurs: {} };

  /* ---- champs communs de l’assistant */
  function rv(k) { return String(etat.v[k] || '').trim(); }

  function radioRc(id, label, opts) {
    return '<div class="ml-champ" data-champ="' + id + '"><label>' + esc(label) + '</label><div class="ml-langue ml-radios">' +
      opts.map(function (o) { return '<button type="button" data-rcradio="' + id + '|' + o[0] + '" class="' + (rv(id) === o[0] ? 'actif' : '') + '" aria-pressed="' + (rv(id) === o[0]) + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
  }
  function ouiNon(id, label) { return radioRc(id, label, [['oui', L('Oui', 'Yes')], ['non', L('Non', 'No')]]); }
  function caseRc(id, label) {
    return '<div class="ml-champ" data-champ="' + id + '"><label class="ml-check"><input type="checkbox" data-rcchk="' + id + '"' + (rv(id) ? ' checked' : '') + '> ' + esc(label) + '</label></div>';
  }
  function dateRc(id, label, req) { return champHtml(id, label, { req: req !== false, type: 'date' }); }
  function nasRc(id, label, req) { return champHtml(id, label, { req: req !== false, type: 'nas', ph: '123 456 789', max: 11 }); }
  function adresseRc(pfx) {
    return blocAdresse(pfx).replace(/<option value="">[^<]*<\/option>/, '<option value="">' + esc(t('choisirProv')) + '</option>');
  }
  function conjoint() { var c = rv('rc_civil'); return c === 'marie' || c === 'fait'; }

  /* ---- définition des étapes */
  var RC_ETAPES = ['intro', 'vous', 'adresse', 'civil', 'statut', 'schres', 'schstat', 'schrev', 'enfants', 'signature', 'recap'];
  function rcTitreEtape(e) {
    return { intro: L('Avant de commencer', 'Before you start'), vous: L('Vos renseignements', 'About you'), adresse: L('Votre adresse', 'Your address'),
      schres: L('Résidence au Canada (RC66SCH)', 'Residence in Canada (RC66SCH)'), schstat: L('Statut de citoyen ou d’immigrant (RC66SCH)', 'Citizenship or immigration status (RC66SCH)'), schrev: L('Vos revenus (RC66SCH)', 'Your income (RC66SCH)'),
      civil: L('Votre état civil', 'Your marital status'), statut: L('Citoyenneté et arrivée au Canada', 'Citizenship and arrival in Canada'),
      enfants: L('Vos enfants', 'Your children'), signature: L('Signature et date', 'Signature and date'), recap: L('Récapitulatif', 'Summary') }[e];
  }
  function rcEtapeIntro() {
    return '<h3>' + esc(L('Demande d’allocation canadienne pour enfants (RC66)', 'Canada child benefit application (RC66)')) + '</h3>' +
      '<p class="ml-aide">' + esc(L('Un outil gratuit qui remplit le formulaire officiel RC66 pour vous. Vous répondez à des questions simples, étape par étape, puis vous obtenez le formulaire prêt à signer et à envoyer par la poste.',
        'A free tool that fills in the official RC66 form for you. You answer simple questions, step by step, then you get the form ready to sign and mail.')) + '</p>' +
      '<div class="ml-info"><strong>' + esc(L('À savoir avant de commencer', 'Good to know before you start')) + '</strong><ul>' +
      '<li>' + esc(L('Ce formulaire sert à demander l’allocation canadienne pour enfants (ACE) par la poste, par exemple quand vous arrivez au Canada avec un enfant. C’est le principal responsable des soins et de l’éducation de l’enfant qui fait la demande.',
        'This form is used to apply for the Canada child benefit (CCB) by mail, for example when you arrive in Canada with a child. The person mainly responsible for the care and upbringing of the child applies.')) + '</li>' +
      '<li>' + esc(L('Il existe aussi une demande en ligne (Mon dossier de l’ARC) et, pour un nouveau-né, l’inscription à la naissance auprès de votre province. Ne remplissez pas ce formulaire si vous avez déjà fait la demande par ces moyens.',
        'You can also apply online (CRA My Account) and, for a newborn, through your province’s birth registration. Do not use this form if you already applied that way.')) + '</li>' +
      '<li>' + esc(L('Capycom n’est pas l’Agence du revenu du Canada (ARC) et n’est affilié à aucun gouvernement. Cet outil ne donne pas de conseil juridique ou fiscal et ne garantit pas l’admissibilité.',
        'Capycom is not the Canada Revenue Agency (CRA) and is not affiliated with any government. This tool does not give legal or tax advice and does not guarantee eligibility.')) + '</li>' +
      '<li>' + esc(L('Vos réponses restent dans votre navigateur. Rien n’est transmis à Capycom tant que vous ne choisissez pas l’envoi par la poste à la fin.',
        'Your answers stay in your browser. Nothing is sent to Capycom unless you choose mailing at the end.')) + '</li></ul></div>' +
      '<p class="ml-liens-gouv">' + esc(L('Pour vérifier l’information auprès du gouvernement : ', 'To check the information with the government: ')) +
      aRc('comment', L('Comment demander l’allocation canadienne pour enfants', 'How to apply for the Canada child benefit')) + ' · ' +
      aRc('form', L('Formulaire RC66 (ARC)', 'Form RC66 (CRA)')) + '</p>' +
      '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-rcsuivant="1">' + esc(L('Commencer le questionnaire', 'Start the questions')) + '</button>' +
      '<button type="button" class="ml-btn" data-rcraccourci="1">' + esc(L('J’ai déjà rempli mon RC66', 'I already filled in my RC66')) + '</button></div>';
  }
  function rcEtapeVous() {
    return '<h3>' + esc(L('Vos renseignements', 'About you')) + '</h3><p class="ml-aide">' + esc(L('Étape 1 du formulaire. Écrivez les renseignements comme sur vos documents officiels.', 'Step 1 of the form. Write the details as they appear on your official documents.')) + '</p>' +
      nasRc('rc_nas', L('Numéro d’assurance sociale (NAS)', 'Social insurance number (SIN)'), !etat.v.rc_sansnas) +
      caseRc('rc_sansnas', L('Je n’ai pas encore de NAS. (Si vous avez un numéro d’identification temporaire de l’ARC, écrivez-le ci-dessus à la place.)', 'I do not have a SIN yet. (If the CRA gave you a temporary identification number, enter it above instead.)')) +
      '<div class="ml-ligne">' + champHtml('rc_prenom', L('Prénom', 'First name'), { req: true, max: 60 }) + champHtml('rc_nom', L('Nom de famille', 'Last name'), { req: true, max: 60 }) + '</div>' +
      dateRc('rc_naiss', L('Date de naissance', 'Date of birth')) +
      radioRc('rc_langue', L('Langue de correspondance avec l’ARC', 'Language of correspondence with the CRA'), [['fr', 'Français'], ['en', 'English']]) +
      '<div class="ml-ligne">' + champHtml('rc_tel1', L('Téléphone, maison', 'Phone, home'), { type: 'tel', max: 20, ph: '613 555 1234' }) + champHtml('rc_tel3', L('Téléphone, cellulaire', 'Phone, cell'), { type: 'tel', max: 20, ph: '613 555 1234' }) + '</div>' +
      '<div class="ml-ligne">' + champHtml('rc_tel2', L('Téléphone, travail', 'Phone, work'), { type: 'tel', max: 20 }) + champHtml('rc_ext', L('Poste', 'Extension'), { type: 'tel', max: 8 }) + '</div>';
  }
  function rcEtapeAdresse() {
    var h = '<h3>' + esc(L('Votre adresse', 'Your address')) + '</h3><p class="ml-aide">' + esc(L('Étape 2 du formulaire. L’adresse postale est celle où l’ARC vous écrira.', 'Step 2 of the form. The mailing address is where the CRA will write to you.')) + '</p>' +
      '<p class="ml-sous-titre">' + esc(L('Adresse postale', 'Mailing address')) + '</p>' + adresseRc('rcp') +
      caseRc('rc_memeadr', L('Mon adresse du domicile est la même que mon adresse postale', 'My home address is the same as my mailing address'));
    if (!rv('rc_memeadr')) h += '<p class="ml-sous-titre">' + esc(L('Adresse du domicile', 'Home address')) + '</p>' + adresseRc('rcd');
    h += ouiNon('rc_chgprov', L('Avez-vous changé de province ou de territoire au cours des 12 derniers mois ?', 'Have you moved to a different province or territory in the last 12 months?'));
    if (rv('rc_chgprov') === 'oui') {
      h += '<div class="ml-ligne">' + champHtml('rc_ancprov', L('Province ou territoire où vous habitiez', 'Province or territory where you lived'), { req: true, type: 'provinceRc' }) +
        dateRc('rc_dateprov', L('Date du déménagement', 'Date of the move')) + '</div>';
    }
    return h;
  }
  function rcEtapeCivil() {
    var opts = [['marie', L('Marié(e) (légalement marié à un époux)', 'Married (legally married to a spouse)')], ['fait', L('Conjoint(e) de fait', 'Common-law partner')],
      ['separe', L('Séparé(e) depuis au moins 90 jours en raison de la rupture de l’union', 'Separated for at least 90 days because the relationship broke down')],
      ['veuf', L('Veuf ou veuve', 'Widowed')], ['divorce', L('Divorcé(e)', 'Divorced')], ['celib', L('Célibataire', 'Single')]];
    var h = '<h3>' + esc(L('Votre état civil', 'Your marital status')) + '</h3><p class="ml-aide">' + esc(L('Étape 3 du formulaire. Choisissez la situation actuelle.', 'Step 3 of the form. Choose your current situation.')) + '</p>' +
      '<div class="ml-champ" data-champ="rc_civil"><label>' + esc(L('État civil actuel', 'Current marital status')) + '</label><div class="ml-choix">' +
      opts.map(function (o) { return '<button type="button" class="ml-choix-b' + (rv('rc_civil') === o[0] ? ' actif' : '') + '" data-rcradio="rc_civil|' + o[0] + '">' + esc(o[1]) + '</button>'; }).join('') + '</div></div>';
    if (rv('rc_civil') && rv('rc_civil') !== 'celib') h += dateRc('rc_civildate', L('Date à laquelle cet état civil a commencé', 'Date this status started'));
    if (conjoint()) {
      h += '<p class="ml-sous-titre">' + esc(L('Votre époux ou conjoint de fait', 'Your spouse or common-law partner')) + '</p>' +
        nasRc('rc_s_nas', L('Son numéro d’assurance sociale (NAS) ou son numéro d’identification temporaire', 'Their SIN or temporary identification number'), false) +
        '<div class="ml-ligne">' + champHtml('rc_s_prenom', L('Prénom', 'First name'), { req: true, max: 60 }) + champHtml('rc_s_nom', L('Nom de famille', 'Last name'), { req: true, max: 60 }) + '</div>' +
        dateRc('rc_s_naiss', L('Date de naissance', 'Date of birth')) +
        champHtml('rc_s_adr', L('Son adresse, seulement si elle est différente de la vôtre', 'Their address, only if different from yours'), { type: 'textarea', max: 200 }) +
        caseRc('rc_s_nonres', L('Mon époux ou conjoint de fait est un non-résident du Canada', 'My spouse or common-law partner is a non-resident of Canada'));
    }
    return h;
  }
  function rcEtapeStatut() {
    var h = '<h3>' + esc(L('Citoyenneté et arrivée au Canada', 'Citizenship and arrival in Canada')) + '</h3><p class="ml-aide">' + esc(L('Étapes 4 et 5 du formulaire. Ces réponses déterminent si un formulaire supplémentaire (RC66SCH) est nécessaire.', 'Steps 4 and 5 of the form. These answers decide whether an extra form (RC66SCH) is needed.')) + '</p>' +
      ouiNon('rc_cit', L('Êtes-vous citoyen canadien depuis plus de 12 mois ?', 'Have you been a Canadian citizen for the last 12 months?'));
    if (conjoint()) h += ouiNon('rc_s_cit', L('Votre époux ou conjoint de fait est-il citoyen canadien depuis plus de 12 mois ?', 'Has your spouse or common-law partner been a Canadian citizen for the last 12 months?'));
    h += ouiNon('rc_new', L('Au cours des deux dernières années, êtes-vous devenu un nouvel arrivant au Canada, ou revenu après une absence d’au moins six mois ?', 'In the last two years, did you become a newcomer to Canada, or return after an absence of at least six months?'));
    if (conjoint()) h += ouiNon('rc_s_new', L('Au cours des deux dernières années, votre époux ou conjoint de fait est-il devenu un nouvel arrivant au Canada, ou revenu après une absence d’au moins six mois ?', 'In the last two years, did your spouse or common-law partner become a newcomer to Canada, or return after an absence of at least six months?'));
    if (schRequis()) h += '<div class="ml-info"><strong>' + esc(L('Le formulaire RC66SCH sera nécessaire', 'Form RC66SCH will be needed')) + '</strong><p>' + esc(L('D’après vos réponses, il faut aussi remplir le formulaire RC66SCH, Statut au Canada et renseignements sur les revenus. Capycom le remplit aussi pour vous : quelques questions de plus aux étapes suivantes.', 'Based on your answers, you also need to fill in form RC66SCH, Status in Canada and income information. Capycom fills it in for you too: a few more questions in the next steps.')) + '</p></div>';
    return h;
  }
  /* ================= RC66SCH : statut au Canada et renseignements sur les revenus ================= */
  function schPers() { return moteurRc().schPers(); }
  function schNouv(p) { return moteurRc().schNouv(p); }
  function schNom(p) { return p === 'y' ? L('Vous', 'You') : L('Votre époux ou conjoint de fait', 'Your spouse or common-law partner'); }
  function schGenere() { return moteurRc().schGenere(); }
  function schPourPdf() { return moteurRc().schPourPdf(); }
  function rcActives() { return CM.rcEtapesActives(moteurRc()).map(function (e) { return RC_ETAPES.indexOf(e); }); }
  function rcSuiv() { var a = rcActives(), c = etat.rc.etape; for (var i = 0; i < a.length; i++) if (a[i] > c) return a[i]; return c; }
  function rcPrec() { var a = rcActives(), c = etat.rc.etape; for (var i = a.length - 1; i >= 0; i--) if (a[i] < c) return a[i]; return c; }
  function schAnDefaut() { return moteurRc().schAnDefaut(); }

  function schCSousAn() { return moteurRc().schCSousAn(); }
  function schPersRev() { return moteurRc().schPersRev(); }

  function rcEtapeSchres() {
    var h = '<h3>' + esc(L('Votre résidence au Canada', 'Your residence in Canada')) + '</h3><p class="ml-aide">' + esc(L('Formulaire RC66SCH, étape 2. Capycom reprend votre nom, votre NAS et votre téléphone déjà saisis. Répondez pour chaque personne concernée.', 'Form RC66SCH, step 2. Capycom reuses the name, SIN and phone you already entered. Answer for each person concerned.')) + '</p>' +
      '<div class="ml-info"><p>' + esc(L('La date à laquelle vous êtes devenu résident du Canada est la date à laquelle vous avez établi des liens de résidence importants au Canada. C’est habituellement la date à laquelle vous êtes venu vivre au Canada (domicile, époux ou conjoint, personnes à charge).', 'The date you became a resident of Canada is the date you established significant residential ties in Canada. It is usually the date you came to live in Canada (home, spouse or partner, dependants).')) + ' ' + aRc('resid', L('En savoir plus sur le statut de résidence', 'Learn more about residency status')) + '</p></div>';
    schPers().filter(schNouv).forEach(function (p) {
      var q = 'rc_sch_' + p + '_';
      h += '<p class="ml-sous-titre">' + esc(schNom(p)) + '</p>' +
        radioRc(q + 'type', L('Situation', 'Situation'), [['nouvel', L('Nouvel arrivant au Canada', 'Newcomer to Canada')], ['retour', L('Résident du Canada de retour au pays', 'Resident returning to Canada')]]);
      if (rv(q + 'type') === 'nouvel') h += dateRc(q + 'res', L('Date à laquelle vous êtes devenu résident du Canada', 'Date you became a resident of Canada'));
      if (rv(q + 'type') === 'retour') h += champHtml(q + 'provav', L('Province ou territoire où vous résidiez avant de couper vos liens de résidence', 'Province or territory where you lived before you cut your residential ties'), { req: true, type: 'provinceRc' }) +
        dateRc(q + 'coupe', L('Date à laquelle vous avez coupé vos liens de résidence au Canada', 'Date you cut your residential ties with Canada')) +
        dateRc(q + 'retab', L('Date à laquelle vous avez rétabli vos liens de résidence au Canada', 'Date you re-established your residential ties with Canada'));
    });
    return h;
  }
  function schStatutBloc(p) {
    var q = 'rc_sch_' + p + '_', h = '<p class="ml-sous-titre">' + esc(schNom(p)) + '</p><div class="ml-champ" data-champ="' + q + 'stat"><label>' + esc(L('Cochez ce qui s’applique (une ou plusieurs lignes)', 'Tick what applies (one or more lines)')) + '</label></div>';
    h += caseRc(q + 'cit', L('Citoyen canadien depuis moins de 12 mois', 'Canadian citizen for less than 12 months'));
    if (rv(q + 'cit')) h += dateRc(q + 'citd', L('Date à laquelle ce statut a commencé', 'Date this status started'));
    h += caseRc(q + 'rp', L('Résident permanent', 'Permanent resident'));
    if (rv(q + 'rp')) h += dateRc(q + 'rpd', L('Date à laquelle ce statut a commencé (sur votre document de confirmation)', 'Date this status started (on your confirmation document)'));
    h += caseRc(q + 'pp', L('Personne protégée (réfugié reconnu)', 'Protected person (recognized refugee)'));
    if (rv(q + 'pp')) h += dateRc(q + 'ppd', L('Date à laquelle ce statut a commencé (sur votre avis de décision favorable)', 'Date this status started (on your notice of favourable decision)'));
    h += caseRc(q + 'rt', L('Résident temporaire (visiteur, étudiant, travailleur, permis de séjour temporaire)', 'Temporary resident (visitor, student, worker, temporary resident permit)'));
    if (rv(q + 'rt')) {
      h += '<p class="ml-aide">' + esc(L('Indiquez les dates de début et d’expiration de chaque document qui couvre la période après vos 18 mois de résidence. Pour plus de deux documents, joignez une feuille séparée.', 'Give the start and expiry dates of each document that covers the period after your 18 months of residence. For more than two documents, attach a separate sheet.')) + '</p>';
      [1, 2].forEach(function (n) {
        h += '<div class="ml-ligne">' + champHtml(q + 'rt' + n + 'n', L('Document ' + n + ' (nom, ex. permis d’études)', 'Document ' + n + ' (name, e.g. study permit)'), { max: 60 }) +
          dateRc(q + 'rt' + n + 'd', L('Date de début', 'Start date'), n === 1) + dateRc(q + 'rt' + n + 'f', L('Date d’expiration', 'Expiry date'), n === 1) + '</div>';
      });
    }
    h += caseRc(q + 'ind', L('Inscrit ou ayant le droit d’être inscrit en vertu de la Loi sur les Indiens, et non citoyen canadien', 'Registered or entitled to be registered under the Indian Act, and not a Canadian citizen'));
    if (rv(q + 'ind')) h += dateRc(q + 'indd', L('Date d’inscription auprès de Services aux Autochtones Canada', 'Registration date with Indigenous Services Canada'));
    return h;
  }
  function rcEtapeSchstat() {
    var h = '<h3>' + esc(L('Statut de citoyen ou d’immigrant', 'Citizenship or immigration status')) + '</h3><p class="ml-aide">' + esc(L('Formulaire RC66SCH, étape 3. Remplissez la section qui s’applique à chaque personne. Les dates figurent sur vos documents d’Immigration, Réfugiés et Citoyenneté Canada.', 'Form RC66SCH, step 3. Fill in the section that applies to each person. The dates are on your Immigration, Refugees and Citizenship Canada documents.')) + '</p>';
    schPers().forEach(function (p) { h += schStatutBloc(p); });
    return h;
  }
  function rcEtapeSchrev() {
    if (!rv('rc_sch_an') && schAnDefaut()) etat.v.rc_sch_an = schAnDefaut().slice(0, 4);
    var an = parseInt(rv('rc_sch_an'), 10), pers = schPersRev();
    var h = '<h3>' + esc(L('Vos revenus', 'Your income')) + '</h3><p class="ml-aide">' + esc(L('Formulaire RC66SCH, étape 4. Indiquez les revenus de toutes sources qui n’ont pas été déclarés dans une déclaration de revenus canadienne, en dollars canadiens (taux de change de la Banque du Canada au moment où vous avez reçu les revenus). Écrivez 0 s’il n’y en avait aucun.', 'Form RC66SCH, step 4. Enter income from all sources not reported in a Canadian income tax return, in Canadian dollars (Bank of Canada exchange rate when you received it). Enter 0 if there was none.')) + '</p>';
    if (rv('rc_s_nonres')) h += '<div class="ml-info"><p>' + esc(L('Le revenu de votre époux ou conjoint de fait non résident n’est pas à inscrire ici. Vous le déclarerez avec le formulaire CTB9 lorsque vous ferez vos impôts.', 'Income of a non-resident spouse or common-law partner is not entered here. You will report it with form CTB9 when you file your taxes.')) + '</p></div>';
    h += champHtml('rc_sch_an', L('Année où vous êtes devenu résident du Canada', 'Year you became a resident of Canada'), { req: true, max: 4, ph: '2026', type: 'nombre' });
    function ligneRev(suffixe, titre, aide) {
      var l = '<p class="ml-sous-titre">' + esc(titre) + '</p>' + (aide ? '<p class="ml-aide">' + esc(aide) + '</p>' : '') + '<div class="ml-ligne">';
      pers.forEach(function (p) { l += champHtml('rc_sch_' + p + '_' + suffixe, schNom(p) + ' ($ CAD)', { req: true, type: 'montant', max: 14, ph: '0' }); });
      return l + (pers.length === 1 ? '<div class="ml-champ ml-vide"></div>' : '') + '</div>';
    }
    if (!pers.length) return h;
    h += ligneRev('ra', L('A. Revenus gagnés en ' + (an || 'l’année indiquée') + ', du 1er janvier à la date où vous êtes devenu résident', 'A. Income earned in ' + (an || 'the year given') + ', from January 1 to the date you became a resident'));
    h += ligneRev('rb', L('B. Revenus gagnés en ' + (an ? an - 1 : 'l’année précédente'), 'B. Income earned in ' + (an ? an - 1 : 'the previous year')), L('Un an avant l’année où vous êtes devenu résident.', 'One year before the year you became a resident.'));
    if (schCSousAn()) h += ligneRev('rc', L('C. Revenus gagnés en ' + (an ? an - 2 : 'deux ans avant'), 'C. Income earned in ' + (an ? an - 2 : 'two years before')), L('Cette section s’applique parce que vous êtes devenu résident entre le 1er janvier et le 31 mai.', 'This section applies because you became a resident between January 1 and May 31.'));
    return h;
  }



  function schBlocHtml() {
    var ok = true;
    return '<div class="ml-slot ok" data-slot="schgen"><div class="ml-slot-t"><span class="ml-pastille" aria-hidden="true">✓</span><strong>' + esc(L('Formulaire RC66SCH créé avec vos réponses', 'Form RC66SCH created from your answers')) + '</strong><span class="ml-req">' + esc(L('Requis', 'Required')) + '</span></div>' +
      '<p class="ml-aide">' + esc(L('Statut au Canada et renseignements sur les revenus. Il sera ajouté à votre RC66 (4 pages) et signé de la même façon.', 'Status in Canada and income information. It will be added to your RC66 (4 pages) and signed the same way.')) + '</p>' +
      '<div class="ml-actions"><button type="button" class="ml-btn" data-rcvoir="1">' + esc(L('Voir les formulaires', 'View the forms')) + '</button><button type="button" class="ml-lien" data-rcschperso="1">' + esc(L('J’ai déjà rempli mon propre RC66SCH : le téléverser à la place', 'I already filled in my own RC66SCH: upload it instead')) + '</button></div></div>';
  }

  function schRequis() { return moteurRc().schRequis(); }
  function blocEnfant(n) {
    var p = 'rc_e' + n + '_';
    var h = '<p class="ml-sous-titre">' + esc(L('Enfant ', 'Child ') + n) + '</p>' +
      '<div class="ml-ligne">' + champHtml(p + 'prenom', L('Prénom', 'First name'), { req: true, max: 60 }) + champHtml(p + 'nom', L('Nom de famille', 'Last name'), { req: true, max: 60 }) + '</div>' +
      radioRc(p + 'sexe', L('Sexe', 'Sex'), [['f', L('Fille', 'Girl')], ['g', L('Garçon', 'Boy')]]) +
      dateRc(p + 'naiss', L('Date de naissance', 'Date of birth')) +
      '<div class="ml-ligne">' + champHtml(p + 'ville', L('Ville de naissance', 'City of birth'), { req: true, max: 60 }) + champHtml(p + 'prov', L('Province, territoire ou pays de naissance', 'Province, territory or country of birth'), { req: true, type: 'provpays', max: 60 }) + '</div>' +
      ouiNon(p + 'plus60', L('L’enfant habite-t-il avec vous plus de 60 % du temps ?', 'Does the child live with you more than 60% of the time?'));
    if (rv(p + 'plus60') === 'oui') {
      h += '<div class="ml-ligne">' + (rv(p + 'depuisnaiss') ? '<div class="ml-champ ml-vide"></div>' : dateRc(p + 'depuis', L('Depuis quelle date ? (par exemple, la date de votre arrivée au Canada)', 'Since what date? (for example, the date you arrived in Canada)'))) + '</div>' +
        caseRc(p + 'depuisnaiss', L('L’enfant habite avec moi depuis sa naissance', 'The child has lived with me since birth'));
    } else if (rv(p + 'plus60') === 'non') {
      h += radioRc(p + 'partage', L('Si non, quel pourcentage du temps l’enfant habite-t-il avec vous ?', 'If not, what share of the time does the child live with you?'),
        [['40', L('De 40 % à 60 % (garde partagée)', '40% to 60% (shared custody)')], ['moins40', L('Moins de 40 %', 'Less than 40%')]]);
      if (rv(p + 'partage') === 'moins40') h += '<div class="ml-avert">' + esc(L('Avec moins de 40 % du temps, l’ARC ne vous considère pas admissible aux prestations pour enfants et familles pour cet enfant.', 'With less than 40% of the time, the CRA does not consider you eligible for child and family benefits for this child.')) + '</div>';
      if (rv(p + 'partage') === '40') h += dateRc(p + 'date40', L('Depuis quelle date l’enfant habite-t-il avec vous de 40 % à 60 % du temps ?', 'Since what date has the child lived with you 40% to 60% of the time?'));
    }
    return h;
  }
  function rcEtapeEnfants() {
    var h = '<h3>' + esc(L('Vos enfants', 'Your children')) + '</h3><p class="ml-aide">' + esc(L('Étape 6 du formulaire. Le formulaire prévoit deux enfants. Pour plus de deux enfants, une feuille séparée ou le formulaire RC66-1 est joint.', 'Step 6 of the form. The form has room for two children. For more than two children, a separate sheet or form RC66-1 is attached.')) + '</p>' +
      blocEnfant(1);
    if (etat.rc.deux) h += blocEnfant(2) + '<div class="ml-actions"><button type="button" class="ml-btn" data-rcdeux="0">' + esc(L('Retirer l’enfant 2', 'Remove child 2')) + '</button></div>';
    else h += '<div class="ml-actions"><button type="button" class="ml-btn" data-rcdeux="1">+ ' + esc(L('Ajouter un deuxième enfant', 'Add a second child')) + '</button></div>';
    h += '<p class="ml-sous-titre">' + esc(L('Pour la liste des documents à joindre', 'For the list of documents to attach')) + '</p>' +
      ouiNon('rc_premiere', L('Est-ce la première fois que vous demandez des prestations pour ces enfants au Canada ?', 'Is this the first time you are applying for benefits for these children in Canada?')) +
      caseRc('rc_plus2', L('Je fais la demande pour plus de deux enfants', 'I am applying for more than two children')) +
      caseRc('rc_pere', L('Je suis un homme et l’autre parent de l’enfant, une femme, vit avec moi', 'I am a man and the other parent of the child, a woman, lives with me'));
    return h;
  }
  function rcEtapeSignature() {
    var h = '<h3>' + esc(L('Signature et date', 'Signature and date')) + '</h3><p class="ml-aide">' + esc(L('Étape 7 du formulaire. En signant, vous attestez que les renseignements sont exacts et complets. Faire une fausse déclaration est une infraction grave.', 'Step 7 of the form. By signing, you certify that the information is accurate and complete. Making a false statement is a serious offence.')) + '</p>' +
      dateRc('rc_datesign', L('Date de la signature', 'Date of signature'));
    h += '<div class="ml-info"><p>' + esc(L('Vous pouvez signer à la main après avoir imprimé le formulaire. Si vous voulez que Capycom l’imprime et le poste pour vous, ajoutez votre signature ici : dessinez-la ou envoyez une photo de votre signature manuscrite.', 'You can sign by hand after printing the form. If you want Capycom to print and mail it for you, add your signature here: draw it or upload a photo of your handwritten signature.')) + '</p></div>';
    h += '<div class="ml-sig-bloc" id="ml-sig">' + contenuSignature() + '</div>';
    return h;
  }

  /* ---- validation des étapes */
  function dateIso(s) { return CM.dateIso(s); }

  function rcManques(e) { return CM.rcManquesEtape(moteurRc(), e); }
  function marquerErreurs(ids) {
    racine.querySelectorAll('.ml-err').forEach(function (x) { x.classList.remove('ml-err'); });
    var premier = null;
    ids.forEach(function (id) {
      var b = racine.querySelector('[data-champ="' + id + '"]'); if (b) { b.classList.add('ml-err'); b.setAttribute('data-err', etat.ui === 'fr' ? 'Champ nécessaire pour la validation' : 'Required field to continue'); if (!premier) premier = b; }
    });
    if (premier && premier.scrollIntoView) premier.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function rcMessage(txt, ok) {
    var m = document.getElementById('ml-rc-message'); if (!m) return;
    m.textContent = txt || ''; m.className = 'ml-message' + (ok ? ' ok' : ''); m.style.display = txt ? 'block' : 'none';
  }


  function rcFlags() { return CM.rcFlags(moteurRc()); }
  function rcProvResidence() {
    if (etat.rc.raccourci) return rv('rc_f_prov');
    return rv('rc_memeadr') ? rv('rcp_prov') : rv('rcd_prov');
  }
  function rcDocs() {
    return docsUi(CM.documentsDe('rc66', etat.v, { rc: etat.rc })).map(function (x) {
      if (x.id === 'sch') x.extra = (etat.rc.raccourci ? '' : '<div class="ml-actions"><button type="button" class="ml-lien" data-rcschperso="0">' + esc(L('Utiliser plutôt le formulaire créé avec mes réponses', 'Use the form created from my answers instead')) + '</button></div>');
      return x;
    });
  }


  function rcDessiner(tout) {
    var sig = signatureImage();
    var plan = CM.planRc66(etat.v, { rc: etat.rc, sig: sig, tout: !!tout });
    return CM.rendreJsPdf(window.jspdf.jsPDF, plan, { fonds: FONDS, sig: sig });
  }
  function rcTelecharger() {
    if (!window.jspdf) { rcMessage('PDF : jsPDF not loaded'); return; }
    var pdf = rcDessiner(true); pdf.save('RC66-' + CM.nomBase(rv('rc_nom'), 'demande') + '.pdf');
    rcMessage(L('Votre formulaire est téléchargé. Relisez-le, imprimez-le et signez-le avant de l’envoyer.', 'Your form has been downloaded. Review it, print it and sign it before mailing it.'), true);
  }
  function rcVoir() {
    if (!window.jspdf) return;
    var pdf = rcDessiner(true), url = pdf.output('bloburl'); var w = window.open(url, '_blank'); if (!w) window.location.href = url;
  }

  /* ---- récapitulatif */
  function ligneRecap(lib, val) { return val ? '<div class="ml-rec-l"><span>' + esc(lib) + '</span><strong>' + esc(val) + '</strong></div>' : ''; }
  function dateLisible(iso) { return dateIso(iso) ? dateTexte(iso, etat.ui) : ''; }
  function rcEtapeRecap() {
    var u = etat.ui, f = rcFlags(), prov = rcProvResidence(), centre = centreDe(prov), docs = rcDocs();
    var h = '<h3>' + esc(L('Votre formulaire est prêt', 'Your form is ready')) + '</h3><p class="ml-aide">' + esc(L('Relisez vos réponses, téléchargez le formulaire, puis envoyez-le au bon centre fiscal avec les documents demandés.', 'Review your answers, download the form, then mail it to the right tax centre with the documents requested.')) + '</p>';
    h += '<div class="ml-rec">' + ligneRecap(L('Nom', 'Name'), rv('rc_prenom') + ' ' + rv('rc_nom')) +
      ligneRecap(L('Adresse postale', 'Mailing address'), [rv('rcp_ligne'), rv('rcp_ville'), rv('rcp_prov'), cpNormal(rv('rcp_cp'))].join(', ')) +
      ligneRecap(L('État civil', 'Marital status'), { marie: L('Marié(e)', 'Married'), fait: L('Conjoint(e) de fait', 'Common-law partner'), separe: L('Séparé(e)', 'Separated'), veuf: L('Veuf ou veuve', 'Widowed'), divorce: L('Divorcé(e)', 'Divorced'), celib: L('Célibataire', 'Single') }[rv('rc_civil')]) +
      ligneRecap(L('Enfant 1', 'Child 1'), rv('rc_e1_prenom') + ' ' + rv('rc_e1_nom') + (dateIso(rv('rc_e1_naiss')) ? ' (' + dateLisible(rv('rc_e1_naiss')) + ')' : '')) +
      (etat.rc.deux ? ligneRecap(L('Enfant 2', 'Child 2'), rv('rc_e2_prenom') + ' ' + rv('rc_e2_nom') + (dateIso(rv('rc_e2_naiss')) ? ' (' + dateLisible(rv('rc_e2_naiss')) + ')' : '')) : '') +
      '</div><div class="ml-actions ml-rec-modif">' + ['vous', 'adresse', 'civil', 'statut', 'schres', 'schstat', 'schrev', 'enfants', 'signature'].filter(function (e) { return rcActives().indexOf(RC_ETAPES.indexOf(e)) !== -1; }).map(function (e) { return '<button type="button" class="ml-lien" data-rcaller="' + RC_ETAPES.indexOf(e) + '">' + esc(L('Modifier : ', 'Edit: ') + rcTitreEtape(e)) + '</button>'; }).join('') + '</div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('1. Téléchargez et vérifiez le formulaire', '1. Download and check the form')) + '</h4><p class="ml-aide">' + esc((schPourPdf() ? L('Le PDF contient les 4 pages du formulaire RC66 et les 4 pages du formulaire RC66SCH, avec vos réponses. Imprimez-les et signez-les (à moins d’avoir ajouté votre signature), puis faites-en une copie pour vos dossiers. Le RC66SCH se joint au RC66 dans la même enveloppe.', 'The PDF contains the 4 pages of form RC66 and the 4 pages of form RC66SCH, with your answers. Print them and sign them (unless you added your signature), then keep a copy for your records. The RC66SCH goes in the same envelope as the RC66.') : L('Le PDF contient les 4 pages du formulaire RC66 avec vos réponses. Imprimez-le et signez-le (à moins d’avoir ajouté votre signature), puis faites-en une copie pour vos dossiers.', 'The PDF contains the 4 pages of form RC66 with your answers. Print it and sign it (unless you added your signature), then keep a copy for your records.'))) + '</p>' +
      '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-rctelecharger="1">⤓ ' + esc(L('Télécharger le formulaire (PDF)', 'Download the form (PDF)')) + '</button>' +
      '<button type="button" class="ml-btn" data-rcvoir="1">' + esc(L('Voir le PDF', 'View the PDF')) + '</button></div><p class="ml-message" id="ml-rc-message"></p></div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('2. Documents à joindre', '2. Documents to attach')) + '</h4><ul class="ml-liste-docs">' +
      docs.filter(function (d) { return d.id !== 'autres'; }).map(function (d) {
        return '<li><strong>' + esc(d.titre) + '</strong><span>' + esc(d.aide) + '</span>' +
          (d.lien ? '<a href="' + lienRc(d.lien[0]) + '" target="_blank" rel="noopener noreferrer">' + esc(d.lien[1]) + '</a>' : '') + '</li>';
      }).join('') + '</ul>' +
      (docs.length === 1 ? '<p class="ml-aide">' + esc(L('D’après vos réponses, aucun document supplémentaire n’est exigé par le formulaire. L’ARC peut en demander plus tard.', 'Based on your answers, the form does not require any extra document. The CRA may ask for more later.')) + '</p>' : '') +
      '<p class="ml-aide">' + esc(L('Si vos documents ne sont ni en français ni en anglais, joignez aussi une traduction acceptable. Liste complète : ', 'If your documents are not in English or French, also attach an acceptable translation. Full list: ')) + '</p>' + '<p class="ml-liens-gouv">' + aRc('docs', L('Documents justificatifs sur canada.ca', 'Supporting documents on canada.ca')) + '</p></div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('3. Où l’envoyer', '3. Where to mail it')) + '</h4>';
    if (centre) h += '<address class="ml-adresse-envoi"><strong>' + esc(centre.nom) + '</strong><br>' + esc(centre.ligne) + '<br>' + esc(centre.ville + ' ' + provRc(centre.prov).ab + ' ' + centre.cp) + '</address><p class="ml-aide">' + esc(L('Adresse du centre fiscal pour : ', 'Tax centre address for: ') + centre.zone[u] + '. ' + L('Selon la province de résidence indiquée : ', 'Based on the province of residence you entered: ') + (u === 'fr' ? prov : provRc(prov).en) + '.') + '</p>';
    else h += '<p class="ml-aide">' + esc(L('Indiquez votre province de résidence pour connaître l’adresse.', 'Enter your province of residence to see the address.')) + '</p>';
    h += '<p class="ml-aide">' + esc(L('Vérifiez toujours l’adresse sur la page officielle avant l’envoi. ', 'Always check the address on the official page before mailing. ')) + '</p><p class="ml-liens-gouv">' + aRc('form', L('Formulaire RC66 et adresses (ARC)', 'Form RC66 and addresses (CRA)')) + '</p></div>';
    h += '<div class="ml-carte-in ml-poste-offre"><h4>' + esc(L('Pas d’imprimante ? On l’envoie pour vous.', 'No printer? We will mail it for you.')) + '</h4><p class="ml-aide">' + esc(L('Téléversez vos documents (photos ou PDF). Capycom imprime votre formulaire et vos documents, les met sous enveloppe et les poste au bon centre fiscal. Vous voyez le prix avant de continuer.', 'Upload your documents (photos or PDF). Capycom prints your form and documents, puts them in an envelope and mails them to the right tax centre. You see the price before continuing.')) + '</p>' +
      '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-rcposte="1">' + esc(L('Envoyer par la poste avec Capycom', 'Mail it with Capycom')) + ' →</button></div></div>';
    return h;
  }

  /* ---- fichiers téléversés : photos et PDF, fusionnés dans le navigateur en un seul envoi */
  var scriptsCharges = {};
  function chargerScript(url) {
    if (scriptsCharges[url]) return scriptsCharges[url];
    scriptsCharges[url] = new Promise(function (ok, ko) {
      var s = document.createElement('script'); s.src = url; s.onload = ok; s.onerror = function () { delete scriptsCharges[url]; ko(new Error('script ' + url)); };
      document.head.appendChild(s);
    });
    return scriptsCharges[url];
  }
  function pdfLib() { return window.PDFLib ? Promise.resolve() : chargerScript('https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js'); }
  var PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  function pdfJs() {
    if (window.pdfjsLib && window.pdfjsLib.__capyPret) return Promise.resolve();
    return chargerScript(PDFJS_URL).then(function () { return fetch(PDFJS_WORKER); }).then(function (r) { return r.text(); }).then(function (txt) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })); window.pdfjsLib.__capyPret = true;
    });
  }
  function rasteriserPdf(buf) {
    return pdfJs().then(function () { return window.pdfjsLib.getDocument({ data: new Uint8Array(buf.slice(0)) }).promise; }).then(function (doc) {
      var pages = [], suite = Promise.resolve();
      if (doc.numPages > 40) throw new Error('trop de pages');
      for (var i = 1; i <= doc.numPages; i++) (function (i) {
        suite = suite.then(function () {
          return doc.getPage(i).then(function (page) {
            var v0 = page.getViewport({ scale: 1 }), v = page.getViewport({ scale: 1700 / Math.max(v0.width, v0.height) }), cv = document.createElement('canvas');
            cv.width = Math.round(v.width); cv.height = Math.round(v.height);
            var x = cv.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, cv.width, cv.height);
            return page.render({ canvasContext: x, viewport: v, annotationMode: window.pdfjsLib.AnnotationMode ? window.pdfjsLib.AnnotationMode.ENABLE : 1 }).promise.then(function () { pages.push({ url: cv.toDataURL('image/jpeg', 0.74), w: cv.width, h: cv.height }); });
          });
        });
      })(i);
      return suite.then(function () { return pages; });
    });
  }
  var MAX_FICHIER = 15 * 1024 * 1024;
  function lireBuffer(f) { return new Promise(function (ok, ko) { var r = new FileReader(); r.onload = function () { ok(r.result); }; r.onerror = ko; r.readAsArrayBuffer(f); }); }
  function imageVersJpeg(f) {
    return new Promise(function (ok, ko) {
      var url = URL.createObjectURL(f), im = new Image();
      im.onload = function () {
        var k = Math.min(1, 1800 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
        var x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); ok({ url: c.toDataURL('image/jpeg', 0.74), w: c.width, h: c.height });
      };
      im.onerror = function () { URL.revokeObjectURL(url); ko(new Error('image')); };
      im.src = url;
    });
  }
  function ajouterFichiers(slot, liste) {
    var fichiers = Array.prototype.slice.call(liste || []); if (!fichiers.length) return;
    var c = C(); c.docs[slot] = c.docs[slot] || []; c.occupe = true; majPoste();
    var suite = pdfLib();
    fichiers.forEach(function (f) {
      suite = suite.then(function () {
        var nom = f.name || 'document', pdf = f.type === 'application/pdf' || /\.pdf$/i.test(nom);
        if (f.size > MAX_FICHIER) { c.erreurFichier = L('« ' + nom + ' » dépasse 15 Mo.', '“' + nom + '” is larger than 15 MB.'); return; }
        if (pdf) {
          return lireBuffer(f).then(function (buf) {
            // PDF ordinaire : pages copiées telles quelles. PDF protégé (ex. formulaire de l'ARC rempli) ou illisible : chaque page est transformée en image.
            return PDFLib.PDFDocument.load(buf).then(function (d) { c.docs[slot].push({ nom: nom, kind: 'pdf', bytes: new Uint8Array(buf), pages: d.getPageCount() }); })
              .catch(function () {
                return rasteriserPdf(buf).then(function (pg) { c.docs[slot].push({ nom: nom, kind: 'imgs', jpegs: pg, pages: pg.length }); });
              });
          }).catch(function () { c.erreurFichier = L('« ' + nom + ' » n’a pas pu être lu. Ouvrez-le, choisissez « Imprimer » puis « Enregistrer au format PDF », et téléversez cette copie.', '“' + nom + '” could not be read. Open it, choose “Print” then “Save as PDF”, and upload that copy.'); });
        }
        if (/^image\/(jpeg|png|webp|gif|bmp)$/i.test(f.type) || /\.(jpe?g|png|webp|gif|bmp)$/i.test(nom)) {
          return imageVersJpeg(f).then(function (j) { c.docs[slot].push({ nom: nom, kind: 'img', jpeg: j, pages: 1 }); })
            .catch(function () { c.erreurFichier = L('« ' + nom + ' » n’a pas pu être lu.', '“' + nom + '” could not be read.'); });
        }
        c.erreurFichier = L('« ' + nom + ' » : format non pris en charge. Utilisez un PDF ou une photo JPG ou PNG.', '“' + nom + '”: unsupported format. Use a PDF or a JPG or PNG photo.');
      });
    });
    suite.catch(function () { c.erreurFichier = L('Le module de traitement des PDF n’a pas pu être chargé. Vérifiez votre connexion.', 'The PDF tool could not be loaded. Check your connection.'); })
      .then(function () { c.occupe = false; c.prix = null; majPoste(); rcMajPrix(); });
  }
  function totalFeuilles() {
    if (estCredit()) return crFeuilles();
    var c = etat.rc, n = ((!c.perso && !c.raccourci) ? 4 : 0) + (schGenere() ? 4 : 0);
    Object.keys(c.docs).forEach(function (k) { if (k === 'rc66' && !(c.perso || c.raccourci)) return; if (k === 'sch' && schGenere()) return; (c.docs[k] || []).forEach(function (f) { n += f.pages; }); });
    return n;
  }
  function rcSigPresente() { return !!signatureImage(); }
  function rcPosteManques() {
    if (estCredit()) return crPosteManques();
    var c = etat.rc, m = [], docs = rcDocs();
    if (!centreDe(rcProvResidence())) m.push('prov');
    if (c.perso || c.raccourci) { if (!(c.docs.rc66 || []).length) m.push('rc66'); }
    else if (!rcSigPresente()) m.push('signature');
    if ((c.perso && !c.raccourci) && schGenere() && !rcSigPresente() && m.indexOf('signature') === -1) m.push('signature');
    docs.forEach(function (d) { if (d.req && !(c.docs[d.id] || []).length) m.push(d.id); });
    if (c.occupe) m.push('occupe');
    return m;
  }

  /* ---- prix : même calcul que le récapitulatif, demandé au serveur */
  function apiBase() { return window.location.origin + (window.location.pathname.indexOf('/version-test') === 0 ? '/version-test' : '') + '/api/1.1/wf/'; }
  function argent(n) { var s = (Math.round(n * 100) / 100).toFixed(2); return etat.ui === 'fr' ? s.replace('.', ',') + ' $' : '$' + s; }
  function rcMajPrix() {
    var c = C(), n = totalFeuilles();
    if (c.stade !== 'poste' || n < 1) return;
    if (c.prix && c.prix.n === n) return;
    c.prixEnCours = true; majPoste();
    fetch(apiBase() + 'estimer_prix', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre_feuilles: n }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var x = j && j.response; if (!x || typeof x.cout_enveloppe !== 'number') throw new Error('prix');
        c.prix = { n: n, total: x.cout_enveloppe + n * x.prix_feuille + x.nb_timbres * x.prix_timbre };
      })
      .catch(function (e) { console.log('CAPYCOM estimer_prix', e && e.message); c.prix = { n: n, erreur: true }; })
      .then(function () { c.prixEnCours = false; majPoste(); });
  }

  /* ---- étape « envoi par la poste » */
  function slotHtml(d) {
    var c = C(), fl = c.docs[d.id] || [], ok = fl.length > 0, nb = 0;
    fl.forEach(function (f) { nb += f.pages; });
    return '<div class="ml-slot' + (ok ? ' ok' : (d.req ? ' manque' : '')) + '" data-slot="' + d.id + '"><div class="ml-slot-t"><span class="ml-pastille" aria-hidden="true">' + (ok ? '✓' : '') + '</span><strong>' + esc(d.titre) + '</strong>' +
      '<span class="ml-req">' + esc(d.req ? L('Requis', 'Required') : L('Facultatif', 'Optional')) + '</span></div>' +
      (d.aide ? '<p class="ml-aide">' + esc(d.aide) + '</p>' : '') + (d.lien ? '<p class="ml-liens-gouv"><a href="' + lienRc(d.lien[0]) + '" target="_blank" rel="noopener noreferrer">' + esc(d.lien[1]) + '</a></p>' : '') +
      (fl.length ? '<ul class="ml-fichiers">' + fl.map(function (f, i) { return '<li><span>' + esc(f.nom) + ' <em>(' + f.pages + ' ' + esc(f.pages > 1 ? L('pages', 'pages') : L('page', 'page')) + ')</em></span><button type="button" class="ml-lien" data-rcsup="' + d.id + '|' + i + '">' + esc(L('Retirer', 'Remove')) + '</button></li>'; }).join('') + '</ul>' : '') +
      '<label class="ml-btn ml-ajout">+ ' + esc(fl.length ? L('Ajouter d’autres fichiers', 'Add more files') : L('Ajouter des fichiers', 'Add files')) + '<input type="file" hidden multiple accept=".pdf,application/pdf,image/*" data-rcfichier="' + d.id + '"></label>' + (d.extra || '') + '</div>';
  }
  function rcPosteHtml() {
    var c = etat.rc, u = etat.ui, prov = rcProvResidence(), centre = centreDe(prov), docs = rcDocs(), m = rcPosteManques(), n = totalFeuilles();
    var h = '<button type="button" class="ml-lien ml-retour" data-rcretour="1">← ' + esc(c.raccourci ? L('Retour', 'Back') : L('Retour au récapitulatif', 'Back to the summary')) + '</button>' +
      '<h3>' + esc(L('On l’envoie pour vous', 'We mail it for you')) + '</h3><p class="ml-aide">' + esc(L('Ajoutez les documents demandés. Capycom assemble le tout, l’imprime en noir et blanc, le met sous enveloppe, affranchit et le poste à l’ARC. Vous vérifiez tout et payez à l’étape suivante.', 'Add the documents requested. Capycom puts everything together, prints it in black and white, puts it in an envelope, adds the postage and mails it to the CRA. You check everything and pay at the next step.')) + '</p>';
    if (c.raccourci) {
      h += '<div class="ml-carte-in"><h4>' + esc(L('Votre situation', 'Your situation')) + '</h4><p class="ml-aide">' + esc(L('Cochez ce qui s’applique pour connaître les documents à joindre.', 'Tick what applies to see the documents to attach.')) + '</p>' +
        champHtml('rc_f_prov', L('Province ou territoire où vous habitez', 'Province or territory where you live'), { req: true, type: 'provinceRc' }) +
        caseRc('rc_f_premiere', L('C’est la première fois que je demande des prestations pour mes enfants au Canada', 'This is the first time I apply for benefits for my children in Canada')) +
        caseRc('rc_f_sch', L('Je suis un nouvel arrivant, ou moi ou mon conjoint n’est pas citoyen canadien depuis 12 mois', 'I am a newcomer, or my partner or I have not been a Canadian citizen for 12 months')) +
        caseRc('rc_f_retro', L('Ma demande couvre une période qui a commencé il y a plus de 11 mois', 'My application covers a period that started more than 11 months ago')) +
        caseRc('rc_f_plus2', L('Je demande pour plus de deux enfants', 'I am applying for more than two children')) +
        caseRc('rc_f_pere', L('Je suis un homme et l’autre parent de l’enfant, une femme, vit avec moi', 'I am a man and the other parent of the child, a woman, lives with me')) + '</div>';
    }
    if (centre) h += '<div class="ml-carte-in"><h4>' + esc(L('Destinataire', 'Recipient')) + '</h4><address class="ml-adresse-envoi"><strong>' + esc(centre.nom) + '</strong><br>' + esc(centre.ligne) + '<br>' + esc(centre.ville + ' ' + provRc(centre.prov).ab + ' ' + centre.cp) + '</address></div>';
    // formulaire RC66
    h += '<div class="ml-slot' + (m.indexOf('rc66') === -1 && m.indexOf('signature') === -1 ? ' ok' : ' manque') + '" data-slot="rc66"><div class="ml-slot-t"><span class="ml-pastille" aria-hidden="true">' + (m.indexOf('rc66') === -1 && m.indexOf('signature') === -1 ? '✓' : '') + '</span><strong>' + esc(L('Formulaire RC66 rempli et signé', 'Completed and signed form RC66')) + '</strong><span class="ml-req">' + esc(L('Requis', 'Required')) + '</span></div>';
    if (!c.perso && !c.raccourci) {
      h += '<p class="ml-aide">' + esc(L('Le formulaire créé avec vos réponses sera ajouté (4 pages).', 'The form created from your answers will be added (4 pages).')) + '</p>';
      if (!rcSigPresente()) h += '<div class="ml-avert">' + esc(L('Le formulaire n’est pas signé. Pour que Capycom l’imprime et le poste, ajoutez votre signature : ', 'The form is not signed. For Capycom to print and mail it, add your signature: ')) + '<button type="button" class="ml-lien" data-rcaller="' + RC_ETAPES.indexOf('signature') + '">' + esc(L('ajouter ma signature', 'add my signature')) + '</button></div>';
      h += '<div class="ml-actions"><button type="button" class="ml-btn" data-rcvoir="1">' + esc(L('Voir le formulaire', 'View the form')) + '</button><button type="button" class="ml-lien" data-rcperso="1">' + esc(L('J’ai déjà rempli mon propre RC66 : le téléverser à la place', 'I already filled in my own RC66: upload it instead')) + '</button></div>';
    } else {
      var fl = c.docs.rc66 || [];
      h += '<p class="ml-aide">' + esc(L('Téléversez votre formulaire RC66 rempli et signé (PDF ou photos de toutes les pages).', 'Upload your completed and signed RC66 form (PDF or photos of all pages).')) + '</p>' +
        (fl.length ? '<ul class="ml-fichiers">' + fl.map(function (f, i) { return '<li><span>' + esc(f.nom) + ' <em>(' + f.pages + ' ' + esc(L('page(s)', 'page(s)')) + ')</em></span><button type="button" class="ml-lien" data-rcsup="rc66|' + i + '">' + esc(L('Retirer', 'Remove')) + '</button></li>'; }).join('') + '</ul>' : '') +
        '<label class="ml-btn ml-ajout">+ ' + esc(L('Ajouter des fichiers', 'Add files')) + '<input type="file" hidden multiple accept=".pdf,application/pdf,image/*" data-rcfichier="rc66"></label>' +
        (c.raccourci ? '' : '<div class="ml-actions"><button type="button" class="ml-lien" data-rcperso="0">' + esc(L('Utiliser plutôt le formulaire créé avec mes réponses', 'Use the form created from my answers instead')) + '</button></div>');
    }
    h += '</div>';
    if (schGenere()) h += schBlocHtml();
    docs.forEach(function (d) { h += slotHtml(d); });
    if (c.erreurFichier) h += '<p class="ml-message" style="display:block">' + esc(c.erreurFichier) + '</p>';
    if (c.occupe) h += '<p class="ml-aide">' + esc(L('Lecture des fichiers…', 'Reading files…')) + '</p>';
    var prixTxt = n < 1 ? '' : c.prixEnCours ? L('Calcul du prix…', 'Calculating the price…') : (c.prix && !c.prix.erreur ? L('Prix estimé : ', 'Estimated price: ') + argent(c.prix.total) : L('Le prix exact s’affiche au récapitulatif.', 'The exact price is shown on the summary page.'));
    h += '<div class="ml-prix"><div><span class="ml-prix-l">' + esc(L('Feuilles à imprimer', 'Sheets to print')) + '</span><strong>' + n + '</strong></div><div class="ml-prix-d"><strong>' + esc(prixTxt) + '</strong><span>' + esc(L('Impression noir et blanc, enveloppe et timbre compris. Le prix final est confirmé au récapitulatif, avant le paiement.', 'Black and white printing, envelope and postage included. The final price is confirmed on the summary page, before payment.')) + '</span></div></div>';
    var bloque = m.length > 0;
    h += '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-rccontinuer="1"' + (bloque ? ' aria-disabled="true"' : '') + '>' + esc(L('Continuer vers le récapitulatif et le paiement', 'Continue to the summary and payment')) + ' →</button></div>' +
      '<p class="ml-message" id="ml-rc-message2"></p>' +
      '<p class="ml-note">' + esc(L('Vous n’avez pas besoin de compte pour commencer : vous vous connectez juste avant le paiement. Vos documents sont envoyés à Capycom seulement quand vous cliquez sur « Continuer ».', 'You do not need an account to start: you sign in just before payment. Your documents are sent to Capycom only when you click “Continue”.')) + '</p>';
    return h;
  }
  function majPoste() {
    if (!racine || C().stade !== 'poste') return;
    var y = window.pageYOffset, h = estCredit() ? crPosteHtml() : rcPosteHtml(), z = racine.querySelector('.ml-rc');
    if (z) { z.innerHTML = '<div class="ml-rc-tete"><span class="ml-badge">' + esc(L('Outil gratuit', 'Free tool')) + '</span></div>' + h; window.scrollTo(0, y); }
  }
  function messagesManques(m) {
    var t1 = {
      bureau: L('Choisissez le bureau de crédit à qui envoyer.', 'Choose the credit bureau to mail to.'),
      prov: L('Indiquez votre province de résidence pour connaître l’adresse du centre fiscal.', 'Enter your province of residence to find the tax centre address.'),
      rc66: L('Ajoutez votre formulaire RC66.', 'Add your RC66 form.'),
      signature: L('Ajoutez votre signature, ou téléversez votre propre RC66 signé.', 'Add your signature, or upload your own signed RC66.'),
      occupe: L('Patientez, vos fichiers sont en cours de lecture.', 'Please wait, your files are being read.') };
    var docs = estCredit() ? crDocs(etat.cr.poste) : rcDocs(), titres = {}; docs.forEach(function (d) { titres[d.id] = d.titre; });
    return m.map(function (x) { return t1[x] || (L('Document manquant : ', 'Missing document: ') + (titres[x] || x)); });
  }
  function rcPretPoste() {
    var m = rcPosteManques();
    if (m.length) {
      var el0 = document.getElementById('ml-rc-message2');
      if (el0) { el0.textContent = messagesManques(m).join(' '); el0.className = 'ml-message'; el0.style.display = 'block'; }
      var s = racine.querySelector('.ml-slot.manque'); if (s && s.scrollIntoView) s.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  }

  /* ---- assemblage : une page PDF par feuille, comme le fait la page 1-mail */
  function base64Octets(b64) { var s = atob(b64), u = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u; }
  function rcAssembler(progres) {
    var cr = estCredit(), c = C(), PD, pages = [];
    var ordre = [];
    if (cr) { ordre.push('__gen'); crDocs(c.poste).forEach(function (d) { ordre.push(d.id); }); }
    else {
    if (c.perso || c.raccourci) ordre.push('rc66');
    if ((!c.perso && !c.raccourci) || schGenere()) ordre.push('__gen');
    rcDocs().forEach(function (d) { ordre.push(d.id); });
    }
    function seule(src, i) {
      return PD.create().then(function (d) { return d.copyPages(src, [i]).then(function (p) { d.addPage(p[0]); return d.saveAsBase64(); }); });
    }
    function pageImage(f) {
      return PD.create().then(function (d) {
        var bytes = base64Octets(f.jpeg.url.split(',')[1]);
        return d.embedJpg(bytes).then(function (im) {
          var paysage = f.jpeg.w > f.jpeg.h * 1.1, W = paysage ? 792 : 612, H = paysage ? 612 : 792, marge = 22;
          var k = Math.min((W - 2 * marge) / im.width, (H - 2 * marge) / im.height), w = im.width * k, h = im.height * k;
          var p = d.addPage([W, H]); p.drawImage(im, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h });
          return d.saveAsBase64();
        });
      });
    }
    var suite = pdfLib().then(function () { PD = PDFLib.PDFDocument; });
    ordre.forEach(function (id) {
      if (id === '__gen') {
        suite = suite.then(function () {
          var buf = (cr ? crDessiner(c.poste) : rcDessiner()).output('arraybuffer');
          return PD.load(buf).then(function (src) {
            var p = Promise.resolve();
            for (var i = 0; i < src.getPageCount(); i++) (function (i) { p = p.then(function () { return seule(src, i).then(function (b) { pages.push(b); }); }); })(i);
            return p;
          });
        });
        return;
      }
      (c.docs[id] || []).forEach(function (f) {
        suite = suite.then(function () {
          if (f.kind === 'img') return pageImage(f).then(function (b) { pages.push(b); });
          if (f.kind === 'imgs') {
            var q = Promise.resolve();
            f.jpegs.forEach(function (j) { q = q.then(function () { return pageImage({ jpeg: j }).then(function (b) { pages.push(b); }); }); });
            return q;
          }
          return PD.load(f.bytes, { ignoreEncryption: true }).then(function (src) {
            var p = Promise.resolve();
            for (var i = 0; i < src.getPageCount(); i++) (function (i) { p = p.then(function () { return seule(src, i).then(function (b) { pages.push(b); }); }); })(i);
            return p;
          });
        });
      });
    });
    return suite.then(function () { return pages; });
  }
  function rcEnvoyer(idCourrier) {
    if (estCredit()) { crEnvoyer(idCourrier); return; }
    if (etat.envoiEnCours) return;
    if (!rcPretPoste()) { console.log('CAPYCOM rc66 : dossier incomplet, brouillon ' + idCourrier + ' laissé vide'); return; }
    var c = etat.rc, centre = centreDe(rcProvResidence());
    etat.envoiEnCours = true;
    var ov = document.getElementById('capy-ml-overlay');
    function ecran(txt) { if (ov) { ov.textContent = txt; ov.style.display = 'flex'; } }
    ecran(L('Préparation de votre dossier…', 'Preparing your file…'));
    var RACINE = apiBase();
    function post(wf, corps) {
      return fetch(RACINE + wf, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
        .then(function (x) { return x.json().then(function (j) { console.log('CAPYCOM ' + wf, x.status); if (!x.ok) throw new Error(wf + ' ' + x.status); return j; }); });
    }
    var provExp = provRc(rv('rcp_prov')), provExpBubble = provExp && provExp.ab && ['NU', 'NT', 'YT'].indexOf(provExp.ab) === -1 ? provExp.fr : centre.prov;
    var nomExp = (rv('rc_prenom') + ' ' + rv('rc_nom')).trim();
    var adresses = {
      id_courrier: idCourrier, dest_nom: centre.nom, dest_ligne: centre.ligne, dest_ville: centre.ville, dest_province: centre.prov, dest_code_postal: centre.cp,
      exp_nom: nomExp, exp_ligne: rv('rcp_ligne'), exp_ville: rv('rcp_ville'), exp_province: provExpBubble, exp_code_postal: cpNormal(rv('rcp_cp')),
      dest_texte: [centre.nom, centre.ligne, centre.ville, provRc(centre.prov).en, centre.cp, 'Canada'].join('\n'),
      exp_texte: [nomExp, rv('rcp_ligne'), rv('rcp_ville'), provExp ? provExp.en : '', cpNormal(rv('rcp_cp')), 'Canada'].join('\n')
    };
    rcAssembler().then(function (pages) {
      var i = 0;
      function suivante() {
        if (i >= pages.length) return Promise.resolve();
        var n = i + 1, b64 = pages[i]; i++;
        ecran(L('Envoi de la feuille ' + n + ' sur ' + pages.length + '…', 'Sending sheet ' + n + ' of ' + pages.length + '…'));
        return post('creer_page_vide', { id_courrier: idCourrier }).then(function (d1) {
          var idPage = d1.response && d1.response.id_page; if (!idPage) throw new Error('id_page');
          return post('generer_pdf', { contenu_base64: { filename: 'rc66-' + n + '.pdf', contents: b64, private: true, attach_to: idPage }, id_page_cible: idPage });
        }).then(suivante);
      }
      return suivante();
    }).then(function () { ecran(L('Dernières vérifications…', 'Final checks…')); return post('completer_courrier_modele', adresses); })
      .then(function () { window.location.href = window.location.origin + (window.location.pathname.indexOf('/version-test') === 0 ? '/version-test' : '') + '/5-summary/' + idCourrier; })
      .catch(function (err) {
        console.log('CAPYCOM erreur envoi rc66', err && err.message);
        etat.envoiEnCours = false;
        ecran(L('Un problème est survenu pendant la préparation. Vous allez être redirigé vers votre courrier pour le vérifier.', 'Something went wrong while preparing your file. You will be taken to your mail to check it.'));
        setTimeout(function () { window.location.href = window.location.origin + (window.location.pathname.indexOf('/version-test') === 0 ? '/version-test' : '') + '/1-mail/' + idCourrier; }, 3500);
      });
  }

  /* ---- rendu de l’assistant */
  function rcProgression() {
    var act = rcActives().filter(function (i) { return RC_ETAPES[i] !== 'intro' && RC_ETAPES[i] !== 'recap'; }), pos = act.indexOf(etat.rc.etape), total = act.length;
    if (pos < 0) return '';
    var n = pos + 1;
    return '<div class="ml-prog" role="group" aria-label="' + esc(L('Progression', 'Progress')) + '"><div class="ml-prog-t">' + esc(L('Étape ', 'Step ') + n + L(' sur ', ' of ') + total + ' · ' + rcTitreEtape(RC_ETAPES[etat.rc.etape])) + '</div><div class="ml-prog-b"><span style="width:' + Math.round(n / total * 100) + '%"></span></div></div>';
  }
  function rcCorps(e) {
    return { intro: rcEtapeIntro, vous: rcEtapeVous, adresse: rcEtapeAdresse, civil: rcEtapeCivil, statut: rcEtapeStatut, schres: rcEtapeSchres, schstat: rcEtapeSchstat, schrev: rcEtapeSchrev, enfants: rcEtapeEnfants, signature: rcEtapeSignature, recap: rcEtapeRecap }[e]();
  }
  function rcNav(e) {
    if (e === 'intro' || e === 'recap') return e === 'recap' ? '<div class="ml-nav"><button type="button" class="ml-btn" data-rcprec="1">← ' + esc(L('Précédent', 'Previous')) + '</button></div>' : '';
    var dernier = e === 'signature';
    return '<p class="ml-message" id="ml-rc-message"></p><div class="ml-nav"><button type="button" class="ml-btn" data-rcprec="1">← ' + esc(L('Précédent', 'Previous')) + '</button>' +
      '<button type="button" class="ml-btn ml-btn-plein" data-rcsuivant="1">' + esc(dernier ? L('Voir le récapitulatif', 'See the summary') : L('Suivant', 'Next')) + ' →</button></div>';
  }
  function rcRendre() {
    if (estCredit()) return crRendre();
    var c = etat.rc, h = '<div class="ml-carte ml-rc"><div class="ml-rc-tete"><span class="ml-badge">' + esc(L('Outil gratuit', 'Free tool')) + '</span></div>';
    if (c.stade === 'poste') h += rcPosteHtml();
    else { var e = RC_ETAPES[c.etape]; h += rcProgression() + '<div class="ml-rc-corps">' + rcCorps(e) + '</div>' + rcNav(e); }
    h += '</div><p class="ml-note">' + esc(L('Les formulaires générés sont les formulaires officiels RC66 et RC66SCH de l’ARC (version française), remplis avec vos réponses. Capycom n’est pas affilié à l’ARC. Vos réponses restent dans votre navigateur.', 'The generated forms are the CRA’s official RC66 and RC66SCH forms (French version), filled in with your answers. Capycom is not affiliated with the CRA. Your answers stay in your browser.')) + '</p>';
    return h;
  }
  function rcAller(etape) {
    etat.rc.etape = Math.max(0, Math.min(RC_ETAPES.length - 1, etape)); etat.rc.stade = 'quest';
    if (etat.rc.etape === RC_ETAPES.indexOf('signature') && etat.sig.mode === 'police') etat.sig.mode = 'none';
    rendre();
    var z = document.getElementById('capy-ml'); if (z && z.scrollIntoView) { try { z.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { z.scrollIntoView(); } }
  }
  function rcSuivant() {
    var e = RC_ETAPES[etat.rc.etape];
    if (e === 'intro') { rcAller(1); return; }
    var m = rcManques(e);
    if (m.length) {
      marquerErreurs(m);
      rcMessage(msgManque(m) + (m.indexOf('rc_nas') !== -1 || m.indexOf('rc_s_nas') !== -1 ? ' ' + L('Un numéro d’assurance sociale a 9 chiffres.', 'A social insurance number has 9 digits.') : ''));
      return;
    }
    rcAller(rcSuiv());
  }
  function rcClic(b, e) {
    var c = C(), a;
    if (b.getAttribute('data-rcsuivant')) { rcSuivant(); return true; }
    if (b.getAttribute('data-rcprec')) { rcAller(rcPrec()); return true; }
    if ((a = b.getAttribute('data-rcaller')) !== null) { rcAller(parseInt(a, 10)); return true; }
    if ((a = b.getAttribute('data-rcradio'))) { var p = a.split('|'); etat.v[p[0]] = p[1]; rendre(); return true; }
    if (b.getAttribute('data-rcraccourci')) { c.raccourci = true; c.stade = 'poste'; c.perso = true; rendre(); rcMajPrix(); return true; }
    if ((a = b.getAttribute('data-rcdeux')) !== null) { c.deux = a === '1'; rendre(); return true; }
    if (b.getAttribute('data-rctelecharger')) { rcTelecharger(); return true; }
    if (b.getAttribute('data-rcvoir')) { rcVoir(); return true; }
    if (b.getAttribute('data-rcposte')) { c.stade = 'poste'; c.erreurFichier = ''; rendre(); rcMajPrix(); return true; }
    if (b.getAttribute('data-rcretour')) { if (c.raccourci) { c.raccourci = false; c.perso = false; c.stade = 'quest'; c.etape = 0; } else { c.stade = 'quest'; c.etape = RC_ETAPES.length - 1; } rendre(); return true; }
    if ((a = b.getAttribute('data-rcschperso')) !== null) { c.schPerso = a === '1'; c.prix = null; rendre(); rcMajPrix(); return true; }
    if ((a = b.getAttribute('data-rcperso')) !== null) { c.perso = a === '1'; c.prix = null; rendre(); rcMajPrix(); return true; }
    if ((a = b.getAttribute('data-rcsup'))) { var q = a.split('|'); (c.docs[q[0]] || []).splice(parseInt(q[1], 10), 1); c.prix = null; c.erreurFichier = ''; rendre(); rcMajPrix(); return true; }
    if (b.getAttribute('data-rccontinuer')) {
      if (!rcPretPoste()) return true;
      var bt = document.getElementById('capy-btn-poste');
      if (bt) bt.click(); else { var m2 = document.getElementById('ml-rc-message2'); if (m2) { m2.textContent = L('Le bouton d’envoi est introuvable. Rechargez la page.', 'The send button was not found. Reload the page.'); m2.style.display = 'block'; } }
      return true;
    }
    return false;
  }
  function rcChange(t0) {
    var a;
    if ((a = t0.getAttribute('data-rcchk'))) {
      etat.v[a] = t0.checked ? '1' : '';
      if (/^rc_f_/.test(a) || a === 'rc_memeadr' || a === 'rc_sansnas' || a === 'rc_depuis' || /depuisnaiss$/.test(a) || /^rc_sch_/.test(a) || /^cr_/.test(a)) { rendre(); if (/^rc_f_/.test(a)) { etat.rc.prix = null; rcMajPrix(); } }
      return true;
    }
    if ((a = t0.getAttribute('data-rcfichier'))) { ajouterFichiers(a, t0.files); t0.value = ''; return true; }
    if (t0.getAttribute('data-k') === 'rc_f_prov') { etat.rc.prix = null; rendre(); rcMajPrix(); return true; }
    return false;
  }




  function aCr(k, txt) { return aRc(k, txt); }
  var CR_BUREAUX = DEF.commun.bureaux;
  function estCredit() { return etat.vue === 'modele' && etat.modele === 'credit'; }
  etat.cr = { etape: 0, stade: 'quest', nb: 1, docs: {}, prix: null, prixEnCours: false, occupe: false, erreurFichier: '', poste: '' };
  function C() { return estCredit() ? etat.cr : etat.rc; }
  function crEq() { return !!rv('cr_eq'); }
  function crTu() { return !!rv('cr_tu'); }
  function crComptes() { return !!rv('cr_t_comptes'); }
  function crPerso() { return !!rv('cr_t_perso'); }
  function crMaxComptes() { return crTu() && !crEq() ? 6 : 3; }
  function crNb() { return Math.max(1, Math.min(etat.cr.nb, crMaxComptes())); }
  function mots(s) { return (String(s || '').trim().match(/\S+/g) || []).length; }
  function crLimiteMots() { return crTu() ? (rv('cr_a_prov') === 'Saskatchewan' ? 200 : 100) : 400; }

  var CR_ETAPES = ['intro', 'quoi', 'vous', 'adresse', 'comptes', 'perso', 'decl', 'signature', 'recap'];
  function crActives() { return CM.crEtapesActives(moteurCr()).map(function (e) { return CR_ETAPES.indexOf(e); }); }
  function crSuiv() { var a = crActives(), c = etat.cr.etape; for (var i = 0; i < a.length; i++) if (a[i] > c) return a[i]; return c; }
  function crPrec() { var a = crActives(), c = etat.cr.etape; for (var i = a.length - 1; i >= 0; i--) if (a[i] < c) return a[i]; return c; }
  function crTitreEtape(e) {
    return { intro: L('Avant de commencer', 'Before you start'), quoi: L('Ce que vous voulez corriger', 'What you want to correct'), vous: L('Vos renseignements', 'About you'),
      adresse: L('Vos adresses', 'Your addresses'), comptes: L('Les comptes en cause', 'The accounts involved'), perso: L('Renseignements personnels à corriger', 'Personal information to correct'),
      decl: L('Déclaration du consommateur', 'Consumer statement'), signature: L('Signature et date', 'Signature and date'), recap: L('Récapitulatif', 'Summary') }[e];
  }
  // Limites de cases des formulaires Equifax (un caractère par case)
  var CR_LIM = CM.CR_LIM;
  function crLim(id) { var k = id.replace(/^cr_/, ''); return crEq() && CR_LIM[k] ? CR_LIM[k] : 60; }
  function cc(id, label, o) { o = o || {}; o.max = o.max || crLim(id); return champHtml(id, label, o); }
  function crAideLim(id) { return crEq() && CR_LIM[id.replace(/^cr_/, '')] ? ' ' + L('(Equifax : ' + CR_LIM[id.replace(/^cr_/, '')] + ' caractères au plus)', '(Equifax: ' + CR_LIM[id.replace(/^cr_/, '')] + ' characters at most)') : ''; }

  function crEtapeIntro() {
    return '<h3>' + esc(L('Corriger une erreur dans votre dossier de crédit', 'Correct an error in your credit report')) + '</h3>' +
      '<p class="ml-aide">' + esc(L('Un outil gratuit qui remplit pour vous les formulaires officiels d’Equifax et de TransUnion, les deux bureaux de crédit du Canada. Vous répondez à des questions simples, puis vous obtenez les formulaires prêts à signer et à envoyer par la poste.',
        'A free tool that fills in the official forms of Equifax and TransUnion, the two credit bureaus in Canada, for you. You answer simple questions, then you get the forms ready to sign and mail.')) + '</p>' +
      '<div class="ml-info"><strong>' + esc(L('À savoir avant de commencer', 'Good to know before you start')) + '</strong><ul>' +
      '<li>' + esc(L('Demandez d’abord votre dossier de crédit gratuit aux deux bureaux et repérez l’erreur : compte que vous ne reconnaissez pas, retard de paiement qui n’existe pas, compte fermé encore indiqué comme ouvert, date de naissance ou adresse inexacte.', 'First get your free credit report from both bureaus and spot the error: an account you do not recognize, a late payment that never happened, a closed account still shown as open, a wrong date of birth or address.')) + '</li>' +
      '<li>' + esc(L('La correction est gratuite. Chaque bureau tient son propre dossier : si l’erreur figure chez les deux, il faut écrire aux deux.', 'Correcting an error is free. Each bureau keeps its own file: if the error appears at both, write to both.')) + '</li>' +
      '<li>' + esc(L('Chaque bureau demande des copies de vos pièces d’identité et d’une preuve d’adresse. Gardez les originaux et masquez les codes de sécurité (CVV) de toute carte.', 'Each bureau asks for copies of your ID and a proof of address. Keep the originals and black out the security codes (CVV) of any card.')) + '</li>' +
      '<li>' + esc(L('Le formulaire Equifax n’existe qu’en anglais. Vous pouvez y écrire en français. Celui de TransUnion est en français.', 'The Equifax form only exists in English. TransUnion’s form is in French.')) + '</li>' +
      '<li>' + esc(L('Capycom n’est affilié ni à Equifax ni à TransUnion. Cet outil ne donne pas de conseil juridique ou financier. Vos réponses restent dans votre navigateur tant que vous ne choisissez pas l’envoi par la poste.', 'Capycom is not affiliated with Equifax or TransUnion. This tool does not give legal or financial advice. Your answers stay in your browser unless you choose mailing.')) + '</li></ul></div>' +
      '<p class="ml-liens-gouv">' + esc(L('Pour vérifier l’information : ', 'To check the information: ')) + aCr('fcac', L('Erreurs dans votre dossier de crédit (ACFC)', 'Errors in your credit report (FCAC)')) + ' · ' +
      aCr('eq', L('Contester chez Equifax', 'Dispute with Equifax')) + ' · ' + aCr('tu', L('Contester chez TransUnion', 'Dispute with TransUnion')) + '</p>' +
      '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-crsuivant="1">' + esc(L('Commencer le questionnaire', 'Start the questions')) + '</button></div>';
  }
  function crEtapeQuoi() {
    return '<h3>' + esc(L('Ce que vous voulez corriger', 'What you want to correct')) + '</h3>' +
      '<div class="ml-champ" data-champ="cr_bureau"><label>' + esc(L('À quel bureau voulez-vous écrire ?', 'Which bureau do you want to write to?')) + '</label>' +
      caseRc('cr_eq', L('Equifax', 'Equifax')) + caseRc('cr_tu', L('TransUnion', 'TransUnion')) +
      '<p class="ml-aide">' + esc(L('Si l’erreur figure dans les deux dossiers, cochez les deux : vous obtiendrez un formulaire pour chacun.', 'If the error appears in both files, tick both: you will get one form for each.')) + '</p></div>' +
      '<div class="ml-champ" data-champ="cr_type"><label>' + esc(L('Qu’est-ce qui est faux ?', 'What is wrong?')) + '</label>' +
      caseRc('cr_t_comptes', L('Un compte ou un prêt (inconnu, fraude, solde ou retards inexacts, compte fermé…)', 'An account or a loan (unknown, fraud, wrong balance or late payments, closed account…)')) +
      caseRc('cr_t_perso', L('Mes renseignements personnels (nom, adresse, date de naissance, NAS, téléphone)', 'My personal information (name, address, date of birth, SIN, phone)')) + '</div>' +
      '<p class="ml-aide">' + esc(L('Pour une faillite, une procédure judiciaire ou une demande de crédit que vous ne reconnaissez pas, Equifax a d’autres formulaires. Choisissez « Un compte ou un prêt » si c’est un compte inclus dans une faillite, et consultez la page officielle pour le reste.', 'For a bankruptcy, a court record or a credit application you do not recognize, Equifax has other forms. Choose “An account or a loan” if it is an account included in a bankruptcy, and see the official page for the rest.')) + '</p>';
  }
  function crEtapeVous() {
    return '<h3>' + esc(L('Vos renseignements', 'About you')) + '</h3><p class="ml-aide">' + esc(L('Écrivez-les comme sur vos pièces d’identité. Ils servent à retrouver votre dossier.', 'Write them as on your ID. They are used to find your file.')) + '</p>' +
      '<div class="ml-ligne">' + cc('cr_prenom', L('Prénom', 'First name'), { req: true }) + cc('cr_prenom2', L('Deuxième prénom', 'Middle name')) + '</div>' +
      '<div class="ml-ligne">' + cc('cr_nom', L('Nom de famille', 'Last name'), { req: true }) + cc('cr_suffixe', L('Suffixe (Jr, Sr)', 'Suffix (Jr, Sr)')) + '</div>' +
      dateRc('cr_naiss', L('Date de naissance', 'Date of birth')) +
      nasRc('cr_nas', L('Numéro d’assurance sociale (NAS), facultatif', 'Social insurance number (SIN), optional'), false) +
      '<div class="ml-ligne">' + champHtml('cr_tel', L('Téléphone', 'Phone'), { req: crEq(), type: 'tel', max: 20, ph: '613 555 1234' }) + cc('cr_courriel', L('Courriel', 'Email'), { req: crEq(), ph: 'nom@exemple.ca' }) + '</div>' +
      (crEq() ? champHtml('cr_numeq', L('Numéro unique Equifax, facultatif', 'Equifax unique number, optional'), { max: 10 }) + '<p class="ml-aide">' + esc(L('Il figure sur votre dossier Equifax, si vous l’avez déjà demandé.', 'It is shown on your Equifax report, if you already requested it.')) + '</p>' : '') +
      (crEq() ? '<p class="ml-aide">' + esc(L('Equifax exige un téléphone et un courriel. Le courriel doit tenir dans 35 cases.', 'Equifax requires a phone number and an email. The email must fit in 35 boxes.')) + '</p>' : '');
  }
  function crBlocAdr(p, req) {
    return '<div class="ml-ligne">' + cc('cr_' + p + '_no', L('Numéro civique', 'Street number'), { req: false }) + cc('cr_' + p + '_rue', L('Nom de la rue', 'Street name'), { req: req }) + '</div>' +
      '<div class="ml-ligne">' + cc('cr_' + p + '_app', L('Appartement ou unité', 'Unit or apartment'), { req: false }) + cc('cr_' + p + '_ville', L('Ville', 'City'), { req: req }) + '</div>' +
      '<div class="ml-ligne">' + champHtml('cr_' + p + '_prov', L('Province ou territoire', 'Province or territory'), { req: req, type: 'provinceRc' }) + champHtml('cr_' + p + '_cp', L('Code postal', 'Postal code'), { req: req, max: 7, ph: 'K1A 0B1' }) + '</div>';
  }
  function crEtapeAdresse() {
    var h = '<h3>' + esc(L('Vos adresses', 'Your addresses')) + '</h3><p class="ml-sous-titre">' + esc(L('Adresse actuelle', 'Current address')) + '</p>' + crBlocAdr('a', true) +
      caseRc('cr_p_oui', L('J’ai une adresse précédente à indiquer (par exemple si j’ai déménagé depuis moins de deux ans)', 'I have a previous address to enter (for example if I moved in the last two years)'));
    if (rv('cr_p_oui')) {
      h += '<p class="ml-sous-titre">' + esc(L('Adresse précédente', 'Previous address')) + '</p>' + crBlocAdr('p', true) +
        '<div class="ml-ligne">' + dateRc('cr_p_de', L('Habité là depuis le', 'Lived there from'), crEq()) + dateRc('cr_p_a', L('Jusqu’au', 'Until'), crEq()) + '</div>';
    }
    return h;
  }
  var CR_MOTIFS = [
    ['pasmien', 'Ce compte n’est pas le mien, je ne le reconnais pas', 'This account is not mine, I do not recognize it'],
    ['fraude', 'Victime de fraude ou de vol d’identité', 'Victim of fraud or identity theft'],
    ['ferme', 'Compte remboursé et fermé, mais mal indiqué', 'Account paid and closed, but shown wrongly'],
    ['note', 'Retards de paiement ou cote inexacts', 'Wrong late payments or rating'],
    ['faillite', 'Compte inclus dans une faillite', 'Account included in a bankruptcy'],
    ['autre', 'Autre erreur (à décrire)', 'Other error (describe it)']
  ];
  function crEtapeComptes() {
    var n = crNb(), h = '<h3>' + esc(L('Les comptes en cause', 'The accounts involved')) + '</h3><p class="ml-aide">' + esc(L('Un bloc par compte. Le nom du prêteur et le numéro de compte sont sur votre dossier de crédit. Vous pouvez écrire seulement les derniers chiffres du numéro.', 'One block per account. The lender’s name and the account number are on your credit report. You can write only the last digits of the number.')) + '</p>';
    for (var i = 1; i <= n; i++) {
      var p = 'cr_c' + i + '_', mo = rv(p + 'motif');
      h += '<div class="ml-carte-in"><h4>' + esc(L('Compte ', 'Account ') + i) + '</h4>' +
        '<div class="ml-ligne">' + champHtml(p + 'cred', L('Nom du prêteur ou du créancier', 'Lender or creditor name'), { req: true, max: crEq() ? 20 : 60 }) + champHtml(p + 'num', L('Numéro de compte', 'Account number'), { req: false, max: crEq() ? 16 : 40 }) + '</div>' +
        '<div class="ml-champ" data-champ="' + p + 'motif"><label>' + esc(L('Qu’est-ce qui est faux ?', 'What is wrong?')) + '</label><div class="ml-choix">' +
        CR_MOTIFS.map(function (m) { return '<button type="button" class="ml-choix-b' + (mo === m[0] ? ' actif' : '') + '" data-rcradio="' + p + 'motif|' + m[0] + '">' + esc(L(m[1], m[2])) + '</button>'; }).join('') + '</div></div>';
      if (mo === 'ferme') h += dateRc(p + 'date', L('Date de fermeture du compte', 'Date the account was closed'));
      if (mo === 'note') h += '<div class="ml-ligne">' + champHtml(p + 'cote', L('Cote à corriger (exemple : R2)', 'Rating to correct (example: R2)'), { req: true, max: 8, ph: 'R2' }) + dateRc(p + 'cotedate', L('Date associée', 'Associated date')) + '</div>';
      if (mo === 'autre') h += champHtml(p + 'autre', L('Décrivez l’erreur en quelques mots', 'Describe the error in a few words'), { req: true, type: 'textarea', max: crEq() ? 180 : 140 });
      if (mo === 'faillite') h += '<p class="ml-aide">' + esc(L('Equifax a un formulaire distinct pour les faillites et les dossiers publics. Ce formulaire signale le compte ; joignez aussi les documents de la faillite.', 'Equifax has a separate form for bankruptcies and public records. This form flags the account; also attach the bankruptcy documents.')) + '</p>';
      h += '</div>';
    }
    h += '<div class="ml-actions">' + (n < crMaxComptes() ? '<button type="button" class="ml-btn" data-crnb="1">+ ' + esc(L('Ajouter un compte', 'Add an account')) + '</button>' : '') + (n > 1 ? '<button type="button" class="ml-lien" data-crnb="-1">' + esc(L('Retirer le dernier compte', 'Remove the last account')) + '</button>' : '') + '</div>' +
      (crEq() ? '<p class="ml-aide">' + esc(L('Le formulaire Equifax contient 3 comptes au plus' + (crTu() ? ' (celui de TransUnion en contient 6). Cet outil en garde 3 pour garder les deux dossiers identiques.' : '.'), 'The Equifax form has room for 3 accounts at most' + (crTu() ? ' (TransUnion’s has 6). This tool keeps 3 so that both files match.' : '.'))) + '</p>' : '');
    return h;
  }
  function crEtapePerso() {
    var h = '<h3>' + esc(L('Renseignements personnels à corriger', 'Personal information to correct')) + '</h3><p class="ml-aide">' + esc(L('Les renseignements des étapes précédentes sont les bons. Cochez ce qui est faux dans le dossier.', 'The details from the previous steps are the correct ones. Tick what is wrong in the file.')) + '</p>' +
      '<div class="ml-champ" data-champ="cr_s_quoi"><label>' + esc(L('Qu’est-ce qui est inexact ?', 'What is wrong?')) + '</label>' +
      caseRc('cr_s_nom', L('Mon nom', 'My name')) + caseRc('cr_s_adr', L('Mon adresse', 'My address')) + caseRc('cr_s_dob', L('Ma date de naissance', 'My date of birth')) + caseRc('cr_s_nas', L('Mon NAS', 'My SIN')) + caseRc('cr_s_tel', L('Mon numéro de téléphone', 'My phone number')) + '</div>' +
      champHtml('cr_s_detail', L('Expliquez en une phrase (150 caractères au plus)', 'Explain in one sentence (150 characters at most)'), { req: true, type: 'textarea', max: 150 });
    if (rv('cr_s_nom')) h += '<p class="ml-sous-titre">' + esc(L('Ancien nom, si différent', 'Former name, if different')) + '</p><div class="ml-ligne">' + cc('cr_anc_prenom', L('Prénom', 'First name'), { req: false }) + cc('cr_anc_nom', L('Nom de famille', 'Last name'), { req: false }) + '</div>';
    if (rv('cr_s_nas')) h += nasRc('cr_anc_nas', L('Ancien NAS, facultatif', 'Previous SIN, optional'), false);
    return h;
  }
  function crEtapeDecl() {
    var lim = crLimiteMots(), n = mots(rv('cr_decl'));
    return '<h3>' + esc(L('Déclaration du consommateur', 'Consumer statement')) + '</h3><p class="ml-aide">' + esc(L('Facultatif. Si le bureau ne règle pas votre dispute, vous pouvez ajouter à votre dossier une courte déclaration qui donne votre version des faits. Elle est gratuite et apparaît dans votre dossier. Si vous l’écrivez ici, Capycom la met sur une feuille séparée jointe à la demande.', 'Optional. If the bureau does not settle your dispute, you can add a short statement giving your side to your file. It is free and appears in your file. If you write it here, Capycom puts it on a separate sheet attached to the request.')) + '</p>' +
      champHtml('cr_decl', L('Votre déclaration (' + lim + ' mots au plus)', 'Your statement (' + lim + ' words at most)'), { req: false, type: 'textarea', max: 2600 }) +
      '<p class="ml-aide" id="ml-cr-mots">' + esc(n + ' / ' + lim + L(' mots', ' words'))  + '</p>' +
      '<p class="ml-aide">' + esc(L('TransUnion accepte 100 mots (200 en Saskatchewan) ; Equifax, environ 400 mots. La limite affichée suit les bureaux choisis.', 'TransUnion accepts 100 words (200 in Saskatchewan); Equifax, about 400 words. The limit shown follows the bureaus you chose.')) + '</p>';
  }
  function crEtapeSignature() {
    var h = '<h3>' + esc(L('Signature et date', 'Signature and date')) + '</h3><p class="ml-aide">' + esc(L('En signant, vous autorisez le bureau à vérifier les renseignements auprès des prêteurs et vous confirmez qu’ils sont exacts.', 'By signing, you allow the bureau to check the information with the lenders and you confirm it is accurate.')) + '</p>' +
      dateRc('cr_datesign', L('Date de la signature', 'Date of signature'));
    h += '<div class="ml-info"><p>' + esc(L('Vous pouvez signer à la main après avoir imprimé les formulaires. Si vous voulez que Capycom les imprime et les poste pour vous, ajoutez votre signature ici : dessinez-la ou envoyez une photo de votre signature manuscrite.', 'You can sign by hand after printing the forms. If you want Capycom to print and mail them for you, add your signature here: draw it or upload a photo of your handwritten signature.')) + '</p></div>';
    h += '<div class="ml-sig-bloc" id="ml-sig">' + contenuSignature() + '</div>';
    return h;
  }
  /* ---- validation */
  function crManques(e) { return CM.crManquesEtape(moteurCr(), e); }
  function crMessage(txt, ok) {
    var m = document.getElementById('ml-cr-message'); if (!m) return;
    m.textContent = txt || ''; m.className = 'ml-message' + (ok ? ' ok' : ''); m.style.display = txt ? 'block' : 'none';
  }
  function crSuivant() {
    var e = CR_ETAPES[etat.cr.etape];
    if (e === 'intro') { crAller(1); return; }
    var m = crManques(e);
    if (m.length) {
      marquerErreurs(m);
      var sup = '';
      if (crEq() && m.some(function (id) { var l = CR_LIM[id.replace(/^cr_/, '')] || (/_cred$/.test(id) ? 20 : /_num$/.test(id) ? 16 : 0); return l && rv(id).length > l; })) sup = ' ' + L('Equifax n’a qu’un nombre limité de cases : abrégez le texte.', 'Equifax has a limited number of boxes: shorten the text.');
      if (e === 'decl') sup = ' ' + L('La déclaration dépasse la limite de mots.', 'The statement is over the word limit.');
      crMessage(msgManque(m) + sup);
      return;
    }
    crAller(crSuiv());
  }
  function crAller(etape) {
    etat.cr.etape = Math.max(0, Math.min(CR_ETAPES.length - 1, etape)); etat.cr.stade = 'quest';
    if (etat.cr.etape === CR_ETAPES.indexOf('signature') && etat.sig.mode === 'police') etat.sig.mode = 'none';
    rendre();
    var z = document.getElementById('capy-ml'); if (z && z.scrollIntoView) { try { z.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { z.scrollIntoView(); } }
  }


  function crVal(f) { return CM.crVal(moteurCr(), f); }






  function crFormsDe(b) { return moteurCr().formsDe(b); }
  function crDeclPage() { return moteurCr().declPage(); }
  function crNbPagesBureau(b) { return moteurCr().nbPagesBureau(b); }
  function crDessiner(bureau, formsSeuls) {
    var sig = signatureImage();
    var plan = CM.planCredit(etat.v, bureau, { ui: etat.ui, cr: etat.cr, sig: sig, formsSeuls: formsSeuls });
    return CM.rendreJsPdf(window.jspdf.jsPDF, plan, { fonds: FONDS, sig: sig });
  }
  function crNomFichier(b) { return ({ eq: 'Equifax', tu: 'TransUnion' }[b] || 'dossier-credit') + '-' + CM.nomBase(rv('cr_nom'), 'demande') + '.pdf'; }
  function crTelecharger(b) {
    if (!window.jspdf) { crMessage('PDF : jsPDF not loaded'); return; }
    crDessiner(b).save(crNomFichier(b));
    crMessage(L('Votre formulaire est téléchargé. Relisez-le, imprimez-le et signez-le avant de l’envoyer.', 'Your form has been downloaded. Review it, print it and sign it before mailing it.'), true);
  }
  function crVoir(b) {
    if (!window.jspdf) return;
    var url = crDessiner(b).output('bloburl'); var w = window.open(url, '_blank'); if (!w) window.location.href = url;
  }

  /* ---- documents à joindre, adresses, récapitulatif */
  function crDocs(b) { return docsUi(CM.documentsDe('credit', etat.v, { ui: etat.ui, cr: etat.cr, bureau: b })); }
  function crDest(b) { return CR_BUREAUX[b].dest[etat.ui === 'fr' ? 'fr' : 'en']; }
  function crAdresseHtml(b) { var a = crDest(b); return '<address class="ml-adresse-envoi"><strong>' + esc(a.nom) + '</strong><br>' + esc(a.ligne) + '<br>' + esc(a.ville + ' ' + provRc(a.prov).ab + ' ' + a.cp) + '</address>'; }
  function crBureauxChoisis() { var l = []; if (crEq()) l.push('eq'); if (crTu()) l.push('tu'); return l; }
  function crNomForme(f) { return { acc: L('Equifax, mise à jour d’un compte', 'Equifax, account dispute'), pi: L('Equifax, renseignements personnels', 'Equifax, personal information'), tu: L('TransUnion, demande d’enquête', 'TransUnion, investigation request') }[f]; }
  function crEtapeRecap() {
    var bs = crBureauxChoisis(), h = '<h3>' + esc(L('Vos formulaires sont prêts', 'Your forms are ready')) + '</h3><p class="ml-aide">' + esc(L('Relisez vos réponses, téléchargez les formulaires, puis envoyez chacun au bon bureau avec les documents demandés.', 'Review your answers, download the forms, then mail each one to the right bureau with the requested documents.')) + '</p>';
    h += '<div class="ml-rec">' + ligneRecap(L('Nom', 'Name'), (rv('cr_prenom') + ' ' + rv('cr_nom')).trim()) + ligneRecap(L('Date de naissance', 'Date of birth'), dateLisible(rv('cr_naiss'))) +
      ligneRecap(L('Adresse actuelle', 'Current address'), [[rv('cr_a_no'), rv('cr_a_rue')].join(' ').trim(), rv('cr_a_app'), rv('cr_a_ville'), rv('cr_a_prov'), cpNormal(rv('cr_a_cp'))].filter(Boolean).join(', '));
    if (crComptes()) for (var i = 1; i <= crNb(); i++) h += ligneRecap(L('Compte ', 'Account ') + i, rv('cr_c' + i + '_cred') + ' (' + ((CR_MOTIFS.filter(function (m) { return m[0] === rv('cr_c' + i + '_motif'); })[0] || [])[etat.ui === 'fr' ? 1 : 2] || '') + ')');
    if (crPerso()) h += ligneRecap(L('À corriger', 'To correct'), rv('cr_s_detail'));
    h += '</div><div class="ml-actions ml-rec-modif">' + ['quoi', 'vous', 'adresse', 'comptes', 'perso', 'decl', 'signature'].filter(function (e) { return crActives().indexOf(CR_ETAPES.indexOf(e)) !== -1; }).map(function (e) { return '<button type="button" class="ml-lien" data-craller="' + CR_ETAPES.indexOf(e) + '">' + esc(L('Modifier : ', 'Edit: ') + crTitreEtape(e)) + '</button>'; }).join('') + '</div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('1. Téléchargez et vérifiez les formulaires', '1. Download and check the forms')) + '</h4><p class="ml-aide">' + esc(L('Chaque PDF reprend le formulaire officiel du bureau avec vos réponses. Imprimez-le et signez-le (à moins d’avoir ajouté votre signature), puis faites-en une copie pour vos dossiers.', 'Each PDF is the bureau’s official form with your answers. Print it and sign it (unless you added your signature), then keep a copy for your records.')) + '</p>';
    bs.forEach(function (b) {
      h += '<p class="ml-sous-titre">' + esc(CR_BUREAUX[b].nom + ' · ' + crNbPagesBureau(b) + L(' page(s)', ' page(s)')) + '</p><p class="ml-aide">' + esc(crFormsDe(b).map(crNomForme).join(' ; ') + (crDeclPage() ? L(' ; déclaration du consommateur', ' ; consumer statement') : '')) + '</p>' +
        '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-crtelecharger="' + b + '">⤓ ' + esc(L('Télécharger (PDF)', 'Download (PDF)')) + '</button><button type="button" class="ml-btn" data-crvoir="' + b + '">' + esc(L('Voir le PDF', 'View the PDF')) + '</button></div>';
    });
    h += '<p class="ml-message" id="ml-cr-message"></p></div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('2. Documents à joindre', '2. Documents to attach')) + '</h4>';
    bs.forEach(function (b) {
      h += '<p class="ml-sous-titre">' + esc(CR_BUREAUX[b].nom) + '</p><ul class="ml-liste-docs">' + crDocs(b).filter(function (d) { return d.id !== 'autres'; }).map(function (d) { return '<li><strong>' + esc(d.titre) + '</strong><span>' + esc(d.aide) + '</span></li>'; }).join('') + '</ul>';
    });
    h += '<p class="ml-aide">' + esc(L('Envoyez des copies, jamais vos originaux. Si vous joignez un relevé ou une carte, masquez le code de sécurité (CVV).', 'Send copies, never your originals. If you attach a statement or a card, black out the security code (CVV).')) + '</p></div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('3. Où l’envoyer', '3. Where to mail it')) + '</h4>';
    bs.forEach(function (b) { h += '<p class="ml-sous-titre">' + esc(CR_BUREAUX[b].nom) + '</p>' + crAdresseHtml(b); });
    h += '<p class="ml-aide">' + esc(L('Vérifiez toujours l’adresse sur la page officielle avant l’envoi. La voie la plus rapide est souvent le dépôt en ligne chez le bureau.', 'Always check the address on the official page before mailing. The fastest way is often to file online with the bureau.')) + '</p><p class="ml-liens-gouv">' +
      (crEq() ? aCr('eq', L('Equifax : contester en ligne ou par la poste', 'Equifax: dispute online or by mail')) + ' · ' + (crComptes() ? aCr('eqacc', L('Formulaire Equifax (comptes)', 'Equifax form (accounts)')) + ' · ' : '') + (crPerso() ? aCr('eqpi', L('Formulaire Equifax (renseignements personnels)', 'Equifax form (personal information)')) + ' · ' : '') : '') +
      (crTu() ? aCr('tu', L('TransUnion : contester', 'TransUnion: dispute')) + ' · ' + aCr('tuform', L('Formulaire TransUnion', 'TransUnion form')) + ' · ' : '') + aCr('fcac', L('Erreurs dans votre dossier de crédit (ACFC)', 'Errors in your credit report (FCAC)')) + '</p></div>';
    h += '<div class="ml-carte-in"><h4>' + esc(L('4. Après l’envoi', '4. After you send it')) + '</h4><ul class="ml-liste-docs">' +
      '<li><strong>' + esc(L('Le bureau vérifie auprès du prêteur', 'The bureau checks with the lender')) + '</strong><span>' + esc(L('Il vous écrit ensuite le résultat. Évitez de faire de nouvelles demandes de crédit pendant ce temps.', 'It then writes to you with the result. Avoid new credit applications in the meantime.')) + '</span></li>' +
      '<li><strong>' + esc(L('Si l’erreur n’est pas corrigée', 'If the error is not corrected')) + '</strong><span>' + esc(L('Parlez d’abord au prêteur, qui doit corriger sa propre information. Demandez ensuite au bureau qu’un échelon supérieur révise le dossier. En dernier recours, déposez une plainte auprès de l’office de protection du consommateur de votre province.', 'First talk to the lender, who must correct its own information. Then ask the bureau for a higher-level review. As a last resort, file a complaint with your province’s consumer protection office.')) + '</span></li>' +
      '<li><strong>' + esc(L('Vous gardez toujours le dernier mot', 'You always get the last word')) + '</strong><span>' + esc(L('Si le désaccord persiste, vous pouvez ajouter une déclaration du consommateur à votre dossier. C’est gratuit.', 'If the disagreement remains, you can add a consumer statement to your file. It is free.')) + '</span></li></ul></div>';
    h += '<div class="ml-carte-in ml-poste-offre"><h4>' + esc(L('Pas d’imprimante ? On l’envoie pour vous.', 'No printer? We will mail it for you.')) + '</h4><p class="ml-aide">' + esc(L('Téléversez vos documents (photos ou PDF). Capycom imprime le formulaire et vos documents, les met sous enveloppe et les poste au bureau. Un envoi par bureau : vous vérifiez tout et payez avant le départ.', 'Upload your documents (photos or PDF). Capycom prints the form and your documents, puts them in an envelope and mails them to the bureau. One mailing per bureau: you check everything and pay before it leaves.')) + '</p>' +
      '<div class="ml-actions">' + bs.map(function (b, i) { return '<button type="button" class="ml-btn' + (i === 0 ? ' ml-btn-plein' : '') + '" data-crposte="' + b + '">' + esc(L('Envoyer à ' + CR_BUREAUX[b].nom + ' avec Capycom', 'Mail to ' + CR_BUREAUX[b].nom + ' with Capycom')) + ' →</button>'; }).join('') + '</div></div>';
    return h;
  }

  /* ---- envoi par la poste */
  function crFeuilles() {
    var c = etat.cr, n = c.poste ? crNbPagesBureau(c.poste) : 0;
    Object.keys(c.docs).forEach(function (k) { (c.docs[k] || []).forEach(function (f) { n += f.pages; }); });
    return n;
  }
  function crPosteManques() {
    var c = etat.cr, m = [];
    if (!c.poste) { m.push('bureau'); return m; }
    if (!signatureImage()) m.push('signature');
    crDocs(c.poste).forEach(function (d) { if (d.req && !(c.docs[d.id] || []).length) m.push(d.id); });
    if (c.occupe) m.push('occupe');
    return m;
  }
  function crPosteHtml() {
    var c = etat.cr, b = c.poste, n = crFeuilles(), m = crPosteManques(), docs = b ? crDocs(b) : [];
    var h = '<button type="button" class="ml-lien ml-retour" data-crretour="1">← ' + esc(L('Retour au récapitulatif', 'Back to the summary')) + '</button>' +
      '<h3>' + esc(L('On l’envoie pour vous : ' + CR_BUREAUX[b].nom, 'We mail it for you: ' + CR_BUREAUX[b].nom)) + '</h3><p class="ml-aide">' + esc(L('Ajoutez les documents demandés. Capycom assemble le tout, l’imprime en noir et blanc, le met sous enveloppe, affranchit et le poste. Vous vérifiez tout et payez à l’étape suivante.', 'Add the requested documents. Capycom assembles everything, prints it in black and white, puts it in an envelope, stamps it and mails it. You check everything and pay on the next step.')) + '</p>' +
      '<div class="ml-carte-in"><h4>' + esc(L('Destinataire', 'Recipient')) + '</h4>' + crAdresseHtml(b) + '</div>';
    var okf = m.indexOf('signature') === -1;
    h += '<div class="ml-slot' + (okf ? ' ok' : ' manque') + '" data-slot="forms"><div class="ml-slot-t"><span class="ml-pastille" aria-hidden="true">' + (okf ? '✓' : '') + '</span><strong>' + esc(L('Formulaires remplis avec vos réponses (' + crNbPagesBureau(b) + ' pages)', 'Forms filled in with your answers (' + crNbPagesBureau(b) + ' pages)')) + '</strong></div>' +
      '<p class="ml-aide">' + esc(crFormsDe(b).map(crNomForme).join(' ; ') + (crDeclPage() ? L(' ; déclaration du consommateur', ' ; consumer statement') : '')) + '</p>';
    if (!okf) h += '<div class="ml-avert">' + esc(L('Les formulaires ne sont pas signés. Pour que Capycom les imprime et les poste, ajoutez votre signature : ', 'The forms are not signed. For Capycom to print and mail them, add your signature: ')) + '<button type="button" class="ml-lien" data-craller="' + CR_ETAPES.indexOf('signature') + '">' + esc(L('Ajouter ma signature', 'Add my signature')) + '</button></div>';
    h += '<div class="ml-actions"><button type="button" class="ml-btn" data-crvoir="' + b + '">' + esc(L('Voir les formulaires', 'View the forms')) + '</button></div></div>';
    docs.forEach(function (d) { h += slotHtml(d); });
    if (c.erreurFichier) h += '<p class="ml-message" style="display:block">' + esc(c.erreurFichier) + '</p>';
    if (c.occupe) h += '<p class="ml-aide">' + esc(L('Lecture des fichiers…', 'Reading files…')) + '</p>';
    var prixTxt = n < 1 ? '' : c.prixEnCours ? L('Calcul du prix…', 'Calculating the price…') : (c.prix && !c.prix.erreur ? L('Prix estimé : ', 'Estimated price: ') + argent(c.prix.total) : L('Le prix exact s’affiche au récapitulatif.', 'The exact price is shown on the summary page.'));
    h += '<div class="ml-prix"><div><span class="ml-prix-l">' + esc(L('Feuilles à imprimer', 'Sheets to print')) + '</span><strong>' + n + '</strong></div><div class="ml-prix-d"><strong>' + esc(prixTxt) + '</strong><span>' + esc(L('Impression noir et blanc, enveloppe et timbre compris. Le prix final est confirmé au récapitulatif.', 'Black and white printing, envelope and stamp included. The final price is confirmed on the summary page.')) + '</span></div></div>';
    h += '<div class="ml-actions"><button type="button" class="ml-btn ml-btn-plein" data-rccontinuer="1"' + (m.length ? ' aria-disabled="true"' : '') + '>' + esc(L('Continuer vers le récapitulatif et le paiement', 'Continue to the summary and payment')) + ' →</button></div>' +
      '<p class="ml-message" id="ml-rc-message2"></p><p class="ml-note">' + esc(L('Vous n’avez pas besoin de compte pour commencer : vous vous connectez juste avant le paiement. Vos documents sont envoyés à Capycom seulement quand vous cliquez sur « Continuer ».', 'You do not need an account to start: you sign in just before payment. Your documents are sent to Capycom only when you click “Continue”.')) + '</p>';
    return h;
  }
  function crEnvoyer(idCourrier) {
    if (etat.envoiEnCours) return;
    if (!rcPretPoste()) { console.log('CAPYCOM credit : dossier incomplet, brouillon ' + idCourrier + ' laissé vide'); return; }
    var c = etat.cr, b = c.poste, dest = crDest(b);
    etat.envoiEnCours = true;
    var ov = document.getElementById('capy-ml-overlay');
    function ecran(txt) { if (ov) { ov.textContent = txt; ov.style.display = 'flex'; } }
    ecran(L('Préparation de votre dossier…', 'Preparing your file…'));
    var RACINE = apiBase();
    function post(wf, corps) {
      return fetch(RACINE + wf, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
        .then(function (x) { return x.json().then(function (j) { console.log('CAPYCOM ' + wf, x.status); if (!x.ok) throw new Error(wf + ' ' + x.status); return j; }); });
    }
    var provExp = provRc(rv('cr_a_prov')), provExpBubble = provExp && provExp.ab && ['NU', 'NT', 'YT'].indexOf(provExp.ab) === -1 ? provExp.fr : 'Ontario';
    var nomExp = (rv('cr_prenom') + ' ' + rv('cr_nom')).trim(), ligneExp = (rv('cr_a_app') ? rv('cr_a_app') + '-' : '') + [rv('cr_a_no'), rv('cr_a_rue')].join(' ').trim();
    var adresses = {
      id_courrier: idCourrier, dest_nom: dest.nom, dest_ligne: dest.ligne, dest_ville: dest.ville, dest_province: dest.prov, dest_code_postal: dest.cp,
      exp_nom: nomExp, exp_ligne: ligneExp, exp_ville: rv('cr_a_ville'), exp_province: provExpBubble, exp_code_postal: cpNormal(rv('cr_a_cp')),
      dest_texte: [dest.nom, dest.ligne, dest.ville, provRc(dest.prov).en, dest.cp, 'Canada'].join('\n'),
      exp_texte: [nomExp, ligneExp, rv('cr_a_ville'), provExp ? provExp.en : '', cpNormal(rv('cr_a_cp')), 'Canada'].join('\n')
    };
    rcAssembler().then(function (pages) {
      var i = 0;
      function suivante() {
        if (i >= pages.length) return Promise.resolve();
        var n = i + 1, b64 = pages[i]; i++;
        ecran(L('Envoi de la feuille ' + n + ' sur ' + pages.length + '…', 'Sending sheet ' + n + ' of ' + pages.length + '…'));
        return post('creer_page_vide', { id_courrier: idCourrier }).then(function (d1) {
          var idPage = d1.response && d1.response.id_page; if (!idPage) throw new Error('id_page');
          return post('generer_pdf', { contenu_base64: { filename: 'dossier-credit-' + n + '.pdf', contents: b64, private: true, attach_to: idPage }, id_page_cible: idPage });
        }).then(suivante);
      }
      return suivante();
    }).then(function () { ecran(L('Dernières vérifications…', 'Final checks…')); return post('completer_courrier_modele', adresses); })
      .then(function () { window.location.href = window.location.origin + (window.location.pathname.indexOf('/version-test') === 0 ? '/version-test' : '') + '/5-summary/' + idCourrier; })
      .catch(function (err) {
        console.log('CAPYCOM erreur envoi credit', err && err.message);
        etat.envoiEnCours = false;
        ecran(L('Un problème est survenu pendant la préparation. Vous allez être redirigé vers votre courrier pour le vérifier.', 'Something went wrong while preparing your file. You will be taken to your mail to check it.'));
        setTimeout(function () { window.location.href = window.location.origin + (window.location.pathname.indexOf('/version-test') === 0 ? '/version-test' : '') + '/1-mail/' + idCourrier; }, 3500);
      });
  }

  /* ---- rendu de l’assistant de contestation de crédit */
  function crProgression() {
    var act = crActives().filter(function (i) { return CR_ETAPES[i] !== 'intro' && CR_ETAPES[i] !== 'recap'; }), pos = act.indexOf(etat.cr.etape), total = act.length;
    if (pos < 0) return '';
    var n = pos + 1;
    return '<div class="ml-prog" role="group" aria-label="' + esc(L('Progression', 'Progress')) + '"><div class="ml-prog-t">' + esc(L('Étape ', 'Step ') + n + L(' sur ', ' of ') + total + ' · ' + crTitreEtape(CR_ETAPES[etat.cr.etape])) + '</div><div class="ml-prog-b"><span style="width:' + Math.round(n / total * 100) + '%"></span></div></div>';
  }
  function crCorps(e) { return { intro: crEtapeIntro, quoi: crEtapeQuoi, vous: crEtapeVous, adresse: crEtapeAdresse, comptes: crEtapeComptes, perso: crEtapePerso, decl: crEtapeDecl, signature: crEtapeSignature, recap: crEtapeRecap }[e](); }
  function crNav(e) {
    if (e === 'intro') return '';
    if (e === 'recap') return '<div class="ml-nav"><button type="button" class="ml-btn" data-crprec="1">← ' + esc(L('Précédent', 'Previous')) + '</button></div>';
    return '<p class="ml-message" id="ml-cr-message"></p><div class="ml-nav"><button type="button" class="ml-btn" data-crprec="1">← ' + esc(L('Précédent', 'Previous')) + '</button>' +
      '<button type="button" class="ml-btn ml-btn-plein" data-crsuivant="1">' + esc(e === 'signature' ? L('Voir le récapitulatif', 'See the summary') : L('Suivant', 'Next')) + ' →</button></div>';
  }
  function crRendre() {
    var c = etat.cr, h = '<div class="ml-carte ml-rc"><div class="ml-rc-tete"><span class="ml-badge">' + esc(L('Outil gratuit', 'Free tool')) + '</span></div>';
    if (c.stade === 'poste') h += crPosteHtml();
    else { var e = CR_ETAPES[c.etape]; h += crProgression() + '<div class="ml-rc-corps">' + crCorps(e) + '</div>' + crNav(e); }
    h += '</div><p class="ml-note">' + esc(L('Les formulaires générés reprennent les formulaires officiels d’Equifax (en anglais) et de TransUnion (en français), remplis avec vos réponses. Capycom n’est affilié ni à Equifax ni à TransUnion, et ne garantit pas le résultat de votre contestation. Vos réponses restent dans votre navigateur.', 'The generated forms reproduce the official forms of Equifax (in English) and TransUnion (in French), filled in with your answers. Capycom is not affiliated with Equifax or TransUnion and does not guarantee the outcome of your dispute. Your answers stay in your browser.')) + '</p>';
    return h;
  }
  function crClic(b) {
    var c = etat.cr, a;
    if (b.getAttribute('data-crsuivant')) { crSuivant(); return true; }
    if (b.getAttribute('data-crprec')) { crAller(crPrec()); return true; }
    if ((a = b.getAttribute('data-craller')) !== null) { crAller(parseInt(a, 10)); return true; }
    if ((a = b.getAttribute('data-crnb'))) { c.nb = Math.max(1, Math.min(crMaxComptes(), crNb() + parseInt(a, 10))); rendre(); return true; }
    if ((a = b.getAttribute('data-crtelecharger'))) { crTelecharger(a); return true; }
    if ((a = b.getAttribute('data-crvoir'))) { crVoir(a); return true; }
    if ((a = b.getAttribute('data-crposte'))) { c.poste = a; c.stade = 'poste'; c.erreurFichier = ''; c.prix = null; rendre(); rcMajPrix(); return true; }
    if (b.getAttribute('data-crretour')) { c.stade = 'quest'; c.etape = CR_ETAPES.length - 1; rendre(); return true; }
    return false;
  }

  /* ------------------------------------------------------------ montage */
  function monter() {
    var zone = document.getElementById('capy-lettres-zone');
    if (!zone) return false;
    if (document.getElementById('capy-ml')) return true;
    racine = document.createElement('div'); racine.id = 'capy-ml';
    zone.appendChild(racine);
    if (!document.getElementById('capy-ml-overlay')) { var ov = document.createElement('div'); ov.id = 'capy-ml-overlay'; document.body.appendChild(ov); }
    etat.ui = langueUi();
    var h1o = document.getElementById('capy-titre-page'), mdo = document.querySelector('meta[name="description"]');
    var rt = routeDepuisUrl();
    if (rt.vue === 'sections') etat.seo0 = { l: etat.ui, titre: document.title, h1: h1o ? h1o.textContent : '', desc: mdo ? mdo.getAttribute('content') : '' };
    etat.vue = rt.vue;
    if (rt.vue === 'modele') { etat.modele = rt.id; etat.section = sectionDe(rt.id); if (rt.l !== etat.ui) etat.lettre = rt.l; }
    else if (rt.vue === 'section') etat.section = rt.id;
    rendre(); brancher(); boutonFlottant(); if (rt.vue !== 'sections') majUrl(false);
    window.addEventListener('popstate', surRetour);
    setInterval(function () {
      var l = langueUi();
      if (l !== etat.ui) { etat.ui = l; rendre(); majUrl(false); }
      boutonFlottant(); majInterfaceBubble();
      if (!document.getElementById('capy-ml') && document.getElementById('capy-lettres-zone')) { document.getElementById('capy-lettres-zone').appendChild(racine); }
    }, 500);
    return true;
  }
  window.capyLettre = { crDessiner: crDessiner, crPosteManques: crPosteManques, crManques: crManques, crVal: crVal, envoyer: envoyer, valider: valider, etat: etat, composer: composer, rcDessiner: rcDessiner, rcDocs: rcDocs, rcPosteManques: rcPosteManques };
  var essais = 0;
  (function attendre() { if (monter()) return; if (++essais < 120) setTimeout(attendre, 250); else console.log('CAPYCOM modele : zone capy-lettres-zone introuvable'); })();
})();

