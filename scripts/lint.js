#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const IGNORED_DIRS = new Set(['.git', 'node_modules', '.idea', '.vscode']);
const TEXT_EXTENSIONS = new Set(['.js', '.json', '.md', '.yaml', '.yml', '.env', '.example']);

const issues = [];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else {
      const ext = path.extname(entry.name);
      if (TEXT_EXTENSIONS.has(ext) || dir === ROOT) {
        checkFile(fullPath);
      }
    }
  }
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    if (/\s+$/.test(line)) {
      issues.push(`${filePath}:${index + 1} 存在行尾多余空格`);
    }
    if (/\t/.test(line)) {
      issues.push(`${filePath}:${index + 1} 包含制表符，请改用空格`);
    }
  });
  if (!content.endsWith('\n')) {
    issues.push(`${filePath} 末尾缺少换行符`);
  }
}

walk(ROOT);

if (issues.length > 0) {
  process.stderr.write(`Lint 发现 ${issues.length} 个问题:\n`);
  issues.forEach((issue) => process.stderr.write(` - ${issue}\n`));
  process.exitCode = 1;
} else {
  process.stdout.write('Lint 通过：未发现格式问题。\n');
}
