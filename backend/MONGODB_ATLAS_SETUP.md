# 🔧 MongoDB Atlas Setup Guide

## Your Cluster ID
`68db7362cbc8a800fc676a9f`

## Steps to Get Your Full Connection String

1. **Go to MongoDB Atlas**: https://cloud.mongodb.com/

2. **Sign in** to your account

3. **Click "Connect"** on your cluster

4. **Choose "Connect your application"**

5. **Copy the connection string** - It should look like:
   ```
   mongodb+srv://<username>:<password>@cluster0.68db7362cbc8a800fc676a9f.mongodb.net/?retryWrites=true&w=majority
   ```

6. **Replace these values**:
   - `<username>` → Your database username
   - `<password>` → Your database password (URL encoded if it has special characters)

7. **Update `backend/.env`** file:
   ```
   MONGODB_URI=mongodb+srv://yourusername:yourpassword@cluster0.68db7362cbc8a800fc676a9f.mongodb.net/nextstep?retryWrites=true&w=majority
   ```

## Important Notes

- ✅ I've already created `backend/.env` with your cluster ID
- ⚠️ You need to replace `<username>` and `<password>` with your actual MongoDB credentials
- 🔒 Never commit the `.env` file to git (it's already in .gitignore)
- 📝 Database name is set to `nextstep` in the connection string

## Network Access

Make sure to **whitelist your IP** in MongoDB Atlas:
1. Go to **Network Access** in MongoDB Atlas
2. Click **Add IP Address**
3. Choose **Allow Access from Anywhere** (0.0.0.0/0) for development
   - Or add your specific IP address for better security

## Database User

Make sure you have a database user created:
1. Go to **Database Access** in MongoDB Atlas
2. Click **Add New Database User**
3. Set username and password
4. Give it **Read and Write** permissions

## Test Connection

After updating the `.env` file, test it:
```powershell
cd backend
npm run dev
```

You should see: `✅ MongoDB Connected Successfully`

## Troubleshooting

**Connection Error?**
- Check username/password are correct
- Verify IP is whitelisted in Network Access
- Make sure password doesn't have special characters (or URL encode them)
- Check if database user has proper permissions

**Special Characters in Password?**
Use URL encoding:
- `@` → `%40`
- `#` → `%23`
- `$` → `%24`
- etc.
