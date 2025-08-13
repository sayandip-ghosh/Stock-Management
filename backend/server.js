const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const partRoutes = require('./routes/parts');
const productRoutes = require('./routes/products');
const bomRoutes = require('./routes/bom');
const assemblyRoutes = require('./routes/assemblies');
const transactionRoutes = require('./routes/transactions');
const stockManagementRoutes = require('./routes/stockManagement');

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://localhost:5173', 
    'http://localhost:5174',
    'http://[::1]:5173',
    'http://[::1]:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ], 
  credentials: true
}));

// Rate limiting (disabled for development)
// const limiter = rateLimit({
//   windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
//   max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
//   message: 'Too many requests from this IP, please try again later.'
// });
// app.use('/api/', limiter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Stock Management API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/parts', partRoutes);
app.use('/api/products', productRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/assemblies', assemblyRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/stock-management', stockManagementRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    message: `The route ${req.originalUrl} does not exist`
  });
});



// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/stock_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('Connected to MongoDB');
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
})
.catch((error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

module.exports = app;
