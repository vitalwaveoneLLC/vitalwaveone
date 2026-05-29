#!/bin/bash
# Quick Start Script for RouteFlow 7 Fixes Integration
# Run this script from inside the routeflow folder

echo "🚀 RouteFlow 7 Fixes Quick Start"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ ERROR: package.json not found!"
  echo "Please run this script from inside the routeflow folder"
  echo ""
  echo "Navigate to routeflow folder:"
  echo "  cd C:\\Users\\alsha\\routeflow"
  echo ""
  exit 1
fi

echo "✅ Found package.json - you're in the right directory!"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
echo "Running: npm install"
npm install
if [ $? -ne 0 ]; then
  echo "❌ npm install failed"
  exit 1
fi
echo "✅ Dependencies installed!"
echo ""

# Step 2: Environment setup
echo "⚙️  Step 2: Setting up environment..."
if [ ! -f ".env.local" ]; then
  echo "Creating .env.local from template..."
  cp .env.example .env.local
  echo "✅ Created .env.local"
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.local and add:"
  echo "  UPSTASH_REDIS_REST_URL=https://..."
  echo "  UPSTASH_REDIS_REST_TOKEN=eyJ..."
  echo ""
  echo "Get these from: https://console.upstash.com"
  read -p "Press Enter when you've updated .env.local..."
else
  echo "✅ .env.local already exists"
fi
echo ""

# Step 3: Database migrations
echo "🗄️  Step 3: Applying database migrations..."
echo "Make sure you have psql installed and access to your database!"
echo ""

read -p "Have you installed psql? (yes/no): " psql_check
if [ "$psql_check" = "yes" ]; then
  echo "Running migration 1: Sessions table..."
  psql -h neon.tech -U postgres -d routeflow < migrations/0001_add_sessions_table.sql
  echo "✅ Migration 1 complete!"
  echo ""

  echo "Running migration 2: Performance indexes..."
  psql -h neon.tech -U postgres -d routeflow < migrations/0002_add_performance_indexes.sql
  echo "✅ Migration 2 complete!"
  echo ""
else
  echo "⚠️  Skipping migrations. You can run them manually later:"
  echo "  psql < migrations/0001_add_sessions_table.sql"
  echo "  psql < migrations/0002_add_performance_indexes.sql"
  echo ""
fi

# Step 4: Run tests
echo "🧪 Step 4: Running unit tests..."
echo "Running: npm test"
npm test -- --passWithNoTests
echo ""

# Step 5: Build and check bundle size
echo "📦 Step 5: Building and checking bundle size..."
echo "Running: npm run build"
npm run build
echo ""
echo "✅ Build complete! Check dist/ folder for bundle sizes"
echo ""

# Step 6: Optional - Run E2E tests
read -p "Run E2E tests? (yes/no): " run_e2e
if [ "$run_e2e" = "yes" ]; then
  echo "🎭 Running E2E tests..."
  npm run test:e2e
else
  echo "⏭️  Skipped E2E tests. Run later with: npm run test:e2e"
fi
echo ""

# Summary
echo "=================================="
echo "✅ QUICK START COMPLETE!"
echo "=================================="
echo ""
echo "📋 Next steps:"
echo "  1. Update API endpoints with new middleware (see IMPLEMENTATION_GUIDE.md)"
echo "  2. Update React components to use useSession hook"
echo "  3. Add form validation to components"
echo "  4. Replace N+1 queries with optimized queries"
echo "  5. Deploy to staging and test"
echo ""
echo "📖 Full integration guide: IMPLEMENTATION_GUIDE.md"
echo "📊 Delivery summary: 7FIXES_DELIVERY_SUMMARY.md"
echo ""
echo "🚀 Start development: npm run dev"
echo ""
