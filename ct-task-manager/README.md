# CT University Task Manager

A full-stack task management system for CT University, built with React and Express.

---

## Technology Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | React, TypeScript, Vite, React Router |
| Backend  | Node.js, Express, TypeScript         |
| Database | MongoDB, Mongoose                    |

---

## Folder Structure

```
ct-task-manager/
│
├── frontend/                   # React application
│   ├── public/
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page-level components
│   │   ├── layouts/            # Layout wrappers
│   │   ├── navigation/         # Router configuration
│   │   ├── services/           # API service layer
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   ├── types/              # TypeScript type definitions
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── .env.example
│   └── package.json
│
├── backend/                    # Express API server
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts     # MongoDB connection
│   │   ├── controllers/        # Route handlers
│   │   ├── models/             # Mongoose models
│   │   ├── routes/             # API route definitions
│   │   ├── middleware/         # Custom middleware
│   │   ├── services/           # Business logic
│   │   ├── utils/              # Utility functions
│   │   └── server.ts           # Server entry point
│   ├── .env                    # Environment variables (git-ignored)
│   ├── .env.example
│   └── package.json
│
├── .gitignore
└── README.md
```

---

## Setup

### 1. Install Backend Dependencies

```bash
cd ct-task-manager/backend
npm install
```

### 2. Install Frontend Dependencies

```bash
cd ct-task-manager/frontend
npm install
```

### 3. Configure MongoDB

Open the file:

```
ct-task-manager/backend/.env
```

Paste your MongoDB URI:

```
MONGODB_URI=mongodb+srv://your-username:your-password@your-cluster.mongodb.net
DATABASE_NAME=ct_task_manager
PORT=5000
```

> **Important:** The `.env` file is git-ignored. Never commit your MongoDB URI.

---

## Running the Application

### Start Backend

```bash
cd ct-task-manager/backend
npm run dev
```

The backend runs at: **http://localhost:5000**

### Start Frontend

```bash
cd ct-task-manager/frontend
npm run dev
```

The frontend runs at: **http://localhost:5173**

---

## Testing the Health Endpoint

Once the backend is running, visit:

```
http://localhost:5000/api/health
```

Expected response:

```json
{
  "success": true,
  "message": "Backend is running",
  "database": "connected"
}
```

You can also test from the command line:

```bash
curl http://localhost:5000/api/health
```

---

## URLs

| Service          | URL                                    |
| ---------------- | -------------------------------------- |
| Frontend         | http://localhost:5173                   |
| Backend          | http://localhost:5000                   |
| Health           | http://localhost:5000/api/health        |
| Verified Users   | http://localhost:5173/super-admin/verified-users |
| Register         | http://localhost:5173/register          |
| Login            | http://localhost:5173/login             |
| Me (Protected)   | http://localhost:5000/api/auth/me       |
| User Management  | http://localhost:5173/super-admin/users |
| SA Staff Assign  | http://localhost:5173/super-admin/staff-assignments |
| Dept Admin Staff | http://localhost:5173/admin/staff       |
| SA Tasks         | http://localhost:5173/super-admin/tasks |
| Dept Admin Tasks | http://localhost:5173/admin/tasks       |
| Staff Tasks      | http://localhost:5173/staff/tasks       |

---

## Verified Users System

The Super Admin can upload a list of university-approved users. Only users present in this list will be eligible to register.

### File Format

Upload an **Excel (.xlsx)** or **CSV** file with these columns:

| Column     | Required | Rules                      |
| ---------- | -------- | -------------------------- |
| Sr. No.    | No       | Ignored during import      |
| ID         | Yes      | Exactly 5 numeric digits   |
| Name       | Yes      | Non-empty string           |
| Email      | Yes      | Valid email format          |
| Phone No.  | Yes      | Exactly 10 numeric digits  |
| Department | No       | Optional text               |

**Example spreadsheet:**

| Sr. No. | ID    | Name          | Email                         | Phone No.  | Department       |
|---------|-------|---------------|-------------------------------|------------|------------------|
| 1       | 10001 | Arjun Sharma  | arjun.sharma@ctuniversity.in  | 9876500001 | Computer Science |
| 2       | 10002 | Simran Kaur   | simran.kaur@ctuniversity.in   | 9876500002 | Management       |
| 3       | 10003 | Rahul Kumar   | rahul.kumar@ctuniversity.in   | 9876500003 | Engineering      |

> **Do NOT include** password, role, or authentication columns.

### Download Template

Download a blank template from:

```
GET http://localhost:5000/api/verified-users/template
```

Or click "Download Template" on the Verified Users page.

### API Endpoints

| Method | Endpoint                              | Description                            |
| ------ | ------------------------------------- | -------------------------------------- |
| POST   | `/api/verified-users/import`          | Upload .xlsx or .csv file              |
| GET    | `/api/verified-users`                 | List users (supports pagination/search)|
| GET    | `/api/verified-users/stats`           | Summary statistics                     |
| GET    | `/api/verified-users/:universityId`   | Get single user by University ID       |
| GET    | `/api/verified-users/template`        | Download blank Excel template          |

**Query parameters for GET /api/verified-users:**

- `page` — Page number (default: 1)
- `limit` — Items per page (default: 20, max: 100)
- `search` — Search by name, email, ID, or department
- `status` — Filter: `registered` or `not-registered`

### Upload Behavior

- If a University ID already exists, the record is **updated** (name, email, phone, department).
- The `isRegistered` status is **never reset** — registered users remain registered.
- Duplicate IDs within the same file are detected and reported as errors.
- Invalid rows are skipped with clear error messages.

### Import Response Example

```json
{
  "success": true,
  "message": "Import completed",
  "data": {
    "totalRows": 30,
    "inserted": 25,
    "updated": 3,
    "skipped": 2,
    "errors": [
      { "row": 7, "field": "ID", "message": "Invalid University ID \"123\". Expected exactly 5 digits" },
      { "row": 12, "field": "ID", "message": "Duplicate University ID \"10001\" — first seen in row 3" }
    ]
  }
}
```

### How to Test

1. Navigate to: http://localhost:5173/super-admin/verified-users
2. Click "Download Template" to get a blank .xlsx file
3. Fill in the template with test data
4. Click "Select File" → choose your file → click "Upload"
5. Verify the import summary appears
6. Verify users appear in the table below
7. Test search and status filter
8. Re-upload with modified data to test updates

---

## Notes

- Frontend and backend are separate applications and must be started independently.
- MongoDB is only accessed from the backend. The frontend communicates via REST API.
- The backend URL is configured in `frontend/.env` via `VITE_API_URL`.
