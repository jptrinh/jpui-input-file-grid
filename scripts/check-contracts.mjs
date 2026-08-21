#!/usr/bin/env node
/**
 * Guards the contracts nothing else enforces:
 *
 *  1. State selectors reference class names that really exist in the component. A state
 *     selector lives in ww-config.js while the class it matches lives in wwElement.vue,
 *     so renaming the class silently stops the state from ever matching.
 *  2. AI.json mirrors ww-config.js (states) and package.json (name). A component whose
 *     AI.json has drifted is not `isReady` and cannot be placed on a page.
 *
 * Run with `npm run check`. Exits non-zero on the first broken contract.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

// ww-config.js is an ES module in a CommonJS package, so import it through a data URL
// rather than teaching the repo about module types.
const config = (await import('data:text/javascript;base64,' + Buffer.from(read('ww-config.js')).toString('base64')))
    .default;

const component = read('src/wwElement.vue');
const aiJson = JSON.parse(read('AI.json'));
const pkg = JSON.parse(read('package.json'));

const errors = [];

// 1. Every class name used by a state selector must exist in the component.
for (const state of config.states || []) {
    const selectors = state.selectors || (state.selector ? [state.selector] : []);
    if (!selectors.length) {
        errors.push(`state "${state.label}" declares no selector`);
        continue;
    }
    for (const selector of selectors) {
        for (const [, className] of selector.matchAll(/\.([a-zA-Z][\w-]*)/g)) {
            if (!component.includes(className)) {
                errors.push(`state "${state.label}" selects .${className}, which no longer exists in wwElement.vue`);
            }
        }
    }
}

// 2. AI.json mirrors the config.
const configStates = (config.states || []).map(s => s.label).sort();
const aiStates = (aiJson.states || []).map(s => s.name).sort();
if (JSON.stringify(configStates) !== JSON.stringify(aiStates)) {
    errors.push(`AI.json states [${aiStates}] do not mirror ww-config states [${configStates}]`);
}
if (aiJson.metadata?.name !== pkg.name) {
    errors.push(`AI.json metadata.name "${aiJson.metadata?.name}" !== package.json name "${pkg.name}"`);
}

if (errors.length) {
    console.error('\x1b[41m Contract check failed \x1b[0m');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
}

console.log(`Contracts OK: ${configStates.length} states, AI.json mirrors ww-config.js and package.json.`);
