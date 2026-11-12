// Guarda do sistema de design (estilo flat, seção 2 e 16 da identidade visual).
// Falha se, fora de src/styles/tokens.css, aparecer cor fixa, sombra, degradê, desfoque,
// raio fora dos tokens ou emoji na interface. Rode com `node scripts/check-design.mjs`.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname;
const ALLOWED = new Set(['styles/tokens.css']);

const CSS_RULES = [
  [/#[0-9a-fA-F]{3,8}\b/, 'cor fixa: use um token de tokens.css'],
  [/\b(rgba?|hsla?|oklch|lab|lch)\(/, 'cor fixa: use um token de tokens.css'],
  [/\b(box-shadow|text-shadow)\s*:/, 'sombra: o sistema não tem sombras'],
  [/\b(linear|radial|conic)-gradient\(/, 'degradê: preenchimento é sempre chapado'],
  [/\bbackdrop-filter\s*:|\bfilter\s*:\s*[^;]*(blur|drop-shadow)/, 'desfoque ou sombra por filtro'],
  [
    /border-radius\s*:(?!\s*(0\b|var\(--radius-(sm|md|lg)\)|inherit))/,
    'raio fora de radius-sm/md/lg',
  ],
];
const TSX_RULES = [
  [/['"`]#[0-9a-fA-F]{3,8}['"`]/, 'cor fixa em componente: use um token'],
  [/\b(boxShadow|textShadow)\s*:/, 'sombra em estilo inline'],
  [/\b(linear|radial)-gradient\(/, 'degradê em estilo inline'],
  [/\p{Extended_Pictographic}/u, 'emoji na interface'],
];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

/** Tira comentários sem mudar a contagem de linhas. */
const stripComments = (src, css) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(css ? /$^/ : /(^|[^:'"`])\/\/.*$/gm, (m, p1) => p1 ?? '');

const problems = [];
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file);
  if (ALLOWED.has(rel) || /\.test\.tsx?$/.test(rel)) continue;
  const css = rel.endsWith('.css');
  if (!css && !rel.endsWith('.tsx')) continue;
  const rules = css ? CSS_RULES : TSX_RULES;
  stripComments(readFileSync(file, 'utf8'), css)
    .split('\n')
    .forEach((line, i) => {
      for (const [re, why] of rules) {
        if (re.test(line)) problems.push(`src/${rel}:${i + 1}  ${why}\n    ${line.trim()}`);
      }
    });
}

if (problems.length) {
  console.error(`Sistema de design: ${problems.length} problema(s)\n`);
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log('Sistema de design: nenhuma cor fixa, sombra, degradê ou emoji fora dos tokens.');
