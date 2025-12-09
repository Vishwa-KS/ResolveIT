// officer-dashboard.js

document.addEventListener("DOMContentLoaded", async function () {

    const tbody       = document.getElementById("officer-grievances-body");
    const table       = document.getElementById("officer-grievances-table");
    const noDataMsg   = document.getElementById("no-data");

    const totalCountEl    = document.getElementById("totalCount");
    const pendingCountEl  = document.getElementById("pendingCount");
    const resolvedCountEl = document.getElementById("resolvedCount");
    const officerEmailEl  = document.getElementById("officerEmail");

    // ---- Get current logged in officer ----
    const currentUser = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
    if (!currentUser || currentUser.role !== "OFFICER") {
        window.location.href = "index.html";
        return;
    }

    // IMPORTANT: use username as identifier (matches admin dropdown values: officer1/officer2)
    const officerIdentifier = (currentUser.username || currentUser.name || "").trim();
    if (officerEmailEl) {
        officerEmailEl.textContent = officerIdentifier;
    }

    // ---- Load complaints assigned to this officer from backend ----
    let complaints = [];

    try {
        const res = await apiFetch(
            `/api/complaints/officer/${encodeURIComponent(officerIdentifier)}`
        );

        if (!res.ok) {
            console.error("Failed to load officer complaints. Status:", res.status);
            showEmpty("Error loading complaints.");
            return;
        }

        complaints = await res.json();
        console.log("Officer complaints loaded:", complaints.length);
    } catch (err) {
        console.error("Error loading officer complaints:", err);
        showEmpty("Error loading complaints.");
        return;
    }

    if (!complaints || complaints.length === 0) {
        showEmpty("No complaints assigned to you yet.");
        return;
    }

    // ---- Stats ----
    const total = complaints.length;

    // Officer: treat "Completed" and "Resolved" as done
    const resolved = complaints.filter(c =>
        c.status === "Completed" || c.status === "Resolved"
    ).length;

    const pending = complaints.filter(c =>
        c.status === "Under Review" ||
        c.status === "In Progress" ||
        (!c.status ||
            (c.status !== "Completed" &&
             c.status !== "Resolved" &&
             c.status !== "Rejected"))
    ).length;

    totalCountEl.textContent    = total;
    pendingCountEl.textContent  = pending;
    resolvedCountEl.textContent = resolved;

    // ---- Sort: newest first ----
    complaints.sort((a, b) => {
        if (a.createdAt && b.createdAt) {
            return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return (b.id || 0) - (a.id || 0);
    });

    // ---- Fill table ----
    tbody.innerHTML = "";
    table.style.display     = "table";
    noDataMsg.style.display = "none";

    complaints.forEach((c) => {
        const tr = document.createElement("tr");

        const priority = (c.priority || "Medium").toLowerCase();
        const status   = c.status || "Under Review";
        const category = c.category || "Other";

        const priorityClass =
            priority === "high" ? "priority-high" :
            priority === "low"  ? "priority-low"  :
                                  "priority-medium";

        const statusKey = status.toLowerCase().replace(/\s+/g, "-");
        const statusClass =
            statusKey === "under-review" ? "status-under-review" :
            statusKey === "in-progress"  ? "status-in-progress"  :
            statusKey === "completed"    ? "status-completed"    :
            statusKey === "resolved"     ? "status-resolved"     :
                                           "status-rejected";

        // ⭐ Escalation (same logic style as user/admin)
        const escalated = isEscalatedComplaint(c);
        const escalationHtml = escalated
            ? `<span class="esc-badge">Escalated</span>`
            : `<span class="no-escalation">—</span>`;

        // ⭐ Attachment thumbnail (same style as admin)
        let attachmentHtml = "";
        if (c.imagePath && String(c.imagePath).trim() !== "") {
            const imgUrl = `http://localhost:8080/api/complaints/${c.id}/image`;
            attachmentHtml = `
                <div class="attachment-cell">
                    <img src="${imgUrl}" alt="Attachment" class="attachment-thumb">
                </div>
            `;
        } else {
            attachmentHtml = `<span class="attachment-none">—</span>`;
        }

        tr.innerHTML = `
            <td>#${c.id}</td>
            <td>${c.subject || "-"}</td>
            <td>${category}</td>
            <td>
                <span class="priority-pill ${priorityClass}">
                    ${priority.charAt(0).toUpperCase() + priority.slice(1)}
                </span>
            </td>
            <td>
                <span class="status-pill ${statusClass}">
                    ${status}
                </span>
            </td>
            <td>${escalationHtml}</td>
            <td>${attachmentHtml}</td>
            <td>${c.createdAt || "-"}</td>
        `;

        // Row click → go to officer complaint detail page
        tr.style.cursor = "pointer";
        tr.addEventListener("click", function () {
            localStorage.setItem("selectedGrievanceId", String(c.id));
            window.location.href = "officer-complaint-detail.html";
        });

        tbody.appendChild(tr);
    });

    // ---- Charts (safe: only if Chart.js loaded) ----
    try {
        if (typeof Chart !== "undefined") {
            buildOfficerCharts(complaints);
        }
    } catch (e) {
        console.warn("Chart build failed or Chart.js not available:", e);
    }

    // ---- Helper to show empty state ----
    function showEmpty(msg) {
        table.style.display = "none";
        noDataMsg.style.display = "block";
        noDataMsg.textContent = msg;
        totalCountEl.textContent    = "0";
        pendingCountEl.textContent  = "0";
        resolvedCountEl.textContent = "0";
    }
});

// Build small charts for officer dashboard
function buildOfficerCharts(complaints) {
    if (!complaints || complaints.length === 0) return;

    // Status distribution
    const statusCounts = {};
    complaints.forEach(c => {
        const st = c.status || "Under Review";
        statusCounts[st] = (statusCounts[st] || 0) + 1;
    });

    const statusCtx = document.getElementById("statusChart");
    if (statusCtx) {
        new Chart(statusCtx, {
            type: "doughnut",
            data: {
                labels: Object.keys(statusCounts),
                datasets: [{
                    data: Object.values(statusCounts)
                }]
            },
            options: {
                plugins: { legend: { position: "bottom" } }
            }
        });
    }

    // Category chart
    const catCounts = {};
    complaints.forEach(c => {
        const cat = c.category || "Other";
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    const categoryCtx = document.getElementById("categoryChart");
    if (categoryCtx) {
        new Chart(categoryCtx, {
            type: "bar",
            data: {
                labels: Object.keys(catCounts),
                datasets: [{
                    data: Object.values(catCounts)
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { autoSkip: false } } }
            }
        });
    }

    // Priority chart
    const priCounts = {};
    complaints.forEach(c => {
        const p = c.priority || "Medium";
        priCounts[p] = (priCounts[p] || 0) + 1;
    });

    const priorityCtx = document.getElementById("priorityChart");
    if (priorityCtx) {
        new Chart(priorityCtx, {
            type: "bar",
            data: {
                labels: Object.keys(priCounts),
                datasets: [{
                    data: Object.values(priCounts)
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { x: { ticks: { autoSkip: false } } }
            }
        });
    }
}

/**
 * Decide whether this complaint should show an "Escalated" badge
 * for OFFICER view.
 *
 * Logic is aligned with user/admin:
 *  - Do NOT show when status is Resolved / Completed / Rejected.
 *  - Show if:
 *      • deadlineIso is in the past (overdue), OR
 *      • isEscalated is true and no deadline is set.
 *  - If admin extends the deadline into the future, the badge disappears
 *    automatically next time this page loads.
 */
function isEscalatedComplaint(c) {
    if (!c) return false;

    const status = c.status || "Under Review";
    if (status === "Resolved" || status === "Rejected" || status === "Completed") {
        return false;
    }

    let hasPastDeadline = false;
    if (c.deadlineIso) {
        const d = new Date(c.deadlineIso);
        if (!isNaN(d.getTime())) {
            hasPastDeadline = new Date() > d;
        }
    }

    if (hasPastDeadline) return true;

    if (c.isEscalated === true && !c.deadlineIso) return true;

    return false;
}
