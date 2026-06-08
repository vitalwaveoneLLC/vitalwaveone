// VitalWave API Middleware
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// ============================================================
// AUTHORIZATION MIDDLEWARE
// ============================================================

const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: 'Not authenticated' });
      }

      // TODO: Fetch user role from database and check
      next();
    } catch (error) {
      res.status(500).json({ message: 'Authorization check failed' });
    }
  };
};

// ============================================================
// RATE LIMITING MIDDLEWARE
// ============================================================

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each user to 30 requests per minute
  keyGenerator: (req) => req.user?.userId || req.ip,
});

// ============================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal server error';

  res.status(status).json({
    error: {
      status,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

// ============================================================
// INPUT VALIDATION MIDDLEWARE
// ============================================================

const validateInput = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message });
    }
    req.body = value;
    next();
  };
};

// ============================================================
// CORS MIDDLEWARE
// ============================================================

const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};

// ============================================================
// LOGGING MIDDLEWARE
// ============================================================

const requestLogger = (req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`
    );
  });

  next();
};

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  authenticateToken,
  requireRole,
  generalLimiter,
  authLimiter,
  apiLimiter,
  errorHandler,
  validateInput,
  corsOptions,
  requestLogger,
};
