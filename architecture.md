# Enterprise Stablecoin Banking API - Architecture Documentation

## 🏗️ System Overview

The Enterprise Stablecoin Banking API is a comprehensive banking infrastructure that enables 30-second cross-border transfers using stablecoin technology, replacing traditional 48-hour SWIFT transfers. The system supports multi-bank operations with role-based access control, approval workflows, and enterprise-grade security.

## 🎯 Core Objectives

- **Replace SWIFT transfers** with 30-second stablecoin transfers
- **Reduce costs** by 80% compared to traditional cross-border transfers
- **Enable 24/7 liquidity management** for banks
- **Provide enterprise-grade security** with role-based access control
- **Support multi-bank operations** with isolated data and workflows
- **Implement compliance workflows** for regulatory requirements

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Enterprise Stablecoin API                    │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Server (Node.js)                                  │
│  ├── REST API Endpoints                                       │
│  ├── WebSocket Real-time Updates                              │
│  ├── Swagger/OpenAPI Documentation                           │
│  └── Middleware (Auth, Validation, Logging)                  │
├─────────────────────────────────────────────────────────────────┤
│  SQLite Database (better-sqlite3)                            │
│  ├── Core Banking Tables (15+ tables)                        │
│  ├── Multi-bank Data Isolation                               │
│  ├── Foreign Key Constraints                                  │
│  └── Transaction Integrity                                    │
├─────────────────────────────────────────────────────────────────┤
│  External Integrations (Future)                               │
│  ├── Circle API (USDC)                                       │
│  ├── Fireblocks (Custody)                                    │
│  ├── Compliance APIs                                          │
│  └── Banking Networks                                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Database Architecture

### Core Tables (15+ interconnected tables)

#### **System Configuration Tables**
- `nexora_core_system` - Core banking system configuration
- `nexora_api_layer` - API layer management and settings
- `user_accounts` - System-wide user account management
- `core_stablecoin_logic_box` - Stablecoin logic and configuration
- `circle_mint` - Minting operations and USDC integration
- `compliance_api` - Regulatory compliance and screening

#### **Transaction & Wallet Tables**
- `transaction_records` - All transfer history with approval workflow
- `custody_vault` - Secure custody vaults for asset storage
- `fbo_wallets` - "For Benefit Of" wallets for client funds
- `subwallets` - Sub-wallets within FBO wallets

#### **Banking Management Tables**
- `banks` - Bank registration and configuration
- `bank_users` - User management with roles and permissions
- `roles` - Role-based access control definitions
- `approval_rules` - Transfer approval rules and thresholds
- `transfer_approvals` - Approval workflow tracking

### Key Architectural Decisions

#### **1. Multi-Bank Data Isolation**
- Each bank has isolated data through `bank_id` foreign keys
- Users, roles, and approval rules are bank-specific
- API key authentication ensures bank data isolation
- No cross-bank data access possible

#### **2. Role-Based Access Control (RBAC)**
```
Role Hierarchy:
├── Viewer (Level 1) - Reports only
├── Operator (Level 5) - Transfers + Reports
├── Manager (Level 7) - Transfers + Approvals + Reports
└── Admin (Level 10) - All permissions
```

#### **3. Approval Workflow System**
```
Transfer Amount → Approval Rules → Required Approvals
├── $0-$9,999: Auto-approve
├── $10,000-$49,999: 1 approval (Manager+)
├── $50,000-$249,999: 1 approval (VP+)
└── $250,000+: 2 approvals (CEO+)
```

## 🔄 Data Flows

### **1. Bank Registration Flow**
```
1. Bank submits registration data
2. System generates unique API credentials
3. Creates bank record in `banks` table
4. Creates default roles (Viewer, Operator, Manager, Admin)
5. Creates default approval rules (4 tiers)
6. Returns API credentials to bank
```

### **2. User Management Flow**
```
1. Bank creates user with role assignment
2. System validates role exists for that bank
3. Creates user record in `bank_users` table
4. Inherits permissions from assigned role
5. User can now access bank-specific features
```

### **3. Transfer Initiation Flow**
```
1. User initiates transfer with amount
2. System checks user permissions and role level
3. Determines approval requirements based on amount
4. Creates transfer record in `transaction_records`
5. If auto-approve: processes immediately
6. If requires approval: creates approval requests
7. Sends notifications to approvers
8. Updates transfer status based on approvals
```

### **4. Approval Workflow Flow**
```
1. System identifies pending transfers requiring approval
2. Notifies approvers based on role levels
3. Approvers review and approve/reject
4. System tracks approvals in `transfer_approvals`
5. When required approvals met: processes transfer
6. Updates transfer status and notifies parties
```

### **5. Wallet Management Flow**
```
1. Bank creates treasury wallet
2. System creates wallet in `custody_vault`
3. Links wallet to bank for isolation
4. Tracks balance and transaction history
5. Enables transfers from/to wallet
```

## 🔐 Security Architecture

### **Authentication & Authorization**
- **API Key Authentication**: Each bank has unique API key
- **Role-Based Access**: Users inherit permissions from roles
- **Bank Isolation**: No cross-bank data access
- **Audit Trails**: All actions logged with timestamps

### **Data Protection**
- **Foreign Key Constraints**: Ensures data integrity
- **Input Validation**: All inputs validated and sanitized
- **Error Handling**: Secure error messages without data exposure
- **Transaction Integrity**: Database transactions for critical operations

### **Compliance Features**
- **Approval Workflows**: Multi-level approval for large transfers
- **Audit Logging**: Complete transaction history
- **User Activity Tracking**: Login times and actions logged
- **Regulatory Reporting**: Structured data for compliance

## 🚀 API Architecture

### **RESTful Design**
- **Resource-based URLs**: `/api/banks`, `/api/users`, `/api/transfers`
- **HTTP Methods**: GET, POST, PUT, DELETE for CRUD operations
- **Status Codes**: Proper HTTP status codes for responses
- **JSON Responses**: Consistent JSON response format

### **Real-time Features**
- **WebSocket Support**: Real-time transfer status updates
- **Email Notifications**: Transfer status and approval notifications
- **SMS Notifications**: Critical alerts via Twilio
- **Push Notifications**: WebSocket-based real-time updates

### **Documentation**
- **Swagger/OpenAPI**: Interactive API documentation
- **Comprehensive Examples**: Request/response examples
- **Error Documentation**: Detailed error codes and messages
- **Integration Guides**: Step-by-step integration instructions

## 🔧 Technical Constraints

### **Database Constraints**
- **SQLite**: Lightweight, file-based database for development
- **better-sqlite3**: Synchronous operations, strict type checking
- **Foreign Keys**: Enforced referential integrity
- **Unique Constraints**: Prevents duplicate data

### **Performance Constraints**
- **Single-threaded**: Node.js event loop limitations
- **Synchronous DB**: better-sqlite3 synchronous operations
- **Memory Usage**: In-memory data structures for caching
- **Connection Limits**: Single database connection per process

### **Scalability Considerations**
- **Horizontal Scaling**: Multiple server instances possible
- **Database Scaling**: Migration to PostgreSQL/MySQL for production
- **Load Balancing**: API gateway for request distribution
- **Caching Strategy**: Redis for session and data caching

## 🔄 Integration Points

### **Current Integrations**
- **Nodemailer**: Email notifications
- **Twilio**: SMS notifications
- **WebSocket**: Real-time updates
- **Swagger**: API documentation

### **Future Integrations**
- **Circle API**: USDC minting and transfers
- **Fireblocks**: Secure custody and key management
- **Compliance APIs**: Regulatory screening and reporting
- **Banking Networks**: SWIFT, SEPA, ACH integration

## 📈 Monitoring & Observability

### **Health Checks**
- **API Health**: `/api/health` endpoint
- **Database Status**: Connection and query monitoring
- **Service Dependencies**: External service availability
- **Performance Metrics**: Response times and throughput

### **Logging Strategy**
- **Request Logging**: All API requests logged
- **Error Logging**: Detailed error information
- **Audit Logging**: Security and compliance events
- **Performance Logging**: Slow query and operation tracking

## 🛡️ Error Handling Strategy

### **Error Categories**
- **Validation Errors**: Invalid input data (400)
- **Authentication Errors**: Invalid API keys (401)
- **Authorization Errors**: Insufficient permissions (403)
- **Not Found Errors**: Resources don't exist (404)
- **Conflict Errors**: Duplicate data (409)
- **Server Errors**: Internal system errors (500)

### **Error Response Format**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional information",
  "timestamp": "2025-08-02T03:55:31Z"
}
```

## 🔄 Deployment Architecture

### **Development Environment**
- **Local SQLite**: File-based database
- **Node.js Server**: Single instance
- **Hot Reloading**: Development server with auto-restart
- **Debug Logging**: Verbose logging for development

### **Production Considerations**
- **Database Migration**: SQLite to PostgreSQL/MySQL
- **Load Balancing**: Multiple server instances
- **SSL/TLS**: HTTPS encryption
- **Rate Limiting**: API request throttling
- **Backup Strategy**: Database and file backups
- **Monitoring**: Application performance monitoring

## 📋 Architecture Decisions Log

### **Decision 1: SQLite for Development**
- **Rationale**: Simple setup, no external dependencies
- **Trade-offs**: Limited concurrent users, file-based
- **Future**: Migration to PostgreSQL for production

### **Decision 2: Role-Based Access Control**
- **Rationale**: Flexible permission system for banks
- **Trade-offs**: Complex role management
- **Benefits**: Secure, scalable permission system

### **Decision 3: Approval Workflows**
- **Rationale**: Compliance and risk management
- **Trade-offs**: Slower transfer processing
- **Benefits**: Regulatory compliance, fraud prevention

### **Decision 4: API Key Authentication**
- **Rationale**: Simple, secure authentication for banks
- **Trade-offs**: Key management complexity
- **Benefits**: Stateless, scalable authentication

## 🎯 Future Architecture Roadmap

### **Phase 1: Core Infrastructure** ✅
- [x] Multi-bank user management
- [x] Role-based access control
- [x] Approval workflows
- [x] Basic transfer system

### **Phase 2: Production Integrations**
- [ ] Circle USDC integration
- [ ] Fireblocks custody integration
- [ ] Compliance screening APIs
- [ ] Production database migration

### **Phase 3: Advanced Features**
- [ ] Multi-currency support
- [ ] Advanced compliance workflows
- [ ] Real-time settlement
- [ ] Advanced analytics

### **Phase 4: Enterprise Features**
- [ ] Multi-region deployment
- [ ] Advanced security features
- [ ] Regulatory reporting
- [ ] Partner integrations

---

**Last Updated**: August 2, 2025
**Version**: 1.0.0
**Maintainer**: Development Team 