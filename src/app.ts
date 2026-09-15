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
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));

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
    return callback(null, true);
  },
  credentials: true
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
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

// Serve static upload backups with permissive CORS
const uploadStaticDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../uploads');
app.use('/uploads', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
}, express.static(uploadStaticDir, {
  maxAge: '1d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));

// Serverless DB connection assurance
app.use(async (req, res, next) => {
  try {
    await connectDB();
  } catch (err) {
    console.error('DB connection assurance error:', err);
  }
  next();
});

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

// Direct Upload Endpoints (Cloudinary / File upload)
import { upload, uploadToCloud, uploadToCloudinary } from './config/storage';
const handleUpload = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    if (req.file) {
      const url = await uploadToCloud(req.file);
      res.status(201).json({ success: true, message: 'File uploaded successfully', data: { url, secure_url: url } });
      return;
    }
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      const urls = await Promise.all((req.files as Express.Multer.File[]).map(f => uploadToCloud(f)));
      res.status(201).json({ success: true, message: 'Files uploaded successfully', data: { urls, url: urls[0] } });
      return;
    }
    if (req.body && req.body.image) {
      const result = await uploadToCloudinary(req.body.image);
      res.status(201).json({ success: true, message: 'Image uploaded successfully', data: { url: result.secure_url, secure_url: result.secure_url } });
      return;
    }
    res.status(400).json({ success: false, message: 'No file or image uploaded' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
};
app.post('/api/upload', upload.any(), handleUpload as any);
app.post('/api/v1/upload', upload.any(), handleUpload as any);

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
