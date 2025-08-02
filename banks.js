const express = require('express');
const crypto = require('crypto');
const db = require('./database/connection');
const router = express.Router();

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
router.post('/register', async (req, res) => {
  const { bank_name, bank_code, contact_email, country } = req.body;
  
  if (!bank_name || !bank_code || !contact_email || !country) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["bank_name", "bank_code", "contact_email", "country"]
    });
  }

  try {
    // Generate API credentials
    const api_key = `sk_${crypto.randomBytes(16).toString('hex')}`;
    const api_secret = crypto.randomBytes(32).toString('hex');

    // Insert bank
    const stmt = db.prepare(`
      INSERT INTO banks (bank_name, bank_code, api_key, api_secret, contact_email, country)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(bank_name, bank_code, api_key, api_secret, contact_email, country);
    
    const bank_id = result.lastInsertRowid;

    // Create default roles for this bank
    console.log('Creating roles for bank_id:', bank_id);
    const defaultRoles = [
      [bank_id, 'Viewer', 1, JSON.stringify(['reports']), 0, 0, 0, 0],
      [bank_id, 'Operator', 5, JSON.stringify(['transfers', 'reports']), 100000, 0, 0, 0],
      [bank_id, 'Manager', 7, JSON.stringify(['transfers', 'approvals', 'reports']), 500000, 1, 0, 0],
      [bank_id, 'Admin', 10, JSON.stringify(['all']), 1000000, 1, 1, 1]
    ];

    for (const role of defaultRoles) {
      try {
        const roleStmt = db.prepare(`
          INSERT INTO roles (bank_id, role_name, role_level, permissions, max_transfer_amount, can_approve_transfers, can_create_users, can_modify_settings)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        roleStmt.run(...role);
        console.log('Created role:', role[1], 'for bank_id:', role[0]);
      } catch (roleError) {
        console.error('Error creating role:', role[1], 'Error:', roleError.message);
        throw roleError;
      }
    }

    // Create default approval rules
    console.log('Creating approval rules for bank_id:', bank_id);
    const defaultRules = [
      [bank_id, 'Small Transfers', 0, 9999.99, 1, 0, 1],
      [bank_id, 'Medium Transfers', 10000, 49999.99, 2, 1, 0],
      [bank_id, 'Large Transfers', 50000, 249999.99, 3, 1, 0],
      [bank_id, 'Very Large Transfers', 250000, null, 4, 2, 0]
    ];

    for (const rule of defaultRules) {
      try {
        const ruleStmt = db.prepare(`
          INSERT INTO approval_rules (bank_id, rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        // Handle null values properly - ensure explicit null handling
        const [bankId, ruleName, minAmount, maxAmount, requiredRoleLevel, requiredApprovals, autoApprove] = rule;
        ruleStmt.run(
          bankId, 
          ruleName, 
          minAmount, 
          maxAmount === null ? null : maxAmount, 
          requiredRoleLevel, 
          requiredApprovals, 
          autoApprove
        );
        console.log('Created approval rule:', ruleName, 'for bank_id:', bankId);
      } catch (ruleError) {
        console.error('Error creating approval rule:', rule[1], 'Error:', ruleError.message);
        throw ruleError;
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

// Middleware to authenticate bank API key
function authenticateBank(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey) {
    return res.status(401).json({ error: "API key required" });
  }

  try {
    const authStmt = db.prepare('SELECT * FROM banks WHERE api_key = ? AND status = ?');
    const bank = authStmt.get(apiKey, 'active');
    
    if (!bank) {
      return res.status(401).json({ error: "Invalid API key" });
    }
    req.bank = bank;
    req.apiKey = apiKey;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: "Authentication failed" });
  }
}

module.exports = router;
module.exports.authenticateBank = authenticateBank; 