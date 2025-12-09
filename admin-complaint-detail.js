// admin-complaint-detail.js

let complaint = null;

// temp values chosen from popups
let pendingExtendedDeadlineIso = null;
let pendingReassignOfficer = null;

document.addEventListener("DOMContentLoaded", () => {
    initAdminComplaintDetail();

    const escOption = document.getElementById("escalationOption");
    if (escOption) {
        escOption.addEventListener("change", handleEscalationOptionChange);
    }
});

async function initAdminComplaintDetail() {
    const id = localStorage.getItem("adminSelectedComplaintId");
    if (!id) {
        alert("No complaint selected.");
        window.location.href = "admin-dashboard.html";
        return;
    }

    try {
        const res = await apiFetch(`/api/complaints/${id}`);
        if (!res.ok) {
            alert("Failed to load complaint.");
            return;
        }

        complaint = await res.json();
        fillDetails();

    } catch (err) {
        console.error(err);
        alert("Server error loading complaint.");
    }
}

function fillDetails() {
    if (!complaint) return;

    document.getElementById("cTitle").textContent = complaint.subject || "";
    document.getElementById("cDescription").textContent = complaint.description || "";

    document.getElementById("cId").textContent = complaint.id;
    document.getElementById("cCategory").textContent = complaint.category || "-";
    document.getElementById("cPriority").textContent = complaint.priority || "-";
    document.getElementById("cStatus").textContent = complaint.status || "-";
    document.getElementById("cCitizen").textContent = complaint.citizenName || "-";
    document.getElementById("cOfficer").textContent = complaint.assignedStaff || "Not assigned";
    document.getElementById("cCreated").textContent = complaint.createdAt || "-";
    document.getElementById("cUpdated").textContent = complaint.updatedAt || "-";

    // 👉 compute a nice deadline value from deadline or deadlineIso
    let niceDeadline = complaint.deadline || "";
    if ((!niceDeadline || niceDeadline === "-") && complaint.deadlineIso) {
        const d = new Date(complaint.deadlineIso);
        if (!isNaN(d)) {
            niceDeadline = d.toDateString().replace(/,/g, ""); // e.g. "Thu Dec 04 2025"
        }
    }
    document.getElementById("cDeadline").textContent = niceDeadline || "-";

    // ---- IMAGE DISPLAY ----
    const imgSection = document.getElementById("attachmentSection");
    const imgEl = document.getElementById("cImage");

    if (complaint.imagePath && complaint.imagePath.trim() !== "") {
        imgSection.style.display = "block";
        imgEl.src = `http://localhost:8080/api/complaints/${complaint.id}/image`;
    } else {
        imgSection.style.display = "none";
        imgEl.removeAttribute("src");
    }

    // ⭐ NEW: load officer resolution proof (if exists)
    loadResolutionImageForAdmin();

    // ---- PREFILL ASSIGN / DEADLINE / STATUS / COMMENTS ----
    const assignSelect   = document.getElementById("assignOfficerInput");
    const deadlineInput  = document.getElementById("deadlineInput");
    const statusSelect   = document.getElementById("statusSelect");
    const adminComments  = document.getElementById("adminComments");
    const escalationNotes = document.getElementById("escalationNotes");
    const publicNotes    = document.getElementById("publicNotes");

    if (assignSelect) {
        assignSelect.value = complaint.assignedStaff || "";
    }
    if (deadlineInput) {
        deadlineInput.value = complaint.deadlineIso || "";
    }
    if (statusSelect) {
        statusSelect.value = complaint.status || "Under Review";
    }
    if (adminComments) {
        adminComments.value = complaint.adminComments || "";
    }
    if (escalationNotes) {
        escalationNotes.value = complaint.alertMessage || "";
    }
    if (publicNotes) {
        publicNotes.value = complaint.internalNotes || "";
    }

    pendingExtendedDeadlineIso = complaint.deadlineIso || "";
    pendingReassignOfficer = complaint.assignedStaff || "";

    // ---- TIMELINE ----
    updateTimeline(complaint.status);

    // ⭐ LOAD citizen feedback for this complaint
    loadFeedbackForComplaint(complaint.id);
}

function updateTimeline(status) {

    const steps = {
        submitted: document.getElementById("step-submitted"),
        review: document.getElementById("step-review"),
        progress: document.getElementById("step-progress"),
        resolved: document.getElementById("step-resolved")
    };

    // Reset all
    Object.values(steps).forEach(step => {
        if (!step) return;
        step.classList.remove("active", "completed");
    });

    // Always "submitted"
    steps.submitted.classList.add("completed");

    // Normalize status for matching
    const raw = status || "";
    const st = raw.toLowerCase().replace(/\s+/g, " ");

    if (st.includes("under review") || st.includes("review")) {
        steps.review.classList.add("active");

    } else if (st.includes("in progress") || st.includes("progress")) {
        steps.review.classList.add("completed");
        steps.progress.classList.add("active");

    } else if (st.includes("resolved")) {     // ⭐ FIXED HERE
        steps.review.classList.add("completed");
        steps.progress.classList.add("completed");
        steps.resolved.classList.add("active");

    } else if (st.includes("rejected")) {
        steps.review.classList.add("completed");
        steps.progress.classList.add("completed");
    }
}

/* =========================
   Save Changes  ✅
   ========================= */

async function saveChanges() {
    const assignedStaff = document.getElementById("assignOfficerInput").value;
    const deadlineIso   = document.getElementById("deadlineInput").value;
    const status        = document.getElementById("statusSelect").value;
    const adminComments = document.getElementById("adminComments").value;

    // 👉 build pretty deadline string that we show in UI and store in DB
    let prettyDeadline = complaint.deadline || "";
    if (deadlineIso) {
        const d = new Date(deadlineIso);
        if (!isNaN(d)) {
            prettyDeadline = d.toDateString().replace(/,/g, "");
        }
    }

    const body = {
        assignedStaff: assignedStaff,
        deadlineIso:   deadlineIso,
        deadline:      prettyDeadline,      // human-readable
        adminComments: adminComments,
        status:        status               // ✅ new field
    };

    try {
        const res = await apiFetch(`/api/complaints/${complaint.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            if (body.assignedStaff && body.assignedStaff.trim() !== "") {
                addNotification(
                    "officer",
                    body.assignedStaff.trim().toLowerCase(),
                    complaint.id,
                    `A new complaint #${complaint.id} has been assigned to you.`
                );
            }
            alert("Updated successfully.");

            complaint = await res.json();
            fillDetails();             // status + timeline + info refresh
        } else {
            alert("Update failed.");
        }

    } catch (err) {
        console.error(err);
        alert("Server error.");
    }
}

/* =========================
   Escalation handling
   ========================= */

function handleEscalationOptionChange() {
    const option = document.getElementById("escalationOption").value;
    const escSummary = document.getElementById("escSummary");

    if (escSummary) {
        escSummary.textContent = "";
    }

    if (option === "send-alert-extend") {
        openExtendModal();
    } else if (option === "send-alert-reassign") {
        openReassignModal();
    }
}

async function submitEscalation() {
    if (!complaint) return;

    const notesEl     = document.getElementById("escalationNotes");
    const optionEl    = document.getElementById("escalationOption");
    const escSummary  = document.getElementById("escSummary");

    const notes  = notesEl ? notesEl.value.trim() : "";
    const option = optionEl ? optionEl.value : "send-alert";

    const body = {
        isEscalated:  true,
        alertMessage: notes || null,
        lastAlertAt:  new Date().toISOString()
    };

    // If "Send alert + extend deadline"
    if (option === "send-alert-extend") {
        if (!pendingExtendedDeadlineIso) {
            alert("Please choose the new deadline first.");
            openExtendModal();
            return;
        }
        body.deadlineIso = pendingExtendedDeadlineIso;

        // also store a nicely formatted deadline string
        const d = new Date(pendingExtendedDeadlineIso);
        if (!isNaN(d)) {
            body.deadline = d.toDateString().replace(/,/g, "");
        }
    }

    // If "Send alert + reassign officer"
    if (option === "send-alert-reassign") {
        if (!pendingReassignOfficer) {
            alert("Please choose the officer to reassign.");
            openReassignModal();
            return;
        }
        body.assignedStaff = pendingReassignOfficer;
    }

    try {
        const res = await apiFetch(`/api/complaints/${complaint.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            alert("Failed to submit escalation.");
            return;
        }

        // Refresh complaint from backend
        complaint = await res.json();
        fillDetails();

        // =========================================
        // 🔔 NOTIFICATIONS FOR ESCALATION
        // =========================================

        const citizenName = (complaint.citizenName || "").trim().toLowerCase();
        const officerName = (complaint.assignedStaff || "").trim().toLowerCase();
        const baseMsg     = notes || "Escalation raised by admin.";

        // 👉 Notify citizen
        if (citizenName) {
            addNotification(
                "citizen",
                citizenName,
                complaint.id,
                `Your complaint #${complaint.id} has been escalated. ${baseMsg}`
            );
        }

        // 👉 Notify officer (if assigned)
        if (officerName) {
            addNotification(
                "officer",
                officerName,
                complaint.id,
                `Complaint #${complaint.id} has been escalated by admin. ${baseMsg}`
            );
        }

        alert("Escalation submitted.");
        if (escSummary) {
            escSummary.textContent = "Escalation saved successfully.";
        }

    } catch (err) {
        console.error("Error while submitting escalation:", err);
        alert("Server error while submitting escalation.");
    }
}


/* ===== Extend deadline modal ===== */

function openExtendModal() {
    const modal = document.getElementById("extendDeadlineModal");
    const input = document.getElementById("extendDeadlineInput");
    if (modal) modal.classList.add("show");
    if (input) input.value = pendingExtendedDeadlineIso || "";
}

function closeExtendModal() {
    const modal = document.getElementById("extendDeadlineModal");
    if (modal) modal.classList.remove("show");
}

function confirmExtendDeadline() {
    const input = document.getElementById("extendDeadlineInput");
    if (!input || !input.value) {
        alert("Please select a date.");
        return;
    }
    pendingExtendedDeadlineIso = input.value;

    const escSummary = document.getElementById("escSummary");
    if (escSummary) {
        escSummary.textContent = `Selected new deadline: ${pendingExtendedDeadlineIso}`;
    }

    closeExtendModal();
}

/* ===== Reassign officer modal ===== */

function openReassignModal() {
    const modal = document.getElementById("reassignModal");
    const sel   = document.getElementById("reassignOfficerSelect");
    if (modal) modal.classList.add("show");
    if (sel) sel.value = pendingReassignOfficer || "";
}

function closeReassignModal() {
    const modal = document.getElementById("reassignModal");
    if (modal) modal.classList.remove("show");
}

function confirmReassignOfficer() {
    const sel = document.getElementById("reassignOfficerSelect");
    if (!sel || !sel.value) {
        alert("Please select an officer.");
        return;
    }
    pendingReassignOfficer = sel.value;

    const escSummary = document.getElementById("escSummary");
    if (escSummary) {
        escSummary.textContent = `Will reassign to: ${pendingReassignOfficer}`;
    }

    closeReassignModal();
}

/* =========================
   Public notes
   ========================= */

async function savePublicNotes() {
    if (!complaint) return;

    const notesEl = document.getElementById("publicNotes");
    const value   = notesEl ? notesEl.value.trim() : "";

    const body = {
        internalNotes: value || null
    };

    try {
        const res = await apiFetch(`/api/complaints/${complaint.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            alert("Public notes saved.");
            complaint = await res.json();
            fillDetails();
        } else {
            alert("Failed to save public notes.");
        }

    } catch (err) {
        console.error(err);
        alert("Server error while saving notes.");
    }
}

/* =========================
   Citizen Feedback (read-only)
   ========================= */

// Fetch feedback from backend and render it
async function loadFeedbackForComplaint(complaintId) {
    const starsContainer = document.getElementById("feedbackStars");
    const ratingTextEl   = document.getElementById("feedbackRatingText");
    const commentEl      = document.getElementById("feedbackMessageText");

    if (!starsContainer || !ratingTextEl || !commentEl) return;

    try {
        const res = await apiFetch(`/api/feedback/${complaintId}`);
        if (!res.ok) {
            console.warn("[Feedback][Admin] feedback request not OK:", res.status);
            renderFeedback(null, "");
            return;
        }

        const list = await res.json();
        console.log("[Feedback][Admin] feedback list:", list);

        if (!Array.isArray(list) || list.length === 0) {
            renderFeedback(null, "");
            return;
        }

        // choose latest feedback entry
        const fb      = list[list.length - 1];
        const rating  = fb.rating;
        const comment = fb.comments || "";

        renderFeedback(rating, comment);

    } catch (err) {
        console.error("[Feedback][Admin] error loading feedback:", err);
        renderFeedback(null, "");
    }
}

// Draw stars + text based on rating/comment
function renderFeedback(rating, comment) {
    const starsContainer = document.getElementById("feedbackStars");
    const ratingTextEl   = document.getElementById("feedbackRatingText");
    const commentEl      = document.getElementById("feedbackMessageText");

    if (!starsContainer || !ratingTextEl || !commentEl) return;

    // reset stars
    starsContainer.innerHTML = "";

    if (rating === null || rating === undefined || rating === "" || isNaN(Number(rating))) {
        // No rating
        ratingTextEl.textContent = "No rating yet.";
        if (comment && comment.trim()) {
            commentEl.textContent = comment.trim();
            commentEl.classList.remove("feedback-comment-empty");
        } else {
            commentEl.textContent = "No feedback submitted yet.";
            commentEl.classList.add("feedback-comment-empty");
        }
        return;
    }

    const rounded = Math.round(Number(rating));

    for (let i = 1; i <= 5; i++) {
        const span = document.createElement("span");
        span.textContent = "★";
        span.className = "feedback-star";
        if (i <= rounded) {
            span.classList.add("filled");
        }
        starsContainer.appendChild(span);
    }

    ratingTextEl.textContent = `Rating: ${rounded} / 5`;

    if (comment && comment.trim()) {
        commentEl.textContent = comment.trim();
        commentEl.classList.remove("feedback-comment-empty");
    } else {
        commentEl.textContent = "No additional comments.";
        commentEl.classList.add("feedback-comment-empty");
    }
}

/* =========================
   ⭐ NEW: Resolution proof view (admin)
   ========================= */

function loadResolutionImageForAdmin() {
    const section = document.getElementById("resolutionSection");
    const img     = document.getElementById("resolutionImage");

    if (!complaint || !section || !img) return;

    const url = `http://localhost:8080/api/complaints/${complaint.id}/resolution-image?t=${Date.now()}`;

    // Hide by default, show only if image loads
    section.style.display = "none";
    img.removeAttribute("src");

    img.onload = function () {
        section.style.display = "block";
    };
    img.onerror = function () {
        section.style.display = "none";
        img.removeAttribute("src");
    };

    img.src = url;
}
