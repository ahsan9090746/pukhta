"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  /** Optional % delta — omit to hide the change row entirely */
  change?: number | null;
  /** Text after the change %, e.g. "from last month" (default) or "vs yesterday" */
  changeLabel?: string;
  icon: React.ComponentType<any>;
}

export default function StatsCard({
  title,
  value,
  change,
  changeLabel = "from last month",
  icon: Icon,
}: StatsCardProps) {
  if (change === undefined || change === null) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );
  }

  const isPositive = change >= 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className={cn("flex items-center text-xs mt-1", isPositive ? "text-green-600" : "text-red-600")}>
          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
          {Math.abs(change)}% {changeLabel}
        </div>
      </CardContent>
    </Card>
  );
}
