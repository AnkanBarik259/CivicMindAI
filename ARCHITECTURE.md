# CivicMind AI - Architecture & Product Blueprint

## 1. Product Requirements Document (PRD)

### Vision
To empower communities and authorities by transforming passive civic complaints into actionable, AI-managed workflows, ensuring rapid and transparent resolution of public infrastructure issues.

### Problem
Citizens report issues (potholes, broken streetlights, water leaks) but face a black box with no updates. Authorities are overwhelmed with duplicate, spam, or miscategorized reports and lack the resources to manually verify and route each issue to the correct department efficiently.

### Goals
- Automate triage, categorization, and routing of civic issues using AI.
- Provide a transparent, real-time tracking system for citizens.
- Reduce authority workload through AI-driven duplicate detection, severity scoring, and prioritization.
- Foster community trust and engagement via gamified trust scores and verification.

### Non-goals
- Replacing human authority for final major financial/resource allocation decisions.
- Becoming a general social network or neighborhood chat platform.

### Target Users
- **Citizens:** Everyday residents wanting to report and track local issues.
- **Authorities:** Municipal workers, department heads, and city planners managing infrastructure.
- **AI Agent:** An autonomous system bridging the gap between citizens and authorities.

### Success Metrics
- Average time from report to department assignment (Goal: < 5 minutes).
- Percentage of duplicates automatically caught and merged (Goal: > 90%).
- Citizen engagement rate (measured by upvotes and community verifications).
- Reduction in manual triage hours for municipal authorities.

### MVP Scope
- Citizen reporting with photo/text.
- AI vision analysis, categorization, and severity scoring.
- Authority dashboard for viewing and updating status.
- Basic AI duplicate detection.
- Google Maps integration for issue localization.

### Stretch Features
- Voice reporting.
- Predictive analytics for infrastructure maintenance.
- AI-driven daily reports for authorities.
- Community leaderboard and trust scores.

---

## 2. Complete User Journey

### Citizen Journey
1. **Onboarding:** User signs in via Firebase Auth, grants location access.
2. **Reporting:** Encounters a pothole. Takes a photo, optionally adds voice/text description.
3. **Submission:** App fetches precise GPS coordinates and submits to the backend.
4. **AI Feedback (Instant):** The AI Agent acknowledges the report, categorizes it as "Roads & Transport," assesses severity, and provides an estimated resolution timeframe.
5. **Tracking & Verification:** Citizen checks the app map, sees their issue and others nearby. They can "verify" other issues to earn Trust Points.
6. **Resolution:** Receives a push notification when the issue is resolved, with a verification photo from the authority.

### Authority Journey
1. **Login:** Authority logs into their department-specific dashboard.
2. **Triage:** Views the AI-prioritized queue. High-severity, verified issues are at the top.
3. **Action:** Assigns a work crew to the issue.
4. **Update:** Crew completes the job, uploads a resolution photo.
5. **AI Verification:** The AI compares the before and after photos to confirm the fix before officially closing the ticket.
6. **Analytics:** Department head reviews the AI-generated weekly report on recurring issues.

### AI Journey
1. **Ingestion:** Receives new report payload (image, text, location).
2. **Vision Analysis:** Extracts metadata (e.g., "pothole, approx 2ft wide, on asphalt").
3. **Deduplication:** Queries the geospatial database for similar issues within 50 meters. If a match is found, merges reports and boosts confidence.
4. **Routing & Scoring:** Assigns department, calculates a severity score based on danger to public (e.g., deep pothole = High, graffiti = Low).
5. **Lifecycle Management:** Monitors issue age. If a high-severity issue breaches SLA, the Escalation Agent pings the department head.
6. **Closure:** Analyzes the resolution photo provided by the crew to verify the fix.

---

## 3. Complete Feature List

### Core MVP
| Feature | Purpose | Inputs | Outputs | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Auth** | Secure login | Email/Social | JWT, User Session | Firebase Auth |
| **Issue Submission** | Capture data | Photo, GPS, Text | Report ID, DB Entry | Camera, Maps API |
| **AI Vision Triage** | Understand issue | Image, Text | Category, Severity | Gemini Vision |
| **Interactive Map** | Geospatial view | Viewport bounds | Map markers | Maps Platform |
| **Authority Dashboard** | Manage issues | Dept ID, Filters | List of prioritized issues | Firestore |

### Advanced Features
| Feature | Purpose | Inputs | Outputs | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **AI Duplicate Detection** | Prevent spam | Location, AI Embeddings | Merged issue ID | Vector Search/Firestore |
| **AI Resolution Verification**| Ensure work quality | Before & After Photos | Pass/Fail Boolean | Gemini Vision |
| **Trust Score Engine** | Gamify engagement | User actions (verifications) | Updated Trust Score | Firestore Triggers |
| **Escalation Agent** | SLA adherence | Issue status, timestamps | Alerts/Notifications | Cloud Scheduler/FCM |

### Future Features
| Feature | Purpose | Inputs | Outputs | Dependencies |
| :--- | :--- | :--- | :--- | :--- |
| **Predictive Analytics** | Proactive maintenance | Historical issue data | Heatmaps, Risk scores | Vertex AI/BigQuery |
| **Voice Reporting** | Hands-free reporting | Audio stream | Transcribed text, NLP context| Gemini API |

---

## 4. AI Workflow

### Vision Analysis
- **Input:** Image URL, Citizen Text.
- **Reasoning:** Identifies the object, assesses damage, context, and potential hazards.
- **Output:** JSON (Category: "Infrastructure", Type: "Pothole", Severity: 8/10, Tags: ["road_damage", "hazard"]).

### Duplicate Detection
- **Input:** New report location, Image embeddings, Text embeddings.
- **Reasoning:** Checks if a similar issue was reported nearby recently.
- **Output:** Boolean (IsDuplicate), Parent Issue ID.

### Severity Scoring
- **Input:** Vision analysis output, location context (e.g., near school).
- **Reasoning:** Weights physical danger, community impact, and number of verifications.
- **Output:** Normalized Score (1-100), Priority Tier (Low, Medium, High, Critical).

### Department Routing
- **Input:** Category and Tags.
- **Reasoning:** Maps categorization to municipal taxonomy.
- **Output:** Assigned Department ID (e.g., "DEPT_PUBLIC_WORKS").

### Fake Report Detection
- **Input:** Image metadata (EXIF), User Trust Score, Vision context (e.g., photo of a screen).
- **Reasoning:** Detects anomalies, impossible locations, or known spam patterns.
- **Output:** Spam Confidence Score, Auto-Reject trigger.

### Escalation Agent
- **Input:** Issue age, Priority Tier.
- **Reasoning:** If High Priority is unassigned for > 48h, escalate.
- **Output:** Notification payload to higher authority.

### Resolution Verification
- **Input:** Original Image, Resolution Image.
- **Reasoning:** Compares visual state to ensure the reported problem is no longer present.
- **Output:** Verification Status (Approved/Rejected), Rationale.

---

## 5. System Architecture

**Frontend:**
Next.js 15 (App Router), deployed on Firebase Hosting / Cloud Run. Uses Tailwind CSS and Shadcn UI for the design system. Zustand for state management.

**Backend:**
FastAPI (Python) deployed on Google Cloud Run. Chosen for Python's AI ecosystem integration. Exposes REST/GraphQL APIs for the frontend.

**AI Layer:**
Google Gemini 2.5 Pro for text/orchestration. Gemini Vision for image analysis. Handled within the FastAPI backend to keep API keys secure.

**Database:**
Firebase Firestore. Acts as the real-time NoSQL database. Syncs seamlessly with the frontend for live map updates.

**Storage:**
Firebase Storage for raw image and video uploads.

**Maps:**
Google Maps Platform (Maps JavaScript API, Places API, Geocoding API).

**Flow:**
`Client (Next.js) -> Uploads image to Firebase Storage -> Calls FastAPI endpoint -> FastAPI calls Gemini API -> FastAPI updates Firestore -> Firestore syncs via real-time listeners back to Client.`

---

## 6. Folder Structure

```
civicmind-ai/
├── frontend/                 # Next.js Application
│   ├── src/
│   │   ├── app/              # App Router pages (/, /dashboard, /map)
│   │   ├── components/       # Shadcn UI, Maps, Forms
│   │   ├── lib/              # Firebase client init, utilities
│   │   ├── hooks/            # Custom React hooks (e.g., useLocation)
│   │   ├── store/            # Zustand state management
│   │   └── types/            # TypeScript interfaces
│   ├── public/               # Static assets
│   └── package.json
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API Route handlers
│   │   ├── core/             # Config, Security, DB connection
│   │   ├── models/           # Pydantic models
│   │   ├── services/         # Business logic (Issue, User, Dept)
│   │   └── ai_agents/        # AI orchestration logic
│   │       ├── vision.py     # Gemini Vision interaction
│   │       ├── routing.py    # Dept routing agent
│   │       └── escalation.py # SLA monitoring
│   ├── requirements.txt
│   └── main.py
├── shared/                   # Shared schemas/types (optional, e.g., OpenAPI specs)
└── infrastructure/           # Terraform / CI-CD configurations
```

---

## 7. Database Design (Firestore)

### Collection: `users`
- **Purpose:** Store citizen and authority profiles.
- **Fields:** `uid` (string), `role` (enum: citizen, authority), `name` (string), `trust_score` (number), `createdAt` (timestamp).

### Collection: `issues`
- **Purpose:** Core reporting data.
- **Fields:** `issue_id` (string), `reporter_uid` (string), `location` (GeoPoint), `images` (array of URLs), `description` (string), `status` (enum: reported, analyzing, assigned, in_progress, resolved, closed), `category` (string), `department_id` (string), `severity_score` (number), `upvotes` (number), `ai_metadata` (map).
- **Indexes:** `[status, department_id]`, `[location]`.

### Collection: `departments`
- **Purpose:** Authority groups.
- **Fields:** `dept_id` (string), `name` (string), `contact_email` (string).

### Collection: `verifications`
- **Purpose:** Peer review of issues.
- **Fields:** `verification_id`, `issue_id`, `user_id`, `is_valid` (boolean), `timestamp`.

### Collection: `ai_logs`
- **Purpose:** Audit trail for AI decisions.
- **Fields:** `log_id`, `issue_id`, `agent_name`, `input`, `output`, `timestamp`.

---

## 8. API Design (FastAPI)

### `POST /api/v1/issues/report`
- **Method:** POST
- **Request:** FormData (image file, lat, lng, description, user_id)
- **Response:** `{ "issue_id": "123", "status": "analyzing" }`
- **Auth:** Bearer Token (Firebase Auth)

### `GET /api/v1/issues/nearby`
- **Method:** GET
- **Request:** Query params `lat`, `lng`, `radius`
- **Response:** `[ { issue object }, ... ]`
- **Auth:** None (Public) or Bearer

### `PATCH /api/v1/issues/{issue_id}/status`
- **Method:** PATCH
- **Request:** `{ "status": "in_progress", "notes": "Crew dispatched" }`
- **Response:** `{ "success": true }`
- **Auth:** Authority Role Required

### `POST /api/v1/ai/verify-resolution`
- **Method:** POST
- **Request:** `{ "issue_id": "123", "resolution_image_url": "url" }`
- **Response:** `{ "verified": true, "reasoning": "Pothole filled and sealed." }`
- **Auth:** Authority/System

---

## 9. AI Agents

1. **Triage Agent (Vision & Routing)**
   - **Trigger:** New issue report.
   - **Responsibilities:** Extract context from image, assign category, estimate severity, assign department.
   - **Output:** Updated Issue Document in Firestore.
   - **Failure Handling:** If vision model fails or confidence is low, flags issue as "Manual Review Required".

2. **Integrity Agent (Spam & Duplicates)**
   - **Trigger:** Post-Triage.
   - **Responsibilities:** Compare against existing active issues within a 100m radius using embeddings/geo-queries. Evaluate image EXIF data.
   - **Output:** Links to parent issue or flags as spam.

3. **Escalation Agent (Chron Task)**
   - **Trigger:** Scheduled Cloud Run Job (Hourly).
   - **Responsibilities:** Scan issues. If `status == 'assigned'` and `time_in_status > 48h` and `severity > 80`, trigger escalation.
   - **Output:** Pub/Sub event to notification service.

4. **Inspector Agent (Resolution)**
   - **Trigger:** Authority uploads resolution photo.
   - **Responsibilities:** Compare original and resolution photos to ensure the job was done.
   - **Output:** Approval to close ticket, or request for rework.

---

## 10. State Machine (Issue Lifecycle)

1. `SUBMITTED`: Raw data received.
2. `AI_ANALYZING`: Triage Agent processing.
3. `OPEN`: Verified, categorized, awaiting assignment.
4. `DUPLICATE`: Merged with an existing issue (Terminal state).
5. `REJECTED`: Flagged as spam/invalid by AI or Admin (Terminal state).
6. `ASSIGNED`: Routed to specific department queue.
7. `IN_PROGRESS`: Crew is actively working on it.
8. `RESOLVED_PENDING_VERIFICATION`: Crew uploaded fix photo. Inspector Agent analyzing.
9. `CLOSED`: AI verified the fix, or Admin manually closed (Terminal state).

---

## 11. Security

- **Authentication:** Firebase Auth handles all identity and token issuance.
- **Authorization:** Firestore Security Rules ensure Citizens can only edit their own reports; Authorities can only update issues assigned to their department. Backend endpoints use FastAPI Dependency Injection to verify Firebase JWT roles.
- **Data Privacy:** Location fuzzing (shifting markers slightly) for sensitive reports (e.g., vandalism on private property) if requested.
- **Spam Prevention:** App Engine App Check / Firebase App Check to prevent bot traffic. Integrity Agent filters fake images. Rate limiting on the FastAPI backend (e.g., max 5 reports per user per hour).

---

## 12. UI Screens

### Citizen App
1. **Landing / Auth:** Simple Google/Email sign-in. Explains value prop.
2. **Interactive Map (Home):** Full-screen Google Map. FAB (Floating Action Button) to "Report Issue". Markers show nearby issues color-coded by status.
3. **Reporting Camera/Form:** Camera viewfinder, voice dictate button, optional text field.
4. **Issue Detail Modal:** View photos, AI analysis summary, timeline of events, and upvote/verify button.
5. **My Profile:** Shows Trust Score, badges earned, and list of past reports.

### Authority Dashboard
1. **Command Center:** KPI cards (Open Issues, Avg Resolution Time).
2. **Triage Queue:** Kanban board or Data Table (Assigned, In Progress, Review). Highlighted high-severity issues.
3. **Issue Management View:** Side-by-side view of Citizen photo vs Resolution photo. Assignment dropdowns.
4. **AI Analytics:** Heatmap of frequent issues. Generative AI text summary of weekly trends.

---

## 13. User Flow Diagram

```text
[Citizen] --> (Opens App) --> (Views Map) --> (Taps Report) --> (Uploads Photo)
     |
     v
[Backend] --> (Triggers Triage Agent) --> (Gemini Vision Analyzes) --> (Integrity Agent Checks Duplicates)
     |
     v
[Database] <-- (Saves Issue: Cat: Road, Dept: Transport, Sev: High)
     |
     v
[Citizen] <-- (Receives instant AI feedback and tracking link)
     |
     v
[Authority] --> (Logs into Dashboard) --> (Sees High Sev Issue at top) --> (Assigns Crew)
     |
     v
[Crew] --> (Fixes issue, uploads proof photo)
     |
     v
[Inspector Agent] --> (Gemini Vision compares Before/After) --> (Approves)
     |
     v
[Citizen] <-- (Push Notification: "Your issue was fixed! See photo.")
```

---

## 14. Google Technologies Integration

- **Google Gemini 2.5 Pro & Vision:** The core brain. Used for Triage (Vision), Duplication (Embeddings), and Inspection (Vision).
- **Firebase Auth:** Identity management.
- **Firebase Firestore:** Real-time sync. Essential for the interactive map so citizens see issues pop up instantly.
- **Firebase Storage:** Handling unstructured image/video data.
- **Google Maps Platform:** Core citizen interface. Places API for reverse geocoding (converting GPS to street address).
- **Google Cloud Run:** Hosts the FastAPI AI orchestration backend, scaling from zero to handle burst traffic during severe weather events.
- **Firebase Hosting:** Distributes the Next.js frontend globally.

---

## 15. Evaluation Mapping (Hackathon Scoring)

- **Problem Solving:** Solves the real-world communication gap between citizens and local government.
- **Agentic Depth:** Goes far beyond a chatbot. Multiple agents (Triage, Integrity, Escalation, Inspector) act autonomously, change database states, and trigger real-world workflows.
- **Innovation:** Using Vision AI to automatically verify a municipal worker's completed job before closing a ticket is a novel, high-impact use case.
- **Google Technologies:** Deeply integrates Gemini, Maps, Firebase, and Cloud Run.
- **UX:** Frictionless citizen experience (snap a photo and done). High-utility authority experience (prioritized, noise-free queue).
- **Technical Implementation:** Microservice-like separation (Next.js client + FastAPI/Python AI Engine) ensures scalability and best practices for AI integration.
- **Completeness:** The architecture covers the entire lifecycle from ingestion to final automated verification and analytics.
