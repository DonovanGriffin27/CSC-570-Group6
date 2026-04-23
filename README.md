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

## Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A running PostgreSQL instance (Supabase or local)
- A running MongoDB instance (Atlas or local)

---

### 1. Clone the repo

```bash
git clone <repo-url>
cd CSC-570-Group6
```

---

### 2. Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend/` folder with the following:

```
DATABASE_URL=your_postgres_connection_string
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
```

Initialize the MongoDB collections (run once):

Open `backend/mongo/init.mongodb.js` in the MongoDB VS Code extension or Atlas playground and run it.

Start the backend server:

```bash
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

---

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

### Notes
- The PostgreSQL schema (tables, constraints) must already be applied. Contact the SQL architect for the schema script.
- The `.env` file is gitignored and must be created manually — it is never committed to the repo.
- Both the backend server and frontend dev server must be running at the same time for the app to function.

JWT_SECRET=casevault_super_secret_change_this_in_production
