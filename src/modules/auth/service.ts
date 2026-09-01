import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../users/model';
import { Role } from '../roles/model';
import { CustomError } from '../../middlewares/errorHandler';
import { sendMail } from '../../config/mail';

const accessSecret = process.env.JWT_ACCESS_SECRET || 'access_token_secret_key_secure_xyz_123';
const refreshSecret = process.env.JWT_REFRESH_SECRET || 'refresh_token_secret_key_secure_xyz_123';
const accessExpiry = process.env.JWT_ACCESS_EXPIRY || '15m';
const refreshExpiry = process.env.JWT_REFRESH_EXPIRY || '7d';

export interface TokenPayload {
  id: string;
  role: string;
  permissions: string[];
  companyId?: string;
  branchId?: string;
}

export const authService = {
  // Generate Access and Refresh JWT Tokens
  generateTokens: async (user: IUser): Promise<{ accessToken: string; refreshToken: string }> => {
    // Fetch permissions mapped to the user's role
    const roleDoc = await Role.findOne({ name: user.role });
    const permissions = roleDoc ? roleDoc.permissions : [];

    const payload: TokenPayload = {
      id: String(user._id),
      role: user.role,
      permissions,
      companyId: user.companyId,
      branchId: user.branchId
    };

    const accessToken = jwt.sign(payload, accessSecret, { expiresIn: accessExpiry as any });
    const refreshToken = jwt.sign({ id: String(user._id) }, refreshSecret, { expiresIn: refreshExpiry as any });

    // Store hashed refresh token in database
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    user.refreshTokenHash = refreshTokenHash;
    await user.save();

    return { accessToken, refreshToken };
  },

  register: async (data: any): Promise<IUser> => {
    const existing = await User.findOne({ email: data.email });
    if (existing) {
      throw new CustomError('User with this email already exists', 400);
    }

    // Verify role exists
    const roleExists = await Role.findOne({ name: data.role });
    if (!roleExists && data.role !== 'Super Admin') {
      throw new CustomError(`Role ${data.role} does not exist. Seed roles first.`, 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const user = new User({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      status: 'Active',
      companyId: data.companyId || 'company-001',
      branchId: data.branchId || 'branch-001',
      verificationCode,
      isVerified: false
    });

    await user.save();

    // Send mock verification mail
    await sendMail(
      user.email,
      'Verify Your ERP Account',
      `<p>Your account has been created. Use code <b>${verificationCode}</b> to verify your email.</p>`
    );

    return user;
  },

  verifyEmail: async (email: string, code: string): Promise<void> => {
    const user = await User.findOne({ email });
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.verificationCode !== code) {
      throw new CustomError('Invalid verification code', 400);
    }

    user.isVerified = true;
    user.verificationCode = undefined;
    await user.save();
  },

  login: async (data: any): Promise<{ user: IUser; accessToken: string; refreshToken: string }> => {
    const cleanEmail = (data.email || '').trim().toLowerCase();
    const user = await User.findOne({ email: { $regex: new RegExp(`^${cleanEmail}$`, 'i') } });
    if (!user) {
      throw new CustomError('Invalid email or password', 401);
    }

    if (user.status === 'Inactive') {
      throw new CustomError('Your account has been deactivated. Contact Admin.', 403);
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new CustomError('Invalid email or password', 401);
    }

    const tokens = await authService.generateTokens(user);
    return { user, ...tokens };
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
    try {
      const decoded = jwt.verify(refreshToken, refreshSecret) as { id: string };
      const user = await User.findById(decoded.id);
      if (!user || !user.refreshTokenHash) {
        throw new CustomError('Invalid refresh session', 401);
      }

      const isMatch = await bcrypt.compare(refreshToken, user.refreshTokenHash);
      if (!isMatch) {
        throw new CustomError('Invalid session hash', 401);
      }

      // Generate new rotated token set
      return await authService.generateTokens(user);
    } catch (err) {
      throw new CustomError('Session expired. Please log in again.', 401);
    }
  },

  logout: async (userId: string): Promise<void> => {
    const user = await User.findById(userId);
    if (user) {
      user.refreshTokenHash = undefined;
      await user.save();
    }
  }
};
