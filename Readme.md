# Codrr Drive

A cloud storage backend that lets users upload, organize, and share files
directly to AWS S3 using presigned URLs. It includes session-based
authentication, hierarchical folders, file sharing links, and a
Razorpay-powered subscription system for storage plans.

# Features

- Email/password registration with OTP-based email verification
- Session-based authentication using Redis, with configurable per-user
  device/session limits
- Session management: list active sessions, terminate one or all sessions
- Password reset via OTP
- Hierarchical folder (directory) structure with nested folders
- Direct-to-S3 file uploads using presigned URLs, with a two-step
  initiate/complete upload flow that verifies the uploaded object on S3
  before marking it complete
- File download/preview via presigned S3 URLs (inline or attachment)
- File and folder rename, delete, and recursive folder deletion
  (including nested files/folders and their S3 objects)
- Per-user storage limit and max file size enforcement
- Public file sharing via tokenized links, with optional password
  protection and link activation/deactivation
- Subscription plans backed by Razorpay, including plan creation/import
  from Razorpay and payment signature verification
- Razorpay webhook handling for subscription activation, charges,
  pending, and cancellation events
- Scheduled cron jobs for cleaning up abandoned uploads and downgrading
  users after subscription expiry
- OTP delivery via an email queue processed by a background worker
- Role-based access control (user, admin, superAdmin) for admin and
  super-admin routes
- Admin endpoints for listing, soft-deleting, recovering, and
  permanently deleting users
- Super-admin endpoints for promoting/demoting admins and viewing
  system-wide usage statistics
- Global IP-based rate limiting
- Request validation using Zod schemas

# Tech Stack

**Backend**
- Node.js (ES Modules)
- Express 5

**Database**
- MongoDB with Mongoose

**Caching & Queues**
- Redis (via ioredis) — sessions, OTP storage, rate limiting
- BullMQ — background job queue for sending OTP emails
- node-cron — scheduled cleanup and subscription-expiry jobs

**Cloud Storage**
- AWS S3

**Authentication**
- Signed, HTTP-only session cookies backed by Redis
- bcrypt for password hashing

**Payments**
- Razorpay (subscriptions, webhooks, signature verification)

**Email**
- Nodemailer (SMTP)

**Validation**
- Zod

# Project Structure

```
src/
├── Config/         # DB, Redis, S3, Razorpay, BullMQ, and Nodemailer setup
├── Controllers/     # Request handlers for each resource
├── Middlewares/      # Auth, role checks, rate limiting, error handling, ObjectId validation
├── Models/          # Mongoose schemas (User, File, Directory, Plan, Subscription, SharedFile)
├── Queues/           # BullMQ queue definitions
├── Workers/           # BullMQ worker(s) that process queued jobs
├── Routes/            # Express route definitions per resource
├── Services/          # Business logic (S3, Razorpay, email, OTP, directory size)
├── Templates/          # HTML email templates
├── Utils/              # Shared helpers (AppError, sendResponse)
├── validation/          # Zod schemas per resource
├── cron/                # Scheduled jobs (upload cleanup, subscription expiry)
└── app.js               # Express app and route wiring

server.js               # Entry point: connects DB/Redis and starts the server
```

# Environment Variables

Create a `.env` file in the project root and configure the following variables:

```env
# Server
PORT=

# MongoDB
MONGO_URI=

# Redis
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=

# Cookies
COOKIE_SECRET=

# AWS S3
AWS_ACCESS_KEY=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Email (SMTP)
MAIL_HOST=
MAIL_PORT=
MAIL_USER=
MAIL_PASS=
MAIL_FROM=

# Razorpay
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

# Frontend
FRONTEND_URL=
```

# Installation

```bash
# Clone the repository
git clone <repository-url>
cd <repository-folder>

# Install dependencies
npm install

# Configure environment variables
# Create a `.env` file in the project root using the variables listed above.

# Run the server
npm run dev
```

The server starts on the port defined by `PORT` and connects to MongoDB
and Redis on startup. It also starts the OTP email worker and the cron
jobs for upload cleanup and subscription expiry.

# API Overview

- **`/api/auth`** — Registration, login/logout, email verification OTP,
  password reset OTP, and fetching the current user
- **`/api/sessions`** — List, terminate, or terminate-all active sessions
  for the authenticated user
- **`/api/directory`** — Create, view, rename, and delete folders
- **`/api/file`** — Initiate/complete presigned S3 uploads, download,
  rename, and delete files
- **`/api/share`** — Create/manage share links for files and access
  shared files by token (with optional password)
- **`/api/subscriptions`** — Create and verify Razorpay subscriptions,
  view current subscription, cancel subscription
- **`/api/users/plans`** — List available subscription plans
- **`/api/webhooks`** — Razorpay webhook receiver for subscription
  lifecycle events
- **`/api/admin/plans`** — Admin/superAdmin: import, create, list, and
  update Razorpay-backed plans
- **`/api/admin/users`** — Admin/superAdmin: list, soft-delete, recover,
  and permanently delete users
- **`/api/superAdmin`** — SuperAdmin only: look up users, promote/demote
  admins, view system statistics

## Deployment

- Backend deployed on AWS EC2
- File storage on Amazon S3
- Redis used for sessions, OTP storage, and rate limiting