import fs from 'node:fs';
import path from 'node:path';
import { parseGlb, validateHumanAsset } from './human-glb-contract.mjs';

const [file, tier = 'full', license = 'CC0', customizable = 'false'] = process.argv.slice(2);
if (!file) {
  console.error('usage: node scripts/validate-human-file.mjs <file.glb> [tier] [license] [customizableBody]');
  process.exit(2);
}
const bytes = fs.readFileSync(file);
const parsed = parseGlb(bytes);
const result = validateHumanAsset({
  json: parsed.json,
  byteLength: parsed.byteLength,
  tier,
  license,
  customizableBody: customizable === 'true'
});
console.log(JSON.stringify({file: path.basename(file), tier, license, ok: result.ok, errors: result.errors, info: result.info}, null, 2));
if (!result.ok) process.exit(1);
