// middleware/rbac.middleware.js
export const requireRole = (...roles) => {
  return (req, res, next) => {
    const role = req.userType || req.user?.role;
    if (!role) return res.status(401).json({ message: "Unauthorized" });
    if (!roles.includes(role)) {
      return res.status(403).json({ message: "Forbidden: insufficient role" });
    }
    next();
  };
};
