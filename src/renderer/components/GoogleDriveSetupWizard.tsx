import React, { useState } from "react";
import { toast } from "react-toastify";
import {
  FiCloud,
  FiCheck,
  FiX,
  FiChevronRight,
  FiAlertCircle,
} from "react-icons/fi";

interface GoogleDriveSetupWizardProps {
  onComplete: () => void;
  userId: string;
}

type Step = "intro" | "connect" | "success" | "error";

export default function GoogleDriveSetupWizard({
  onComplete,
  userId,
}: GoogleDriveSetupWizardProps) {
  const [step, setStep] = useState<Step>("intro");
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleStartSetup = async () => {
    setIsConnecting(true);
    setErrorMessage("");

    try {
      const urlResult = await window.api.googleDriveGetAuthUrl();
      if (!urlResult.success) {
        setErrorMessage("Failed to get authentication URL. Please try again.");
        setStep("error");
        setIsConnecting(false);
        return;
      }

      setStep("connect");
      const authUrl = urlResult.data;

      // Open auth window
      const authWindow = window.open(
        authUrl,
        "google-drive-auth",
        "width=600,height=700,left=200,top=200",
      );

      if (!authWindow) {
        setErrorMessage(
          "Could not open authentication window. Please check your popup blocker settings.",
        );
        setStep("error");
        setIsConnecting(false);
        return;
      }

      // Poll for authentication completion
      let isAuthenticated = false;
      let attempts = 0;
      const maxAttempts = 300; // 5 minutes

      const checkAuth = setInterval(async () => {
        attempts++;

        try {
          const checkResult = await window.api.googleDriveIsAuthenticated();
          if (checkResult.success && checkResult.data) {
            isAuthenticated = true;
            clearInterval(checkAuth);
            authWindow.close();

            // Auto-enable auto-upload after successful authentication
            const settingsResult = await window.api.googleDriveUpdateSettings(
              userId,
              {
                enableGoogleDriveBackup: true,
                autoUploadToGoogleDrive: true,
              },
            );

            if (settingsResult.success) {
              setStep("success");
              toast.success(
                "Google Drive connected! Backups will upload automatically.",
              );
              // Close wizard after 2 seconds
              setTimeout(() => {
                onComplete();
              }, 2000);
            }
          }
        } catch (err) {
          console.error("Auth check error:", err);
        }

        if (attempts >= maxAttempts) {
          clearInterval(checkAuth);
          if (!isAuthenticated) {
            setErrorMessage("Authentication timeout. Please try again.");
            setStep("error");
            authWindow.close();
          }
        }
      }, 1000);
    } catch (error) {
      console.error("Setup error:", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setStep("error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleRetry = () => {
    setStep("intro");
    setErrorMessage("");
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-lg">
          <div className="flex items-center gap-3">
            <FiCloud size={24} />
            <h2 className="text-xl font-bold">Cloud Backup Setup</h2>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {step === "intro" && (
            <div className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                Protect your business data by automatically backing up to Google
                Drive. Your files will be safely stored in your own Google
                account.
              </p>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-200">
                  What you'll get:
                </h3>
                <ul className="text-xs text-blue-800 dark:text-blue-300 space-y-1">
                  <li className="flex items-center gap-2">
                    <FiCheck size={14} className="flex-shrink-0" /> Automatic
                    daily backups
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck size={14} className="flex-shrink-0" /> Safe cloud
                    storage
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck size={14} className="flex-shrink-0" /> Easy
                    recovery anytime
                  </li>
                </ul>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Takes less than 1 minute. Your data is encrypted and secure.
              </p>
            </div>
          )}

          {step === "connect" && (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <div className="animate-spin">
                  <FiCloud size={48} className="text-blue-600" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Connecting to Google...
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Complete sign-in in the browser window, then come back here.
                </p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                We're waiting for authorization...
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="space-y-4 text-center py-4">
              <div className="flex justify-center">
                <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
                  <FiCheck
                    size={32}
                    className="text-green-600 dark:text-green-400"
                  />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  All Set! ✓
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your Google Drive backup is ready. Daily backups will begin
                  automatically.
                </p>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="space-y-4">
              <div className="flex gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <FiAlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                    Connection Failed
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300">
                    {errorMessage || "Something went wrong. Please try again."}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 space-y-2">
                <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
                  Troubleshooting:
                </h4>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Allow popups for this application</li>
                  <li>• Make sure you're logged into Google</li>
                  <li>• Check your internet connection</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg flex gap-3">
          {step === "intro" && (
            <>
              <button
                onClick={onComplete}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium text-sm"
              >
                Skip for Now
              </button>
              <button
                onClick={handleStartSetup}
                disabled={isConnecting}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <span className="animate-spin">⏳</span> Starting...
                  </>
                ) : (
                  <>
                    Get Started <FiChevronRight size={16} />
                  </>
                )}
              </button>
            </>
          )}

          {step === "connect" && (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium text-sm"
            >
              Close
            </button>
          )}

          {step === "success" && (
            <button
              onClick={onComplete}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
            >
              Done
            </button>
          )}

          {step === "error" && (
            <>
              <button
                onClick={onComplete}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRetry}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm"
              >
                Try Again
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
