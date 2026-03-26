import React, { useState } from "react";
import { toast } from "react-toastify";

interface Props {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function SuperadminPasswordModal({
  isOpen,
  title = "Superadmin Authorization Required",
  message = "Please enter the superadmin password to proceed with this action.",
  onConfirm,
  onCancel,
}: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error("Password is required");
      return;
    }
    setLoading(true);
    try {
      const result = await window.api.verifySuperadminPassword(password);
      if (result.success) {
        setPassword("");
        onConfirm();
      } else {
        toast.error(result.error || "Invalid superadmin password");
      }
    } catch {
      toast.error("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {message}
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mb-4"
            placeholder="Enter superadmin password"
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setPassword("");
                onCancel();
              }}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Hook for using the superadmin password confirmation flow.
 * Usage:
 *   const { requestAuth, PasswordModal } = useSuperadminAuth();
 *   // When needing to delete/edit:
 *   requestAuth(() => { performAction(); });
 *   // Render <PasswordModal /> in your component
 */
export function useSuperadminAuth() {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestAuth = (action: () => void) => {
    setPendingAction(() => action);
    setIsOpen(true);
  };

  const PasswordModal = (props?: { title?: string; message?: string }) => (
    <SuperadminPasswordModal
      isOpen={isOpen}
      title={props?.title}
      message={props?.message}
      onConfirm={() => {
        setIsOpen(false);
        if (pendingAction) pendingAction();
        setPendingAction(null);
      }}
      onCancel={() => {
        setIsOpen(false);
        setPendingAction(null);
      }}
    />
  );

  return { requestAuth, PasswordModal };
}
