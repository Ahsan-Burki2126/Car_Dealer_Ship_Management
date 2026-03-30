import React, { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import type { RootState } from "../store";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Clear password and focus input on every mount (key-driven remount guarantees this)
  useEffect(() => {
    setPassword("");
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
    return () => clearTimeout(timer);
  }, []);

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
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field mb-4"
            placeholder="Enter superadmin password"
            disabled={loading}
            autoComplete="off"
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
            <button type="submit" className="btn-primary" disabled={loading}>
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
export function useSuperadminAuth(props?: { title?: string; message?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requestAuth = (action: () => void) => {
    setPendingAction(() => action);
    setOpenKey((k) => k + 1);
    setIsOpen(true);
  };

  const modal = (
    <SuperadminPasswordModal
      key={openKey}
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

  return { requestAuth, modal };
}

/**
 * Hook for role-based access control.
 * Regular users: can only ADD items
 * Superadmin: can ADD, EDIT, DELETE (edit/delete require password verification)
 */
export function useAccessControl() {
  const { user } = useSelector((state: RootState) => state.auth);
  const [isOpen, setIsOpen] = useState(false);
  const [openKey, setOpenKey] = useState(0);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [actionType, setActionType] = useState<"edit" | "delete">("delete");

  const isSuperAdmin = user?.role === "super_admin";
  const canAdd = true;
  const canEdit = isSuperAdmin;
  const canDelete = isSuperAdmin;

  const requestEditAction = (action: () => void) => {
    if (!canEdit) {
      toast.error("You don't have permission to edit items");
      return;
    }
    setActionType("edit");
    setPendingAction(() => action);
    setOpenKey((k) => k + 1);
    setIsOpen(true);
  };

  const requestDeleteAction = (action: () => void) => {
    if (!canDelete) {
      toast.error("You don't have permission to delete items");
      return;
    }
    setActionType("delete");
    setPendingAction(() => action);
    setOpenKey((k) => k + 1);
    setIsOpen(true);
  };

  const messages = {
    edit: {
      title: "Superadmin Authorization Required",
      message: "Please enter the superadmin password to edit this item.",
    },
    delete: {
      title: "Superadmin Authorization Required",
      message: "Please enter the superadmin password to delete this item.",
    },
  };

  const modal = (
    <SuperadminPasswordModal
      key={openKey}
      isOpen={isOpen}
      title={messages[actionType].title}
      message={messages[actionType].message}
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

  return {
    canAdd,
    canEdit,
    canDelete,
    requestEditAction,
    requestDeleteAction,
    modal,
  };
}
