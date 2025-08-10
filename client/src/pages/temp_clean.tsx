import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Shield, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Building,
  Building2,
  UserCheck,
  BarChart3,
  Clock,
  ArrowLeft,
  Home,
  Send,
  Bell,
  MessageSquare,
  Megaphone,
  FileText,
  Ban,
  DollarSign,
  Settings,
  TrendingDown,
  Target,
  CreditCard,
  Receipt,
  Download,
  Share
} from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from "recharts";

// Platform Fee Schema
const platformFeeSchema = z.object({
  platformFee: z.number()
    .min(0, "Platform fee must be at least 0%")
    .max(20, "Platform fee cannot exceed 20%")
});

type PlatformFeeFormData = z.infer<typeof platformFeeSchema>;



interface PlatformStatistics {
  overview: {
    totalUsers: number;
    totalAdmins: number;
    totalSuperAdmins: number;
    totalEvents: number;
    totalRegistrations: number;
    totalMembers: number;
    totalOrganizations: number;
    activeUsers: number;
    approvedOrganizations: number;
    upcomingEvents: number;
    activeMembers: number;
  };
  financial: {
    totalRevenue: number;
    totalTransactions: number;
    platformFeesEarned: number;
    ticketsSold: number;
    totalTicketRevenue: number;
    paidRegistrations: number;
    averageTransactionValue: number;
  };
  growth: {
    newUsersLast7Days: number;
    newUsersLast30Days: number;
    newEventsLast7Days: number;
    newEventsLast30Days: number;
    newOrgsLast7Days: number;
    newOrgsLast30Days: number;
    userGrowthRate: number;
    eventGrowthRate: number;
  };
  events: {
    upcoming: number;
    past: number;
    cancelled: number;
    total: number;
    registrationBased: number;
    ticketBased: number;
  };
  users: {
    active: number;
    pending: number;
    suspended: number;
    admins: number;
    superAdmins: number;
    members: number;
  };
  organizations: {
    approved: number;
    pending: number;
    suspended: number;
    total: number;
  };
  engagement: {
    totalRegistrations: number;
    paidRegistrations: number;
    freeRegistrations: number;
    conversionRate: number;
    averageRegistrationsPerEvent: number;
  };
}

interface User {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  businessName?: string;
  businessEmail?: string;
  lastLogin?: string;
  createdAt: string;
}

interface Event {
  id: number;
  name: string;
  status: string;
  startDate: string;
  endDate?: string;
  creator?: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    businessName?: string;
  };
  registrationCount: number;
  attendedCount: number;
  createdAt: string;
}

interface PendingOrganization {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  website?: string;
  address?: string;
  status: string;
  createdAt: string;
}

interface Organization {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  status: string;
  subscriptionPlan?: string;
  adminCount: number;
  createdAt: string;
}

interface ChatSession {
  id: string;
  userEmail?: string;
  isEscalated: boolean;
  adminId?: string;
  status: 'active' | 'resolved' | 'pending_admin';
  messages: any[];
  createdAt: string;
  lastActivity: string;
}

// Notification schemas
const broadcastMessageSchema = z.object({
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  expirationDays: z.number().min(1).max(365).default(30)
});

const organizationMessageSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  title: z.string().min(1, "Title is required"),
  message: z.string().min(1, "Message is required"),
  priority: z.enum(["low", "medium", "high"]).default("medium")
});

function StatCard({ title, value, description, icon: Icon, trend }: {
  title: string;
  value: number;
  description: string;
  icon: any;
  trend?: string;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs md:text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-xl md:text-2xl font-bold">{value.toLocaleString()}</div>
        <p className="text-xs md:text-sm text-muted-foreground">
          {description}
          {trend && <span className="text-green-600 ml-1 bg-green-50 px-2 py-1 rounded-full">{trend}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

export default function SuperAdminDashboard() {
