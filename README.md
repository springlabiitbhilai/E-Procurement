# E-Procura

A web application for IIT Bhilai that manages **project registration** and **recruitment requests** with role-based approvals. Every approval is a digital signature made in the browser and re-verified on the server, so no record is trusted just because it sits in the database.

## Features

- **Project registration**: a PI submits a signed registration with the sanction order PDF. R&D verifies it, generates a project code, then approves or rejects with their own signature.
- **Recruitment workflow**: a PI raises a signed recruitment request that moves through DRRD, R&D (fund check), DRRD (review), the Dean and DRRD (dispatch) before the PI receives the result.
- **Digital signatures**: RSA-SHA256 signatures created with each user's private key file. Public keys are stored per user and used for every check.
- **Fund control**: the requested amount is blocked in one atomic update at the R&D fund check and released automatically on rejection.
- **Tamper detection**: the PDF hash, the PI signature, every approval signature and the project code are re-checked, and verification banners show the result on screen.
- **Document generation**: approval letters and recruitment advertisements are rendered from EJS templates to PDF with Puppeteer and uploaded to Cloudinary.
- **Pending alerts**: the R&D dashboard shows red badges for project registrations and fund checks that are waiting.

## Tech stack

| Layer | Technology |
| --- | --- |
| Frontend | React, React Router, Axios, Tailwind CSS |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| File storage | Cloudinary |
| PDF generation | EJS templates, Puppeteer (`@sparticuz/chromium` for production) |
| Signatures | Node `crypto` (RSA-SHA256) on the server, Web Crypto in the browser |

## Roles

| Role | Code | What they do |
| --- | --- | --- |
| Principal Investigator | `PI` | Registers projects and raises recruitment requests |
| R&D | `RND` | Approves or rejects registrations, issues project codes, checks and blocks funds |
| DRRD | `DRRD` | Verifies, reviews and dispatches recruitment requests |
| Dean | `DORD` | Gives the final approval or rejection on recruitment requests |

## How the signing works

1. **Sign in the browser.** The user uploads their private key file. The browser builds a payload, signs it and sends only the payload and the signature.
2. **Check before accepting.** The server loads the signer's public key from the logged-in user's own account, verifies the signature, then confirms the payload is bound to this record: the right id, the right action and a hash of what is being approved.
3. **Store and re-verify.** Payload and signature are saved unchanged. Verify endpoints repeat the check from the stored values whenever a screen asks.

The project code and the rejection reason live only inside the R&D signed payload. The database keeps only a counter (`year`, `department`, `sequenceNumber`) used to issue the next code.

For the full flow, tables and diagrams, see the document *E-Procura: Digital Signature and Verification Process*.

## Workflows

**Project registration**

```
PI signs form + pdfHash -> server verifies -> R&D re-checks PI
  -> R&D generates code -> R&D signs (code + hash of PI signature)
  -> server re-verifies PI and R&D, recomputes the code -> saved
```

**Recruitment request**

```
PI -> DRRD verification -> R&D fund check -> DRRD review
   -> Dean decision -> DRRD dispatch -> PI
```

Each approver's server-side check covers the earlier signatures in the chain before their own signature is accepted.

## Key API routes

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/projects?status=PENDING` | List project registrations by status |
| GET | `/api/projects/:id` | One registration (PIs can only open their own) |
| GET | `/api/projects/:id/next-sequence` | Next project code number for the year and department |
| PATCH | `/api/projects/:id/approve` | R&D approval with signed payload |
| PATCH | `/api/projects/:id/reject` | R&D rejection with signed payload |
| GET | `/api/projects/:id/verify-pi` | Re-verify the PI signature |
| GET | `/api/projects/:id/verify-rnd` | Re-verify the R&D signature |
| GET | `/api/files/:id` | Open the sanction order with integrity check |
| GET | `/api/recruitment` | List recruitment requests |
| PUT | `/api/recruitment/:id/fund-check` | R&D fund check with signed payload |

Routes for creating a registration, the DRRD actions and the Dean's decision are defined in the route files.

## Key files

```
backend
  controllers/projectRegistrationController.js   registration, code generation, verify-pi, verify-rnd
  controllers/<recruitment controller>.js         recruitment workflow, DRRD / R&D / Dean actions
  models/projectRegistrationModel.js              piSubmission and rndDecision
  models/recruitmentModel.js                      signed payload, history, stage
  models/user.js                                  user and public key
  utils/recruitmentWorkflow.js                    stages, signature checks, fund blocking
  utils/uploadPdfToCloudinary.js
  templates/*.ejs                                 approval letter, recruitment advertisement

frontend
  pages/.../ProjectSummary.jsx                    summary, verification banners, approve / reject
  pages/.../DashboardRND.jsx                      R&D dashboard with pending badges
  pages/.../RndFundCheckList.jsx                  fund check desk
  components/DecisionModel, WorkflowTracker, BackButton
  utils/digitalSignature, projectData, recruitmentWorkflow
  config/api                                      Axios instance
```

## Getting started

Replace the commands and variable names below with the ones your project uses.

```bash
# backend
cd backend
npm install
npm run dev

# frontend
cd frontend
npm install
npm run dev
```

Typical environment variables for the backend:

```
MONGO_URI=
JWT_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NODE_ENV=development
```

Puppeteer uses the local browser in development. For production, switch to the commented `@sparticuz/chromium` launch block in the controllers.

## Database notes

- `rndDecision` has a unique index on `year`, `department` and `sequenceNumber` so two approvals can never take the same project code.
- The sanctioned amount per fund head comes from the PI's signed `divisionHeads` and is never modified. Blocked amounts are tracked separately in `blockedFunds`, and available fund is sanctioned minus blocked.

## Security notes

- Private keys never leave the user's computer.
- A signature is always checked against the logged-in user's own public key, so one user cannot sign for another.
- Signed data is never edited. State that changes over time (stage, status, blocked funds) is stored beside it, not inside it.

## License

Add your license here.
