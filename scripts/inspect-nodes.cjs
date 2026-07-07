/*
 * Loads the COMPILED Nomba node + credential classes exactly the way n8n's
 * node loader does, and prints the metadata n8n uses to render them in the
 * node palette. If this prints clean descriptions, the nodes are valid and
 * would appear in n8n. No n8n server required.
 */
const path = require('node:path');

function load(rel) {
  const mod = require(path.join(__dirname, '..', rel));
  // n8n node/credential files export a class as a named or default export.
  const Cls = mod.Nomba || mod.NombaTrigger || mod.NombaApi || Object.values(mod)[0];
  return new Cls();
}

function line(s) { console.log(s); }

for (const rel of [
  'dist/src/nodes/Nomba/Nomba.node.js',
  'dist/src/nodes/NombaTrigger/NombaTrigger.node.js',
]) {
  const inst = load(rel);
  const d = inst.description;
  line('='.repeat(60));
  line(`FILE: ${rel}`);
  line(`  displayName : ${d.displayName}`);
  line(`  name        : ${d.name}`);
  line(`  group       : ${JSON.stringify(d.group)}`);
  line(`  version     : ${JSON.stringify(d.version)}`);
  if (d.credentials) line(`  credentials : ${d.credentials.map((c) => c.name).join(', ')}`);
  // Surface the resources + operations a user would see in the palette.
  const resources = (d.properties || []).filter((p) => p.name === 'resource');
  for (const r of resources) {
    line(`  resources   : ${r.options.map((o) => o.value).join(', ')}`);
  }
  const ops = (d.properties || []).filter((p) => p.name === 'operation');
  for (const o of ops) {
    line(`  operations  : ${o.options.map((x) => x.value).join(', ')}`);
  }
  if (Array.isArray(d.webhooks) && d.webhooks.length) {
    line(`  webhooks    : ${d.webhooks.map((w) => w.httpMethod + ' ' + w.path).join(', ')}`);
  }
  if (Array.isArray(d.eventTriggerDescription) || d.properties?.some((p) => p.name === 'event')) {
    const ev = (d.properties || []).find((p) => p.name === 'event');
    if (ev && ev.options) line(`  events      : ${ev.options.map((e) => e.value).join(', ')}`);
  }
}

// Credential
const cred = load('dist/src/credentials/NombaApi.credentials.js');
line('='.repeat(60));
line('CREDENTIAL: dist/src/credentials/NombaApi.credentials.js');
line(`  displayName : ${cred.displayName}`);
line(`  name        : ${cred.name}`);
line(`  fields      : ${(cred.properties || []).map((p) => p.name).join(', ')}`);
line('='.repeat(60));
line('OK: all node + credential classes instantiated cleanly.');
