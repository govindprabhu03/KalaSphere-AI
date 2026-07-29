"use client";

import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type Evaluation = {
  period: string;
  pitch: number | null;
  rhythm: number | null;
  voice: number | null;
  confidence: number | null;
  coordination: number | null;
  expression: number | null;
  practice: number | null;
  attendance_score: number | null;
  performance: number | null;
};

const FIELDS: [keyof Evaluation, string][] = [
  ["pitch", "Pitch"],
  ["rhythm", "Rhythm"],
  ["voice", "Voice"],
  ["confidence", "Confidence"],
  ["coordination", "Coordination"],
  ["expression", "Expression"],
  ["practice", "Practice"],
  ["attendance_score", "Attendance"],
  ["performance", "Performance"],
];

function avg(e: Evaluation): number {
  const vals = FIELDS.map(([k]) => e[k] as number | null).filter(
    (v): v is number => v != null,
  );
  return vals.length
    ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10
    : 0;
}

export function GrowthCharts({ evals }: { evals: Evaluation[] }) {
  if (evals.length === 0) {
    return <p className="text-sm text-muted-foreground">No evaluations yet.</p>;
  }
  const latest = evals[evals.length - 1];
  const radarData = FIELDS.map(([k, label]) => ({
    metric: label,
    value: (latest[k] as number | null) ?? 0,
  }));
  const lineData = evals.map((e) => ({ period: e.period, score: avg(e) }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">
          Latest skills ({latest.period})
        </p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 10]} tick={{ fontSize: 10 }} />
              <Radar dataKey="value" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.35} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-muted-foreground">Overall trend</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="#db2777" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
