function officerLogin() {
    const user = document.getElementById("officerUsername").value.trim();
    const pass = document.getElementById("officerPassword").value.trim();
    const error = document.getElementById("officer-error");

    error.innerHTML = "";

    // Officer credentials (you can modify if needed)
    if (user === "officer" && pass === "officer123") {
        window.location.href = "officer-dashboard.html"; // officer dashboard page
    } else {
        error.innerHTML = "Invalid officer credentials!";
    }
}
