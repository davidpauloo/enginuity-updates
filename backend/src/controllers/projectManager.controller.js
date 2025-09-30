// backend/src/controllers/ProjectManager.controller.js
import Project from "../models/project.model.js";

export const getPmAssignments = async (req, res) => {
  try {
    const isSuperAdmin = req.userType === "superadmin";
    const effectiveRole = isSuperAdmin ? "superadmin" : req.user?.role;
    if (!isSuperAdmin && effectiveRole !== "project_manager") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const pmId = isSuperAdmin && req.query.pmId ? req.query.pmId : req.user._id;

    const projects = await Project.find({
      isActive: true,
      projectManager: pmId,
    })
      .select("_id name location description client projectManager status imageUrl progress")
      .populate({ path: "client", select: "_id fullName email profilePic role isActive" })
      .populate({ path: "projectManager", select: "_id fullName email role isActive" });

    const clientMap = new Map();
    for (const p of projects) {
      if (p.client && p.client.role === "client" && p.client.isActive !== false) {
        clientMap.set(String(p.client._id), p.client);
      }
    }
    const clients = Array.from(clientMap.values());
    return res.json({ projects, clients });
  } catch (err) {
    console.error("❌ getPmAssignments error:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getPmAssignmentsIncludingExtras = async (req, res) => {
  try {
    const isSuperAdmin = req.userType === "superadmin";
    const effectiveRole = isSuperAdmin ? "superadmin" : req.user?.role;
    if (!isSuperAdmin && effectiveRole !== "project_manager") {
      return res.status(403).json({ message: "Forbidden" });
    }
    const pmId = isSuperAdmin && req.query.pmId ? req.query.pmId : req.user._id;

    const projects = await Project.find({
      isActive: true,
      $or: [{ projectManager: pmId }, { projectExtras: pmId }],
    })
      .select("_id name location description client projectManager status imageUrl progress")
      .populate({ path: "client", select: "_id fullName email profilePic role isActive" })
      .populate({ path: "projectManager", select: "_id fullName email role isActive" });

    const clientMap = new Map();
    for (const p of projects) {
      if (p.client && p.client.role === "client" && p.client.isActive !== false) {
        clientMap.set(String(p.client._id), p.client);
      }
    }
    const clients = Array.from(clientMap.values());
    return res.json({ projects, clients });
  } catch (err) {
    console.error("❌ getPmAssignmentsIncludingExtras error:", err.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
