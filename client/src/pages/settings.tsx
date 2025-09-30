import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Shield, Palette, Database, Trash2 } from "lucide-react";
import { EventCleanupManager } from "@/components/event-cleanup-manager";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useTheme } from "@/components/theme-provider";

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const response = await fetch("/api/settings", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });



  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
