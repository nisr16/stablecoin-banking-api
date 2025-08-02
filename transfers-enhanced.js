const express = require('express');
const db = require('./database/connection');
const { authenticateBank } = require('./banks');
const router = express.Router();

let transferCounter = 1;

// Get approval requirements for a transfer amount
async function getApprovalRequirements(bankId, amount) {
  const rule = await db.get(`
    SELECT * FROM approval_rules 
    WHERE bank_id = ? AND min_amount <= ? AND (max_amount IS NULL OR max_amount >= ?)
    ORDER BY min_amount DESC 
    LIMIT 1
  `, [bankId, amount, amount]);

  return rule || { auto_approve: true, required_approvals: 0, required_role_level: 1 };
}

/**
 * @swagger
 * /api/transfers/initiate:
 *   post:
 *     summary: Initiate a transfer (with approval workflow)
 *     description: Creates a new interbank transfer that may require approvals based on bank rules
 *     tags: [Transfers]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fromWalletId
 *               - toWalletId
 *               - amount
 *               - currency
 *               - initiated_by
 *             properties:
 *               fromWalletId:
 *                 type: string
 *                 example: "wallet_1000"
 *               toWalletId:
 *                 type: string
 *                 example: "wallet_1001"
 *               amount:
 *                 type: number
 *                 example: 75000
 *               currency:
 *                 type: string
 *                 example: "USDC"
 *               initiated_by:
 *                 type: string
 *                 example: "user_abc123"
 *               reason:
 *                 type: string
 *                 example: "Quarterly liquidity rebalancing"
 *     responses:
 *       201:
 *         description: Transfer initiated successfully
 */
router.post('/initiate', authenticateBank, async (req, res) => {
  const { fromWalletId, toWalletId, amount, currency, initiated_by, reason } = req.body;
  
  if (!fromWalletId || !toWalletId || !amount || !currency || !initiated_by) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["fromWalletId", "toWalletId", "amount", "currency", "initiated_by"]
    });
  }

  if (amount <= 0) {
    return res.status(400).json({
      error: "Amount must be greater than 0"
    });
  }

  try {
    // Verify user belongs to this bank
    const user = await db.get('SELECT * FROM bank_users WHERE user_id = ? AND bank_id = ?', [initiated_by, req.bank.id]);
    
    if (!user || user.status !== 'active') {
      return res.status(403).json({
        error: "Invalid or inactive user"
      });
    }

    // Get approval requirements
    const approvalRule = await getApprovalRequirements(req.bank.id, amount);
    
    // Create transfer
    const transfer_id = `transfer_${transferCounter++}`;
    const fees = amount * 0.001; // 0.1% fee
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    
    let approval_status = 'pending_approval';
    let estimatedCompletion = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours for approval
    
    if (approvalRule.auto_approve) {
      approval_status = 'auto_approved';
      estimatedCompletion = new Date(Date.now() + 30000); // 30 seconds
    }

    // Get the logic box ID (using the first one for simplicity)
    const logicBox = await db.get('SELECT logic_id FROM core_stablecoin_logic_box LIMIT 1');
    if (!logicBox) {
      return res.status(500).json({
        error: "Stablecoin logic not configured"
      });
    }

    // Insert into transaction_records table
    const result = await db.run(`
      INSERT INTO transaction_records (
        logic_id, transaction_hash, amount, timestamp, status, initiated_by,
        approval_status, required_approvals, current_approvals, approval_deadline
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      logicBox.logic_id, transactionHash, amount, new Date().toISOString(), 
      approval_status === 'auto_approved' ? 'processing' : 'pending_approval',
      initiated_by, approval_status, approvalRule.required_approvals || 0, 0, estimatedCompletion.toISOString()
    ]);

    // If auto-approved, simulate processing
    if (approval_status === 'auto_approved') {
      setTimeout(async () => {
        try {
          await db.run('UPDATE transaction_records SET status = ? WHERE transaction_id = ?', ['completed', result.id]);
        } catch (error) {
          console.error('Error updating transfer status:', error);
        }
      }, 5000);
    }

    const transfer = await db.get('SELECT * FROM transaction_records WHERE transaction_id = ?', [result.id]);

    let response = {
      message: approval_status === 'auto_approved' ? "Transfer initiated and auto-approved" : "Transfer initiated - pending approval",
      transfer: {
        id: `transfer_${transfer.transaction_id}`,
        fromWalletId: fromWalletId,
        toWalletId: toWalletId,
        amount: transfer.amount,
        currency: currency,
        reason: reason || "Interbank transfer",
        status: transfer.status,
        initiatedAt: transfer.timestamp,
        estimatedCompletion: estimatedCompletion,
        fees: fees,
        transactionHash: transfer.transaction_hash,
        initiated_by: transfer.initiated_by,
        approval_status: transfer.approval_status,
        required_approvals: transfer.required_approvals,
        current_approvals: transfer.current_approvals
      }
    };

    if (approval_status !== 'auto_approved') {
      response.next_steps = [
        "Transfer requires approval",
        `Required approvals: ${approvalRule.required_approvals}`,
        `Required role level: ${approvalRule.required_role_level}`,
        "Use the approval endpoint to approve this transfer"
      ];
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Transfer initiation error:', error);
    res.status(500).json({
      error: "Failed to initiate transfer"
    });
  }
});

/**
 * @swagger
 * /api/transfers/{transferId}/approve:
 *   post:
 *     summary: Approve a transfer
 *     description: Approve a pending transfer (requires appropriate role level)
 *     tags: [Transfers]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - approver_user_id
 *             properties:
 *               approver_user_id:
 *                 type: string
 *                 example: "user_abc123"
 *               comments:
 *                 type: string
 *                 example: "Approved after review"
 *     responses:
 *       200:
 *         description: Transfer approved successfully
 */
router.post('/:transferId/approve', authenticateBank, async (req, res) => {
  const { transferId } = req.params;
  const { approver_user_id, comments } = req.body;

  if (!approver_user_id) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["approver_user_id"]
    });
  }

  try {
    // Verify approver belongs to this bank
    const approver = await db.get('SELECT * FROM bank_users WHERE user_id = ? AND bank_id = ?', [approver_user_id, req.bank.id]);
    
    if (!approver || approver.status !== 'active') {
      return res.status(403).json({
        error: "Invalid or inactive approver"
      });
    }

    // Get transfer details
    const numericId = transferId.replace('transfer_', '');
    const transfer = await db.get('SELECT * FROM transaction_records WHERE transaction_id = ?', [numericId]);
    
    if (!transfer) {
      return res.status(404).json({
        error: "Transfer not found"
      });
    }

    if (transfer.status === 'completed') {
      return res.status(400).json({
        error: "Transfer already completed"
      });
    }

    if (transfer.approval_status === 'auto_approved') {
      return res.status(400).json({
        error: "Transfer was auto-approved, no manual approval needed"
      });
    }

    // Check if user has already approved this transfer
    const existingApproval = await db.get('SELECT * FROM transfer_approvals WHERE transfer_id = ? AND approver_user_id = ?', [transferId, approver_user_id]);
    
    if (existingApproval) {
      return res.status(400).json({
        error: "User has already approved this transfer"
      });
    }

    // Get approval requirements
    const approvalRule = await getApprovalRequirements(req.bank.id, transfer.amount);
    
    // Check if approver has sufficient role level
    const approverRole = await db.get('SELECT role_level FROM roles WHERE bank_id = ? AND role_name = ?', [req.bank.id, approver.role]);
    
    if (!approverRole || approverRole.role_level < approvalRule.required_role_level) {
      return res.status(403).json({
        error: "Insufficient role level to approve this transfer",
        required_level: approvalRule.required_role_level,
        approver_level: approverRole?.role_level
      });
    }

    // Record approval
    await db.run(`
      INSERT INTO transfer_approvals (transfer_id, approver_user_id, approved_at, comments, approval_method, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [transferId, approver_user_id, new Date().toISOString(), comments || "Approved", "api", req.ip]);

    // Update transfer approval count
    const newApprovalCount = transfer.current_approvals + 1;
    await db.run('UPDATE transaction_records SET current_approvals = ? WHERE transaction_id = ?', [newApprovalCount, numericId]);

    // Check if enough approvals received
    if (newApprovalCount >= transfer.required_approvals) {
      await db.run('UPDATE transaction_records SET status = ?, approval_status = ? WHERE transaction_id = ?', 
        ['processing', 'approved'], numericId);
      
      // Simulate processing
      setTimeout(async () => {
        try {
          await db.run('UPDATE transaction_records SET status = ? WHERE transaction_id = ?', ['completed', numericId]);
        } catch (error) {
          console.error('Error updating transfer status:', error);
        }
      }, 5000);
    }

    res.json({
      message: "Transfer approved successfully",
      transfer_id: transferId,
      current_approvals: newApprovalCount,
      required_approvals: transfer.required_approvals,
      status: newApprovalCount >= transfer.required_approvals ? "approved" : "pending_approval"
    });

  } catch (error) {
    console.error('Transfer approval error:', error);
    res.status(500).json({
      error: "Failed to approve transfer"
    });
  }
});

/**
 * @swagger
 * /api/transfers/{transferId}/status:
 *   get:
 *     summary: Get transfer status
 *     description: Get detailed status of a transfer including approval progress
 *     tags: [Transfers]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Transfer status retrieved successfully
 */
router.get('/:transferId/status', authenticateBank, async (req, res) => {
  const { transferId } = req.params;

  try {
    const numericId = transferId.replace('transfer_', '');
    const transfer = await db.get('SELECT * FROM transaction_records WHERE transaction_id = ?', [numericId]);
    
    if (!transfer) {
      return res.status(404).json({
        error: "Transfer not found"
      });
    }

    // Get approval details
    const approvals = await db.all(`
      SELECT ta.approver_user_id, ta.approved_at, ta.comments, bu.full_name, bu.role
      FROM transfer_approvals ta
      JOIN bank_users bu ON ta.approver_user_id = bu.user_id
      WHERE ta.transfer_id = ?
      ORDER BY ta.approved_at ASC
    `, [transferId]);

    res.json({
      transfer_id: `transfer_${transfer.transaction_id}`,
      status: transfer.status,
      amount: transfer.amount,
      currency: "USDC",
      transaction_hash: transfer.transaction_hash,
      initiated_by: transfer.initiated_by,
      approval_status: transfer.approval_status,
      current_approvals: transfer.current_approvals,
      required_approvals: transfer.required_approvals,
      timestamp: transfer.timestamp,
      approvals: approvals,
      progress: {
        approved: transfer.current_approvals,
        required: transfer.required_approvals,
        percentage: Math.round((transfer.current_approvals / transfer.required_approvals) * 100) || 0
      }
    });
  } catch (error) {
    console.error('Error getting transfer status:', error);
    res.status(500).json({
      error: "Failed to get transfer status"
    });
  }
});

/**
 * @swagger
 * /api/transfers/pending:
 *   get:
 *     summary: Get pending transfers
 *     description: Get all pending transfers for the authenticated bank
 *     tags: [Transfers]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Pending transfers retrieved successfully
 */
router.get('/pending', authenticateBank, async (req, res) => {
  try {
    const pendingTransfers = await db.all(`
      SELECT transaction_id, transaction_hash, amount, timestamp, status, initiated_by,
             approval_status, current_approvals, required_approvals, approval_deadline
      FROM transaction_records 
      WHERE status IN ('pending_approval', 'processing') AND initiated_by IN (
        SELECT user_id FROM bank_users WHERE bank_id = ?
      )
      ORDER BY timestamp DESC
    `, [req.bank.id]);

    res.json({
      bank_name: req.bank.bank_name,
      total_pending: pendingTransfers.length,
      transfers: pendingTransfers.map(t => ({
        id: `transfer_${t.transaction_id}`,
        amount: t.amount,
        status: t.status,
        approval_status: t.approval_status,
        current_approvals: t.current_approvals,
        required_approvals: t.required_approvals,
        initiated_at: t.timestamp,
        deadline: t.approval_deadline
      }))
    });
  } catch (error) {
    console.error('Error getting pending transfers:', error);
    res.status(500).json({
      error: "Failed to get pending transfers"
    });
  }
});

module.exports = router; 