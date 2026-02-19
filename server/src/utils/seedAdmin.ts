import User from "../modules/users/user.model";
import { env } from "../config/env";
import { defaultModulesForRole } from "../types/modules";
import { hashPassword } from "./password";

export const seedAdmin = async (): Promise<void> => {
  const existingAdmin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });

  if (!existingAdmin) {
    await User.create({
      name: "Super Admin",
      email: env.ADMIN_EMAIL.toLowerCase(),
      password: await hashPassword(env.ADMIN_PASSWORD),
      role: "Admin",
      modules: defaultModulesForRole("Admin"),
      isActive: true,
    });
    console.log(`Seeded admin user: ${env.ADMIN_EMAIL}`);
  } else {
    let shouldSave = false;
    if (!existingAdmin.modules || existingAdmin.modules.length === 0) {
      existingAdmin.modules = defaultModulesForRole("Admin");
      shouldSave = true;
    }
    if (existingAdmin.isActive === undefined) {
      existingAdmin.isActive = true;
      shouldSave = true;
    }
    if (shouldSave) {
      await existingAdmin.save();
    }
  }
};
