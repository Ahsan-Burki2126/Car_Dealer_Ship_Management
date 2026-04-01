/**
 * Theme utilities for dark mode support
 * Provides functions to generate theme-aware colors and SVGs
 */

/**
 * Detects if the current theme is dark mode
 */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

/**
 * Gets theme-aware colors for charts and UI components
 */
export function getChartColors() {
  const isDark = isDarkMode();
  return {
    gridStroke: isDark ? "#374151" : "#e2e8f0",
    axisText: isDark ? "#9ca3af" : "#6b7280",
    tooltipBg: isDark ? "#1f2937" : "#f9fafb",
    tooltipBorder: isDark ? "#374151" : "#e5e7eb",
    legendText: isDark ? "#d1d5db" : "#6b7280",
  };
}

/**
 * Generates a placeholder SVG with colors responsive to the current theme
 * @param width - SVG width
 * @param height - SVG height
 * @param text - Text to display in the placeholder
 * @returns Data URI for the SVG
 */
export function generatePlaceholderSVG(
  width: number = 200,
  height: number = 140,
  text: string = "No image",
): string {
  const isDark = isDarkMode();

  // Light mode: light gray background with darker gray text
  // Dark mode: dark gray background with lighter gray text
  const bgColor = isDark ? "%231f2937" : "%23e5e7eb";
  const textColor = isDark ? "%23d1d5db" : "%239ca3af";

  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>
    <rect width='${width}' height='${height}' fill='${bgColor}'/>
    <text x='${width / 2}' y='${height / 2 + 2}' text-anchor='middle' fill='${textColor}' font-size='13' font-family='sans-serif'>${text}</text>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Gets the theme-aware color for SVG elements
 * Useful for markers, strokes, and fills that need to respond to theme changes
 */
export function getThemeAwareColor(
  lightColor: string,
  darkColor: string,
): string {
  return isDarkMode() ? darkColor : lightColor;
}

/**
 * Listens for theme changes and updates DOM colors dynamically
 * Used for SVG elements that need to be updated when theme changes
 */
export function watchThemeChanges(
  callback: (isDark: boolean) => void,
): () => void {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.attributeName === "class") {
        const isDark = isDarkMode();
        callback(isDark);
      }
    });
  });

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  return () => observer.disconnect();
}
