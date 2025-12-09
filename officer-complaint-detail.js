// officer-complaint-detail.js

let complaint = null;
let actionMessageEl = null;

// DOM refs
let statusEl, priorityEl;
let statusSelect, officerNotes;
let adminAlertBox, adminAlertMessage, adminAlertTime;

// ⭐ NEW: resolution-related refs
let resolutionSection, resolutionImage;
let resolutionInput, resolutionPreview, resolutionPreviewWrapper, uploadResolutionBtn;

document.addEventListener("DOMContentLoaded", initOfficerComplaintDetail);

async function initOfficerComplaintDetail() {
    // Check officer login
    const currentUser = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
    if (!currentUser || currentUser.role !== "OFFICER") {
        window.location.href = "index.html";
        return;
    }

    const officerIdentifier = (currentUser.username || currentUser.name || "").trim();

    const selectedId = localStorage.getItem("selectedGrievanceId");
    if (!selectedId) {
        window.location.href = "officer-dashboard.html";
        return;
    }

    try {
        const res = await apiFetch(`/api/complaints/${selectedId}`);
        if (!res.ok) {
            alert("Error loading complaint details from server.");
            window.location.href = "officer-dashboard.html";
            return;
        }

        complaint = await res.json();
        if (!complaint) {
            alert("Complaint not found.");
            window.location.href = "officer-dashboard.html";
            return;
        }

        // Extra safety: ensure this complaint is assigned to this officer
        const assigned = (complaint.assignedStaff || "").trim().toLowerCase();
        if (!assigned || assigned !== officerIdentifier.toLowerCase()) {
            alert("This complaint is not assigned to you anymore.");
            window.location.href = "officer-dashboard.html";
            return;
        }

        bindElements();
        fillStaticDetails();
        fillAdminAlert();
        fillRightPaneControls();
        refreshTimeline();

        // ⭐ NEW: try loading resolution proof image (if backend has it)
        loadExistingResolutionImage();

    } catch (err) {
        console.error("Error loading officer complaint details:", err);
        alert("Error loading complaint details.");
        window.location.href = "officer-dashboard.html";
    }
}

function bindElements() {
    statusEl = document.getElementById("cStatus");
    priorityEl = document.getElementById("cPriority");
    actionMessageEl = document.getElementById("actionMessage");

    statusSelect = document.getElementById("statusSelect");
    officerNotes = document.getElementById("officerNotes");

    adminAlertBox = document.getElementById("adminAlertBox");
    adminAlertMessage = document.getElementById("adminAlertMessage");
    adminAlertTime = document.getElementById("adminAlertTime");

    // ⭐ NEW: resolution DOM refs
    resolutionSection        = document.getElementById("resolutionSection");
    resolutionImage          = document.getElementById("resolutionImage");
    resolutionInput          = document.getElementById("resolutionImageInput");
    resolutionPreview        = document.getElementById("resolutionPreview");
    resolutionPreviewWrapper = document.getElementById("resolutionPreviewWrapper");
    uploadResolutionBtn      = document.getElementById("uploadResolutionBtn");

    // Existing buttons
    document.getElementById("saveUpdatesBtn")
        .addEventListener("click", onSaveUpdates);
    document.getElementById("markCompletedBtn")
        .addEventListener("click", onMarkCompleted);

    // ⭐ NEW: bind upload events
    if (resolutionInput) {
        resolutionInput.addEventListener("change", onResolutionFileChange);
    }
    if (uploadResolutionBtn) {
        uploadResolutionBtn.addEventListener("click", onUploadResolution);
    }
}

// ------ LEFT PANE (static details) ------
function fillStaticDetails() {
    if (!complaint) return;

    document.getElementById("cTitle").textContent =
        complaint.subject || "(No title)";
    document.getElementById("cDescription").textContent =
        complaint.description || "-";

    // status badge
    const status = complaint.status || "Under Review";
    statusEl.textContent = status.toUpperCase();
    statusEl.className = "status-badge " + mapStatusClass(status);

    // priority pill
    const priority = complaint.priority || "Medium";
    priorityEl.textContent = priority.toUpperCase();
    priorityEl.className = "priority-pill " + mapPriorityClass(priority);

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

    // info block
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
}

// ------ Admin alert section ------
function fillAdminAlert() {
    if (!adminAlertBox || !complaint) return;

    if (complaint.alertMessage && complaint.alertMessage.trim() !== "") {
        adminAlertBox.style.display = "block";
        adminAlertMessage.textContent = complaint.alertMessage;
        adminAlertTime.textContent = complaint.lastAlertAt
            ? "Sent by Admin on: " + complaint.lastAlertAt
            : "";
    } else {
        adminAlertBox.style.display = "none";
    }
}

// ------ RIGHT PANE controls ------
function fillRightPaneControls() {
    if (!complaint) return;

    const status = complaint.status || "Under Review";
    if ([...statusSelect.options].some(o => o.value === status)) {
        statusSelect.value = status;
    } else {
        statusSelect.value = "Under Review";
    }

    officerNotes.value = complaint.officerNotes || "";
}

// ------ Class helpers ------
function mapPriorityClass(priority) {
    const p = (priority || "").toLowerCase();
    if (p === "high") return "priority-high";
    if (p === "low") return "priority-low";
    return "priority-medium";
}

function mapStatusClass(status) {
    const s = (status || "").toLowerCase();
    if (s === "in progress") return "status-in-progress";
    if (s === "completed") return "status-completed";
    if (s === "resolved") return "status-resolved";
    if (s === "rejected") return "status-rejected";
    return "status-under-review";
}

// ------ Timeline ------
function refreshTimeline() {
    if (!complaint) return;

    const stepPending  = document.getElementById("step-pending");
    const stepReview   = document.getElementById("step-review");
    const stepProgress = document.getElementById("step-progress");
       const stepResolved = document.getElementById("step-resolved");

    [stepPending, stepReview, stepProgress, stepResolved].forEach(s => {
        s.classList.remove("completed", "active");
    });

    stepPending.classList.add("completed");

    const st = complaint.status || "Under Review";

    if (st === "Under Review") {
        stepReview.classList.add("active");
    } else if (st === "In Progress") {
        stepReview.classList.add("completed");
        stepProgress.classList.add("active");
    } else if (st === "Completed") {
        stepReview.classList.add("completed");
        stepProgress.classList.add("completed");
        stepResolved.classList.add("active"); // waiting for admin closure
    } else if (st === "Resolved") {
        stepReview.classList.add("completed");
        stepProgress.classList.add("completed");
        stepResolved.classList.add("completed");
    } else if (st === "Rejected") {
        stepReview.classList.add("completed");
        stepProgress.classList.add("completed");
        stepResolved.classList.add("active");
    }
}

// ------ Save to backend helper for officer ------
async function saveOfficerComplaint(successMsg) {
    if (!complaint) return;

    try {
        // send all relevant fields so backend doesn't lose anything
        const payload = {
            status:        complaint.status,
            priority:      complaint.priority,
            category:      complaint.category,
            adminComments: complaint.adminComments,
            internalNotes: complaint.internalNotes,
            deadline:      complaint.deadline,
            deadlineIso:   complaint.deadlineIso,
            alertMessage:  complaint.alertMessage,
            lastAlertAt:   complaint.lastAlertAt,
            isEscalated:   complaint.isEscalated,
            officerNotes:  complaint.officerNotes,
            assignedStaff: complaint.assignedStaff
        };

        const res = await apiFetch(`/api/complaints/${complaint.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            throw new Error("Server returned " + res.status);
        }

        // refresh from server (updatedAt changed)
        complaint = await res.json();

        fillStaticDetails();
        fillAdminAlert();
        fillRightPaneControls();
        refreshTimeline();
        showActionMessage(successMsg, false);

    } catch (err) {
        console.error("Officer save error:", err);
        showActionMessage("Failed to save changes on server.", true);
    }
}

function showActionMessage(msg, isError) {
    if (!actionMessageEl) return;
    actionMessageEl.textContent = msg;
    actionMessageEl.style.color = isError ? "#c62828" : "#2e7d32";
}

// ------ Button handlers ------

// Save updates (status + notes)
function onSaveUpdates() {
    if (!complaint) return;

    complaint.status = statusSelect.value;
    complaint.officerNotes = officerNotes.value.trim();

    saveOfficerComplaint("Updates saved successfully.");
}

// Mark as Completed (Officer)
function onMarkCompleted() {
    if (!complaint) return;

    complaint.status = "Completed";
    statusSelect.value = "Completed";

    if (!complaint.officerNotes || complaint.officerNotes.trim() === "") {
        complaint.officerNotes = "Work completed by officer.";
        officerNotes.value = complaint.officerNotes;
    }

    saveOfficerComplaint("Marked as Completed by Officer. Waiting for admin closure.");
}

/* =======================================================
   ⭐ NEW: Resolution proof upload & preview
======================================================= */

// Try to load existing resolution proof from backend
function loadExistingResolutionImage() {
    if (!complaint || !resolutionSection || !resolutionImage) return;

    const url = `http://localhost:8080/api/complaints/${complaint.id}/resolution-image?t=${Date.now()}`;

    // Only show section if image actually loads
    resolutionSection.style.display = "none";

    resolutionImage.onload = function () {
        resolutionSection.style.display = "block";
    };
    resolutionImage.onerror = function () {
        resolutionSection.style.display = "none";
    };

    resolutionImage.src = url;
}

// Handle local file change → show preview before upload
function onResolutionFileChange() {
    if (!resolutionInput || !resolutionPreview || !resolutionPreviewWrapper) return;

    const file = resolutionInput.files && resolutionInput.files[0];
    if (!file) {
        resolutionPreviewWrapper.style.display = "none";
        resolutionPreview.src = "";
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        resolutionPreview.src = e.target.result;
        resolutionPreviewWrapper.style.display = "block";
    };
    reader.readAsDataURL(file);
}

// Upload resolution image to backend
async function onUploadResolution() {
    if (!complaint || !resolutionInput) return;

    const file = resolutionInput.files && resolutionInput.files[0];
    if (!file) {
        showActionMessage("Please choose an image file first.", true);
        return;
    }

    try {
        const formData = new FormData();
        // 🔑 MUST MATCH @RequestPart("file") IN BACKEND
        formData.append("file", file);

        // Use plain fetch so we don't force JSON headers
        const res = await fetch(`http://localhost:8080/api/complaints/${complaint.id}/resolution-image`, {
            method: "POST",
            body: formData
            // No Content-Type header here – browser will set multipart boundary automatically
        });

        if (!res.ok) {
            throw new Error("Resolution upload failed with status " + res.status);
        }

        showActionMessage("Resolution image uploaded successfully.", false);

        // Clear local preview and input
        resolutionInput.value = "";
        if (resolutionPreviewWrapper) {
            resolutionPreviewWrapper.style.display = "none";
        }
        if (resolutionPreview) {
            resolutionPreview.src = "";
        }

        // Refresh preview from server-side image
        loadExistingResolutionImage();

    } catch (err) {
        console.error("Resolution upload error:", err);
        showActionMessage("Failed to upload resolution image.", true);
    }
}
