# CSC-570-Group6
GitHub repository for CSC-570 Project (Group 6) — CaseVault, a law enforcement case management system.

---

## Team

| Name | Role |
|------|------|
| James | PM & Integration Lead |
| Elisa | Backend / API Engineer |
| Donovan | Frontend / UI Engineer |
| Houston | SQL Architect |
| Ava | NoSQL Architect |

---

## Running the app locally

You need your own PostgreSQL and MongoDB instances — the team's cloud credentials are not in this repo for security reasons. Follow the steps below to set up local databases, which takes about 10 minutes.

---

### Prerequisites
- Python 3.10+
- Node.js 18+
- PostgreSQL 14+ ([download](https://www.postgresql.org/download/))
- MongoDB Community Edition ([download](https://www.mongodb.com/try/download/community)) **or** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd CSC-570-Group6
```

---

### 2. Set up PostgreSQL

If you installed PostgreSQL locally, create a database and apply the schema:

```bash
psql -U postgres -c "CREATE DATABASE casevault;"
psql -U postgres -d casevault -f schema.sql
```

`schema.sql` is in the repo root — it creates all tables, enums, and indexes from scratch.

---

### 3. Set up MongoDB

If running MongoDB locally, no extra setup is needed — the app will create its collections on first use. Just make sure `mongod` is running.

To initialize the collection validators (optional but recommended):

Open `backend/mongo/init.mongodb.js` in the MongoDB VS Code extension or run it via `mongosh`:

```bash
mongosh < backend/mongo/init.mongodb.js
```

---

### 4. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your database connection values. For a default local Postgres + MongoDB setup the example values should work as-is (just set `DB_PASS` to your Postgres password).

---

### 5. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

API available at `http://127.0.0.1:8000`.

---

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:5173`.

---

### Notes
- Both servers must be running at the same time.
- The `.env` file is gitignored and is never committed — always create it from `.env.example`.
- If using Supabase or MongoDB Atlas instead of local instances, paste your connection string values into `.env` — the app works the same either way.