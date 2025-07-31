// Wallet management for banks
const express = require('express');
const router = express.Router();

// Simple in-memory storage (we'll upgrade this later)
let wallets = [];
let walletCounter = 1000;

/**
 * @swagger
 * components:
 *   schemas:
 *     Wallet:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique wallet identifier
 *           example: "wallet_1000"
 *         bankName:
 *           type: string
 *           description: Name of the bank
 *           example: "Banco Nacional"
 *         subsidiaryName:
 *           type: string
 *           description: Name of the bank subsidiary
 *           example: "Guatemala Branch"
 *         currency:
 *           type: string
 *           description: Wallet currency
 *           example: "USDC"
 *         balance:
 *           type: number
 *           description: Current wallet balance
 *           example: 0
 *         status:
 *           type: string
 *           description: Wallet status
 *           example: "active"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Wallet creation timestamp
 *         publicAddress:
 *           type: string
 *           description: Blockchain public address
 *           example: "0x2ead08772db3c"
 */

/**
 * @swagger
 * /api/wallets/create:
 *   post:
 *     summary: Create a new wallet for a bank subsidiary
 *     description: Creates a new treasury wallet for a bank subsidiary with blockchain address generation
 *     tags: [Wallets]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bankName
 *               - subsidiaryName
 *               - currency
 *             properties:
 *               bankName:
 *                 type: string
 *                 description: Name of the bank
 *                 example: "Banco Nacional"
 *               subsidiaryName:
 *                 type: string
 *                 description: Name of the bank subsidiary
 *                 example: "Guatemala Branch"
 *               currency:
 *                 type: string
 *                 description: Wallet currency (USDC recommended)
 *                 example: "USDC"
 *     responses:
 *       201:
 *         description: Wallet created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Wallet created successfully"
 *                 wallet:
 *                   $ref: '#/components/schemas/Wallet'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Missing required fields"
 *                 required:
 *                   type: array
 *                   items:
 *                     type: string
 */
router.post('/create', (req, res) => {
  const { bankName, subsidiaryName, currency } = req.body;
  
  // Validate required fields
  if (!bankName || !subsidiaryName || !currency) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["bankName", "subsidiaryName", "currency"]
    });
  }

  // Create new wallet
  const wallet = {
    id: `wallet_${walletCounter++}`,
    bankName: bankName,
    subsidiaryName: subsidiaryName,
    currency: currency,
    balance: 0,
    status: "active",
    createdAt: new Date(),
    publicAddress: `0x${Math.random().toString(16).substr(2, 40)}`
  };

  wallets.push(wallet);

  res.status(201).json({
    message: "Wallet created successfully",
    wallet: wallet
  });
});

/**
 * @swagger
 * /api/wallets/{walletId}/balance:
 *   get:
 *     summary: Get wallet balance
 *     description: Retrieves the current balance for a specific wallet
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: walletId
 *         required: true
 *         description: Unique wallet identifier
 *         schema:
 *           type: string
 *           example: "wallet_1000"
 *     responses:
 *       200:
 *         description: Wallet balance retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 walletId:
 *                   type: string
 *                   example: "wallet_1000"
 *                 balance:
 *                   type: number
 *                   example: 0
 *                 currency:
 *                   type: string
 *                   example: "USDC"
 *                 lastUpdated:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Wallet not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Wallet not found"
 */
router.get('/:walletId/balance', (req, res) => {
  const { walletId } = req.params;
  
  const wallet = wallets.find(w => w.id === walletId);
  
  if (!wallet) {
    return res.status(404).json({
      error: "Wallet not found"
    });
  }

  res.json({
    walletId: wallet.id,
    balance: wallet.balance,
    currency: wallet.currency,
    lastUpdated: new Date()
  });
});

/**
 * @swagger
 * /api/wallets/list/{bankName}:
 *   get:
 *     summary: List all wallets for a bank
 *     description: Retrieves all wallets associated with a specific bank
 *     tags: [Wallets]
 *     parameters:
 *       - in: path
 *         name: bankName
 *         required: true
 *         description: Name of the bank
 *         schema:
 *           type: string
 *           example: "Banco Nacional"
 *     responses:
 *       200:
 *         description: Bank wallets retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bankName:
 *                   type: string
 *                   example: "Banco Nacional"
 *                 totalWallets:
 *                   type: number
 *                   example: 2
 *                 wallets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Wallet'
 */
router.get('/list/:bankName', (req, res) => {
  const { bankName } = req.params;
  
  const bankWallets = wallets.filter(w => w.bankName === bankName);
  
  res.json({
    bankName: bankName,
    totalWallets: bankWallets.length,
    wallets: bankWallets
  });
});

module.exports = router;