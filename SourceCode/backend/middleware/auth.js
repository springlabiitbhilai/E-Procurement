// JWT authentication and Role check
import jwt from "jsonwebtoken";

export const auth = (roles = []) => (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ msg: "No token" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    if (roles.length && !roles.includes(decoded.role)) {
      return res.status(403).json({ msg: "Forbidden" });
    }

    
    next();
  } catch (err) {
    return res.status(401).json({ msg: "Invalid token" });
  }
};
