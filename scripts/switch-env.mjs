import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const target = process.argv[2];

const envFiles = {
  local: '.env.supabase-local.local',
  staging: '.env.staging.local',
  production: '.env.production.local',
};

if (!target || !envFiles[target]) {
  console.error('Usage: node scripts/switch-env.mjs <local|staging|production>');
  process.exit(1);
}

const source = resolve(process.cwd(), envFiles[target]);
const destination = resolve(process.cwd(), '.env.local');

if (!existsSync(source)) {
  console.error(`Missing ${envFiles[target]}. Create it from the matching .example file first.`);
  process.exit(1);
}

copyFileSync(source, destination);
console.log(`Switched .env.local to ${target}`);
