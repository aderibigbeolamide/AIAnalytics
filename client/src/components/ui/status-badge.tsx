import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  // Event statuses
  upcoming: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Upcoming"
  },
  active: {
    color: "bg-green-100 text-green-800 border-green-200", 
    label: "Active"
  },
  completed: {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    label: "Completed"
  },
  cancelled: {
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Cancelled"
  },
  
  // Registration statuses
  registered: {
    color: "bg-blue-100 text-blue-800 border-blue-200",
    label: "Registered"
  },
  online: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Online"
  },
  attended: {
    color: "bg-purple-100 text-purple-800 border-purple-200",
    label: "Attended"
  },
  
  // Payment statuses
  pending: {
    color: "bg-yellow-100 text-yellow-800 border-yellow-200",
    label: "Pending"
  },
  paid: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Paid"
  },
  verified: {
    color: "bg-green-100 text-green-800 border-green-200",
    label: "Verified"
  },
  rejected: {
    color: "bg-red-100 text-red-800 border-red-200",
    label: "Rejected"
  }
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    color: "bg-gray-100 text-gray-800 border-gray-200",
    label: status
  };
  
  return (
    <Badge 
      variant="outline"
      className={cn(
        config.color,
        "font-medium",
        className
      )}
    >
      {config.label}
    </Badge>
  );
}