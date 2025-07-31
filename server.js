// Simple API server for stablecoin infrastructure
const express = require('express');
const app = express();
const port = 3000;

// Import routes
const walletRoutes = require('./wallet');
const transferRoutes = require('./transfers');
const { specs, swaggerUi } = require('./swagger');

// Middleware to parse JSON
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the current status and health of the API
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API is healthy and running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Stablecoin API is running"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 version:
 *                   type: string
 *                   example: "0.3.0"
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    message: "Stablecoin API is running",
    timestamp: new Date(),
    status: "healthy",
    version: "0.3.0"
  });
});

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: API information and available endpoints
 *     description: Returns comprehensive information about the API capabilities
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: API information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Bank Stablecoin Transfer API"
 *                 description:
 *                   type: string
 *                   example: "30-second cross-border transfers for banks"
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: "Bank Stablecoin Transfer API",
    description: "30-second cross-border transfers for banks",
    documentation: "Visit /api-docs for interactive API documentation",
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
      "Transaction history tracking",
      "Interactive API documentation"
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
  console.log(`API Documentation: http://localhost:${port}/api-docs`);
  console.log(`Wallet endpoints: http://localhost:${port}/api/wallets`);
  console.log(`Transfer endpoints: http://localhost:${port}/api/transfers`);
});