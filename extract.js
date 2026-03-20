const fs = require('fs');
const path = require('path');
const unzipper = require('unzipper');

const zipPath = path.join(__dirname, 'pagina.zip');
const extractPath = __dirname;

fs.createReadStream(zipPath)
  .pipe(unzipper.Extract({ path: extractPath }))
  .on('close', () => {
    console.log('Extraction completed successfully');
    process.exit(0);
  })
  .on('error', (err) => {
    console.error('Extraction failed:', err);
    process.exit(1);
  });
