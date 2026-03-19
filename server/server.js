const app = require('./app');
const { initDB, seedData } = require('./config/database');

const PORT = process.env.PORT || 5000;

// Initialize database and seed data
initDB();
seedData();

app.listen(PORT, () => {
  console.log(`
🌿 Bodhichitta Server is running!
📍 API: http://localhost:${PORT}
📍 Health: http://localhost:${PORT}/api/health
  `);
});
