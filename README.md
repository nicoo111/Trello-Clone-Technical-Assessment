# Trello Clone

A Trello-style task management application built in the JavaScript/TypeScript ecosystem for a technical assessment.

## Assessment Context

This project was built for the **Software Developer Intern** technical assessment.

### Assessment Goal
Build a Trello-style task management application using any tech stack within the JavaScript/TypeScript ecosystem. At minimum, the app must let users create tickets and move them through stages such as **To Do** and **Done**. This implementation goes beyond the base requirements with extra dashboard, filtering, export, and UI enhancements.

## Features

- Create tasks directly from the board
- Edit and delete tasks in a modal
- Move tasks between stages with drag and drop
- Automatic backlog handling for overdue work
- Task types such as `task`, `bug`, `update`, and `feature`
- Priority levels: `high`, `medium`, and `low`
- Due date support and date-range filtering
- Global search and quick filters
- Dashboard page with summary cards and breakdowns
- Export dashboard data to Excel
- Spotify-inspired dark UI theme

## Tech Stack

### Client
- React 19
- Vite
- React Router
- dnd-kit
- Axios
- SheetJS (`xlsx`) for Excel export

### Server
- Node.js
- Express
- CORS
- fs-extra for JSON file storage
- uuid for task IDs

### Storage
- Lightweight JSON file database in `server/database/db.json`

## Project Structure

```text
client/
  src/
    App.jsx
    App.css
    main.jsx
    pages/
      Board.jsx
      Board.css
      Dashboard.jsx
      Dashboard.css
    services/
      api.js
server/
  controllers/
    boardController.js
  routes/
    boardRoutes.js
  utils/
    fileHandler.js
  database/
    db.json
```

## Local Setup

You need **two terminals**: one for the backend and one for the frontend.

### Prerequisites

- Node.js 18 or newer (Node.js 20 LTS recommended)
- npm 9 or newer

### Quick Start (Fresh Clone)

```bash
git clone https://github.com/nicoo111/Trello-Clone-Technical-Assessment.git
cd trello-clone

cd client && npm install
cd ../server && npm install
```

### 1. Install Dependencies

Run this in the `client` folder:

```bash
cd client
npm install
```

Run this in the `server` folder:

```bash
cd server
npm install
```

### 2. Start the Backend

In a terminal inside `server`:

```bash
npm run dev
```

The backend will start on:

```text
http://localhost:5000
```

### 3. Start the Frontend

In another terminal inside `client`:

```bash
npm run dev
```

The frontend will start on:

```text
http://localhost:5173
```

### 4. Open the App

Open the frontend URL in your browser:

```text
http://localhost:5173
```

### Optional Verification

You can verify both projects compile:

```bash
cd client && npm run build
cd ../server && npm start
```

## Available Pages

- `/dashboard` - overview, totals, and Excel export
- `/board` - main Trello-style task board

## API Overview

The frontend talks to the backend at `http://localhost:5000`.

Main routes:

- `GET /api/boards` - load the board data
- `POST /api/boards/task` - create a task
- `POST /api/boards/move` - move a task between columns
- `POST /api/boards/update` - update a task
- `POST /api/boards/delete` - delete a task

## Data Model

Each task can include:

- `title`
- `description`
- `priority`
- `issueType`
- `dueDate`
- `tags`
- `createdAt`

## Notes

- The app uses a JSON file as its data store, so changes are saved locally in `server/database/db.json`.
- Overdue items are automatically moved to the backlog.

## Useful Commands

### Client

```bash
npm run dev
npm run build
npm run lint
```

### Server

```bash
npm run dev
npm start
```

## Author
### John Carlos Nico C. Reyes
