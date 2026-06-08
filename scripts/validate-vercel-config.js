#!/usr/bin/env node

/**
 * Validate Vercel configuration files
 * Checks JSON syntax, required fields, valid rewrites, Vercel compatibility
 */

const fs = require('fs');
const path = require('path');

const VERCEL_CONFIGS = [
  'vercel.json',
  'frontend/vercel.json',
];

console.log('🔍 Validating Vercel configuration files...\n');

let errors = [];
let warnings = [];
let configs = {};

// 1. Check file existence and parse JSON
VERCEL_CONFIGS.forEach((file) => {
  const filePath = path.join(__dirname, '..', file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ${file} not found`);
    return;
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');

    // Check for invalid characters (like spaces between every character)
    if (/. ./.test(content.substring(0, 50))) {
      errors.push(`${file}: Contains invalid character spacing - file appears corrupted`);
      return;
    }

    const config = JSON.parse(content);
    configs[file] = config;
    console.log(`✅ ${file}: Valid JSON`);
  } catch (err) {
    errors.push(`${file}: ${err.message}`);
    console.log(`❌ ${file}: ${err.message}`);
    return;
  }
});

// 2. Validate structure
Object.entries(configs).forEach(([file, config]) => {
  console.log(`\n📋 Checking ${file} structure:`);

  // Check for invalid properties
  const validProps = ['buildCommand', 'outputDirectory', 'installCommand', 'functions', 'rewrites', 'env', 'regions', 'runtime'];
  Object.keys(config).forEach(prop => {
    if (!validProps.includes(prop)) {
      if (prop === 'root') {
        errors.push(`${file}: 'root' property is INVALID in Vercel. Use Root Directory in dashboard instead.`);
        console.log(`  ❌ 'root' property is invalid`);
      } else {
        warnings.push(`${file}: Unknown property '${prop}'`);
        console.log(`  ⚠️  Unknown property: '${prop}'`);
      }
    }
  });

  // Validate rewrites if present
  if (config.rewrites) {
    if (!Array.isArray(config.rewrites)) {
      errors.push(`${file}: 'rewrites' must be an array`);
      console.log(`  ❌ 'rewrites' is not an array`);
      return;
    }

    config.rewrites.forEach((rewrite, idx) => {
      if (!rewrite.source || !rewrite.destination) {
        errors.push(`${file}: Rewrite[${idx}] missing 'source' or 'destination'`);
        console.log(`  ❌ Rewrite[${idx}] incomplete`);
      } else {
        console.log(`  ✅ Rewrite[${idx}]: ${rewrite.source} -> ${rewrite.destination}`);
      }

      // Check for invalid destination patterns
      if (rewrite.destination && rewrite.destination.includes('../../')) {
        errors.push(`${file}: Rewrite[${idx}] uses invalid path '../..' - Vercel doesn't support relative paths`);
        console.log(`  ❌ Invalid relative path in destination`);
      }
    });
  }

  // Validate functions if present
  if (config.functions) {
    if (!Array.isArray(config.functions)) {
      errors.push(`${file}: 'functions' must be an array`);
      console.log(`  ❌ 'functions' is not an array`);
    }
  }

  // Check build/output mismatch
  if (config.buildCommand && !config.outputDirectory) {
    warnings.push(`${file}: Has buildCommand but no outputDirectory specified`);
    console.log(`  ⚠️  buildCommand without outputDirectory`);
  }
});

// 3. Context-specific validation
console.log(`\n🎯 Context-specific validation:`);

if (configs['vercel.json']) {
  const root = configs['vercel.json'];
  if (root.buildCommand || root.outputDirectory) {
    console.log(`  ⚠️  Root vercel.json has build settings - this is a monorepo, ensure Root Directory is set in dashboard`);
  } else {
    console.log(`  ✅ Root vercel.json is minimal (good for monorepo)`);
  }
}

if (configs['frontend/vercel.json']) {
  const frontend = configs['frontend/vercel.json'];
  if (!frontend.rewrites || frontend.rewrites.length === 0) {
    errors.push(`frontend/vercel.json: Missing rewrites for SPA routing`);
    console.log(`  ❌ No rewrites for SPA routing`);
  } else {
    const hasSPAFallback = frontend.rewrites.some(r => r.source === '/(.*)');;
    if (hasSPAFallback) {
      console.log(`  ✅ Has SPA fallback rewrite`);
    } else {
      warnings.push(`frontend/vercel.json: Missing SPA fallback rewrite '/(.*)'`);
      console.log(`  ⚠️  No SPA fallback rewrite`);
    }
  }
}

// 4. Summary
console.log(`\n${'='.repeat(50)}`);
console.log(`Summary:`);
console.log(`  Files validated: ${Object.keys(configs).length}`);
console.log(`  Errors: ${errors.length}`);
console.log(`  Warnings: ${warnings.length}`);
console.log(`${'='.repeat(50)}\n`);

if (errors.length > 0) {
  console.log(`❌ ERRORS:\n`);
  errors.forEach(e => console.log(`  • ${e}`));
  process.exit(1);
}

if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS:\n`);
  warnings.forEach(w => console.log(`  • ${w}`));
}

console.log(`\n✅ Vercel configuration is valid!\n`);
process.exit(0);
