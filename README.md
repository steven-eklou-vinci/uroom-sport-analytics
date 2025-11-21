# 🏆 Uroom Sports Analytics

**Complete platform for sports talent analysis and management**

A modern end-to-end solution for discovering, evaluating, and tracking young sports talents, designed for clubs, scouts, agents, and players.

## 📋 Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Technical Architecture](#technical-architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API](#api)
- [Contributing](#contributing)

## 🎯 Overview

Uroom Sports Analytics is a SaaS platform that revolutionizes the sports recruitment process by offering:

- 🔍 **Advanced player search** with multi-criteria filters
- 📊 **Detailed assessments** with visual metrics (radar charts)
- 🤖 **AI predictions** on player skill evolution
- 👥 **Scout collaboration** with badge system
- 📝 **Professional reports** exportable to PDF
- 🎯 **Trials and shortlist management**
- 📈 **Role-based personalized dashboards**

## ✨ Key Features

### For Clubs
- Scout team management
- Overview of submitted reports
- Tracking of identified players
- Trial organization
- Statistics and analytics

### For Scouts
- Personal dashboard with recent activity
- Player search and tracking
- Collaborative badges (see which colleagues follow a player)
- Detailed report creation
- List of followed players

### For Players
- Professional public profile
- Assessment visualization (radar charts)
- 5-year evolution predictions
- Performance history
- Game video management

### For Agents
- Player portfolio
- Opportunity tracking
- Communication with clubs

## 🛠 Technical Architecture

### Frontend (`urroom-sports-analytics/`)
- **Framework**: Next.js 15.5.3 (App Router)
- **Authentication**: NextAuth.js with JWT
- **UI**: React 19, TypeScript, CSS Modules
- **Visualization**: Recharts for radar charts
- **Database**: Prisma ORM + PostgreSQL

### Backend (`urroom-api/`)
- **Runtime**: Node.js + Express.js
- **Database**: Prisma ORM + PostgreSQL
- **Authentication**: bcryptjs
- **Data Import**: CSV support
- **RESTful API**: Complete endpoints for all entities

### Database
- **ORM**: Prisma 6.16.1
- **DB**: PostgreSQL
- **Models**:
  - Users (5 roles: ADMIN, CLUB, SCOUT, AGENT, PLAYER)
  - Players
  - Assessments (with metrics: Speed, Dribbling, Shooting, Passing, Defense, Physical, Control, Vision)
  - PlayerFollow (scout tracking system)
  - Reports
  - Trials
  - Shortlists

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL
- Git

### Steps

1. **Clone the repository**
```bash
git clone https://github.com/steven-eklou-vinci/uroom-sport-analytics.git
cd uroom-sport-analytics
```

2. **Install backend dependencies**
```bash
cd urroom-api
npm install
```

3. **Install frontend dependencies**
```bash
cd ../urroom-sports-analytics
npm install
```

4. **Configure databases** (see Configuration section)

5. **Run Prisma migrations**
```bash
# Backend
cd urroom-api
npx prisma migrate dev
npx prisma generate

# Frontend
cd ../urroom-sports-analytics
npx prisma generate
```

6. **Seed the database** (optional - test data)
```bash
cd urroom-api
npx ts-node prisma/seed.ts
```

## ⚙️ Configuration

### Environment Variables

#### Backend (`urroom-api/.env`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/uroom_analytics"
PORT=4000
JWT_SECRET="your-secret-key-here"
```

#### Frontend (`urroom-sports-analytics/.env.local`)
```env
DATABASE_URL="postgresql://user:password@localhost:5432/uroom_analytics"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-here"
API_URL="http://localhost:4000"
```

### Generating secrets
```bash
# For JWT_SECRET and NEXTAUTH_SECRET
openssl rand -base64 32
```

## 📱 Usage

### Starting in development mode

**Terminal 1 - Backend:**
```bash
cd urroom-api
npm run dev
```
Backend will be accessible at `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd urroom-sports-analytics
npm run dev
```
Frontend will be accessible at `http://localhost:3000`

### Test accounts (after seeding)

**Scout 1:**
- Email: `scout1@parisfc.com`
- Password: `scout123`

**Scout 2:**
- Email: `scout2@parisfc.com`
- Password: `scout123`

**Club:**
- Email: `club@parisfc.com`
- Password: `club123`

## 📂 Project Structure

```
uroom-sport-analytics/
├── urroom-api/                    # Express Backend
│   ├── prisma/
│   │   ├── schema.prisma         # Database schema
│   │   ├── seed.ts               # Test data
│   │   └── migrations/           # Migration history
│   ├── src/
│   │   ├── index.js              # Entry point
│   │   └── routes/               # API routes
│   └── package.json
│
└── urroom-sports-analytics/       # Next.js Frontend
    ├── prisma/
    │   └── schema.prisma         # Prisma schema (same as backend)
    ├── src/
    │   ├── app/                  # Next.js App Router
    │   │   ├── auth/            # Authentication pages
    │   │   ├── dashboard/       # Role-based dashboards
    │   │   │   ├── scout/       # Scout interface
    │   │   │   ├── club/        # Club interface
    │   │   │   └── players/     # Player management
    │   │   ├── components/      # Reusable components
    │   │   └── locales/         # Internationalization (FR/EN)
    │   ├── pages/api/           # Next.js API Routes
    │   ├── lib/                 # Utilities
    │   └── middleware/          # Middlewares (auth)
    └── package.json
```

## 🔌 API

### Main Endpoints

#### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registration

#### Players
- `GET /api/players` - List of players
- `GET /api/players/:id` - Player details
- `POST /api/players` - Create a player
- `GET /api/players/with-follow-status` - Players with follow status (scouts)

#### Player Follow (Scouts)
- `POST /api/players/follow/:id` - Follow a player
- `DELETE /api/players/follow/:id` - Unfollow
- `GET /api/players/following` - List of followed players
- `GET /api/players/:id/follow-info` - Player follow information

#### Reports
- `GET /api/reports` - List of reports
- `POST /api/reports` - Create a report
- `GET /api/reports/:id` - Report details
- `GET /api/reports/:id/export-pdf` - Export to PDF

#### Scouts
- `GET /api/scouts` - List of scouts (for clubs)
- `POST /api/scouts/create` - Create a scout
- `GET /api/scouts/dashboard` - Scout dashboard data

#### Clubs
- `GET /api/clubs` - List of clubs
- `GET /api/clubs/:id` - Club details

#### Assessments
- `GET /api/assessments` - List of assessments
- `POST /api/assessments` - Create an assessment
- `POST /api/assessments/upload-video` - Video upload

## 🎨 Advanced Features

### AI Prediction System
- Prediction algorithm based on age and natural progression
- 5-year projection (2025-2029)
- 8 analyzed metrics: Speed, Dribbling, Shooting, Passing, Defense, Physical, Control, Vision
- Personalized growth factors per metric

### Collaborative Badges
- Real-time display of scouts following the same player
- Identification by name and email
- Counter of interested colleagues
- Promotes intra-club collaboration

### Radar Charts
- Visualization of 8 main metrics
- Year-by-year comparison
- Display of future predictions
- Interactive interface with Recharts

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the project
2. Create a branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is the property of Uroom Sports Analytics. All rights reserved.

## 👤 Author

**Steven Eklou**
- GitHub: [@steven-eklou-vinci](https://github.com/steven-eklou-vinci)

## 🙏 Acknowledgments

- Next.js for the frontend framework
- Prisma for the ORM
- Recharts for visualizations
- The open source community

---

**Developed with ❤️ to revolutionize sports recruitment**
