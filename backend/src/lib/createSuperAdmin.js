import bcrypt from "bcryptjs";
import SuperAdmin from "../models/superAdmin.model.js";

const createSuperAdmin = async () => {
  try {
    const existingSuperAdmin = await SuperAdmin.findOne({ email: "superadmin@enginuity.com" });
    if (existingSuperAdmin) {
      console.log("✅ Superadmin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("mahirapnapassword", 10);

    await SuperAdmin.create({
      email: "superadmin@enginuity.com",
      fullName: "Super Admin",
      password: hashedPassword,
      permissions: ["all"],
      isActive: true
    });

    console.log("✅ Superadmin account created in separate collection");
  } catch (error) {
    console.error("❌ Error creating superadmin:", error);
  }
};

export default createSuperAdmin;
