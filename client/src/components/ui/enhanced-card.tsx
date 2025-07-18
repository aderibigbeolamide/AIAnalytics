import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface EnhancedCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: "blue" | "green" | "purple" | "orange" | "red";
  className?: string;
}

const colorMap = {
  blue: {
    icon: "text-blue-600",
    bg: "bg-blue-50",
    badge: "bg-blue-100 text-blue-800",
    gradient: "from-blue-500 to-blue-600"
  },
  green: {
    icon: "text-green-600", 
    bg: "bg-green-50",
    badge: "bg-green-100 text-green-800",
    gradient: "from-green-500 to-green-600"
  },
  purple: {
    icon: "text-purple-600",
    bg: "bg-purple-50", 
    badge: "bg-purple-100 text-purple-800",
    gradient: "from-purple-500 to-purple-600"
  },
  orange: {
    icon: "text-orange-600",
    bg: "bg-orange-50",
    badge: "bg-orange-100 text-orange-800", 
    gradient: "from-orange-500 to-orange-600"
  },
  red: {
    icon: "text-red-600",
    bg: "bg-red-50",
    badge: "bg-red-100 text-red-800",
    gradient: "from-red-500 to-red-600"
  }
};

export function EnhancedCard({ 
  title, 
  value, 
  icon: Icon, 
  description, 
  trend, 
  color = "blue", 
  className 
}: EnhancedCardProps) {
  const colors = colorMap[color];
  
  return (
    <Card className={cn(
      "hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-0 shadow-md",
      className
    )}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl",
              colors.bg
            )}>
              <Icon className={cn("h-6 w-6", colors.icon)} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              {description && (
                <p className="text-xs text-gray-500 mt-1">{description}</p>
              )}
            </div>
          </div>
          {trend && (
            <Badge className={cn(
              trend.isPositive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}