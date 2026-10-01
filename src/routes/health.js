# Health check endpoint
const { healthCheck } = require('./config/db');

app.get('/health', async (req, res) => {
  try {
    const health = await healthCheck();
    res.json(health);
  } catch (error) {
    res.status(503).json({ 
      status: 'error', 
      error: error.message 
    });
  }
});