import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { AppDispatch, RootState } from "../store";
import { loginUser, clearError } from "../store/slices/authSlice";
import { FiTruck, FiLock, FiUser } from "react-icons/fi";

export default function LoginPage() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state: RootState) => state.auth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginUser({ username, password }));
    if (loginUser.fulfilled.match(result)) {
      navigate("/");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative"
      style={{
        backgroundImage: `url('/images/Gemini_Generated_Image_ijx1kxijx1kxijx1.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* Blurred overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: "rgba(0, 0, 0, 0)",
        }}
      />

      {/* Content */}
      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl shadow-2xl p-8 border border-white/10 dark:border-gray-700/10">
          {/* Logo */}
          {/* <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto rounded-xl bg-primary-600 flex items-center justify-center mb-4">
              <FiTruck className="text-white text-3xl" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pak Japan Motors
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Layyah — Sign in to your account
            </p>
          </div> */}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter username"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-10"
                  placeholder="Enter password"
                  required
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-center"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          {/* <p className="mt-6 text-center text-xs text-gray-400">
            Default: superadmin / admin123
          </p> */}
        </div>
      </div>
    </div>
  );
}
