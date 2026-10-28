# Storing KisanSetu data in Firebase SQL Connect (Data Connect)

KisanSetu's data (users, farmers, buyers, FPOs, listings, offers, transactions, grievances
and the rest — 16 tables) can live in the Cloud SQL PostgreSQL database that Firebase SQL
Connect (Data Connect) manages for project **kisan-setu-3bbf5**.

How the pieces fit:

| Piece | What it does |
| --- | --- |
| `dataconnect/schema/schema.gql` | The schema. `firebase deploy --only dataconnect` creates and migrates the tables from it. |
| `dataconnect/kisansetu-connector/queries.gql` | Read-only queries for browsing the data in the Firebase console (no app/client can call them). |
| `backend/app/core/database.py` | The backend connects to the Cloud SQL instance when `CLOUD_SQL_INSTANCE` is set, otherwise uses the local SQLite file. |
| `backend/scripts/migrate_to_firebase_sql.py` | Copies everything already in the local SQLite database into Cloud SQL. Safe to re-run. |

The backend keeps doing all reads and writes (through SQLAlchemy); Data Connect owns the
table definitions. If you add or change a column, change **both** `schema.gql` and the model
in `backend/app/models/`, then redeploy.

## Cost

Your project is on the Spark plan. Data Connect offers a **no-cost 90-day Cloud SQL trial**
instance. After 90 days you must upgrade to Blaze (pay-as-you-go) or the instance is shut down.
Back up first if you won't upgrade.

## One-time setup

### 1. Create the Data Connect service (Firebase console)

Firebase console → **kisan-setu-3bbf5** → **Build → Data Connect → Get started**, and use
exactly these names (they are in `dataconnect/dataconnect.yaml`; change that file if you pick others):

| Field | Value |
| --- | --- |
| Location | `asia-south1` (Mumbai) |
| Cloud SQL instance ID | `kisansetu-fdc` (choose the no-cost trial) |
| Database name | `kisansetu` |
| Service ID | `kisansetu` |

### 2. Deploy the schema (creates the 16 tables)

From the project root (the folder with `firebase.json`):

```bash
npm install -g firebase-tools
```

```bash
firebase login
```

```bash
firebase deploy --only dataconnect
```

When it asks to apply the SQL migration, choose to execute it.

### 3. Give the backend access

1. Google Cloud console → **SQL → kisansetu-fdc → Users** → set a password for the `postgres`
   user (or add a new built-in user).
2. Google Cloud console → **IAM** → find
   `firebase-adminsdk-fbsvc@kisan-setu-3bbf5.iam.gserviceaccount.com` → **Grant access** →
   role **Cloud SQL Client**.
3. Make sure the **Cloud SQL Admin API** is enabled (APIs & Services → Library).

### 4. Point the backend at it

Add to `backend/.env` (keep the existing `GOOGLE_APPLICATION_CREDENTIALS=./firebase-adminsdk.json`):

```
CLOUD_SQL_INSTANCE=kisan-setu-3bbf5:asia-south1:kisansetu-fdc
DB_NAME=kisansetu
DB_USER=postgres
DB_PASSWORD=<the password from step 3>
```

Install the new packages once:

```bash
venv\Scripts\python.exe -m pip install -r requirements.txt
```

### 5. Copy the existing data

From the `backend` folder:

```bash
venv\Scripts\python.exe -m scripts.migrate_to_firebase_sql --dry-run
```

```bash
venv\Scripts\python.exe -m scripts.migrate_to_firebase_sql
```

The local `kisansetu.db` is left untouched as a backup.

### 6. Restart the backend

From now on every new user, listing, offer, transaction and grievance is stored in Firebase SQL
Connect. You can browse it in Firebase console → Data Connect → **Data**.

To go back to the local SQLite file, remove `CLOUD_SQL_INSTANCE` from `backend/.env` and restart.

## Testing locally without Cloud SQL

The Data Connect emulator validates the schema offline:

```bash
npx firebase-tools emulators:start --only dataconnect --project demo-kisansetu
```
