/* Capycom : moteur des modèles de lettres et de formulaires officiels.
 *
 * Module pur : aucun accès au DOM, au réseau ni au système de fichiers. Il tourne tel quel dans le navigateur
 * (page modeles-lettres de Bubble) et dans Node (serveur MCP, tests). Source unique : dépôt « 11-Capycom MCP », dossier modeles/.
 *
 * Principe : à partir des réponses de l'utilisateur, le moteur produit un PLAN DE DESSIN neutre
 * { unit, pages: [ { ops: [ ... ] } ] }. Deux petits adaptateurs transforment ce plan en PDF :
 *   - rendreJsPdf(jsPDF, plan, contexte)  : navigateur (jsPDF 2.5.1) ;
 *   - rendrePdfLib(PDFLib, plan, contexte): Node ou navigateur (pdf-lib 1.17.1), asynchrone.
 * Le texte est mesuré avec les tables de largeurs de jsPDF (Helvetica, Times), donc les retours à la ligne et les
 * réductions de police sont identiques partout.
 *
 * Opérations d'un plan (origine en haut à gauche, y = ligne de base du texte, unités de plan.unit : 'mm' ou 'pt') :
 *   { t:'text', s, x, y, fs, f:'helvetica'|'times', st:'normal'|'bold'|'italic', c:[r,g,b], a?:'center' }
 *   { t:'line', x1, y1, x2, y2, lw, c:[r,g,b] }
 *   { t:'img',  id, x, y, w, h }   id = identifiant d'un fond de formulaire (ex. 'rc66:0') ou 'sig' (la signature)
 *
 * Aucune donnée de client dans ce dépôt : seuls les modèles, les positions de champs et les fonds de formulaires publics.
 */
(function (racine, fabrique) {
  var m = fabrique();
  if (typeof module === 'object' && module && module.exports) module.exports = m;
  else racine.CapyModeles = m;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* ------------------------------------------------------------ mesure du texte (tables de jsPDF) */
  var MET = {"hn":{"w0":53,"w":{"32":28,"33":28,"34":35,"35":55,"36":55,"37":89,"38":66,"39":19,"40":33,"41":33,"42":39,"43":58,"44":28,"45":33,"46":28,"47":28,"48":55,"49":55,"50":55,"51":55,"52":55,"53":55,"54":55,"55":55,"56":55,"57":55,"58":28,"59":28,"60":58,"61":58,"62":58,"63":55,"64":101,"65":66,"66":66,"67":72,"68":72,"69":66,"70":61,"71":78,"72":72,"73":28,"74":50,"75":66,"76":55,"77":83,"78":72,"79":78,"80":66,"81":78,"82":72,"83":66,"84":61,"85":72,"86":66,"87":94,"88":66,"89":66,"90":61,"91":28,"92":28,"93":28,"94":47,"95":55,"96":33,"97":55,"98":55,"99":50,"100":55,"101":55,"102":28,"103":55,"104":55,"105":22,"106":22,"107":50,"108":22,"109":83,"110":55,"111":55,"112":55,"113":55,"114":33,"115":50,"116":28,"117":55,"118":50,"119":72,"120":50,"121":50,"122":50,"123":33,"124":26,"125":33,"126":58,"161":33,"162":55,"163":55,"164":55,"165":55,"167":55,"168":33,"169":73,"170":37,"171":55,"172":58,"174":73,"175":33,"176":40,"177":58,"180":33,"181":55,"183":28,"184":33,"186":36,"187":55,"191":61,"192":66,"193":66,"194":66,"195":66,"196":66,"197":66,"198":100,"199":72,"200":66,"201":66,"202":66,"203":66,"204":28,"205":28,"206":28,"207":28,"209":72,"210":78,"211":78,"212":78,"213":78,"214":78,"216":78,"217":72,"218":72,"219":72,"220":72,"223":61,"224":55,"225":55,"226":55,"227":55,"228":55,"229":55,"230":89,"231":50,"232":55,"233":55,"234":55,"235":55,"236":28,"237":28,"238":28,"239":28,"241":55,"242":55,"243":55,"244":55,"245":55,"246":55,"247":58,"248":61,"249":55,"250":55,"251":55,"252":55,"255":50},"k":{"44":{"70":15,"80":18,"84":12,"86":13,"87":8,"89":14,"118":8,"121":10,"248":10,"255":10},"45":{"84":14,"86":8,"89":14},"46":{"70":15,"80":18,"84":12,"86":13,"87":8,"89":14,"118":8,"121":10,"248":10,"255":10},"65":{"70":8,"80":12,"84":12,"86":8,"89":11},"79":{"89":9},"84":{"65":12,"76":11,"192":12,"193":12,"194":12,"195":12,"196":12,"197":12},"86":{"76":11},"89":{"32":9,"65":10,"68":9,"76":14,"192":10,"193":10,"194":10,"195":10,"196":10,"197":10},"97":{"84":12,"89":14},"101":{"84":12,"86":8,"89":14},"111":{"84":12,"86":8,"89":14},"114":{"84":12},"117":{"84":12,"89":11},"119":{"84":12},"120":{"248":9},"121":{"84":12},"192":{"70":8,"80":12,"84":12,"86":8,"89":11},"193":{"70":8,"80":12,"84":12,"86":8,"89":11},"194":{"70":8,"80":12,"84":12,"86":8,"89":11},"195":{"70":8,"80":12,"84":12,"86":8,"89":11},"196":{"70":8,"80":12,"84":12,"86":8,"89":11},"197":{"70":8,"80":12,"84":12,"86":8,"89":11},"210":{"89":9},"211":{"89":9},"212":{"89":9},"213":{"89":9},"214":{"89":9},"216":{"89":9},"224":{"84":12,"89":14},"225":{"84":12,"89":14},"226":{"84":12,"89":14},"227":{"89":14},"228":{"84":12,"89":14},"229":{"84":12,"89":14},"232":{"86":8,"89":14},"233":{"84":12,"86":8,"89":14},"234":{"84":12,"86":8,"89":14},"235":{"84":12,"86":8,"89":14},"242":{"84":12,"86":8,"89":14},"243":{"84":12,"86":8,"89":14},"244":{"84":12,"86":8,"89":14},"245":{"86":8,"89":14},"246":{"84":12,"86":8,"89":14},"248":{"84":12,"86":8,"89":14},"249":{"84":12,"89":11},"250":{"84":12,"89":11},"251":{"84":12,"89":11},"252":{"84":12,"89":11}}},"hb":{"w0":56,"w":{"32":28,"33":33,"34":47,"35":55,"36":55,"37":89,"38":72,"39":24,"40":33,"41":33,"42":39,"43":58,"44":28,"45":33,"46":28,"47":28,"48":55,"49":55,"50":55,"51":55,"52":55,"53":55,"54":55,"55":55,"56":55,"57":55,"58":33,"59":33,"60":58,"61":58,"62":58,"63":61,"64":97,"65":72,"66":72,"67":72,"68":72,"69":66,"70":61,"71":78,"72":72,"73":28,"74":55,"75":72,"76":61,"77":83,"78":72,"79":78,"80":66,"81":78,"82":72,"83":66,"84":61,"85":72,"86":66,"87":94,"88":66,"89":66,"90":61,"91":33,"92":28,"93":33,"94":58,"95":55,"96":33,"97":55,"98":61,"99":55,"100":61,"101":55,"102":33,"103":61,"104":61,"105":28,"106":28,"107":55,"108":28,"109":89,"110":61,"111":61,"112":61,"113":61,"114":39,"115":55,"116":33,"117":61,"118":55,"119":78,"120":55,"121":55,"122":50,"123":39,"124":28,"125":39,"126":58,"161":33,"162":55,"163":55,"164":55,"165":55,"167":55,"168":33,"169":73,"170":37,"171":55,"172":58,"174":73,"175":33,"176":40,"177":58,"180":33,"181":61,"182":55,"183":28,"184":33,"186":36,"187":55,"191":61,"192":72,"193":72,"194":72,"195":72,"196":72,"197":72,"198":100,"199":72,"200":66,"201":66,"202":66,"203":66,"204":28,"205":28,"206":28,"207":28,"209":72,"210":78,"211":78,"212":78,"213":78,"214":78,"216":78,"217":72,"218":72,"219":72,"220":72,"223":61,"224":55,"225":55,"226":55,"227":55,"228":55,"229":55,"230":89,"231":55,"232":55,"233":55,"234":55,"235":55,"236":28,"237":28,"238":28,"239":28,"241":61,"242":61,"243":61,"244":61,"245":61,"246":61,"247":58,"248":61,"249":61,"250":61,"251":61,"252":61,"255":55},"k":{"44":{"70":10,"80":12,"84":8,"86":12,"87":8,"89":10,"118":8,"121":8,"255":8},"45":{"84":12,"86":8},"46":{"70":10,"80":12,"84":8,"86":12,"87":8,"89":10,"118":8,"121":8,"255":8},"65":{"70":8,"80":10,"84":9,"86":8,"89":11},"84":{"32":10,"65":9,"76":9,"192":9,"193":9,"194":9,"195":9,"196":9,"197":9},"86":{"32":8,"65":8,"76":11,"192":8,"193":8,"194":8,"195":8,"196":8,"197":8},"87":{"32":8,"76":8},"89":{"32":12,"65":11,"76":12,"192":11,"193":11,"194":11,"195":11,"196":11,"197":11},"97":{"84":8,"89":9},"101":{"89":8},"111":{"84":8,"86":9,"89":10},"114":{"84":8},"117":{"84":9,"89":10},"192":{"70":8,"80":10,"84":9,"86":8,"89":11},"193":{"70":8,"80":10,"84":9,"86":8,"89":11},"194":{"70":8,"80":10,"84":9,"86":8,"89":11},"195":{"70":8,"80":10,"84":9,"86":8,"89":11},"196":{"70":8,"80":10,"84":9,"86":8,"89":11},"197":{"70":8,"80":10,"84":9,"86":8,"89":11},"224":{"84":8,"89":9},"225":{"84":8,"89":9},"226":{"84":8,"89":9},"227":{"84":8,"89":9},"228":{"84":8,"89":9},"229":{"84":8,"89":9},"232":{"89":8},"233":{"89":8},"234":{"89":8},"235":{"89":8},"242":{"84":8,"86":9,"89":10},"243":{"84":8,"86":9,"89":10},"244":{"84":8,"86":9,"89":10},"245":{"84":8,"86":9,"89":10},"246":{"84":8,"86":9,"89":10},"248":{"84":8,"86":9,"89":10},"249":{"84":9,"89":10},"250":{"84":9,"89":10},"251":{"84":9,"89":10},"252":{"84":9,"89":10}}},"tb":{"w0":54,"w":{"32":25,"33":33,"34":55,"35":50,"36":50,"37":100,"38":83,"39":28,"40":33,"41":33,"42":50,"43":57,"44":25,"45":33,"46":25,"47":28,"48":50,"49":50,"50":50,"51":50,"52":50,"53":50,"54":50,"55":50,"56":50,"57":50,"58":33,"59":33,"60":57,"61":57,"62":57,"63":50,"64":93,"65":72,"66":66,"67":72,"68":72,"69":66,"70":61,"71":78,"72":78,"73":39,"74":50,"75":78,"76":66,"77":94,"78":72,"79":78,"80":61,"81":78,"82":72,"83":55,"84":66,"85":72,"86":72,"87":100,"88":72,"89":72,"90":66,"91":33,"92":28,"93":33,"94":58,"95":50,"96":33,"97":50,"98":55,"99":44,"100":55,"101":44,"102":33,"103":50,"104":55,"105":28,"106":33,"107":55,"108":28,"109":83,"110":55,"111":50,"112":55,"113":55,"114":44,"115":39,"116":33,"117":55,"118":50,"119":72,"120":50,"121":50,"122":44,"123":39,"124":22,"125":39,"126":52,"161":33,"162":50,"163":50,"164":50,"165":50,"167":50,"168":33,"169":74,"170":30,"171":50,"172":57,"174":74,"175":33,"176":40,"177":57,"180":33,"181":55,"183":25,"184":33,"186":33,"187":50,"191":50,"192":72,"193":72,"194":72,"195":72,"196":72,"197":72,"198":100,"199":72,"200":66,"201":66,"202":66,"203":66,"204":39,"205":39,"206":39,"207":39,"209":72,"210":78,"211":78,"212":78,"213":78,"214":78,"216":78,"217":72,"218":72,"219":72,"220":72,"223":55,"224":50,"225":50,"226":50,"227":50,"228":50,"229":50,"230":72,"231":44,"232":44,"233":44,"234":44,"235":44,"236":28,"237":28,"238":28,"239":28,"241":55,"242":50,"243":50,"244":50,"245":50,"246":50,"247":57,"248":50,"249":55,"250":55,"251":55,"252":55,"255":50},"k":{"44":{"70":10,"80":10,"84":8,"86":13,"87":10,"89":10,"114":10},"45":{"84":10,"86":8,"89":10},"46":{"70":11,"80":11,"84":9,"86":15,"87":10,"89":10,"114":10},"58":{"84":8,"86":10,"89":10},"59":{"84":8,"86":10,"89":10},"65":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"84":{"65":10,"76":10,"192":10,"193":10,"194":10,"195":10,"196":10,"197":10},"86":{"65":15,"76":10,"192":15,"193":15,"194":15,"195":15,"196":15,"197":15},"87":{"65":13,"76":10,"192":13,"193":13,"194":13,"195":13,"196":13,"197":13},"89":{"65":10,"76":10,"192":10,"193":10,"194":10,"195":10,"196":10,"197":10},"97":{"84":10,"86":10,"89":9},"101":{"84":10,"86":10,"89":12},"111":{"84":10,"86":10,"87":8,"89":12},"114":{"84":8},"117":{"84":10,"86":10,"89":10},"118":{"65":10,"192":10,"193":10,"194":10,"195":10,"196":10,"197":10},"119":{"65":9,"84":8,"192":9,"193":9,"194":9,"195":9,"196":9,"197":9},"121":{"65":8,"192":8,"193":8,"194":8,"195":8,"196":8,"197":8},"192":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"193":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"194":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"195":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"196":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"197":{"70":9,"80":8,"84":9,"86":14,"87":12,"89":11},"224":{"86":10,"89":9},"225":{"84":10,"86":10,"89":9},"226":{"86":10,"89":9},"227":{"86":10,"89":9},"228":{"86":10,"89":9},"229":{"84":10,"86":10,"89":9},"232":{"86":10,"89":8},"233":{"84":10,"86":10,"89":12},"234":{"84":10,"86":10,"89":12},"235":{"86":10,"89":8},"242":{"84":10,"86":10,"87":8,"89":12},"243":{"84":10,"86":10,"87":8,"89":12},"244":{"84":10,"86":10,"87":8,"89":12},"245":{"84":10,"86":10,"87":8,"89":12},"246":{"84":10,"86":10,"87":8,"89":12},"248":{"84":10,"86":10,"87":8,"89":12},"249":{"84":10,"86":10,"89":10},"250":{"84":10,"86":10,"89":10},"251":{"84":10,"86":10,"89":10},"252":{"84":10,"86":10,"89":10},"255":{"65":8,"192":8,"193":8,"194":8,"195":8,"196":8,"197":8}}}};
  var K_MM = 72 / 25.4;
  function cleMetrique(f, st) { return f === 'times' ? (st === 'bold' ? 'tb' : 'tn') : (st === 'bold' ? 'hb' : 'hn'); }
  // Largeurs de chaque caractère en em, comme jsPDF (largeur arrondie au centième, crénage sur le caractère suivant)
  function largeursCar(s, f, st) {
    var M = MET[cleMetrique(f, st)] || MET.hn, out = [], prev = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i), w = M.w[c] || M.w0, kn = M.k[c] && M.k[c][prev] !== undefined ? M.k[c][prev] / -100 : 0;
      out.push(w / 100 + kn); prev = c;
    }
    return out;
  }
  function somme(a) { var t = 0; for (var i = 0; i < a.length; i++) t += a[i]; return t; }
  // Largeur d'un texte dans l'unité du plan ('pt' ou 'mm')
  function largeur(s, fs, f, st, unit) { return somme(largeursCar(String(s), f, st)) * fs / (unit === 'mm' ? K_MM : 1); }
  function coupeMot(mot, ws, premier, max) {
    var r = [], a = 0, n = mot.length, w = 0;
    while (a !== n && w + ws[a] < premier) { w += ws[a]; a++; }
    r.push(mot.slice(0, a));
    var deb = a; w = 0;
    while (a !== n) { if (w + ws[a] > max) { r.push(mot.slice(deb, a)); w = 0; deb = a; } w += ws[a]; a++; }
    if (deb !== a) r.push(mot.slice(deb, a));
    return r;
  }
  function coupeParagraphe(t, e, f, st) {
    var l = [], h = [l], fl = 0, d = 0, p = 0, mots = t.split(' '), esp = largeursCar(' ', f, st)[0];
    for (var i = 0; i < mots.length; i++) {
      var n = mots[i], ws = largeursCar(n, f, st);
      p = somme(ws);
      if (fl + d + p > e) {
        if (p > e) {
          var s = coupeMot(n, ws, e - (fl + d), e);
          l.push(s.shift()); l = [s.pop()];
          while (s.length) h.push([s.shift()]);
          p = somme(ws.slice(n.length - (l[0] ? l[0].length : 0)));
        } else l = [n];
        h.push(l); fl = p; d = esp;
      } else { l.push(n); fl += d + p; d = esp; }
    }
    return h.map(function (x) { return x.join(' '); });
  }
  // Équivalent de jsPDF.splitTextToSize : maxlen est dans l'unité du plan
  function couper(texte, maxlen, fs, f, st, unit) {
    var e = (unit === 'mm' ? K_MM : 1) * maxlen / fs, out = [], ps = String(texte).split(/\r?\n/);
    for (var i = 0; i < ps.length; i++) out = out.concat(coupeParagraphe(ps[i], e, f, st));
    return out;
  }

  /* ------------------------------------------------------------ utilitaires de texte et de dates */
  var MOIS = { fr: ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'],
               en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] };
  var PROVINCES = [
    { fr: 'Alberta', en: 'Alberta', ab: 'AB', osm: ['Alberta'] },
    { fr: 'Colombie-Britannique', en: 'British Columbia', ab: 'BC', osm: ['British Columbia', 'Colombie-Britannique'] },
    { fr: 'Île-du-Prince-Édouard', en: 'Prince Edward Island', ab: 'PE', osm: ['Prince Edward Island', 'Île-du-Prince-Édouard'] },
    { fr: 'Manitoba', en: 'Manitoba', ab: 'MB', osm: ['Manitoba'] },
    { fr: 'Nouveau-Brunswick', en: 'New Brunswick', ab: 'NB', osm: ['New Brunswick', 'Nouveau-Brunswick'] },
    { fr: 'Nouvelle-Écosse', en: 'Nova Scotia', ab: 'NS', osm: ['Nova Scotia', 'Nouvelle-Écosse'] },
    { fr: 'Ontario', en: 'Ontario', ab: 'ON', osm: ['Ontario'] },
    { fr: 'Québec', en: 'Quebec', ab: 'QC', osm: ['Québec', 'Quebec'] },
    { fr: 'Saskatchewan', en: 'Saskatchewan', ab: 'SK', osm: ['Saskatchewan'] },
    { fr: 'Terre-Neuve-et-Labrador', en: 'Newfoundland and Labrador', ab: 'NL', osm: ['Newfoundland and Labrador', 'Terre-Neuve-et-Labrador'] }
  ];
  var PROVINCES_RC = PROVINCES.concat([
    { fr: 'Nunavut', en: 'Nunavut', ab: 'NU', osm: ['Nunavut'] },
    { fr: 'Territoires du Nord-Ouest', en: 'Northwest Territories', ab: 'NT', osm: ['Northwest Territories', 'Territoires du Nord-Ouest'] },
    { fr: 'Yukon', en: 'Yukon', ab: 'YT', osm: ['Yukon'] }
  ]);
  function prov(fr) { for (var i = 0; i < PROVINCES_RC.length; i++) if (PROVINCES_RC[i].fr === fr || (fr && PROVINCES_RC[i].ab === fr)) return PROVINCES_RC[i]; return null; }
  function provRc(fr) { for (var i = 0; i < PROVINCES_RC.length; i++) if (PROVINCES_RC[i].fr === fr) return PROVINCES_RC[i]; return null; }
  function nettoyer(s) {
    return String(s || '').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...').replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/ /g, ' ');
  }
  function hexRgb(h) { h = String(h || '#111111').replace('#', ''); return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)]; }
  function dimSig(sig, maxW, maxH) {
    var r = sig.w / sig.h, w = maxW, h = w / r;
    if (h > maxH) { h = maxH; w = h * r; }
    return { w: w, h: h };
  }
  function aujourdhuiIso(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function dateTexte(iso, l) {
    if (!iso) return '';
    var p = iso.split('-'); if (p.length !== 3) return iso;
    var j = parseInt(p[2], 10), m = MOIS[l][parseInt(p[1], 10) - 1], a = p[0];
    if (!m) return iso;
    return l === 'fr' ? (j === 1 ? '1er' : j) + ' ' + m + ' ' + a : m + ' ' + j + ', ' + a;
  }
  function nombre(s) { var n = parseFloat(String(s || '').replace(/\s/g, '').replace(/\$/g, '').replace(',', '.')); return isNaN(n) ? null : n; }
  function montantTexte(s, l) {
    var n = nombre(s); if (n === null) return s;
    var e = n.toFixed(2);
    if (l === 'fr') { var parts = e.split('.'); return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + parts[1] + ' $'; }
    return '$' + e.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function cpNormal(s) { var c = String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); return c.length === 6 ? c.slice(0, 3) + ' ' + c.slice(3) : String(s || '').toUpperCase().trim(); }
  function cpValide(s) { return /^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z] ?\d[ABCEGHJ-NPRSTV-Z]\d$/.test(cpNormal(s)); }
  function phrase(s) { s = String(s || '').trim(); if (!s) return s; if (!/[.!?…]$/.test(s)) s += '.'; return s.charAt(0).toUpperCase() + s.slice(1); }
  function minus(s) { s = String(s || '').trim(); return s.charAt(0).toLowerCase() + s.slice(1); }
  function sansPoint(s) { return String(s || '').trim().replace(/[.\s]+$/, ''); }
  function chiffres(s) { return String(s || '').replace(/\D/g, ''); }
  function dateIso(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s || ''); }
  function mots(s) { return (String(s || '').trim().match(/\S+/g) || []).length; }
  // Lecteur de réponses : v[id] nettoyé des espaces (comme rv() de l'assistant)
  function lecteur(v) { return function (k) { return String(v[k] || '').trim(); }; }
  // Contrôle de date : ISO valide, entre 1900 et 2100, pas dans le futur sauf futurOk
  function dateOkFn(rv, today) { return function (id, futurOk) { var s = rv(id); if (!dateIso(s)) return false; var an = parseInt(s.slice(0, 4), 10); if (an < 1900 || an > 2100) return false; return futurOk || s <= today; }; }


  /* ------------------------------------------------------------ lettres décrites par les définitions (redaction) */
  // Les modèles qui ne sont pas écrits en dur sont décrits par leur définition JSON : champs (dont les choix avec données), texte avec {{champ}}.
  // Chaque point d'entrée trouve la définition par son id dans ce registre (enregistrer() est appelé par la page et par definitions.cjs).
  var REGISTRE = {};
  var BUILTIN = ['resiliation', 'adresse', 'remboursement', 'contestation', 'demeure'];
  function enregistrer(defs) {
    var liste = Array.isArray(defs) ? defs : Object.keys(defs || {}).map(function (k) { return defs[k]; });
    liste.forEach(function (d) {
      if (!d || !d.id) return;
      REGISTRE[d.id] = d;
      if (d.type === 'lettre' && LETTRES.indexOf(d.id) === -1) LETTRES.push(d.id);
    });
    return LETTRES;
  }
  function defDe(id) { return REGISTRE[id] || null; }
  function champDe(D, id) { var cs = (D && D.champs) || []; for (var i = 0; i < cs.length; i++) if (cs[i].id === id) return cs[i]; return null; }
  function optionDe(D, id, valeur) {
    var c = champDe(D, id), os = (c && c.options) || [];
    for (var i = 0; i < os.length; i++) if (os[i].valeur === valeur) return os[i];
    return null;
  }
  function txt(o, l) { return o && typeof o === 'object' ? (o[l] != null ? o[l] : (o.fr != null ? o.fr : '')) : (o == null ? '' : String(o)); }
  // Lecteur de réponses complété : valeur par défaut d'un champ, et destinataire prérempli par le choix (destinataireDepuis)
  function avecDefauts(D, get) {
    var dep = D.destinataireDepuis, opt = null;
    return function (id) {
      var x = get(id);
      if (x) return x;
      var c = champDe(D, id);
      if (c && c.defaut != null) return String(c.defaut);
      if (dep && /^dest_/.test(id)) {
        if (opt === null) opt = optionDe(D, dep, String(get(dep) || '').trim()) || false;
        var d = opt && opt.dest;
        if (d) { var k = id.slice(5); if (k === 'prov') return d.prov || ''; if (d[k] != null) return d[k]; }
      }
      return x;
    };
  }
  // Condition d'un paragraphe : "champ" (rempli), ou { champ, egal | dans | vide | non }, ou { tous:[...] } / { un:[...] }
  function condOk(c, val) {
    if (c == null || c === true) return true;
    if (typeof c === 'string') return !!val(c);
    if (c.tous) return c.tous.every(function (x) { return condOk(x, val); });
    if (c.un) return c.un.some(function (x) { return condOk(x, val); });
    var v = val(c.champ), r = true;
    if (c.egal != null) r = v === String(c.egal);
    else if (c.dans) r = c.dans.indexOf(v) !== -1;
    else if (c.vide) r = !v;
    else r = !!v;
    return c.non ? !r : r;
  }
  // Remplace {{champ}}, {{champ|filtre}}, {{champ.cle}} (donnée du choix) dans un gabarit
  function gabarit(s, D, val, l) {
    return String(s == null ? '' : s).replace(/\{\{\s*([A-Za-z0-9_]+)(?:\.([A-Za-z0-9_]+))?(?:\|([a-z]+))?\s*\}\}/g, function (_, id, cle, filtre) {
      var raw = val(id), r = raw, o;
      if (cle) {
        o = optionDe(D, id, raw);
        if (!o) r = raw; else if (cle === 'label') r = txt(o, l); else r = txt(o.donnees && o.donnees[cle], l);
      } else if (filtre === 'option') { o = optionDe(D, id, raw); r = o ? txt(o, l) : raw; }
      if (filtre === 'date') r = dateTexte(raw, l);
      else if (filtre === 'montant') r = montantTexte(raw, l);
      else if (filtre === 'min') r = minus(r);
      else if (filtre === 'phrase') r = phrase(r);
      else if (filtre === 'sp') r = sansPoint(r);
      return r == null ? '' : r;
    });
  }
  function ajoutPar(p, D, val, l, c) {
    if (!condOk(p.si, val)) return;
    var t = gabarit(txt(p, l), D, val, l).replace(/[ \t]+\n/g, '\n').trim();
    if (t) c.push(t);
  }
  // Rédaction complète à partir de la définition (modèles qui ne sont pas écrits en dur)
  function composerDonnees(D, val, l, L) {
    var R = D.redaction, fr = l === 'fr';
    var objet = gabarit(txt(R.objet, l), D, val, l).trim();
    L.objet = objet;
    if (R.sansObjet) L.sansObjet = true;
    if (R.salut) L.salut = gabarit(txt(R.salut, l), D, val, l).trim();
    if (R.politesse) L.politesse = gabarit(txt(R.politesse, l), D, val, l).trim();
    (R.paragraphes || []).forEach(function (p) { ajoutPar(p, D, val, l, L.corps); });
    if (fr && R.politesse2) L.politesse2 = gabarit(txt(R.politesse2, l), D, val, l).trim();
  }
  // Paragraphes facultatifs ajoutés à une lettre écrite en dur (ex. mise en demeure selon la province) : sans effet si la condition n'est pas remplie
  function ajoutsDonnees(D, val, l, L) {
    (D.redaction.ajouts || []).forEach(function (p) { ajoutPar(p, D, val, l, L.corps); });
  }

  /* ------------------------------------------------------------ lettres libres (résiliation, adresse, remboursement, contestation, mise en demeure) */
  var PAGE = { W: 215.9, H: 279.4, mg: 22, xDest: 112 };

  // Contenu de la lettre. get(id) : valeur d'une réponse (déjà nettoyée) ; l : 'fr' ou 'en'.
  function composerLettre(m, get, l) {
    var D = defDe(m), fr = l === 'fr', val = D ? avecDefauts(D, get) : get;
    function villeLigne(pfx) {
      var v = val(pfx + '_ville'), p = prov(val(pfx + '_prov')), c = cpNormal(val(pfx + '_cp'));
      if (l === 'fr') return v + (p ? ' (' + p.fr + ')' : '') + (c ? '  ' + c : '');
      return v + (p ? ' ' + p.ab : '') + (c ? '  ' + c : '');
    }
    var L = { exp: [], dateLigne: '', dest: [], objet: '', corps: [], salut: '', politesse: '', nom: val('exp_nom') };
    L.exp.push(val('exp_nom'));
    if (val('exp_ligne')) L.exp.push(val('exp_ligne'));
    L.exp.push(villeLigne('exp'));
    if (val('exp_contact')) L.exp.push(val('exp_contact'));
    var lieu = val('exp_ville');
    var dl = dateTexte(val('date_lettre'), l);
    L.dateLigne = fr ? (lieu ? lieu + ', le ' : 'Le ') + dl : (lieu ? lieu + ', ' : '') + dl;
    L.dest.push(val('dest_nom'));
    if (val('dest_service')) L.dest.push((fr ? 'À l’attention de : ' : 'Attention: ') + val('dest_service'));
    if (val('dest_ligne')) L.dest.push(val('dest_ligne'));
    L.dest.push(villeLigne('dest'));
    L.salut = fr ? 'Madame, Monsieur,' : 'Dear Sir or Madam,';
    L.politesse = fr ? 'Je vous prie d’agréer, Madame, Monsieur, l’expression de mes salutations distinguées.' : 'Sincerely,';
    var c = L.corps, ref;
    if (m === 'resiliation') {
      L.objet = fr ? 'Résiliation de contrat' + (val('num_client') ? ', client n° ' + val('num_client') : '') : 'Cancellation of contract' + (val('num_client') ? ', customer no. ' + val('num_client') : '');
      ref = val('num_client');
      if (fr) {
        c.push('Par la présente, je vous informe de ma décision de résilier le contrat suivant : ' + sansPoint(val('service')) + (ref ? ' (numéro de client ou de contrat : ' + ref + ')' : '') + '.');
        c.push(val('date_effet') ? 'Je vous demande de mettre fin à ce contrat à compter du ' + dateTexte(val('date_effet'), 'fr') + '.' : 'Je vous demande de mettre fin à ce contrat dans les meilleurs délais, en tenant compte du préavis prévu au contrat s’il y en a un.');
        if (val('motif')) c.push(phrase(val('motif')));
        c.push('Merci de cesser toute facturation et tout prélèvement à partir de cette date, de me confirmer la résiliation par écrit et, s’il y a lieu, de m’indiquer comment retourner l’équipement qui m’a été fourni.');
      } else {
        c.push('Please accept this letter as notice that I wish to cancel the following contract: ' + sansPoint(val('service')) + (ref ? ' (customer or contract number: ' + ref + ')' : '') + '.');
        c.push(val('date_effet') ? 'I ask that the contract end on ' + dateTexte(val('date_effet'), 'en') + '.' : 'I ask that the contract end as soon as possible, subject to any notice period set out in the contract.');
        if (val('motif')) c.push(phrase(val('motif')));
        c.push('Please stop all billing and pre-authorized payments from that date, confirm the cancellation in writing and, if applicable, tell me how to return any equipment provided to me.');
      }
    } else if (m === 'adresse') {
      L.objet = fr ? 'Changement d’adresse' + (val('num_client') ? ', dossier n° ' + val('num_client') : '') : 'Change of address' + (val('num_client') ? ', account no. ' + val('num_client') : '');
      var nouv = [val('exp_ligne'), villeLigne('exp')].filter(Boolean).join(fr ? ', ' : ', ');
      var anc = val('ancienne').replace(/\s*\n\s*/g, ', ');
      if (fr) {
        c.push('Je vous informe que je change d’adresse à compter du ' + dateTexte(val('date_effet'), 'fr') + '.');
        c.push('Ancienne adresse : ' + anc + '\nNouvelle adresse : ' + nouv);
        c.push('Merci de mettre à jour mon dossier' + (val('num_client') ? ' (numéro ' + val('num_client') + ')' : '') + ' et de m’envoyer désormais toute correspondance à ma nouvelle adresse.');
      } else {
        c.push('Please note that my address will change as of ' + dateTexte(val('date_effet'), 'en') + '.');
        c.push('Previous address: ' + anc + '\nNew address: ' + nouv);
        c.push('Please update my file' + (val('num_client') ? ' (number ' + val('num_client') + ')' : '') + ' and send all future mail to my new address.');
      }
    } else if (m === 'remboursement') {
      ref = val('reference');
      L.objet = fr ? 'Demande de remboursement' + (ref ? ', référence ' + ref : '') : 'Refund request' + (ref ? ', reference ' + ref : '');
      if (fr) {
        c.push('Je vous écris au sujet de l’achat suivant : ' + sansPoint(val('achat')) + (ref ? ' (référence ' + ref + ')' : '') + (val('date_paiement') ? ', payé le ' + dateTexte(val('date_paiement'), 'fr') : '') + '.');
        c.push(phrase(val('motif')));
        c.push('Je vous demande donc de me rembourser la somme de ' + montantTexte(val('montant'), 'fr') + ', de préférence par le moyen de paiement utilisé lors de l’achat. Merci de me faire connaître votre réponse par écrit dans les meilleurs délais.');
      } else {
        c.push('I am writing about the following purchase: ' + sansPoint(val('achat')) + (ref ? ' (reference ' + ref + ')' : '') + (val('date_paiement') ? ', paid on ' + dateTexte(val('date_paiement'), 'en') : '') + '.');
        c.push(phrase(val('motif')));
        c.push('I therefore ask you to refund the amount of ' + montantTexte(val('montant'), 'en') + ', preferably to the payment method used for the purchase. Please send me your answer in writing as soon as possible.');
      }
    } else if (m === 'contestation') {
      L.objet = fr ? 'Contestation de la facture n° ' + val('num_facture') : 'Dispute of invoice no. ' + val('num_facture');
      if (fr) {
        c.push('Je conteste la facture n° ' + val('num_facture') + (val('date_facture') ? ' du ' + dateTexte(val('date_facture'), 'fr') : '') + (val('num_client') ? ' (numéro de client ' + val('num_client') + ')' : '') + ', pour un montant de ' + montantTexte(val('montant'), 'fr') + '.');
        c.push(phrase(val('motif')));
        c.push('Je vous demande de vérifier mon dossier, de suspendre toute démarche de recouvrement sur la somme contestée pendant cette vérification et de m’envoyer une facture corrigée ou une explication écrite.');
      } else {
        c.push('I dispute invoice no. ' + val('num_facture') + (val('date_facture') ? ' dated ' + dateTexte(val('date_facture'), 'en') : '') + (val('num_client') ? ' (customer number ' + val('num_client') + ')' : '') + ', for an amount of ' + montantTexte(val('montant'), 'en') + '.');
        c.push(phrase(val('motif')));
        c.push('Please review my file, suspend any collection of the disputed amount while you do so, and send me a corrected invoice or a written explanation.');
      }
    } else if (m === 'demeure') {
      L.objet = fr ? 'Mise en demeure' : 'Formal demand';
      var n = parseInt(val('delai'), 10) || 10;
      if (fr) {
        c.push(phrase(val('faits')));
        c.push('Par la présente, je vous mets en demeure de ' + sansPoint(minus(val('demande'))) + ' dans un délai de ' + n + ' jours suivant la réception de cette lettre.');
        c.push('À défaut, je me réserve le droit d’entreprendre, sans autre avis ni délai, les recours nécessaires pour faire valoir mes droits.');
        L.politesse = 'Veuillez agir en conséquence.';
      } else {
        c.push(phrase(val('faits')));
        c.push('I hereby formally demand that you ' + sansPoint(minus(val('demande'))) + ' within ' + n + ' days of receiving this letter.');
        c.push('If you fail to do so, I reserve the right to take the legal steps needed to enforce my rights, without further notice.');
        L.politesse = 'Govern yourself accordingly.';
      }
    }
    if (D && D.redaction) { if (BUILTIN.indexOf(m) === -1) composerDonnees(D, val, l, L); else ajoutsDonnees(D, val, l, L); }
    if (fr && m === 'demeure') L.politesse2 = 'Je vous prie d’agréer, Madame, Monsieur, mes salutations.';
    L.pied = L.exp.filter(Boolean).join('  ·  ');
    return L;
  }

  // Éléments à dessiner (mm). Format historique de la page (aperçu HTML compris) : c en hexadécimal, b = gras, src = signature.
  function disposerLettre(L, fs, sig, o) {
    o = o || {};
    var langue = o.langue || 'fr';
    var W = PAGE.W, H = PAGE.H, mg = PAGE.mg, larg = W - 2 * mg, xD = PAGE.xDest;
    var lh = fs * 0.52, ops = [], y = 26, tient = true;
    var yPied = H - 58, bas = yPied - 8;
    function ecrire(txt, op) {
      op = op || {};
      var f = op.fs || fs;
      var ls = couper(nettoyer(txt), op.w || larg, f, 'helvetica', op.gras ? 'bold' : 'normal', 'mm');
      for (var i = 0; i < ls.length; i++) {
        if (y > bas) tient = false;
        ops.push({ t: 'text', x: op.x || mg, y: y, s: ls[i], b: !!op.gras, fs: f, c: '#111111' });
        y += lh;
      }
    }
    L.exp.forEach(function (s, i) { ecrire(s, { gras: i === 0 }); });
    y = Math.max(y + 8, 58);
    L.dest.forEach(function (s, i) { ecrire(s, { x: xD, w: W - mg - xD, gras: i === 0 }); });
    y += lh * 2.2;
    if (!L.sansObjet) { ecrire((langue === 'fr' ? 'Objet : ' : 'Re: ') + L.objet, { gras: true }); y += lh * 0.9; }
    ecrire(L.salut);
    y += lh * 0.7;
    L.corps.forEach(function (p) { p.split('\n').forEach(function (s) { ecrire(s); }); y += lh * 0.9; });
    ecrire(L.politesse);
    if (L.politesse2) { y += lh * 0.7; ecrire(L.politesse2); }
    // bloc du bas : date à gauche, signature à droite
    var fb = Math.min(fs, 10.5);
    var dl = couper(nettoyer(L.dateLigne), xD - mg - 6, fb, 'helvetica', 'normal', 'mm');
    dl.forEach(function (s, i) { ops.push({ t: 'text', x: mg, y: yPied + 6 + i * fb * 0.5, s: s, b: false, fs: fb, c: '#111111' }); });
    if (sig) {
      var d = dimSig(sig, 62, 20);
      ops.push({ t: 'img', x: xD, y: yPied + 20 - d.h, w: d.w, h: d.h, src: sig.url });
    }
    ops.push({ t: 'line', x1: xD, y1: yPied + 21.5, x2: xD + 64, y2: yPied + 21.5, c: '#888888' });
    ops.push({ t: 'text', x: xD, y: yPied + 27, s: nettoyer(couper(nettoyer(L.nom), 70, fb, 'helvetica', 'bold', 'mm')[0] || ''), b: true, fs: fb, c: '#111111' });
    // pied de page
    ops.push({ t: 'line', x1: mg, y1: H - 20, x2: W - mg, y2: H - 20, c: '#cccccc' });
    var pied = couper(nettoyer(L.pied), larg, 8, 'helvetica', 'normal', 'mm').slice(0, 2);
    pied.forEach(function (s, i) { ops.push({ t: 'text', x: W / 2, y: H - 15.5 + i * 3.6, s: s, b: false, fs: 8, c: '#666666', a: 'center' }); });
    if (o.lienPied) ops.push({ t: 'text', x: W / 2, y: H - 15.5 + pied.length * 3.6, s: langue === 'fr' ? 'Modèle gratuit : capycom.ca' : 'Free template: capycom.ca', b: false, fs: 7.5, c: '#999999', a: 'center' });
    return { ops: ops, tient: tient };
  }

  // Plan complet d'une lettre libre. o : { lettre|ui : langue de la lettre, lienPied, sig:{url,w,h}, get(id) facultatif }
  function planLettre(modele, v, o) {
    o = o || {};
    var langue = o.lettre || o.ui || 'fr', rv = lecteur(v), get = o.get || rv;
    var L = composerLettre(modele, get, langue), tailles = [12.5, 12, 11.5, 11, 10.5, 10, 9.5], res;
    for (var ti = 0; ti < tailles.length; ti++) {
      res = disposerLettre(L, tailles[ti], o.sig || null, { langue: langue, lienPied: o.lienPied !== false });
      if (res.tient || ti === tailles.length - 1) break;
    }
    var ops = res.ops.map(function (e) {
      if (e.t === 'text') { var r = { t: 'text', s: e.s, x: e.x, y: e.y, fs: e.fs, f: 'helvetica', st: e.b ? 'bold' : 'normal', c: hexRgb(e.c) }; if (e.a) r.a = e.a; return r; }
      if (e.t === 'line') return { t: 'line', x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, lw: 0.25, c: hexRgb(e.c) };
      return { t: 'img', id: 'sig', x: e.x, y: e.y, w: e.w, h: e.h };
    });
    return { plan: { unit: 'mm', taille: [PAGE.W, PAGE.H], pages: [{ ops: ops }] }, tient: res.tient, ops: res.ops, L: L };
  }

  /* ------------------------------------------------------------ RC66 et RC66SCH (Agence du revenu du Canada) */
  // Contexte de lecture des réponses d'un dossier RC66. o : { rc:{deux, perso, raccourci, schPerso}, today }
  function ctxRc(v, o) {
    o = o || {};
    var rcOpt = o.rc || {}, rv = lecteur(v), today = o.today || aujourdhuiIso(), dateOk = dateOkFn(rv, today);
    var C = { rv: rv, today: today, dateOk: dateOk, opt: rcOpt };
    function chiffresDate(id) { var s = rv(id); return dateIso(s) ? s.replace(/-/g, '') : ''; }
    C.chiffresDate = chiffresDate;
    C.conjoint = function () { var c = rv('rc_civil'); return c === 'marie' || c === 'fait'; };
    C.schPers = function () {
      var a = [];
      if (rv('rc_cit') === 'non' || rv('rc_new') === 'oui') a.push('y');
      if (C.conjoint() && (rv('rc_s_cit') === 'non' || rv('rc_s_new') === 'oui')) a.push('s');
      return a;
    };
    C.schNouv = function (p) { return rv(p === 'y' ? 'rc_new' : 'rc_s_new') === 'oui'; };
    C.schRequis = function () {
      if (rcOpt.raccourci) return !!rv('rc_f_sch');
      return rv('rc_cit') === 'non' || (C.conjoint() && rv('rc_s_cit') === 'non') || rv('rc_new') === 'oui' || (C.conjoint() && rv('rc_s_new') === 'oui');
    };
    C.schGenere = function () { return !rcOpt.raccourci && !rcOpt.schPerso && C.schRequis(); };
    C.schPourPdf = function () { return !rcOpt.raccourci && C.schRequis(); };
    C.schAnDefaut = function () {
      var ps = ['y', 's'];
      for (var i = 0; i < ps.length; i++) {
        var p = ps[i]; if (!C.schNouv(p) || (p === 's' && !C.conjoint())) continue;
        var d = rv('rc_sch_' + p + '_type') === 'retour' ? rv('rc_sch_' + p + '_retab') : rv('rc_sch_' + p + '_res');
        if (dateIso(d)) return d;
      }
      return '';
    };
    C.montantSch = function (id) {
      var s = rv(id).replace(/[\s$]/g, '').replace(',', '.'); if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
      var x = parseFloat(s), dol = Math.floor(x + 1e-9), cts = Math.round((x - dol) * 100); if (cts === 100) { dol++; cts = 0; }
      return dol + '.' + ('0' + cts).slice(-2);
    };
    C.schCSousAn = function () { var d = C.schAnDefaut(); return dateIso(d) && parseInt(d.slice(5, 7), 10) <= 5; };
    C.schPersRev = function () { return C.schPers().filter(function (p) { return C.schNouv(p) && !(p === 's' && rv('rc_s_nonres')); }); };
    C.telSch = function () {
      var t = chiffres(rv('rc_tel1') || rv('rc_tel3') || rv('rc_tel2'));
      if (t.length === 11 && t.charAt(0) === '1') t = t.slice(1);
      return t.length === 10 ? t.slice(0, 3) + ' ' + t.slice(3, 6) + '-' + t.slice(6) : rv('rc_tel1') || rv('rc_tel3') || rv('rc_tel2');
    };
    return C;
  }

  // Valeurs placées sur les pages du RC66 (rectangles en points PDF, origine en bas à gauche)
  function rcPlanChamps(C) {
    var rv = C.rv, chiffresDate = C.chiffresDate, conjoint = C.conjoint;
    var P = [[], [], [], []];
    function T(p, r, s) { if (s) P[p].push({ k: 't', r: r, s: String(s) }); }
    function K(p, r, s) { if (s) P[p].push({ k: 'k', r: r, s: String(s) }); }
    function X(p, r) { P[p].push({ k: 'x', r: r }); }
    function M(p, r, s) { if (s) P[p].push({ k: 'm', r: r, s: String(s) }); }
    // page 1
    if (!rv('rc_sansnas')) K(0, [205, 421, 311, 432], chiffres(rv('rc_nas')));
    T(0, [204, 376, 477, 390], rv('rc_prenom')); T(0, [204, 355, 477, 369], rv('rc_nom'));
    K(0, [205, 336, 299, 348], chiffresDate('rc_naiss'));
    X(0, rv('rc_langue') === 'en' ? [261, 304, 273, 316] : [204, 304, 216, 316]);
    T(0, [204, 283, 291.1, 297], rv('rc_tel1')); T(0, [327, 283, 402, 297], rv('rc_tel2')); T(0, [432.6, 283, 477, 297], rv('rc_ext')); T(0, [504, 283, 591, 297], rv('rc_tel3'));
    T(0, [204, 220, 477, 234], rv('rcp_ligne')); T(0, [204, 199, 477, 213], rv('rcp_ville')); T(0, [204, 172, 477, 186], rv('rcp_prov')); T(0, [204, 151, 324, 165], cpNormal(rv('rcp_cp')));
    if (rv('rc_chgprov') === 'oui') {
      X(0, [204, 128.5, 216, 140.5]); T(0, [204, 106, 348, 120], rv('rc_ancprov')); K(0, [382, 108, 476, 120], chiffresDate('rc_dateprov'));
    } else if (rv('rc_chgprov') === 'non') X(0, [261, 128.5, 273, 140.5]);
    // page 2
    if (rv('rc_memeadr')) X(1, [204, 726, 216, 738]);
    else { T(1, [204, 709, 477, 723], rv('rcd_ligne')); T(1, [203.5, 691, 477, 705], rv('rcd_ville')); T(1, [204, 670, 477, 684], rv('rcd_prov')); T(1, [204, 649, 324, 663], cpNormal(rv('rcd_cp'))); }
    var civ = { marie: [204, 604.5, 216, 616.5], fait: [204, 574.5, 216, 586.5], separe: [204, 454.5, 216, 466.5], veuf: [204, 352.5, 216, 364.5], divorce: [204, 331.5, 216, 343.5], celib: [204, 310.5, 216, 322.5] };
    if (civ[rv('rc_civil')]) X(1, civ[rv('rc_civil')]);
    if (rv('rc_civil') !== 'celib') K(1, [205, 279, 299, 291], chiffresDate('rc_civildate'));
    if (conjoint()) {
      K(1, [205, 232, 311, 243], chiffres(rv('rc_s_nas'))); T(1, [204, 187, 477, 201], rv('rc_s_prenom')); T(1, [204, 169, 477, 183], rv('rc_s_nom'));
      K(1, [205, 150, 299, 162], chiffresDate('rc_s_naiss')); M(1, [205, 67, 476, 126], rv('rc_s_adr')); if (rv('rc_s_nonres')) X(1, [204, 49.5, 216, 61.5]);
    }
    // page 3
    X(2, rv('rc_cit') === 'oui' ? [207, 694, 219, 706] : [252, 694, 264, 706]);
    if (conjoint()) X(2, rv('rc_s_cit') === 'oui' ? [207, 661, 219, 673] : [252, 661, 264, 673]);
    X(2, rv('rc_new') === 'oui' ? [204, 581.5, 216, 593.5] : [264, 581.5, 276, 593.5]);
    if (conjoint()) X(2, rv('rc_s_new') === 'oui' ? [204, 539.5, 216, 551.5] : [264, 539.5, 276, 551.5]);
    function enfant(n, g) {
      var p = 'rc_e' + n + '_', pg = g.pg;
      T(pg, g.prenom, rv(p + 'prenom')); T(pg, g.nom, rv(p + 'nom'));
      X(pg, rv(p + 'sexe') === 'g' ? g.garcon : g.fille);
      K(pg, g.naiss, chiffresDate(p + 'naiss')); T(pg, g.ville, rv(p + 'ville')); T(pg, g.prov, rv(p + 'prov'));
      if (rv(p + 'plus60') === 'oui') {
        X(pg, g.oui);
        if (rv(p + 'depuisnaiss')) X(pg, g.depuisnaiss); else K(pg, g.depuis, chiffresDate(p + 'depuis'));
      } else if (rv(p + 'plus60') === 'non') {
        X(pg, g.non);
        if (rv(p + 'partage') === '40') { X(g.pgb, g.b40); K(g.pgb, g.d40, chiffresDate(p + 'date40')); }
        else if (rv(p + 'partage') === 'moins40') X(g.pgb, g.bmoins);
      }
    }
    enfant(1, { pg: 2, pgb: 3, prenom: [204, 292, 477, 306], nom: [204, 273.8, 477, 287.8], fille: [204, 253, 216, 265], garcon: [261, 253, 273, 265], naiss: [205, 234, 299, 246],
      ville: [204, 205, 477, 219], prov: [204, 184, 477, 197], oui: [204, 139, 216, 151], non: [261, 139, 273, 151], depuis: [205, 96, 299, 108], depuisnaiss: [324, 96, 336, 108],
      b40: [198, 697.5, 210, 709.5], d40: [214, 645, 308, 657], bmoins: [198, 616.5, 210, 628.5] });
    if (C.opt.deux) enfant(2, { pg: 3, pgb: 3, prenom: [204, 550, 477, 564], nom: [204, 532, 477, 546], fille: [204, 511, 216, 523], garcon: [261, 511, 273, 523], naiss: [205, 492, 299, 504],
      ville: [204, 463, 477, 477], prov: [204, 442, 477, 455], oui: [204, 400, 216, 412], non: [261, 400, 273, 412], depuis: [205, 360, 299, 372], depuisnaiss: [324, 360, 336, 372],
      b40: [207, 301.5, 219, 313.5], d40: [223, 252, 317, 264], bmoins: [207, 220.5, 219, 232.5] });
    // page 4 : date de signature
    K(3, [484, 99, 578, 111], chiffresDate('rc_datesign'));
    return P;
  }

  // RC66SCH : statut au Canada et renseignements sur les revenus
  function rcPlanChampsSch(C) {
    var rv = C.rv, chiffresDate = C.chiffresDate, conj = C.conjoint(), pers = C.schPers();
    var P = [[], [], [], []], X0 = { y: 247, s: 409 };
    function T(p, r, s) { if (s) P[p].push({ k: 't', r: r, s: String(s) }); }
    function K(p, r, s) { if (s) P[p].push({ k: 'k', r: r, s: String(s) }); }
    function Y(p, r, s) { if (s) P[p].push({ k: 'y', r: r, s: String(s) }); }
    function F(p, r, s) { if (s) P[p].push({ k: 'f', r: r, s: String(s) }); }
    function X(p, r) { P[p].push({ k: 'x', r: r }); }
    function dateAt(pg, y, id, pe) { var x = pe === 'y' ? 247 : 409; K(pg, [x, y, x + 94, y + 12], chiffresDate(id)); }
    // étape 1
    if (!rv('rc_sansnas')) K(0, [246, 525, 354, 537], chiffres(rv('rc_nas')));
    T(0, [246, 487, 492, 501], rv('rc_prenom')); T(0, [246, 469, 492, 483], rv('rc_nom')); T(0, [246, 451, 354, 465], C.telSch());
    if (conj) {
      K(0, [246, 432, 353, 444], chiffres(rv('rc_s_nas')));
      if (!chiffres(rv('rc_s_nas'))) X(0, [246, 411, 258, 423]);
      T(0, [246, 388, 492, 402], rv('rc_s_prenom')); T(0, [246, 370, 492, 384], rv('rc_s_nom'));
    }
    // étape 2
    ['y', 's'].forEach(function (p) {
      if (pers.indexOf(p) === -1 || !C.schNouv(p)) return;
      var q = 'rc_sch_' + p + '_', x = X0[p];
      if (rv(q + 'type') === 'nouvel') dateAt(0, 183, q + 'res', p);
      else if (rv(q + 'type') === 'retour') {
        T(1, [x, 676, x + 118, 686], rv(q + 'provav')); dateAt(1, 651, q + 'coupe', p); dateAt(1, 612, q + 'retab', p);
      }
    });
    // étape 3
    pers.forEach(function (p) {
      var q = 'rc_sch_' + p + '_';
      if (rv(q + 'cit')) dateAt(1, 462, q + 'citd', p);
      if (rv(q + 'rp')) dateAt(1, 363, q + 'rpd', p);
      if (rv(q + 'pp')) dateAt(1, 234, q + 'ppd', p);
      if (rv(q + 'ind')) K(2, p === 'y' ? [250, 480, 344, 492] : [412, 480, 506, 492], chiffresDate(q + 'indd'));
      if (rv(q + 'rt')) {
        var xn = p === 'y' ? 90 : 375, xd = p === 'y' ? 70 : 355, xf = p === 'y' ? 214 : 499;
        T(2, [xn, 652, xn + 213, 666], rv(q + 'rt1n')); K(2, [xd, 633, xd + 94, 645], chiffresDate(q + 'rt1d')); K(2, [xf, 633, xf + 94, 645], chiffresDate(q + 'rt1f'));
        T(2, [xn, 592, xn + 204, 612], rv(q + 'rt2n')); K(2, [xd, 570.2, xd + 94, 582.2], chiffresDate(q + 'rt2d')); K(2, [xf, 570.2, xf + 94, 582.2], chiffresDate(q + 'rt2f'));
      }
    });
    // étape 4
    var an = rv('rc_sch_an');
    if (C.schPersRev().length && /^\d{4}$/.test(an)) {
      var a = parseInt(an, 10);
      Y(2, [247, 243, 293, 255], String(a)); Y(2, [247, 120, 293, 132], String(a - 1));
      C.schPersRev().forEach(function (p) {
        var x = X0[p]; F(2, [x, 163, x + 97, 176], C.montantSch('rc_sch_' + p + '_ra')); F(2, [x, 61, x + 97, 74], C.montantSch('rc_sch_' + p + '_rb'));
        if (C.schCSousAn()) F(3, [x + 0.3, 625, x + 97.3, 638], C.montantSch('rc_sch_' + p + '_rc'));
      });
      if (C.schCSousAn()) Y(3, [247.3, 684, 293.3, 696], String(a - 2));
    }
    // signature : date
    K(3, [484.3, 546, 578.3, 558], chiffresDate('rc_datesign'));
    return P;
  }

  var COUL_FORM = [10, 20, 60];
  function opTxt(s, x, y, fs, c, a, f, st) { var o = { t: 'text', s: s, x: x, y: y, fs: fs, f: f || 'helvetica', st: st || 'normal', c: c || COUL_FORM }; if (a) o.a = a; return o; }
  function opLigne(x1, y1, x2, y2, lw, c) { return { t: 'line', x1: x1, y1: y1, x2: x2, y2: y2, lw: lw, c: c || COUL_FORM }; }
  var H_PT = 792, W_PT = 612;
  // Traduit les champs d'une page (liste k/r/s) en opérations de dessin, comme le faisait la page du site
  function opsChamps(liste) {
    var ops = [];
    liste.forEach(function (o) {
      var r = o.r, s = nettoyer(o.s || '');
      if (o.k === 't') {
        var fs = 10; while (fs > 6 && largeur(s, fs, 'helvetica', 'normal', 'pt') > r[2] - r[0] - 4) fs -= 0.5;
        ops.push(opTxt(s, r[0] + 2, H_PT - r[1] - 3.4, fs));
      } else if (o.k === 'k') {
        var n = (r[2] - r[0]) > 100 ? 9 : 8, cw = (r[2] - r[0]) / n;
        for (var i = 0; i < s.length && i < n; i++) ops.push(opTxt(s.charAt(i), r[0] + i * cw + cw / 2, H_PT - r[1] - 2.8, 10.5, null, 'center'));
      } else if (o.k === 'y') {
        var cwy = (r[2] - r[0]) / 4;
        for (var iy = 0; iy < s.length && iy < 4; iy++) ops.push(opTxt(s.charAt(iy), r[0] + iy * cwy + cwy / 2, H_PT - r[1] - 2.8, 10.5, null, 'center'));
      } else if (o.k === 'f') {
        var parts = s.split('.');
        ops.push(opTxt(parts[0], r[0] + 78, H_PT - r[1] - 3.4, 10, null, 'right'));
        ops.push(opTxt(parts[1] || '00', r[0] + 82, H_PT - r[1] - 3.4, 10));
      } else if (o.k === 'x') {
        ops.push(opLigne(r[0] + 2.4, H_PT - r[1] - 2.4, r[2] - 2.4, H_PT - r[3] + 2.4, 1.4));
        ops.push(opLigne(r[0] + 2.4, H_PT - r[3] + 2.4, r[2] - 2.4, H_PT - r[1] - 2.4, 1.4));
      } else if (o.k === 'm') {
        couper(s.replace(/\n+/g, ' / '), r[2] - r[0] - 6, 9, 'helvetica', 'normal', 'pt').slice(0, 4).forEach(function (l, i) { ops.push(opTxt(l, r[0] + 3, H_PT - (114.4 - i * 15.05), 9)); });
      }
    });
    return ops;
  }

  // Plan du RC66 (et du RC66SCH quand il est requis). o : { rc:{deux, perso, raccourci, schPerso}, tout (défaut true), sig, today }
  function planRc66(v, o) {
    o = o || {};
    var C = ctxRc(v, o), tout = o.tout !== false, pages = [];
    function jeu(idFond, champs, ySig) {
      for (var p = 0; p < 4; p++) {
        var ops = [{ t: 'img', id: idFond + ':' + p, x: 0, y: 0, w: W_PT, h: H_PT }].concat(opsChamps(champs[p]));
        if (p === 3 && o.sig) { var d = dimSig(o.sig, 220, 25); ops.push({ t: 'img', id: 'sig', x: 135, y: H_PT - ySig - d.h, w: d.w, h: d.h }); }
        pages.push({ ops: ops });
      }
    }
    if (tout || (!C.opt.perso && !C.opt.raccourci)) jeu('rc66', rcPlanChamps(C), 100.5);
    if (tout ? C.schPourPdf() : C.schGenere()) jeu('sch', rcPlanChampsSch(C), 547.5);
    return { unit: 'pt', taille: [W_PT, H_PT], pages: pages };
  }

  /* ------------------------------------------------------------ Contestation du dossier de crédit (Equifax, TransUnion) */
  // Cases des formulaires Equifax (PDF à plat, une lettre par case), mesurées sur l'image : coordonnées en points, origine en haut à gauche
  var CR_SPEC = {"acc":[{"p":0,"k":"c","id":"num","x0":36,"w":54,"n":10,"yt":436.5,"yb":458.5},{"p":0,"k":"c","id":"prenom","x0":36,"w":18,"n":15,"yt":480.0,"yb":502.0},{"p":0,"k":"c","id":"prenom2","x0":306,"w":18,"n":15,"yt":480.0,"yb":502.0},{"p":0,"k":"c","id":"nom","x0":36,"w":18.45,"n":25,"yt":524.0,"yb":546.0},{"p":0,"k":"c","id":"suffixe","x0":497,"w":19.5,"n":4,"yt":524.0,"yb":546.0},{"p":0,"k":"c","id":"stnum","x0":36,"w":15.35,"n":10,"yt":567.5,"yb":589.5},{"p":0,"k":"c","id":"stnom","x0":189.8,"w":15.4,"n":25,"yt":567.5,"yb":589.5},{"p":0,"k":"c","id":"unite","x0":36,"w":21.6,"n":6,"yt":611.0,"yb":633.0},{"p":0,"k":"c","id":"ville","x0":165.6,"w":20.5,"n":20,"yt":611.0,"yb":633.0},{"p":0,"k":"c","id":"prov","x0":36,"w":17.45,"n":25,"yt":655.0,"yb":677.0},{"p":0,"k":"c","id":"cp","x0":472,"w":17.4,"n":6,"yt":655.0,"yb":677.0},{"p":0,"k":"c","id":"dob","x0":36,"w":19.12,"n":8,"yt":715.0,"yb":737.0},{"p":0,"k":"c","id":"nas","x0":189,"w":19.5,"n":9,"yt":715.0,"yb":737.0},{"p":0,"k":"c","id":"tel","x0":364.5,"w":21.1,"n":10,"yt":715.0,"yb":737.0},{"p":1,"k":"c","id":"courriel","x0":36,"w":15.43,"n":35,"yt":87.0,"yb":109.0},{"p":1,"k":"c","id":"a_stnum","x0":36,"w":15.35,"n":10,"yt":183.5,"yb":205.5},{"p":1,"k":"c","id":"a_stnom","x0":189.8,"w":15.4,"n":25,"yt":183.5,"yb":205.5},{"p":1,"k":"c","id":"a_unite","x0":36,"w":21.6,"n":6,"yt":227.0,"yb":249.0},{"p":1,"k":"c","id":"a_ville","x0":165.6,"w":20.5,"n":20,"yt":227.0,"yb":249.0},{"p":1,"k":"c","id":"a_prov","x0":36,"w":17.45,"n":25,"yt":271.0,"yb":293.0},{"p":1,"k":"c","id":"a_cp","x0":472,"w":17.4,"n":6,"yt":271.0,"yb":293.0},{"p":1,"k":"c","id":"a_de","x0":36,"w":33.8,"n":8,"yt":314.5,"yb":336.5},{"p":1,"k":"c","id":"a_a","x0":306,"w":33.8,"n":8,"yt":314.5,"yb":336.5},{"p":1,"k":"c","id":"c1_cred","x0":36,"w":13.5,"n":20,"yt":410.5,"yb":433.0},{"p":1,"k":"c","id":"c1_num","x0":306,"w":16.9,"n":16,"yt":410.5,"yb":433.0},{"p":1,"k":"c","id":"c1_ferme","x0":76.5,"w":21.6,"n":8,"yt":488.0,"yb":517.5},{"p":1,"k":"g","id":"c1_note","x0":76.5,"w":21.5,"n":22,"yt":544.5,"yb":596.0,"rows":2},{"p":2,"k":"g","id":"c1_autre","x0":63,"w":16.2,"n":30,"yt":84.5,"yb":197.5,"rows":6},{"p":1,"k":"x","id":"c1_maj","cx":53.6,"cy":467.1},{"p":1,"k":"x","id":"c1_ferme","cx":67.0,"cy":479.4},{"p":1,"k":"x","id":"c1_note","cx":67.0,"cy":536.0},{"p":1,"k":"x","id":"c1_lit","cx":53.6,"cy":616.8},{"p":1,"k":"x","id":"c1_pasmien","cx":80.6,"cy":629.1},{"p":1,"k":"x","id":"c1_fraude","cx":80.6,"cy":641.4},{"p":2,"k":"x","id":"c1_autre","cx":53.3,"cy":77.6},{"p":2,"k":"c","id":"c2_cred","x0":36,"w":13.5,"n":20,"yt":246.0,"yb":268.0},{"p":2,"k":"c","id":"c2_num","x0":306,"w":16.9,"n":16,"yt":246.0,"yb":268.0},{"p":2,"k":"c","id":"c2_ferme","x0":76.5,"w":21.6,"n":8,"yt":323.0,"yb":352.5},{"p":2,"k":"g","id":"c2_note","x0":76.5,"w":21.5,"n":22,"yt":379.5,"yb":431.5,"rows":2},{"p":2,"k":"g","id":"c2_autre","x0":63,"w":16.2,"n":30,"yt":508.5,"yb":621.5,"rows":6},{"p":2,"k":"x","id":"c2_maj","cx":53.6,"cy":302.3},{"p":2,"k":"x","id":"c2_ferme","cx":67.0,"cy":314.6},{"p":2,"k":"x","id":"c2_note","cx":67.0,"cy":371.2},{"p":2,"k":"x","id":"c2_lit","cx":53.6,"cy":452.0},{"p":2,"k":"x","id":"c2_pasmien","cx":80.6,"cy":464.2},{"p":2,"k":"x","id":"c2_fraude","cx":80.6,"cy":476.6},{"p":2,"k":"x","id":"c2_autre","cx":53.3,"cy":501.3},{"p":3,"k":"c","id":"c3_cred","x0":36,"w":13.5,"n":20,"yt":87.0,"yb":109.0},{"p":3,"k":"c","id":"c3_num","x0":306,"w":16.9,"n":16,"yt":87.0,"yb":109.0},{"p":3,"k":"c","id":"c3_ferme","x0":76.5,"w":21.6,"n":8,"yt":164.5,"yb":193.5},{"p":3,"k":"g","id":"c3_note","x0":76.5,"w":21.5,"n":22,"yt":221.0,"yb":272.5,"rows":2},{"p":3,"k":"g","id":"c3_autre","x0":63,"w":16.2,"n":30,"yt":349.5,"yb":462.5,"rows":6},{"p":3,"k":"x","id":"c3_maj","cx":53.6,"cy":143.5},{"p":3,"k":"x","id":"c3_ferme","cx":67.0,"cy":155.8},{"p":3,"k":"x","id":"c3_note","cx":67.0,"cy":212.3},{"p":3,"k":"x","id":"c3_lit","cx":53.6,"cy":293.2},{"p":3,"k":"x","id":"c3_pasmien","cx":80.6,"cy":305.5},{"p":3,"k":"x","id":"c3_fraude","cx":80.6,"cy":317.7},{"p":3,"k":"x","id":"c3_autre","cx":53.3,"cy":342.5},{"p":4,"k":"c","id":"dsoumis","x0":317,"w":21.6,"n":8,"yt":203.5,"yb":233.0},{"p":4,"k":"b","id":"sig","x0":36.2,"x1":308.2,"yt":204,"yb":261}],"pi":[{"p":0,"k":"x","id":"svc_nom","cx":49.3,"cy":316.8},{"p":0,"k":"x","id":"svc_adr","cx":49.3,"cy":336.4},{"p":0,"k":"x","id":"svc_dob","cx":49.3,"cy":356.0},{"p":0,"k":"x","id":"svc_nas","cx":329.7,"cy":316.8},{"p":0,"k":"x","id":"svc_tel","cx":329.7,"cy":336.4},{"p":0,"k":"x","id":"svc_promo","cx":329.7,"cy":356.0},{"p":0,"k":"c","id":"num","x0":41.5,"w":54,"n":10,"yt":429.5,"yb":452.0},{"p":0,"k":"c","id":"prenom","x0":41.5,"w":18,"n":15,"yt":473.5,"yb":495.5},{"p":0,"k":"c","id":"prenom2","x0":311.5,"w":18,"n":15,"yt":473.5,"yb":495.5},{"p":0,"k":"c","id":"nom","x0":41.5,"w":18.4,"n":25,"yt":517.0,"yb":539.5},{"p":0,"k":"c","id":"suffixe","x0":501.3,"w":20,"n":4,"yt":517.0,"yb":539.5},{"p":0,"k":"c","id":"stnum","x0":41.5,"w":15.4,"n":10,"yt":561.0,"yb":583.0},{"p":0,"k":"c","id":"stnom","x0":195.5,"w":15.4,"n":25,"yt":561.0,"yb":583.0},{"p":0,"k":"c","id":"unite","x0":41.5,"w":21.6,"n":6,"yt":604.5,"yb":626.5},{"p":0,"k":"c","id":"ville","x0":171.5,"w":20.5,"n":20,"yt":604.5,"yb":626.5},{"p":0,"k":"c","id":"prov","x0":41.5,"w":17.5,"n":25,"yt":648.0,"yb":670.5},{"p":0,"k":"c","id":"cp","x0":477.5,"w":17.35,"n":6,"yt":648.0,"yb":670.5},{"p":0,"k":"c","id":"dob","x0":41.5,"w":19.12,"n":8,"yt":708.5,"yb":730.5},{"p":0,"k":"c","id":"nas","x0":194.5,"w":19.5,"n":9,"yt":708.5,"yb":730.5},{"p":0,"k":"c","id":"tel","x0":370,"w":19.2,"n":11,"yt":708.5,"yb":730.5},{"p":1,"k":"c","id":"courriel","x0":41.5,"w":15.43,"n":35,"yt":87.0,"yb":109.0},{"p":1,"k":"c","id":"f_prenom","x0":41.5,"w":18,"n":15,"yt":186.5,"yb":208.5},{"p":1,"k":"c","id":"f_prenom2","x0":311.5,"w":18,"n":15,"yt":186.5,"yb":208.5},{"p":1,"k":"c","id":"f_nom","x0":41.5,"w":18.4,"n":25,"yt":230.0,"yb":252.0},{"p":1,"k":"c","id":"f_suffixe","x0":501.3,"w":20,"n":4,"yt":230.0,"yb":252.0},{"p":1,"k":"c","id":"a_stnum","x0":41.5,"w":15.4,"n":10,"yt":304.5,"yb":326.5},{"p":1,"k":"c","id":"a_stnom","x0":195.5,"w":15.4,"n":25,"yt":304.5,"yb":326.5},{"p":1,"k":"c","id":"a_unite","x0":41.5,"w":21.6,"n":6,"yt":348.0,"yb":370.5},{"p":1,"k":"c","id":"a_ville","x0":171.5,"w":20.5,"n":20,"yt":348.0,"yb":370.5},{"p":1,"k":"c","id":"a_prov","x0":41.5,"w":17.5,"n":25,"yt":392.0,"yb":414.0},{"p":1,"k":"c","id":"a_cp","x0":477.5,"w":17.35,"n":6,"yt":392.0,"yb":414.0},{"p":1,"k":"c","id":"a_de","x0":41.5,"w":33.9,"n":8,"yt":435.5,"yb":458.0},{"p":1,"k":"c","id":"a_a","x0":311.1,"w":33.9,"n":8,"yt":435.5,"yb":458.0},{"p":1,"k":"c","id":"a_nas","x0":44,"w":21.6,"n":9,"yt":565.0,"yb":594.5},{"p":1,"k":"c","id":"promo","x0":44,"w":21.6,"n":12,"yt":663.0,"yb":692.5},{"p":2,"k":"b","id":"comm","x0":41.8,"x1":570.2,"yt":92,"yb":174},{"p":2,"k":"c","id":"dsoumis","x0":317,"w":21.6,"n":8,"yt":339.0,"yb":368.5},{"p":2,"k":"b","id":"sig","x0":36.2,"x1":308.2,"yt":339,"yb":396}]};
  // Limites de cases des formulaires Equifax (un caractère par case)
  var CR_LIM = { prenom: 15, prenom2: 15, nom: 25, suffixe: 4, a_no: 10, a_rue: 25, a_app: 6, a_ville: 20, p_no: 10, p_rue: 25, p_app: 6, p_ville: 20, courriel: 35, anc_prenom: 15, anc_nom: 25 };
  // TransUnion : blocs de comptes du formulaire (rectangles PDF, origine en bas à gauche)
  var TU_BLOCS = [
    { p: 0, co: [39, 173, 303, 195], no: [106, 151, 310, 170], cb: { pasmien: [48, 135, 62, 148], faillite: [49, 119, 63, 133], avant: [49, 105, 63, 118], nonrap: [48, 90, 62, 104], entier: [221, 135, 235, 149] }, au: [38, 45, 301, 73] },
    { p: 0, co: [318, 173, 577, 195], no: [384, 151, 577, 170], cb: { pasmien: [322, 136, 336, 149], faillite: [323, 120, 336, 133], avant: [323, 105, 336, 118], nonrap: [322, 90, 336, 103], entier: [484, 135, 497, 148] }, au: [317, 45, 576, 73] },
    { p: 1, co: [38, 716, 302, 738], no: [38, 676, 299, 696], cb: { pasmien: [48, 653, 62, 667], faillite: [48, 637, 62, 651], avant: [48, 622, 62, 636], nonrap: [48, 608, 62, 621], entier: [221, 653, 234, 666] }, au: [38, 556, 301, 584] },
    { p: 1, co: [315, 717, 559, 739], no: [316, 676, 558, 696], cb: { pasmien: [323, 653, 337, 666], faillite: [323, 638, 336, 651], avant: [323, 622, 336, 636], nonrap: [323, 608, 336, 622], entier: [484, 653, 497, 666] }, au: [315, 556, 559, 584] },
    { p: 1, co: [38, 508, 302, 530], no: [38, 464, 299, 484], cb: { pasmien: [48, 439, 62, 452], faillite: [48, 424, 62, 438], avant: [48, 409, 62, 423], nonrap: [49, 393, 63, 407], entier: [221, 439, 235, 452] }, au: [47, 351, 310, 379] },
    { p: 1, co: [317, 508, 560, 530], no: [316, 464, 560, 484], cb: { pasmien: [323, 440, 336, 453], faillite: [323, 424, 336, 437], avant: [323, 409, 336, 423], nonrap: [323, 393, 336, 407], entier: [484, 443, 497, 456] }, au: [320, 351, 562, 379] }
  ];

  // Contexte de lecture d'un dossier de contestation. o : { ui, cr:{nb}, today }
  function ctxCr(v, o) {
    o = o || {};
    var rv = lecteur(v), today = o.today || aujourdhuiIso(), C = { rv: rv, today: today, dateOk: dateOkFn(rv, today), ui: o.ui === 'en' ? 'en' : 'fr' };
    C.L = function (fr, en) { return C.ui === 'fr' ? fr : en; };
    C.eq = function () { return !!rv('cr_eq'); };
    C.tu = function () { return !!rv('cr_tu'); };
    C.comptes = function () { return !!rv('cr_t_comptes'); };
    C.perso = function () { return !!rv('cr_t_perso'); };
    C.maxComptes = function () { return C.tu() && !C.eq() ? 6 : 3; };
    C.nbBrut = function () {
      if (o.cr && o.cr.nb != null) return o.cr.nb;
      var n = 1; for (var i = 1; i <= 6; i++) if (rv('cr_c' + i + '_cred')) n = i;
      return n;
    };
    C.nb = function () { return Math.max(1, Math.min(C.nbBrut(), C.maxComptes())); };
    C.limiteMots = function () { return C.tu() ? (rv('cr_a_prov') === 'Saskatchewan' ? 200 : 100) : 400; };
    C.dateC = function (iso) { return dateIso(iso) ? iso.replace(/-/g, '') : ''; };
    C.declPage = function () { return mots(rv('cr_decl')) > 0; };
    C.formsDe = function (b) {
      var l = [];
      if (b === 'eq') { if (C.comptes()) l.push('acc'); if (C.perso()) l.push('pi'); }
      else if (b === 'tu') l.push('tu');
      return l;
    };
    C.pagesEq = function (f) {
      if (f === 'pi') return [0, 1, 2];
      var n = C.nb(), pa = [0, 1];
      if (n >= 2 || ['autre', 'faillite'].indexOf(rv('cr_c1_motif')) !== -1) pa.push(2);
      if (n >= 3) pa.push(3);
      pa.push(4); return pa;
    };
    C.nbPagesBureau = function (b) {
      var n = 0; C.formsDe(b).forEach(function (f) { n += f === 'tu' ? 2 : C.pagesEq(f).length; });
      return n + (C.declPage() ? 1 : 0);
    };
    return C;
  }

  // Valeurs des cases du formulaire Equifax f ('acc' ou 'pi')
  function crVal(C, f) {
    var rv = C.rv, vv = {}, k = {};
    function maj(s) { return nettoyer(s).toUpperCase(); }
    function provEn(fr) { var p = provRc(fr); return p ? p.en : ''; }
    function adr(p, q) {
      vv[q + 'stnum'] = maj(rv('cr_' + p + '_no')); vv[q + 'stnom'] = maj(rv('cr_' + p + '_rue')); vv[q + 'unite'] = maj(rv('cr_' + p + '_app'));
      vv[q + 'ville'] = maj(rv('cr_' + p + '_ville')); vv[q + 'prov'] = maj(provEn(rv('cr_' + p + '_prov'))); vv[q + 'cp'] = cpNormal(rv('cr_' + p + '_cp')).replace(/\s/g, '');
    }
    vv.num = chiffres(rv('cr_numeq')); vv.prenom = maj(rv('cr_prenom')); vv.prenom2 = maj(rv('cr_prenom2')); vv.nom = maj(rv('cr_nom')); vv.suffixe = maj(rv('cr_suffixe'));
    adr('a', ''); vv.dob = C.dateC(rv('cr_naiss')); vv.nas = chiffres(rv('cr_nas')); vv.tel = chiffres(rv('cr_tel')).slice(-10);
    vv.courriel = nettoyer(rv('cr_courriel')).toLowerCase(); vv.dsoumis = C.dateC(rv('cr_datesign'));
    if (rv('cr_p_oui')) { adr('p', 'a_'); vv.a_de = C.dateC(rv('cr_p_de')); vv.a_a = C.dateC(rv('cr_p_a')); }
    if (f === 'acc') {
      for (var i = 1; i <= Math.min(C.nb(), 3); i++) {
        var p = 'cr_c' + i + '_', mo = rv(p + 'motif'), q = 'c' + i + '_';
        vv[q + 'cred'] = maj(rv(p + 'cred')); vv[q + 'num'] = maj(rv(p + 'num'));
        if (mo === 'ferme') { k[q + 'maj'] = k[q + 'ferme'] = 1; vv[q + 'ferme'] = C.dateC(rv(p + 'date')); }
        else if (mo === 'note') { k[q + 'maj'] = k[q + 'note'] = 1; vv[q + 'note'] = maj(rv(p + 'cote') + ' ' + rv(p + 'cotedate')); }
        else if (mo === 'pasmien') { k[q + 'lit'] = k[q + 'pasmien'] = 1; }
        else if (mo === 'fraude') { k[q + 'lit'] = k[q + 'fraude'] = 1; }
        else if (mo === 'faillite') { k[q + 'autre'] = 1; vv[q + 'autre'] = 'ACCOUNT INCLUDED IN A BANKRUPTCY. SEE ATTACHED DOCUMENTS.'; }
        else if (mo === 'autre') { k[q + 'autre'] = 1; vv[q + 'autre'] = maj(rv(p + 'autre')); }
      }
    } else {
      if (rv('cr_s_nom')) k.svc_nom = 1; if (rv('cr_s_adr')) k.svc_adr = 1; if (rv('cr_s_dob')) k.svc_dob = 1; if (rv('cr_s_nas')) k.svc_nas = 1; if (rv('cr_s_tel')) k.svc_tel = 1;
      vv.f_prenom = maj(rv('cr_anc_prenom')); vv.f_nom = maj(rv('cr_anc_nom')); vv.a_nas = chiffres(rv('cr_anc_nas'));
      vv.comm = nettoyer(rv('cr_s_detail'));
    }
    return { v: vv, k: k };
  }

  // TransUnion : champs du formulaire (rectangles PDF, origine en bas à gauche)
  function crPlanTu(C) {
    var rv = C.rv, L = C.L, P = [[], []];
    function T(p, r, s, o) { if (s) P[p].push({ k: 't', r: r, s: String(s), o: o || {} }); }
    function X(p, r) { P[p].push({ k: 'x', r: r }); }
    function nm(s) { return nettoyer(s); }
    var nomR = [41, 530, 310, 545];
    P[0].push({ k: 'tx', x: 44, w: 78, r: nomR, s: nm(rv('cr_nom')) }); P[0].push({ k: 'tx', x: 124, w: 62, r: nomR, s: nm(rv('cr_prenom')) });
    P[0].push({ k: 'tx', x: 190, w: 62, r: nomR, s: nm(rv('cr_prenom2')) }); P[0].push({ k: 'tx', x: 258, w: 50, r: nomR, s: nm(rv('cr_suffixe')) });
    T(0, [326, 533, 467, 551], chiffres(rv('cr_nas')).replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3'));
    T(0, [42, 480, 308, 496], (rv('cr_a_no') + ' ' + rv('cr_a_rue')).trim());
    T(0, [44, 446, 89, 464], rv('cr_a_app')); T(0, [93, 446, 212, 463], rv('cr_a_ville')); T(0, [219, 445, 253, 463], (provRc(rv('cr_a_prov')) || {}).ab || ''); T(0, [258, 446, 306, 463], cpNormal(rv('cr_a_cp')));
    if (rv('cr_p_oui')) {
      T(0, [326, 484, 555, 499], (rv('cr_p_no') + ' ' + rv('cr_p_rue')).trim());
      T(0, [327, 459, 372, 474], rv('cr_p_app')); T(0, [374, 459, 471, 474], rv('cr_p_ville')); T(0, [478, 460, 512, 474], (provRc(rv('cr_p_prov')) || {}).ab || ''); T(0, [519, 459, 567, 475], cpNormal(rv('cr_p_cp')));
    }
    T(0, [45, 383, 267, 405], rv('cr_naiss'));
    if (rv('cr_courriel')) { T(0, [325, 389, 546, 405], rv('cr_courriel')); X(0, [425, 407, 437, 419]); } else X(0, [566, 408, 578, 421]);
    T(0, [47, 282, 200, 298], chiffres(rv('cr_tel')).replace(/^(\d{3})(\d{3})(\d{4})$/, '$1 $2 $3'));
    T(0, [496, 252, 579, 278], rv('cr_datesign'));
    for (var i = 0; i < Math.min(C.nb(), 6) && C.comptes(); i++) {
      var b = TU_BLOCS[i], p = 'cr_c' + (i + 1) + '_', mo = rv(p + 'motif'), autre = '';
      T(b.p, b.co, rv(p + 'cred')); T(b.p, b.no, rv(p + 'num'));
      if (mo === 'pasmien') X(b.p, b.cb.pasmien);
      else if (mo === 'faillite') X(b.p, b.cb.faillite);
      else if (mo === 'ferme') { X(b.p, b.cb.entier); autre = L('Compte fermé le ', 'Account closed on ') + rv(p + 'date'); }
      else if (mo === 'note') autre = L('Retards de paiement ou cote inexacts : ', 'Wrong late payments or rating: ') + rv(p + 'cote') + ' ' + rv(p + 'cotedate');
      else if (mo === 'fraude') autre = L('Victime de fraude ou de vol d’identité', 'Victim of fraud or identity theft');
      else if (mo === 'autre') autre = rv(p + 'autre');
      if (autre) P[b.p].push({ k: 'm', r: b.au, s: nm(autre) });
    }
    var com = C.perso() ? L('Renseignements personnels à corriger : ', 'Personal information to correct: ') + rv('cr_s_detail') : '';
    if (com) { P[1].push({ k: 'm', r: [41, 310, 566, 336], s: nm(com) }); X(0, [556, 304, 568, 316]); } else X(0, [556, 287, 568, 299]);
    P[1].push({ k: 't', r: [476, 112, 558, 138], s: rv('cr_datesign'), o: {} });
    return P;
  }

  var LW_DEFAUT_PT = 0.200025 * 72 / 25.4;
  // Plan d'un bureau ('eq' ou 'tu'). o : { ui, cr:{nb}, sig, formsSeuls (une seule forme : 'acc'|'pi'|'tu'), today }
  function planCredit(v, bureau, o) {
    o = o || {};
    var C = ctxCr(v, o), rv = C.rv, L = C.L, sig = o.sig || null, pages = [], lwCourant = LW_DEFAUT_PT;
    var formes = o.formsSeuls ? [o.formsSeuls] : C.formsDe(bureau);
    function nouvelle(ops) { var pg = { ops: ops }; pages.push(pg); return pg; }
    formes.forEach(function (f) {
      var i, ops;
      if (f === 'tu') {
        var plan = crPlanTu(C);
        for (var p = 0; p < 2; p++) {
          ops = [{ t: 'img', id: 'cr.tu:' + p, x: 0, y: 0, w: W_PT, h: H_PT }];
          if (p === 1) {
            var NOIR = [0, 0, 0];
            ['Si votre fiche de crédit vient à changer suite à notre enquête, ou si une déclaration du consommateur y est ajoutée, une fiche', 'modifiée sera envoyée aux entreprises ayant demandé votre fiche, et ce, en vertu des lignes directrices provinciales. Nous vous', 'recommandons de ne pas faire de demandes de crédit pendant que votre contestation est en instance.'].forEach(function (ln, i2) {
              var wl = largeur(ln, 9, 'times', 'bold', 'pt');
              ops.push(opTxt(ln, 36, 579 + i2 * 11.6, i2 < 2 ? Math.min(9.6, 9 * 529 / wl) : 9, NOIR, null, 'times', 'bold'));
            });
          }
          ops.push(opTxt('TransUnion of Canada, Inc.', 478, 772, 8, [0, 0, 0], null, 'times', 'normal'));
          plan[p].forEach(function (op) {
            var r = op.r;
            if (op.k === 't') {
              var s = nettoyer(op.s), fs = 10; while (fs > 6 && largeur(s, fs, 'helvetica', 'normal', 'pt') > r[2] - r[0] - 4) fs -= 0.5;
              ops.push(opTxt(s, r[0] + 2, H_PT - (r[1] + (r[3] - r[1]) / 2 - 3.4), fs));
            } else if (op.k === 'tx') {
              var s2 = nettoyer(op.s), fs2 = 10; if (!s2) return;
              while (fs2 > 5.5 && largeur(s2, fs2, 'helvetica', 'normal', 'pt') > op.w) fs2 -= 0.5;
              ops.push(opTxt(s2, op.x, H_PT - (r[1] + (r[3] - r[1]) / 2 - 3.4), fs2));
            } else if (op.k === 'x') {
              lwCourant = 1.4;
              ops.push(opLigne(r[0] + 2.4, H_PT - r[1] - 2.4, r[2] - 2.4, H_PT - r[3] + 2.4, 1.4));
              ops.push(opLigne(r[0] + 2.4, H_PT - r[3] + 2.4, r[2] - 2.4, H_PT - r[1] - 2.4, 1.4));
            } else if (op.k === 'm') {
              couper(op.s, r[2] - r[0] - 6, 9, 'helvetica', 'normal', 'pt').slice(0, 2).forEach(function (l, i2) { ops.push(opTxt(l, r[0] + 3, H_PT - (r[3] - 10 - i2 * 11), 9)); });
            }
          });
          if (sig && p === 0) { var d = dimSig(sig, 220, 22); ops.push({ t: 'img', id: 'sig', x: 246, y: H_PT - 276, w: d.w, h: d.h }); }
          if (sig && p === 1) { var d2 = dimSig(sig, 220, 22); ops.push({ t: 'img', id: 'sig', x: 90, y: H_PT - 136, w: d2.w, h: d2.h }); }
          nouvelle(ops);
        }
      } else {
        var vals = crVal(C, f), spec = CR_SPEC[f];
        C.pagesEq(f).forEach(function (p) {
          ops = [{ t: 'img', id: 'cr.' + f + ':' + p, x: 0, y: 0, w: W_PT, h: H_PT }];
          spec.forEach(function (fd) {
            if (fd.p !== p) return;
            if (fd.k === 'c' || fd.k === 'g') {
              var s = vals.v[fd.id]; if (!s) return;
              var rh = fd.k === 'g' ? (fd.yb - fd.yt) / fd.rows : fd.yb - fd.yt, fs = Math.min(fd.k === 'g' ? 9.5 : 11, fd.w * 0.7);
              var lignes;
              if (fd.k === 'c') lignes = [s];
              else {
                lignes = []; var cur = '';
                s.split(/\s+/).forEach(function (w) {
                  while (w.length > fd.n) { if (cur) { lignes.push(cur); cur = ''; } lignes.push(w.slice(0, fd.n)); w = w.slice(fd.n); }
                  if ((cur ? cur + ' ' : '').length + w.length <= fd.n) cur = cur ? cur + ' ' + w : w; else { lignes.push(cur); cur = w; }
                });
                if (cur) lignes.push(cur);
              }
              lignes.slice(0, fd.k === 'g' ? fd.rows : 1).forEach(function (ln, r) {
                for (var i2 = 0; i2 < ln.length && i2 < fd.n; i2++) ops.push(opTxt(ln.charAt(i2), fd.x0 + fd.w * (i2 + 0.5), fd.yt + r * rh + rh / 2 + 0.36 * fs, fs, null, 'center'));
              });
            } else if (fd.k === 'x') {
              if (!vals.k[fd.id]) return;
              lwCourant = 1.3;
              ops.push(opLigne(fd.cx - 3.3, fd.cy - 3.3, fd.cx + 3.3, fd.cy + 3.3, 1.3));
              ops.push(opLigne(fd.cx - 3.3, fd.cy + 3.3, fd.cx + 3.3, fd.cy - 3.3, 1.3));
            } else if (fd.k === 'b') {
              if (fd.id === 'sig') {
                if (!sig) return;
                var d3 = dimSig(sig, fd.x1 - fd.x0 - 12, fd.yb - fd.yt - 10);
                ops.push({ t: 'img', id: 'sig', x: fd.x0 + 8, y: fd.yt + 5 + (fd.yb - fd.yt - 10 - d3.h) / 2, w: d3.w, h: d3.h });
              } else if (fd.id === 'comm') {
                var tt = vals.v.comm; if (!tt) return;
                couper(tt, fd.x1 - fd.x0 - 12, 10, 'helvetica', 'normal', 'pt').slice(0, 5).forEach(function (l, i2) { ops.push(opTxt(l, fd.x0 + 6, fd.yt + 14 + i2 * 13, 10)); });
              }
            }
          });
          nouvelle(ops);
        });
      }
    });
    if (!o.formsSeuls && C.declPage()) {
      var GRIS = [20, 20, 20], fr = C.ui === 'fr', x = 62, y = 80, w = 488, ops2 = [];
      ops2.push(opTxt(fr ? 'Déclaration du consommateur' : 'Consumer statement', x, y, 16, GRIS, null, 'helvetica', 'bold')); y += 26;
      var tete = [(rv('cr_prenom') + ' ' + rv('cr_nom')).trim(), [rv('cr_a_no'), rv('cr_a_rue')].join(' ').trim() + (rv('cr_a_app') ? ', ' + (fr ? 'app. ' : 'unit ') + rv('cr_a_app') : ''), [rv('cr_a_ville'), (provRc(rv('cr_a_prov')) || {}).ab || '', cpNormal(rv('cr_a_cp'))].join(' ').trim(), (fr ? 'Date de naissance : ' : 'Date of birth: ') + rv('cr_naiss')];
      tete.forEach(function (l) { if (l) { ops2.push(opTxt(nettoyer(l), x, y, 11, GRIS)); y += 15; } });
      y += 8;
      couper(fr ? 'Je demande d’ajouter la déclaration suivante à mon dossier de crédit, au sujet des renseignements que je conteste.' : 'I ask that the following statement be added to my credit file, about the information I am disputing.', w, 10, 'helvetica', 'italic', 'pt').forEach(function (l) { ops2.push(opTxt(l, x, y, 10, GRIS, null, 'helvetica', 'italic')); y += 13; });
      y += 10;
      couper(nettoyer(rv('cr_decl')), w, 11.5, 'helvetica', 'normal', 'pt').forEach(function (l) { ops2.push(opTxt(l, x, y, 11.5, GRIS)); y += 16; });
      y += 40;
      ops2.push(opTxt(fr ? 'Signature : ' : 'Signature: ', x, y + 4, 10, GRIS));
      ops2.push(opLigne(x + 62, y + 6, x + 300, y + 6, lwCourant));
      ops2.push(opTxt((fr ? 'Date : ' : 'Date: ') + rv('cr_datesign'), x + 330, y + 4, 10, GRIS));
      if (sig) { var d4 = dimSig(sig, 220, 26); ops2.push({ t: 'img', id: 'sig', x: x + 68, y: y + 4 - d4.h, w: d4.w, h: d4.h }); }
      nouvelle(ops2);
    }
    return { unit: 'pt', taille: [W_PT, H_PT], pages: pages };
  }

  /* ------------------------------------------------------------ validation et documents à joindre */
  function T2(fr, en) { return { fr: fr, en: en }; }
  function nomBase(s, defaut) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || defaut; }

  // Lettres libres : identifiants des réponses manquantes ou invalides. champs : liste des champs du modèle (definitions)
  function manquesLettre(champs, v, o) {
    o = o || {};
    var rv = lecteur(v), r = ['exp_nom', 'exp_ligne', 'exp_ville', 'exp_prov', 'exp_cp', 'dest_nom', 'dest_ligne', 'dest_ville', 'dest_prov', 'dest_cp', 'date_lettre'], manque = [];
    (champs || []).forEach(function (c) { if (c.requis || c.req) r.push(c.id); });
    r.forEach(function (id) {
      var ok = !!rv(id), c = null;
      (champs || []).forEach(function (x) { if (x.id === id) c = x; });
      if (ok && c && c.type === 'montant') ok = nombre(rv(id)) !== null && nombre(rv(id)) > 0;
      if (ok && c && c.type === 'nombre') ok = parseInt(rv(id), 10) > 0;
      if (ok && c && c.type === 'choix') { ok = false; (c.options || []).forEach(function (x) { if (x.valeur === rv(id)) ok = true; }); }
      if (!ok) manque.push(id);
    });
    ['exp_cp', 'dest_cp'].forEach(function (id) { if (rv(id) && !cpValide(rv(id)) && manque.indexOf(id) === -1) manque.push(id); });
    return manque;
  }

  var RC_ETAPES = ['intro', 'vous', 'adresse', 'civil', 'statut', 'schres', 'schstat', 'schrev', 'enfants', 'signature', 'recap'];
  // Étapes actives du questionnaire RC66 pour ces réponses
  function rcEtapesActives(C) {
    var gen = C.schPourPdf() && !C.opt.schPerso, pers = C.schPers(), nouv = pers.filter(C.schNouv), r = [];
    RC_ETAPES.forEach(function (e) {
      if (e === 'schres' || e === 'schrev') { if (gen && nouv.length) r.push(e); }
      else if (e === 'schstat') { if (gen && pers.length) r.push(e); }
      else r.push(e);
    });
    return r;
  }
  function rcSchManques(C, e) {
    var rv = C.rv, m = [], pers = C.schPers();
    function ok(id, fut) { if (!C.dateOk(id, fut)) m.push(id); }
    if (e === 'schres') {
      pers.filter(C.schNouv).forEach(function (p) {
        var q = 'rc_sch_' + p + '_';
        if (!rv(q + 'type')) m.push(q + 'type');
        else if (rv(q + 'type') === 'nouvel') ok(q + 'res');
        else { if (!rv(q + 'provav')) m.push(q + 'provav'); ok(q + 'coupe'); ok(q + 'retab'); }
      });
    } else if (e === 'schstat') {
      pers.forEach(function (p) {
        var q = 'rc_sch_' + p + '_', un = false;
        if (rv(q + 'cit')) { un = true; ok(q + 'citd'); }
        if (rv(q + 'rp')) { un = true; ok(q + 'rpd'); }
        if (rv(q + 'pp')) { un = true; ok(q + 'ppd'); }
        if (rv(q + 'ind')) { un = true; ok(q + 'indd'); }
        if (rv(q + 'rt')) {
          un = true; ok(q + 'rt1d', true); ok(q + 'rt1f', true);
          if (rv(q + 'rt2n') || rv(q + 'rt2d') || rv(q + 'rt2f')) { ok(q + 'rt2d', true); ok(q + 'rt2f', true); }
        }
        if (!un) m.push(q + 'stat');
      });
    } else if (e === 'schrev') {
      var an = parseInt(rv('rc_sch_an'), 10), cetAn = parseInt(C.today.slice(0, 4), 10);
      if (!(an >= 1950 && an <= cetAn + 1)) m.push('rc_sch_an');
      C.schPersRev().forEach(function (p) {
        ['ra', 'rb'].concat(C.schCSousAn() ? ['rc'] : []).forEach(function (s) { if (C.montantSch('rc_sch_' + p + '_' + s) === null) m.push('rc_sch_' + p + '_' + s); });
      });
    }
    return m;
  }
  // Réponses manquantes ou invalides d'une étape du questionnaire RC66
  function rcManquesEtape(C, e) {
    var rv = C.rv, dateOk = C.dateOk, conjoint = C.conjoint, m = [];
    function need(id) { if (!rv(id)) m.push(id); }
    function adr(pfx) { need(pfx + '_ligne'); need(pfx + '_ville'); need(pfx + '_prov'); if (!cpValide(rv(pfx + '_cp'))) m.push(pfx + '_cp'); }
    function enfant(n) {
      var p = 'rc_e' + n + '_';
      need(p + 'prenom'); need(p + 'nom'); need(p + 'sexe'); if (!dateOk(p + 'naiss')) m.push(p + 'naiss'); need(p + 'ville'); need(p + 'prov'); need(p + 'plus60');
      if (rv(p + 'plus60') === 'oui' && !rv(p + 'depuisnaiss') && !dateOk(p + 'depuis')) m.push(p + 'depuis');
      if (rv(p + 'plus60') === 'non') { need(p + 'partage'); if (rv(p + 'partage') === '40' && !dateOk(p + 'date40')) m.push(p + 'date40'); }
    }
    if (e === 'vous') {
      if (!rv('rc_sansnas') && chiffres(rv('rc_nas')).length !== 9) m.push('rc_nas');
      need('rc_prenom'); need('rc_nom'); if (!dateOk('rc_naiss')) m.push('rc_naiss'); need('rc_langue');
    } else if (e === 'adresse') {
      adr('rcp'); if (!rv('rc_memeadr')) adr('rcd'); need('rc_chgprov');
      if (rv('rc_chgprov') === 'oui') { need('rc_ancprov'); if (!dateOk('rc_dateprov')) m.push('rc_dateprov'); }
    } else if (e === 'civil') {
      need('rc_civil');
      if (rv('rc_civil') && rv('rc_civil') !== 'celib' && !dateOk('rc_civildate')) m.push('rc_civildate');
      if (conjoint()) {
        need('rc_s_prenom'); need('rc_s_nom'); if (!dateOk('rc_s_naiss')) m.push('rc_s_naiss');
        if (rv('rc_s_nas') && chiffres(rv('rc_s_nas')).length !== 9) m.push('rc_s_nas');
      }
    } else if (e === 'statut') {
      need('rc_cit'); need('rc_new'); if (conjoint()) { need('rc_s_cit'); need('rc_s_new'); }
    } else if (e === 'schres' || e === 'schstat' || e === 'schrev') {
      m = m.concat(rcSchManques(C, e));
    } else if (e === 'enfants') {
      enfant(1); if (C.opt.deux) enfant(2); need('rc_premiere');
    } else if (e === 'signature') {
      if (!dateOk('rc_datesign', true)) m.push('rc_datesign');
    }
    return m;
  }

  function rcRetro(C) {
    var rv = C.rv, d0 = new Date(C.today + 'T12:00:00'); d0.setMonth(d0.getMonth() - 11);
    var seuil = aujourdhuiIso(d0), r = false;
    for (var n = 1; n <= (C.opt.deux ? 2 : 1); n++) {
      var p = 'rc_e' + n + '_', d = '';
      if (rv(p + 'plus60') === 'oui') d = rv(p + 'depuisnaiss') ? rv(p + 'naiss') : rv(p + 'depuis');
      else if (rv(p + 'plus60') === 'non' && rv(p + 'partage') === '40') d = rv(p + 'date40');
      if (dateIso(d) && d < seuil) r = true;
    }
    return r;
  }
  function rcFlags(C) {
    var rv = C.rv;
    if (C.opt.raccourci) return { premiere: !!rv('rc_f_premiere'), sch: !!rv('rc_f_sch'), plus2: !!rv('rc_f_plus2'), retro: !!rv('rc_f_retro'), pere: !!rv('rc_f_pere') };
    return { premiere: rv('rc_premiere') === 'oui', sch: C.schRequis(), plus2: !!rv('rc_plus2'), retro: rcRetro(C), pere: !!rv('rc_pere') };
  }
  // Documents à joindre au RC66 : [{ id, req, fr:{titre,aide}, en:{titre,aide}, lien? }]
  function docsRc66(C) {
    var f = rcFlags(C), d = [];
    function doc(id, req, titre, aide, lien) { var o = { id: id, req: req, fr: { titre: titre.fr, aide: aide.fr }, en: { titre: titre.en, aide: aide.en } }; if (lien) o.lien = lien; d.push(o); }
    if (f.premiere || f.retro) doc('naissance', true, T2('Preuve de naissance de chaque enfant', 'Proof of birth for each child'),
      T2('Un des documents suivants avec le prénom, le nom et la date de naissance de l’enfant : certificat de naissance, copie certifiée de l’enregistrement de naissance, dossier de naissance de l’hôpital, passeport. Pour un enfant né à l’extérieur du Canada, un document d’IRCC est aussi accepté (carte de résident permanent, confirmation de résidence permanente, certificat de citoyenneté, permis de séjour temporaire).',
        'One of these documents showing the child’s first name, last name and date of birth: birth certificate, certified copy of the birth registration, hospital birth record, passport. For a child born outside Canada, an IRCC document is also accepted (permanent resident card, confirmation of permanent residence, citizenship certificate, temporary resident permit).'));
    if (f.sch && !C.schGenere()) doc('sch', true, T2('Formulaire RC66SCH rempli et signé', 'Completed and signed form RC66SCH'),
      T2('Statut au Canada et renseignements sur les revenus. Requis si vous (ou votre conjoint) êtes un nouvel arrivant ou n’êtes pas citoyen canadien depuis 12 mois. Téléchargez-le sur le site de l’ARC, remplissez-le, signez-le et téléversez-le ici.',
        'Status in Canada and income information. Required if you (or your partner) are a newcomer or have not been a Canadian citizen for 12 months. Download it from the CRA website, fill it in, sign it and upload it here.'),
      { cle: 'sch', fr: 'Formulaire RC66SCH sur canada.ca', en: 'Form RC66SCH on canada.ca' });
    if (f.retro) {
      doc('residence', true, T2('Preuve de résidence au Canada (au moins 3 documents)', 'Proof of residence in Canada (at least 3 documents)'),
        T2('Par exemple : bail ou reçus de loyer, factures de services publics, relevés bancaires ou de carte de crédit, polices d’assurance, permis de conduire. Ils doivent contenir votre nom complet, votre adresse et une date dans la période visée.',
          'For example: lease or rent receipts, utility bills, bank or credit card statements, insurance policies, driver’s licence. They must show your full name, your address and a date in the period covered.'));
      doc('soins', true, T2('Preuve que vous êtes le principal responsable de l’enfant (3 documents)', 'Proof you are the main caregiver of the child (3 documents)'),
        T2('Par exemple : lettre de l’école ou de la garderie, fiche d’inscription scolaire, bulletin de l’enfant, reçu d’une activité, décision de la cour ou entente de séparation, lettre d’une personne en position d’autorité.',
          'For example: letter from the school or daycare, school registration form, report card, receipt for an activity, court order or separation agreement, letter from a person in authority.'));
      doc('statutdoc', true, T2('Preuve de votre statut de citoyen ou d’immigrant', 'Proof of your citizenship or immigration status'),
        T2('Pour vous et pour votre époux ou conjoint de fait : carte de résident permanent, confirmation de résidence permanente, certificat de citoyenneté, permis.', 'For you and your spouse or common-law partner: permanent resident card, confirmation of permanent residence, citizenship certificate, permit.'));
    } else if (f.sch) {
      doc('statutdoc', false, T2('Preuve de votre statut au Canada (recommandé)', 'Proof of your status in Canada (recommended)'),
        T2('Carte de résident permanent, confirmation de résidence permanente, permis de travail ou d’études. L’ARC peut vous la demander plus tard : la joindre peut éviter un délai.', 'Permanent resident card, confirmation of permanent residence, work or study permit. The CRA may ask for it later: attaching it can avoid a delay.'));
    }
    if (f.plus2) doc('rc661', true, T2('Formulaire RC66-1 ou feuille séparée pour les enfants supplémentaires', 'Form RC66-1 or separate sheet for additional children'),
      T2('Les mêmes renseignements que l’étape 6 pour chaque enfant au-delà de deux.', 'The same information as step 6 for each child beyond two.'));
    if (f.pere) doc('lettre', true, T2('Lettre signée par le parent de sexe féminin', 'Letter signed by the female parent'),
      T2('Elle indique que l’autre parent avec lequel elle vit est le principal responsable de tous les enfants du foyer.', 'It states that the other parent she lives with is the main caregiver of all the children in the household.'));
    doc('autres', false, T2('Autres documents (facultatif)', 'Other documents (optional)'), T2('Tout autre document que vous voulez joindre à la demande.', 'Any other document you want to attach to the application.'));
    return d;
  }

  // Étapes actives du questionnaire de contestation
  var CR_ETAPES = ['intro', 'quoi', 'vous', 'adresse', 'comptes', 'perso', 'decl', 'signature', 'recap'];
  function crEtapesActives(C) {
    return CR_ETAPES.filter(function (e) { if (e === 'comptes') return C.comptes(); if (e === 'perso') return C.perso(); return true; });
  }
  function crManquesEtape(C, e) {
    var rv = C.rv, dateOk = C.dateOk, m = [];
    function need(id) { if (!rv(id)) m.push(id); }
    function lim(id) { if (C.eq() && CR_LIM[id.replace(/^cr_/, '')] && rv(id).length > CR_LIM[id.replace(/^cr_/, '')]) m.push(id); }
    function adr(p) { need('cr_' + p + '_rue'); need('cr_' + p + '_ville'); need('cr_' + p + '_prov'); if (!cpValide(rv('cr_' + p + '_cp'))) m.push('cr_' + p + '_cp'); ['no', 'rue', 'app', 'ville'].forEach(function (k) { lim('cr_' + p + '_' + k); }); }
    if (e === 'quoi') { if (!C.eq() && !C.tu()) m.push('cr_bureau'); if (!C.comptes() && !C.perso()) m.push('cr_type'); }
    else if (e === 'vous') {
      need('cr_prenom'); need('cr_nom'); if (!dateOk('cr_naiss')) m.push('cr_naiss');
      ['prenom', 'prenom2', 'nom', 'suffixe', 'courriel'].forEach(function (k) { lim('cr_' + k); });
      if (rv('cr_nas') && chiffres(rv('cr_nas')).length !== 9) m.push('cr_nas');
      if (C.eq()) { if (chiffres(rv('cr_tel')).length < 10) m.push('cr_tel'); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rv('cr_courriel'))) m.push('cr_courriel'); }
      else if (rv('cr_courriel') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rv('cr_courriel'))) m.push('cr_courriel');
    } else if (e === 'adresse') {
      adr('a');
      if (rv('cr_p_oui')) { adr('p'); if (C.eq()) { if (!dateOk('cr_p_de')) m.push('cr_p_de'); if (!dateOk('cr_p_a')) m.push('cr_p_a'); } }
    } else if (e === 'comptes') {
      for (var i = 1; i <= C.nb(); i++) {
        var p = 'cr_c' + i + '_', mo = rv(p + 'motif');
        need(p + 'cred'); need(p + 'motif');
        if (C.eq() && rv(p + 'cred').length > 20) m.push(p + 'cred');
        if (C.eq() && rv(p + 'num').length > 16) m.push(p + 'num');
        if (mo === 'ferme' && !dateOk(p + 'date')) m.push(p + 'date');
        if (mo === 'note') { need(p + 'cote'); if (!dateOk(p + 'cotedate')) m.push(p + 'cotedate'); }
        if (mo === 'autre') need(p + 'autre');
      }
    } else if (e === 'perso') {
      if (!rv('cr_s_nom') && !rv('cr_s_adr') && !rv('cr_s_dob') && !rv('cr_s_nas') && !rv('cr_s_tel')) m.push('cr_s_quoi');
      need('cr_s_detail'); lim('cr_anc_prenom'); lim('cr_anc_nom');
      if (rv('cr_anc_nas') && chiffres(rv('cr_anc_nas')).length !== 9) m.push('cr_anc_nas');
    } else if (e === 'decl') {
      if (mots(rv('cr_decl')) > C.limiteMots()) m.push('cr_decl');
    } else if (e === 'signature') {
      if (!dateOk('cr_datesign', true)) m.push('cr_datesign');
    }
    return m;
  }
  // Documents à joindre pour un bureau ('eq' ou 'tu')
  function docsCredit(C, b) {
    var d = [], avecFerme = false;
    for (var i = 1; i <= C.nb(); i++) if (['ferme', 'note'].indexOf(C.rv('cr_c' + i + '_motif')) !== -1) avecFerme = true;
    function doc(id, req, titre, aide) { d.push({ id: id, req: req, fr: { titre: titre.fr, aide: aide.fr }, en: { titre: titre.en, aide: aide.en } }); }
    if (b === 'eq') {
      doc('pieces', true, T2('2 pièces d’identité émises par un gouvernement (recto et verso)', '2 government-issued IDs (front and back)'),
        T2('Elles confirment votre nom légal, votre date de naissance ou votre adresse actuelle : permis de conduire, passeport, certificat de naissance, etc.', 'They confirm your legal name, date of birth or current address: driver’s licence, passport, birth certificate, etc.'));
      doc('adresse', true, T2('1 preuve d’adresse datée de moins de 90 jours', '1 proof of address dated less than 90 days ago'),
        T2('Facture de services publics ou relevé financier à votre nom et à votre adresse actuelle. Masquez les codes de sécurité (CVV) et, de préférence, le détail des transactions.', 'Utility bill or financial statement showing your name and current address. Black out security codes (CVV) and, preferably, transaction details.'));
      if (C.comptes()) doc('creancier', avecFerme, T2('Lettre du prêteur ou du créancier' + (avecFerme ? '' : ' (recommandé)'), 'Letter from the lender or creditor' + (avecFerme ? '' : ' (recommended)')),
        T2('Elle confirme l’état, la propriété et les détails du compte : quatre derniers chiffres du numéro, montant, payé ou réglé, etc.', 'It confirms the status, ownership and details of the account: last 4 digits of the number, amount, paid or settled, etc.'));
    } else {
      doc('pieces', false, T2('Copies de vos pièces d’identité (recommandé)', 'Copies of your ID (recommended)'),
        T2('Le formulaire de TransUnion n’en exige pas, mais le bureau peut vous en demander pour vérifier votre identité. En les joignant, vous évitez un délai.', 'TransUnion’s form does not require any, but the bureau may ask for some to check your identity. Attaching them can avoid a delay.'));
      doc('preuves', false, T2('Documents qui appuient votre contestation', 'Documents that support your dispute'),
        T2('Lettre du prêteur, preuve de paiement, relevé, jugement ou documents de faillite, rapport de police en cas de fraude.', 'Letter from the lender, proof of payment, statement, court or bankruptcy documents, police report in case of fraud.'));
    }
    doc('autres', false, T2('Autres documents (facultatif)', 'Other documents (optional)'), T2('Tout autre document que vous voulez joindre à la demande.', 'Any other document you want to attach to the request.'));
    return d;
  }

  /* ------------------------------------------------------------ adaptateurs : plan de dessin vers PDF */
  // Navigateur : jsPDF 2.5.1. contexte : { fonds: { id: 'data:image/png;base64,...' }, sig: { url, w, h } }
  function rendreJsPdf(JsPDF, plan, contexte) {
    contexte = contexte || {};
    var pdf = new JsPDF({ unit: plan.unit, format: 'letter', orientation: 'portrait' });
    plan.pages.forEach(function (page, i) {
      if (i > 0) pdf.addPage('letter', 'portrait');
      page.ops.forEach(function (o) {
        if (o.t === 'text') {
          pdf.setFont(o.f, o.st); pdf.setFontSize(o.fs); pdf.setTextColor(o.c[0], o.c[1], o.c[2]);
          if (o.a) pdf.text(o.s, o.x, o.y, { align: o.a }); else pdf.text(o.s, o.x, o.y);
        } else if (o.t === 'line') {
          pdf.setDrawColor(o.c[0], o.c[1], o.c[2]); pdf.setLineWidth(o.lw); pdf.line(o.x1, o.y1, o.x2, o.y2);
        } else if (o.t === 'img') {
          var src = o.id === 'sig' ? (contexte.sig && contexte.sig.url) : (contexte.fonds || {})[o.id];
          if (src) pdf.addImage(src, /^data:image\/jpe?g/i.test(src) ? 'JPEG' : 'PNG', o.x, o.y, o.w, o.h, undefined, 'FAST');
        }
      });
    });
    return pdf;
  }

  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function octetsDeUrl(url) {
    var b = String(url).replace(/^data:[^,]*,/, '').replace(/[^A-Za-z0-9+/]/g, '');
    var n = Math.floor(b.length * 3 / 4), out = new Uint8Array(n), j = 0;
    for (var i = 0; i < b.length; i += 4) {
      var a = B64.indexOf(b.charAt(i)), c = B64.indexOf(b.charAt(i + 1)), d = i + 2 < b.length ? B64.indexOf(b.charAt(i + 2)) : -1, e = i + 3 < b.length ? B64.indexOf(b.charAt(i + 3)) : -1;
      if (j < n) out[j++] = (a << 2) | (c >> 4);
      if (d >= 0 && j < n) out[j++] = ((c & 15) << 4) | (d >> 2);
      if (e >= 0 && j < n) out[j++] = ((d & 3) << 6) | e;
    }
    return out;
  }
  var WIN_SPECIAUX = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
  function pourWinAnsi(s) {
    var r = '';
    for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); r += (c >= 32 && c <= 126) || (c >= 160 && c <= 255) || WIN_SPECIAUX.indexOf(s.charAt(i)) !== -1 ? s.charAt(i) : '?'; }
    return r;
  }
  // Node (ou navigateur) : pdf-lib 1.17.1. Renvoie une promesse de Uint8Array.
  function rendrePdfLib(PDFLib, plan, contexte) {
    contexte = contexte || {};
    var k = plan.unit === 'mm' ? K_MM : 1, W = Math.round(plan.taille[0] * k * 1000) / 1000, H = Math.round(plan.taille[1] * k * 1000) / 1000, SF = PDFLib.StandardFonts, rgb = PDFLib.rgb;
    var doc, polices = {}, images = {};
    function cle(f, st) { return f === 'times' ? (st === 'bold' ? SF.TimesRomanBold : SF.TimesRoman) : (st === 'bold' ? SF.HelveticaBold : (st === 'italic' ? SF.HelveticaOblique : SF.Helvetica)); }
    function police(f, st) { var c = cle(f, st); if (!polices[c]) polices[c] = doc.embedFont(c); return polices[c]; }
    function image(id) {
      if (!images[id]) {
        var src = id === 'sig' ? (contexte.sig && contexte.sig.url) : (contexte.fonds || {})[id];
        if (!src) return Promise.resolve(null);
        var b = octetsDeUrl(src);
        images[id] = /^data:image\/jpe?g/i.test(src) ? doc.embedJpg(b) : doc.embedPng(b);
      }
      return images[id];
    }
    function couleur(c) { return rgb(c[0] / 255, c[1] / 255, c[2] / 255); }
    return PDFLib.PDFDocument.create().then(function (d) {
      doc = d;
      var chaine = Promise.resolve();
      plan.pages.forEach(function (pg) {
        var page = doc.addPage([W, H]);
        pg.ops.forEach(function (o) {
          chaine = chaine.then(function () {
            if (o.t === 'text') {
              return police(o.f, o.st).then(function (fnt) {
                var s = pourWinAnsi(o.s), x = o.x * k;
                if (o.a === 'center') x -= largeur(o.s, o.fs, o.f, o.st, 'pt') / 2; else if (o.a === 'right') x -= largeur(o.s, o.fs, o.f, o.st, 'pt');
                page.drawText(s, { x: x, y: H - o.y * k, size: o.fs, font: fnt, color: couleur(o.c) });
              });
            } else if (o.t === 'line') {
              page.drawLine({ start: { x: o.x1 * k, y: H - o.y1 * k }, end: { x: o.x2 * k, y: H - o.y2 * k }, thickness: o.lw * k, color: couleur(o.c) });
            } else if (o.t === 'img') {
              return Promise.resolve(image(o.id)).then(function (im) { if (im) page.drawImage(im, { x: o.x * k, y: H - (o.y + o.h) * k, width: o.w * k, height: o.h * k }); });
            }
          });
        });
      });
      return chaine;
    }).then(function () { return doc.save(); });
  }

  /* ------------------------------------------------------------ points d'entrée par modèle */
  var LETTRES = ['resiliation', 'adresse', 'remboursement', 'contestation', 'demeure'];
  // Plans des PDF d'un modèle : [{ cle, nomFichier, plan }]. o : { ui, lettre, lienPied, sig, rc, cr, bureaux, today }
  function plansDe(modeleId, v, o) {
    o = o || {};
    var rv = lecteur(v);
    if (LETTRES.indexOf(modeleId) !== -1) {
      var r = planLettre(modeleId, v, o), dD = defDe(modeleId);
      return [{ cle: 'lettre', nomFichier: nomBase((o.titre || modeleId) + ' ' + (dD ? avecDefauts(dD, rv)('dest_nom') : rv('dest_nom')), 'lettre') + '.pdf', plan: r.plan, tient: r.tient }];
    }
    if (modeleId === 'rc66') return [{ cle: 'rc66', nomFichier: 'RC66-' + nomBase(rv('rc_nom'), 'demande') + '.pdf', plan: planRc66(v, o) }];
    if (modeleId === 'credit') {
      var C = ctxCr(v, o), b = o.bureaux || [C.eq() ? 'eq' : null, C.tu() ? 'tu' : null].filter(Boolean);
      return b.map(function (x) { return { cle: x, nomFichier: ({ eq: 'Equifax', tu: 'TransUnion' }[x] || 'dossier-credit') + '-' + nomBase(rv('cr_nom'), 'demande') + '.pdf', plan: planCredit(v, x, o) }; });
    }
    throw new Error('modele inconnu : ' + modeleId);
  }
  // Étapes actives et réponses manquantes ou invalides, étape par étape : [{ etape, manques:[ids] }]
  function verifier(modeleId, v, o) {
    o = o || {};
    if (LETTRES.indexOf(modeleId) !== -1) {
      var D = defDe(modeleId), lv = D ? avecDefauts(D, lecteur(v)) : lecteur(v), v2 = {};
      ['exp_nom', 'exp_ligne', 'exp_ville', 'exp_prov', 'exp_cp', 'dest_nom', 'dest_ligne', 'dest_ville', 'dest_prov', 'dest_cp', 'date_lettre'].concat(((D && D.champs) || o.champs || []).map(function (c) { return c.id; })).forEach(function (id) { v2[id] = lv(id); });
      return [{ etape: 'formulaire', manques: manquesLettre(o.champs || (D && D.champs) || [], v2, o) }];
    }
    if (modeleId === 'rc66') { var C = ctxRc(v, o); return rcEtapesActives(C).map(function (e) { return { etape: e, manques: rcManquesEtape(C, e) }; }); }
    if (modeleId === 'credit') { var D = ctxCr(v, o); return crEtapesActives(D).map(function (e) { return { etape: e, manques: crManquesEtape(D, e) }; }); }
    throw new Error('modele inconnu : ' + modeleId);
  }
  function documentsDe(modeleId, v, o) {
    o = o || {};
    if (modeleId === 'rc66') return docsRc66(ctxRc(v, o));
    if (modeleId === 'credit') { var C = ctxCr(v, o), b = o.bureau || (C.eq() ? 'eq' : 'tu'); return docsCredit(C, b); }
    return [];
  }

  return {
    version: 1,
    PROVINCES: PROVINCES, PROVINCES_RC: PROVINCES_RC, MOIS: MOIS, PAGE: PAGE, CR_LIM: CR_LIM, LETTRES: LETTRES, RC_ETAPES: RC_ETAPES, CR_ETAPES: CR_ETAPES,
    // mesure du texte
    largeur: largeur, couper: couper,
    // utilitaires partagés avec la page
    nettoyer: nettoyer, hexRgb: hexRgb, dimSig: dimSig, dateTexte: dateTexte, nombre: nombre, montantTexte: montantTexte, cpNormal: cpNormal, cpValide: cpValide,
    chiffres: chiffres, dateIso: dateIso, mots: mots, aujourdhuiIso: aujourdhuiIso, prov: prov, provRc: provRc, nomBase: nomBase,
    // lettres libres
    enregistrer: enregistrer, definitionDe: defDe, composerLettre: composerLettre, disposerLettre: disposerLettre, planLettre: planLettre, manquesLettre: manquesLettre,
    // RC66
    ctxRc: ctxRc, planRc66: planRc66, rcEtapesActives: rcEtapesActives, rcManquesEtape: rcManquesEtape, docsRc66: docsRc66, rcFlags: rcFlags,
    // contestation de crédit
    ctxCr: ctxCr, planCredit: planCredit, crVal: crVal, crEtapesActives: crEtapesActives, crManquesEtape: crManquesEtape, docsCredit: docsCredit,
    // adaptateurs et points d'entrée
    rendreJsPdf: rendreJsPdf, rendrePdfLib: rendrePdfLib, plansDe: plansDe, verifier: verifier, documentsDe: documentsDe
  };
});
