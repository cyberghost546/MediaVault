# MediaVault

A cross-platform media downloader for Windows, macOS, Linux, Android, and iOS.

---

## What This App Does

MediaVault lets users paste a public URL from Facebook, X (Twitter), Instagram,
TikTok, or Snapchat and download photos, videos, and reels they are permitted to access.

---

## Technology Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | Next.js 14, TypeScript, Tailwind CSS    |
| Mobile     | Capacitor (wraps the Next.js web app)   |
| Backend    | PHP 8.2 REST API                        |
| Processing | Python 3.11 + yt-dlp                   |
| Database   | MySQL 8                                 |
| DevOps     | Docker + Docker Compose                 |

---

## How the App is Structured

```
User opens the app
       │
       ▼
  Next.js Frontend  ─── HTTP requests ───►  PHP Backend API
       │                                          │
       │                               calls Python script
       │                                          │
       │                               yt-dlp downloads the file
       │                                          │
       ◄───────── JSON response ─────────────────
       │
  Shows progress bar / downloaded media
       │
       ▼
  Files saved to user's chosen folder
```

---

## Prerequisites (Software You Must Install First)

Before you can run this project you need:

1. **Node.js 20+** — runs the frontend
   Download: https://nodejs.org

2. **PHP 8.2+** — runs the backend API
   Download: https://www.php.net/downloads

3. **Composer** — installs PHP packages
   Download: https://getcomposer.org

4. **Python 3.11+** — downloads media files
   Download: https://www.python.org

5. **MySQL 8** — stores download history
   Download: https://dev.mysql.com/downloads/mysql

6. **Docker (optional but recommended)** — runs everything with one command
   Download: https://www.docker.com

---

## Quick Start with Docker (Recommended for Beginners)

Docker runs the entire app inside isolated containers so you do not need to
install PHP, MySQL, or Python manually.

```bash
# 1. Clone the repo
git clone https://github.com/your-name/MediaVault.git
cd MediaVault

# 2. Start everything (this takes ~2 minutes the first time)
docker-compose -f docker/docker-compose.yml up --build

# 3. Open your browser
#    Frontend: http://localhost:3000
#    Backend API: http://localhost:8000
```

---

## Manual Setup (Without Docker)

### Step 1 — Frontend

```bash
cd frontend
npm install          # Downloads all JavaScript packages listed in package.json
npm run dev          # Starts Next.js on http://localhost:3000
```

### Step 2 — Backend (PHP)

```bash
cd backend
composer install     # Downloads all PHP packages listed in composer.json
php -S localhost:8000 public/index.php   # Starts the PHP dev server
```

### Step 3 — Python Service

```bash
cd backend/python
pip install -r requirements.txt   # Installs yt-dlp and other Python packages
```

### Step 4 — Database

```bash
# Log in to MySQL
mysql -u root -p

# Create the database
CREATE DATABASE mediavault;
USE mediavault;

# Run the migration files in order
source database/migrations/001_create_downloads_table.sql;
source database/migrations/002_create_media_table.sql;
source database/migrations/003_create_profiles_table.sql;
```

---

## Mobile Setup (Android / iOS)

Capacitor packages the Next.js web app into a native mobile app.

```bash
cd frontend

# Build the Next.js app into static files
npm run build

# Copy the built files into the Capacitor Android project
npx cap sync android

# Open Android Studio (must be installed separately)
npx cap open android

# Copy the built files into the Capacitor iOS project (Mac only)
npx cap sync ios
npx cap open ios   # Opens Xcode
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp frontend/.env.example frontend/.env.local
cp backend/config/database.example.php backend/config/database.php
```

---

## Debugging Common Errors

| Error Message                        | Cause                          | Fix                                      |
|--------------------------------------|--------------------------------|------------------------------------------|
| `npm install` fails                  | Wrong Node.js version          | Install Node.js 20+                      |
| `CORS error` in browser              | PHP not sending CORS headers   | Check CorsMiddleware.php                 |
| `Connection refused` (MySQL)         | MySQL not running              | Start MySQL service                      |
| `yt-dlp not found`                   | Python deps not installed      | Run `pip install -r requirements.txt`    |
| `Port 3000 already in use`           | Another process using port     | Kill it: `npx kill-port 3000`            |
| Android build fails                  | Capacitor not synced           | Run `npx cap sync android` again         |
