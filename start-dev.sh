#!/bin/bash

# AixG Development Environment Startup Script
set -e

echo "🚀 Starting AixG Development Environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_warning "Docker is not running. Starting Docker Desktop..."
    open -a Docker
    
    print_status "Waiting for Docker to start..."
    max_attempts=30
    attempt=0
    
    until docker info > /dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Docker failed to start after $max_attempts attempts"
            exit 1
        fi
        print_status "Waiting for Docker... ($attempt/$max_attempts)"
        sleep 2
    done
fi

print_success "Docker is ready!"

# Start development services
print_status "Starting development services..."
npm run dev:services

# Wait for services to be ready
print_status "Waiting for services to be ready..."
sleep 10

# Check if database is ready
print_status "Checking database connectivity..."
max_attempts=20
attempt=0

until docker-compose -f docker-compose.development.yml exec -T postgres pg_isready -U aixg_user -d aixg_development >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    if [ $attempt -eq $max_attempts ]; then
        print_warning "Database not ready after $max_attempts attempts, but continuing..."
        break
    fi
    print_status "Waiting for PostgreSQL... ($attempt/$max_attempts)"
    sleep 2
done

# Generate Prisma client and run migrations
print_status "Setting up database..."
npx prisma generate || print_warning "Prisma generate failed"
npx prisma migrate dev --name init || print_warning "Migration failed"

# Seed database if seed file exists
if [ -f "prisma/seed.ts" ]; then
    print_status "Seeding database..."
    npm run db:seed || print_warning "Database seeding failed"
fi

print_success "🎉 Development environment is ready!"
echo ""
echo "📋 Available services:"
echo "  • Backend API: http://localhost:3001"
echo "  • Frontend: http://localhost:3000"
echo "  • API Docs: http://localhost:3001/api/docs"
echo "  • Grafana: http://localhost:3002 (admin/admin)"
echo "  • Kibana: http://localhost:5601"
echo "  • Prisma Studio: npm run db:studio"
echo ""
echo "🚀 To start development:"
echo "  npm run dev:all          # Start everything"
echo "  npm run dev:backend      # Backend only"
echo "  npm run dev:frontend     # Frontend only"
echo ""
echo "📚 See DEVELOPMENT_GUIDE.md for more information"