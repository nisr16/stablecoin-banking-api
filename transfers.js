// Transfer functionality for interbank operations
const express = require('express');
const router = express.Router();

// Import wallets from wallet module (we'll connect this)
let transfers = [];
let transferCounter = 1;

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
router.post('/initiate', (req, res) => {
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

  // Create transfer record
  const transfer = {
    id: `transfer_${transferCounter++}`,
    fromWalletId: fromWalletId,
    toWalletId: toWalletId,
    amount: parseFloat(amount),
    currency: currency,
    reason: reason || "Interbank transfer",
    status: "processing",
    initiatedAt: new Date(),
    estimatedCompletion: new Date(Date.now() + 30000), // 30 seconds
    fees: amount * 0.001, // 0.1% fee
    transactionHash: `0x${Math.random().toString(16).substr(2, 64)}`
  };

  transfers.push(transfer);

  // Simulate instant processing (in real world, this would hit blockchain)
  setTimeout(() => {
    const transferIndex = transfers.findIndex(t => t.id === transfer.id);
    if (transferIndex !== -1) {
      transfers[transferIndex].status = "completed";
      transfers[transferIndex].completedAt = new Date();
    }
  }, 5000); // Complete after 5 seconds for demo

  res.status(201).json({
    message: "Transfer initiated successfully",
    transfer: transfer,
    estimatedTime: "30 seconds"
  });
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
router.get('/:transferId/status', (req, res) => {
  const { transferId } = req.params;
  
  const transfer = transfers.find(t => t.id === transferId);
  
  if (!transfer) {
    return res.status(404).json({
      error: "Transfer not found"
    });
  }

  res.json({
    transferId: transfer.id,
    status: transfer.status,
    amount: transfer.amount,
    currency: transfer.currency,
    fromWallet: transfer.fromWalletId,
    toWallet: transfer.toWalletId,
    transactionHash: transfer.transactionHash,
    completedAt: transfer.completedAt,
    processingTime: transfer.completedAt ? 
      `${Math.round((transfer.completedAt - transfer.initiatedAt) / 1000)} seconds` : 
      "Processing..."
  });
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
router.get('/history/:walletId', (req, res) => {
  const { walletId } = req.params;
  
  const walletTransfers = transfers.filter(t => 
    t.fromWalletId === walletId || t.toWalletId === walletId
  );
  
  res.json({
    walletId: walletId,
    totalTransfers: walletTransfers.length,
    transfers: walletTransfers.map(t => ({
      id: t.id,
      type: t.fromWalletId === walletId ? "outgoing" : "incoming",
      amount: t.amount,
      currency: t.currency,
      otherWallet: t.fromWalletId === walletId ? t.toWalletId : t.fromWalletId,
      status: t.status,
      date: t.initiatedAt,
      reason: t.reason
    }))
  });
});

module.exports = router;