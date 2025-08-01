// Simple API server for stablecoin infrastructure
const express = require('express');
const app = express();
const port = 3000;

// Import routes
const walletRoutes = require('./wallet');
const transferRoutes = require('./transfers');
const bankRoutes = require('./banks');
const userRoutes = require('./users');
const roleRoutes = require('./roles');
const { router: notificationRoutes, notificationService } = require('./notifications');
const { specs, swaggerUi } = require('./swagger');

// Initialize database
const db = require('./database/connection');

// Middleware to parse JSON
app.use(express.json());

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     ApiKeyAuth:
 *       type: apiKey
 *       in: header
 *       name: X-API-Key
 *       description: API key for bank authentication
 *   
 *   schemas:
 *     Transfer:
 *       type: object
 *       properties:
 *         transfer_id:
 *           type: string
 *           description: Unique transfer identifier
 *           example: "transfer_1001"
 *         from_wallet_id:
 *           type: string
 *           description: Source wallet ID
 *           example: "wallet_1000"
 *         to_wallet_id:
 *           type: string
 *           description: Destination wallet ID
 *           example: "wallet_1001"
 *         amount:
 *           type: number
 *           description: Transfer amount
 *           example: 50000
 *         currency:
 *           type: string
 *           description: Transfer currency
 *           example: "USDC"
 *         status:
 *           type: string
 *           enum: [pending_approval, approved, completed, failed, cancelled]
 *           description: Transfer status
 *           example: "pending_approval"
 *         fees:
 *           type: number
 *           description: Transfer fees
 *           example: 50
 *         transaction_hash:
 *           type: string
 *           description: Blockchain transaction hash
 *           example: "0x1234567890abcdef"
 *         initiated_by:
 *           type: string
 *           description: User who initiated the transfer
 *           example: "user_abc123"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Transfer creation timestamp
 *         completed_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Transfer completion timestamp
 *   
 *     ApprovalRule:
 *       type: object
 *       properties:
 *         rule_name:
 *           type: string
 *           description: Name of the approval rule
 *           example: "Standard Transfer"
 *         min_amount:
 *           type: number
 *           description: Minimum amount for this rule
 *           example: 10000
 *         max_amount:
 *           type: number
 *           nullable: true
 *           description: Maximum amount for this rule
 *           example: 100000
 *         required_role_level:
 *           type: integer
 *           description: Required role level for approval
 *           example: 2
 *         required_approvals:
 *           type: integer
 *           description: Number of required approvals
 *           example: 1
 *         auto_approve:
 *           type: boolean
 *           description: Whether transfers are auto-approved
 *           example: false
 *   
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Notification ID
 *           example: 1
 *         user_id:
 *           type: integer
 *           description: User ID
 *           example: 1
 *         type:
 *           type: string
 *           description: Notification type
 *           example: "transfer_completed"
 *         title:
 *           type: string
 *           description: Notification title
 *           example: "Transfer Completed"
 *         message:
 *           type: string
 *           description: Notification message
 *           example: "Transfer of 50000 USDC has been completed"
 *         status:
 *           type: string
 *           enum: [unread, read, archived]
 *           description: Notification status
 *           example: "unread"
 *         priority:
 *           type: string
 *           enum: [low, normal, high, urgent]
 *           description: Notification priority
 *           example: "normal"
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Notification creation timestamp
 *   
 *     WebhookEndpoint:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Webhook endpoint ID
 *           example: 1
 *         bank_id:
 *           type: integer
 *           description: Bank ID
 *           example: 1
 *         name:
 *           type: string
 *           description: Webhook name
 *           example: "Transfer Notifications"
 *         url:
 *           type: string
 *           description: Webhook URL
 *           example: "https://api.bank.com/webhooks/transfers"
 *         events:
 *           type: string
 *           description: JSON string of event types
 *           example: "[\"transfer_completed\", \"transfer_failed\"]"
 *         is_active:
 *           type: boolean
 *           description: Whether webhook is active
 *           example: true
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Webhook creation timestamp
 *         last_triggered:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Last webhook trigger timestamp
 *         failure_count:
 *           type: integer
 *           description: Number of failed webhook attempts
 *           example: 0
 *   
 *     NotificationPreferences:
 *       type: object
 *       properties:
 *         user_id:
 *           type: integer
 *           description: User ID
 *           example: 1
 *         email_enabled:
 *           type: boolean
 *           description: Email notifications enabled
 *           example: true
 *         sms_enabled:
 *           type: boolean
 *           description: SMS notifications enabled
 *           example: false
 *         push_enabled:
 *           type: boolean
 *           description: Push notifications enabled
 *           example: true
 *         webhook_enabled:
 *           type: boolean
 *           description: Webhook notifications enabled
 *           example: true
 *         transfer_notifications:
 *           type: boolean
 *           description: Transfer notifications enabled
 *           example: true
 *         approval_notifications:
 *           type: boolean
 *           description: Approval notifications enabled
 *           example: true
 *         security_notifications:
 *           type: boolean
 *           description: Security notifications enabled
 *           example: true
 *         system_notifications:
 *           type: boolean
 *           description: System notifications enabled
 *           example: false
 *   
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 *           example: "Invalid API key"
 *         code:
 *           type: string
 *           description: Error code
 *           example: "AUTH_ERROR"
 *         details:
 *           type: object
 *           description: Additional error details
 *     
 *     ValidationError:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Validation error message
 *           example: "Missing required fields"
 *         required:
 *           type: array
 *           items:
 *             type: string
 *           description: List of required fields
 *           example: ["bank_name", "bank_code", "contact_email"]
 *     
 *     SuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Success message
 *         data:
 *           type: object
 *           description: Response data
 */

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
 *                   example: "2024-01-15T10:30:00.000Z"
 *                 status:
 *                   type: string
 *                   example: "healthy"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["Multi-bank user management", "Custom approval workflows", "Role-based permissions", "Enterprise-grade security"]
 *       500:
 *         description: API is experiencing issues
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/api/health', (req, res) => {
  res.json({ 
    message: "Stablecoin API is running",
    timestamp: new Date(),
    status: "healthy",
    version: "1.0.0",
    features: [
      "Multi-bank user management",
      "Custom approval workflows", 
      "Role-based permissions",
      "Enterprise-grade security"
    ]
  });
});

/**
 * @swagger
 * /api/info:
 *   get:
 *     summary: API information and available endpoints
 *     description: Returns comprehensive information about the API capabilities and available endpoints
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
 *                   example: "Enterprise Stablecoin Banking API"
 *                 description:
 *                   type: string
 *                   example: "Complete banking infrastructure with user management and approval workflows"
 *                 documentation:
 *                   type: string
 *                   example: "Visit /api-docs for interactive API documentation"
 *                 endpoints:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "POST /api/banks/register - Register your bank",
 *                     "POST /api/users/create - Create bank users",
 *                     "GET /api/roles/list - View roles and permissions",
 *                     "POST /api/wallets/create - Create treasury wallets",
 *                     "POST /api/transfers/initiate - Initiate transfers with approvals",
 *                     "POST /api/transfers/{id}/approve - Approve pending transfers"
 *                   ]
 *                 features:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "Multi-bank user management",
 *                     "Custom approval workflows",
 *                     "Role-based permissions",
 *                     "Instant wallet creation",
 *                     "30-second transfer processing",
 *                     "Complete audit trails",
 *                     "Interactive API documentation"
 *                   ]
 */
app.get('/api/info', (req, res) => {
  res.json({
    name: "Enterprise Stablecoin Banking API",
    description: "Complete banking infrastructure with user management and approval workflows",
    documentation: "Visit /api-docs for interactive API documentation",
    endpoints: [
      "POST /api/banks/register - Register your bank",
      "POST /api/users/create - Create bank users", 
      "GET /api/roles/list - View roles and permissions",
      "POST /api/wallets/create - Create treasury wallets",
      "POST /api/transfers/initiate - Initiate transfers with approvals",
      "POST /api/transfers/{id}/approve - Approve pending transfers"
    ],
    features: [
      "Multi-bank user management",
      "Custom approval workflows",
      "Role-based permissions", 
      "Instant wallet creation",
      "30-second transfer processing",
      "Complete audit trails",
      "Interactive API documentation"
    ]
  });
});

// Use routes
app.use('/api/banks', bankRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/notifications', notificationRoutes);

// Start the server
const server = app.listen(port, () => {
  console.log(`Enterprise Stablecoin API running at http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/health`);
  console.log(`API Documentation: http://localhost:${port}/api-docs`);
  console.log(`Bank registration: http://localhost:${port}/api/banks/register`);
  console.log(`WebSocket endpoint: ws://localhost:${port}/ws`);
});

// Initialize WebSocket server for real-time notifications
notificationService.setWebSocketServer(server);// Force Railway deployment - Fri Aug  1 18:39:37 -03 2025
