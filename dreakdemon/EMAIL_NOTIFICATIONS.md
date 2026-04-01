# Email Notification System

## Overview
Email notifications have been added to SkillUpX to keep users informed about new activities across all features. The system uses Nodemailer with support for Gmail and other email services.

## Configuration

Add these environment variables to your `.env` file:

```env
# Email Configuration
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL (for email links)
FRONTEND_URL=https://skillupx.vercel.app
```

### Gmail Setup
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable 2-Step Verification
3. Go to App passwords
4. Create an App Password for "Mail"
5. Use this password as `EMAIL_PASS`

## Features Covered

### 1. Projects
- **New Project Created**: All users are notified when a new project is created
- **Member Added**: Project members notified when someone joins

### 2. Ideas
- **New Idea Submitted**: Admins are notified of new idea submissions
- **Idea Status Updated**: Submitter is notified when their idea is approved/rejected

### 3. Study Groups
- **New Study Group**: All users are notified when a new study group is created
- **Join Request Approved**: User is notified when their join request is approved

### 4. Marketplace
- **New Listing**: Admins are notified when a new listing is submitted (pending verification)
- **New Purchase**: Seller is notified of new sales
- **Purchase Confirmation**: Buyer receives confirmation email
- **New Review**: Seller is notified when someone reviews their listing

### 5. Battles
- **Battle Result**: Both winner and loser are notified of battle outcomes

### 6. Challenges
- **New Challenge**: All users are notified when a new challenge is added (admin only creates)

### 7. Messages
- **New Message**: Recipient is notified of new direct messages

### 8. Join Requests
- **New Join Request**: Project owner is notified when someone requests to join
- **Request Approved/Rejected**: Requester is notified of the decision

## Email Templates

All emails use a consistent branded template with:
- SkillUpX header with gradient design
- Clear action buttons
- Professional styling
- Mobile-responsive layout

## Technical Implementation

### Email Service (`backend/src/services/emailService.ts`)

The email service provides:
- `sendEmail(to, template)` - Send single email
- `sendBulkEmail(recipients, template)` - Send to multiple recipients
- `emailNotifications` - Object with all notification functions

### Usage Example

```typescript
import emailNotifications from '../services/emailService';

// Notify about new project
await emailNotifications.notifyNewProject(
  'My Project',
  'John Doe',
  ['user1@email.com', 'user2@email.com']
);
```

## Notes

- Emails are sent asynchronously (non-blocking) to avoid slowing down API responses
- If email configuration is missing, notifications are silently skipped
- Errors are logged but don't affect the main operation
- Bulk emails are sent sequentially to avoid rate limiting
