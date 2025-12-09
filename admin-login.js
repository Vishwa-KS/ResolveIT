function adminLogin() {
    const user = document.getElementById("adminUsername").value.trim();
    const pass = document.getElementById("adminPassword").value.trim();
    const error = document.getElementById("admin-error");

    error.innerHTML = "";

    
    if (user === "admin" && pass === "admin123") {
        
        window.location.href = "admin.html";
    } else {
        error.innerHTML = "Invalid admin username or password!";
    }
}
