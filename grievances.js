// grievances.js (USER – My Complaints)

document.addEventListener("DOMContentLoaded", async function () {

    const user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    const emailEl    = document.getElementById("userEmail");
    const tbody      = document.getElementById("complaints-body");
    const table      = document.getElementById("grievances-table");
    const noDataMsg  = document.getElementById("no-data");
    const totalEl    = document.getElementById("totalCount");
    const pendingEl  = document.getElementById("pendingCount");
    const resolvedEl = document.getElementById("resolvedCount");

    if (emailEl) {
        emailEl.textContent = user.name ? `Logged in as: ${user.name}` : "";
    }

    let complaints = [];

    // ---------------------------------------------------
    // Load complaints for this citizen
    // ---------------------------------------------------
    try {
        const res = await apiFetch(
            `/api/complaints/citizen/${encodeURIComponent(user.name)}`
        );

        if (!res.ok) {
            console.error("Failed to load complaints. Status:", res.status);
            showEmpty("Error loading complaints.");
            return;
        }

        complaints = await res.json();
        console.log("Citizen complaints loaded:", complaints.length);

    } catch (err) {
        console.error("Error loading complaints:", err);
        showEmpty("Error loading complaints.");
        return;
    }

    if (!complaints || complaints.length === 0) {
        showEmpty("No complaints submitted yet.");
        return;
    }

    // ---------------------------------------------------
    // Stats
    // ---------------------------------------------------
    const total = complaints.length;
    const resolved = complaints.filter(c => c.status === "Resolved").length;

    const pending = complaints.filter(c =>
        c.status === "Under Review" ||
        c.status === "In Progress" ||
        (!c.status || (c.status !== "Resolved" && c.status !== "Rejected"))
    ).length;

    totalEl.textContent    = total;
    pendingEl.textContent  = pending;
    resolvedEl.textContent = resolved;

    // ---------------------------------------------------
    // Sort by ID ascending (1,2,3,...)
    // ---------------------------------------------------
    complaints.sort((a, b) => {
        const idA = a.id || 0;
        const idB = b.id || 0;
        return idA - idB;
    });

    // ---------------------------------------------------
    // Fill table
    // ---------------------------------------------------
    table.style.display = "table";
    noDataMsg.style.display = "none";
    tbody.innerHTML = "";

    complaints.forEach(c => {

        const tr = document.createElement("tr");

        const priority = (c.priority || "Medium").toLowerCase();
        const status   = c.status || "Under Review";
        const category = c.category || "Other";

        const priorityClass = mapPriorityClass(priority);
        const statusClass   = mapStatusClass(status);
        const escalated     = isEscalatedComplaint(c);

        const escalationHtml = escalated
            ? `<span class="escalated-badge">Escalated</span>`
            : `<span class="no-escalation">—</span>`;

        const attachmentHtml = c.imagePath
            ? `<img src="http://localhost:8080/api/complaints/${c.id}/image"
                    alt="Attachment"
                    class="attachment-thumb">`
            : `<span class="no-attachment">-</span>`;

        tr.innerHTML = `
            <td>${c.id}</td>
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
            <td>
                <button class="delete-btn" data-id="${c.id}">Delete</button>
            </td>
        `;

        // Row click → open detail page (ignore delete button)
        tr.addEventListener("click", function (e) {
            if (e.target && e.target.matches(".delete-btn")) return;
            localStorage.setItem("selectedGrievanceId", String(c.id));
            window.location.href = "complaint-detail.html";
        });

        // Delete button logic
        const delBtn = tr.querySelector(".delete-btn");
        delBtn.addEventListener("click", async function (e) {
            e.stopPropagation();

            if (!confirm(`Delete complaint #${c.id}?`)) return;

            try {
                const res = await apiFetch(`/api/complaints/${c.id}`, {
                    method: "DELETE"
                });

                if (res.ok || res.status === 204) {
                    tr.remove();
                } else {
                    alert("Failed to delete complaint.");
                }

            } catch (err) {
                console.error("Delete error:", err);
                alert("Error deleting complaint.");
            }
        });

        tbody.appendChild(tr);
    });

    // ---------------------------------------------------
    // Helper for empty state
    // ---------------------------------------------------
    function showEmpty(msg) {
        table.style.display     = "none";
        noDataMsg.style.display = "block";
        noDataMsg.textContent   = msg;
        totalEl.textContent     = "0";
        pendingEl.textContent   = "0";
        resolvedEl.textContent  = "0";
    }
});

/* ==========================================================
   Helper functions (priority/status classes + escalation)
========================================================== */

function mapPriorityClass(priorityLower) {
    const p = (priorityLower || "").toLowerCase();
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

function isEscalatedComplaint(c) {
    if (!c) return false;

    const status = c.status || "Under Review";
    if (status === "Resolved" || status === "Rejected") {
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
