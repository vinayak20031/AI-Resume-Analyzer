const jwt = require("jsonwebtoken");

module.exports = function (req, res, next) {
    const authHeader = req.header("Authorization");

    // Check if Authorization header exists
    if (!authHeader) {
        return res.status(401).json({ message: "No token provided" });
    }

    // Remove "Bearer " prefix if present
    const token = authHeader.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : authHeader;

    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }

    // Verify JWT
    try {
        if (!process.env.JWT_SECRET) {
            console.error("❌ JWT_SECRET is undefined! Check your .env file.");
            return res.status(500).json({ message: "Server misconfiguration" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Attach decoded payload to request
        next();
    } catch (err) {
        return res.status(401).json({ message: "Invalid token" });
    }
};