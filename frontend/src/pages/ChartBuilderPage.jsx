import React, { useState, useEffect, useCallback } from "react";
import { useDataset } from "../context/DatasetContext";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../utils/api";
import ChartBuilderChart from "../components/ChartBuilderChart";
import GlassCard from "../components/GlassCard";
import {
  BarChart2, LineChart, ScatterChart, PieChart, LayoutGrid, BoxSelect,
  AreaChart, Sparkles, ChevronRight, Play, RefreshCcw, Info,
  CircleDot, Layers, X, Loader2, Rows3, ChevronsRight
} from "lucide-react";

/* ─── Chart type registry ─── */
const CHART_TYPES = [
  { id:"bar", label:"Bar Chart", icon:BarChart2, description:"Compare values across categories", color:"from-indigo-500 to-indigo-700", glowColor:"shadow-indigo-500/30", needsX:true, needsY:true, needsColor:true, needsSize:false, xLabel:"Category (X axis)", yLabel:"Value (Y axis)", xTypes:["categorical","text","boolean","date","numeric"], yTypes:["numeric"] },
  { id:"line", label:"Line Chart", icon:LineChart, description:"Show trends over time or sequences", color:"from-cyan-500 to-blue-600", glowColor:"shadow-cyan-500/30", needsX:true, needsY:true, needsColor:true, needsSize:false, xLabel:"Time / Sequence (X)", yLabel:"Value (Y)", xTypes:["date","numeric","categorical","text"], yTypes:["numeric"] },
  { id:"area", label:"Area Chart", icon:AreaChart, description:"Filled line — cumulative or stacked trends", color:"from-teal-500 to-emerald-600", glowColor:"shadow-teal-500/30", needsX:true, needsY:true, needsColor:true, needsSize:false, xLabel:"X axis", yLabel:"Y axis", xTypes:["date","numeric","categorical","text"], yTypes:["numeric"] },
  { id:"scatter", label:"Scatter Plot", icon:ScatterChart, description:"Correlations between two numeric columns", color:"from-pink-500 to-rose-600", glowColor:"shadow-pink-500/30", needsX:true, needsY:true, needsColor:true, needsSize:true, xLabel:"X axis (numeric)", yLabel:"Y axis (numeric)", xTypes:["numeric"], yTypes:["numeric"] },
  { id:"pie", label:"Pie Chart", icon:PieChart, description:"Show composition and proportion", color:"from-amber-400 to-orange-500", glowColor:"shadow-amber-500/30", needsX:true, needsY:true, needsColor:false, needsSize:false, xLabel:"Labels (Category)", yLabel:"Values (Numeric)", xTypes:["categorical","text","boolean"], yTypes:["numeric"] },
  { id:"histogram", label:"Histogram", icon:LayoutGrid, description:"Distribution of a single numeric column", color:"from-purple-500 to-violet-700", glowColor:"shadow-purple-500/30", needsX:true, needsY:false, needsColor:false, needsSize:false, xLabel:"Numeric column", xTypes:["numeric"], yTypes:[] },
  { id:"box", label:"Box Plot", icon:BoxSelect, description:"Quartiles, median and outlier detection", color:"from-orange-500 to-red-500", glowColor:"shadow-orange-500/30", needsX:true, needsY:true, needsColor:false, needsSize:false, xLabel:"Group by (Category)", yLabel:"Distribution (Numeric)", xTypes:["categorical","text","boolean"], yTypes:["numeric"] },
  { id:"heatmap", label:"Heatmap", icon:Layers, description:"Correlation matrix of all numeric columns", color:"from-red-500 to-pink-600", glowColor:"shadow-red-500/30", needsX:false, needsY:false, needsColor:false, needsSize:false, xTypes:["numeric"], yTypes:["numeric"], isHeatmap:true },
  { id:"bubble", label:"Bubble Chart", icon:CircleDot, description:"Scatter with a third size dimension", color:"from-lime-400 to-green-500", glowColor:"shadow-lime-500/30", needsX:true, needsY:true, needsColor:true, needsSize:true, xLabel:"X axis (numeric)", yLabel:"Y axis (numeric)", xTypes:["numeric"], yTypes:["numeric"] },
];

const AGG_OPTIONS = [
  { value:"none",  label:"No aggregation (raw data)" },
  { value:"sum",   label:"Sum" },
  { value:"mean",  label:"Average (mean)" },
  { value:"count", label:"Count" },
  { value:"max",   label:"Maximum" },
  { value:"min",   label:"Minimum" },
];

const ROW_MODES = [
  { value:"all",    label:"All rows" },
  { value:"first",  label:"First N rows" },
  { value:"last",   label:"Last N rows" },
  { value:"custom", label:"Custom From - To" },
];

const EXAMPLES = [
  { label:"Sales by Country",      chartId:"bar",       xHint:"Country",     yHint:"Quantity",  agg:"sum",  desc:"Total quantity sold per country" },
  { label:"Revenue Trend",         chartId:"line",      xHint:"InvoiceDate", yHint:"UnitPrice", agg:"sum",  desc:"Total unit price over time" },
  { label:"Quantity Distribution", chartId:"histogram", xHint:"Quantity",    yHint:"",          agg:"none", desc:"How quantities are distributed" },
  { label:"Price vs Quantity",     chartId:"scatter",   xHint:"UnitPrice",   yHint:"Quantity",  agg:"none", desc:"Correlation between price and qty" },
  { label:"Category Share",        chartId:"pie",       xHint:"Country",     yHint:"Quantity",  agg:"sum",  desc:"Proportion of sales per country" },
];

/* ─── Convert raw rows → Plotly traces ─── */
const buildTraces = (rows, chartType, xCol, yCol, colorCol, sizeCol) => {
  if (!rows || rows.length === 0) return [];
  if (chartType === "heatmap") return [];

  if (chartType === "histogram") {
    return [{ type:"histogram", x: rows.map(r => r[xCol]).filter(v => v != null), name: xCol }];
  }
  if (chartType === "pie") {
    return [{ type:"pie", labels: rows.map(r => String(r[xCol] ?? "N/A")), values: rows.map(r => Number(r[yCol]) || 0), name: yCol }];
  }
  if (chartType === "box") {
    const groups = {};
    rows.forEach(r => {
      const g = String(r[xCol] ?? "N/A");
      if (!groups[g]) groups[g] = [];
      const v = Number(r[yCol]);
      if (!isNaN(v)) groups[g].push(v);
    });
    return Object.entries(groups).slice(0, 15).map(([name, vals]) => ({ type:"box", y: vals, name, boxpoints:"outliers" }));
  }
  if (colorCol && rows[0] && colorCol in rows[0]) {
    const groups = {};
    rows.forEach(r => {
      const g = String(r[colorCol] ?? "Other");
      if (!groups[g]) groups[g] = { x:[], y:[] };
      groups[g].x.push(r[xCol]);
      groups[g].y.push(Number(r[yCol]) || 0);
    });
    return Object.entries(groups).slice(0, 10).map(([name, vals]) => {
      if (chartType === "scatter" || chartType === "bubble") return { type:"scatter", mode:"markers", x:vals.x, y:vals.y, name };
      if (chartType === "line") return { type:"scatter", mode:"lines+markers", x:vals.x, y:vals.y, name };
      if (chartType === "area") return { type:"scatter", mode:"lines", fill:"tozeroy", x:vals.x, y:vals.y, name };
      return { type:"bar", x:vals.x, y:vals.y, name };
    });
  }
  const xVals = rows.map(r => r[xCol]);
  const yVals = rows.map(r => Number(r[yCol]) || 0);
  if (chartType === "line")  return [{ type:"scatter", mode:"lines+markers", x:xVals, y:yVals, name:yCol }];
  if (chartType === "area")  return [{ type:"scatter", mode:"lines", fill:"tozeroy", x:xVals, y:yVals, name:yCol }];
  if (chartType === "scatter" || chartType === "bubble") {
    const sz = sizeCol ? rows.map(r => Math.max(Number(r[sizeCol]) || 5, 2)) : undefined;
    return [{ type:"scatter", mode:"markers", x:xVals, y:yVals, name:yCol,
      marker: sz ? { size:sz, sizemode:"area", sizeref: 2 * Math.max(...sz) / (40**2) } : {} }];
  }
  return [{ type:"bar", x:xVals, y:yVals, name:yCol }];
};

/* ─── Small UI helpers ─── */
const ColSelect = ({ label, value, onChange, columns, placeholder, isDark }) => (
  <div>
    <label className={`block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark?"text-slate-400":"text-indigo-800"}`}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`w-full text-xs px-3 py-2 rounded-xl border appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${isDark?"bg-slate-900 border-slate-700 text-slate-200":"bg-indigo-50/80 border-indigo-400 text-indigo-950"}`}>
      <option value="">{placeholder}</option>
      {columns.map(col => col.name ? <option key={col.name} value={col.name}>{col.name} ({col.type})</option> : null)}
    </select>
  </div>
);

const NumInput = ({ value, onChange, min, max, isDark }) => (
  <input type="number" value={value} min={min} max={max}
    onChange={e => onChange(Math.max(min, Math.min(max, Number(e.target.value))))}
    className={`w-full text-xs px-3 py-2 rounded-xl border focus:outline-none focus:ring-1 focus:ring-indigo-500 ${isDark?"bg-slate-900 border-slate-700 text-slate-200":"bg-indigo-50/80 border-indigo-400 text-indigo-950"}`} />
);

/* ─── Main component ─── */
const ChartBuilderPage = () => {
  const { selectedDataset } = useDataset();
  const { theme } = useTheme();
  const isDark = theme !== "midnight";

  // Chart type & columns
  const [selectedChart, setSelectedChart] = useState(CHART_TYPES[0]);
  const [xCol, setXCol]     = useState("");
  const [yCol, setYCol]     = useState("");
  const [colorCol, setColorCol] = useState("");
  const [sizeCol, setSizeCol]   = useState("");
  const [aggFunc, setAggFunc]   = useState("none");

  // Row range
  const [rowMode, setRowMode] = useState("all");
  const [rowN, setRowN]       = useState(5000);
  const [rowFrom, setRowFrom] = useState(0);
  const [rowTo, setRowTo]     = useState(5000);

  // Chart output
  const [plotlyTraces, setPlotlyTraces] = useState(null);
  const [plotlyLayout, setPlotlyLayout] = useState({});
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [hasRendered, setHasRendered] = useState(false);
  const [totalRows, setTotalRows]     = useState(0);
  const [selectedRows, setSelectedRows] = useState(0);
  const [showExamples, setShowExamples] = useState(true);

  const allColumns = selectedDataset?.metadata?.columns
    ? Object.entries(selectedDataset.metadata.columns).map(([name, info]) => ({ name, type: info.type }))
    : [];
  const numericCols = allColumns.filter(c => c.type === "numeric");
  const catCols     = allColumns.filter(c => ["categorical","text","boolean"].includes(c.type));
  const dateCols    = allColumns.filter(c => c.type === "date");
  const xCols       = allColumns.filter(c => selectedChart.xTypes?.includes(c.type));
  const yCols       = allColumns.filter(c => selectedChart.yTypes?.includes(c.type));
  const colorCols   = [...catCols, ...dateCols];
  const sizeCols    = numericCols;
  const maxRows     = selectedDataset?.row_count || 100000;

  // Reset on chart/dataset change
  useEffect(() => {
    setXCol(""); setYCol(""); setColorCol(""); setSizeCol("");
    setPlotlyTraces(null); setError(""); setHasRendered(false);
    const nx = allColumns.filter(c => selectedChart.xTypes?.includes(c.type));
    const ny = allColumns.filter(c => selectedChart.yTypes?.includes(c.type));
    if (nx.length > 0) setXCol(nx[0].name);
    if (selectedChart.needsY && ny.length > 0) setYCol(ny[0].name);
  }, [selectedChart.id, selectedDataset?.id]);

  useEffect(() => {
    if (selectedDataset?.row_count) {
      const cap = Math.min(selectedDataset.row_count, 5000);
      setRowTo(cap); setRowN(cap);
    }
  }, [selectedDataset?.id]);

  const applyExample = (ex) => {
    const chartDef = CHART_TYPES.find(c => c.id === ex.chartId) || CHART_TYPES[0];
    setSelectedChart(chartDef);
    setAggFunc(ex.agg);
    setShowExamples(false);
    setTimeout(() => {
      const xm = allColumns.find(c => c.name.toLowerCase().includes(ex.xHint.toLowerCase()));
      const ym = allColumns.find(c => c.name.toLowerCase().includes(ex.yHint.toLowerCase()));
      if (xm) setXCol(xm.name);
      if (ym) setYCol(ym.name);
    }, 80);
  };

  const handleBuildChart = useCallback(async () => {
    setError(""); setLoading(true); setPlotlyTraces(null);
    if (!selectedDataset) { setError("Please select a dataset first."); setLoading(false); return; }
    if (selectedChart.needsX && !xCol) { setError("Please select an X axis column."); setLoading(false); return; }
    if (selectedChart.needsY && !yCol) { setError("Please select a Y axis column."); setLoading(false); return; }
    if (selectedChart.isHeatmap && numericCols.length < 2) { setError("Heatmap needs at least 2 numeric columns."); setLoading(false); return; }
    try {
      const res = await apiFetch(`/datasets/${selectedDataset.id}/chart-data`, {
        method: "POST",
        body: JSON.stringify({
          type: selectedChart.id, x: xCol||null, y: yCol||null,
          color: colorCol||null, size: sizeCol||null,
          aggregation: aggFunc,
          columns: selectedChart.isHeatmap ? numericCols.map(c=>c.name) : null,
          row_mode: rowMode, row_n: rowN, row_from: rowFrom, row_to: rowTo,
        }),
      });
      const rows = res.rows || [];
      setTotalRows(res.total_rows || 0);
      setSelectedRows(res.selected_rows || rows.length);
      if (rows.length === 0) { setError("No data returned. Adjust columns, aggregation or row range."); setLoading(false); return; }

      // Heatmap
      if (selectedChart.isHeatmap && res.columns) {
        const cols = res.columns;
        const z = cols.map(c1 => cols.map(c2 => { const cell = rows.find(r => r.x===c1&&r.y===c2); return cell?cell.z:0; }));
        setPlotlyTraces([{ type:"heatmap", x:cols, y:cols, z, colorscale:"RdBu", zmid:0, reversescale:true, showscale:true }]);
        setPlotlyLayout({ title:{ text:"Correlation Heatmap" }, xaxis:{ tickangle:-45 } });
        setHasRendered(true); setShowExamples(false); setLoading(false); return;
      }
      const traces = buildTraces(rows, selectedChart.id, xCol, yCol, colorCol, sizeCol);
      if (traces.length === 0) { setError("Could not build chart from these columns."); setLoading(false); return; }
      setPlotlyTraces(traces);
      setPlotlyLayout({
        title: { text:`${selectedChart.label}${xCol?" — "+xCol:""}${yCol?" vs "+yCol:""}` },
        xaxis: { title:{ text:xCol } }, yaxis: { title:{ text:yCol||"Count" } },
      });
      setHasRendered(true); setShowExamples(false);
    } catch (err) { setError(err.message || "Failed to build chart."); }
    finally { setLoading(false); }
  }, [selectedChart, xCol, yCol, colorCol, sizeCol, aggFunc, rowMode, rowN, rowFrom, rowTo, selectedDataset, numericCols]);

  const selBase = `w-full text-xs px-3 py-2 rounded-xl border appearance-none focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer ${isDark?"bg-slate-900 border-slate-700 text-slate-200":"bg-indigo-50/80 border-indigo-400 text-indigo-950"}`;
  const labelBase = `block text-[10px] font-bold uppercase tracking-wider mb-1.5 ${isDark?"text-slate-400":"text-indigo-800"}`;

  const rowRangeLabel = () => {
    if (rowMode==="all")    return `All ${maxRows.toLocaleString()} rows`;
    if (rowMode==="first")  return `First ${rowN.toLocaleString()} rows`;
    if (rowMode==="last")   return `Last ${rowN.toLocaleString()} rows`;
    if (rowMode==="custom") return `Rows ${rowFrom.toLocaleString()} to ${rowTo.toLocaleString()} (${(rowTo-rowFrom).toLocaleString()} rows)`;
    return "";
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white m-0 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" />Chart Builder
        </h1>
        <p className={`text-xs mt-1 ${isDark?"text-slate-500":"text-indigo-800"}`}>
          Pick a chart type, choose columns, set a row range, then build your chart.
        </p>
      </div>

      {!selectedDataset ? (
        <GlassCard>
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <BarChart2 className="h-12 w-12 text-indigo-400 opacity-50" />
            <p className={`text-sm font-semibold ${isDark?"text-slate-400":"text-indigo-900"}`}>No dataset selected</p>
            <p className={`text-xs ${isDark?"text-slate-500":"text-indigo-800"}`}>Go to Datasets and select a dataset first.</p>
          </div>
        </GlassCard>
      ) : (
        <div className="flex gap-6 flex-col xl:flex-row">

          {/* ──── Left panel ──── */}
          <div className="xl:w-80 shrink-0 space-y-4">

            {/* Step 1: Chart Type */}
            <GlassCard>
              <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-indigo-500 text-white text-[9px] font-black">1</span>
                Chart Type
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CHART_TYPES.map(chart => {
                  const Icon = chart.icon;
                  const active = selectedChart.id === chart.id;
                  return (
                    <button key={chart.id} onClick={() => setSelectedChart(chart)} title={chart.description}
                      className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border transition-all duration-200 group cursor-pointer
                        ${active
                          ? `bg-gradient-to-br ${chart.color} border-transparent text-white shadow-lg ${chart.glowColor}`
                          : isDark ? "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800/60"
                                   : "bg-white/60 border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50/60"}`}>
                      <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${active?"text-white":""}`} />
                      <span className="text-[9px] font-bold leading-tight text-center">{chart.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className={`mt-3 px-3 py-2 rounded-xl text-[11px] font-medium flex items-start gap-2 border ${isDark?"bg-indigo-500/10 border-indigo-500/15 text-indigo-300":"bg-indigo-50 border-indigo-200 text-indigo-800"}`}>
                <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>{selectedChart.description}</span>
              </div>
            </GlassCard>

            {/* Step 2: Columns */}
            <GlassCard>
              <p className="text-[10px] font-bold uppercase tracking-widest text-purple-400 mb-3 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-purple-500 text-white text-[9px] font-black">2</span>
                Select Columns
              </p>
              <div className="space-y-3">
                {selectedChart.isHeatmap ? (
                  <div className={`text-xs rounded-xl p-3 border ${isDark?"bg-slate-800/60 border-slate-700 text-slate-300":"bg-indigo-100/60 border-indigo-300 text-indigo-900"}`}>
                    Uses all <strong>{numericCols.length}</strong> numeric columns automatically:&nbsp;
                    <span className={isDark?"text-indigo-400":"text-indigo-700"}>{numericCols.map(c=>c.name).join(", ")||"none found"}</span>
                  </div>
                ) : (<>
                  {selectedChart.needsX && <ColSelect label={selectedChart.xLabel||"X Axis"} value={xCol} onChange={setXCol} columns={xCols} placeholder="— choose column —" isDark={isDark} />}
                  {selectedChart.needsY && <ColSelect label={selectedChart.yLabel||"Y Axis"} value={yCol} onChange={setYCol} columns={yCols} placeholder="— choose column —" isDark={isDark} />}
                  {selectedChart.needsColor && colorCols.length>0 && <ColSelect label="Color / Group by (optional)" value={colorCol} onChange={setColorCol} columns={[{name:"",type:""},...colorCols]} placeholder="— none —" isDark={isDark} />}
                  {selectedChart.needsSize  && sizeCols.length>0  && <ColSelect label="Bubble Size (optional)" value={sizeCol} onChange={setSizeCol} columns={[{name:"",type:""},...sizeCols]} placeholder="— none —" isDark={isDark} />}
                </>)}
              </div>
            </GlassCard>

            {/* Step 3: Aggregation */}
            {["bar","line","area","pie"].includes(selectedChart.id) && (
              <GlassCard>
                <p className="text-[10px] font-bold uppercase tracking-widest text-teal-400 mb-3 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-teal-500 text-white text-[9px] font-black">3</span>
                  Aggregation
                </p>
                <select value={aggFunc} onChange={e=>setAggFunc(e.target.value)} className={selBase}>
                  {AGG_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <p className={`text-[10px] mt-2 ${isDark?"text-slate-500":"text-indigo-800"}`}>
                  Use Sum or Average to collapse rows into one value per X category.
                </p>
              </GlassCard>
            )}

            {/* Step 4: Row Range */}
            <GlassCard>
              <p className="text-[10px] font-bold uppercase tracking-widest text-orange-400 mb-3 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-orange-500 text-white text-[9px] font-black">
                  {["bar","line","area","pie"].includes(selectedChart.id) ? "4" : "3"}
                </span>
                Row Selection
              </p>

              {/* Mode pills */}
              <div className="grid grid-cols-2 gap-1.5 mb-4">
                {ROW_MODES.map(m => (
                  <button key={m.value} onClick={() => setRowMode(m.value)}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer text-center leading-tight
                      ${rowMode===m.value
                        ? "bg-orange-500 border-orange-500 text-white shadow-md shadow-orange-500/25"
                        : isDark ? "bg-slate-900 border-slate-700 text-slate-400 hover:border-orange-500/30 hover:text-slate-300"
                                 : "bg-slate-100 border-slate-300 text-slate-700 hover:border-orange-400 hover:bg-orange-50"}`}>
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Controls */}
              {(rowMode==="first"||rowMode==="last") && (
                <div className="space-y-2">
                  <label className={labelBase}>
                    {rowMode==="first" ? "Rows from start" : "Rows from end"}
                  </label>
                  <NumInput value={rowN} onChange={setRowN} min={1} max={maxRows} isDark={isDark} />
                  <p className={`text-[10px] mt-1 ${isDark?"text-slate-500":"text-indigo-800"}`}>
                    {rowMode==="first" ? `Using rows 0 → ${Math.min(rowN,maxRows).toLocaleString()}` : `Last ${Math.min(rowN,maxRows).toLocaleString()} rows of ${maxRows.toLocaleString()}`}
                  </p>
                </div>
              )}

              {rowMode==="custom" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelBase}>From row</label>
                      <NumInput value={rowFrom} onChange={v=>setRowFrom(Math.min(v, rowTo-1))} min={0} max={maxRows-1} isDark={isDark} />
                    </div>
                    <div>
                      <label className={labelBase}>To row</label>
                      <NumInput value={rowTo} onChange={v=>setRowTo(Math.max(v, rowFrom+1))} min={1} max={maxRows} isDark={isDark} />
                    </div>
                  </div>
                  {/* Visual range bar */}
                  <div className={`relative h-7 rounded-xl overflow-hidden border ${isDark?"bg-slate-800 border-slate-700":"bg-indigo-200 border-indigo-400"}`}>
                    <div
                      className="absolute top-0 bottom-0 bg-gradient-to-r from-orange-500 to-amber-400 opacity-90 transition-all duration-200"
                      style={{ left:`${(rowFrom/maxRows)*100}%`, width:`${Math.max(2,((rowTo-rowFrom)/maxRows)*100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className={`text-[9px] font-bold drop-shadow ${isDark?"text-white":"text-white"}`}>
                        {(rowTo-rowFrom).toLocaleString()} / {maxRows.toLocaleString()} rows
                      </span>
                    </div>
                  </div>
                  <p className={`text-[10px] ${isDark?"text-slate-500":"text-indigo-800"}`}>
                    Row indices are 0-based. Max row = {(maxRows-1).toLocaleString()}.
                  </p>
                </div>
              )}

              {rowMode==="all" && (
                <div className={`text-xs rounded-xl p-3 flex items-center gap-2 border ${isDark?"bg-slate-800/60 border-slate-700 text-slate-300":"bg-indigo-100/60 border-indigo-300 text-indigo-900"}`}>
                  <Rows3 className="h-4 w-4 shrink-0 text-orange-500" />
                  All <strong className={`mx-1 ${isDark?"text-orange-400":"text-orange-600"}`}>{maxRows.toLocaleString()}</strong> rows selected.
                  {maxRows>5000 && <span className={`ml-1 ${isDark?"text-orange-400":"text-orange-600"}`}>(raw charts capped at 5k)</span>}
                </div>
              )}

              {/* Summary pill */}
              <div className={`mt-3 px-3 py-2 rounded-xl text-[10px] font-semibold flex items-center gap-1.5 ${isDark?"bg-orange-500/10 text-orange-300 border border-orange-500/10":"bg-orange-100 text-orange-800 border border-orange-200"}`}>
                <ChevronsRight className="h-3.5 w-3.5 shrink-0" />
                {rowRangeLabel()}
              </div>
            </GlassCard>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                <X className="h-4 w-4 shrink-0" />{error}
              </div>
            )}

            {/* Build button */}
            <button onClick={handleBuildChart} disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" />Building...</> : <><Play className="h-4 w-4" />Build Chart</>}
            </button>

            {hasRendered && !loading && (
              <button onClick={() => { setPlotlyTraces(null); setHasRendered(false); setError(""); setTotalRows(0); setSelectedRows(0); setShowExamples(true); }}
                className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${isDark?"border-slate-700 text-slate-400 hover:bg-slate-800":"border-indigo-400 text-indigo-900 hover:bg-indigo-100/60"}`}>
                <RefreshCcw className="h-3.5 w-3.5" />Reset / New Chart
              </button>
            )}
          </div>

          {/* ──── Right panel: chart ──── */}
          <div className="flex-1 min-w-0">
            <GlassCard>
              {/* Header bar */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className={`text-sm font-bold ${isDark?"text-slate-200":"text-indigo-950"}`}>Chart Preview</h2>
                  <p className={`text-[10px] mt-0.5 ${isDark?"text-slate-500":"text-indigo-800"}`}>
                    {selectedDataset.filename} · {maxRows.toLocaleString()} total rows
                    {selectedRows>0 && plotlyTraces && (
                      <span className={`ml-2 ${isDark?"text-indigo-400":"text-indigo-600"}`}>· {selectedRows.toLocaleString()} rows used</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {hasRendered && selectedRows>0 && (
                    <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${isDark?"bg-orange-500/10 border-orange-500/20 text-orange-400":"bg-orange-100 border-orange-200 text-orange-700"}`}>
                      <Rows3 className="h-3 w-3" />
                      {selectedRows.toLocaleString()} rows
                    </div>
                  )}
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider ${isDark?"bg-indigo-500/10 border-indigo-500/20 text-indigo-400":"bg-indigo-50 border-indigo-200 text-indigo-700"}`}>
                    {React.createElement(selectedChart.icon, { className:"h-3.5 w-3.5" })}
                    <span>{selectedChart.label}</span>
                  </div>
                </div>
              </div>

              {/* Body */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-4">
                  <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
                  <p className={`text-sm ${isDark?"text-slate-400":"text-indigo-800"}`}>Processing {rowRangeLabel()}...</p>
                  <p className={`text-xs ${isDark?"text-slate-500":"text-indigo-700"}`}>Fetching from {maxRows.toLocaleString()} rows</p>
                </div>
              ) : !plotlyTraces ? (
                <div className="space-y-5">
                  <div className="flex flex-col items-center justify-center py-10 gap-4">
                    <div className={`h-20 w-20 rounded-3xl flex items-center justify-center bg-gradient-to-br ${selectedChart.color} shadow-xl`}>
                      {React.createElement(selectedChart.icon, { className:"h-10 w-10 text-white" })}
                    </div>
                    <div className="text-center">
                      <p className={`text-base font-bold ${isDark?"text-slate-300":"text-indigo-950"}`}>{selectedChart.label} ready</p>
                      <p className={`text-xs mt-1 ${isDark?"text-slate-500":"text-indigo-800"}`}>{selectedChart.description}</p>
                    </div>
                    <div className={`flex items-center gap-2 text-xs animate-pulse ${isDark?"text-slate-500":"text-indigo-800"}`}>
                      <ChevronRight className="h-4 w-4" />
                      Set columns on the left → click <strong className={`ml-1 ${isDark?"text-indigo-400":"text-indigo-600"}`}>Build Chart</strong>
                    </div>
                  </div>

                  {showExamples && (
                    <div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest mb-3 ${isDark?"text-slate-500":"text-indigo-800"}`}>
                        Quick examples — click to auto-fill
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        {EXAMPLES.map((ex, i) => {
                          const ChartIcon = CHART_TYPES.find(c => c.id===ex.chartId)?.icon || BarChart2;
                          const cd = CHART_TYPES.find(c => c.id===ex.chartId);
                          return (
                            <button key={i} onClick={() => applyExample(ex)}
                              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all group cursor-pointer ${isDark?"bg-slate-900/60 border-slate-800 hover:border-indigo-500/40 hover:bg-slate-800":"bg-indigo-50/80 border-indigo-300 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm"}`}>
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 bg-gradient-to-br ${cd?.color||"from-indigo-500 to-purple-600"}`}>
                                <ChartIcon className="h-4 w-4 text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className={`text-xs font-semibold ${isDark?"text-slate-200":"text-indigo-950"}`}>{ex.label}</p>
                                <p className={`text-[10px] ${isDark?"text-slate-500":"text-indigo-800"}`}>{ex.desc}</p>
                              </div>
                              <ChevronRight className={`h-4 w-4 shrink-0 transition-colors group-hover:text-indigo-500 ${isDark?"text-slate-600":"text-slate-400"}`} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-[500px]">
                  <ChartBuilderChart data={plotlyTraces} layout={plotlyLayout} className="w-full h-full" />
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChartBuilderPage;
