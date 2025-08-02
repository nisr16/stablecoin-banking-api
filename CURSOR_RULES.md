# Cursor Development Rules

## 🎯 Development Workflow Rules

### **1. Before Implementing Any New Feature:**
- Ask clarifying questions to understand requirements
- Create detailed `plan.md` file under `/plans` directory
- Wait for explicit approval before starting implementation
- Follow the approved plan exactly

### **2. After Feature Confirmation:**
- **ALWAYS** git push to repository after confirming feature works
- Mark as "last working version" in commit message
- Ensure all changes are committed and pushed
- Create a safe checkpoint before moving to next feature

### **3. Testing Requirements:**
- **ALWAYS** update tests for all new features
- **NEVER** update tests to make them pass unless explicitly told to
- Run full test suite before git push: `node tests/api-test-suite.js`
- All tests must pass (100% success rate) before committing
- Add new test functions for new endpoints/features
- Test both success and error cases
- Test authentication and authorization

### **4. Architecture Documentation Rules:**
- **ALWAYS** update `architecture.md` when adding new features
- **ALWAYS** put `architecture.md` in context for any architectural decisions
- Document all data flows, constraints, and integration points
- Update the Architecture Decisions Log for significant changes

### **5. Plan.md Structure Must Include:**
- Feature overview and objectives
- Technical requirements and dependencies
- Detailed implementation steps
- Testing strategy
- Files to modify/create
- Potential risks and mitigation
- Impact on existing architecture

### **6. Code Quality Rules:**
- Follow existing patterns in the codebase
- Use modules instead of single files
- Don't write duplicate code - look for existing solutions
- Only make requested changes
- Fix any linter errors introduced

### **6.1. Code Documentation Rules:**
- **ALWAYS** add comprehensive comments to all code files
- **ALWAYS** explain the purpose and functionality of each function
- **ALWAYS** document complex business logic with clear explanations
- **ALWAYS** add file-level comments explaining the module's purpose
- **ALWAYS** document database queries and their purpose
- **ALWAYS** explain error handling and edge cases
- **ALWAYS** use plain English comments that non-technical people can understand
- **ALWAYS** document API endpoints with clear examples
- **ALWAYS** explain authentication and authorization logic
- **ALWAYS** document database schema relationships
- **ALWAYS** explain configuration and environment setup
- **ALWAYS** document testing strategies and test data
- **ALWAYS** explain deployment and operational procedures

### **7. Documentation Rules:**
- Update README.md for new features
- Update API documentation (Swagger)
- Update architecture.md for architectural changes
- Include examples and usage instructions

### **8. Version Control Rules:**
- Commit frequently with descriptive messages
- Push to repository after each working feature
- Use "last working version" tag for stable checkpoints
- Never leave uncommitted changes when moving to next feature
- **ALWAYS** write comprehensive commit messages that non-technical people can understand
- Include business context and impact in commit messages
- Explain what was accomplished, not just what files changed
- Use clear, non-technical language when possible

### **9. Database Migration Rules:**
- Test database changes thoroughly
- Ensure foreign key constraints are maintained
- Validate data integrity after schema changes
- Update database utils for new tables

### **10. API Design Rules:**
- Follow RESTful conventions
- Use consistent field naming (camelCase for JSON)
- Include proper error handling
- Add comprehensive Swagger documentation
- Test all endpoints with authentication

## 🧪 Testing Standards

### **Test Suite Requirements:**
- All endpoints must have corresponding tests
- Test both success and failure scenarios
- Test authentication and authorization
- Test data validation and error handling
- Test database constraints and foreign keys
- Test API response formats and status codes

### **Test File Structure:**
- `/tests/api-test-suite.js` - Main test suite
- Test functions should be descriptive
- Include proper error handling in tests
- Use realistic test data
- Clean up test data when possible

### **Test Execution:**
- Run tests before any git push
- Ensure 100% success rate
- Fix failing tests before committing
- Document any test failures or issues

## 📋 Current Application Status

### **✅ Working Features:**
- Bank registration with API key generation
- Bank profile retrieval with authentication
- User creation and management
- Role-based access control
- Approval rules management
- Wallet creation and balance checking
- Transfer initiation with approval workflow
- Transfer status tracking
- Pending transfers listing
- Transfer approval system

### **🔧 Technical Stack:**
- **Backend:** Node.js + Express.js
- **Database:** SQLite (better-sqlite3)
- **Documentation:** Swagger/OpenAPI
- **Testing:** Custom test suite with axios
- **Authentication:** API key-based
- **Real-time:** WebSocket support

### **📊 Database Schema:**
- 15+ interconnected tables
- Multi-bank data isolation
- Foreign key constraints
- Role-based access control
- Approval workflow tracking

## 🚀 Next Steps

### **Immediate:**
1. Git push current working version
2. Document current state in architecture.md
3. Plan next feature implementation

### **Future Features:**
- Excel bank list integration
- Circle USDC integration
- Fireblocks custody integration
- Compliance screening
- Production deployment

---

**Last Updated:** August 2, 2025
**Version:** 1.0.0
**Maintainer:** Development Team 