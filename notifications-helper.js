// notifications-helper.js
// Common notification system for citizen, admin, officer
// Works for admin, officer, citizen, even if user.role is "ANONYMOUS".

(function () {
    // -----------------------------
    // LocalStorage helpers
    // -----------------------------
    function getNotifications() {
        try {
            return JSON.parse(localStorage.getItem("notifications") || "[]");
        } catch (e) {
            console.error("Failed to parse notifications from localStorage", e);
            return [];
        }
    }

    function saveNotifications(list) {
        localStorage.setItem("notifications", JSON.stringify(list));
    }

    // -----------------------------
    // PUBLIC: addNotification
    // -----------------------------
    // toRole: "citizen" | "officer" | "admin" (any case)
    // toName: username/name of target (optional)
    function addNotification(toRole, toName, complaintId, message) {
        const list = getNotifications();
        const now = new Date();

        list.push({
            id: now.getTime(),
            toRole: toRole || "",
            toName: (toName || "").trim(),
            complaintId: complaintId || null,
            message: message || "",
            createdAt: now.toLocaleString(),
            isRead: false
        });

        saveNotifications(list);
    }

    // expose globally
    window.addNotification = addNotification;

    // -----------------------------
    // UI logic
    // -----------------------------
    document.addEventListener("DOMContentLoaded", function () {
        const bellBtn        = document.getElementById("notifBell");
        const notifPanel     = document.getElementById("notifPanel");
        const notifListEl    = document.getElementById("notifList");
        const notifCountEl   = document.getElementById("notifCount");
        const markAllReadBtn = document.getElementById("markAllReadBtn");

        // If page has no notification UI, do nothing
        if (!bellBtn || !notifPanel || !notifListEl || !notifCountEl) {
            return;
        }

        // -------- Helpers: current user + role inference --------
        function getStoredUser() {
            try {
                const rawLogged = localStorage.getItem("loggedInUser");
                if (rawLogged) return JSON.parse(rawLogged);

                const rawCurrent = localStorage.getItem("currentUser");
                if (rawCurrent) return JSON.parse(rawCurrent);

                return null;
            } catch (e) {
                console.error("Error parsing user from storage", e);
                return null;
            }
        }

        function inferRoleFromPath() {
            const p = (window.location.pathname || "").toLowerCase();
            if (p.includes("admin-"))   return "ADMIN";
            if (p.includes("officer-")) return "OFFICER";
            return "CITIZEN";
        }

        const user = getStoredUser() || {};
        let myRole = (user.role || user.accountType || "").toString().toUpperCase();
        if (!myRole || myRole === "ANONYMOUS") {
            myRole = inferRoleFromPath();
        }

        const nameCandidates = [];
        if (user.name)     nameCandidates.push(user.name);
        if (user.username) nameCandidates.push(user.username);

        const myNamesLower = nameCandidates
            .map(n => n.trim().toLowerCase())
            .filter(Boolean);

        console.log("[Notif] Current user:", {
            role: myRole,
            names: myNamesLower
        });

        // -----------------------------
        // Decide if a notification is "mine"
        // -----------------------------
        function isMineNotification(n) {
            const toRoleNorm = (n.toRole || "").toString().toUpperCase();
            const toNameNorm = (n.toName || "").trim().toLowerCase();

            // ---- ADMIN ----
            if (myRole === "ADMIN") {
                if (toRoleNorm === "ADMIN") return true;
                if (toNameNorm && myNamesLower.includes(toNameNorm)) return true;
                return false;
            }

            // ---- CITIZEN ----
            if (myRole === "CITIZEN") {
                if (toRoleNorm === "CITIZEN") return true; // broadcast to citizens
                if (toNameNorm && myNamesLower.includes(toNameNorm)) return true;
                return false;
            }

            // ---- OFFICER ----
            // Officer sees:
            //   1) All notifications with toRole = OFFICER (broadcast)
            //   2) Any with toName matching their name/username
            if (myRole === "OFFICER") {
                if (toRoleNorm === "OFFICER") return true;
                if (toNameNorm && myNamesLower.includes(toNameNorm)) return true;
                return false;
            }

            // Other roles: nothing
            return false;
        }

        function filterForCurrentUser(all) {
            return all.filter(isMineNotification);
        }

        // -----------------------------
        // Render bell + list
        // -----------------------------
        function updateBellAndList() {
            const all = getNotifications();
            const mine = filterForCurrentUser(all);

            console.log("[Notif] ALL:", all);
            console.log("[Notif] Mine:", mine);

            const unreadCount = mine.filter(n => !n.isRead).length;

            // Badge
            if (unreadCount > 0) {
                notifCountEl.style.display = "inline-block";
                notifCountEl.textContent = unreadCount;
            } else {
                notifCountEl.style.display = "none";
                notifCountEl.textContent = "0";
            }

            // List
            notifListEl.innerHTML = "";

            if (mine.length === 0) {
                const empty = document.createElement("div");
                empty.className = "notif-empty";
                empty.textContent = "No notifications yet.";
                notifListEl.appendChild(empty);
                return;
            }

            mine.sort((a, b) => (b.id || 0) - (a.id || 0));

            mine.forEach(n => {
                const item = document.createElement("div");
                item.className = "notif-item";
                if (!n.isRead) item.classList.add("unread");

                const msgEl = document.createElement("div");
                msgEl.className = "notif-message";
                msgEl.textContent = n.message || "";

                const metaEl = document.createElement("div");
                metaEl.className = "notif-meta";
                metaEl.textContent = n.createdAt || "";

                item.appendChild(msgEl);
                item.appendChild(metaEl);

                // Click → go to detail page if complaintId present
                if (n.complaintId) {
                    item.style.cursor = "pointer";
                    item.addEventListener("click", function () {
                        const allNow = getNotifications();
                        const idx = allNow.findIndex(x => x.id === n.id);
                        if (idx !== -1) {
                            allNow[idx].isRead = true;
                            saveNotifications(allNow);
                        }

                        localStorage.setItem(
                            "selectedGrievanceId",
                            String(n.complaintId)
                        );

                        if (myRole === "ADMIN") {
                            window.location.href = "admin-complaint-detail.html";
                        } else if (myRole === "OFFICER") {
                            window.location.href = "officer-complaint-detail.html";
                        } else {
                            window.location.href = "complaint-detail.html";
                        }
                    });
                }

                notifListEl.appendChild(item);
            });
        }

        // -----------------------------
        // Bell toggle
        // -----------------------------
        let panelOpen = false;
        bellBtn.addEventListener("click", function () {
            panelOpen = !panelOpen;
            notifPanel.style.display = panelOpen ? "block" : "none";
            if (panelOpen) {
                updateBellAndList();
            }
        });

        // -----------------------------
        // Mark all read
        // -----------------------------
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener("click", function () {
                const all = getNotifications();
                let changed = false;

                all.forEach(n => {
                    if (isMineNotification(n) && !n.isRead) {
                        n.isRead = true;
                        changed = true;
                    }
                });

                if (changed) {
                    saveNotifications(all);
                }
                updateBellAndList();
            });
        }

        // Initial render
        updateBellAndList();
    });
})();
