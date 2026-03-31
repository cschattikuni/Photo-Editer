# Photo Edit App - SQLite + Express Backend Setup

## ✅ What's Been Set Up

### Backend (Express + SQLite)
- **Framework:** Express.js
- **Database:** SQLite (local file-based)
- **Port:** 5000
- **Database File:** `photo-app.db` (created automatically)

### Database Tables
1. **projects** - Store edited photos and projects
   - id, name, description, originalImage, processedImage, filters, timestamps

2. **users** - User accounts
   - id, username, email, timestamps

3. **user_settings** - User preferences
   - id, user_id, setting_key, setting_value

### API Endpoints

#### Projects
- `GET /api/projects` - Get all projects
- `GET /api/projects/:id` - Get single project
- `POST /api/projects` - Create new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

#### Users
- `POST /api/users` - Create user
- `GET /api/users/:userId/settings` - Get user settings
- `PUT /api/users/:userId/settings` - Update user settings

#### Health Check
- `GET /api/health` - Check if backend is running

---

## 🚀 How to Run

### Option 1: Run Backend + Frontend Together (Recommended)
```powershell
npm run dev:full
```
This starts:
- ✅ Frontend on http://localhost:3000/
- ✅ Backend on http://localhost:5000/

### Option 2: Run Separately (in different terminals)

**Terminal 1 - Backend:**
```powershell
npm run server
```
Output: `Backend Server running on http://localhost:5000`

**Terminal 2 - Frontend:**
```powershell
npm run dev
```
Output: `Local: http://localhost:3000/`

### Option 3: Frontend Only (no database)
```powershell
npm run dev
```

---

## 📝 Using the API in React

### Import the API service
```typescript
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
  checkBackendHealth,
} from './lib/api';
```

### Example: Save a photo project
```typescript
const saveProject = async () => {
  const project = {
    name: 'My Edited Photo',
    description: 'Background removed',
    originalImage: originalImageData,
    processedImage: editedImageData,
    filters: {
      brightness: 100,
      contrast: 100,
    }
  };

  const saved = await createProject(project);
  if (saved) {
    console.log('Project saved:', saved.id);
  }
};
```

### Example: Load saved projects
```typescript
const loadProjects = async () => {
  const projects = await getProjects();
  console.log('Saved projects:', projects);
};
```

### Example: Check backend connection
```typescript
const isBackendReady = await checkBackendHealth();
if (!isBackendReady) {
  console.warn('Backend not available - using offline mode');
}
```

---

## 🗄️ Database File Location
- **Windows:** `C:\Users\hvdpa\Pictures\photo-edit-app\photo-app.db`
- **View database:** Use [DB Browser for SQLite](https://sqlitebrowser.org/)

---

## 📦 Dependencies Added
- `better-sqlite3` - SQLite database
- `cors` - Enable cross-origin requests
- `concurrently` - Run multiple npm scripts simultaneously

---

## 🔧 Available Commands
```powershell
npm run dev        # Frontend only
npm run server     # Backend only
npm run dev:full   # Frontend + Backend together
npm run build      # Build for production
npm run lint       # Check TypeScript errors
```

---

## ⚠️ Note
- Backend is required to save/load projects
- Without backend, app works offline (no database)
- Make sure `localhost:5000` is available
- Backend automatically creates `photo-app.db` on first run

---

## 🎯 Next Steps

1. **Start the full stack:**
   ```
   npm run dev:full
   ```

2. **Open browser:**
   - Frontend: http://localhost:3000/
   - Backend API: http://localhost:5000/api/health

3. **Test API:**
   - Create a project → save to database
   - Refresh page → project still there!

Enjoy! 🎉
