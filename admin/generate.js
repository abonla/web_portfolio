#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { generateHTML } = require('./lib/generator');

const ROOT = path.join(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data.json'), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
const html = generateHTML(data, template);
fs.writeFileSync(path.join(ROOT, 'index.html'), html, 'utf8');
console.log('✓ index.html regenerated');
