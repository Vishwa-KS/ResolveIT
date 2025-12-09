// dashboard.js

let myComplaints = [];

// =======================
// GET CURRENT USER
// =======================
function getCurrentUser() {
    // 1) New format: full user from backend
    const rawLogged = localStorage.getItem("loggedInUser");
    if (rawLogged) {
        try {
            return JSON.parse(rawLogged);
        } catch (e) {
            console.error("Failed to parse loggedInUser:", e);
        }
    }

    // 2) Old format: { username, accountType } from currentUser
    const rawCurrent = localStorage.getItem("currentUser");
    if (rawCurrent) {
        try {
            const u = JSON.parse(rawCurrent);
            return {
                id: u.id || null,
                name: u.name || u.username || "",
                username: u.username || u.name || "",
                role: u.role || (u.accountType ? u.accountType.toUpperCase() : "CITIZEN")
            };
        } catch (e) {
            console.error("Failed to parse currentUser:", e);
        }
    }

    return null;
}

// =======================
// LOAD DASHBOARD DATA
// (Fetch all complaints, filter by citizenName ~ current user)
// =======================
async function loadDashboardData() {
    const user = getCurrentUser();
    console.log("Dashboard user:", user);

    if (!user) {
        alert("Please login again.");
        window.location.href = "front.html";
        return;
    }

    const name = (user.name || "").trim();
    const username = (user.username || "").trim();

    console.log("User name =", name, "username =", username);

    // helper to normalise strings for comparison
    const norm = s => (s || "").trim().toLowerCase();

    try {
        const url = "http://localhost:8080/api/complaints";
        console.log("Fetching ALL complaints from:", url);

        const res = await fetch(url);

        if (!res.ok) {
            console.error("Failed to load complaints:", res.status);
            myComplaints = [];
            return;
        }

        const allComplaints = (await res.json()) || [];
        console.log("All complaints from backend:", allComplaints);

        // Filter complaints for this user (very forgiving matching)
        let filtered = allComplaints.filter(c => {
            const cn = norm(c.citizenName);
            const nm = norm(name);
            const un = norm(username);

            if (!cn) return false;

            // exact match (case-insensitive)
            if (nm && cn === nm) return true;
            if (un && cn === un) return true;

            // partial match (e.g., "vishwa" inside "vishwa k s" or vice versa)
            if (nm && (cn.includes(nm) || nm.includes(cn))) return true;
            if (un && (cn.includes(un) || un.includes(cn))) return true;

            return false;
        });

        // If nothing matched, fall back to ALL complaints (for demo/review)
        if (!filtered || filtered.length === 0) {
            console.warn(
                "No user-specific complaints matched. Falling back to ALL complaints for display."
            );
            filtered = allComplaints;
        }

        myComplaints = filtered;
        console.log("Final myComplaints for user:", myComplaints);
    } catch (err) {
        console.error("Error loading dashboard complaints:", err);
        myComplaints = [];
    }
}

// =======================
// CSV DOWNLOAD
// =======================
function setupCsvDownload() {
    const btn = document.getElementById("downloadCsvBtn");
    if (!btn) return;

    btn.addEventListener("click", function () {
        if (!myComplaints || myComplaints.length === 0) {
            alert("No complaints to export.");
            return;
        }

        const header = [
            "ID",
            "Subject",
            "Category",
            "Priority",
            "Status",
            "Created At"
        ];

        const rows = myComplaints.map(c => [
            c.id,
            (c.subject || "").replace(/"/g, '""'),
            c.category || "",
            c.priority || "",
            c.status || "",
            c.createdAt || ""
        ]);

        let csv = header.join(",") + "\n";
        rows.forEach(r => {
            csv += r.map(field => `"${field}"`).join(",") + "\n";
        });

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = "my-complaints.csv";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    });
}

// =======================
// TRACK COMPLAINT
// =======================
function setupTrackComplaint() {
    const openBtn     = document.getElementById("openTrackModalBtn");
    const trackModal  = document.getElementById("trackModal");
    const resultModal = document.getElementById("trackResultModal");

    const trackSelect    = document.getElementById("trackSelect");
    const trackError     = document.getElementById("trackError");
    const trackNextBtn   = document.getElementById("trackNextBtn");
    const trackCancelBtn = document.getElementById("trackCancelBtn");
    const trackCloseBtn  = document.getElementById("trackCloseBtn");

    const statusMessageEl = document.getElementById("trackStatusMessage");
    const statusChipEl    = document.getElementById("trackStatusChip");
    const priorityChipEl  = document.getElementById("trackPriorityChip");
    const createdEl       = document.getElementById("trackCreated");
    const updatedEl       = document.getElementById("trackUpdated");
    const deadlineEl      = document.getElementById("trackDeadline");
    const titleEl         = document.getElementById("trackResultTitle");

    if (!openBtn || !trackModal || !resultModal || !trackSelect) return;

    function fillTrackDropdown() {
        trackSelect.innerHTML = "";

        if (!myComplaints || myComplaints.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No complaints available";
            trackSelect.appendChild(opt);
            trackSelect.disabled = true;
            return;
        }

        trackSelect.disabled = false;

        myComplaints
            .slice()
            .sort((a, b) => (b.id || 0) - (a.id || 0))
            .forEach(c => {
                const opt = document.createElement("option");
                opt.value = c.id;
                opt.textContent = `#${c.id} - ${c.subject} (${c.status || "Under Review"})`;
                trackSelect.appendChild(opt);
            });
    }

    // Open first modal
    openBtn.addEventListener("click", () => {
        trackError.textContent = "";
        fillTrackDropdown();
        trackModal.style.display = "flex";
    });

    // Cancel first modal
    trackCancelBtn.addEventListener("click", () => {
        trackModal.style.display = "none";
    });

    // Close result modal
    trackCloseBtn.addEventListener("click", () => {
        resultModal.style.display = "none";
    });

    // View Status
    trackNextBtn.addEventListener("click", () => {
        const id = trackSelect.value;
        if (!id) {
            trackError.textContent = "Please select a complaint.";
            return;
        }

        const complaint = myComplaints.find(c => String(c.id) === String(id));
        if (!complaint) {
            trackError.textContent = "Complaint not found.";
            return;
        }

        trackError.textContent = "";

        // Fill result
        titleEl.textContent = `Complaint #${complaint.id} Status`;
        statusMessageEl.textContent =
            `Your complaint "${complaint.subject}" is currently ${complaint.status || "Under Review"}.`;

        statusChipEl.textContent   = complaint.status || "Under Review";
        priorityChipEl.textContent = complaint.priority || "Medium";

        createdEl.textContent  = complaint.createdAt || "-";
        updatedEl.textContent  = complaint.updatedAt || "-";
        deadlineEl.textContent = complaint.deadline || "-";

        // Basic styling hooks (if you define CSS)
        const st = (complaint.status || "").toLowerCase();
        statusChipEl.className = "status-chip";
        if (st.includes("resolved")) statusChipEl.classList.add("status-resolved");
        else if (st.includes("progress")) statusChipEl.classList.add("status-progress");
        else statusChipEl.classList.add("status-review");

        const pr = (complaint.priority || "Medium").toLowerCase();
        priorityChipEl.className = "priority-chip";
        if (pr === "high") priorityChipEl.classList.add("priority-high");
        else if (pr === "low") priorityChipEl.classList.add("priority-low");
        else priorityChipEl.classList.add("priority-medium");

        // Activate timeline dots based on status
        const steps = {
            submitted: document.getElementById("t-step-submitted"),
            review:    document.getElementById("t-step-review"),
            progress:  document.getElementById("t-step-progress"),
            resolved:  document.getElementById("t-step-resolved")
        };

        Object.values(steps).forEach(step => {
            if (!step) return;
            step.classList.remove("active");
        });

        if (steps.submitted) steps.submitted.classList.add("active");
        if (st.includes("review") && steps.review) steps.review.classList.add("active");
        if (st.includes("progress") && steps.progress) steps.progress.classList.add("active");
        if (st.includes("resolved") && steps.resolved) {
            steps.review && steps.review.classList.add("active");
            steps.progress && steps.progress.classList.add("active");
            steps.resolved.classList.add("active");
        }

        // Switch modals
        trackModal.style.display = "none";
        resultModal.style.display = "flex";
    });

    // Click outside to close
    [trackModal, resultModal].forEach(modal => {
        modal.addEventListener("click", e => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    });
}

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", async function () {
    await loadDashboardData();  // load complaints first
    setupCsvDownload();
    setupTrackComplaint();
});
