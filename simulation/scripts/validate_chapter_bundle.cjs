'use strict';

// Offline shape/filename check. Does not evaluate a user-supplied file as code,
// run psychology calculations, access the network or modify a save.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function main(argv) {
  if(argv.length !== 1) throw new Error('使い方: node simulation/scripts/validate_chapter_bundle.cjs <JSONファイル>');
  const filename = argv[0];
  const bundle = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const scope = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/simulation_save.js'), 'utf8'), scope);
  scope.window.RenaiGameSave.assertChapterBundleV2(bundle, path.basename(filename));
  console.log('PASS: 標準version 2の形式・ファイル名が一致しました。心理JS・正本との照合は別途必要です。');
}

if(require.main === module) {
  try { main(process.argv.slice(2)); }
  catch(error) { console.error(error.message); process.exitCode = 1; }
}
module.exports = { main };
