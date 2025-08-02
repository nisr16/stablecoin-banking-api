/**
 * ENTERPRISE STABLECOIN BANKING API - MAIN SERVER FILE
 * 
 * This is the main entry point for the Nexora Enterprise Stablecoin Banking API.
 * It sets up the Express.js web server, configures all routes, initializes the database,
 * and starts the server to handle banking operations.
 * 
 * WHAT THIS FILE DOES:
 * - Creates the main web server that banks connect to
 * - Sets up all the different API endpoints (bank registration, transfers, etc.)
 * - Configures security and authentication
 * - Provides health checks and system information
 * - Sets up real-time notifications via WebSocket
 * - Starts the server on port 3000
 * 
 * KEY COMPONENTS:
 * - Express.js web framework for handling HTTP requests
 * - Swagger documentation for API reference
 * - Database connection initialization
 * - Route modules for different banking functions
 * - WebSocket server for real-time updates
 * 
 * SECURITY FEATURES:
 * - API key authentication for all banking operations
 * - Role-based access control
 * - Input validation and sanitization
 * - Error handling and logging
 * 
 * BUSINESS LOGIC:
 * - Multi-bank support with data isolation
 * - Transfer approval workflows
 * - User management and permissions
 * - Real-time notifications for important events
 * 
 * Author: Development Team
 * Version: 1.0.0
 * Last Updated: August 2025
 */

// Import required libraries and modules
const express = require('express'); // Web framework for creating the API server
const app = express(); // Create the main application
const port = 3000; // Port number where the server will run

// Import all the different route modules that handle specific banking functions
// Each module handles a different aspect of the banking system
const walletRoutes = require('./wallet'); // Handles wallet creation and balance management
const transferRoutes = require('./transfers'); // Handles money transfers between banks
const bankRoutes = require('./banks'); // Handles bank registration and profile management
const userRoutes = require('./users'); // Handles user creation and management within banks
const roleRoutes = require('./roles'); // Handles roles and approval rules
const { router: notificationRoutes, notificationService } = require('./notifications'); // Handles real-time notifications
const { specs, swaggerUi } = require('./swagger'); // Handles API documentation

// Initialize the database connection
// This connects to our SQLite database that stores all banking data
const db = require('./database/connection');

// Configure middleware - these are functions that process requests before they reach our routes
app.use(express.json()); // This allows the server to understand JSON data sent by banks

// Set up Swagger API documentation
// This creates an interactive web page where banks can see and test all available API endpoints
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

/**
 * SWAGGER API DOCUMENTATION CONFIGURATION
 * 
 * This section defines all the data structures and security schemes that banks will use
 * when interacting with our API. It's like a contract that explains exactly what data
 * format we expect and what we'll return.
 * 
 * SECURITY SCHEMES:
 * - ApiKeyAuth: Banks must provide an API key in their requests for authentication
 * 
 * DATA STRUCTURES (Schemas):
 * - Transfer: Represents a money transfer between wallets
 * - ApprovalRule: Defines rules for when transfers need approval
 * - Notification: Represents system notifications sent to users
 * - WebhookEndpoint: Defines where banks want to receive real-time updates
 * - NotificationPreferences: User settings for what notifications they want
 * - Error: Standard error response format
 * - ValidationError: Format for when banks send invalid data
 * - SuccessResponse: Standard success response format
 */

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
 * HEALTH CHECK ENDPOINT
 * 
 * This endpoint allows banks and monitoring systems to check if our API is working properly.
 * It's like a heartbeat that confirms the system is running and healthy.
 * 
 * PURPOSE:
 * - Banks can call this to verify the API is available
 * - Monitoring systems can check system health
 * - Load balancers can verify service status
 * - Provides basic system information
 * 
 * WHAT IT RETURNS:
 * - Current system status (healthy/unhealthy)
 * - Current timestamp
 * - API version number
 * - List of available features
 * 
 * USAGE:
 * - Called automatically by monitoring systems
 * - Banks can test connectivity before making important requests
 * - No authentication required (public endpoint)
 */
app.get('/api/health', (req, res) => {
  // Return system health information
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
 * API INFORMATION ENDPOINT
 * 
 * This endpoint provides comprehensive information about our API capabilities and available features.
 * It's like a catalog that tells banks what they can do with our system.
 * 
 * PURPOSE:
 * - Helps banks understand what our API can do
 * - Provides a list of all available endpoints
 * - Shows system features and capabilities
 * - Serves as a quick reference for developers
 * 
 * WHAT IT RETURNS:
 * - API name and description
 * - Link to interactive documentation
 * - List of all available endpoints with descriptions
 * - List of system features and capabilities
 * 
 * USAGE:
 * - Banks can call this to understand API capabilities
 * - Developers can see what endpoints are available
 * - No authentication required (public endpoint)
 */
app.get('/api/info', (req, res) => {
  // Return comprehensive API information
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

/**
 * ROUTE CONFIGURATION
 * 
 * This section connects all our different banking modules to specific URL paths.
 * Each route handles a different aspect of banking operations.
 * 
 * ROUTE STRUCTURE:
 * - /api/banks/* - Bank registration and profile management
 * - /api/users/* - User creation and management within banks
 * - /api/roles/* - Role and approval rule management
 * - /api/wallets/* - Wallet creation and balance management
 * - /api/transfers/* - Money transfer operations
 * - /api/notifications/* - Real-time notification system
 * 
 * SECURITY:
 * - All routes (except health/info) require API key authentication
 * - Each route validates that banks can only access their own data
 * - Role-based permissions are enforced at the route level
 */
app.use('/api/banks', bankRoutes); // Bank registration and profile management
app.use('/api/users', userRoutes); // User creation and management within banks
app.use('/api/roles', roleRoutes); // Role and approval rule management
app.use('/api/wallets', walletRoutes); // Wallet creation and balance management
app.use('/api/transfers', transferRoutes); // Money transfer operations
app.use('/api/notifications', notificationRoutes); // Real-time notification system

/**
 * SERVER STARTUP
 * 
 * This section starts the web server and makes it available for banks to connect to.
 * The server listens on port 3000 and provides both HTTP and WebSocket connections.
 * 
 * WHAT HAPPENS WHEN THE SERVER STARTS:
 * - Express.js server starts listening for HTTP requests
 * - WebSocket server is initialized for real-time notifications
 * - Database connection is established
 * - All routes are registered and ready to handle requests
 * - Console messages show available endpoints
 * 
 * AVAILABLE CONNECTIONS:
 * - HTTP API: http://localhost:3000 (for all banking operations)
 * - WebSocket: ws://localhost:3000/ws (for real-time notifications)
 * - API Documentation: http://localhost:3000/api-docs (interactive documentation)
 */
const server = app.listen(port, () => {
  console.log(`Enterprise Stablecoin API running at http://localhost:${port}`);
  console.log(`Try: http://localhost:${port}/api/health`);
  console.log(`API Documentation: http://localhost:${port}/api-docs`);
  console.log(`Bank registration: http://localhost:${port}/api/banks/register`);
  console.log(`WebSocket endpoint: ws://localhost:${port}/ws`);
});

/**
 * WEBSOCKET SERVER INITIALIZATION
 * 
 * This sets up real-time communication for instant notifications.
 * Banks can receive immediate updates about transfers, approvals, and system events
 * without having to constantly check the API.
 * 
 * WHAT IT ENABLES:
 * - Real-time transfer status updates
 * - Instant approval notifications
 * - System alerts and warnings
 * - Live balance updates
 * - Security event notifications
 */
notificationService.setWebSocketServer(server);
