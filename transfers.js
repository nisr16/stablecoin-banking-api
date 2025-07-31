// Transfer functionality for interbank operations
const express = require('express');
const router = express.Router();

// Import wallets from wallet module (we'll connect this)
let transfers = [];
let transferCounter = 1;

// Initiate a transfer between wallets
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

// Get transfer status
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

// Get transfer history for a wallet
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