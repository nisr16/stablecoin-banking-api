const express = require('express');
const db = require('./database/connection');
const { authenticateBank } = require('./banks');
const router = express.Router();

/**
 * @swagger
 * /api/roles/list:
 *   get:
 *     summary: List all roles for the bank
 *     description: Get all roles configured for the authenticated bank with their permissions and capabilities
 *     tags: [Roles]
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
 *                         type: object
 *                         description: JSON object of permissions
 *                         example: {"create_transfers": true, "view_wallets": true}
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
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
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
    const roles = await db.all(`
      SELECT role_name, role_level, permissions, max_transfer_amount, 
             can_approve_transfers, can_create_users, can_modify_settings, created_at
      FROM roles 
      WHERE bank_id = ? 
      ORDER BY role_level ASC
    `, [req.bank.id]);

    res.json({
      bank_name: req.bank.bank_name,
      total_roles: roles.length,
      roles: roles.map(role => ({
        ...role,
        permissions: JSON.parse(role.permissions)
      }))
    });
  } catch (error) {
    console.error('Error listing roles:', error);
    res.status(500).json({
      error: "Failed to list roles"
    });
  }
});

/**
 * @swagger
 * /api/roles/approval-rules:
 *   get:
 *     summary: Get approval rules
 *     description: Get all approval rules for the authenticated bank with transfer amount thresholds
 *     tags: [Roles]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Approval rules retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bank_name:
 *                   type: string
 *                   example: "Nexora Bank"
 *                 total_rules:
 *                   type: integer
 *                   example: 3
 *                 approval_rules:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       rule_name:
 *                         type: string
 *                         example: "Standard Transfer"
 *                       min_amount:
 *                         type: number
 *                         example: 10000
 *                       max_amount:
 *                         type: number
 *                         nullable: true
 *                         example: 100000
 *                       required_role_level:
 *                         type: integer
 *                         example: 2
 *                       required_approvals:
 *                         type: integer
 *                         example: 1
 *                       auto_approve:
 *                         type: boolean
 *                         example: false
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
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
router.get('/approval-rules', authenticateBank, async (req, res) => {
  try {
    const rules = await db.all(`
      SELECT rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve, created_at
      FROM approval_rules 
      WHERE bank_id = ? 
      ORDER BY min_amount ASC
    `, [req.bank.id]);

    res.json({
      bank_name: req.bank.bank_name,
      total_rules: rules.length,
      approval_rules: rules
    });
  } catch (error) {
    console.error('Error getting approval rules:', error);
    res.status(500).json({
      error: "Failed to get approval rules"
    });
  }
});

/**
 * @swagger
 * /api/roles/approval-rules/create:
 *   post:
 *     summary: Create approval rule
 *     description: Create a new approval rule for transfers
 *     tags: [Roles]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - rule_name
 *               - min_amount
 *               - required_role_level
 *               - required_approvals
 *             properties:
 *               rule_name:
 *                 type: string
 *                 example: "Executive Approval"
 *               min_amount:
 *                 type: number
 *                 example: 100000
 *               max_amount:
 *                 type: number
 *                 example: 1000000
 *               required_role_level:
 *                 type: integer
 *                 example: 4
 *               required_approvals:
 *                 type: integer
 *                 example: 2
 *               auto_approve:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       201:
 *         description: Approval rule created successfully
 */
router.post('/approval-rules/create', authenticateBank, async (req, res) => {
  const { rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve } = req.body;
  
  if (!rule_name || min_amount === undefined || !required_role_level || required_approvals === undefined) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["rule_name", "min_amount", "required_role_level", "required_approvals"]
    });
  }

  try {
    // Verify the required role level exists
    const roleStmt = db.prepare('SELECT role_name FROM roles WHERE bank_id = ? AND role_level = ?');
    const roleExists = roleStmt.get(req.bank.id, required_role_level);
    
    if (!roleExists) {
      const availableRolesStmt = db.prepare('SELECT role_name, role_level FROM roles WHERE bank_id = ? ORDER BY role_level ASC');
      const availableRoles = availableRolesStmt.all(req.bank.id);
      return res.status(400).json({
        error: "Invalid required_role_level",
        available_roles: availableRoles
      });
    }

    const ruleStmt = db.prepare(`
      INSERT INTO approval_rules (bank_id, rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = ruleStmt.run(req.bank.id, rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve || false, 'api');

    const ruleGetStmt = db.prepare('SELECT * FROM approval_rules WHERE id = ?');
    const rule = ruleGetStmt.get(result.lastInsertRowid);

    res.status(201).json({
      message: "Approval rule created successfully",
      rule: rule
    });

  } catch (error) {
    console.error('Approval rule creation error:', error);
    res.status(500).json({
      error: "Failed to create approval rule"
    });
  }
});

/**
 * @swagger
 * /api/roles/approval-rules/{ruleId}/update:
 *   put:
 *     summary: Update approval rule
 *     description: Update an existing approval rule
 *     tags: [Roles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval rule updated successfully
 */
router.put('/approval-rules/:ruleId/update', authenticateBank, async (req, res) => {
  const { ruleId } = req.params;
  const { rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve } = req.body;

  try {
    // Verify rule belongs to this bank
    const existingRuleStmt = db.prepare('SELECT * FROM approval_rules WHERE id = ? AND bank_id = ?');
    const existingRule = existingRuleStmt.get(ruleId, req.bank.id);
    
    if (!existingRule) {
      return res.status(404).json({ error: "Approval rule not found" });
    }

    // Update rule
    const updateStmt = db.prepare(`
      UPDATE approval_rules 
      SET rule_name = COALESCE(?, rule_name),
          min_amount = COALESCE(?, min_amount),
          max_amount = COALESCE(?, max_amount),
          required_role_level = COALESCE(?, required_role_level),
          required_approvals = COALESCE(?, required_approvals),
          auto_approve = COALESCE(?, auto_approve)
      WHERE id = ? AND bank_id = ?
    `);
    updateStmt.run(rule_name, min_amount, max_amount, required_role_level, required_approvals, auto_approve, ruleId, req.bank.id);

    // Get updated rule
    const updatedRuleStmt = db.prepare('SELECT * FROM approval_rules WHERE id = ?');
    const updatedRule = updatedRuleStmt.get(ruleId);

    res.json({
      message: "Approval rule updated successfully",
      rule: updatedRule
    });

  } catch (error) {
    console.error('Approval rule update error:', error);
    res.status(500).json({
      error: "Failed to update approval rule"
    });
  }
});

/**
 * @swagger
 * /api/roles/approval-rules/{ruleId}/delete:
 *   delete:
 *     summary: Delete approval rule
 *     description: Delete an approval rule
 *     tags: [Roles]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Approval rule deleted successfully
 */
router.delete('/approval-rules/:ruleId/delete', authenticateBank, async (req, res) => {
  const { ruleId } = req.params;

  try {
    const deleteStmt = db.prepare('DELETE FROM approval_rules WHERE id = ? AND bank_id = ?');
    const result = deleteStmt.run(ruleId, req.bank.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Approval rule not found" });
    }

    res.json({
      message: "Approval rule deleted successfully",
      rule_id: ruleId
    });

  } catch (error) {
    console.error('Approval rule deletion error:', error);
    res.status(500).json({
      error: "Failed to delete approval rule"
    });
  }
});

module.exports = router; 