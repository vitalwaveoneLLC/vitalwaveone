@echo off
REM Quick Start Script for RouteFlow 7 Fixes Integration (Windows)
REM Run this from inside the routeflow folder

echo.
echo ========================================
echo 🚀 RouteFlow 7 Fixes Quick Start (Windows)
echo ========================================
echo.

REM Check if we're in the right directory
if not exist "package.json" (
  echo.
  echo ❌ ERROR: package.json not found!
  echo Please run this script from inside the routeflow folder
  echo.
  echo Navigate to routeflow folder:
  echo   cd C:\Users\alsha\routeflow
  echo.
  pause
  exit /b 1
)

echo ✅ Found package.json - you're in the right directory!
echo.

REM Step 1: Install dependencies
echo 📦 Step 1: Installing dependencies...
echo Running: npm install
call npm install
if %errorlevel% neq 0 (
  echo ❌ npm install failed
  pause
  exit /b 1
)
echo ✅ Dependencies installed!
echo.

REM Step 2: Environment setup
echo ⚙️  Step 2: Setting up environment...
if not exist ".env.local" (
  echo Creating .env.local from template...
  copy .env.example .env.local
  echo ✅ Created .env.local
  echo.
  echo ⚠️  IMPORTANT: Edit .env.local and add:
  echo    UPSTASH_REDIS_REST_URL=https://...
  echo    UPSTASH_REDIS_REST_TOKEN=eyJ...
  echo.
  echo Get these from: https://console.upstash.com
  echo.
  pause
) else (
  echo ✅ .env.local already exists
)
echo.

REM Step 3: Database migrations
echo 🗄️  Step 3: Applying database migrations...
echo Make sure you have psql installed and access to your database!
echo.
echo To apply migrations manually, run:
echo   psql -h neon.tech -U postgres -d routeflow ^< migrations/0001_add_sessions_table.sql
echo   psql -h neon.tech -U postgres -d routeflow ^< migrations/0002_add_performance_indexes.sql
echo.
pause

REM Step 4: Run tests
echo 🧪 Step 4: Running unit tests...
echo Running: npm test
call npm test -- --passWithNoTests
echo.

REM Step 5: Build and check bundle size
echo 📦 Step 5: Building and checking bundle size...
echo Running: npm run build
call npm run build
if %errorlevel% equ 0 (
  echo ✅ Build complete! Check dist\ folder for bundle sizes
) else (
  echo ⚠️  Build had errors - check output above
)
echo.

REM Summary
echo.
echo ========================================
echo ✅ QUICK START COMPLETE!
echo ========================================
echo.
echo 📋 Next steps:
echo   1. Update API endpoints with new middleware (see IMPLEMENTATION_GUIDE.md)
echo   2. Update React components to use useSession hook
echo   3. Add form validation to components
echo   4. Replace N+1 queries with optimized queries
echo   5. Deploy to staging and test
echo.
echo 📖 Full integration guide: IMPLEMENTATION_GUIDE.md
echo 📊 Delivery summary: 7FIXES_DELIVERY_SUMMARY.md
echo.
echo 🚀 Start development: npm run dev
echo.
pause
