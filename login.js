// login.js  (for index.html -> "Join ResolveIT" signup page)

async function createAccount() {
    const usernameEl   = document.getElementById("username");
    const passwordEl   = document.getElementById("password");
    const accountTypeEl = document.getElementById("accountType");
    const msgEl        = document.getElementById("msg");

    const username = usernameEl ? usernameEl.value.trim() : "";
    const password = passwordEl ? passwordEl.value.trim() : "";
    const role     = accountTypeEl ? accountTypeEl.value : "CITIZEN";

    if (msgEl) msgEl.textContent = "";

    if (!username || !password) {
        if (msgEl) msgEl.textContent = "Please enter username and password.";
        return;
    }

    try {
        const res = await fetch("http://localhost:8080/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username,
                password: password,
                role: role    // CITIZEN / OFFICER / ADMIN from the dropdown
            })
        });

        if (!res.ok) {
            const text = await res.text();
            if (res.status === 409) {
                if (msgEl) msgEl.textContent = text || "Username already exists.";
            } else if (res.status === 400) {
                if (msgEl) msgEl.textContent = text || "Invalid input.";
            } else {
                if (msgEl) msgEl.textContent = text || "Failed to create account.";
            }
            return;
        }

        // success
        if (msgEl) msgEl.textContent = "Account created successfully! Redirecting to sign in...";
        // small delay for user to see message
        setTimeout(() => {
            // go to login page (your "Sign in" link uses front.html)
            window.location.href = "front.html";
        }, 800);

    } catch (err) {
        console.error("Create account error:", err);
        if (msgEl) {
            msgEl.textContent = "Server error. Try again later.";
        } else {
            alert("Server error. Try again later.");
        }
    }
}
