import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    _id: string;
    email: string;
    name: string;
    role: string;
  };
  params: any;
  query: any;
  body: any;
  headers: any;
  cookies: any;
}

export const generateToken = (userId: string, email: string, name: string, role: string): string => {
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(
    { id: userId, email, name, role },
    secret,
    { expiresIn: expiresIn as jwt.SignOptions['expiresIn'] }
  );
};

export const verifyToken = (token: string): any => {
  const secret = process.env.JWT_SECRET || 'default_secret_key';
  return jwt.verify(token, secret);
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = verifyToken(token);
    req.user = { ...decoded, _id: decoded.id };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
};

// Alias for authenticate middleware
export const auth = authenticate;

// Optional auth - doesn't require authentication but adds user info if token present
export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;

    if (token) {
      try {
        const decoded = verifyToken(token);
        req.user = { ...decoded, _id: decoded.id };
      } catch {
        // Token invalid but we continue without user
      }
    }
    next();
  } catch (error) {
    next();
  }
};
