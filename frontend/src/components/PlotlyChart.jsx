import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';
import { useTheme } from '../context/ThemeContext';

// Neon 3D Colors from User Image
const NEON_3D_GRADIENT = [
  '#f9c80e', // Bar 1: Yellow/Gold
  '#00f3ff', // Bar 2: Cyan
  '#ff007f', // Bar 3: Hot Pink
  '#ff5a00', // Bar 4: Orange-Red
  '#bc13fe', // Bar 5: Purple
  '#39ff14', // Bar 6: Lime Green
];

// Soft Watercolor Colors from User Image
const WATERCOLOR_3D_GRADIENT = [
  '#00f3ff', // Translucent Cyan
  '#2563eb', // Royal Blue
  '#ffccd5', // Translucent Light Pink
  '#38bdf8', // Sky Blue
  '#1d4ed8', // Cobalt Blue
  '#e0f2fe', // Ice Blue
];

// Helper to convert hex to rgba
const hexToRgba = (hex, alpha) => {
  if (!hex || typeof hex !== 'string') return hex;
  if (!hex.startsWith('#')) return hex;
  let c = hex.substring(1);
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  try {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return hex;
  }
};

// Helper to build 3D platform trace (glass base shelf)
const create3DPlatformTrace = (numCategories, isMidnight) => {
  const minX = -0.4;
  const maxX = numCategories - 1 + 0.4;
  const minY = -0.22;
  const maxY = 0.22;
  const minZ = -0.01;
  const maxZ = 0.0;

  // 8 vertices defining the shelf box
  const x = [
    minX, maxX, maxX, minX,
    minX, maxX, maxX, minX
  ];
  const y = [
    minY, minY, maxY, maxY,
    minY, minY, maxY, maxY
  ];
  const z = [
    minZ, minZ, minZ, minZ,
    maxZ, maxZ, maxZ, maxZ
  ];

  // Indices of triangles
  const i = [0, 0, 4, 4, 0, 0, 2, 2, 0, 0, 1, 1];
  const j = [1, 2, 5, 6, 1, 5, 3, 7, 3, 7, 2, 6];
  const k = [2, 3, 6, 7, 5, 4, 7, 6, 7, 4, 6, 5];

  // Outline paths
  const xPath = [
    minX, maxX, maxX, minX, minX, null,
    minX, maxX, maxX, minX, minX, null,
    minX, minX, null,
    maxX, maxX, null,
    maxX, maxX, null,
    minX, minX
  ];
  const yPath = [
    minY, minY, maxY, maxY, minY, null,
    minY, minY, maxY, maxY, minY, null,
    minY, minY, null,
    minY, minY, null,
    maxY, maxY, null,
    maxY, maxY
  ];
  const zPath = [
    minZ, minZ, minZ, minZ, minZ, null,
    maxZ, maxZ, maxZ, maxZ, maxZ, null,
    minZ, maxZ, null,
    minZ, maxZ, null,
    minZ, maxZ, null,
    minZ, maxZ
  ];

  const fillTrace = {
    type: 'mesh3d',
    x: x,
    y: y,
    z: z,
    i: i,
    j: j,
    k: k,
    name: 'Platform',
    color: 'rgba(255, 255, 255, 0.08)',
    opacity: 0.85,
    flatshading: true,
    lighting: {
      ambient: 0.6,
      diffuse: 0.8,
      specular: 1.0,
      roughness: 0.05,
      fresnel: 0.4
    },
    showlegend: false,
    hoverinfo: 'skip'
  };

  const outlineTrace = {
    type: 'scatter3d',
    mode: 'lines',
    x: xPath,
    y: yPath,
    z: zPath,
    line: {
      color: 'rgba(255, 255, 255, 0.35)',
      width: 2.5
    },
    name: 'Platform Border',
    showlegend: false,
    hoverinfo: 'skip'
  };

  return [fillTrace, outlineTrace];
};

// Helper to build 3D mesh columns (rectangular cuboids)
const create3DColumnTrace = (xIdx, height, label, color) => {
  const w = 0.18; // Bulkier width of column on X axis to match reference image
  const d = 0.18; // Bulkier depth of column on Y axis to match reference image
  const yVal = 0; // Constant Y position (depth center)
  
  // 8 vertices defining the 3D box
  const x = [
    xIdx - w, xIdx + w, xIdx + w, xIdx - w, // Bottom 4 vertices (0-3)
    xIdx - w, xIdx + w, xIdx + w, xIdx - w  // Top 4 vertices (4-7)
  ];
  const y = [
    yVal - d, yVal - d, yVal + d, yVal + d, // Bottom
    yVal - d, yVal - d, yVal + d, yVal + d  // Top
  ];
  const z = [
    0, 0, 0, 0,                            // Bottom
    height, height, height, height         // Top
  ];

  // Indices of vertices forming the 12 triangles (faces) of the cuboid
  const i = [0, 0, 4, 4, 0, 0, 2, 2, 0, 0, 1, 1];
  const j = [1, 2, 5, 6, 1, 5, 3, 7, 3, 7, 2, 6];
  const k = [2, 3, 6, 7, 5, 4, 7, 6, 7, 4, 6, 5];

  return {
    type: 'mesh3d',
    x: x,
    y: y,
    z: z,
    i: i,
    j: j,
    k: k,
    name: label,
    color: color,
    opacity: 0.9, // Higher opacity to avoid hollow/empty look
    flatshading: true, // Sharp edges for 3D realism
    lighting: {
      ambient: 0.8, // Bright ambient fill for a solid glass look
      diffuse: 0.95, // High diffusion to make faces solid
      specular: 1.0, // High specular highlight spot
      roughness: 0.05,
      fresnel: 0.45
    },
    lightposition: {
      x: 1000,
      y: -1000,
      z: 1000
    },
    showlegend: true
  };
};

// Helper to build 3D column wireframe outlines for the neon glass look
const create3DColumnOutlineTrace = (xIdx, height, outlineColor) => {
  const w = 0.18; // Matching column width
  const d = 0.18; // Matching column depth
  const yVal = 0;

  const xPath = [
    // Bottom face
    xIdx - w, xIdx + w, xIdx + w, xIdx - w, xIdx - w, null,
    // Top face
    xIdx - w, xIdx + w, xIdx + w, xIdx - w, xIdx - w, null,
    // Verticals
    xIdx - w, xIdx - w, null,
    xIdx + w, xIdx + w, null,
    xIdx + w, xIdx + w, null,
    xIdx - w, xIdx - w
  ];
  const yPath = [
    // Bottom face
    yVal - d, yVal - d, yVal + d, yVal + d, yVal - d, null,
    // Top face
    yVal - d, yVal - d, yVal + d, yVal + d, yVal - d, null,
    // Verticals
    yVal - d, yVal - d, null,
    yVal - d, yVal - d, null,
    yVal + d, yVal + d, null,
    yVal + d, yVal + d
  ];
  const zPath = [
    // Bottom face
    0, 0, 0, 0, 0, null,
    // Top face
    height, height, height, height, height, null,
    // Verticals
    0, height, null,
    0, height, null,
    0, height, null,
    0, height
  ];

  return {
    type: 'scatter3d',
    mode: 'lines',
    x: xPath,
    y: yPath,
    z: zPath,
    line: {
      color: outlineColor,
      width: 4.5 // Bolder neon light outline to look like image
    },
    showlegend: false,
    hoverinfo: 'skip'
  };
};

// Helper to build 3D mesh donuts (rings)
const create3DDonutTrace = (startAngle, endAngle, label, color) => {
  const R = 0.8; // outer radius
  const r = 0.45; // inner radius
  const H = 0.28; // height of the 3D ring
  const N = 24; // number of segments for smooth curvature
  
  const x = [];
  const y = [];
  const z = [];
  const i = [];
  const j = [];
  const k = [];
  
  for (let idx = 0; idx <= N; idx++) {
    const a = startAngle + idx * (endAngle - startAngle) / N;
    const cosA = Math.cos(a);
    const sinA = Math.sin(a);
    
    // OB (Outer Bottom)
    x.push(R * cosA);
    y.push(R * sinA);
    z.push(0);
    
    // IB (Inner Bottom)
    x.push(r * cosA);
    y.push(r * sinA);
    z.push(0);
    
    // OT (Outer Top)
    x.push(R * cosA);
    y.push(R * sinA);
    z.push(H);
    
    // IT (Inner Top)
    x.push(r * cosA);
    y.push(r * sinA);
    z.push(H);
  }
  
  for (let idx = 0; idx < N; idx++) {
    const ob1 = 4 * idx;
    const ib1 = 4 * idx + 1;
    const ot1 = 4 * idx + 2;
    const it1 = 4 * idx + 3;
    
    const ob2 = 4 * (idx + 1);
    const ib2 = 4 * (idx + 1) + 1;
    const ot2 = 4 * (idx + 1) + 2;
    const it2 = 4 * (idx + 1) + 3;
    
    // Outer Wall
    i.push(ob1); j.push(ob2); k.push(ot2);
    i.push(ob1); j.push(ot2); k.push(ot1);
    
    // Inner Wall
    i.push(ib1); j.push(it2); k.push(ib2);
    i.push(ib1); j.push(it1); k.push(it2);
    
    // Top Face
    i.push(ot1); j.push(ot2); k.push(it2);
    i.push(ot1); j.push(it2); k.push(it1);
    
    // Bottom Face
    i.push(ob1); j.push(ib2); k.push(ob2);
    i.push(ob1); j.push(ib1); k.push(ib2);
  }
  
  // Close start end (idx = 0)
  i.push(0); j.push(2); k.push(3);
  i.push(0); j.push(3); k.push(1);
  
  // Close end end (idx = N)
  const obN = 4 * N;
  const ibN = 4 * N + 1;
  const otN = 4 * N + 2;
  const itN = 4 * N + 3;
  i.push(obN); j.push(itN); k.push(otN);
  i.push(obN); j.push(ibN); k.push(itN);
  
  return {
    type: 'mesh3d',
    x: x,
    y: y,
    z: z,
    i: i,
    j: j,
    k: k,
    name: label,
    color: color,
    opacity: 0.85,
    flatshading: true,
    lighting: {
      ambient: 0.65,
      diffuse: 0.85,
      specular: 0.8,
      roughness: 0.05,
      fresnel: 0.3
    },
    lightposition: {
      x: 1000,
      y: -1000,
      z: 1000
    },
    showlegend: true
  };
};

// Transform data traces to match the exact 3D gradient colors and 3D shapes
const transformDataFor3DNeonGradient = (data, isDark, theme, isChat = false) => {
  if (!data || !Array.isArray(data)) return data;

  // Pre-process histogram traces to binned 2D bar traces
  const processedData = data.map(trace => {
    if (trace.type === 'histogram') {
      const values = (trace.x || []).filter(v => v !== null && v !== undefined);
      if (values.length === 0) {
        return { ...trace, type: 'bar', x: [], y: [], is2DHistogram: true };
      }

      const uniqueVals = Array.from(new Set(values)).sort((a, b) => a - b);
      let xBin, yBin;

      // If there are few unique values, treat them as discrete categories
      if (uniqueVals.length <= 10) {
        const counts = {};
        uniqueVals.forEach(v => counts[v] = 0);
        values.forEach(v => counts[v]++);
        xBin = uniqueVals.map(String);
        yBin = uniqueVals.map(v => counts[v]);
      } else {
        // Group into equal-width bins (e.g. 6 bins for premium spacing in 3D)
        const maxBins = 6;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        if (range === 0) {
          xBin = [String(min)];
          yBin = [values.length];
        } else {
          const binWidth = range / maxBins;
          const bins = Array.from({ length: maxBins }, () => 0);
          const binEdges = Array.from({ length: maxBins + 1 }, (_, idx) => min + idx * binWidth);

          values.forEach(v => {
            let binIdx = Math.floor((v - min) / binWidth);
            if (binIdx >= maxBins) binIdx = maxBins - 1;
            if (binIdx < 0) binIdx = 0;
            bins[binIdx]++;
          });

          xBin = bins.map((_, idx) => {
            const start = binEdges[idx];
            const end = binEdges[idx + 1];
            if (Number.isInteger(min) && Number.isInteger(max)) {
              return `${Math.round(start)}-${Math.round(end)}`;
            }
            return `${start.toFixed(1)}-${end.toFixed(1)}`;
          });
          yBin = bins;
        }
      }

      const binnedHistogram = {
        ...trace,
        type: 'bar',
        x: xBin,
        y: yBin,
        is2DHistogram: true
      };
      delete binnedHistogram.nbinsx;
      delete binnedHistogram.autobinx;
      return binnedHistogram;
    }
    return trace;
  });

  const colorPalette = theme === 'midnight' ? WATERCOLOR_3D_GRADIENT : NEON_3D_GRADIENT;
  const GREEN_GLASS_FILLS = [
    'rgba(0, 245, 160, 0.65)',  // Rich Mint Green Glass (Solid)
    'rgba(0, 255, 136, 0.65)',  // Vibrant Neon Green Glass (Solid)
    'rgba(5, 255, 197, 0.65)',   // Rich Cyan Mint Glass (Solid)
    'rgba(16, 185, 129, 0.65)',  // Rich Emerald Green Glass (Solid)
  ];

  const GREEN_GLASS_OUTLINES = [
    '#00ff88', // High-intensity Neon Glow
    '#39ff14', // High-intensity Lime Glow
    '#05ffc5', // High-intensity Teal Glow
    '#10b981', // High-intensity Emerald Glow
  ];

  const transformed = [];
  
  // Detect if it is a single-trace bar chart. If so, convert to 3D Columns (Mesh3D)
  if (processedData.length === 1 && processedData[0].type === 'bar' && !processedData[0].is2DHistogram && !isChat) {
    const originalTrace = processedData[0];
    const xData = originalTrace.x || [];
    const yData = originalTrace.y || [];
    
    // Add the glass platform base first
    if (xData.length > 0) {
      const platformTraces = create3DPlatformTrace(xData.length, theme === 'midnight');
      transformed.push(...platformTraces);
    }

    xData.forEach((category, idx) => {
      const fillColor = 'rgba(0, 245, 160, 0.68)'; // Exact green fill from picture
      const outlineColor = '#00ff88'; // Exact neon green outline
      
      transformed.push(create3DColumnTrace(idx, yData[idx], String(category), fillColor));
      transformed.push(create3DColumnOutlineTrace(idx, yData[idx], outlineColor));
    });
    return transformed;
  }

  // Detect if it is a single-trace pie chart. If so, convert to 3D Donut Chart (Mesh3D)
  if (processedData.length === 1 && processedData[0].type === 'pie' && !isChat) {
    const originalTrace = processedData[0];
    const labels = originalTrace.labels || [];
    const values = originalTrace.values || [];
    const total = values.reduce((sum, v) => sum + v, 0);
    
    let currentAngle = 0;
    values.forEach((val, idx) => {
      const percentage = val / total;
      const angleSweep = percentage * 2 * Math.PI;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle = endAngle;
      
      const label = labels[idx] || `Category ${idx}`;
      const color = colorPalette[idx % colorPalette.length];
      
      transformed.push(create3DDonutTrace(startAngle, endAngle, label, color));
    });
    return transformed;
  }

  // Otherwise, handle general traces
  processedData.forEach((trace, traceIdx) => {
    // 1. Line/Scatter Charts (Neon Light Tube effect)
    if (trace.type === 'scatter' && (trace.mode === 'lines' || trace.mode === 'lines+markers' || trace.mode === 'lines+markers+text')) {
      if (trace.fill === 'toself' || trace.fill === 'tonexty') {
        transformed.push({
          ...trace,
          fillcolor: theme === 'midnight' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(255, 0, 127, 0.06)',
          line: { color: 'transparent' }
        });
      } else {
        let lineColor = colorPalette[1]; // Cyan/Blue for main line
        if (trace.name && (trace.name.toLowerCase().includes('forecast') || trace.name.toLowerCase().includes('predict'))) {
          lineColor = colorPalette[2]; // Pink/Rose for forecast line
        } else if (traceIdx > 0) {
          lineColor = colorPalette[traceIdx % colorPalette.length];
        }

        // Glow Line
        transformed.push({
          ...trace,
          name: trace.name ? `${trace.name} Glow` : 'Glow',
          showlegend: false,
          hoverinfo: 'skip',
          mode: 'lines',
          line: {
            ...trace.line,
            color: lineColor,
            width: 8,
          },
          opacity: 0.28
        });

        // Core Line
        const coreTrace = {
          ...trace,
          line: {
            ...trace.line,
            color: theme === 'midnight' ? '#1e3a8a' : '#ffffff',
            width: 2.2,
          }
        };
        if (trace.marker) {
          coreTrace.marker = {
            ...trace.marker,
            color: lineColor,
            size: 6,
            line: { color: theme === 'midnight' ? '#1e3a8a' : '#ffffff', width: 1.5 }
          };
        }
        transformed.push(coreTrace);
      }
    }
    // 2. Multi-series Bar Charts (Convert each series to 3D columns clustered together)
    else if (trace.type === 'bar' && !isChat) {
      const originalTrace = trace;
      const xData = originalTrace.x || [];
      const yData = originalTrace.y || [];

      // Add base platform once if it's the first trace
      if (traceIdx === 0 && xData.length > 0) {
        const platformTraces = create3DPlatformTrace(xData.length, theme === 'midnight');
        transformed.push(...platformTraces);
      }

      xData.forEach((category, idx) => {
        // Shift X slightly based on trace index to separate grouped 3D columns
        const xOffset = traceIdx * 0.18;
        const fillColor = GREEN_GLASS_FILLS[traceIdx % GREEN_GLASS_FILLS.length];
        const outlineColor = GREEN_GLASS_OUTLINES[traceIdx % GREEN_GLASS_OUTLINES.length];

        transformed.push(create3DColumnTrace(idx + xOffset, yData[idx], `${originalTrace.name || 'Series'} - ${category}`, fillColor));
        transformed.push(create3DColumnOutlineTrace(idx + xOffset, yData[idx], outlineColor));
      });
    }
    // 3. Heatmaps
    else if (trace.type === 'heatmap') {
      transformed.push({
        ...trace,
        colorscale: theme === 'midnight' ? [
          [0.0, '#f8fafc'],
          [0.3, 'rgba(56, 189, 248, 0.2)'],
          [0.7, 'rgba(37, 99, 235, 0.6)'],
          [1.0, '#1d4ed8']
        ] : [
          [0.0, '#090a10'],
          [0.3, 'rgba(0, 243, 255, 0.2)'],
          [0.7, 'rgba(255, 0, 127, 0.6)'],
          [1.0, '#ff007f']
        ]
      });
    }
    // 4. Stylish 2D Histograms & Chat 2D Bar Charts
    else if (trace.type === 'bar' && (trace.is2DHistogram || isChat)) {
      const isMidnight = theme === 'midnight';
      const isLight = theme === 'light'; // Midnt mode
      
      let fillPalette, strokePalette;
      if (isMidnight) {
        fillPalette = [
          'rgba(0, 243, 255, 0.45)', // Cyan
          'rgba(37, 99, 235, 0.45)', // Royal Blue
          'rgba(244, 63, 94, 0.45)',  // Rose
          'rgba(56, 189, 248, 0.45)', // Sky
          'rgba(29, 78, 216, 0.45)'  // Cobalt
        ];
        strokePalette = [
          '#00f3ff',
          '#2563eb',
          '#f43f5e',
          '#38bdf8',
          '#1d4ed8'
        ];
      } else if (isLight) {
        fillPalette = [
          'rgba(249, 200, 14, 0.35)', // Neon Gold
          'rgba(0, 243, 255, 0.35)',  // Neon Cyan
          'rgba(255, 0, 127, 0.35)',  // Neon Pink
          'rgba(255, 90, 0, 0.35)',   // Neon Orange
          'rgba(188, 19, 254, 0.35)',  // Neon Purple
          'rgba(57, 255, 20, 0.35)'   // Neon Lime
        ];
        strokePalette = [
          '#f9c80e',
          '#00f3ff',
          '#ff007f',
          '#ff5a00',
          '#bc13fe',
          '#39ff14'
        ];
      } else {
        fillPalette = [
          'rgba(99, 102, 241, 0.35)',  // Indigo
          'rgba(168, 85, 247, 0.35)', // Purple
          'rgba(236, 72, 153, 0.35)', // Pink
          'rgba(56, 189, 248, 0.35)'  // Sky
        ];
        strokePalette = [
          '#6366f1',
          '#a855f7',
          '#ec4899',
          '#38bdf8'
        ];
      }

      const count = (trace.x || []).length;
      const markerColors = [];
      const borderColors = [];
      for (let idx = 0; idx < count; idx++) {
        markerColors.push(fillPalette[idx % fillPalette.length]);
        borderColors.push(strokePalette[idx % strokePalette.length]);
      }

      transformed.push({
        ...trace,
        width: 0.22, // Slim width for elegant, thin bar styling
        marker: {
          color: markerColors,
          line: {
            color: borderColors,
            width: 2.2
          },
          cornerradius: 6 // Proportional corner radius for slim columns
        }
      });
    }
    // 5. Default / Fallback
    else {
      transformed.push(trace);
    }
  });

  return transformed;
};

const PlotlyChart = ({ data, layout = {}, config = {}, className = "w-full h-80", isChat = false }) => {
  const chartRef = useRef(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!chartRef.current || !data) return;

    // Force high-tech dark theme mapping globally
    const isDark = true;

    // Apply the 3D modifications
    const neonData = transformDataFor3DNeonGradient(data, isDark, theme, isChat);

    // Check if the output dataset contains 3D elements
    const has3D = neonData.some(trace => trace.type === 'mesh3d');

    const isMidnight = theme === 'midnight';

    // Merge default layout properties
    const defaultLayout = {
      autosize: true,
      paper_bgcolor: 'transparent',
      plot_bgcolor: 'transparent',
      bargap: 0.38,
      barmode: 'group',
      font: {
        family: 'Inter, system-ui, sans-serif',
        size: 11,
        color: isMidnight ? '#1e293b' : '#94a3b8',
      },
      margin: { l: 20, r: 20, t: 30, b: 20 },
      xaxis: {
        showgrid: true,
        gridcolor: isMidnight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(56, 189, 248, 0.05)',
        showline: true,
        linecolor: isMidnight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        tickcolor: isMidnight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        ticks: 'outside',
        zeroline: false,
      },
      yaxis: {
        showgrid: true,
        gridcolor: isMidnight ? 'rgba(15, 23, 42, 0.06)' : 'rgba(56, 189, 248, 0.05)',
        showline: true,
        linecolor: isMidnight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        tickcolor: isMidnight ? 'rgba(15, 23, 42, 0.1)' : 'rgba(255, 255, 255, 0.08)',
        ticks: 'outside',
        zeroline: false,
      },
      legend: {
        font: { color: isMidnight ? '#0f172a' : '#cbd5e1' },
      },
      ...layout,
    };

    // If 3D, configure the 3D scene grid floor and isometric camera angle
    if (has3D) {
      // Find category list from input data or neonData
      const firstBarTrace = data.find(t => t.type === 'bar' || t.type === 'histogram');
      let ticktext = [];
      let tickvals = [];
      let numCategories = 5; // Default fallback
      if (firstBarTrace) {
        const barTraces = neonData.filter(t => t.type === 'mesh3d' && t.name && t.name !== 'Platform');
        const numSeries = data.filter(t => t.type === 'bar' || t.type === 'histogram').length;
        if (numSeries === 1) {
          ticktext = barTraces.map(t => t.name);
          tickvals = barTraces.map((_, i) => i);
          numCategories = barTraces.length;
        } else {
          const categories = firstBarTrace.x || [];
          const centerOffset = (numSeries - 1) * 0.09;
          tickvals = categories.map((_, i) => i + centerOffset);
          ticktext = categories.map(String);
          numCategories = categories.length;
        }
      } else {
        const barTraces = neonData.filter(t => t.type === 'mesh3d' && t.name && t.name !== 'Platform');
        ticktext = barTraces.map(t => t.name);
        tickvals = barTraces.map((_, i) => i);
        numCategories = barTraces.length || 5;
      }

      defaultLayout.scene = {
        dragmode: false, // Disables default Plotly free orbiting/tilting mouse gestures
        camera: {
          eye: { x: 1.45, y: -1.45, z: 1.1 } // Dramatic low-angle isometric perspective
        },
        xaxis: {
          title: '',
          tickvals: tickvals,
          ticktext: ticktext,
          showgrid: false,
          showbackground: false,
          color: isMidnight ? '#1e293b' : '#94a3b8',
          zeroline: false,
          showline: false,
          showspikes: false,
          range: [-0.5, numCategories - 0.5] // Constrain X axis data range
        },
        yaxis: {
          title: '',
          showgrid: false,
          showbackground: false,
          color: 'transparent',
          tickvals: [],
          ticktext: [],
          zeroline: false,
          showline: false,
          showspikes: false,
          range: [-numCategories / 2, numCategories / 2] // Align Y axis range scale to prevent squashing/stretching
        },
        zaxis: {
          title: '',
          showgrid: false,
          showbackground: false,
          color: isMidnight ? '#1e293b' : '#94a3b8',
          zeroline: false,
          showline: false,
          showspikes: false
        },
        aspectmode: 'manual',
        aspectratio: { x: 1.2, y: 1.2, z: 1.5 } // Tower aspect ratio to make columns tall and majestic
      };
    }

    const defaultConfig = {
      responsive: true,
      displayModeBar: 'hover',
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'pan2d', 'resetScale2d', 'toImage'],
      ...config,
    };

    Plotly.newPlot(chartRef.current, neonData, defaultLayout, defaultConfig);

    // Custom horizontal mouse dragging logic (Turntable 180 lock)
    const plotEl = chartRef.current;
    let isDragging = false;
    let startMouseX = 0;
    
    let currentAngle = Math.atan2(-1.45, 1.45); // -0.785 rad (-45 deg)
    const initialZ = 1.1;
    const initialRadius = Math.sqrt(1.45 * 1.45 + 1.45 * 1.45);
    const initialAngle = Math.atan2(-1.45, 1.45);
    
    let isUpdating = false;

    const handleMouseDown = (e) => {
      isDragging = true;
      startMouseX = e.clientX;
      e.preventDefault();
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startMouseX;
      startMouseX = e.clientX;

      // Sensitivity factor: drag horizontal translates directly to camera orbit rotation
      currentAngle += dx * 0.005;

      // Clamp sweep angle to 180 degrees (90 degrees left, 90 degrees right from initial view angle)
      let diff = currentAngle - initialAngle;
      while (diff < -Math.PI) diff += 2 * Math.PI;
      while (diff > Math.PI) diff -= 2 * Math.PI;

      if (diff < -Math.PI / 2) {
        currentAngle = initialAngle - Math.PI / 2;
      } else if (diff > Math.PI / 2) {
        currentAngle = initialAngle + Math.PI / 2;
      }

      if (!isUpdating) {
        isUpdating = true;
        
        const targetX = initialRadius * Math.cos(currentAngle);
        const targetY = initialRadius * Math.sin(currentAngle);

        Plotly.relayout(plotEl, {
          'scene.camera': {
            up: { x: 0, y: 0, z: 1 }, // Keep chart up vector stable
            eye: {
              x: targetX,
              y: targetY,
              z: initialZ // Lock height to prevent top-to-bottom tilting
            }
          }
        }).then(() => {
          isUpdating = false;
        }).catch(() => {
          isUpdating = false;
        });
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    if (has3D) {
      plotEl.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    const handleResize = () => {
      if (chartRef.current) {
        Plotly.Plots.resize(chartRef.current);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (has3D) {
        if (plotEl) {
          plotEl.removeEventListener('mousedown', handleMouseDown);
        }
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      }
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [data, layout, theme]);

  const has3D = data && data.some(trace => trace.type === 'bar' || trace.type === 'pie' || trace.type === 'histogram');

  if (has3D) {
    return (
      <div 
        className={`relative rounded-2xl overflow-hidden border border-emerald-500/10 shadow-lg ${className}`}
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 230, 118, 0.18) 0%, rgba(6, 12, 8, 0.85) 60%, rgba(2, 3, 2, 0.98) 100%)',
          boxShadow: 'inset 0 0 40px rgba(0, 255, 136, 0.08), 0 8px 32px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Soft neon green glowing background orb */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.3) 0%, transparent 60%)',
            filter: 'blur(40px)',
            transform: 'scale(1.2)'
          }}
        />
        <div ref={chartRef} className="w-full h-full" />
      </div>
    );
  }

  return <div ref={chartRef} className={className} />;
};

export default PlotlyChart;
