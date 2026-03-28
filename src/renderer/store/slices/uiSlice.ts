import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type AppTheme = "light" | "dark" | "eco";

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  theme: AppTheme;
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  // Remove all theme classes first
  root.classList.remove("dark", "theme-eco");
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "eco") {
    root.classList.add("theme-eco");
  }
  localStorage.setItem("dms_theme", theme);
  // Keep darkMode in sync for backward compat
  localStorage.setItem("dms_darkMode", String(theme === "dark"));
}

function loadTheme(): AppTheme {
  const saved = localStorage.getItem("dms_theme") as AppTheme | null;
  if (saved === "dark" || saved === "eco" || saved === "light") return saved;
  // Migrate legacy darkMode flag
  if (localStorage.getItem("dms_darkMode") === "true") return "dark";
  return "light";
}

const savedTheme = loadTheme();

const initialState: UIState = {
  sidebarOpen: true,
  darkMode: savedTheme === "dark",
  theme: savedTheme,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    toggleDarkMode: (state) => {
      // Legacy toggle: switches between light and dark
      const next: AppTheme = state.theme === "dark" ? "light" : "dark";
      state.theme = next;
      state.darkMode = next === "dark";
      applyTheme(next);
    },
    setDarkMode: (state, action: PayloadAction<boolean>) => {
      // Called on app init to restore persisted theme
      state.darkMode = action.payload;
      if (!state.theme || state.theme === "light") {
        applyTheme(state.theme);
      } else {
        applyTheme(state.theme);
      }
    },
    setTheme: (state, action: PayloadAction<AppTheme>) => {
      state.theme = action.payload;
      state.darkMode = action.payload === "dark";
      applyTheme(action.payload);
    },
  },
});

export const { toggleSidebar, toggleDarkMode, setDarkMode, setTheme } =
  uiSlice.actions;
export default uiSlice.reducer;
