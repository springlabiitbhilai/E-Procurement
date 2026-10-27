import mongoose from "mongoose";

// Offices that must have exactly one active holder
const SINGLE_ROLES = ["DRRD", "DORD", "RND", "MEDIA_CELL"];

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true },
  employeeId: String,
  department: String,
  role: {
    type: String,
    enum: ["PI", "DORD", "RND", "DRRD", "MEDIA_CELL"],
    required: true,
  },
  password: String,
  publicKey: String,

  // Inactive accounts cannot log in. They are kept (never deleted) so old
  // signatures made with their key can still be verified.
  active: { type: Boolean, default: true },

  // Set automatically by the hook below. The unique index allows only ONE
  // active user per officer role. PIs leave it empty, so any number of PIs
  // is fine.
  singletonRole: { type: String, unique: true, sparse: true },
});

userSchema.pre("validate", function (next) {
  this.singletonRole =
    SINGLE_ROLES.includes(this.role) && this.active !== false
      ? this.role
      : undefined;
  next();
});

export default mongoose.model("User", userSchema);
