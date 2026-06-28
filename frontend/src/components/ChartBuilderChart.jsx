import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js-dist-min";
import { useTheme } from "../context/ThemeContext";

/**
 * ChartBuilderChart — Clean 2D chart renderer.
 * Dark: neon-on-dark. Light: rich indigo/violet palette — no white or gray.
 */

// Shared palette — vivid but harmonious, visible on both dark & light
const PALETTE = [
  "#4f46e5", // indigo-600
  "#0891b2", // cyan-600
  "#d97706", // amber-600
  "#059669", // emerald-600
  "#e11d48", // rose-600
  "#7c3aed", // violet-600
  "#ea580c", // orange-600
  "#16a34a", // green-600
  "#2563eb", // blue-600
  "#c026d3", // fuchsia-600
];

const ChartBuilderChart = ({ data, layout = {}, className = "w-full h-full" }) => {
  const chartRef = useRef(null);
  const { theme } = useTheme();
  const isLight = theme === "midnight"; // midnight = light theme

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    /* ── Light theme: rich indigo/violet color system ── */
    /* ── Dark theme: neon-on-dark system ── */

    const gridColor  = isLight ? "rgba(79,70,229,0.12)"    : "rgba(148,163,184,0.10)";
    const zeroLine   = isLight ? "rgba(79,70,229,0.20)"    : "rgba(148,163,184,0.15)";
    const lineClr    = isLight ? "rgba(79,70,229,0.15)"    : "rgba(255,255,255,0.07)";
    const axisTitle  = isLight ? "#3730a3"  : "#94a3b8";   // indigo-800 / slate-400
    const tickText   = isLight ? "#4338ca"  : "#64748b";   // indigo-700 / slate-500
    const legendText = isLight ? "#1e1b4b"  : "#cbd5e1";   // indigo-950 / slate-300
    const legendBg   = isLight ? "rgba(238,242,255,0.97)"  : "rgba(15,23,42,0.80)";
    const legendBdr  = isLight ? "rgba(99,102,241,0.25)"   : "rgba(255,255,255,0.08)";
    const hoverBg    = isLight ? "#eef2ff"  : "#1e293b";   // indigo-50 / slate-800
    const hoverBdr   = isLight ? "#6366f1"  : "#334155";   // indigo-500 / slate-700
    const hoverText  = isLight ? "#1e1b4b"  : "#f1f5f9";   // indigo-950 / slate-100
    const barOutline = isLight ? "rgba(67,56,202,0.18)"    : "rgba(255,255,255,0.10)";
    const textOnBar  = isLight ? "#3730a3"  : "#94a3b8";
    const titleClr   = isLight ? "#1e1b4b"  : "#e2e8f0";

    /* ── Colour & style each trace ── */
    const coloredTraces = data.map((trace, i) => {
      const color = PALETTE[i % PALETTE.length];
      const base  = { ...trace };

      if (trace.type === "bar") {
        const xLen = (trace.x || []).length;
        base.marker = {
          color: data.length === 1
            ? Array.from({ length: xLen }, (_, ci) => PALETTE[ci % PALETTE.length])
            : color,
          opacity: isLight ? 0.82 : 0.88,
          line: { color: barOutline, width: 1 },
        };
        base.texttemplate  = "%{y:.2s}";
        base.textposition  = "outside";
        base.textfont      = { color: textOnBar, size: 10, family: "Inter, system-ui, sans-serif" };
        base.hovertemplate = "<b>%{x}</b><br>%{y:,.2f}<extra></extra>";
      }

      if (trace.type === "scatter") {
        const isLine = trace.mode?.includes("lines");
        base.line   = { color, width: isLine ? 2.5 : undefined, shape: "spline" };
        base.marker = {
          color, size: 7, opacity: 0.90,
          line: { color: isLight ? "#eef2ff" : "#0f172a", width: 1.5 },
        };
        base.hovertemplate = "<b>%{x}</b><br>%{y:,.2f}<extra></extra>";
        if (trace.fill) {
          const hex = color.replace("#","");
          const r = parseInt(hex.slice(0,2),16);
          const g = parseInt(hex.slice(2,4),16);
          const b = parseInt(hex.slice(4,6),16);
          base.fillcolor = `rgba(${r},${g},${b},${isLight ? 0.10 : 0.12})`;
        }
      }

      if (trace.type === "pie") {
        base.marker   = { colors: PALETTE, line: { color: isLight ? "#eef2ff" : "#0f172a", width: 2 } };
        base.textinfo = "label+percent";
        base.textfont = { size: 12, color: isLight ? "#1e1b4b" : "#e2e8f0", family: "Inter, system-ui, sans-serif" };
        base.hole     = 0.38;
        base.hovertemplate = "<b>%{label}</b><br>%{value:,.0f} (%{percent})<extra></extra>";
      }

      if (trace.type === "heatmap") {
        base.colorscale = isLight
          ? [[0,"#ddd6fe"],[0.25,"#818cf8"],[0.5,"#e0e7ff"],[0.75,"#f43f5e"],[1,"#9f1239"]]
          : [[0,"#312e81"],[0.25,"#4338ca"],[0.5,"#94a3b8"],[0.75,"#be123c"],[1,"#7f1d1d"]];
        base.showscale = true;
        base.colorbar  = {
          tickfont: { color: tickText, size: 10 },
          outlinecolor: "transparent",
          bordercolor:  "transparent",
        };
      }

      if (trace.type === "box") {
        const hex = color.replace("#","");
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);
        base.marker    = { color, outliercolor: "#e11d48", size: 4,
          line: { color: isLight?"rgba(67,56,202,0.3)":"rgba(255,255,255,0.2)", width:1 } };
        base.line      = { color };
        base.fillcolor = `rgba(${r},${g},${b},0.18)`;
        base.boxmean   = true;
      }

      if (trace.type === "histogram") {
        base.marker = {
          color: isLight ? "rgba(67,56,202,0.70)" : "rgba(79,70,229,0.75)",
          line:  { color: isLight ? "#4338ca" : "#6366f1", width: 1.2 },
        };
        base.hovertemplate = "Range: %{x}<br>Count: %{y}<extra></extra>";
      }

      return base;
    });

    /* ── Build layout ── */
    const titleText = typeof layout.title === "string"
      ? layout.title : layout.title?.text || "";

    const axisBase = {
      showgrid:   true,
      gridcolor:  gridColor,
      gridwidth:  1,
      showline:   true,
      linecolor:  lineClr,
      tickcolor:  tickText,
      tickfont:   { color: tickText, size: 10 },
      ticks:      "outside",
      ticklen:    4,
      zeroline:   false,
      automargin: true,
    };

    const mergedLayout = {
      autosize:    true,
      paper_bgcolor: "transparent",
      plot_bgcolor:  "transparent",
      font: { family: "Inter, system-ui, sans-serif", size: 11, color: tickText },
      margin: { l: 64, r: 32, t: 52, b: 80 },
      title: titleText ? {
        text: titleText,
        font: { color: titleClr, size: 13, family: "Inter, system-ui, sans-serif" },
        x: 0.04, xanchor: "left",
      } : undefined,
      legend: {
        font:        { color: legendText, size: 11 },
        bgcolor:     legendBg,
        bordercolor: legendBdr,
        borderwidth: 1,
        x: 1.02, y: 1,
        orientation: "v",
      },
      xaxis: {
        ...axisBase,
        title: { text: layout.xaxis?.title?.text || layout.xaxis?.title || "", font: { color: axisTitle, size: 11 } },
      },
      yaxis: {
        ...axisBase,
        showline:      false,
        zeroline:      true,
        zerolinecolor: zeroLine,
        title: { text: layout.yaxis?.title?.text || layout.yaxis?.title || "", font: { color: axisTitle, size: 11 } },
      },
      bargap:      0.22,
      bargroupgap: 0.08,
      barmode:     "group",
      hoverlabel: {
        bgcolor:     hoverBg,
        bordercolor: hoverBdr,
        font: { color: hoverText, size: 12 },
      },
    };

    const hasPie     = coloredTraces.some(t => t.type === "pie");
    const hasHeatmap = coloredTraces.some(t => t.type === "heatmap");

    if (hasPie) {
      mergedLayout.xaxis  = { visible: false };
      mergedLayout.yaxis  = { visible: false };
      mergedLayout.margin = { l: 20, r: 170, t: 52, b: 20 };
      mergedLayout.legend = { ...mergedLayout.legend, x: 0.82, y: 0.5, xanchor: "left", yanchor: "middle" };
    }
    if (hasHeatmap) {
      mergedLayout.margin = { l: 90, r: 80, t: 60, b: 90 };
      mergedLayout.xaxis.tickangle = -40;
    }

    const cfg = {
      responsive: true,
      displayModeBar: "hover",
      displaylogo: false,
      modeBarButtonsToRemove: ["select2d","lasso2d"],
      toImageButtonOptions: { format: "png", scale: 2 },
    };

    Plotly.newPlot(chartRef.current, coloredTraces, mergedLayout, cfg);

    const onResize = () => chartRef.current && Plotly.Plots.resize(chartRef.current);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (chartRef.current) Plotly.purge(chartRef.current);
    };
  }, [data, layout, theme]);

  return <div ref={chartRef} className={className} />;
};

export default ChartBuilderChart;
