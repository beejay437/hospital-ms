require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 5000;

const start = async () => {
  const dbOk = await testConnection();
  if (!dbOk) {
  console.error('⚠️ Could not connect to database — but server will still start');
}

  app.listen(PORT, () => {
    console.log(`\n🏥 Hospital MS API running on http://localhost:${PORT}`);
    console.log(`📖 Health check: http://localhost:${PORT}/health`);
    console.log(`🌐 API base: http://localhost:${PORT}/api/v1\n`);
  });
};

start().catch((err) => {
  console.error('Server startup error:', err);
});
