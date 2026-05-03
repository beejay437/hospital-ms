require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/database');

const PORT = process.env.PORT || 5000;

const start = async () => {
  try {
    const dbOk = await testConnection();

    if (!dbOk) {
      console.error('⚠️ Could not connect to database — server will still start');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Startup crash:', err);

    app.listen(PORT, () => {
      console.log(`🚀 Server running (with errors) on port ${PORT}`);
    });
  }
};

start();
