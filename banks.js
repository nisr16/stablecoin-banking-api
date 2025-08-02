/**
 * BANK MANAGEMENT MODULE
 * 
 * This module handles all bank-related operations including registration, authentication,
 * and profile management. It's the entry point for banks to join the stablecoin network.
 * 
 * WHAT THIS MODULE DOES:
 * - Allows banks to register and join the stablecoin network
 * - Generates secure API keys for bank authentication
 * - Manages bank profiles and information
 * - Handles bank authentication for all API requests
 * - Creates default roles and approval rules for new banks
 * 
 * SECURITY FEATURES:
 * - Generates cryptographically secure API keys
 * - Validates bank information before registration
 * - Ensures unique bank names and codes
 * - Provides secure authentication middleware
 * 
 * BUSINESS LOGIC:
 * - Each bank gets its own isolated data environment
 * - Default roles are created for immediate operation
 * - Approval rules are configured for transfer workflows
 * - API credentials are provided for secure access
 * 
 * Author: Development Team
 * Version: 1.0.0
 * Last Updated: August 2025
 */

// Import required libraries and modules
const express = require('express'); // Web framework for creating API endpoints
const crypto = require('crypto'); // Cryptography library for generating secure API keys
const db = require('./database/connection'); // Database connection for storing bank data
const router = express.Router(); // Router for organizing bank-related endpoints
const { randomUUID } = require('crypto');

/**
 * SWAGGER API DOCUMENTATION - BANK DATA STRUCTURES
 * 
 * This section defines the data structures that banks will use when interacting with our API.
 * It provides clear documentation of what data banks need to send and what they'll receive.
 * 
 * BANK SCHEMA:
 * - id: Unique identifier for each bank
 * - bank_name: Official name of the bank
 * - bank_code: Unique code for the bank (like a license number)
 * - api_key: Secure key for authenticating API requests
 * - contact_email: Primary contact email for the bank
 * - country: Country where the bank operates
 * - status: Current status of the bank (active/inactive)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Bank:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Bank ID
 *         bank_name:
 *           type: string
 *           description: Bank name
 *         bank_code:
 *           type: string
 *           description: Bank code
 *         api_key:
 *           type: string
 *           description: API key for authentication
 *         contact_email:
 *           type: string
 *           description: Contact email
 *         country:
 *           type: string
 *           description: Bank country
 *         status:
 *           type: string
 *           description: Bank status
 */

/**
 * @swagger
 * /api/banks/register:
 *   post:
 *     summary: Register a new bank
 *     description: Register a bank to use the stablecoin API with custom user management
 *     tags: [Banks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bank_name
 *               - bank_code
 *               - contact_email
 *               - country
 *             properties:
 *               bank_name:
 *                 type: string
 *                 example: "First National Bank"
 *               bank_code:
 *                 type: string
 *                 example: "FNB001"
 *               contact_email:
 *                 type: string
 *                 example: "api@firstnational.com"
 *               country:
 *                 type: string
 *                 example: "Guatemala"
 *     responses:
 *       201:
 *         description: Bank registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Bank registered successfully"
 *                 bank:
 *                   $ref: '#/components/schemas/Bank'
 *                 api_credentials:
 *                   type: object
 *                   properties:
 *                     api_key:
 *                       type: string
 *                       description: API key for authentication
 *                       example: "sk_1234567890abcdef"
 *                     api_secret:
 *                       type: string
 *                       description: API secret for enhanced security
 *                       example: "secret_abcdef1234567890"
 *                 next_steps:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Recommended next steps
 *                   example: [
 *                     "Store your API credentials securely",
 *                     "Create your first bank user",
 *                     "Configure approval rules if needed",
 *                     "Start creating wallets and transfers"
 *                   ]
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       409:
 *         description: Bank name or code already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
/**
 * BANK REGISTRATION ENDPOINT
 * 
 * This endpoint allows banks to register and join the stablecoin network.
 * When a bank registers, it gets API credentials and default roles for immediate operation.
 * 
 * WHAT HAPPENS DURING REGISTRATION:
 * 1. Bank provides basic information (name, code, email, country)
 * 2. System generates secure API credentials
 * 3. Bank is created in the database
 * 4. Default roles are created for the bank
 * 5. Default approval rules are configured
 * 6. API credentials are returned to the bank
 * 
 * SECURITY FEATURES:
 * - API keys are cryptographically secure
 * - Bank names and codes must be unique
 * - All data is validated before storage
 * 
 * BUSINESS LOGIC:
 * - Each bank gets isolated data environment
 * - Default roles enable immediate operation
 * - Approval rules are pre-configured
 * - Next steps are provided for onboarding
 */
router.post('/register', async (req, res) => {
  // Extract bank information from the request
  const { bank_name, bank_code, contact_email, country } = req.body;
  
  // Validate that all required fields are provided
  if (!bank_name || !bank_code || !contact_email || !country) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["bank_name", "bank_code", "contact_email", "country"]
    });
  }

  try {
    // Generate secure API credentials for the bank
    // These will be used to authenticate all future API requests
    const api_key = `sk_${crypto.randomBytes(16).toString('hex')}`; // 32-character secure key
    const api_secret = crypto.randomBytes(32).toString('hex'); // 64-character secret for enhanced security

    // Insert the bank into the database
    // This creates the bank record with all provided information
    const stmt = db.prepare(`
      INSERT INTO banks (bank_name, bank_code, api_key, api_secret, contact_email, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(bank_name, bank_code, api_key, api_secret, contact_email, country);
    
    // Get the unique ID assigned to this bank
    const bank_id = result.lastInsertRowid;

    /**
     * DEFAULT ROLE CREATION
     * 
     * After creating the bank, we create default roles that the bank can assign to its users.
     * These roles define what different users can do within the bank's system.
     * 
     * ROLE HIERARCHY:
     * - Viewer (Level 1): Can only view reports and balances
     * - Operator (Level 5): Can create transfers and view reports
     * - Manager (Level 7): Can approve transfers and manage users
     * - Admin (Level 10): Full access to all features
     * 
     * PERMISSIONS EXPLAINED:
     * - max_transfer_amount: Maximum amount this role can transfer
     * - can_approve_transfers: Whether this role can approve other transfers
     * - can_create_users: Whether this role can create new users
     * - can_modify_settings: Whether this role can change bank settings
     */
    console.log('Creating roles for bank_id:', bank_id);
    const defaultRoles = [
      [bank_id, 'Viewer', 1, JSON.stringify(['reports']), 0, 0, 0, 0], // Basic viewing permissions
      [bank_id, 'Operator', 5, JSON.stringify(['transfers', 'reports']), 100000, 0, 0, 0], // Can create transfers up to $100k
      [bank_id, 'Manager', 7, JSON.stringify(['transfers', 'approvals', 'reports']), 500000, 1, 0, 0], // Can approve transfers up to $500k
      [bank_id, 'Admin', 10, JSON.stringify(['all']), 1000000, 1, 1, 1] // Full access to everything
    ];

    // Create each role in the database
    for (const role of defaultRoles) {
      try {
        const roleStmt = db.prepare(`
          INSERT INTO roles (bank_id, role_name, role_level, permissions, max_transfer_amount, can_approve_transfers, can_create_users, can_modify_settings)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        roleStmt.run(...role); // Insert the role with all its parameters
        console.log('Created role:', role[1], 'for bank_id:', role[0]);
      } catch (roleError) {
        console.error('Error creating role:', role[1], 'Error:', roleError.message);
        throw roleError; // Stop the process if role creation fails
      }
    }

    /**
     * DEFAULT APPROVAL RULES CREATION
     * 
     * After creating roles, we create default approval rules that determine when transfers
     * need approval and how many approvals are required based on the transfer amount.
     * 
     * APPROVAL RULES EXPLAINED:
     * - Small Transfers ($0-$9,999): Auto-approved, no approval needed
     * - Medium Transfers ($10k-$49k): Need 1 approval from Manager or higher
     * - Large Transfers ($50k-$249k): Need 1 approval from Manager or higher
     * - Very Large Transfers ($250k+): Need 2 approvals from Admin level
     * 
     * BUSINESS LOGIC:
     * - Larger transfers require more approvals for security
     * - Small transfers are auto-approved for efficiency
     * - Each rule specifies the minimum role level needed for approval
     * - Banks can modify these rules later based on their needs
     */
    console.log('Creating approval rules for bank_id:', bank_id);
    const defaultRules = [
      [bank_id, 'Small Transfers', 0, 9999.99, 1, 0, 1], // Auto-approved, no approval needed
      [bank_id, 'Medium Transfers', 10000, 49999.99, 2, 1, 0], // Need 1 approval from Manager+
      [bank_id, 'Large Transfers', 50000, 249999.99, 3, 1, 0], // Need 1 approval from Manager+
      [bank_id, 'Very Large Transfers', 250000, null, 4, 2, 0] // Need 2 approvals from Admin
    ];

    // Create each approval rule in the database
    for (const rule of defaultRules) {
      try {
        const ruleStmt = db.prepare(`
          INSERT INTO approval_rules (bank_id, rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        // Handle null values properly - ensure explicit null handling for unlimited amounts
        const [bankId, ruleName, minAmount, maxAmount, requiredRoleLevel, requiredApprovals, autoApprove] = rule;
        ruleStmt.run(
          bankId, 
          ruleName, 
          minAmount, 
          maxAmount === null ? null : maxAmount, // null means unlimited amount
          requiredRoleLevel, 
          requiredApprovals, 
          autoApprove
        );
        console.log('Created approval rule:', ruleName, 'for bank_id:', bankId);
      } catch (ruleError) {
        console.error('Error creating approval rule:', rule[1], 'Error:', ruleError.message);
        throw ruleError; // Stop the process if rule creation fails
      }
    }

    // Get the created bank
    const bankStmt = db.prepare('SELECT id, bank_name, bank_code, contact_email, country, status, created_at FROM banks WHERE id = ?');
    const bank = bankStmt.get(bank_id);

    res.status(201).json({
      message: "Bank registered successfully",
      bank: bank,
      api_credentials: {
        api_key: api_key,
        api_secret: api_secret
      },
      next_steps: [
        "Store your API credentials securely",
        "Create your first bank user",
        "Configure approval rules if needed",
        "Start creating wallets and transfers"
      ]
    });

  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: "Bank name or code already exists"
      });
    }
    
    console.error('Bank registration error:', error);
    res.status(500).json({
      error: "Failed to register bank"
    });
  }
});

/**
 * @swagger
 * /api/banks/profile:
 *   get:
 *     summary: Get bank profile
 *     description: Get bank information and statistics using API key authentication
 *     tags: [Banks]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Bank profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bank:
 *                   $ref: '#/components/schemas/Bank'
 *                 statistics:
 *                   type: object
 *                   properties:
 *                     total_users:
 *                       type: integer
 *                       description: Number of users in the bank
 *                       example: 15
 *                     total_wallets:
 *                       type: integer
 *                       description: Number of wallets created
 *                       example: 8
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Bank not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile', authenticateBank, async (req, res) => {
  try {
    const bankStmt = db.prepare(`
      SELECT id, bank_name, bank_code, contact_email, country, status, created_at
      FROM banks WHERE api_key = ?
    `);
    const bank = bankStmt.get(req.apiKey);

    if (!bank) {
      return res.status(404).json({ error: "Bank not found" });
    }

    // Get user count
    const userCountStmt = db.prepare('SELECT COUNT(*) as count FROM bank_users WHERE bank_id = ?');
    const userCount = userCountStmt.get(bank.id);
    
    // Get wallet count (using fbo_wallets for now)
    const walletCountStmt = db.prepare('SELECT COUNT(*) as count FROM fbo_wallets');
    const walletCount = walletCountStmt.get();

    res.json({
      bank: bank,
      statistics: {
        total_users: userCount.count,
        total_wallets: walletCount.count
      }
    });
  } catch (error) {
    console.error('Error getting bank profile:', error);
    res.status(500).json({
      error: "Failed to get bank profile"
    });
  }
});

/**
 * BANK AUTHENTICATION MIDDLEWARE
 * 
 * This function validates that API requests are coming from legitimate banks.
 * It checks the API key provided in the request headers and verifies it against
 * the database of registered banks.
 * 
 * HOW AUTHENTICATION WORKS:
 * 1. Bank includes their API key in the request headers
 * 2. This middleware extracts the API key from the request
 * 3. It looks up the API key in the database
 * 4. If found and bank is active, the request proceeds
 * 5. If not found or bank is inactive, request is rejected
 * 
 * SECURITY FEATURES:
 * - Validates API key against database
 * - Only allows active banks to make requests
 * - Provides detailed error messages for debugging
 * - Logs authentication errors for monitoring
 * 
 * USAGE:
 * - This middleware is used by all banking endpoints
 * - It's applied before the actual endpoint logic
 * - Provides bank information to the endpoint handlers
 */
function authenticateBank(req, res, next) {
  // Extract API key from request headers
  // Banks can provide the key in either 'x-api-key' or 'authorization' header
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  // Check if API key was provided
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  try {
    // Look up the bank in the database using the API key
    // Only return banks that are currently active
    const authStmt = db.prepare('SELECT * FROM banks WHERE api_key = ? AND status = ?');
    const bank = authStmt.get(apiKey, 'active');
    
    // If no bank found with this API key, reject the request
    if (!bank) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    
    // If bank found, attach bank information to the request
    // This makes the bank data available to the endpoint handlers
    req.bank = bank; // Full bank object with all bank information
    req.apiKey = apiKey; // API key for logging or additional validation
    next(); // Allow the request to proceed to the actual endpoint
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

/**
 * MODULE EXPORTS
 * 
 * This exports both the router (for API endpoints) and the authentication middleware
 * so other parts of the application can use them.
 * 
 * EXPORTS:
 * - router: Contains all bank-related API endpoints
 * - authenticateBank: Middleware function for bank authentication
 */
module.exports = router;
module.exports.authenticateBank = authenticateBank; 