// pages/SettingsPage.jsx
import React, { useEffect, useState } from "react";
import { THEMES } from "../constants";
import { useThemeStore } from "../store/useThemeStore";
import { useAuthStore } from "../store/useAuthStore";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";
import { Send, Eye, EyeOff, EyeOff as EyeOffIcon } from "lucide-react";

const PREVIEW_MESSAGES = [
  { id: 1, content: "Hey How's the project going?", isSent: false },
  { id: 2, content: "We're doing great!", isSent: true },
];

const STRONG_PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-={}\[\]|;:'",.<>/?`~]).{8,}$/;

const confirmWithToast = (message = "Discard changes?") =>
  new Promise((resolve) => {
    const id = `confirm-${Date.now()}`;
    toast.custom(
      (t) => (
        <div className="bg-base-100 text-base-content border border-base-300 rounded-lg shadow p-3 w-[280px]">
          <p className="text-sm mb-3">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              className="btn btn-xs"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(false);
              }}
            >
              Keep editing
            </button>
            <button
              className="btn btn-xs btn-error"
              onClick={() => {
                toast.dismiss(t.id);
                resolve(true);
              }}
            >
              Discard
            </button>
          </div>
        </div>
      ),
      { id, duration: 8000 }
    );
  });

const MiniChatPreview = () => {
  const now = "12:00 PM";
  return (
    <div className="rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-lg">
      <div className="p-4 bg-base-200">
        <div className="max-w-lg mx-auto">
          <div className="bg-base-100 rounded-xl shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-base-300 bg-base-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-content font-medium">
                  J
                </div>
                <div>
                  <h3 className="font-medium text-sm">John Doe</h3>
                  <p className="text-xs text-base-content/70">Online</p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-4 min-h-[200px] max-h-[200px] overflow-y-auto bg-base-100">
              {PREVIEW_MESSAGES.map((message) => (
                <div key={message.id} className={`flex ${message.isSent ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`
                      max-w-[80%] rounded-xl p-3 shadow-sm
                      ${message.isSent ? "bg-primary text-primary-content" : "bg-base-200"}
                    `}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p
                      className={`
                        text-[10px] mt-1.5
                        ${message.isSent ? "text-primary-content/70" : "text-base-content/70"}
                      `}
                    >
                      {now}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-base-300 bg-base-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input input-bordered flex-1 text-sm h-10"
                  placeholder="Type a message..."
                  value="This is a preview"
                  readOnly
                />
                <button className="btn btn-primary h-10 min-h-0">
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => {
  const { theme, setTheme } = useThemeStore();
  const { user, logout } = useAuthStore(); // assume user contains role from check-auth

  const userRole = user?.role || user?.userType || "client";

  // Password modal state
  const [isPwdModalOpen, setIsPwdModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Eye toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const openPwdModal = () => setIsPwdModalOpen(true);
  const closePwdModal = () => {
    setIsPwdModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setIsUpdating(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const hasUnsaved = () =>
    currentPassword.length > 0 || newPassword.length > 0 || confirmNewPassword.length > 0;

  const requestClosePwdModal = async () => {
    if (hasUnsaved()) {
      const ok = await confirmWithToast("Discard changes?");
      if (!ok) return;
    }
    closePwdModal();
  };

  useEffect(() => {
    if (!isPwdModalOpen) return;
    const handler = async (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (hasUnsaved()) {
          const ok = await confirmWithToast("Discard changes?");
          if (ok) closePwdModal();
        } else {
          closePwdModal();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isPwdModalOpen, currentPassword, newPassword, confirmNewPassword]);

  const validateNewPassword = (pwd) => STRONG_PASSWORD_REGEX.test(pwd);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    // Basic validations
    if (userRole !== "superadmin" && !currentPassword) {
      return toast.error("Please enter current password.");
    }
    if (!newPassword || !confirmNewPassword) {
      return toast.error("Please fill in all password fields.");
    }
    if (newPassword !== confirmNewPassword) {
      return toast.error("New passwords do not match.");
    }
    if (!validateNewPassword(newPassword)) {
      return toast.error(
        "Password must be at least 8 characters and include upper, lower, number, and special."
      );
    }

    setIsUpdating(true);
    try {
      if (userRole === "superadmin") {
        // Super Admin path: no current password, server is RBAC-protected
        await axiosInstance.put("/auth/superadmin/password", {
          newPassword,
          confirmNewPassword,
        });
      } else {
        // Regular user path: requires current password
        await axiosInstance.put("/auth/password", {
          currentPassword,
          newPassword,
          confirmNewPassword,
        });
      }

      toast.success("Password updated. Please sign in again.");

      // Enforce re-login after password change per secure session management
      await logout();
      // Optionally: window.location.href = "/login";
      closePwdModal();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update password.";
      toast.error(msg);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="h-screen container mx-auto px-4 pt-20 max-w-5xl">
      <div className="space-y-6">
        {/* Security FIRST */}
        <div className="mt-0">
          <h3 className="text-lg font-semibold">Security</h3>
          <p className="text-sm text-base-content/70 mb-3">
            Update the account password set during onboarding.
          </p>
          <button className="btn btn-outline" onClick={openPwdModal}>
            Update password
          </button>
        </div>

        {/* Theme SECOND */}
        <div className="flex flex-col gap-1 pt-2">
          <h2 className="text-lg font-semibold">Theme</h2>
          <p className="text-sm text-base-content/70">Choose a theme for your chat interface</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-8 gap-2">
          {THEMES.map((t) => (
            <button
              key={t}
              className={`group flex flex-col items-center gap-1.5 p-2 rounded-lg transition-colors
                ${theme === t ? "bg-base-200" : "hover:bg-base-200/50"}`}
              onClick={() => setTheme(t)}
            >
              <div className="relative h-8 w-full rounded-md overflow-hidden" data-theme={t}>
                <div className="absolute inset-0 grid grid-cols-4 gap-px p-1">
                  <div className="rounded bg-primary" />
                  <div className="rounded bg-secondary" />
                  <div className="rounded bg-accent" />
                  <div className="rounded bg-neutral" />
                </div>
              </div>
              <span className="text-[11px] font-medium truncate w-full text-center">
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </span>
            </button>
          ))}
        </div>

        {/* Preview THIRD */}
        <h3 className="text-lg font-semibold mb-3">Preview</h3>
        <MiniChatPreview />
      </div>

      {/* Controlled Password Modal */}
      {isPwdModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={requestClosePwdModal} aria-hidden="true" />

          {/* Modal Card */}
          <div className="relative bg-base-100 w-full max-w-md rounded-xl shadow-xl p-5 z-10">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold text-lg">Update password</h3>
              <button onClick={requestClosePwdModal} className="btn btn-sm btn-circle btn-ghost">
                ✕
              </button>
            </div>

            <form className="space-y-3 mt-2" onSubmit={handleUpdatePassword}>
              {/* Current Password (hidden for Super Admin) */}
              {userRole !== "superadmin" && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Current password</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      className="input input-bordered w-full pr-10"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      required={userRole !== "superadmin"}
                    />
                    <button
                      type="button"
                      aria-label={showCurrent ? "Hide current password" : "Show current password"}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                      onClick={() => setShowCurrent((v) => !v)}
                    >
                      {showCurrent ? <Eye size={18} /> : <EyeOffIcon size={18} />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">New password</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showNew ? "Hide new password" : "Show new password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                    onClick={() => setShowNew((v) => !v)}
                  >
                    {showNew ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-base-content/60">
                  Must be at least 8 characters, include uppercase, lowercase, number, and special character.
                </p>
              </div>

              {/* Confirm Password */}
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Confirm new password</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    className="input input-bordered w-full pr-10"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                  />
                  <button
                    type="button"
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-base-content/60 hover:text-base-content"
                    onClick={() => setShowConfirm((v) => !v)}
                  >
                    {showConfirm ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className="btn btn-ghost" onClick={requestClosePwdModal} disabled={isUpdating}>
                  Cancel
                </button>
                <button type="submit" className={`btn btn-primary ${isUpdating ? "loading" : ""}`} disabled={isUpdating}>
                  {isUpdating ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
