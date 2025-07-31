const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Stablecoin Banking API',
      version: '0.3.0',
      description: 'Enterprise-grade API for 30-second cross-border bank transfers using stablecoin infrastructure',
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
        name: 'Wallets',
        description: 'Bank wallet management operations',
      },
      {
        name: 'Transfers',
        description: 'Cross-border transfer operations',
      },
    ],
  },
  apis: ['./server.js', './wallet.js', './transfers.js'], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = {
  specs,
  swaggerUi,
};