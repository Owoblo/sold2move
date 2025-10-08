# Sold2Move - Moving Leads Platform

A comprehensive platform for finding and converting moving leads with advanced filtering, credit-based reveals, and seamless authentication.

## 🚀 Features

- **Google OAuth & Email/Password Authentication**
- **Advanced Property Search & Filtering**
- **Credit-Based Property Reveals**
- **Bulk Operations & Export**
- **Real-time Dashboard Analytics**
- **Stripe Payment Integration**
- **Responsive Design**

## 🛠️ Tech Stack

- **Frontend**: React, Vite, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Payments**: Stripe
- **Deployment**: Vercel

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── dashboard/      # Dashboard-specific components
│   ├── ui/            # Base UI components
│   └── onboarding/    # Onboarding flow components
├── pages/             # Page components
├── hooks/             # Custom React hooks
├── contexts/          # React contexts
├── lib/               # Utility libraries
└── utils/             # Helper functions

edge-functions/        # Supabase Edge Functions
scripts/               # Database management scripts
```

## 🔧 Development

### Prerequisites
- Node.js 18+
- Supabase CLI
- Stripe CLI (for payments)

### Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Start development server: `npm run dev`

### Environment Variables
```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SITE_URL=http://localhost:5173
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
DB_PASSWORD=your_db_password
```

## 🗄️ Database Management

The project includes scripts for database management:

```bash
# Execute SQL queries
node scripts/sql-executor.js query "SELECT * FROM profiles"

# Execute SQL files
node scripts/sql-executor.js sql your-script.sql

# Manage auth users
node scripts/supabase-manager.js status
```

## 🚀 Deployment

### Vercel Deployment
1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Edge Functions
```bash
# Deploy edge functions
npm run deploy:functions
```

## 📊 Key Features

### Authentication
- Google OAuth integration
- Email/password signup
- Automatic profile creation
- Welcome flow for new users

### Dashboard
- Advanced property filtering
- Credit-based reveals
- Bulk operations
- Export functionality
- Real-time analytics

### Payments
- Stripe integration
- Credit top-ups
- Subscription management

## 🔒 Security

- Row Level Security (RLS) enabled
- Secure API endpoints
- Input validation with Zod
- Error boundaries and monitoring

## 📈 Performance

- Optimized database queries
- Lazy loading components
- Efficient state management
- Performance monitoring

## 🧪 Testing

```bash
# Run tests
npm test

# Run linting
npm run lint
```

## 📝 License

Private - All rights reserved
