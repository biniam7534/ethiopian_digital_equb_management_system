# Ethiopian Digital Equb Management System

Final-year project: members join equb groups, contribute on a schedule, and receive payouts in turn. Every payment is tracked transparently.

## Stack

| Layer | Technology |
|-------|------------|
| Mobile | React Native (Expo) |
| Backend | Node.js + Express |
| Database | PostgreSQL |
| Notifications | SMS gateway + Firebase Cloud Messaging |
| Languages | English, Amharic, Afaan Oromo |

## Folder structure

```
├── database/          # schema.sql, seed.sql
├── backend/           # Express API
│   └── src/
│       ├── config/
│       ├── middleware/
│       ├── modules/   # auth | equb | payment | notification | admin
│       ├── utils/
│       ├── db/
│       ├── app.js
│       └── server.js
└── mobile/            # Expo React Native app
    └── src/
        ├── api/
        ├── components/
        ├── context/
        ├── i18n/
        ├── navigation/
        ├── screens/
        └── theme/
```

## Quick start

### 1. Database

```bash
createdb equb_db
# or use Docker: docker run --name equb-pg -e POSTGRES_PASSWORD=equb_password \
#   -e POSTGRES_USER=equb_user -e POSTGRES_DB=equb_db -p 5432:5432 -d postgres:16
```

### 2. Backend

```bash
cd backend
cp .env.example .env   # edit DB credentials + JWT_SECRET
npm install
npm run migrate
npm run seed
npm run dev
```

API: `http://localhost:5000` · Health: `GET /health`

Demo users (password `Password123!`):

| Phone | Role |
|-------|------|
| +251911000001 | admin |
| +251911000002 | organizer |
| +251911000003 | member |
| +251911000004 | member |

Sample invite code: `BOLE2026`

### 3. Mobile

```bash
cd mobile
npm install
# Point API URL in app.json extra.apiUrl:
#   Android emulator: http://10.0.2.2:5000/api
#   iOS simulator:    http://localhost:5000/api
#   Physical device:  http://YOUR_LAN_IP:5000/api
npx expo start
```

## API overview

| Module | Base path |
|--------|-----------|
| Auth | `/api/auth` |
| Equbs | `/api/equbs` |
| Payments | `/api/payments` |
| Notifications | `/api/notifications` |
| Admin | `/api/admin` (admin role) |

## Equb flow

1. Organizer creates an equb → gets invite code  
2. Members join with the code  
3. Organizer starts the equb → cycles are created  
4. Members submit contributions each cycle  
5. Organizer confirms contributions  
6. When all are confirmed, organizer processes payout → next cycle opens  

SMS and FCM stay in dry-run mode until `SMS_ENABLED` / `FCM_ENABLED` are set in `.env`.
