// Simple API server for stablecoin infrastructure
const express = require('express');
const app = express();
const port = 3000;

// Import routes
const walletRoutes = require('./wallet');
const transferRoutes = require('./transfers');

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    message: "Stablecoin API is running",
    timestamp: new Date(),
    status: "healthy",
    version: "0.3.0"
  });
});

// Basic info endpoint
app.get('/api/info', (req, res) => {
  res.json({
    name: "Bank Stablecoin Transfer API",
    description: "30-second cross-border transfers for banks",
    endpoints: [
      "GET /api/health", 
      "GET /api/info",
      "POST /api/wallets/create",
      "GET /api/wallets/:walletId/balance",
      "GET /api/wallets/list/:bankName",
      "POST /api/transfers/initiate",
      "GET /api/transfers/:transferId/status",
      "GET /api/transfers/history/:walletId"
    ],
    features: [
      "Instant wallet creation",
      "Real-time balance checking", 
      "30-second interbank transfers",
      "Transaction history tracking"
    ]
  });
});

// Use routes
app.use('/api/wallets', walletRoutes);
app.use('/api/transfers', transferRoutes);

// Start the server
app.listen(port, () => {
  console.log(`Stablecoin API running at http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/health`);
  console.log(`Wallet endpoints: http://localhost:${port}/api/wallets`);
  console.log(`Transfer endpoints: http://localhost:${port}/api/transfers`);
});