const express = require('express');
const crypto = require('crypto');
const db = require('./database/connection');
const { authenticateBank } = require('./banks');
const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BankUser:
 *       type: object
 *       properties:
 *         user_id:
 *           type: string
 *           description: Unique user identifier
 *         username:
 *           type: string
 *           description: Username
 *         email:
 *           type: string
 *           description: User email
 *         full_name:
 *           type: string
 *           description: Full name
 *         role:
 *           type: string
 *           description: User role
 *         department:
 *           type: string
 *           description: Department
 *         status:
 *           type: string
 *           description: User status
 */

/**
 * @swagger
 * /api/users/create:
 *   post:
 *     summary: Create a new bank user
 *     description: Create a new user for the authenticated bank
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - email
 *               - full_name
 *               - role
 *             properties:
 *               username:
 *                 type: string
 *                 example: "jdoe"
 *               email:
 *                 type: string
 *                 example: "john.doe@bank.com"
 *               full_name:
 *                 type: string
 *                 example: "John Doe"
 *               role:
 *                 type: string
 *                 example: "treasury_operator"
 *               department:
 *                 type: string
 *                 example: "Treasury"
 *               employee_id:
 *                 type: string
 *                 example: "EMP001"
 *     responses:
 *       201:
 *         description: User created successfully
 */
router.post('/create', authenticateBank, async (req, res) => {
  const { username, email, full_name, role, department, employee_id } = req.body;
  
  if (!username || !email || !full_name || !role) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["username", "email", "full_name", "role"]
    });
  }

  try {
    // Verify role exists for this bank
    const roleStmt = db.prepare('SELECT * FROM roles WHERE bank_id = ? AND role_name = ?');
    const roleExists = roleStmt.get(req.bank.id, role);
    
    if (!roleExists) {
      const availableRolesStmt = db.prepare('SELECT role_name FROM roles WHERE bank_id = ?');
      const availableRoles = availableRolesStmt.all(req.bank.id);
      return res.status(400).json({
        error: "Invalid role",
        available_roles: availableRoles.map(r => r.role_name)
      });
    }

    // Generate user ID
    const user_id = `user_${crypto.randomBytes(8).toString('hex')}`;

    // Insert user
    const userStmt = db.prepare(`
      INSERT INTO bank_users (user_id, bank_id, username, email, full_name, role, department, employee_id, permissions, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    userStmt.run(user_id, req.bank.id, username, email, full_name, role, department, employee_id, roleExists.permissions, 'api');

    // Get created user
    const getUserStmt = db.prepare(`
      SELECT user_id, username, email, full_name, role, department, employee_id, status, created_at
      FROM bank_users WHERE user_id = ?
    `);
    const user = getUserStmt.get(user_id);

    res.status(201).json({
      message: "User created successfully",
      user: user
    });

  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({
        error: "Username or email already exists for this bank"
      });
    }
    
    console.error('User creation error:', error);
    res.status(500).json({
      error: "Failed to create user"
    });
  }
});

/**
 * @swagger
 * /api/users/list:
 *   get:
 *     summary: List all bank users
 *     description: Get all users for the authenticated bank with their roles and status
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bank_name:
 *                   type: string
 *                   example: "Nexora Bank"
 *                 total_users:
 *                   type: integer
 *                   example: 15
 *                 users:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BankUser'
 *       401:
 *         description: Invalid or missing API key
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
router.get('/list', authenticateBank, async (req, res) => {
  try {
    const usersStmt = db.prepare(`
      SELECT user_id, username, email, full_name, role, department, employee_id, status, created_at, last_login
      FROM bank_users 
      WHERE bank_id = ? 
      ORDER BY created_at DESC
    `);
    const users = usersStmt.all(req.bank.id);

    res.json({
      bank_name: req.bank.bank_name,
      total_users: users.length,
      users: users
    });
  } catch (error) {
    console.error('Error listing users:', error);
    res.status(500).json({
      error: "Failed to list users"
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}/update:
 *   put:
 *     summary: Update a bank user
 *     description: Update user information including role, department, and status
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to update
 *         example: "user_abc123"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *                 example: "John Doe"
 *               role:
 *                 type: string
 *                 example: "treasury_manager"
 *               department:
 *                 type: string
 *                 example: "Treasury"
 *               employee_id:
 *                 type: string
 *                 example: "EMP001"
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *                 example: "active"
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User updated successfully"
 *                 user:
 *                   $ref: '#/components/schemas/BankUser'
 *       400:
 *         description: Invalid role or status
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
router.put('/:userId/update', authenticateBank, async (req, res) => {
  const { userId } = req.params;
  const { full_name, role, department, employee_id, status } = req.body;

  try {
    // Verify user belongs to this bank
    const verifyUserStmt = db.prepare('SELECT * FROM bank_users WHERE user_id = ? AND bank_id = ?');
    const user = verifyUserStmt.get(userId, req.bank.id);
    
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Update user
    const updateStmt = db.prepare(`
      UPDATE bank_users 
      SET full_name = COALESCE(?, full_name),
          role = COALESCE(?, role),
          department = COALESCE(?, department),
          employee_id = COALESCE(?, employee_id),
          status = COALESCE(?, status)
      WHERE user_id = ? AND bank_id = ?
    `);
    updateStmt.run(full_name, role, department, employee_id, status, userId, req.bank.id);

    // Get updated user
    const updatedUserStmt = db.prepare(`
      SELECT user_id, username, email, full_name, role, department, employee_id, status, created_at
      FROM bank_users WHERE user_id = ?
    `);
    const updatedUser = updatedUserStmt.get(userId);

    res.json({
      message: "User updated successfully",
      user: updatedUser
    });

  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({
      error: "Failed to update user"
    });
  }
});

/**
 * @swagger
 * /api/users/{userId}/deactivate:
 *   post:
 *     summary: Deactivate a user
 *     description: Deactivate a bank user (sets status to inactive)
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to deactivate
 *         example: "user_abc123"
 *     responses:
 *       200:
 *         description: User deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User deactivated successfully"
 *                 user_id:
 *                   type: string
 *                   example: "user_abc123"
 *       401:
 *         description: Invalid or missing API key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: User not found
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
router.post('/:userId/deactivate', authenticateBank, async (req, res) => {
  const { userId } = req.params;

  try {
    const deactivateStmt = db.prepare(`
      UPDATE bank_users 
      SET status = 'inactive' 
      WHERE user_id = ? AND bank_id = ?
    `);
    const result = deactivateStmt.run(userId, req.bank.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      message: "User deactivated successfully",
      user_id: userId
    });

  } catch (error) {
    console.error('User deactivation error:', error);
    res.status(500).json({
      error: "Failed to deactivate user"
    });
  }
});

/**
 * @swagger
 * /api/users/roles:
 *   get:
 *     summary: Get available roles for the bank
 *     description: Get all roles available for the authenticated bank with their permissions and limits
 *     tags: [Users]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Roles retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bank_name:
 *                   type: string
 *                   example: "Nexora Bank"
 *                 total_roles:
 *                   type: integer
 *                   example: 5
 *                 roles:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       role_name:
 *                         type: string
 *                         example: "treasury_operator"
 *                       role_level:
 *                         type: integer
 *                         example: 1
 *                       permissions:
 *                         type: string
 *                         example: "[\"create_transfers\", \"view_wallets\"]"
 *                       max_transfer_amount:
 *                         type: number
 *                         example: 100000
 *                       can_approve_transfers:
 *                         type: boolean
 *                         example: false
 *                       can_create_users:
 *                         type: boolean
 *                         example: false
 *                       can_modify_settings:
 *                         type: boolean
 *                         example: false
 *       401:
 *         description: Invalid or missing API key
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
router.get('/roles', authenticateBank, async (req, res) => {
  try {
    const rolesStmt = db.prepare(`
      SELECT role_name, role_level, permissions, max_transfer_amount, can_approve_transfers, can_create_users, can_modify_settings
      FROM roles 
      WHERE bank_id = ? 
      ORDER BY role_level ASC
    `);
    const roles = rolesStmt.all(req.bank.id);

    res.json({
      bank_name: req.bank.bank_name,
      total_roles: roles.length,
      roles: roles
    });
  } catch (error) {
    console.error('Error getting roles:', error);
    res.status(500).json({
      error: "Failed to get roles"
    });
  }
});

module.exports = router; 