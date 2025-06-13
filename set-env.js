const fs = require('fs');
const path = require('path');

const environmentProdPath = path.resolve(__dirname, 'src/environments/environment.prod.ts');
const geminiApiKey = process.env.GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_PRODUCTION_FALLBACK';
const apiUrl = process.env.API_URL || 'https://your-production-api-url.com'; // Assuming you might have an API_URL env variable too

const content = `export const environment = {
  production: true,
  GEMINI_API_KEY: '${geminiApiKey}',
  apiUrl: '${apiUrl}',
};
`;

fs.writeFileSync(environmentProdPath, content);
console.log('Environment file generated successfully!'); 