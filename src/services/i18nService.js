const fs = require('fs');
const path = require('path');

const RESOURCES_DIR = process.env.I18N_RESOURCES_DIR
  ? path.resolve(process.env.I18N_RESOURCES_DIR)
  : path.join(__dirname, '..', '..', 'i18n');

let fallbackLanguage = 'zh-CN';
let resources = new Map();
let versionToken = Date.now();

function bumpVersion() {
  const now = Date.now();
  versionToken = now > versionToken ? now : versionToken + 1;
}

function raise(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function normaliseLangCode(lang) {
  if (typeof lang !== 'string') {
    return null;
  }
  const trimmed = lang.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function ensureResourcesDir() {
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true });
  }
}

function loadLanguageFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function writeLanguageFile(lang, data) {
  ensureResourcesDir();
  const filePath = path.join(RESOURCES_DIR, `${lang}.json`);
  const payload = JSON.stringify(data, null, 2);
  const tempFile = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempFile, payload, 'utf8');
  try {
    fs.renameSync(tempFile, filePath);
  } catch (error) {
    fs.rmSync(tempFile, { force: true });
    throw error;
  }
}

function loadResourcesFromDisk() {
  ensureResourcesDir();
  const entries = fs.readdirSync(RESOURCES_DIR, { withFileTypes: true });
  const nextResources = new Map();
  entries.forEach((entry) => {
    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      return;
    }
    const lang = normaliseLangCode(entry.name.replace(/\.json$/i, ''));
    if (!lang) {
      return;
    }
    const filePath = path.join(RESOURCES_DIR, entry.name);
    const data = loadLanguageFile(filePath);
    if (data && typeof data === 'object') {
      nextResources.set(lang, data);
    }
  });
  resources = nextResources;
  if (!resources.has(fallbackLanguage) && resources.size > 0) {
    fallbackLanguage = Array.from(resources.keys())[0];
  }
  bumpVersion();
}

function getAvailableLanguages() {
  return Array.from(resources.keys());
}

function getFallbackLanguage() {
  return fallbackLanguage;
}

function setFallbackLanguage(lang) {
  const normalised = normaliseLangCode(lang);
  if (normalised && resources.has(normalised)) {
    fallbackLanguage = normalised;
  }
}

function getLanguageBundle(lang) {
  const normalised = normaliseLangCode(lang);
  if (normalised && resources.has(normalised)) {
    return clone(resources.get(normalised));
  }
  if (resources.has(fallbackLanguage)) {
    return clone(resources.get(fallbackLanguage));
  }
  return {};
}

function lookup(lang, key) {
  if (typeof key !== 'string' || key.trim() === '') {
    return undefined;
  }
  const segments = key.split('.');
  const bundles = [];
  const normalised = normaliseLangCode(lang);
  if (normalised && resources.has(normalised)) {
    bundles.push(resources.get(normalised));
  }
  if (resources.has(fallbackLanguage) && (!normalised || normalised !== fallbackLanguage)) {
    bundles.push(resources.get(fallbackLanguage));
  }
  for (const bundle of bundles) {
    let cursor = bundle;
    let resolved;
    for (const segment of segments) {
      if (!cursor || typeof cursor !== 'object' || !(segment in cursor)) {
        cursor = undefined;
        break;
      }
      resolved = cursor[segment];
      cursor = cursor[segment];
    }
    if (typeof resolved === 'string') {
      return resolved;
    }
  }
  return undefined;
}

function translate(lang, key, fallbackValue = null) {
  const value = lookup(lang, key);
  if (typeof value === 'string') {
    return value;
  }
  if (fallbackValue !== null && fallbackValue !== undefined) {
    return fallbackValue;
  }
  if (typeof key === 'string') {
    return key;
  }
  return '';
}

function updateResources(lang, data) {
  const normalised = normaliseLangCode(lang);
  if (!normalised) {
    raise('I18N_LANG_REQUIRED');
  }
  if (!data || typeof data !== 'object') {
    raise('I18N_PAYLOAD_INVALID');
  }
  const snapshot = clone(data);
  resources.set(normalised, snapshot);
  writeLanguageFile(normalised, snapshot);
  bumpVersion();
  if (!resources.has(fallbackLanguage)) {
    fallbackLanguage = normalised;
  }
}

function exportResources(lang) {
  const normalised = normaliseLangCode(lang);
  if (!normalised) {
    return {};
  }
  if (!resources.has(normalised)) {
    return {};
  }
  return clone(resources.get(normalised));
}

function getVersion() {
  return versionToken;
}

function reset() {
  loadResourcesFromDisk();
}

loadResourcesFromDisk();

module.exports = {
  getAvailableLanguages,
  getFallbackLanguage,
  setFallbackLanguage,
  getLanguageBundle,
  translate,
  updateResources,
  exportResources,
  getVersion,
  reset
};
