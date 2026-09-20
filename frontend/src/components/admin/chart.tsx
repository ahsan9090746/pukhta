"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ChartProps {
  type: "line" | "bar" | "area";
  data: any[];
  xKey: string;
  yKey: string;
  color?: string;
}

function ChartElement({ type, ...props }: { type: "line" | "bar" | "area"; [key: string]: any }) {
  if (type === "line") return <Line {...props} />;
  if (type === "bar") return <Bar {...props} />;
  return <Area {...props} />;
}

export default function Chart({ type, data, xKey, yKey, color = "hsl(var(--primary))" }: ChartProps) {
  if (!data.length) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const commonProps = {
    data,
    margin: { top: 5, right: 20, left: 0, bottom: 5 },
  };

  const axisProps = {
    tickLine: false,
    axisLine: false,
    tick: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
  };

  const ChartComponent = type === "line" ? LineChart : type === "bar" ? BarChart : AreaChart;

  return (
    <div className="h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent {...commonProps}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey={xKey} {...axisProps} />
          <YAxis {...axisProps} />
          <Tooltip
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: "12px",
            }}
          />
          <ChartElement
            type={type}
            dataKey={yKey}
            stroke={color}
            fill={type === "area" ? color : undefined}
            fillOpacity={type === "area" ? 0.1 : undefined}
            strokeWidth={2}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}
