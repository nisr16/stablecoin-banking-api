# Enterprise Stablecoin Banking API

Goal: Complete banking infrastructure with user management and approval workflows for enterprise-grade stablecoin operations.

Started: July 31, 2025

## What this will do:
- Replace 48-hour SWIFT transfers with 30-second stablecoin transfers
- Enable 24/7 liquidity management for banks
- Reduce cross-border transfer costs by 80%
- Provide enterprise-grade user management and security
- Implement custom approval workflows for compliance

## Database Setup

This project uses SQLite for local development. The database schema is based on a comprehensive ERD with 10 interconnected tables:

### Database Structure
- **NEXORA_CORE_SYSTEM** - Core banking system configuration
- **NEXORA_API_LAYER** - API layer management
- **USER_ACCOUNTS** - User account management
- **CORE_STABLECOIN_LOGIC_BOX** - Stablecoin logic and configuration
- **CIRCLE_MINT** - Minting operations
- **COMPLIANCE_API** - Compliance and regulatory management
- **TRANSACTION_RECORDS** - All transaction history with approval workflow
- **CUSTODY_VAULT** - Secure custody vaults
- **FBO_WALLETS** - "For Benefit Of" wallets
- **SUBWALLETS** - Sub-wallets within FBO wallets
- **BANKS** - Bank management and configuration
- **BANK_USERS** - User management with roles and permissions
- **ROLES** - Role-based access control definitions
- **APPROVAL_RULES** - Transfer approval rules and thresholds
- **TRANSFER_APPROVALS** - Approval workflow tracking

### Database Management

```bash
# Show database statistics
node database/utils.js stats

# Reset database (delete all data)
node database/utils.js reset

# Show table structure
node database/utils.js schema
```

### API Endpoints

#### Bank Management
- `POST /api/banks/register` - Register a new bank
- `GET /api/banks/profile` - Get bank profile (requires API key)

#### User Management
- `POST /api/users/create` - Create a new bank user (requires API key)
- `GET /api/users/list` - List all bank users (requires API key)
- `PUT /api/users/:userId/update` - Update a bank user (requires API key)
- `POST /api/users/:userId/deactivate` - Deactivate a user (requires API key)
- `GET /api/users/roles` - Get available roles for the bank (requires API key)

#### Role Management
- `GET /api/roles/list` - List all roles for the bank (requires API key)
- `GET /api/roles/approval-rules` - Get approval rules (requires API key)
- `POST /api/roles/approval-rules/create` - Create approval rule (requires API key)
- `PUT /api/roles/approval-rules/:ruleId/update` - Update approval rule (requires API key)
- `DELETE /api/roles/approval-rules/:ruleId/delete` - Delete approval rule (requires API key)

#### Wallets
- `POST /api/wallets/create` - Create new wallet
- `GET /api/wallets/:walletId/balance` - Get wallet balance
- `GET /api/wallets/list/:bankName` - List bank wallets

#### Transfers
- `POST /api/transfers/initiate` - Initiate transfer (with approval workflow)
- `POST /api/transfers/:transferId/approve` - Approve a pending transfer
- `GET /api/transfers/:transferId/status` - Get transfer status with approval progress
- `GET /api/transfers/pending` - Get pending transfers for the bank
- `GET /api/transfers/history/:walletId` - Get transfer history

#### System
- `GET /api/health` - Health check
- `GET /api/info` - API information

## Next steps:
- [x] Set up basic API structure
- [x] Create database schema
- [x] Implement multi-bank user management
- [x] Add role-based access control
- [x] Create approval workflows
- [ ] Integrate with Fireblocks for custody
- [ ] Connect to Circle for USDC
- [ ] Add compliance screening# Updated Fri Aug  1 18:36:03 -03 2025
