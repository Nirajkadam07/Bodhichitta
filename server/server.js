const app = require('./app');
const { initDB, seedData } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Initialize database and seed data (async)
(async () => {
  try {
    await initDB();
    await seedData();

    app.listen(PORT, () => {
      console.log(`
🌿 Bodhichitta Server is running!
📍 API: http://localhost:${PORT}
📍 Health: http://localhost:${PORT}/api/health
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
})();
