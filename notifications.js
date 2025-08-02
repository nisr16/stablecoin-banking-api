const express = require('express');
const WebSocket = require('ws');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const axios = require('axios');
const crypto = require('crypto');
const { randomUUID } = require('crypto');
const db = require('./database/connection');

const router = express.Router();

// WebSocket server instance (will be set by server.js)
let wss = null;

// Notification service class
class NotificationService {
  constructor() {
    this.connections = new Map(); // connection_id -> {ws, bank_id, user_id}
    this.initializeTemplates();
  }

  // Initialize default email and SMS templates
  initializeTemplates() {
    // Insert default email templates
    const emailTemplates = [
      {
        name: 'transfer_initiated',
        subject: 'Transfer Initiated - ${amount} ${currency}',
        html_body: 
          '<h2>Transfer Initiated</h2>' +
          '<p>Hello ${recipient_name},</p>' +
          '<p>A transfer of ${amount} ${currency} has been initiated.</p>' +
          '<p><strong>Details:</strong></p>' +
          '<ul>' +
          '<li>Transfer ID: ${transfer_id}</li>' +
          '<li>From: ${sender_name}</li>' +
          '<li>To: ${recipient_name}</li>' +
          '<li>Amount: ${amount} ${currency}</li>' +
          '<li>Status: ${status}</li>' +
          '</ul>' +
          '<p>You will receive another notification when the transfer is completed.</p>',
        text_body: 
          'Transfer Initiated - ${amount} ${currency}\n\n' +
          'Hello ${recipient_name},\n\n' +
          'A transfer of ${amount} ${currency} has been initiated.\n\n' +
          'Details:\n' +
          '- Transfer ID: ${transfer_id}\n' +
          '- From: ${sender_name}\n' +
          '- To: ${recipient_name}\n' +
          '- Amount: ${amount} ${currency}\n' +
          '- Status: ${status}\n\n' +
          'You will receive another notification when the transfer is completed.',
        variables: JSON.stringify(['recipient_name', 'amount', 'currency', 'transfer_id', 'sender_name', 'status'])
      },
      {
        name: 'transfer_completed',
        subject: 'Transfer Completed - \${amount} \${currency}',
        html_body: 
          '<h2>Transfer Completed</h2>' +
          '<p>Hello ${recipient_name},</p>' +
          '<p>Your transfer of ${amount} ${currency} has been completed successfully.</p>' +
          '<p><strong>Details:</strong></p>' +
          '<ul>' +
          '<li>Transfer ID: ${transfer_id}</li>' +
          '<li>From: ${sender_name}</li>' +
          '<li>To: ${recipient_name}</li>' +
          '<li>Amount: ${amount} ${currency}</li>' +
          '<li>Completed at: ${completed_at}</li>' +
          '</ul>',
        text_body: 
          'Transfer Completed - ${amount} ${currency}\n\n' +
          'Hello ${recipient_name},\n\n' +
          'Your transfer of ${amount} ${currency} has been completed successfully.\n\n' +
          'Details:\n' +
          '- Transfer ID: ${transfer_id}\n' +
          '- From: ${sender_name}\n' +
          '- To: ${recipient_name}\n' +
          '- Amount: ${amount} ${currency}\n' +
          '- Completed at: ${completed_at}',
        variables: JSON.stringify(['recipient_name', 'amount', 'currency', 'transfer_id', 'sender_name', 'completed_at'])
      },
      {
        name: 'approval_required',
        subject: 'Approval Required - Transfer \${transfer_id}',
        html_body: 
          '<h2>Approval Required</h2>' +
          '<p>Hello ${approver_name},</p>' +
          '<p>A transfer requires your approval.</p>' +
          '<p><strong>Transfer Details:</strong></p>' +
          '<ul>' +
          '<li>Transfer ID: ${transfer_id}</li>' +
          '<li>From: ${sender_name}</li>' +
          '<li>To: ${recipient_name}</li>' +
          '<li>Amount: ${amount} ${currency}</li>' +
          '<li>Initiated by: ${initiator_name}</li>' +
          '</ul>' +
          '<p>Please log in to approve or reject this transfer.</p>',
        text_body: 
          'Approval Required - Transfer ${transfer_id}\n\n' +
          'Hello ${approver_name},\n\n' +
          'A transfer requires your approval.\n\n' +
          'Transfer Details:\n' +
          '- Transfer ID: ${transfer_id}\n' +
          '- From: ${sender_name}\n' +
          '- To: ${recipient_name}\n' +
          '- Amount: ${amount} ${currency}\n' +
          '- Initiated by: ${initiator_name}\n\n' +
          'Please log in to approve or reject this transfer.',
        variables: JSON.stringify(['approver_name', 'transfer_id', 'sender_name', 'recipient_name', 'amount', 'currency', 'initiator_name'])
      }
    ];

    // Insert default SMS templates
    const smsTemplates = [
      {
        name: 'transfer_completed_sms',
        message: 'Transfer completed: ${amount} ${currency} from ${sender_name} to ${recipient_name}. ID: ${transfer_id}',
        variables: JSON.stringify(['amount', 'currency', 'sender_name', 'recipient_name', 'transfer_id'])
      },
      {
        name: 'approval_required_sms',
        message: 'Approval required for transfer ${transfer_id}: ${amount} ${currency} from ${sender_name} to ${recipient_name}',
        variables: JSON.stringify(['transfer_id', 'amount', 'currency', 'sender_name', 'recipient_name'])
      }
    ];

    // Insert templates if they don't exist
    emailTemplates.forEach(template => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO email_templates (name, subject, html_body, text_body, variables)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(template.name, template.subject, template.html_body, template.text_body, template.variables);
    });

    smsTemplates.forEach(template => {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO sms_templates (name, message, variables)
        VALUES (?, ?, ?)
      `);
      stmt.run(template.name, template.message, template.variables);
    });
  }

  // Set WebSocket server
  setWebSocketServer(server) {
    wss = new WebSocket.Server({ server });
    
    wss.on('connection', (ws, req) => {
      const connectionId = randomUUID();
      const ip = req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'] || 'Unknown';
      
      // Store connection
      this.connections.set(connectionId, { ws, bank_id: null, user_id: null });
      
      // Store connection in database
      const stmt = db.prepare(`
        INSERT INTO websocket_connections (connection_id, ip_address, user_agent)
        VALUES (?, ?, ?)
      `);
      stmt.run(connectionId, ip, userAgent);
      
      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connection_established',
        connection_id: connectionId,
        message: 'WebSocket connection established'
      }));
      
      // Handle authentication
      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          
          if (data.type === 'authenticate') {
            this.authenticateConnection(connectionId, data.bank_id, data.user_id);
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });
      
      // Handle disconnection
      ws.on('close', () => {
        this.connections.delete(connectionId);
        
        // Update database
        const stmt = db.prepare(`
          UPDATE websocket_connections 
          SET is_active = 0, last_activity = CURRENT_TIMESTAMP
          WHERE connection_id = ?
        `);
        stmt.run(connectionId);
      });
    });
  }

  // Authenticate WebSocket connection
  authenticateConnection(connectionId, bankId, userId) {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.bank_id = bankId;
      connection.user_id = userId;
      
      // Update database
      const stmt = db.prepare(`
        UPDATE websocket_connections 
        SET bank_id = ?, user_id = ?, last_activity = CURRENT_TIMESTAMP
        WHERE connection_id = ?
      `);
      stmt.run(bankId, userId, connectionId);
      
      // Send confirmation
      connection.ws.send(JSON.stringify({
        type: 'authentication_success',
        message: 'Connection authenticated successfully'
      }));
    }
  }

  // Send real-time notification
  sendRealTimeNotification(bankId, userId, notification) {
    // Send to WebSocket connections
    this.connections.forEach((connection, connectionId) => {
      if (connection.bank_id === bankId && connection.user_id === userId) {
        try {
          connection.ws.send(JSON.stringify({
            type: 'notification',
            data: notification
          }));
        } catch (error) {
          console.error('WebSocket send error:', error);
          this.connections.delete(connectionId);
        }
      }
    });
  }

  // Create notification in database
  createNotification(bankId, userId, type, title, message, priority = 'normal', metadata = null) {
    const stmt = db.prepare(`
      INSERT INTO notifications (bank_id, user_id, type, title, message, priority, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(bankId, userId, type, title, message, priority, metadata);
    
    // Send real-time notification
    this.sendRealTimeNotification(bankId, userId, {
      id: result.lastInsertRowid,
      type,
      title,
      message,
      priority,
      created_at: new Date().toISOString()
    });
    
    return result.lastInsertRowid;
  }

  // Send email notification
  async sendEmail(to, templateName, variables) {
    try {
      // Get template
      const stmt = db.prepare('SELECT * FROM email_templates WHERE name = ?');
      const template = stmt.get(templateName);
      
      if (!template) {
        throw new Error(`Email template '${templateName}' not found`);
      }
      
      // Replace variables in template
      let subject = template.subject;
      let htmlBody = template.html_body;
      let textBody = template.text_body;
      
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        subject = subject.replace(regex, variables[key]);
        htmlBody = htmlBody.replace(regex, variables[key]);
        textBody = textBody.replace(regex, variables[key]);
      });
      
      // Configure email transporter (using Gmail for demo)
      const transporter = nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'your-email@gmail.com',
          pass: process.env.EMAIL_PASS || 'your-app-password'
        }
      });
      
      // Send email
      const mailOptions = {
        from: process.env.EMAIL_USER || 'your-email@gmail.com',
        to: to,
        subject: subject,
        html: htmlBody,
        text: textBody
      };
      
      const result = await transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return result;
      
    } catch (error) {
      console.error('Email sending error:', error);
      throw error;
    }
  }

  // Send SMS notification
  async sendSMS(to, templateName, variables) {
    try {
      // Get template
      const stmt = db.prepare('SELECT * FROM sms_templates WHERE name = ?');
      const template = stmt.get(templateName);
      
      if (!template) {
        throw new Error(`SMS template '${templateName}' not found`);
      }
      
      // Replace variables in template
      let message = template.message;
      Object.keys(variables).forEach(key => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        message = message.replace(regex, variables[key]);
      });
      
      // Configure Twilio client
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID || 'your-account-sid',
        process.env.TWILIO_AUTH_TOKEN || 'your-auth-token'
      );
      
      // Send SMS
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        to: to
      });
      
      console.log('SMS sent successfully:', result.sid);
      return result;
      
    } catch (error) {
      console.error('SMS sending error:', error);
      throw error;
    }
  }

  // Send webhook notification
  async sendWebhook(bankId, eventType, payload) {
    try {
      // Get webhook endpoints for this bank and event type
      const stmt = db.prepare(`
        SELECT * FROM webhook_endpoints 
        WHERE bank_id = ? AND is_active = 1
      `);
      const webhooks = stmt.all(bankId);
      
      const promises = webhooks.map(async (webhook) => {
        const events = JSON.parse(webhook.events);
        if (!events.includes(eventType)) return;
        
        const startTime = Date.now();
        
        try {
          // Add signature for security
          const signature = crypto
            .createHmac('sha256', webhook.secret_key)
            .update(JSON.stringify(payload))
            .digest('hex');
          
          const response = await axios.post(webhook.url, payload, {
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': signature,
              'X-Event-Type': eventType,
              'X-Bank-ID': bankId.toString()
            },
            timeout: 10000 // 10 second timeout
          });
          
          const deliveryTime = Date.now() - startTime;
          
          // Log successful delivery
          const logStmt = db.prepare(`
            INSERT INTO webhook_deliveries 
            (webhook_id, event_type, payload, response_code, response_body, delivery_time_ms, success)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          logStmt.run(
            webhook.id,
            eventType,
            JSON.stringify(payload),
            response.status,
            JSON.stringify(response.data),
            deliveryTime,
            true
          );
          
          // Update last triggered
          const updateStmt = db.prepare(`
            UPDATE webhook_endpoints 
            SET last_triggered = CURRENT_TIMESTAMP, failure_count = 0
            WHERE id = ?
          `);
          updateStmt.run(webhook.id);
          
        } catch (error) {
          const deliveryTime = Date.now() - startTime;
          
          // Log failed delivery
          const logStmt = db.prepare(`
            INSERT INTO webhook_deliveries 
            (webhook_id, event_type, payload, response_code, response_body, delivery_time_ms, success)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `);
          logStmt.run(
            webhook.id,
            eventType,
            JSON.stringify(payload),
            error.response?.status || 0,
            error.message,
            deliveryTime,
            false
          );
          
          // Increment failure count
          const updateStmt = db.prepare(`
            UPDATE webhook_endpoints 
            SET failure_count = failure_count + 1
            WHERE id = ?
          `);
          updateStmt.run(webhook.id);
          
          console.error(`Webhook delivery failed for ${webhook.url}:`, error.message);
        }
      });
      
      await Promise.all(promises);
      
    } catch (error) {
      console.error('Webhook sending error:', error);
      throw error;
    }
  }

  // Send Slack/Teams notification
  async sendTeamNotification(bankId, eventType, payload) {
    try {
      // Get team integrations for this bank
      const stmt = db.prepare(`
        SELECT * FROM team_integrations 
        WHERE bank_id = ? AND is_active = 1
      `);
      const integrations = stmt.all(bankId);
      
      const promises = integrations.map(async (integration) => {
        const events = JSON.parse(integration.events);
        if (!events.includes(eventType)) return;
        
        let message;
        if (integration.platform === 'slack') {
          message = {
            text: `*${eventType.toUpperCase()}*`,
            attachments: [{
              color: eventType.includes('error') ? 'danger' : 'good',
              fields: Object.keys(payload).map(key => ({
                title: key.replace(/_/g, ' ').toUpperCase(),
                value: payload[key].toString(),
                short: true
              }))
            }]
          };
        } else if (integration.platform === 'teams') {
          message = {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": eventType.includes('error') ? "FF0000" : "00FF00",
            "summary": eventType.toUpperCase(),
            "sections": [{
              "activityTitle": eventType.toUpperCase(),
              "facts": Object.keys(payload).map(key => ({
                "name": key.replace(/_/g, ' ').toUpperCase(),
                "value": payload[key].toString()
              }))
            }]
          };
        }
        
        try {
          await axios.post(integration.webhook_url, message, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 5000
          });
          
          console.log(`${integration.platform} notification sent successfully`);
          
        } catch (error) {
          console.error(`${integration.platform} notification failed:`, error.message);
        }
      });
      
      await Promise.all(promises);
      
    } catch (error) {
      console.error('Team notification error:', error);
      throw error;
    }
  }
}

// Create notification service instance
const notificationService = new NotificationService();

// API Routes

/**
 * @swagger
 * /api/notifications/websocket:
 *   get:
 *     summary: Get WebSocket connection info
 *     description: Returns information about WebSocket connections for real-time notifications
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: WebSocket connection information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "WebSocket endpoint available at ws://localhost:3000/ws"
 *                 connections:
 *                   type: integer
 *                   description: Number of active WebSocket connections
 *                   example: 5
 *                 instructions:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: [
 *                     "Connect to ws://localhost:3000/ws",
 *                     "Send authentication message: {\"type\": \"authenticate\", \"bank_id\": 1, \"user_id\": 1}",
 *                     "Receive real-time notifications for your bank and user"
 *                   ]
 */
router.get('/websocket', (req, res) => {
  res.json({
    message: 'WebSocket endpoint available at ws://localhost:3000/ws',
    connections: notificationService.connections.size,
    instructions: [
      'Connect to ws://localhost:3000/ws',
      'Send authentication message: {"type": "authenticate", "bank_id": 1, "user_id": 1}',
      'Receive real-time notifications for your bank and user'
    ]
  });
});

/**
 * @swagger
 * /api/notifications/list:
 *   get:
 *     summary: Get user notifications
 *     description: Retrieve notifications for a specific user with filtering options
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *         example: 1
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [unread, read, archived]
 *         description: Filter by notification status
 *         example: "unread"
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of notifications to return
 *         example: 20
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       user_id:
 *                         type: integer
 *                         example: 1
 *                       type:
 *                         type: string
 *                         example: "transfer_completed"
 *                       title:
 *                         type: string
 *                         example: "Transfer Completed"
 *                       message:
 *                         type: string
 *                         example: "Transfer of 50000 USDC has been completed"
 *                       status:
 *                         type: string
 *                         example: "unread"
 *                       priority:
 *                         type: string
 *                         example: "normal"
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                 count:
 *                   type: integer
 *                   example: 15
 *       400:
 *         description: Missing required parameters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/list', (req, res) => {
  const { user_id, status, limit = 50 } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  
  let query = `
    SELECT * FROM notifications 
    WHERE user_id = ?
  `;
  const params = [user_id];
  
  if (status) {
    query += ' AND status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ?';
  params.push(parseInt(limit));
  
  const stmt = db.prepare(query);
  const notifications = stmt.all(...params);
  
  res.json({
    notifications,
    count: notifications.length
  });
});

/**
 * @swagger
 * /api/notifications/mark-read:
 *   post:
 *     summary: Mark notification as read
 *     description: Mark a notification as read by notification ID
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - notification_id
 *             properties:
 *               notification_id:
 *                 type: integer
 *                 description: ID of the notification to mark as read
 *                 example: 1
 *     responses:
 *       200:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notification marked as read"
 *                 notification_id:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Missing notification ID
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/mark-read', (req, res) => {
  const { notification_id } = req.body;
  
  if (!notification_id) {
    return res.status(400).json({ error: 'notification_id is required' });
  }
  
  const stmt = db.prepare(`
    UPDATE notifications 
    SET status = 'read', read_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  
  const result = stmt.run(notification_id);
  
  if (result.changes > 0) {
    res.json({ message: 'Notification marked as read' });
  } else {
    res.status(404).json({ error: 'Notification not found' });
  }
});

/**
 * @swagger
 * /api/notifications/webhooks:
 *   get:
 *     summary: Get webhook endpoints
 *     description: Retrieve webhook endpoints for a bank with their status and event configurations
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: bank_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bank ID
 *         example: 1
 *     responses:
 *       200:
 *         description: List of webhook endpoints
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 webhooks:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Transfer Notifications"
 *                       url:
 *                         type: string
 *                         example: "https://api.bank.com/webhooks/transfers"
 *                       events:
 *                         type: string
 *                         example: "[\"transfer_completed\", \"transfer_failed\"]"
 *                       is_active:
 *                         type: boolean
 *                         example: true
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2024-01-15T10:30:00.000Z"
 *                       last_triggered:
 *                         type: string
 *                         format: date-time
 *                         nullable: true
 *                         example: "2024-01-15T11:00:00.000Z"
 *                       failure_count:
 *                         type: integer
 *                         example: 0
 *       400:
 *         description: Missing bank_id parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/webhooks', (req, res) => {
  const { bank_id } = req.query;
  
  if (!bank_id) {
    return res.status(400).json({ error: 'bank_id is required' });
  }
  
  const stmt = db.prepare(`
    SELECT id, name, url, events, is_active, created_at, last_triggered, failure_count
    FROM webhook_endpoints 
    WHERE bank_id = ?
    ORDER BY created_at DESC
  `);
  
  const webhooks = stmt.all(bank_id);
  
  res.json({ webhooks });
});

/**
 * @swagger
 * /api/notifications/webhooks:
 *   post:
 *     summary: Create webhook endpoint
 *     description: Create a new webhook endpoint for notifications with event filtering
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bank_id
 *               - name
 *               - url
 *               - events
 *             properties:
 *               bank_id:
 *                 type: integer
 *                 description: Bank ID
 *                 example: 1
 *               name:
 *                 type: string
 *                 description: Webhook name
 *                 example: "Transfer Notifications"
 *               url:
 *                 type: string
 *                 description: Webhook URL
 *                 example: "https://api.bank.com/webhooks/transfers"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of event types to listen for
 *                 example: ["transfer_completed", "transfer_failed", "approval_required"]
 *     responses:
 *       200:
 *         description: Webhook endpoint created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Webhook endpoint created successfully"
 *                 webhook_id:
 *                   type: integer
 *                   example: 1
 *                 secret_key:
 *                   type: string
 *                   description: Secret key for webhook authentication
 *                   example: "abc123def456ghi789"
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/webhooks', (req, res) => {
  const { bank_id, name, url, events } = req.body;
  
  if (!bank_id || !name || !url || !events) {
    return res.status(400).json({ 
      error: 'bank_id, name, url, and events are required' 
    });
  }
  
  const secretKey = crypto.randomBytes(32).toString('hex');
  
  const stmt = db.prepare(`
    INSERT INTO webhook_endpoints (bank_id, name, url, events, secret_key)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(bank_id, name, url, JSON.stringify(events), secretKey);
  
  res.json({
    message: 'Webhook endpoint created successfully',
    webhook_id: result.lastInsertRowid,
    secret_key: secretKey
  });
});

/**
 * @swagger
 * /api/notifications/team-integrations:
 *   post:
 *     summary: Create team integration
 *     description: Create Slack or Teams integration for notifications
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - bank_id
 *               - platform
 *               - webhook_url
 *             properties:
 *               bank_id:
 *                 type: integer
 *                 description: Bank ID
 *                 example: 1
 *               platform:
 *                 type: string
 *                 enum: [slack, teams]
 *                 description: Team platform
 *                 example: "slack"
 *               webhook_url:
 *                 type: string
 *                 description: Webhook URL for the team platform
 *                 example: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX"
 *               channel:
 *                 type: string
 *                 description: Channel name (optional)
 *                 example: "#treasury-alerts"
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Events to send to this integration
 *                 example: ["transfer_completed", "transfer_failed", "approval_required"]
 *     responses:
 *       200:
 *         description: Team integration created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Team integration created successfully"
 *                 integration_id:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ValidationError'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/team-integrations', (req, res) => {
  const { bank_id, platform, webhook_url, channel, events } = req.body;
  
  if (!bank_id || !platform || !webhook_url || !events) {
    return res.status(400).json({ 
      error: 'bank_id, platform, webhook_url, and events are required' 
    });
  }
  
  if (!['slack', 'teams'].includes(platform)) {
    return res.status(400).json({ 
      error: 'platform must be either "slack" or "teams"' 
    });
  }
  
  const stmt = db.prepare(`
    INSERT INTO team_integrations (bank_id, platform, webhook_url, channel, events)
    VALUES (?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(bank_id, platform, webhook_url, channel || null, JSON.stringify(events));
  
  res.json({
    message: `${platform} integration created successfully`,
    integration_id: result.lastInsertRowid
  });
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Get notification preferences for a user with default settings if none exist
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: user_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *         example: 1
 *     responses:
 *       200:
 *         description: User notification preferences
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user_id:
 *                   type: integer
 *                   example: 1
 *                 email_enabled:
 *                   type: boolean
 *                   example: true
 *                 sms_enabled:
 *                   type: boolean
 *                   example: false
 *                 push_enabled:
 *                   type: boolean
 *                   example: true
 *                 webhook_enabled:
 *                   type: boolean
 *                   example: true
 *                 transfer_notifications:
 *                   type: boolean
 *                   example: true
 *                 approval_notifications:
 *                   type: boolean
 *                   example: true
 *                 security_notifications:
 *                   type: boolean
 *                   example: true
 *                 system_notifications:
 *                   type: boolean
 *                   example: false
 *       400:
 *         description: Missing user_id parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/preferences', (req, res) => {
  const { user_id } = req.query;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  
  const stmt = db.prepare(`
    SELECT * FROM notification_preferences WHERE user_id = ?
  `);
  
  const preferences = stmt.get(user_id);
  
  if (!preferences) {
    // Create default preferences
    const insertStmt = db.prepare(`
      INSERT INTO notification_preferences (user_id)
      VALUES (?)
    `);
    insertStmt.run(user_id);
    
    res.json({
      user_id: parseInt(user_id),
      email_enabled: true,
      sms_enabled: false,
      push_enabled: true,
      webhook_enabled: true,
      transfer_notifications: true,
      approval_notifications: true,
      security_notifications: true,
      system_notifications: false
    });
  } else {
    res.json(preferences);
  }
});

/**
 * @swagger
 * /api/notifications/preferences:
 *   put:
 *     summary: Update notification preferences
 *     description: Update notification preferences for a user with granular control
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - user_id
 *             properties:
 *               user_id:
 *                 type: integer
 *                 description: User ID
 *                 example: 1
 *               email_enabled:
 *                 type: boolean
 *                 description: Enable email notifications
 *                 example: true
 *               sms_enabled:
 *                 type: boolean
 *                 description: Enable SMS notifications
 *                 example: false
 *               push_enabled:
 *                 type: boolean
 *                 description: Enable push notifications
 *                 example: true
 *               webhook_enabled:
 *                 type: boolean
 *                 description: Enable webhook notifications
 *                 example: true
 *               transfer_notifications:
 *                 type: boolean
 *                 description: Enable transfer notifications
 *                 example: true
 *               approval_notifications:
 *                 type: boolean
 *                 description: Enable approval notifications
 *                 example: true
 *               security_notifications:
 *                 type: boolean
 *                 description: Enable security notifications
 *                 example: true
 *               system_notifications:
 *                 type: boolean
 *                 description: Enable system notifications
 *                 example: false
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Notification preferences updated successfully"
 *       400:
 *         description: Missing user_id
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/preferences', (req, res) => {
  const {
    user_id,
    email_enabled,
    sms_enabled,
    push_enabled,
    webhook_enabled,
    transfer_notifications,
    approval_notifications,
    security_notifications,
    system_notifications
  } = req.body;
  
  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO notification_preferences 
    (user_id, email_enabled, sms_enabled, push_enabled, webhook_enabled,
     transfer_notifications, approval_notifications, security_notifications, system_notifications,
     updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  stmt.run(
    user_id,
    email_enabled ? 1 : 0,
    sms_enabled ? 1 : 0,
    push_enabled ? 1 : 0,
    webhook_enabled ? 1 : 0,
    transfer_notifications ? 1 : 0,
    approval_notifications ? 1 : 0,
    security_notifications ? 1 : 0,
    system_notifications ? 1 : 0
  );
  
  res.json({ message: 'Notification preferences updated successfully' });
});

// Export both router and service
module.exports = { router, notificationService }; 