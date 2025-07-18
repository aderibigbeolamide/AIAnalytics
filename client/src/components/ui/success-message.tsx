import { CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface MessageProps {
  title?: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  className?: string;
}

const messageConfig = {
  success: {
    icon: CheckCircle,
    className: "border-green-200 bg-green-50 text-green-800",
    iconClassName: "text-green-600"
  },
  error: {
    icon: AlertCircle,
    className: "border-red-200 bg-red-50 text-red-800", 
    iconClassName: "text-red-600"
  },
  warning: {
    icon: AlertTriangle,
    className: "border-yellow-200 bg-yellow-50 text-yellow-800",
    iconClassName: "text-yellow-600"
  },
  info: {
    icon: Info,
    className: "border-blue-200 bg-blue-50 text-blue-800",
    iconClassName: "text-blue-600"
  }
};

export function Message({ title, message, type = "info", className }: MessageProps) {
  const config = messageConfig[type];
  const Icon = config.icon;
  
  return (
    <Alert className={cn(config.className, className)}>
      <Icon className={cn("h-4 w-4", config.iconClassName)} />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="text-sm">
        {message}
      </AlertDescription>
    </Alert>
  );
}

export function SuccessMessage({ title = "Success!", message, className }: Omit<MessageProps, "type">) {
  return <Message title={title} message={message} type="success" className={className} />;
}

export function ErrorMessage({ title = "Error", message, className }: Omit<MessageProps, "type">) {
  return <Message title={title} message={message} type="error" className={className} />;
}

export function WarningMessage({ title = "Warning", message, className }: Omit<MessageProps, "type">) {
  return <Message title={title} message={message} type="warning" className={className} />;
}

export function InfoMessage({ title = "Information", message, className }: Omit<MessageProps, "type">) {
  return <Message title={title} message={message} type="info" className={className} />;
}