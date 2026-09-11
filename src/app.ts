import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

// Load Env variables
dotenv.config();

// Initialize Database Connection
connectDB();

// Middlewares
import { errorHandler } from './middlewares/errorHandler';
import { idempotency } from './middlewares/idempotency';

// Route Handlers
import authRoutes from './modules/auth/route';
import masterRoutes from './modules/masters/route';
import procurementRoutes from './modules/procurement/route';
import salesRoutes from './modules/sales/route';
import inventoryRoutes from './modules/inventory/route';
import crmRoutes from './modules/crm/route';
import financeRoutes from './modules/finance/route';
import reportRoutes from './modules/reports/route';
import qualityRoutes, { qualityControlRouter, qualityRebateRulesRouter, qualityParametersRouter } from './modules/quality/route';

const app = express();

// 1. Security & Parsers (Section 58)
app.use(helmet());

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  'https://brijrani-crm-frontend.vercel.app'
];
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (
      allowedOrigins.indexOf(origin) !== -1 || 
      allowedOrigins.some(o => origin.startsWith(o)) ||
      origin.includes('vercel.app') ||
      origin.includes('brijrani')
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate Limiting (2000 requests per 15 minutes per IP)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// Idempotency Middleware (Section 57)
app.use(idempotency as any);

// Serve static upload backups
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 2. Base Modular Routing (Section 63)
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/masters', masterRoutes);
app.use('/api/v1/procurement', procurementRoutes);
app.use('/api/v1/sales', salesRoutes);
app.use('/api/v1/inventory', inventoryRoutes);
app.use('/api/v1/crm', crmRoutes);
app.use('/api/v1/finance', financeRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/quality', qualityRoutes);

// Quality Control & Rebate Master Direct Endpoints (Section 22)
app.use('/api/quality-control', qualityControlRouter);
app.use('/api/quality-rebate-rules', qualityRebateRulesRouter);
app.use('/api/quality-parameters', qualityParametersRouter);
app.use('/api/v1/quality-control', qualityControlRouter);
app.use('/api/v1/quality-rebate-rules', qualityRebateRulesRouter);
app.use('/api/v1/quality-parameters', qualityParametersRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.send('hello from backend');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'ERP API Server Healthy', timestamp: new Date() });
});

// 3. Centralized Error Handler (Section 53)
app.use(errorHandler as any);

export default app;
