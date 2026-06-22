import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { clerkMiddleware } from '@clerk/express';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import companyRoutes from './routes/companyRoutes.js';

// Load environment variables from .env file
dotenv.config();

// Initialize express app
const app = express();

// Standard Security & Utility Middlewares
app.use(helmet()); // Set secure HTTP headers
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse incoming JSON payloads
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded payloads

// Clerk Auth Middleware (attaches req.auth for authentication checking)
app.use(clerkMiddleware());

// Logging configuration based on environment
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Establish database connection
connectDB();

/**
 * GET /api/health
 * Verifies API server health and checks MongoDB connection status.
 */
app.get('/api/health', (req, res) => {
  const dbStates = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  const dbStatus = dbStates[readyState] || 'Unknown';

  const isHealthy = readyState === 1; // Database is fully connected

  res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    server: {
      uptime: process.uptime(),
      message: 'SmartERP Backend API is running',
    },
    database: {
      status: dbStatus,
      readyState: readyState,
    },
  });
});

// Register API routes
app.use('/api/user', userRoutes);
app.use('/api/companies', companyRoutes);

// Fallback for 404 - Not Found
app.use((req, res, next) => {
  res.status(404).json({
    error: 'Resource Not Found',
    path: req.originalUrl,
  });
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
      status: err.status || 500,
    },
  });
});

// Set port and start listener
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});
