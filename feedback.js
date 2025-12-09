// feedback.js – submit a new complaint with optional image attachment

async function submitFeedback() {
    const errorEl   = document.getElementById("feedback-error");
    const successEl = document.getElementById("feedback-success");

    if (errorEl)   errorEl.textContent = "";
    if (successEl) successEl.textContent = "";

    // ---------------------------------------------------
    // Logged-in user → citizenName
    // ---------------------------------------------------
    let user = null;
    try {
        if (typeof getCurrentUser === "function") {
            user = getCurrentUser();
        } else {
            user = JSON.parse(localStorage.getItem("currentUser") || "null");
        }
    } catch (err) {
        console.error("Error reading currentUser:", err);
    }

    // Use name first (this is what you store in DB)
    let citizenName = "Anonymous";
    if (user) {
        if (user.name && user.name.trim()) {
            citizenName = user.name.trim();
        } else if (user.username && user.username.trim()) {
            citizenName = user.username.trim();
        }
    }

    console.log("Submitting complaint as citizenName =", citizenName);

    // ---------------------------------------------------
    // Form fields
    // ---------------------------------------------------
    const subjectEl     = document.getElementById("subject");
    const categoryEl    = document.getElementById("category");
    const priorityEl    = document.getElementById("priority");
    const descriptionEl = document.getElementById("description");
    const imageInput    = document.getElementById("image");

    const subject     = subjectEl ? subjectEl.value.trim() : "";
    const category    = categoryEl ? categoryEl.value : "";
    const priority    = priorityEl ? priorityEl.value : "Medium";
    const description = descriptionEl ? descriptionEl.value.trim() : "";

    if (!subject || !description) {
        if (errorEl) errorEl.textContent = "Please enter subject and description.";
        return;
    }

    // ---------------------------------------------------
    // Build multipart FormData (MUST match controller)
    // ---------------------------------------------------
    const formData = new FormData();
    formData.append("subject", subject);
    formData.append("description", description);
    formData.append("category", category || "Other");
    formData.append("priority", priority || "Medium");
    formData.append("citizenName", citizenName); // matches @RequestParam("citizenName")

    if (imageInput && imageInput.files && imageInput.files[0]) {
        // matches @RequestPart("image") MultipartFile image
        formData.append("image", imageInput.files[0]);
    }

    try {
        // Call backend directly so we don't force JSON headers
        const res = await fetch("http://localhost:8080/api/complaints", {
            method: "POST",
            body: formData
            // ❌ do NOT set Content-Type; browser sets multipart boundary
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error("Create complaint failed:", res.status, txt);
            if (errorEl) {
                if (res.status === 415) {
                    errorEl.textContent = "Server rejected the request format. Please refresh and try again.";
                } else {
                    errorEl.textContent = "Failed to submit complaint. Please try again.";
                }
            }
            return;
        }

        const saved = await res.json();
        console.log("Complaint created:", saved);

        if (successEl) successEl.textContent = "Complaint submitted successfully!";

        // ---------------------------------------------------
        // Clear form & redirect
        // ---------------------------------------------------
        if (subjectEl)     subjectEl.value = "";
        if (descriptionEl) descriptionEl.value = "";
        if (categoryEl)    categoryEl.value = "Other";
        if (priorityEl)    priorityEl.value = "Medium";
        if (imageInput)    imageInput.value = "";

        // Go to "My Complaints"
        setTimeout(() => {
            window.location.href = "grievances.html";
        }, 600);

    } catch (err) {
        console.error("Error submitting complaint:", err);
        if (errorEl) errorEl.textContent = "Server error. Please try again later.";
    }
}
