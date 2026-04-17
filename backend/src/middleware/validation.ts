import { NextFunction, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ errors: errors.array() });
    return;
  }
  next();
};

export const signupValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  validateRequest
];

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
  validateRequest
];

export const updateProfileValidation = [
  body('email').optional().isEmail().normalizeEmail(),
  body('name').optional().trim().notEmpty(),
  body('phone').optional(),
  body('location').optional(),
  body('institute').optional(),
  body('bio').optional(),
  body('portfolio').optional(),
  body('resume_objective').optional(),
  body('skills').optional(),
  body('languages').optional(),
  body('achievements').optional(),
  body('target_company').optional(),
  body('education').optional(),
  body('experience').optional(),
  body('links').optional(),
  body('yearOfStudy').optional(),
  body('profileCompletion').optional(),
  body('isProfileComplete').optional(),
  body('githubUsername').optional(),
  body('avatar').optional(),
  validateRequest
];
