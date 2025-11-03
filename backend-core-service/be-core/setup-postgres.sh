#!/bin/bash

# Setup PostgreSQL for Naver Hackathon 2025
# This script will install and configure PostgreSQL on macOS

echo "🚀 Setting up PostgreSQL for Naver Hackathon 2025..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL via Homebrew..."
    brew install postgresql@16
else
    echo "✅ PostgreSQL already installed"
fi

# Start PostgreSQL service
echo "🔄 Starting PostgreSQL service..."
brew services start postgresql@16

# Wait for service to start
sleep 3

# Create database if not exists
echo "💾 Creating database 'naver_hackathon'..."
psql postgres -c "SELECT 1 FROM pg_database WHERE datname = 'naver_hackathon'" | grep -q 1 || createdb naver_hackathon

echo ""
echo "✅ PostgreSQL setup complete!"
echo ""
echo "📝 Database Connection Info:"
echo "   Host: localhost"
echo "   Port: 5432"
echo "   Database: naver_hackathon"
echo "   User: postgres"
echo "   Password: (empty)"
echo ""
echo "🔧 To use PostgreSQL, uncomment the PostgreSQL config in application.properties"
echo "   Or run with profile: mvn spring-boot:run -Dspring-boot.run.profiles=postgres"
echo ""
echo "🛠️  Useful commands:"
echo "   - Connect to DB: psql naver_hackathon"
echo "   - List databases: psql -l"
echo "   - Stop PostgreSQL: brew services stop postgresql@16"
echo "   - Restart PostgreSQL: brew services restart postgresql@16"
echo ""
