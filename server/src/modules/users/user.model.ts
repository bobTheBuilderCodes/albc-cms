import mongoose, { Document, Schema } from "mongoose";
import { MODULE_PERMISSIONS, ModulePermission, defaultModulesForRole } from "../../types/modules";
import { USER_ROLES, UserRole } from "../../types/roles";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  modules: ModulePermission[];
  isActive: boolean;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: USER_ROLES, default: "Staff" },
    modules: {
      type: [{ type: String, enum: MODULE_PERMISSIONS }],
      default: function (this: IUser) {
        return defaultModulesForRole(this.role || "Staff");
      },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>("User", UserSchema);
