# Auth-Gated App Testing Playbook (Emergent Google Auth)

## Step 1: Create Test User & Session
Use mongosh to insert a user + session directly, then use the session_token as bearer/cookie.

## Step 2: Test Backend API
- GET /api/auth/me with Authorization: Bearer <token>
- GET /api/jobs, POST /api/jobs, etc. with token

## Step 3: Browser Testing
Set cookie `session_token` on the domain, then navigate to protected routes.

## Checklist
- User doc has `user_id` (custom UUID)
- All queries use `{"_id": 0}` projection
- Backend queries use `user_id` (not `_id`)
- Callback detection uses `useLocation().hash`
