#!/usr/bin/env node
import { readdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();

function collectJsFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.git')) {
      continue;
    }
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectJsFiles(fullPath));
    } else if (extname(entry.name) === '.js') {
      files.push(fullPath);
    }
  }
  return files;
}

const jsFiles = collectJsFiles(root);
if (jsFiles.length === 0) {
  console.log('没有找到需要检查的 JavaScript 文件');
  process.exit(0);
}

let hasError = false;
for (const file of jsFiles) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
  } catch (error) {
    hasError = true;
  }
}

if (hasError) {
  console.error('语法检查失败');
  process.exit(1);
}

console.log('Lint 语法检查通过');
