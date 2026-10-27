import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import ts from 'typescript';

// core/ must stay framework-free so it can run in the browser and be extracted as a package:
// no NestJS, no reflect-metadata, no Node modules. tsconfig.core.json also compiles it without
// Node types (npm run typecheck).
const CORE_DIR = __dirname;

const coreFiles = readdirSync(CORE_DIR)
  .filter(file => file.endsWith('.ts') && !file.endsWith('.spec.ts'))
  .map(file => join(CORE_DIR, file));

function importsOf(source: string): string[] {
  return ts.preProcessFile(source, true, true).importedFiles.map(file => file.fileName);
}

function resolveTs(path: string): string | undefined {
  return [`${path}.ts`, join(path, 'index.ts')].find(candidate => existsSync(candidate));
}

function importViolations(entry: string): string[] {
  const violations: string[] = [];
  const visited = new Set<string>();

  const visit = (file: string): void => {
    if (visited.has(file)) {
      return;
    }
    visited.add(file);

    for (const specifier of importsOf(readFileSync(file, 'utf8'))) {
      const from = relative(CORE_DIR, file);
      if (!specifier.startsWith('.')) {
        violations.push(`${from} imports '${specifier}'`);
        continue;
      }
      const target = resolveTs(resolve(dirname(file), specifier));
      if (target === undefined) {
        violations.push(`${from} imports '${specifier}', which does not resolve to a .ts file`);
        continue;
      }
      if (relative(CORE_DIR, target).startsWith('..')) {
        violations.push(`${from} imports '${specifier}' from outside core/`);
        continue;
      }
      visit(target);
    }
  };

  visit(entry);
  return violations;
}

describe('core isolation', () => {
  it('should expose an index entry point', () => {
    expect(coreFiles).toContain(join(CORE_DIR, 'index.ts'));
  });

  it('should import nothing from outside core/ (no NestJS, reflect-metadata or Node)', () => {
    const violations = coreFiles.flatMap(importViolations);

    expect(violations).toEqual([]);
  });

  it('should not use the reflect-metadata API', () => {
    const offenders = coreFiles.filter(file =>
      /Reflect\.\w*Metadata/.test(readFileSync(file, 'utf8')),
    );

    expect(offenders).toEqual([]);
  });

  it('should detect static, type-only, re-exported, dynamic and require imports', () => {
    const source = [
      "import { Injectable } from '@nestjs/common';",
      "import type { Type } from '@nestjs/common/interfaces';",
      "export { ModuleRef } from '@nestjs/core';",
      "const fs = await import('node:fs');",
      "const metadata = require('reflect-metadata');",
    ].join('\n');

    expect(importsOf(source)).toEqual([
      '@nestjs/common',
      '@nestjs/common/interfaces',
      '@nestjs/core',
      'node:fs',
      'reflect-metadata',
    ]);
  });
});
