#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Known API key patterns
const API_KEY_PATTERNS = [
  {
    name: 'Firebase API Key',
    pattern: /AIza[0-9A-Za-z-_]{35}/,
    severity: 'CRITICAL'
  },
  {
    name: 'Cloudinary API Key',
    pattern: /[0-9]{15}/,
    severity: 'CRITICAL'
  },
  {
    name: 'Cloudinary API Secret',
    pattern: /eQR7z9rrUXMTa2qjvScLyUdZrp4/,
    severity: 'CRITICAL'
  },
  {
    name: 'Firebase Project ID',
    pattern: /chatsphere-[a-z0-9]+/,
    severity: 'HIGH'
  },
  {
    name: 'Firebase Storage Bucket',
    pattern: /chatsphere-[a-z0-9]+\.firebasestorage\.app/,
    severity: 'HIGH'
  }
];

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /\.git/,
  /\.expo/,
  /dist/,
  /build/,
  /\.env/,
  /config\.env/,
  /README_SECURITY\.md/,
  /scripts\/check-security\.js/
];

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath));
}

function scanFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const issues = [];
    
    API_KEY_PATTERNS.forEach(({ name, pattern, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          issues.push({
            file: filePath,
            pattern: name,
            match: match,
            severity: severity,
            line: content.split('\n').findIndex(line => line.includes(match)) + 1
          });
        });
      }
    });
    
    return issues;
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error.message);
    return [];
  }
}

function scanDirectory(dirPath) {
  const issues = [];
  
  function scanRecursive(currentPath) {
    try {
      const items = fs.readdirSync(currentPath);
      
      items.forEach(item => {
        const fullPath = path.join(currentPath, item);
        const stat = fs.statSync(fullPath);
        
        if (shouldIgnoreFile(fullPath)) {
          return;
        }
        
        if (stat.isDirectory()) {
          scanRecursive(fullPath);
        } else if (stat.isFile()) {
          const fileIssues = scanFile(fullPath);
          issues.push(...fileIssues);
        }
      });
    } catch (error) {
      console.error(`Error scanning directory ${currentPath}:`, error.message);
    }
  }
  
  scanRecursive(dirPath);
  return issues;
}

function main() {
  console.log('🔍 Scanning for exposed API keys...\n');
  
  const projectRoot = process.cwd();
  const issues = scanDirectory(projectRoot);
  
  if (issues.length === 0) {
    console.log('✅ No exposed API keys found!');
    return;
  }
  
  console.log(`❌ Found ${issues.length} potential security issues:\n`);
  
  // Group by severity
  const criticalIssues = issues.filter(issue => issue.severity === 'CRITICAL');
  const highIssues = issues.filter(issue => issue.severity === 'HIGH');
  
  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES:');
    criticalIssues.forEach(issue => {
      console.log(`  📁 ${issue.file}:${issue.line}`);
      console.log(`     ${issue.pattern}: ${issue.match}`);
      console.log('');
    });
  }
  
  if (highIssues.length > 0) {
    console.log('⚠️  HIGH PRIORITY ISSUES:');
    highIssues.forEach(issue => {
      console.log(`  📁 ${issue.file}:${issue.line}`);
      console.log(`     ${issue.pattern}: ${issue.match}`);
      console.log('');
    });
  }
  
  console.log('🔧 RECOMMENDATIONS:');
  console.log('1. Move all API keys to environment variables');
  console.log('2. Update .gitignore to exclude .env files');
  console.log('3. Regenerate any exposed API keys');
  console.log('4. Review the README_SECURITY.md file for detailed instructions');
  console.log('');
  console.log('💡 Run this script regularly to check for new security issues!');
}

if (require.main === module) {
  main();
}

module.exports = { scanDirectory, scanFile }; 