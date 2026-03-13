import 'dotenv/config';
import app from './api/_src/app';

const PORT = process.env['PORT'] ?? 3001;

// Start server only in local development
if (!process.env['VERCEL']) {
  app.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════════╗
  ║   Wedding Planner API Server                      ║
  ║   Running on port ${PORT}                            ║
  ╚═══════════════════════════════════════════════════╝
    `);
    console.log(`API available at: http://localhost:${PORT}/api/v1`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });
}

export default app;
