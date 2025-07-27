import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Shield, Palette, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
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
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center">
            <Settings className="h-8 w-8 mr-3" />
            System Settings
          </h1>
          <p className="text-muted-foreground">Manage your account and system preferences</p>
        </div>

        <div className="space-y-6">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="theme-toggle">Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
                </div>
                <Switch
                  id="theme-toggle"
                  checked={theme === "dark"}
                  onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                />
              </div>
              <div className="pt-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current theme: <Badge variant="outline">{theme === "dark" ? "Dark" : "Light"}</Badge>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Account Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Account Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="p-4 bg-gray-50 dark:bg-gray-900/20 rounded-lg border border-gray-200 dark:border-gray-800">
                <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">Account Information</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Your account settings and preferences are managed through the admin dashboard. Contact your system administrator for account modifications.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* System Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Database className="h-5 w-5 mr-2" />
                System Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">System Version:</span>
                  <Badge variant="outline">{settings?.systemVersion || "1.0.0"}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Database Status:</span>
                  <Badge className={settings?.databaseConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                    {settings?.databaseConnected ? "Connected" : "Disconnected"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Email Service:</span>
                  <Badge className={settings?.emailEnabled ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}>
                    {settings?.emailEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">QR Validation Time:</span>
                  <Badge variant="outline">{settings?.qrValidationTime || 24} hours</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">Security Features</h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                    <li>• JWT token-based authentication (7-day expiry)</li>
                    <li>• Password hashing with bcrypt</li>
                    <li>• QR code encryption for secure validation</li>
                    <li>• Role-based access control</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}