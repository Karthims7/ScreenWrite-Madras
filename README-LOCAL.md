# Local SQLite Database Setup

This guide will help you set up the local SQLite database for your screenplay writing app.

## 🚀 Quick Setup

### 1. Install Dependencies

The required dependencies are already installed in `package.json`. If you need to reinstall:

```bash
npm install
```

### 2. Start the Application

The app is configured to run both the backend server and frontend simultaneously:

```bash
npm run dev
```

This will start:
- **Backend API Server**: http://localhost:3001 (SQLite database)
- **Frontend App**: http://localhost:5173 (React/Vite)

## 📊 Database Schema

The app uses a local SQLite database with the following structure:

```sql
CREATE TABLE screenplays (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- JSON string
  title_page TEXT NOT NULL, -- JSON string
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

- **id**: Unique identifier for each screenplay
- **title**: The screenplay title
- **content**: JSON array containing the screenplay content (scenes, dialogue, etc.)
- **title_page**: JSON object with title page information
- **created_at/updated_at**: Timestamps for tracking changes

## 🗄️ Database Location

The SQLite database file is automatically created at:
```
screenwriting-app/data/screenplays.db
```

## 🔄 How It Works

1. **Automatic Setup**: The database and tables are created automatically when the server starts
2. **Sample Data**: A sample screenplay is created if the database is empty
3. **Data Persistence**: Your screenplays are saved locally and persist between sessions
4. **Backup**: localStorage is used as a backup if the database is unavailable

## 🛠️ API Endpoints

The backend provides a REST API at `http://localhost:3001/api`:

- `GET /api/screenplays` - Get all screenplays
- `GET /api/screenplays/:id` - Get a specific screenplay
- `POST /api/screenplays` - Create a new screenplay
- `PUT /api/screenplays/:id` - Update a screenplay
- `DELETE /api/screenplays/:id` - Delete a screenplay
- `GET /api/health` - Health check

## 🔧 Development Scripts

- `npm run dev` - Start both frontend and backend
- `npm run dev:frontend` - Start only the frontend (Vite)
- `npm run dev:backend` - Start only the backend (Express + SQLite)
- `npm run build` - Build the frontend for production
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

**Backend won't start:**
- Make sure port 3001 is available
- Check if better-sqlite3 is properly installed (may need Python for compilation)

**Database errors:**
- Check that the `data/` directory exists and is writable
- The database file will be created automatically

**Frontend can't connect to backend:**
- Ensure the backend is running on port 3001
- Check browser console for network errors

## 🔒 Security

- The database is local to your machine
- No external connections or cloud services required
- Data stays on your computer

## 📚 Technologies Used

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: React, TypeScript, Vite
- **Database**: SQLite with better-sqlite3 for performance
- **Styling**: CSS with professional screenplay formatting

## 🚀 Features

- **Local Database**: No internet connection required
- **Fast Performance**: SQLite with optimized queries
- **Type Safety**: Full TypeScript support
- **Auto-Backup**: localStorage fallback
- **Sample Content**: Pre-loaded sample screenplay

Your screenplay writing app is now running with a fully local database! 🎬
