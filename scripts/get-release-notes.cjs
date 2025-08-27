#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Extract release notes for the latest version from CHANGELOG.md
 */
function getReleaseNotes() {
  try {
    const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
    const changelog = fs.readFileSync(changelogPath, 'utf8');
    
    // Split by lines and find the first version section
    const lines = changelog.split('\n');
    const releaseNotes = [];
    let inReleaseSection = false;
    let foundFirstVersion = false;
    
    for (const line of lines) {
      // Check if this is a version heading (## [x.x.x])
      if (line.match(/^## \[\d+\.\d+\.\d+\]/)) {
        if (foundFirstVersion) {
          // We've reached the next version, stop here
          break;
        }
        foundFirstVersion = true;
        inReleaseSection = true;
        continue; // Skip the version header itself
      }
      
      // If we're in the release section, collect the content
      if (inReleaseSection) {
        releaseNotes.push(line);
      }
    }
    
    // Clean up the release notes
    const cleanedNotes = releaseNotes
      .join('\n')
      .trim()
      .replace(/\n{3,}/g, '\n\n'); // Replace multiple newlines with double newlines
    
    return cleanedNotes || 'Release notes not found in CHANGELOG.md';
    
  } catch (error) {
    console.error('Error reading changelog:', error.message);
    return 'Unable to extract release notes from CHANGELOG.md';
  }
}

// Output the release notes
console.log(getReleaseNotes());