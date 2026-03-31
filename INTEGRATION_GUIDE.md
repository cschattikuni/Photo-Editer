# Photo Edit App - Frontend + Backend Integration Guide

## ✅ What's Integrated

Your React app now has complete database support:

### Features Added to UI:
1. **💚 Save Project** - Save current work to SQLite database
2. **💙 Load Project** - Load previously saved projects
3. **🔄 Backend Status** - Shows connection status in footer
4. **🗑️ Delete Project** - Remove saved projects

### Database Tables:
- **projects** - Stores photo edits, filters, and metadata
- **users** - User management (ready for authentication)
- **user_settings** - Custom preferences per user

---

## 🚀 Quick Start (Recommended)

### Start Everything Together:
```powershell
npm run dev:full
```

This will:
- ✅ Backend server starts on `http://localhost:5000`
- ✅ Frontend starts on `http://localhost:3000`
- ✅ Database automatically created: `photo-app.db`

Open browser: **http://localhost:3000/**

---

## 📝 How to Use

### 1️⃣ Upload Photo
- Click "Upload" or drag & drop an image

### 2️⃣ Edit (Background Removal, Cropping, etc.)
- Use all the editing features normally

### 3️⃣ Save Project (NEW!)
- Click **"💚 Save Project"**
- Enter a project name
- Click Save
- ✅ Project saved to database!

### 4️⃣ Load Project Anytime
- Click **"💙 Load (X)"** to see all saved projects
- Click **"Load"** to restore a project
- Click **"Delete"** to remove it permanently

---

## 🔌 Manual Start (Separate Terminals)

**Terminal 1: Backend**
```powershell
npm run server
```
Output: `Backend Server running on http://localhost:5000`

**Terminal 2: Frontend**
```powershell
npm run dev
```
Output: `Local: http://localhost:3000/`

---

## 💾 Database File

**Location:** `C:\Users\hvdpa\Pictures\photo-edit-app\photo-app.db`

- Automatically created on first run
- Persists between sessions
- Can be backed up or moved

**View with:** [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## 🌐 API Endpoints (Available while backend is running)

### Projects
```
GET    http://localhost:5000/api/projects              # Get all projects
GET    http://localhost:5000/api/projects/:id          # Get one project
POST   http://localhost:5000/api/projects              # Create project
PUT    http://localhost:5000/api/projects/:id          # Update project
DELETE http://localhost:5000/api/projects/:id          # Delete project
```

### Users
```
POST   http://localhost:5000/api/users                 # Create user
GET    http://localhost:5000/api/users/:userId/settings
PUT    http://localhost:5000/api/users/:userId/settings
```

### Health Check
```
GET    http://localhost:5000/api/health                # Check if backend is running
```

---

## 🧪 Test the Integration

1. **Start app:**
   ```powershell
   npm run dev:full
   ```

2. **Upload a photo:**
   - Open http://localhost:3000
   - Click Upload

3. **Edit it:**
   - Remove background
   - Adjust brightness/contrast

4. **Save project:**
   - Click "💚 Save Project"
   - Enter name (e.g., "My Edit")
   - Click Save
   - ✅ See success message

5. **Load it back:**
   - Refresh page
   - Upload a different photo
   - Click "💙 Load"
   - Select your saved project
   - ✅ Everything restored including edits!

6. **Check database:**
   - Stop server (`Ctrl+C`)
   - Open `photo-app.db` with DB Browser
   - Browse tables to verify data

---

## ⚙️ Environment Variables

**Create `.env.local` file:**
```
VITE_API_URL=http://localhost:5000
GEMINI_API_KEY=your_key_here
```

---

## 📦 Available Commands

```powershell
npm run dev:full   # Frontend + Backend (RECOMMENDED)
npm run dev        # Frontend only
npm run server     # Backend only  
npm run build      # Build for production
npm run lint       # Check for errors
npm run preview    # Preview production build
npm run clean      # Delete dist folder
```

---

## 🔄 Offline Mode

If backend is not running:
- ⚠️ "Offline Mode" shown in footer
- ✅ Photo editing still works
- ❌ Can't save/load projects
- Just start backend with `npm run server` to enable it

---

## 🎯 What's Next?

1. **Deploy Backend:**
   - Upload to Railway.app, Render.com, or Heroku
   - Update API URL in `.env.local`

2. **Add Authentication:**
   - Create user accounts
   - Only show user's own projects

3. **Image Storage:**
   - Save full-resolution images to cloud (AWS S3, etc.)
   - Keep metadata in database

4. **Deployment:**
   - Frontend → Vercel/Netlify
   - Backend → Railway/Render
   - Database → SQLite or PostgreSQL

---

## 🚀 You're All Set!

Run: `npm run dev:full`

Your full-stack photo editing app with database is ready to use! 🎉

Questions? Check `DATABASE_SETUP.md` for more details.
