"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const saved = window.localStorage.getItem("poll-theme");
    const preferred =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(preferred);
    document.documentElement.classList.toggle("dark", preferred === "dark");
    document.documentElement.style.colorScheme = preferred;
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem("poll-theme", theme);
  }, [theme]);

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>;
}

const ThemeContext = createContext<{
  theme: "light" | "dark";
  setTheme: (theme: "light" | "dark") => void;
} | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
