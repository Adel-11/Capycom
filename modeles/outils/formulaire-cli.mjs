// Outil en ligne de commande des formulaires officiels (bibliothèque : formulaire.mjs ; générateur : formulaire-generer.mjs)
//   node modeles/outils/formulaire-cli.mjs extraire <pdf>       : liste les champs du PDF (page, rectangle, étiquette voisine)
//   node modeles/outils/formulaire-cli.mjs generer <spec.mjs>   : écrit definitions/<id>.json et fonds/formulaires.json
import { fileURLToPath } from 'node:url';
import { champs } from './formulaire.mjs';
{
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'extraire') {
    const r = await champs(arg);
    console.log('pages', r.pages, 'champs', r.champs.length);
    r.champs.forEach(c => console.log(c.type.padEnd(10), 'p' + c.p, JSON.stringify([c.rect.x, c.rect.y, c.rect.w, c.rect.h]), JSON.stringify(c.nom.split('.').slice(-2).join('.')), '|', c.etiquette));
  } else if (cmd === 'generer') {
    const { generer } = await import('./formulaire-generer.mjs');
    await generer(arg);
  } else { console.log('usage : extraire <pdf> | generer <spec.json>'); process.exit(1); }
}
