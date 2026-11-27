import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { en } from '../src/locales/en';
import { fr } from '../src/locales/fr';

interface SeedEntry {
  key: string;
  en: string;
  fr: string;
  placeholders: string[];
}

interface PlaceholderMismatch {
  key: string;
  enPlaceholders: string[];
  frPlaceholders: string[];
}

interface SeedCatalog {
  schemaVersion: 1;
  keyCount: number;
  missingInFr: string[];
  missingInEn: string[];
  placeholderMismatches: PlaceholderMismatch[];
  entries: SeedEntry[];
}

type TernaryKind = 'literal' | 'template' | 'nested' | 'expression' | 'jsx';
type TernaryContext = 'code' | 'jsx-text' | 'jsx-attribute';

interface InventoryEntry {
  line: number;
  column: number;
  condition: string;
  kind: TernaryKind;
  context: TernaryContext;
  attributeName?: string;
  isNonTextStyle?: boolean;
  fr: string | null;
  en: string | null;
  frRaw: string;
  enRaw: string;
  interpolations?: string[];
}

interface InventoryFile {
  file: string;
  count: number;
  translatableCount: number;
  entries: InventoryEntry[];
}

interface InventoryGroup {
  group: string;
  fileCount: number;
  count: number;
  translatableCount: number;
  files: InventoryFile[];
}

interface InlineIsFrInventory {
  schemaVersion: 1;
  scannedFileCount: number;
  matchedFileCount: number;
  totalMatches: number;
  translatableCount: number;
  excludedNonTextCount: number;
  kindCounts: Record<TernaryKind, number>;
  conditionCounts: Record<string, number>;
  groups: InventoryGroup[];
}

function asciiCompare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function extractPlaceholders(text: string): string[] {
  const found = new Set<string>();
  const re = /\{([A-Za-z0-9_]+)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    found.add(match[1]);
  }
  return Array.from(found).sort(asciiCompare);
}

function buildSeedCatalog(): SeedCatalog {
  const enObj = en as Record<string, string>;
  const frObj = fr as Record<string, string>;

  const enKeys = Object.keys(enObj).sort(asciiCompare);
  const frKeys = Object.keys(frObj).sort(asciiCompare);
  const enSet = new Set(enKeys);
  const frSet = new Set(frKeys);

  const missingInFr = enKeys.filter((k) => !frSet.has(k));
  const missingInEn = frKeys.filter((k) => !enSet.has(k));

  const allKeys = Array.from(new Set([...enKeys, ...frKeys])).sort(asciiCompare);
  const placeholderMismatches: PlaceholderMismatch[] = [];
  const entries: SeedEntry[] = [];

  for (const key of allKeys) {
    const enVal = enObj[key] ?? '';
    const frVal = frObj[key] ?? '';
    const enPh = extractPlaceholders(enVal);
    const frPh = extractPlaceholders(frVal);

    if (
      enSet.has(key) &&
      frSet.has(key) &&
      (enPh.length !== frPh.length || enPh.some((p, i) => p !== frPh[i]))
    ) {
      placeholderMismatches.push({
        key,
        enPlaceholders: enPh,
        frPlaceholders: frPh,
      });
    }

    const unionPh = Array.from(new Set([...enPh, ...frPh])).sort(asciiCompare);
    entries.push({
      key,
      en: enVal,
      fr: frVal,
      placeholders: unionPh,
    });
  }

  return {
    schemaVersion: 1,
    keyCount: entries.length,
    missingInFr,
    missingInEn,
    placeholderMismatches,
    entries,
  };
}

function collectSourceFiles(dir: string, rootDir: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => asciiCompare(a.name, b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(rootDir, full).split(path.sep).join('/');
    if (entry.isDirectory()) {
      if (rel === 'src/utils/__tests__' || rel === 'src/locales') {
        continue;
      }
      collectSourceFiles(full, rootDir, out);
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx'))) {
      if (entry.name.endsWith('.d.ts')) continue;
      out.push(full);
    }
  }
}

function unwrapParens(expr: ts.Expression): ts.Expression {
  let cur = expr;
  while (ts.isParenthesizedExpression(cur)) {
    cur = cur.expression;
  }
  return cur;
}

function getLangIdentifierName(expr: ts.Expression): string | null {
  const inner = unwrapParens(expr);
  if (ts.isIdentifier(inner)) {
    if (inner.text === 'lang' || inner.text === 'language' || inner.text === 'locale') {
      return inner.text;
    }
    return null;
  }
  if (ts.isPropertyAccessExpression(inner)) {
    const prop = inner.name.text;
    if (prop === 'lang' || prop === 'language' || prop === 'locale') {
      return inner.getText();
    }
  }
  return null;
}

function matchFrenchCondition(condExpr: ts.Expression, sf: ts.SourceFile): string | null {
  const cond = unwrapParens(condExpr);
  if (ts.isIdentifier(cond)) {
    if (cond.text === 'isFr' || cond.text === 'isFrench') {
      return cond.text;
    }
    return null;
  }

  if (ts.isBinaryExpression(cond)) {
    const op = cond.operatorToken.kind;
    const isEq = op === ts.SyntaxKind.EqualsEqualsEqualsToken || op === ts.SyntaxKind.EqualsEqualsToken;
    const isNeq =
      op === ts.SyntaxKind.ExclamationEqualsEqualsToken || op === ts.SyntaxKind.ExclamationEqualsToken;
    if (!isEq && !isNeq) return null;

    const left = unwrapParens(cond.left);
    const right = unwrapParens(cond.right);

    const checkPair = (idSide: ts.Expression, litSide: ts.Expression): string | null => {
      if (!ts.isStringLiteral(litSide) && !ts.isNoSubstitutionTemplateLiteral(litSide)) {
        return null;
      }
      const idName = getLangIdentifierName(idSide);
      if (!idName) return null;
      if (isEq && litSide.text === 'fr') {
        return cond.getText(sf).replace(/\s+/g, ' ').trim();
      }
      if (isNeq && litSide.text === 'en') {
        return cond.getText(sf).replace(/\s+/g, ' ').trim();
      }
      return null;
    };

    return checkPair(left, right) ?? checkPair(right, left);
  }

  return null;
}

function isStaticStringLiteral(expr: ts.Expression): expr is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr);
}

function isJsxNode(expr: ts.Expression): boolean {
  return ts.isJsxElement(expr) || ts.isJsxSelfClosingElement(expr) || ts.isJsxFragment(expr);
}

function extractTemplateInfo(
  expr: ts.Expression,
  sf: ts.SourceFile
): { text: string; interpolations: string[] } | null {
  if (isStaticStringLiteral(expr)) {
    return { text: expr.text, interpolations: [] };
  }
  if (ts.isTemplateExpression(expr)) {
    let text = expr.head.text;
    const interpolations: string[] = [];
    for (const span of expr.templateSpans) {
      const spanExpr = span.expression.getText(sf).replace(/\s+/g, ' ').trim();
      interpolations.push(spanExpr);
      text += `\${${spanExpr}}${span.literal.text}`;
    }
    return { text, interpolations };
  }
  return null;
}

function detectJsxContext(
  node: ts.ConditionalExpression,
  sf: ts.SourceFile
): { context: TernaryContext; attributeName?: string; isNonTextStyle?: boolean } {
  let cur: ts.Node | undefined = node.parent;
  while (cur) {
    if (ts.isJsxAttribute(cur)) {
      const attributeName = cur.name.getText(sf);
      const isNonTextStyle = attributeName === 'className';
      return {
        context: 'jsx-attribute',
        attributeName,
        ...(isNonTextStyle ? { isNonTextStyle: true } : {}),
      };
    }
    if (ts.isJsxExpression(cur)) {
      const p = cur.parent;
      if (p && (ts.isJsxElement(p) || ts.isJsxFragment(p))) {
        return { context: 'jsx-text' };
      }
      // Otherwise keep walking (could be inside JsxAttribute)
      cur = cur.parent;
      continue;
    }
    if (
      ts.isFunctionLike(cur) ||
      ts.isVariableDeclaration(cur) ||
      ts.isBlock(cur) ||
      ts.isSourceFile(cur)
    ) {
      break;
    }
    cur = cur.parent;
  }
  return { context: 'code' };
}

function getGroupName(relToProject: string): string {
  // relToProject starts with "src/"
  const relToSrc = relToProject.replace(/^src\//, '');
  const parts = relToSrc.split('/');
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts[0] === 'components' && parts.length >= 3) {
    return `components/${parts[1]}`;
  }
  return parts[0];
}

function buildInlineInventory(projectRoot: string): InlineIsFrInventory {
  const srcDir = path.join(projectRoot, 'src');
  const absFiles: string[] = [];
  collectSourceFiles(srcDir, projectRoot, absFiles);

  const kindCounts: Record<TernaryKind, number> = {
    literal: 0,
    template: 0,
    nested: 0,
    expression: 0,
    jsx: 0,
  };
  const conditionCounts: Record<string, number> = {};
  const groupMap = new Map<string, Map<string, InventoryEntry[]>>();

  let matchedFileCount = 0;
  let totalMatches = 0;
  let translatableCount = 0;
  let excludedNonTextCount = 0;

  for (const absFile of absFiles) {
    const relPath = path.relative(projectRoot, absFile).split(path.sep).join('/');
    const sourceText = fs.readFileSync(absFile, 'utf8');
    const scriptKind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(relPath, sourceText, ts.ScriptTarget.Latest, true, scriptKind);

    const fileEntries: InventoryEntry[] = [];

    const visit = (node: ts.Node): void => {
      if (ts.isConditionalExpression(node)) {
        const condLabel = matchFrenchCondition(node.condition, sf);
        if (condLabel) {
          const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
          const whenTrue = unwrapParens(node.whenTrue);
          const whenFalse = unwrapParens(node.whenFalse);
          const frRaw = node.whenTrue.getText(sf).replace(/\s+/g, ' ').trim();
          const enRaw = node.whenFalse.getText(sf).replace(/\s+/g, ' ').trim();

          let kind: TernaryKind;
          let frText: string | null = null;
          let enText: string | null = null;
          let interpolations: string[] | undefined;

          if (ts.isConditionalExpression(whenTrue) || ts.isConditionalExpression(whenFalse)) {
            kind = 'nested';
          } else if (isJsxNode(whenTrue) || isJsxNode(whenFalse)) {
            kind = 'jsx';
          } else if (isStaticStringLiteral(whenTrue) && isStaticStringLiteral(whenFalse)) {
            kind = 'literal';
            frText = whenTrue.text;
            enText = whenFalse.text;
          } else {
            const frTpl = extractTemplateInfo(whenTrue, sf);
            const enTpl = extractTemplateInfo(whenFalse, sf);
            if (frTpl && enTpl) {
              kind = 'template';
              frText = frTpl.text;
              enText = enTpl.text;
              const combined = Array.from(new Set([...frTpl.interpolations, ...enTpl.interpolations]));
              if (combined.length > 0) {
                interpolations = combined;
              }
            } else {
              kind = 'expression';
            }
          }

          const jsxCtx = detectJsxContext(node, sf);
          const entry: InventoryEntry = {
            line: pos.line + 1,
            column: pos.character + 1,
            condition: condLabel,
            kind,
            context: jsxCtx.context,
            ...(jsxCtx.attributeName ? { attributeName: jsxCtx.attributeName } : {}),
            ...(jsxCtx.isNonTextStyle ? { isNonTextStyle: true } : {}),
            fr: frText,
            en: enText,
            frRaw,
            enRaw,
            ...(interpolations ? { interpolations } : {}),
          };

          fileEntries.push(entry);
          totalMatches++;
          if (entry.isNonTextStyle) {
            excludedNonTextCount++;
          } else {
            translatableCount++;
          }
          kindCounts[kind]++;
          conditionCounts[condLabel] = (conditionCounts[condLabel] ?? 0) + 1;
        }
      }
      ts.forEachChild(node, visit);
    };

    visit(sf);

    if (fileEntries.length > 0) {
      matchedFileCount++;
      fileEntries.sort((a, b) => a.line - b.line || a.column - b.column);
      const groupName = getGroupName(relPath);
      let filesInGroup = groupMap.get(groupName);
      if (!filesInGroup) {
        filesInGroup = new Map();
        groupMap.set(groupName, filesInGroup);
      }
      filesInGroup.set(relPath, fileEntries);
    }
  }

  const sortedConditionCounts: Record<string, number> = {};
  for (const key of Object.keys(conditionCounts).sort(asciiCompare)) {
    sortedConditionCounts[key] = conditionCounts[key];
  }

  const groups: InventoryGroup[] = Array.from(groupMap.keys())
    .sort(asciiCompare)
    .map((groupName) => {
      const filesMap = groupMap.get(groupName)!;
      const files: InventoryFile[] = Array.from(filesMap.keys())
        .sort(asciiCompare)
        .map((filePath) => {
          const entries = filesMap.get(filePath)!;
          return {
            file: filePath,
            count: entries.length,
            translatableCount: entries.filter((e) => !e.isNonTextStyle).length,
            entries,
          };
        });
      const count = files.reduce((acc, f) => acc + f.count, 0);
      const groupTranslatable = files.reduce((acc, f) => acc + f.translatableCount, 0);
      return {
        group: groupName,
        fileCount: files.length,
        count,
        translatableCount: groupTranslatable,
        files,
      };
    });

  return {
    schemaVersion: 1,
    scannedFileCount: absFiles.length,
    matchedFileCount,
    totalMatches,
    translatableCount,
    excludedNonTextCount,
    kindCounts,
    conditionCounts: sortedConditionCounts,
    groups,
  };
}

function buildInlineInventoryMarkdown(seed: SeedCatalog, inventory: InlineIsFrInventory): string {
  const lines: string[] = [];
  lines.push('# RideCadence Localization & Inline `isFr ?` Inventory');
  lines.push('');
  lines.push('Generated deterministically by `scripts/exportLocalizationCatalog.ts` for Xcode `Localizable.xcstrings` migration.');
  lines.push('');
  lines.push('## Dictionary Seed Summary (`contracts/localization/seed.json`)');
  lines.push(`- **Total keys:** ${seed.keyCount}`);
  lines.push(`- **Missing in FR:** ${seed.missingInFr.length}`);
  lines.push(`- **Missing in EN:** ${seed.missingInEn.length}`);
  lines.push(`- **Placeholder mismatches:** ${seed.placeholderMismatches.length}`);
  if (seed.placeholderMismatches.length > 0) {
    lines.push('');
    lines.push('| Key | EN placeholders | FR placeholders |');
    lines.push('|---|---|---|');
    for (const m of seed.placeholderMismatches) {
      lines.push(
        `| \`${m.key}\` | ${m.enPlaceholders.map((p) => `\`{${p}}\``).join(', ') || '—'} | ${m.frPlaceholders.map((p) => `\`{${p}}\``).join(', ') || '—'} |`
      );
    }
  }
  lines.push('');
  lines.push('## Inline Language Ternary Summary (`contracts/localization/inline-isfr-inventory.json`)');
  lines.push(`- **Scanned source files:** ${inventory.scannedFileCount}`);
  lines.push(`- **Files with inline ternaries:** ${inventory.matchedFileCount}`);
  lines.push(`- **Total AST matches:** ${inventory.totalMatches}`);
  lines.push(`- **Translatable strings:** ${inventory.translatableCount}`);
  lines.push(`- **Excluded non-text CSS/style ternaries:** ${inventory.excludedNonTextCount}`);
  lines.push(
    `- **By kind:** literal=${inventory.kindCounts.literal}, template=${inventory.kindCounts.template}, expression=${inventory.kindCounts.expression}, nested=${inventory.kindCounts.nested}, jsx=${inventory.kindCounts.jsx}`
  );
  lines.push('');
  lines.push('## Grouped Summary');
  lines.push('');
  lines.push('| Group | Files | Total Matches | Translatable |');
  lines.push('|---|---:|---:|---:|');
  for (const g of inventory.groups) {
    lines.push(`| \`${g.group}\` | ${g.fileCount} | ${g.count} | ${g.translatableCount} |`);
  }
  lines.push('');
  lines.push('## Per-File Breakdown');
  lines.push('');
  for (const g of inventory.groups) {
    lines.push(`### ${g.group} (${g.translatableCount} translatable / ${g.count} total across ${g.fileCount} files)`);
    lines.push('');
    for (const f of g.files) {
      lines.push(`#### \`${f.file}\` (${f.translatableCount} translatable / ${f.count} total)`);
      lines.push('');
      lines.push('| Line | Kind | Context | EN | FR |');
      lines.push('|---:|---|---|---|---|');
      for (const e of f.entries) {
        const escapeCell = (s: string) =>
          s.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ').slice(0, 120);
        const enPreview = escapeCell(e.en ?? e.enRaw);
        const frPreview = escapeCell(e.fr ?? e.frRaw);
        const ctxLabel = e.isNonTextStyle
          ? `${e.context}:${e.attributeName} [non-text]`
          : e.attributeName
            ? `${e.context}:${e.attributeName}`
            : e.context;
        lines.push(`| ${e.line} | ${e.kind} | ${ctxLabel} | ${enPreview} | ${frPreview} |`);
      }
      lines.push('');
    }
  }
  return lines.join('\n') + '\n';
}

function main(): void {
  const projectRoot = process.cwd();
  const outDir = path.join(projectRoot, 'contracts', 'localization');
  fs.mkdirSync(outDir, { recursive: true });

  const seed = buildSeedCatalog();
  const inventory = buildInlineInventory(projectRoot);
  const inventoryMd = buildInlineInventoryMarkdown(seed, inventory);

  fs.writeFileSync(path.join(outDir, 'seed.json'), JSON.stringify(seed, null, 2) + '\n', 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'inline-isfr-inventory.json'),
    JSON.stringify(inventory, null, 2) + '\n',
    'utf8'
  );
  fs.writeFileSync(path.join(outDir, 'inline-isfr-inventory.md'), inventoryMd, 'utf8');

  console.log(
    `Exported localization catalog: ${seed.keyCount} seed keys (${seed.placeholderMismatches.length} placeholder mismatches); ` +
      `${inventory.totalMatches} AST ternaries (${inventory.translatableCount} translatable, ${inventory.excludedNonTextCount} non-text) across ${inventory.matchedFileCount}/${inventory.scannedFileCount} files in ${inventory.groups.length} groups.`
  );
}

main();
