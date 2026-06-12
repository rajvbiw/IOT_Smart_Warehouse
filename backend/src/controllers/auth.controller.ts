import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { User, Warehouse } from '../models';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_ME_MIN_32_CHARS';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'CHANGE_ME_MIN_32_CHARS_REFRESH';

// Temporary store for active refresh tokens in simulation
const refreshTokens: Set<string> = new Set();

export class AuthController {
  public static async login(req: AuthenticatedRequest, res: Response) {
    const { email, password } = req.body;

    try {
      const user = await User.findOne({
        where: { email, is_active: true },
        include: [{ model: Warehouse, as: 'warehouse' }],
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const isPasswordValid = await user.validatePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT tokens
      const accessToken = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          warehouse_id: user.warehouse_id,
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      const refreshToken = jwt.sign(
        {
          id: user.id,
        },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
      );

      refreshTokens.add(refreshToken);

      // Update last login
      user.last_login = new Date();
      await user.save();

      // Return credentials + warehouse info
      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          warehouse_id: user.warehouse_id,
          warehouse: user.warehouse,
        },
      });
    } catch (err) {
      console.error('Login error:', err);
      return res.status(500).json({ error: 'Internal server error during login' });
    }
  }

  public static async refresh(req: AuthenticatedRequest, res: Response) {
    const { refreshToken } = req.body;

    if (!refreshToken || !refreshTokens.has(refreshToken)) {
      return res.status(401).json({ error: 'Refresh token missing or invalid' });
    }

    try {
      const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
      const user = await User.findByPk(decoded.id, {
        include: [{ model: Warehouse, as: 'warehouse' }],
      });

      if (!user || !user.is_active) {
        return res.status(401).json({ error: 'User not found or suspended' });
      }

      // Issue new access token
      const accessToken = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          warehouse_id: user.warehouse_id,
        },
        JWT_SECRET,
        { expiresIn: '15m' }
      );

      return res.status(200).json({
        accessToken,
      });
    } catch (err) {
      console.error('Token refresh error:', err);
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  }

  public static async logout(req: AuthenticatedRequest, res: Response) {
    const { refreshToken } = req.body;
    if (refreshToken) {
      refreshTokens.delete(refreshToken);
    }
    return res.status(200).json({ message: 'Logged out successfully' });
  }

  public static async me(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password_hash'] },
        include: [{ model: Warehouse, as: 'warehouse' }],
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      return res.status(200).json(user);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new passwords are required' });
    }

    try {
      const user = await User.findByPk(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isValid = await user.validatePassword(oldPassword);
      if (!isValid) {
        return res.status(400).json({ error: 'Incorrect old password' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password_hash = await bcrypt.hash(newPassword, salt);
      await user.save();

      return res.status(200).json({ message: 'Password updated successfully' });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to change password' });
    }
  }
}
