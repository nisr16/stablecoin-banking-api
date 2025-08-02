// Transfer functionality for interbank operations
const express = require('express');
const router = express.Router();
const db = require('./database/connection');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transfer:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique transfer identifier
 *           example: "transfer_1"
 *         fromWalletId:
 *           type: string
 *           description: Source wallet ID
 *           example: "wallet_1000"
 *         toWalletId:
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
 *         reason:
 *           type: string
 *           description: Transfer reason/description
 *           example: "Liquidity rebalancing between subsidiaries"
 *         status:
 *           type: string
 *           enum: [processing, completed, failed]
 *           description: Transfer status
 *           example: "processing"
 *         initiatedAt:
 *           type: string
 *           format: date-time
 *           description: Transfer initiation timestamp
 *         estimatedCompletion:
 *           type: string
 *           format: date-time
 *           description: Estimated completion time
 *         fees:
 *           type: number
 *           description: Transfer fees (0.1% of amount)
 *           example: 50
 *         transactionHash:
 *           type: string
 *           description: Blockchain transaction hash
 *           example: "0xe75225c349546"
 */

/**
 * @swagger
 * /api/transfers/initiate:
 *   post:
 *     summary: Initiate a transfer between wallets
 *     description: Creates a new interbank transfer that completes in approximately 30 seconds
 *     tags: [Transfers]
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
 *             properties:
 *               fromWalletId:
 *                 type: string
 *                 description: Source wallet identifier
 *                 example: "wallet_1000"
 *               toWalletId:
 *                 type: string
 *                 description: Destination wallet identifier
 *                 example: "wallet_1001"
 *               amount:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Transfer amount (must be greater than 0)
 *                 example: 50000
 *               currency:
 *                 type: string
 *                 description: Transfer currency
 *                 example: "USDC"
 *               reason:
 *                 type: string
 *                 description: Optional transfer reason
 *                 example: "Liquidity rebalancing between subsidiaries"
 *     responses:
 *       201:
 *         description: Transfer initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Transfer initiated successfully"
 *                 transfer:
 *                   $ref: '#/components/schemas/Transfer'
 *                 estimatedTime:
 *                   type: string
 *                   example: "30 seconds"
 *       400:
 *         description: Invalid request parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields"
 */
router.post('/initiate', async (req, res) => {
  const { fromWalletId, toWalletId, amount, currency, reason } = req.body;
  
  // Validate required fields
  if (!fromWalletId || !toWalletId || !amount || !currency) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["fromWalletId", "toWalletId", "amount", "currency"]
    });
  }

  // Validate amount
  if (amount <= 0) {
    return res.status(400).json({
      error: "Amount must be greater than 0"
    });
  }

  try {
    // Extract numeric IDs
    const fromNumericId = fromWalletId.replace('wallet_', '');
    const toNumericId = toWalletId.replace('wallet_', '');
    
    // Verify wallets exist
    const fromWallet = await db.get('SELECT wallet_id FROM fbo_wallets WHERE wallet_id = ?', [fromNumericId]);
    const toWallet = await db.get('SELECT wallet_id FROM fbo_wallets WHERE wallet_id = ?', [toNumericId]);
    
    if (!fromWallet || !toWallet) {
      return res.status(404).json({
        error: "One or both wallets not found"
      });
    }

    // Get the logic box ID (using the first one for simplicity)
    const logicBox = await db.get('SELECT logic_id FROM core_stablecoin_logic_box LIMIT 1');
    if (!logicBox) {
      return res.status(500).json({
        error: "Stablecoin logic not configured"
      });
    }

    // Create transfer record
    const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;
    const fees = amount * 0.001; // 0.1% fee
    
    const result = await db.run(
      'INSERT INTO transaction_records (logic_id, transaction_hash, amount, timestamp, status) VALUES (?, ?, ?, ?, ?)',
      [logicBox.logic_id, transactionHash, amount, new Date().toISOString(), 'processing']
    );

    const transfer = {
      id: `transfer_${result.id}`,
      fromWalletId: fromWalletId,
      toWalletId: toWalletId,
      amount: parseFloat(amount),
      currency: currency,
      reason: reason || "Interbank transfer",
      status: "processing",
      initiatedAt: new Date(),
      estimatedCompletion: new Date(Date.now() + 30000), // 30 seconds
      fees: fees,
      transactionHash: transactionHash
    };

    // Simulate instant processing (in real world, this would hit blockchain)
    setTimeout(async () => {
      try {
        await db.run(
          'UPDATE transaction_records SET status = ? WHERE transaction_id = ?',
          ['completed', result.id]
        );
      } catch (error) {
        console.error('Error updating transfer status:', error);
      }
    }, 5000); // Complete after 5 seconds for demo

    res.status(201).json({
      message: "Transfer initiated successfully",
      transfer: transfer,
      estimatedTime: "30 seconds"
    });
  } catch (error) {
    console.error('Error initiating transfer:', error);
    res.status(500).json({
      error: "Failed to initiate transfer"
    });
  }
});

/**
 * @swagger
 * /api/transfers/{transferId}/status:
 *   get:
 *     summary: Get transfer status
 *     description: Retrieves the current status and details of a specific transfer
 *     tags: [Transfers]
 *     parameters:
 *       - in: path
 *         name: transferId
 *         required: true
 *         description: Unique transfer identifier
 *         schema:
 *           type: string
 *           example: "transfer_1"
 *     responses:
 *       200:
 *         description: Transfer status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transferId:
 *                   type: string
 *                   example: "transfer_1"
 *                 status:
 *                   type: string
 *                   example: "completed"
 *                 amount:
 *                   type: number
 *                   example: 50000
 *                 currency:
 *                   type: string
 *                   example: "USDC"
 *                 fromWallet:
 *                   type: string
 *                   example: "wallet_1000"
 *                 toWallet:
 *                   type: string
 *                   example: "wallet_1001"
 *                 transactionHash:
 *                   type: string
 *                   example: "0xe75225c349546"
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 processingTime:
 *                   type: string
 *                   example: "5 seconds"
 *       404:
 *         description: Transfer not found
 */
router.get('/:transferId/status', async (req, res) => {
  const { transferId } = req.params;
  
  try {
    // Extract numeric ID
    const numericId = transferId.replace('transfer_', '');
    
    const transfer = await db.get(
      'SELECT transaction_id, transaction_hash, amount, timestamp, status FROM transaction_records WHERE transaction_id = ?',
      [numericId]
    );
    
    if (!transfer) {
      return res.status(404).json({
        error: "Transfer not found"
      });
    }

    res.json({
      transferId: `transfer_${transfer.transaction_id}`,
      status: transfer.status,
      amount: transfer.amount,
      currency: "USDC", // Default currency
      fromWallet: "wallet_1", // Placeholder - in real implementation you'd store this
      toWallet: "wallet_2", // Placeholder - in real implementation you'd store this
      transactionHash: transfer.transaction_hash,
      completedAt: transfer.status === 'completed' ? transfer.timestamp : null,
      processingTime: transfer.status === 'completed' ? 
        "5 seconds" : "Processing..."
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
 * /api/transfers/history/{walletId}:
 *   get:
 *     summary: Get transfer history for a wallet
 *     description: Retrieves all transfers (incoming and outgoing) for a specific wallet
 *     tags: [Transfers]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         description: Wallet identifier
 *         schema:
 *           type: string
 *           example: "wallet_1000"
 *     responses:
 *       200:
 *         description: Transfer history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletId:
 *                   type: string
 *                   example: "wallet_1000"
 *                 totalTransfers:
 *                   type: number
 *                   example: 1
 *                 transfers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "transfer_1"
 *                       type:
 *                         type: string
 *                         enum: [incoming, outgoing]
 *                         example: "outgoing"
 *                       amount:
 *                         type: number
 *                         example: 50000
 *                       currency:
 *                         type: string
 *                         example: "USDC"
 *                       otherWallet:
 *                         type: string
 *                         example: "wallet_1001"
 *                       status:
 *                         type: string
 *                         example: "completed"
 *                       date:
 *                         type: string
 *                         format: date-time
 *                       reason:
 *                         type: string
 *                         example: "Liquidity rebalancing between subsidiaries"
 */
router.get('/history/:walletId', async (req, res) => {
  const { walletId } = req.params;
  
  try {
    // For now, return all transfers since we don't store wallet relationships in transaction_records
    // In a real implementation, you'd have a separate table for transfer details
    const transfers = await db.all(
      'SELECT transaction_id, transaction_hash, amount, timestamp, status FROM transaction_records ORDER BY timestamp DESC'
    );
    
    const formattedTransfers = transfers.map(t => ({
      id: `transfer_${t.transaction_id}`,
      type: "outgoing", // Placeholder - in real implementation you'd determine this
      amount: t.amount,
      currency: "USDC",
      otherWallet: "wallet_2", // Placeholder
      status: t.status,
      date: t.timestamp,
      reason: "Interbank transfer"
    }));
    
    res.json({
      walletId: walletId,
      totalTransfers: transfers.length,
      transfers: formattedTransfers
    });
  } catch (error) {
    console.error('Error getting transfer history:', error);
    res.status(500).json({
      error: "Failed to get transfer history"
    });
  }
});

module.exports = router;