// Wallet management for banks
const express = require('express');
const router = express.Router();

// Simple in-memory storage (we'll upgrade this later)
let wallets = [];
let walletCounter = 1000;

// Create a new wallet for a bank
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

// Get wallet balance
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

// List all wallets for a bank
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