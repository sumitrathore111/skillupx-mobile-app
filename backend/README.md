# NextStep Custom Backend

## Overview
This is a custom Node.js/Express backend with MongoDB database that replaces Firebase for the NextStep application.

## Features
✅ **Custom Authentication** - JWT-based auth with bcrypt password hashing
✅ **MongoDB Database** - Flexible NoSQL database
✅ **REST API** - All features exposed via RESTful endpoints
✅ **Code Arena** - Battle system with code execution
✅ **Marketplace** - Buy/sell project listings
✅ **Study Groups** - Collaborative learning groups
✅ **Messaging** - Direct and group messaging

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Backend Setup

1. **Navigate to backend folder**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Create environment file**
```bash
cp .env.example .env
```

4. **Configure your .env file**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/nextstep
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
```

5. **Start MongoDB** (if running locally)
```bash
# On Windows
mongod

# On Mac/Linux
sudo systemctl start mongod
```

6. **Run the backend**
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm run build
npm start
```

The backend will be running on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend folder** (root directory)
```bash
cd ..
```

2. **Create/Update .env file**
```bash
VITE_API_BASE_URL=http://localhost:5000/api
```

3. **Install dependencies** (if not already done)
```bash
npm install
```

4. **Run the frontend**
```bash
npm run dev
```

The frontend will be running on `http://localhost:5173`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `POST /api/auth/reset-password-request` - Request password reset

### Users
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user profile
- `GET /api/users` - Search users

### Battles
- `POST /api/battles/create` - Create battle
- `GET /api/battles/find` - Find available battle
- `POST /api/battles/:id/join` - Join battle
- `POST /api/battles/:id/submit` - Submit code
- `GET /api/battles/:id` - Get battle details
- `GET /api/battles/user/my-battles` - Get user's battles

### Marketplace
- `GET /api/marketplace` - Get all listings
- `POST /api/marketplace` - Create listing
- `GET /api/marketplace/:id` - Get listing details
- `PUT /api/marketplace/:id` - Update listing
- `DELETE /api/marketplace/:id` - Delete listing
- `POST /api/marketplace/:id/like` - Like/unlike listing
- `GET /api/marketplace/user/my-listings` - Get user's listings

### Study Groups
- `GET /api/study-groups` - Get all groups
- `POST /api/study-groups` - Create group
- `GET /api/study-groups/:id` - Get group details
- `POST /api/study-groups/:id/join` - Join group
- `POST /api/study-groups/:id/leave` - Leave group
- `POST /api/study-groups/:id/resources` - Add resource

### Messages
- `POST /api/messages` - Send message
- `GET /api/messages/conversation/:userId` - Get conversation
- `GET /api/messages/group/:groupId` - Get group messages
- `GET /api/messages/conversations` - Get conversations list

## Database Schema

### User Model
```typescript
{
  email: string;
  password: string (hashed);
  name: string;
  phone: string;
  location: string;
  institute: string;
  bio: string;
  skills: string[];
  education: Education[];
  experience: Experience[];
  // ... more fields
}
```

### Battle Model
```typescript
{
  status: 'waiting' | 'active' | 'completed';
  difficulty: 'easy' | 'medium' | 'hard';
  entryFee: number;
  prize: number;
  participants: Participant[];
  challenge: Challenge;
  winner?: string;
}
```

## Migration from Firebase

### Changes Made:
1. ✅ Removed all Firebase imports
2. ✅ Created custom authentication with JWT
3. ✅ Replaced Firestore with MongoDB
4. ✅ Updated all service files to use REST API
5. ✅ Kept the same function signatures for compatibility

### Service Files Updated:
- `src/service/auth.ts` - Authentication methods
- `src/service/users.ts` - User profile methods
- New service files created with "New" suffix for other features

### To Complete Migration:
1. Replace old service imports with new ones in your components
2. Update AuthContext to use new auth service
3. Test all features thoroughly
4. Remove old Firebase config when ready

## Production Deployment

### MongoDB Atlas (Recommended)
1. Create account at https://www.mongodb.com/atlas
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in .env

### Backend Hosting Options
- Heroku
- Railway
- Render
- AWS EC2
- DigitalOcean

### Environment Variables
Make sure to set all environment variables in your hosting platform.

## Security Notes
⚠️ **IMPORTANT:**
- Change `JWT_SECRET` to a strong random string in production
- Enable HTTPS in production
- Use environment variables for all secrets
- Set proper CORS origins
- Implement rate limiting for API endpoints

## Troubleshooting

### MongoDB Connection Error
- Make sure MongoDB is running
- Check connection string in .env
- Ensure network access in MongoDB Atlas

### Authentication Issues
- Check if JWT_SECRET is set
- Verify token is being sent in Authorization header
- Check token expiration

### CORS Errors
- Verify FRONTEND_URL matches your frontend URL
- Check CORS configuration in server.ts

## Support
For issues or questions, check the code comments or create an issue in the repository.
