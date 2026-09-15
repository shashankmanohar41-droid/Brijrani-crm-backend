import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dvjmqcith',
  api_key: process.env.CLOUDINARY_API_KEY || '383836762117386',
  api_secret: process.env.CLOUDINARY_API_SECRET || '7w58kksUNYt34o9nAVQp6TzSef0',
  secure: true
});

export { cloudinary };

// Local storage backup directory (use /tmp on Vercel)
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : path.join(__dirname, '../../uploads');
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (e) {
  console.warn('Could not initialize local upload directory:', e);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp|gif|pdf|csv|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('image/');
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only images (JPG, PNG, WEBP), PDFs, CSV, or Excel files are allowed'));
    }
  }
});

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

export const uploadToCloudinary = async (
  filePathOrBuffer: string | Buffer,
  folder: string = 'brijrani_erp/grn_photos'
): Promise<CloudinaryUploadResult> => {
  try {
    if (typeof filePathOrBuffer === 'string') {
      const result = await cloudinary.uploader.upload(filePathOrBuffer, {
        folder,
        resource_type: 'auto',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }]
      });
      return {
        url: result.url,
        secure_url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        bytes: result.bytes
      };
    } else {
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'auto',
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
          },
          (error, result) => {
            if (error || !result) return reject(error || new Error('Upload failed'));
            resolve({
              url: result.url,
              secure_url: result.secure_url,
              public_id: result.public_id,
              format: result.format,
              bytes: result.bytes
            });
          }
        );
        uploadStream.end(filePathOrBuffer);
      });
    }
  } catch (error) {
    console.error('[CLOUDINARY UPLOAD ERROR]', error);
    throw error;
  }
};

export const uploadToCloud = async (file: Express.Multer.File, folder: string = 'brijrani_erp/grn_photos'): Promise<string> => {
  try {
    if (file.path && fs.existsSync(file.path)) {
      const res = await uploadToCloudinary(file.path, folder);
      // Clean up local temp file
      fs.unlink(file.path, () => {});
      return res.secure_url;
    } else if (file.buffer) {
      const res = await uploadToCloudinary(file.buffer, folder);
      return res.secure_url;
    }
  } catch (err) {
    console.error('[FALLBACK TO LOCAL UPLOAD]', err);
  }
  return `/uploads/${file.filename}`;
};


