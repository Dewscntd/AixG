#!/bin/bash

# AixG Development Environment Setup Script
set -e

echo "🚀 Setting up AixG Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_requirements() {
    print_status "Checking requirements..."
    
    command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }
    command -v docker >/dev/null 2>&1 || { print_error "Docker is required but not installed. Aborting."; exit 1; }
    command -v docker-compose >/dev/null 2>&1 || { print_error "Docker Compose is required but not installed. Aborting."; exit 1; }
    
    print_success "All requirements satisfied"
}

# Install dependencies
install_dependencies() {
    print_status "Installing backend dependencies..."
    npm install --legacy-peer-deps
    
    print_status "Installing frontend dependencies..."
    cd frontend && npm install --legacy-peer-deps
    cd ..
    
    print_success "Dependencies installed"
}

# Setup environment files
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [ ! -f .env.development ]; then
        print_warning ".env.development not found, creating from template..."
        cp .env.development.example .env.development 2>/dev/null || true
    fi
    
    if [ ! -f .env.local ]; then
        print_status "Creating .env.local for local overrides..."
        cat > .env.local << EOF
# Local Development Overrides
# Add your local API keys and configurations here

# Example:
# OPENAI_API_KEY=your-local-openai-key
# PINECONE_API_KEY=your-local-pinecone-key
EOF
    fi
    
    print_success "Environment configuration ready"
}

# Start services
start_services() {
    print_status "Starting development services..."
    
    # Stop any existing services
    docker-compose -f docker-compose.development.yml down 2>/dev/null || true
    
    # Start services
    docker-compose -f docker-compose.development.yml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 15
    
    # Check if PostgreSQL is ready
    max_attempts=30
    attempt=0
    until docker-compose -f docker-compose.development.yml exec -T postgres pg_isready -U aixg_user -d aixg_development >/dev/null 2>&1; do
        attempt=$((attempt + 1))
        if [ $attempt -eq $max_attempts ]; then
            print_error "PostgreSQL failed to start after $max_attempts attempts"
            exit 1
        fi
        print_status "Waiting for PostgreSQL... ($attempt/$max_attempts)"
        sleep 2
    done
    
    print_success "Services started successfully"
}

# Setup database
setup_database() {
    print_status "Setting up database..."
    
    # Generate Prisma client
    npx prisma generate
    
    # Run database migrations
    npx prisma migrate dev --name init
    
    # Seed database (if seed script exists)
    if [ -f "prisma/seed.ts" ]; then
        print_status "Seeding database..."
        npx tsx prisma/seed.ts
    fi
    
    print_success "Database setup completed"
}

# Create development scripts
create_scripts() {
    print_status "Creating development scripts..."
    
    # Create start script
    cat > start-dev.sh << 'EOF'
#!/bin/bash
echo "🚀 Starting AixG Development Environment..."

# Start services
npm run dev:services

# Wait for services
sleep 5

# Start backend and frontend concurrently
concurrently \
  "npm run dev:backend" \
  "npm run dev:frontend" \
  --prefix "[{name}]" \
  --names "backend,frontend" \
  --prefix-colors "blue,green"
EOF

    chmod +x start-dev.sh
    
    print_success "Development scripts created"
}

# Print final instructions
print_instructions() {
    print_success "🎉 Development environment setup completed!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Update .env.local with your API keys"
    echo "  2. Run './start-dev.sh' to start the development environment"
    echo "  3. Backend will be available at: http://localhost:3001"
    echo "  4. Frontend will be available at: http://localhost:3000"
    echo "  5. API Documentation: http://localhost:3001/api/docs"
    echo ""
    echo "🔧 Useful commands:"
    echo "  npm run dev:services     - Start only the support services"
    echo "  npm run dev:backend      - Start only the backend"
    echo "  npm run dev:frontend     - Start only the frontend"
    echo "  npm run stop:services    - Stop all services"
    echo "  npm run logs:services    - View service logs"
    echo ""
    echo "🗄️  Database tools:"
    echo "  npx prisma studio        - Open Prisma Studio"
    echo "  npm run db:migrate       - Run database migrations"
    echo "  npm run db:seed          - Seed the database"
    echo ""
    echo "📊 Monitoring:"
    echo "  Grafana: http://localhost:3002 (admin/admin)"
    echo "  Kibana: http://localhost:5601"
    echo "  MinIO: http://localhost:9001"
    echo ""
}

# Main execution
main() {
    check_requirements
    install_dependencies
    setup_environment
    start_services
    setup_database
    create_scripts
    print_instructions
}

# Run main function
main "$@"