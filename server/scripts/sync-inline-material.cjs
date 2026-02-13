#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const materialPath = path.join(projectRoot, 'material.json');
const indexPath = path.join(projectRoot, 'index.html');

const startTag = '<script id="material-inline-json" type="application/json">';
const endTag = '</script>';

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function syncInlineMaterial() {
  const material = readJson(materialPath);
  const prettyJson = JSON.stringify(material, null, 2);

  const html = fs.readFileSync(indexPath, 'utf8');
  const startIndex = html.indexOf(startTag);
  if (startIndex === -1) {
    throw new Error('Could not find inline material start tag in index.html');
  }

  const afterStart = startIndex + startTag.length;
  const endIndex = html.indexOf(endTag, afterStart);
  if (endIndex === -1) {
    throw new Error('Could not find inline material end tag in index.html');
  }

  const replacement = `${startTag}\n${prettyJson}\n    ${endTag}`;
  const updated = html.slice(0, startIndex) + replacement + html.slice(endIndex + endTag.length);
  fs.writeFileSync(indexPath, updated, 'utf8');
}

try {
  syncInlineMaterial();
  console.log('Synced inline material JSON from material.json into index.html');
} catch (err) {
  console.error('Failed to sync inline material:', err.message);
  process.exit(1);
}
