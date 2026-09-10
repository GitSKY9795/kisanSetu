# Kisan Setu MongoDB API

This is the standalone Node.js/Express API for farmer profile data. It uses MongoDB and is intentionally separate from the existing Python backend so the current application is not modified.

## Setup

From the repository root:

```powershell
cd backend-node
npm install
Copy-Item .env.example .env
```

Add your MongoDB URI to `backend-node/.env` when it is available:

```env
MONGO_URI=mongodb+srv://...
MONGO_DB_NAME=kisan_setu
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
FIREBASE_PROJECT_ID=your-firebase-project-id
GOOGLE_APPLICATION_CREDENTIALS=C:\path\outside\repository\firebase-service-account.json
```

No database credentials are stored in this repository.

MongoDB collections and indexes are created automatically when the API starts. No SQL migration is required.

## Start the API

```powershell
npm start
```

The API listens on `http://localhost:4000` by default. Check the database connection with:

```powershell
Invoke-RestMethod http://localhost:4000/health
```

## Endpoints

- `POST /api/farmers`
- `GET /api/farmers/:id`
- `PUT /api/farmers/:id`
- `DELETE /api/farmers/:id`

Firebase Phone Authentication remains separate. After Firebase verifies the phone OTP, the frontend sends the verified farmer profile to `POST /api/farmers`.

## Sessions and production security

- `POST /api/auth/login` accepts a Firebase ID token, verifies it with Firebase Admin, and sets a 20-day HttpOnly, SameSite cookie.
- `GET /api/auth/session` returns the current farmer or `401` with `Your session has expired. Please login again.`.
- `POST /api/auth/logout` deletes the database session and clears the cookie.
- Only a SHA-256 hash of the session token is stored in MongoDB.
- Set `NODE_ENV=production` and serve the API over HTTPS in production; this enables the cookie's `Secure` flag.
- Do not put Firebase service-account files or MongoDB credentials in the repository.
