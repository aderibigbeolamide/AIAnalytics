import React from "react";
import { PlatformAnalyticsDashboard } from "@/components/features/platform-analytics-dashboard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function PlatformAnalytics() {
  const [, setLocation] = useLocation();

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => setLocation("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      <PlatformAnalyticsDashboard />
    </div>
  );
}