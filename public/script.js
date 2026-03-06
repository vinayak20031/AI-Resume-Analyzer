
async function register() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!name || !email || !password) {
        alert("Please fill all fields!");
        return;
    }

    try {
        const res = await fetch("/api/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });

        const data = await res.json();
        alert(data.message || "Registered!");
    } catch (err) {
        console.error(err);
        alert("Registration failed!");
    }
}


async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Enter email and password");
        return;
    }

    try {
        const res = await fetch("https://ai-resume-analyzer-production-9176.up.railway.app/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok && data.token) {
            localStorage.setItem("token", data.token);
            alert("Logged in!");
        } else {
            alert(data.message || "Login failed!");
        }
    } catch (err) {
        console.error(err);
        alert("Login failed!");
    }
}


async function uploadResume() {
    const file = document.getElementById("resumeFile").files[0];

    if (!file) {
        alert("Please select a file first");
        return;
    }

    const formData = new FormData();
    formData.append("resume", file);

    const token = localStorage.getItem("token");
    if (!token) {
        alert("Login first!");
        return;
    }

    try {
        const res = await fetch("/upload", {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData
        });

        const data = await res.json();
        console.log("Upload Response:", data); // 🔹 Debug

        document.getElementById("result").innerText =
            data.analysis || data.message || "No analysis returned";

      
        loadHistory();
    } catch (err) {
        console.error(err);
        document.getElementById("result").innerText = "Upload failed!";
    }
}


async function loadHistory() {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const res = await fetch("/history", {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = await res.json();
        console.log("History Response:", data); // 🔹 Debug

        const historyDiv = document.getElementById("history");
        if (Array.isArray(data) && data.length > 0) {
            historyDiv.innerHTML = "";
            data.forEach((item, idx) => {
                const div = document.createElement("div");
                div.style.marginBottom = "15px";
                div.innerHTML = `<strong>Resume #${idx + 1}</strong><br>${item.analysis}`;
                historyDiv.appendChild(div);
            });
        } else {
            historyDiv.innerHTML = "No history found.";
        }
    } catch (err) {
        console.error(err);
        document.getElementById("history").innerText = "Failed to load history!";
    }
}