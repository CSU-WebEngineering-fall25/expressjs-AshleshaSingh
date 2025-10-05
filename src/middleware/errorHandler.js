const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Error handling middleware
module.exports = (err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl || req.url,
    method: req.method,
    requestId: req.requestId || 'N/A'
  });

  // Handle specific error types:
  
  // 1. ValidationError (from express-validator)
  if (err.name === 'ValidationError'){
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message,
      details: err.details
    });
  }
  
  // 2. "Comic not found" messages
  else if (err.message && err.message.toLowerCase().includes('comic not found')){
    return res.status(404).json({
      error: 'Comic not found',
      message: 'The requested comic does not exist'
    });
  }
  
  // 3. "Invalid comic ID" messages  
  else if (err.message && err.message.toLowerCase().includes('invalid comic id')){
    return res.status(400).json({
      error: 'Invalid comic ID',
      message: 'Comic ID must be a positive integer'
    })
  }
  
  // 4. Operational errors (errors with isOperational: true property)
  else if (err.isOperational && err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
  
  // 5. Default case - don't expose internal error details
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'Something went wrong on our end'
  });
};