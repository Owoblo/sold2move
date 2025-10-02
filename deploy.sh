#!/bin/bash

# 🚀 Sold2Move Deployment Script for Vercel
# This script builds the production version and prepares for Vercel deployment

set -e  # Exit on any error

echo "🚀 Starting Sold2Move deployment process..."
echo "================================================"

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

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Step 1: Install dependencies
print_status "Installing dependencies..."
if npm install; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Step 2: Check for environment file
if [ ! -f ".env.production" ]; then
    print_warning ".env.production not found. Creating from example..."
    if [ -f "env.production.example" ]; then
        cp env.production.example .env.production
        print_warning "Please update .env.production with your production values before deploying!"
    else
        print_error "No environment file found. Please create .env.production"
        exit 1
    fi
fi

# Step 3: Build for production
print_status "Building for production..."
if NODE_ENV=production npm run build; then
    print_success "Production build completed successfully"
else
    print_error "Production build failed"
    exit 1
fi

# Step 4: Verify build output
if [ -d "dist" ]; then
    print_success "Build output directory 'dist' created"
    print_status "Build contents:"
    ls -la dist/
else
    print_error "Build output directory 'dist' not found"
    exit 1
fi

# Step 5: Verify vercel.json file
if [ -f "vercel.json" ]; then
    print_success "vercel.json file found - SPA routing will work correctly"
else
    print_error "vercel.json file not found. This is required for proper SPA routing on Vercel!"
    exit 1
fi

# Step 6: Create deployment package
print_status "Creating deployment package..."
if [ -d "deployment-package" ]; then
    rm -rf deployment-package
fi

mkdir deployment-package
cp -r dist/* deployment-package/
print_success "Deployment package created in 'deployment-package' directory"

# Step 7: Display deployment instructions
echo ""
echo "================================================"
print_success "🎉 Deployment preparation complete!"
echo "================================================"
echo ""
print_status "Next steps:"
echo "1. 🚀 Deploy to Vercel using one of these methods:"
echo "   - Vercel CLI: vercel --prod"
echo "   - Git push: git add . && git commit -m 'Deploy fixes' && git push"
echo "   - Vercel Dashboard: Connect your repo and deploy"
echo "2. 🌐 Verify your domain is connected in Vercel dashboard"
echo "3. 🔧 Check environment variables in Vercel project settings"
echo "4. 🧪 Test your website thoroughly"
echo ""
print_status "Key files for deployment:"
echo "- vercel.json (SPA routing configuration)"
echo "- Environment variables in Vercel dashboard"
echo "- All source files in src/ directory"
echo ""
print_warning "Remember to:"
echo "- Set VITE_SITE_URL=https://sold2move.com in Vercel environment variables"
echo "- Test all routes after deployment"
echo "- Verify Google OAuth is working"
echo ""
print_success "Happy deploying! 🚀"
