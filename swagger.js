const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stablecoin Banking API',
      version: '1.0.0',
      description: 'Enterprise-grade API for 30-second cross-border bank transfers using stablecoin infrastructure. Features include multi-bank user management, custom approval workflows, role-based permissions, real-time notifications, and comprehensive audit trails.',
      contact: {
        name: 'API Support',
        email: 'support@stablecoin-api.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'https://stablecoin-banking-api-production.up.railway.app',
        description: 'Production server',
      },
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: 'Health',
        description: 'System health and status endpoints',
      },
      {
        name: 'Banks',
        description: 'Bank registration and management',
      },
      {
        name: 'Users',
        description: 'Bank user management operations',
      },
      {
        name: 'Roles',
        description: 'Role-based permissions and approval rules',
      },
      {
        name: 'Wallets',
        description: 'Bank wallet management operations',
      },
      {
        name: 'Transfers',
        description: 'Cross-border transfer operations',
      },
      {
        name: 'Notifications',
        description: 'Real-time notifications and messaging',
      },
    ],
  },
  apis: ['./server.js', './wallet.js', './transfers.js', './banks.js', './users.js', './roles.js', './notifications.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
};