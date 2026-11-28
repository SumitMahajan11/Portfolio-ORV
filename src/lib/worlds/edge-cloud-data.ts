/**
 * Edge-Cloud Orchestrator Data & Model Specification
 *
 * Source: Edge-Cloud Orchestrator interactive mission view.
 * Single source of truth for star-network nodes, paths, pipeline steps,
 * simulation timings, decision logs, and ledger items.
 */

export interface EdgeCloudNode {
  id: string;
  x: number;
  y: number;
  name: string;
  kind: string; // 'EDGE' | 'CLOUD' | 'HIGH CARBON' | 'LOW CARBON'
  category: 'c' | 'a'; // 'c' (cyan/green route) | 'a' (amber/high carbon route)
  description: string;
  meters: [number, number, number]; // [speed, cost, green] (0 to 1)
}

export const NODE_INGRESS: EdgeCloudNode = {
  id: 'ingress',
  x: 95,
  y: 290,
  name: 'Edge Ingress',
  kind: 'EDGE',
  category: 'c',
  description: 'Where a task enters. The scheduler scores every candidate route.',
  meters: [0.5, 0.4, 0.5],
};

export const NODE_CLEAN_COMPUTE: EdgeCloudNode = {
  id: 'compute',
  x: 905,
  y: 290,
  name: 'Clean Compute',
  kind: 'CLOUD',
  category: 'c',
  description: 'Low-carbon destination where the workload runs.',
  meters: [0.4, 0.5, 0.9],
};

// Route A: Shortest path, higher carbon (Amber)
export const ROUTE_A_NODES: EdgeCloudNode[] = [
  NODE_INGRESS,
  {
    id: 'coal_hub',
    x: 310,
    y: 165,
    name: 'Coal-grid hub',
    kind: 'HIGH CARBON',
    category: 'a',
    description: 'Fast and close, but the grid behind it burns mostly coal.',
    meters: [0.9, 0.8, 0.15],
  },
  {
    id: 'gas_relay',
    x: 600,
    y: 140,
    name: 'Gas relay',
    kind: 'HIGH CARBON',
    category: 'a',
    description: 'Short hop, moderate to high emissions.',
    meters: [0.8, 0.7, 0.3],
  },
  NODE_CLEAN_COMPUTE,
];

// Route C: Greener route (Cyan / Soft Green)
export const ROUTE_C_NODES: EdgeCloudNode[] = [
  NODE_INGRESS,
  {
    id: 'solar_edge',
    x: 275,
    y: 415,
    name: 'Solar edge',
    kind: 'LOW CARBON',
    category: 'c',
    description: 'Daytime solar node. Longer path, far cleaner energy.',
    meters: [0.6, 0.6, 0.85],
  },
  {
    id: 'wind_relay',
    x: 520,
    y: 470,
    name: 'Wind relay',
    kind: 'LOW CARBON',
    category: 'c',
    description: 'Wind-backed relay that keeps the route green.',
    meters: [0.55, 0.55, 0.9],
  },
  {
    id: 'hydro_region',
    x: 740,
    y: 395,
    name: 'Hydro region',
    kind: 'LOW CARBON',
    category: 'c',
    description: 'Hydro-powered region just before the destination.',
    meters: [0.5, 0.65, 0.95],
  },
  NODE_CLEAN_COMPUTE,
];

export const ALL_EDGE_CLOUD_NODES: EdgeCloudNode[] = [
  NODE_INGRESS,
  ROUTE_A_NODES[1],
  ROUTE_A_NODES[2],
  ROUTE_C_NODES[1],
  ROUTE_C_NODES[2],
  ROUTE_C_NODES[3],
  NODE_CLEAN_COMPUTE,
];

/**
 * Generate Catmull-Rom cubic Bezier spline SVG path string.
 */
export function generateSplinePath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  let s = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i - 1] || points[i];
    const b = points[i];
    const c = points[i + 1];
    const e = points[i + 2] || c;
    const cp1x = b.x + (c.x - a.x) / 6;
    const cp1y = b.y + (c.y - a.y) / 6;
    const cp2x = c.x - (e.x - b.x) / 6;
    const cp2y = c.y - (e.y - b.y) / 6;
    s += ` C${cp1x.toFixed(2)},${cp1y.toFixed(2)} ${cp2x.toFixed(2)},${cp2y.toFixed(2)} ${c.x},${c.y}`;
  }
  return s;
}

export const PATH_A_D = generateSplinePath(ROUTE_A_NODES);
export const PATH_C_D = generateSplinePath(ROUTE_C_NODES);

export interface StarPoint {
  cx: number;
  cy: number;
  r: number;
  opacity: number;
}

export interface ConstellationLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * Deterministically precomputes background constellation stars & connection lines
 * using the design prototype's linear congruential generator (seed 7).
 */
export function getConstellationBackground(): {
  stars: StarPoint[];
  lines: ConstellationLine[];
} {
  let seed = 7;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const stars: StarPoint[] = [];
  const coords: [number, number][] = [];

  for (let i = 0; i < 70; i++) {
    const x = Math.round(rand() * 1000 * 10) / 10;
    const y = Math.round(rand() * 560 * 10) / 10;
    coords.push([x, y]);
    const r = Math.round((rand() * 1.4 + 0.6) * 100) / 100;
    const opacity = Math.round((rand() * 0.35 + 0.15) * 100) / 100;
    stars.push({ cx: x, cy: y, r, opacity });
  }

  const lines: ConstellationLine[] = [];
  for (let j = 0; j < 18; j++) {
    const p = coords[j * 3];
    const q = coords[j * 3 + 1];
    if (p && q && Math.hypot(p[0] - q[0], p[1] - q[1]) < 170) {
      lines.push({
        x1: p[0],
        y1: p[1],
        x2: q[0],
        y2: q[1],
      });
    }
  }

  return { stars, lines };
}

export const CONSTELLATION_BG = getConstellationBackground();

export const PIPELINE_STEPS = [
  'Submit',
  'Validate',
  'Schedule',
  'Rust agent',
  'Execute',
  'Feedback',
] as const;

export const TIMING_THRESHOLDS = [0, 700, 1400, 2900, 6300, 7100] as const;
export const TOTAL_CYCLE_MS = 11500; // Calibrated for readable, graceful animation speed
export const TRAVEL_WINDOW = [2900, 6300] as const;

export interface LogLine {
  text: string;
  isAmber?: boolean;
}

export const BASE_STEP_LOGS: string[] = [
  'Task received from the dashboard.',
  'Schema and tenant access checked.',
  'Scoring 2 candidate routes on speed, cost and carbon…',
  'Rust agent on the first node accepts the assignment.',
  'Workload runs in a container at the destination.',
  'Outcome returns to the scheduler to improve the next decision.',
];

export interface LedgerCategory {
  title: 'BUILT' | 'SIMULATED' | 'SCAFFOLDED';
  badgeColor: 'cyan' | 'amber' | 'violet';
  items: string[];
}

export const LEDGER_DATA: LedgerCategory[] = [
  {
    title: 'BUILT',
    badgeColor: 'cyan',
    items: [
      'Saga and Transactional Outbox (in the README)',
      'Rust edge agent with Docker and WASM executors',
      'ML-assisted scoring in TensorFlow.js',
    ],
  },
  {
    title: 'SIMULATED',
    badgeColor: 'amber',
    items: [
      'Placement latency (508 ms P99, measured 2026-06-19): End-to-end task scheduling achieved a 508 ms P99 latency across 1,000 synthetic HTTP/database placements.',
      'Carbon-reduction benchmark (11.41%): Diurnal workload shifting deferred 416 tasks to clean energy windows, reducing total carbon emissions by 11.41%.',
      'Load benchmark (216k–366k placements/sec across runs: 366,387.6 RPS original run, 216,225.6 RPS re-run 2026-11-28; P95 0.008–0.020 ms): In-memory multi-objective scheduler micro-benchmark.',
      'Note: These three benchmarks measure distinct system layers and must not be compared. Full-stack run (1,000 tasks at 100 req/s, 100 nodes, PostgreSQL); not re-run on 2026-11-28.',
    ],
  },
  {
    title: 'SCAFFOLDED',
    badgeColor: 'violet',
    items: [
      'mTLS enforcement: certificates built, server wiring pending',
    ],
  },
];

export const PROJECT_LINKS = {
  repo: 'https://github.com/SumitMahajan11/Edge-Cloud-Orchestrator',
  architecture:
    'https://github.com/SumitMahajan11/Edge-Cloud-Orchestrator/blob/main/ARCHITECTURE.md',
  demo: 'https://edge-cloud-orchestrator-web-swart.vercel.app/',
  benchmark:
    'https://github.com/SumitMahajan11/edge-cloud-orchestrator/tree/main/docs/benchmarks',
};
