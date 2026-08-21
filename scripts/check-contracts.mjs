#!/usr/bin/env node
/**
 * Guards the contracts nothing else enforces:
 *
 *  1. State selectors reference class names that really exist in the component. A state
 *     selector lives in ww-config.js while the class it matches lives in wwElement.vue,
 *     so renaming the class silently stops the state from ever matching.
 *  2. AI.json mirrors ww-config.js (states) and package.json (name). A component whose
 *     AI.json has drifted is not `isReady` and cannot be placed on a page.
 *  3. Every `x.value` in the script has a declaration, and every identifier the template
 *     reads is exposed by setup(). Both fail at runtime, not at build time: the component
 *     compiles and then throws ReferenceError on the page.
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

// 3a. Every `x.value` in the script refers to something declared.
const script = component.slice(component.indexOf('<script>'), component.indexOf('</script>'));
const declared = new Set();
for (const [, name] of script.matchAll(/\b(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)) declared.add(name);
for (const [, group] of script.matchAll(/\b(?:const|let|var)\s*\{([^}]*)\}\s*=/g)) {
    for (const part of group.split(',')) {
        const name = part
            .split(':')
            .pop()
            .trim()
            .replace(/^\.\.\./, '');
        if (name) declared.add(name);
    }
}
for (const [, name] of new Set(script.matchAll(/([A-Za-z_$][\w$]*)\.value\b/g))) {
    if (!declared.has(name)) errors.push(`\`${name}.value\` is used in the script but ${name} is never declared`);
}

// 3b. Every identifier the template reads is returned from setup().
const template = component.slice(component.indexOf('<template>'), component.indexOf('</template>'));
const returned = new Set();
const returnBlock = script.slice(script.lastIndexOf('return {'));
for (const [, name] of returnBlock.matchAll(/^\s{12}([A-Za-z_$][\w$]*),\s*$/gm)) returned.add(name);
const localAliases = new Set([
    '$event',
    'true',
    'false',
    'null',
    'undefined',
    'in',
    'of',
    'typeof',
    'new',
    'Number',
    'String',
    'Boolean',
    'Math',
    'Array',
    'Object',
    'JSON',
]);
// Declared props are exposed to the template too, but nothing else from setup() is:
// being declared in setup and not returned is exactly the invisible-binding bug.
const propsBlock = script.slice(script.indexOf('props: {'), script.indexOf('emits:'));
for (const [, name] of propsBlock.matchAll(/^\s{8}([A-Za-z_$][\w$]*):/gm)) localAliases.add(name);
for (const [, aliases] of template.matchAll(/v-for="\(?([^)"]*)\)?\s+in\s/g)) {
    for (const alias of aliases.split(',')) localAliases.add(alias.trim());
}
const expressions = [
    ...template.matchAll(/(?:^|\s)(?::|v-|@)[\w.:-]+="([^"]*)"/g),
    ...template.matchAll(/\{\{([^}]*)\}\}/g),
].map(m => m[1]);
for (const expression of expressions) {
    // Only the head of a member chain, and never an object literal key.
    for (const [, name] of expression
        .replace(/'[^']*'|`[^`]*`/g, '')
        .matchAll(/(?<![.\w$'"])([A-Za-z_$][\w$]*)(?!\s*:)/g)) {
        if (returned.has(name) || localAliases.has(name)) continue;
        errors.push(`template reads \`${name}\`, which setup() does not return`);
    }
}

if (errors.length) {
    console.error('\x1b[41m Contract check failed \x1b[0m');
    for (const error of errors) console.error(`  - ${error}`);
    process.exit(1);
}

console.log(
    `Contracts OK: ${configStates.length} states, AI.json mirrors ww-config.js and package.json, ` +
        `${returned.size} setup bindings resolve.`
);
