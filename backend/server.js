require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

// For Vercel serverless deployment
if (process.env.VERCEL) {
  module.exports = app;
} else {
  // For local development
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   Sakshi & Ayush Wedding Planner API Server       ║
  ║   Running on port ${PORT}                            ║
  ╚═══════════════════════════════════════════════════╝
    `);
    console.log(`API available at: http://localhost:${PORT}/api/v1`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

// Export for Vercel
module.exports = app;
