# IssueFlow – Setup & Run Guide

## Prerequisites
- Node.js 18+
- Docker Desktop
- npm

## 1. Install Dependencies
```bash
npm install
```

## 2. Environment Setup
Create a `.env` file in the root with:
```env
DATABASE_URL="postgresql://issueflow:issueflow@localhost:5432/issueflow"
JWT_SECRET="supersecretkey_change_in_production"
JWT_EXPIRES_IN="1d"
```

## 3. Start the Database
```bash
docker compose up -d
```

## 4. Run Database Migrations
```bash
npx prisma migrate dev
```

## 5. Build the Project
```bash
npm run build
```

## 6. Run the Application

Development (with hot reload):
```bash
npm run start:dev
```

Production:
```bash
npm run start:prod
```

The API will be available at `http://localhost:3000`

## 7. Run the Tests
```bash
npm test
```