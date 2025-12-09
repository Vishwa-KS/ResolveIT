# ResolveIT – Smart Grievance & Feedback Management System 🚨

ResolveIT is a role–based grievance redressal system built for campuses / municipalities.  
Citizens can raise complaints with images, officers can update status and upload resolution proofs, and admins can monitor everything with dashboards, charts, escalation alerts, and CSV export.

---

## 🎯 Core Features

### 👤 Citizen Portal
- Login & submit new complaints with:
  - Title, description, category, priority
  - Optional image attachment (stored in `/uploads`)
- View **My Complaints** with:
  - Status badge & priority pill
  - Escalation badge when deadline is crossed
  - Attachment thumbnail
- Track each complaint through a visual **timeline** (Under Review → In Progress → Completed → Resolved)
- Delete own complaints (if required by system rules)

### 🧑‍💼 Officer Portal
- View complaints **assigned** to the logged-in officer
- Update:
  - Status (`Under Review`, `In Progress`, `Completed`, `Resolved`, `Rejected`)
  - Officer notes / internal comments
- See admin alerts (escalation messages, extra instructions)
- Upload **resolution proof image**:
  - Stored as `uploads/resolution/resolution_<complaintId>`
  - Visible to admin / citizen in detail view

### 🛡️ Admin Portal
- System-wide dashboard:
  - Total / Pending / Resolved complaints
  - Status, Category and Priority charts (Chart.js)
  - Recent complaints table with escalation & attachment indicators
- Assign complaints to officers with deadlines
- Extend deadlines, add admin comments, and trigger alerts
- Auto-calculated escalation flag when:
  - Deadline date is crossed and complaint is not resolved
- **Export to CSV**:
  - Button on Admin Dashboard
  - Downloads `complaints_export.csv` with:
    - ID, Subject, Category, Priority, Status, Citizen, Assigned Staff, CreatedAt, UpdatedAt, Deadline

---

## 🧱 Tech Stack

**Frontend**
- HTML5, CSS3, Vanilla JavaScript
- Chart.js for dashboard graphs
- LocalStorage for logged-in user state

**Backend**
- Java 17 / Spring Boot 3.3.x
- Spring Data JPA (Hibernate)
- RESTful APIs (`/api/complaints/...`)
- File upload handling for complaint images and resolution images

**Database**
- MySQL (e.g. `resolveit_db`)
- JPA entities:
  - `Complaint`
  - `User`
  - `Feedback` (if configured)

---

## 🏗️ High-Level Architecture

```text
[Citizen / Officer / Admin Browser]
        |
        |  REST APIs (JSON + multipart/form-data)
        v
[Spring Boot Backend - port 8080]
        |
        |  JPA/Hibernate
        v
[MySQL Database: resolveit_db]

Image files:
    uploads/               → complaint images
    uploads/resolution/    → officer resolution proofs
