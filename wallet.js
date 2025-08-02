// Wallet management for banks
const express = require('express');
const router = express.Router();
const db = require('./database/connection');

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
 *           example: "Nexora Bank"
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
 *                 example: "Nexora Bank"
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
router.post('/create', async (req, res) => {
  const { bankName, subsidiaryName, currency } = req.body;
  
  // Validate required fields
  if (!bankName || !subsidiaryName || !currency) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["bankName", "subsidiaryName", "currency"]
    });
  }

  try {
    // Get the first vault (for simplicity, in production you'd select based on criteria)
    const vaultStmt = db.prepare('SELECT vault_id FROM custody_vault LIMIT 1');
    const vault = vaultStmt.get();
    if (!vault) {
      return res.status(500).json({
        error: "No custody vault available"
      });
    }

    // Create new FBO wallet
    const walletAddress = `0x${Math.random().toString(16).substr(2, 40)}`;
    const walletStmt = db.prepare(
      'INSERT INTO fbo_wallets (vault_id, wallet_address, balance, creation_date) VALUES (?, ?, ?, ?)'
    );
    const result = walletStmt.run(vault.vault_id, walletAddress, 0, new Date().toISOString());

    const wallet = {
      id: `wallet_${result.lastInsertRowid}`,
      bankName: bankName,
      subsidiaryName: subsidiaryName,
      currency: currency,
      balance: 0,
      status: "active",
      createdAt: new Date(),
      publicAddress: walletAddress
    };

    res.status(201).json({
      message: "Wallet created successfully",
      wallet: wallet
    });
  } catch (error) {
    console.error('Error creating wallet:', error);
    res.status(500).json({
      error: "Failed to create wallet"
    });
  }
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
router.get('/:walletId/balance', async (req, res) => {
  const { walletId } = req.params;
  
  try {
    // Extract numeric ID from wallet_123 format
    const numericId = walletId.replace('wallet_', '');
    
    const walletStmt = db.prepare(
      'SELECT wallet_id, wallet_address, balance, creation_date FROM fbo_wallets WHERE wallet_id = ?'
    );
    const wallet = walletStmt.get(numericId);
    
    if (!wallet) {
      return res.status(404).json({
        error: "Wallet not found"
      });
    }

    res.json({
      walletId: `wallet_${wallet.wallet_id}`,
      balance: wallet.balance,
      currency: "USDC", // Default currency
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    res.status(500).json({
      error: "Failed to get wallet balance"
    });
  }
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
 *           example: "Nexora Bank"
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
 *                   example: "Nexora Bank"
 *                 totalWallets:
 *                   type: number
 *                   example: 2
 *                 wallets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Wallet'
 */
router.get('/list/:bankName', async (req, res) => {
  const { bankName } = req.params;
  
  try {
    // For now, return all wallets since we don't store bank name in the database
    // In a real implementation, you'd have a separate table for bank information
    const walletsStmt = db.prepare(
      'SELECT wallet_id, wallet_address, balance, creation_date FROM fbo_wallets'
    );
    const wallets = walletsStmt.all();
    
    const formattedWallets = wallets.map(w => ({
      id: `wallet_${w.wallet_id}`,
      bankName: bankName, // Use the requested bank name
      subsidiaryName: "Main Branch", // Default value
      currency: "USDC",
      balance: w.balance,
      status: "active",
      createdAt: w.creation_date,
      publicAddress: w.wallet_address
    }));
    
    res.json({
      bankName: bankName,
      totalWallets: wallets.length,
      wallets: formattedWallets
    });
  } catch (error) {
    console.error('Error listing wallets:', error);
    res.status(500).json({
      error: "Failed to list wallets"
    });
  }
});

module.exports = router;