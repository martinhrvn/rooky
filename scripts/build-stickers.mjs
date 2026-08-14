/**
 * Regenerates `src/content/stickers/catalogue.ts` from OpenMoji's metadata.
 *
 *   node scripts/build-stickers.mjs
 *
 * The catalogue is the *candidate* list — everything from the groups a child
 * might plausibly want on a sticker. What actually ships is that list minus
 * `excluded.ts`, which is hand-curated and is the file to edit. Regenerating
 * never touches the exclusions, so curation survives an OpenMoji bump.
 *
 * OpenMoji's data file is ~2MB, so it is downloaded on demand and cached
 * rather than committed. The generated catalogue is committed, so nobody needs
 * a network to build the app.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = resolve(ROOT, 'node_modules/.cache/openmoji.json');
const OUT = resolve(ROOT, 'src/content/stickers/catalogue.ts');
const ART_DIR = resolve(ROOT, 'assets/stickers');
const ART_MODULE = resolve(ROOT, 'src/content/stickers/art.ts');

const SOURCE =
  'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/data/openmoji.json';

/** OpenMoji's colour SVGs. The black outline set would fight the pieces. */
const ART_SOURCE = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg';

/** How many downloads to have in flight. Polite, and fast enough. */
const CONCURRENCY = 12;

/**
 * The groups worth offering at all. `people-body` is 2,430 entries of mostly
 * gestures and skin-tone variants, `flags` is politics, `symbols` is abstract,
 * and the two `extras-*` groups are where the Facebook logo lives.
 */
const GROUPS = ['animals-nature', 'food-drink', 'objects', 'travel-places', 'activities'];

async function openmojiData() {
  if (existsSync(CACHE)) return JSON.parse(readFileSync(CACHE, 'utf8'));

  process.stderr.write(`downloading ${SOURCE}\n`);
  const response = await fetch(SOURCE);
  if (!response.ok) throw new Error(`OpenMoji data: HTTP ${response.status}`);

  const body = await response.text();
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, body);
  return JSON.parse(body);
}

/**
 * Prints everything currently included, grouped, as lines that can be pasted
 * straight into `EXCLUDED`. Curation is then reading a list and moving the
 * dull ones across, rather than looking up hexcodes one at a time.
 */
function printIncluded() {
  // The exclusions are read as text rather than imported: this is a plain
  // .mjs script and `excluded.ts` is TypeScript with extensionless imports.
  // Both arrays are flat lists of quoted strings, so a regex is honest here.
  const source = readFileSync(resolve(ROOT, 'src/content/stickers/excluded.ts'), 'utf8');
  const listAfter = (name) => {
    // `${name}:` with the colon, or EXCLUDED would match EXCLUDED_SUBGROUPS
    // first; and `= [` rather than `[`, or it finds `readonly string[]`.
    const body = source.slice(source.indexOf(`export const ${name}:`));
    const from = body.indexOf('= [');
    const array = body.slice(from, body.indexOf(']', from));
    // Strip comments first, or the examples inside them count as entries.
    return new Set([...array.replace(/\/\/[^\n]*/g, '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
  };
  const skipSubgroups = listAfter('EXCLUDED_SUBGROUPS');
  const skipIds = listAfter('EXCLUDED');

  const catalogue = readFileSync(OUT, 'utf8');
  const entries = [
    ...catalogue.matchAll(
      /\{ id: '([^']+)', emoji: '([^']+)', name: ("(?:[^"\\]|\\.)*"), group: '([^']+)', subgroup: '([^']+)' \}/g,
    ),
  ].map(([, id, emoji, name, group, subgroup]) => ({
    id,
    emoji,
    name: JSON.parse(name),
    key: `${group}/${subgroup}`,
  }));

  const included = entries.filter((e) => !skipIds.has(e.id) && !skipSubgroups.has(e.key));
  let seen = null;
  for (const entry of included) {
    if (entry.key !== seen) {
      seen = entry.key;
      process.stdout.write(`\n  // --- ${entry.key}\n`);
    }
    process.stdout.write(`  '${entry.id}', // ${entry.emoji} ${entry.name}\n`);
  }
  process.stdout.write(`\n// ${included.length} included of ${entries.length}\n`);
}

if (process.argv.includes('--list')) {
  printIncluded();
  process.exit(0);
}

const data = await openmojiData();

const candidates = data
  .filter((entry) => GROUPS.includes(entry.group))
  // Skin-tone variants are the same picture five times over.
  .filter((entry) => !entry.skintone)
  // A few OpenMoji originals have no character at all. Until the SVGs are
  // bundled the character *is* the sticker, so those cannot be rendered.
  .filter((entry) => entry.emoji)
  .sort(
    (a, b) =>
      GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) ||
      a.subgroups.localeCompare(b.subgroups) ||
      a.order - b.order,
  );

const lines = candidates.map(
  ({ hexcode, emoji, annotation, group, subgroups }) =>
    `  { id: '${hexcode}', emoji: '${emoji}', name: ${JSON.stringify(annotation)}, ` +
    `group: '${group}', subgroup: '${subgroups}' },`,
);

const source = `/**
 * GENERATED by \`node scripts/build-stickers.mjs\` — do not edit by hand.
 *
 * Every OpenMoji entry from the groups worth offering a child. This is the
 * *candidate* list; what ships is this minus \`excluded.ts\`, which is the file
 * to edit. See \`index.ts\`.
 *
 * Artwork is OpenMoji (CC BY-SA 4.0) — see ASSETS.md. Ids are OpenMoji
 * hexcodes, so swapping the rendering from the unicode character to the
 * bundled SVG later changes nothing that is stored.
 */

export interface Sticker {
  /** OpenMoji hexcode, e.g. \`1F98A\`. Stored on the profile; never the emoji. */
  readonly id: string;
  readonly emoji: string;
  /** Adult-facing: screen readers, and the dev panel. */
  readonly name: string;
  readonly group: string;
  readonly subgroup: string;
}

export const CANDIDATES = [
${lines.join('\n')}
] as const satisfies readonly Sticker[];
`;

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, source);
process.stderr.write(`${candidates.length} candidates -> ${OUT}\n`);

await syncArtwork(candidates);

/**
 * Downloads the SVG for every sticker that survives curation, drops the ones
 * that no longer do, and regenerates the lookup module.
 *
 * Only the curated set: the artwork is the bundle, so narrowing `excluded.ts`
 * and re-running this is what makes the app smaller. A sticker she already
 * owns that has since been excluded loses its art and falls back to the
 * platform emoji, which is why `StickerArt` has a fallback at all.
 */
async function syncArtwork(all) {
  const skipIds = parseList('EXCLUDED');
  const skipSubgroups = parseList('EXCLUDED_SUBGROUPS');
  const included = all.filter(
    (e) => !skipIds.has(e.hexcode) && !skipSubgroups.has(`${e.group}/${e.subgroups}`),
  );

  mkdirSync(ART_DIR, { recursive: true });

  const wanted = new Set(included.map((e) => `${e.hexcode}.svg`));
  for (const file of readdirSync(ART_DIR)) {
    if (file.endsWith('.svg') && !wanted.has(file)) rmSync(resolve(ART_DIR, file));
  }

  const missing = included.filter((e) => !existsSync(resolve(ART_DIR, `${e.hexcode}.svg`)));
  if (missing.length > 0) {
    process.stderr.write(`downloading ${missing.length} SVGs\n`);
    await inBatches(missing, CONCURRENCY, async ({ hexcode }) => {
      const response = await fetch(`${ART_SOURCE}/${hexcode}.svg`);
      if (!response.ok) throw new Error(`${hexcode}: HTTP ${response.status}`);

      const svg = await response.text();
      // The Metro transformer chokes on an XML prolog or DOCTYPE, the same
      // way it did on the Cburnett files. OpenMoji ships neither, but strip
      // them rather than trusting that to stay true.
      writeFileSync(
        resolve(ART_DIR, `${hexcode}.svg`),
        svg.replace(/<\?xml[\s\S]*?\?>\s*/g, '').replace(/<!DOCTYPE[\s\S]*?>\s*/g, ''),
      );
    });
  }

  const entries = included.map(
    ({ hexcode }) =>
      `  '${hexcode}': () => require('../../../assets/stickers/${hexcode}.svg').default,`,
  );

  writeFileSync(
    ART_MODULE,
    `/**
 * GENERATED by \`node scripts/build-stickers.mjs\` — do not edit by hand.
 *
 * OpenMoji artwork (CC BY-SA 4.0) for every sticker that survives curation.
 * See ASSETS.md; the files themselves are unmodified beyond stripping an XML
 * prolog, and **must stay that way** — a recoloured OpenMoji is a derivative
 * and would have to be released under CC BY-SA itself.
 */

import type React from 'react';
import type { SvgProps } from 'react-native-svg';

export type Art = React.FC<SvgProps>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: (path: string) => any;

/**
 * Loaded on demand rather than imported.
 *
 * ${included.length} static imports would build every sticker component at
 * startup for the sake of the handful she actually owns. Thunks cost one
 * closure each; the module is only evaluated when something asks to draw it.
 */
const ART: Readonly<Record<string, () => Art>> = {
${entries.join('\n')}
};

const loaded = new Map<string, Art>();

/** The artwork for a sticker, or undefined if curation has dropped it. */
export function stickerArt(id: string): Art | undefined {
  const load = ART[id];
  if (!load) return undefined;

  let art = loaded.get(id);
  if (!art) {
    art = load();
    loaded.set(id, art);
  }
  return art;
}
`,
  );

  process.stderr.write(`${included.length} sticker SVGs -> ${ART_DIR}\n`);
}

/** Pulls a flat array of string literals out of `excluded.ts`. */
function parseList(name) {
  const src = readFileSync(resolve(ROOT, 'src/content/stickers/excluded.ts'), 'utf8');
  const body = src.slice(src.indexOf(`export const ${name}:`));
  const from = body.indexOf('= [');
  const array = body.slice(from, body.indexOf(']', from));
  return new Set([...array.replace(/\/\/[^\n]*/g, '').matchAll(/'([^']+)'/g)].map((m) => m[1]));
}

async function inBatches(items, size, work) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(work));
  }
}
