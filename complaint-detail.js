// complaint-detail.js  (USER – Complaint Details)

let complaint = null;

document.addEventListener("DOMContentLoaded", initUserComplaintDetail);

async function initUserComplaintDetail() {
    const selectedId = localStorage.getItem("selectedGrievanceId");
    if (!selectedId) {
        window.location.href = "grievances.html";
        return;
    }

    try {
        // Load complaint from backend
        const res = await apiFetch(`/api/complaints/${selectedId}`);
        if (!res.ok) {
            alert("Error loading complaint details from server.");
            window.location.href = "grievances.html";
            return;
        }

        complaint = await res.json();
        if (!complaint) {
            alert("Complaint not found.");
            window.location.href = "grievances.html";
            return;
        }

        fillStaticDetails();
        refreshTimeline();
        refreshEscalationBanner();
        fillUpdatesSection();

    } catch (err) {
        console.error("Error loading complaint details:", err);
        alert("Error loading complaint details.");
        window.location.href = "grievances.html";
    }
}

// ---------- Fill main detail fields ----------
function fillStaticDetails() {
    if (!complaint) return;

    const titleEl    = document.getElementById("cTitle");
    const descEl     = document.getElementById("cDescription");
    const statusEl   = document.getElementById("cStatus");
    const priorityEl = document.getElementById("cPriority");

    titleEl.textContent = complaint.subject || "(No title)";
    descEl.textContent  = complaint.description || "-";

    // Status badge
    const status = complaint.status || "Under Review";
    statusEl.textContent = status.toUpperCase();
    statusEl.className = "status-badge " + mapStatusClass(status);

    // Priority pill
    const priority = complaint.priority || "Medium";
    priorityEl.textContent = priority.toUpperCase();
    priorityEl.className = "priority-pill " + mapPriorityClass(priority);

    // Complaint info
    document.getElementById("cId").textContent =
        "#" + (complaint.ticketNumber || complaint.id);
    document.getElementById("cTracking").textContent =
        "C-" + String(complaint.id || "").slice(-6);
    document.getElementById("cCategory").textContent =
        complaint.category || "Other";
    document.getElementById("cSubmitted").textContent =
        complaint.createdAt || "-";
    document.getElementById("cLastUpdated").textContent =
        complaint.updatedAt || complaint.createdAt || "-";

    let deadlineText = complaint.deadline || "-";
    if (!complaint.deadline && complaint.createdAt) {
        const d = new Date(complaint.createdAt);
        if (!isNaN(d.getTime())) {
            d.setDate(d.getDate() + 2);
            deadlineText = d.toDateString();
        }
    }
    document.getElementById("cDeadline").textContent = deadlineText;

    document.getElementById("cOfficer").textContent =
        complaint.assignedStaff && complaint.assignedStaff !== "Not assigned"
            ? complaint.assignedStaff
            : "Not assigned";

    let reporter = complaint.citizenName || "-";
    if (complaint.submissionType === "anonymous" ||
        complaint.submissionType === "Anonymous") {
        reporter = "Anonymous";
    }
    document.getElementById("cReporter").textContent = reporter;

    // 🔹 Attachment image handling
    const attachmentSection = document.getElementById("attachmentSection");
    const imageEl = document.getElementById("cImage");

    if (attachmentSection && imageEl) {
        if (complaint.imagePath && complaint.imagePath.trim() !== "") {
            // show section & load image from backend
            attachmentSection.style.display = "block";
            imageEl.src = `http://localhost:8080/api/complaints/${complaint.id}/image`;
        } else {
            // hide if no image
            attachmentSection.style.display = "none";
            imageEl.removeAttribute("src");
        }
    }

    /* ⭐ NEW: Resolution proof image (citizen view)
       Uses /api/complaints/{id}/resolution-image
       Only shows section if image actually loads. */
    const resSection = document.getElementById("resolutionSection");
    const resImg     = document.getElementById("resolutionImage");

    if (resSection && resImg && complaint.id != null) {
        const url = `http://localhost:8080/api/complaints/${complaint.id}/resolution-image?t=${Date.now()}`;

        // hide by default
        resSection.style.display = "none";
        resImg.removeAttribute("src");

        resImg.onload = function () {
            resSection.style.display = "block";
        };
        resImg.onerror = function () {
            resSection.style.display = "none";
            resImg.removeAttribute("src");
        };

        resImg.src = url;
    }
}

// ---------- Timeline ----------
function refreshTimeline() {
    if (!complaint) return;

    const stepPending  = document.getElementById("step-pending");
    const stepReview   = document.getElementById("step-review");
    const stepResolved = document.getElementById("step-resolved");

    [stepPending, stepReview, stepResolved].forEach(s => {
        s.classList.remove("completed", "active");
    });

    const st = complaint.status || "Under Review";

    // Simple 3-step timeline for citizen:
    // Pending -> Under Review -> Resolved
    if (st === "Under Review") {
        stepPending.classList.add("completed");
        stepReview.classList.add("active");

    } else if (st === "In Progress" || st === "Completed") {
        stepPending.classList.add("completed");
        stepReview.classList.add("completed");
        stepResolved.classList.add("active");

    } else if (st === "Resolved") {
        stepPending.classList.add("completed");
        stepReview.classList.add("completed");
        stepResolved.classList.add("completed");

    } else if (st === "Rejected") {
        stepPending.classList.add("completed");
        stepReview.classList.add("completed");
        stepResolved.classList.add("active");
    } else {
        // default (pending)
        stepPending.classList.add("active");
    }
}

// ---------- Escalation banner ----------
function refreshEscalationBanner() {
    const banner = document.getElementById("escalationBanner");
    if (!banner || !complaint) return;

    const escalated = isEscalatedForCitizen(complaint);
    banner.style.display = escalated ? "block" : "none";
}

/**
 * Citizen-side escalation check:
 * - DO NOT show banner if status is Resolved/Rejected
 * - Show if:
 *   - complaint.isEscalated === true, OR
 *   - deadlineIso is in the past (and not resolved/rejected)
 */
function isEscalatedForCitizen(c) {
    if (!c) return false;

    const status = c.status || "Under Review";
    if (status === "Resolved" || status === "Rejected") {
        return false; // 🟢 hide banner automatically after resolved/rejected
    }

    if (c.isEscalated === true) return true;

    if (!c.deadlineIso) return false;
    const d = new Date(c.deadlineIso);
    if (isNaN(d.getTime())) return false;

    return new Date() > d;
}

// ---------- Updates & Notes (public) ----------
function fillUpdatesSection() {
    const updateBubble  = document.getElementById("cUpdateBubble");
    const updateTimeEl  = document.getElementById("cUpdateTime");
    const updateTextEl  = document.getElementById("cUpdateText");
    const noUpdateText  = document.getElementById("noUpdateText");

    if (!complaint) {
        updateBubble.style.display = "none";
        noUpdateText.style.display = "block";
        return;
    }

    if (complaint.adminComments && complaint.adminComments.trim() !== "") {
        updateTextEl.textContent = complaint.adminComments;
        updateTimeEl.textContent = complaint.updatedAt || complaint.createdAt || "";
        updateBubble.style.display = "block";
        noUpdateText.style.display = "none";
    } else {
        updateBubble.style.display = "none";
        noUpdateText.style.display = "block";
    }
}

/* ==========================================================
   Helper class mappers
========================================================== */

function mapPriorityClass(priority) {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "priority-high";
    if (p === "low")  return "priority-low";
    return "priority-medium";
}

function mapStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "in progress") return "status-in-progress";
    if (s === "completed")   return "status-completed";
    if (s === "resolved")    return "status-resolved";
    if (s === "rejected")    return "status-rejected";
    return "status-under-review";
}

/* ==========================================================
   ⭐ FEEDBACK SYSTEM (Only added earlier, unchanged)
========================================================== */

let feedbackRating = 0;

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(setupFeedbackSystem, 300);
});

async function setupFeedbackSystem() {
    if (!complaint) return;

    const btn       = document.getElementById("openFeedbackBtn");
    const modal     = document.getElementById("feedbackModal");
    const starRow   = document.getElementById("starRow");
    const cancelBtn = document.getElementById("cancelFeedbackBtn");
    const submitBtn = document.getElementById("submitFeedbackBtn");

    if (!btn || !modal) return;

    // Only show button when status = Resolved
    if (complaint.status !== "Resolved") {
        btn.style.display = "none";
        return;
    }

    // Load feedback to avoid duplicates
    try {
        const res = await apiFetch(`/api/feedback/${complaint.id}`);
        if (res.ok) {
            const fb = await res.json();
            if (fb.length > 0) {
                btn.style.display = "none"; // Already rated
                return;
            }
        }
    } catch (e) { }

    btn.style.display = "inline-flex";

    // Open modal
    btn.onclick = () => {
        feedbackRating = 0;
        document.querySelectorAll(".star").forEach(s => s.classList.remove("active"));
        document.getElementById("feedbackNotes").value = "";
        modal.classList.add("show");
    };

    // Star selection
    starRow.querySelectorAll(".star").forEach(st => {
        st.addEventListener("click", () => {
            feedbackRating = Number(st.dataset.value);
            starRow.querySelectorAll(".star").forEach(s => {
                s.classList.toggle("active", Number(s.dataset.value) <= feedbackRating);
            });
        });
    });

    // Cancel
    cancelBtn.onclick = () => modal.classList.remove("show");

    // Submit
    submitBtn.onclick = submitFeedback;
}

async function submitFeedback() {
    if (!complaint) return;

    if (feedbackRating < 1) {
        alert("Please choose a star rating.");
        return;
    }

    const notes = document.getElementById("feedbackNotes").value.trim();
    const user  = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const body = {
        citizenName: user.name || "Citizen",
        rating:      feedbackRating,
        comments:    notes
    };

    try {
        const res = await apiFetch(`/api/feedback/${complaint.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            alert("Could not submit feedback.");
            return;
        }

        alert("Thank you for your feedback!");

        document.getElementById("feedbackModal").classList.remove("show");
        document.getElementById("openFeedbackBtn").style.display = "none";

    } catch (err) {
        console.error(err);
        alert("Server error while saving feedback.");
    }
}
