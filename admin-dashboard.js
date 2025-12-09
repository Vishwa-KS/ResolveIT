// =====================
// ADMIN DASHBOARD JS
// =====================

document.addEventListener("DOMContentLoaded", initAdminDashboard);

async function initAdminDashboard() {
    const currentUser = getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
        window.location.href = "index.html";
        return;
    }

    document.getElementById("adminEmail").textContent =
        currentUser.name || currentUser.username || "";

    loadAdminNotifications();

    const tbody     = document.getElementById("admin-grievances-body");
    const table     = document.getElementById("admin-grievances-table");
    const noDataMsg = document.getElementById("no-data");

    const totalCountEl    = document.getElementById("totalCount");
    const pendingCountEl  = document.getElementById("pendingCount");
    const resolvedCountEl = document.getElementById("resolvedCount");

    // ⭐ NEW: CSV export button
    const exportBtn = document.getElementById("exportCsvBtn");
    if (exportBtn) {
        exportBtn.addEventListener("click", downloadAdminCsv);
    }

    let complaints = [];

    try {
        const res = await apiFetch("/api/complaints");
        complaints = await res.json();
    } catch (err) {
        console.error(err);
        showEmpty("Error loading complaints.");
        return;
    }

    if (!complaints || complaints.length === 0) {
        showEmpty("No complaints found.");
        return;
    }

    // ============================
    // CALCULATE ESCALATION STATUS
    // ============================
    complaints.forEach(c => {
        if (!c.deadlineIso) {
            c.isEscalated = false;
            return;
        }
        const d = new Date(c.deadlineIso);
        c.isEscalated = new Date() > d && c.status !== "Resolved";
    });

    // ============================
    // SHOW STATS
    // ============================
    const total    = complaints.length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;
    const pending  = complaints.filter(c =>
        c.status === "Under Review" || c.status === "In Progress"
    ).length;

    totalCountEl.textContent    = total;
    pendingCountEl.textContent  = pending;
    resolvedCountEl.textContent = resolved;

    // ============================
    // SORT BY ID ASCENDING
    // ============================
    complaints.sort((a, b) => {
        const idA = a.id || 0;
        const idB = b.id || 0;
        return idA - idB;
    });

    // ============================
    // DISPLAY TABLE
    // ============================
    table.style.display = "table";
    noDataMsg.style.display = "none";
    tbody.innerHTML = "";

    complaints.forEach(c => {
        const tr = document.createElement("tr");

        const status = c.status || "-";
        const statusClass = ("status-" + status.toLowerCase().replace(" ", "-"));

        // ⭐ ESCALATION BADGE (own column)
        const escBadge = c.isEscalated
            ? `<span class="esc-badge">Escalated</span>`
            : `<span class="esc-none">—</span>`;

        // ⭐ Attachment thumbnail
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
            <td>${c.category || "-"}</td>
            <td>${c.priority || "-"}</td>
            <td>
                <span class="status-pill ${statusClass}">
                    ${status}
                </span>
            </td>
            <td class="esc-col-cell">
                ${escBadge}
            </td>
            <td class="attachment-col-cell">
                ${attachmentHtml}
            </td>
            <td>${c.createdAt || "-"}</td>
       `;

        // ✅ Open detail page on row click
        tr.addEventListener("click", () => {
            localStorage.setItem("adminSelectedComplaintId", c.id);
            window.location.href = "admin-complaint-detail.html";
        });

        tbody.appendChild(tr);
    });

    // ============================
    // UPDATE ADMIN NOTIFICATIONS
    // ============================
    updateAdminEscalationNotifications(complaints);

    // ============================
    // DRAW CHARTS
    // ============================
    drawAdminCharts(complaints);

    // ============================
    // HELPER
    // ============================
    function showEmpty(msg) {
        table.style.display = "none";
        noDataMsg.style.display = "block";
        noDataMsg.textContent = msg;
        totalCountEl.textContent    = "0";
        pendingCountEl.textContent  = "0";
        resolvedCountEl.textContent = "0";
    }
}

// ================================
// ADMIN — CREATE CHARTS
// ================================

function drawAdminCharts(complaints) {
    // STATUS CHART
    const statusCounts = {
        "Under Review": 0,
        "In Progress": 0,
        "Completed": 0,
        "Resolved": 0
    };

    complaints.forEach(c => {
        const status = c.status || "Under Review";
        if (statusCounts[status] !== undefined) {
            statusCounts[status]++;
        }
    });

    new Chart(document.getElementById("statusChart"), {
        type: "pie",
        data: {
            labels: Object.keys(statusCounts),
            datasets: [{
                data: Object.values(statusCounts)
            }]
        }
    });

    // CATEGORY CHART
    const catCounts = {};
    complaints.forEach(c => {
        const cat = c.category || "Other";
        catCounts[cat] = (catCounts[cat] || 0) + 1;
    });

    new Chart(document.getElementById("categoryChart"), {
        type: "bar",
        data: {
            labels: Object.keys(catCounts),
            datasets: [{
                data: Object.values(catCounts)
            }]
        }
    });

    // PRIORITY CHART
    const prCounts = {};
    complaints.forEach(c => {
        const p = c.priority || "Medium";
        prCounts[p] = (prCounts[p] || 0) + 1;
    });

    new Chart(document.getElementById("priorityChart"), {
        type: "doughnut",
        data: {
            labels: Object.keys(prCounts),
            datasets: [{
                data: Object.values(prCounts)
            }]
        }
    });
}

// ================================
// ADMIN — NOTIFICATIONS
// ================================

function updateAdminEscalationNotifications(complaints) {
    const delayed = complaints.filter(c => c.isEscalated);
    delayed.forEach(c => {
        addNotification(
            "admin",
            "ADMIN",
            c.id,
            `Complaint "${c.subject}" has been escalated (deadline passed).`
        );
    });
}

function loadAdminNotifications() {
    if (typeof loadNotifications === "function") loadNotifications("ADMIN");
}

// ================================
// ADMIN — EXPORT CSV
// ================================

async function downloadAdminCsv() {
    try {
        const res = await fetch(`${API_BASE}/api/complaints/export/csv`);

        if (!res.ok) {
            alert("Failed to export CSV. Server returned " + res.status);
            return;
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "complaints_export.csv";
        document.body.appendChild(a);
        a.click();
        a.remove();

        window.URL.revokeObjectURL(url);

    } catch (err) {
        console.error("CSV export error:", err);
        alert("Error while exporting CSV.");
    }
}
