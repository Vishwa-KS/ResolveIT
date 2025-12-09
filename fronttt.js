// fronttt.js

async function login() {
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    const errorMsg = document.getElementById("error-msg");

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    errorMsg.textContent = "";

    if (!username || !password) {
        errorMsg.textContent = "Please enter username and password.";
        return;
    }

    try {
        const res = await fetch("http://localhost:8080/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })   // must match backend LoginRequest
        });

        if (!res.ok) {
            if (res.status === 401) {
                errorMsg.textContent = "Invalid username or password";
            } else {
                errorMsg.textContent = "Login failed. Status: " + res.status;
            }
            return;
        }

        const user = await res.json();

        // Normalize and store user in one key used by getCurrentUser()
        const normalizedUser = {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            role: user.role   // "CITIZEN" / "ADMIN" / "OFFICER"
        };

        localStorage.setItem("currentUser", JSON.stringify(normalizedUser));

        // Route by role
        if (normalizedUser.role === "ADMIN") {
            window.location.href = "admin-dashboard.html";
            return;
        }

        if (normalizedUser.role === "OFFICER") {
            window.location.href = "officer-dashboard.html";
            return;
        }

        // Default: citizen user
        window.location.href = "dashboard.html";

    } catch (err) {
        console.error("Login error:", err);
        errorMsg.textContent = "Server error. Try again later.";
    }
}

// Anonymous login
function anonymousLogin() {
    const anonUser = {
        id: null,
        name: "Anonymous",
        username: "Anonymous",
        email: null,
        role: "ANONYMOUS"
    };

    // old key (if something still reads it)
    localStorage.setItem("loggedInUser", JSON.stringify(anonUser));

    // main key used everywhere (getCurrentUser reads this)
    localStorage.setItem("currentUser", JSON.stringify(anonUser));

    window.location.href = "feedback.html";
}
