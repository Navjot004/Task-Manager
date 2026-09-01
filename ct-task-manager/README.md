# CT University Task Manager

A comprehensive, multi-role task management system designed specifically for university administration. It streamlines the delegation, tracking, and approval of tasks across different administrative levels, featuring dynamic urgency color-coding and multi-stage review workflows.

## 🌟 Key Features

- **Role-Based Workflows**:
  - **Super Admin**: Has a global view of all tasks, can create/assign tasks directly to anyone, and provides the final approval on completed tasks.
  - **Department Admin**: Manages their specific team of staff, assigns tasks to their team, and performs the first-stage review of completed tasks.
  - **Staff**: Can view their assigned tasks, manage subtasks, and submit tasks for review once completed.
- **NAAC Dashboard**: A dedicated visualization for the Super Admin providing a high-level view of departmental progress, complete with Key Performance Indicators (KPIs), grouped bar charts, and interactive drill-downs by department and team members.
- **Dynamic Team Hierarchy**: The organizational structure dynamically reflects the database's staff assignment hierarchy, linking staff directly to their managing Department Admins for accurate reporting.
- **Dynamic Urgency Tracking**:
  - 🔴 **Red (Critical)**: Deadline is within 5 days or overdue.
  - 🟡 **Yellow (Warning)**: Deadline is between 6 and 10 days.
  - 🟢 **Green (Healthy)**: Deadline is more than 10 days away.
- **Multi-Stage Approval Process**: When staff complete a task, it is sent to the Department Admin for initial approval. Once approved, it is escalated to the Super Admin for final sign-off.
- **Subtask Management**: Break down large administrative tasks into smaller, trackable subtasks.
- **Visual Dashboard**: Role-specific dashboards showing tasks awaiting review, active team members, and overall completion metrics.

## 💻 Tech Stack

**Frontend**:
- React (Vite)
- TypeScript
- CSS (Vanilla)
- Lucide React (Icons)

**Backend**:
- Node.js
- Express
- MongoDB (Mongoose)
- JWT (Authentication)

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- MongoDB (running locally on `mongodb://localhost:27017/ct_task_manager` or configure via `.env`)

### 1. Backend Setup
Navigate to the backend directory and install dependencies:
```bash
cd backend
npm install
```

Create a `.env` file in the `backend` directory (if not present) with your configuration:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ct_task_manager
JWT_SECRET=your_jwt_secret_here
```

Start the backend server:
```bash
npm run dev
```

### 2. Frontend Setup
Open a new terminal, navigate to the frontend directory, and install dependencies:
```bash
cd frontend
npm install
```

Start the frontend development server:
```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

## 🔐 Default Test Credentials

Use these pre-seeded credentials to explore the different roles in the system:

| Role | University ID | Password |
| :--- | :--- | :--- |
| **Super Admin** | `10001` | `12345678` |
| **Department Admin** | `10002` | `12345678` |
| **Staff** | `10003` | `12345678` |

## 🏗️ Project Structure

```text
ct-task-manager/
├── backend/
│   ├── src/
│   │   ├── controllers/   # Request handlers (tasks, users, auth)
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # Express API routes
│   │   └── middleware/    # Auth and role-checking middleware
│   └── index.ts           # Server entry point
└── frontend/
    ├── src/
    │   ├── components/    # Reusable UI components (TaskModal, Sidebar)
    │   ├── pages/         # Role-specific dashboards and views
    │   ├── services/      # Axios API wrappers
    │   └── utils/         # Helper functions (e.g., task urgency calculation)
    └── App.tsx            # Main application router
```
