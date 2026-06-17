# VulnBridge

## Development Setup Guide

### Overview

This document describes the local development environment required to run VulnBridge.

The current implementation uses:

* React
* TypeScript
* Django
* PostgreSQL
* Node.js
* Terminal 3 ADK

Docker is not required for local development.

The backend runs inside a Python virtual environment while Terminal 3 dependencies are installed through npm because the Terminal 3 ADK is distributed through the Node ecosystem.

---

# Prerequisites

Install the following software before starting.

### Node.js

Recommended Version:

```text
Node.js 20+
```

Verify installation:

```bash
node --version
npm --version
```

---

### Python

Recommended Version:

```text
Python 3.11+
```

Verify installation:

```bash
python --version
```

---

### PostgreSQL

Recommended Version:

```text
PostgreSQL 14+
```

Verify installation:

```bash
psql --version
```

---

# Project Structure

```text
vulnbridge/

├── frontend/
│   ├── src/
│   ├── package.json
│   └── .env

├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── package.json
│   └── .env

├── docs/
│   ├── README.md
│   ├── PRD.md
│   └── ARD.md
```

---

# Backend Setup

Navigate to the backend directory.

```bash
cd backend
```

Create a Python virtual environment.

```bash
python -m venv venv
```

Activate the virtual environment.

Windows:

```bash
venv\Scripts\activate
```

Linux/macOS:

```bash
source venv/bin/activate
```

Install Python dependencies.

```bash
pip install -r requirements.txt
```

---

# Terminal 3 SDK Installation

The Terminal 3 ADK is installed through npm.

Initialize npm if package.json does not exist.

```bash
npm init -y
```

Install the SDK.

```bash
npm install @terminal3/t3n-sdk
```

Verify installation.

```bash
npm list @terminal3/t3n-sdk
```

---

# Database Setup

Create a PostgreSQL database.

Example:

```sql
CREATE DATABASE vulnbridge;
```

Update backend environment variables.

```env
DB_NAME=vulnbridge
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
```

Run migrations.

```bash
python manage.py migrate
```

---

# Environment Configuration

Backend environment variables:

```env
SECRET_KEY=your_secret_key

DB_NAME=vulnbridge
DB_USER=postgres
DB_PASSWORD=password
DB_HOST=localhost
DB_PORT=5432

T3N_API_KEY=your_terminal3_api_key
T3N_AGENT_DID=your_agent_did
```

Frontend environment variables:

```env
VITE_API_URL=http://localhost:8000
```

Replace values with credentials issued through the Terminal 3 developer portal.

---

# Running The Backend

Start Django.

```bash
python manage.py runserver
```

Default endpoint:

```text
http://localhost:8000
```

---

# Running The Frontend

Navigate to the frontend directory.

```bash
cd frontend
```

Install dependencies.

```bash
npm install
```

Start the development server.

```bash
npm run dev
```

Default endpoint:

```text
http://localhost:5173
```

---

# Verification Checklist

Before development begins, verify the following:

### Backend

```text
✓ Python environment active
✓ Dependencies installed
✓ PostgreSQL connected
✓ Migrations executed
✓ Django server running
```

### Frontend

```text
✓ Node modules installed
✓ Development server running
✓ API endpoint configured
```

### Terminal 3

```text
✓ SDK installed
✓ API credentials configured
✓ Agent identity configured
✓ Environment variables loaded
```

---

# Additional Documentation

For product requirements:

```text
PRD.md
```

For system architecture:

```text
ARD.md
```

For project overview and demonstration workflow:

```text
README.md
```
