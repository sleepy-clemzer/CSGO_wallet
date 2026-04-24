/**
 * Custom Recharts tooltip component.
 *
 * Renders a styled tooltip card on chart hover,
 * showing the timestamp label and one row per data series.
 * Adapts its color scheme to the active theme.
 *
 * @param {boolean}  active   - Whether the tooltip is currently visible
 * @param {Object[]} payload  - Recharts data payload for the hovered point
 * @param {*}        label    - X-axis label (usually a formatted timestamp)
 * @param {string}   theme    - Active theme ("dark" | "light")
 */
export function ChartTooltip({ active, payload, label, theme }) {
  if (!active || !payload?.length) return null;

  const isDark = theme === "dark";

  return (
    <div style={{
      background:   isDark ? "#111" : "#fff",
      border:       `1px solid ${isDark ? "#222" : "#e4e4e7"}`,
      borderRadius: 8,
      padding:      "9px 12px",
      fontFamily:   "'JetBrains Mono',monospace",
      boxShadow:    isDark
        ? "0 12px 40px rgba(0,0,0,.8)"
        : "0 4px 20px rgba(0,0,0,0.1)",
    }}>
      {/* Timestamp label */}
      <p style={{
        color:       isDark ? "#555" : "#71717a",
        fontSize:    10,
        marginBottom: 6,
        fontFamily:  "'Inter',sans-serif",
        fontWeight:  500
      }}>
        {label}
      </p>

      {/* One row per data series */}
      {payload.map((p, i) => (
        <p key={i} style={{
          color:  p.color || p.stroke || (isDark ? "#ccc" : "#3f3f46"),
          fontSize: 11,
          margin: "2px 0"
        }}>
          {p.name}: {Number(p.value).toFixed(2)} €
        </p>
      ))}
    </div>
  );
}