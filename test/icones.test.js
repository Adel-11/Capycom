// Chaque modèle et chaque section a une icône qui existe dans la bibliothèque (modeles/site/icones.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const racine = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'modeles');
const defs = createRequire(import.meta.url)(path.join(racine, 'definitions.cjs')).charger();
const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(racine, 'site', 'icones.js'), 'utf8'), ctx);
const LIB = ctx.window.CapyIcones;

test('bibliothèque d\'icônes : balisage simple et sans script', () => {
  for (const [k, v] of Object.entries(LIB)) {
    assert.match(k, /^[a-z_]+$/); assert.ok(v.length > 20, k);
    assert.ok(!/<script|on\w+=|href/i.test(v), k);
    assert.equal((v.match(/</g) || []).length, (v.match(/>/g) || []).length, k + ' : balises déséquilibrées');
  }
});
test('chaque modèle a une icône connue', () => { for (const m of defs.modeles) assert.ok(LIB[m.icone], m.id + ' : icône « ' + m.icone + ' » inconnue'); });
test('chaque section a une icône connue, et les sections listent des modèles qui existent', () => {
  const ids = new Set(defs.modeles.map(m => m.id));
  for (const s of defs.commun.sections) { assert.ok(LIB[s.icone], s.id + ' : icône'); s.modeles.forEach(m => assert.ok(ids.has(m), s.id + ' cite ' + m)); }
  for (const m of defs.modeles) assert.ok(defs.commun.sections.some(s => s.modeles.includes(m.id)), m.id + ' absent de toute section');
});
