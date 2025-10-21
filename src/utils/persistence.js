const fs = require('fs');
const path = require('path');

let dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'var', 'data');

function setDataDir(nextDir) {
  if (!nextDir) {
    return;
  }
  dataDir = path.resolve(nextDir);
}

function getDataDir() {
  return dataDir;
}

function resolveDataPath(...segments) {
  return path.join(dataDir, ...segments);
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJson(filePath, fallbackValue) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return fallbackValue;
    }
    throw error;
  }
}

function writeJson(filePath, value) {
  const directory = path.dirname(filePath);
  ensureDir(directory);
  const payload = JSON.stringify(value, null, 2);
  const tempFile = `${filePath}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tempFile, payload, 'utf8');
  try {
    fs.renameSync(tempFile, filePath);
  } catch (error) {
    fs.rmSync(tempFile, { force: true });
    throw error;
  }
}

module.exports = {
  ensureDir,
  readJson,
  writeJson,
  resolveDataPath,
  setDataDir,
  getDataDir
};
