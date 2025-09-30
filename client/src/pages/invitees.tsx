import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { UsersRound, Mail, Plus, Trash2, Send, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders, queryClient } from "@/lib/auth";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

export default function InviteesPage() {
  const { toast } = useToast();
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: "",
    email: "",
    message: "",
  });

  // Fetch events
  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch("/api/events", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

  // Fetch invitees for selected event
  const { data: invitees = [], refetch: refetchInvitees } = useQuery({
    queryKey: ["/api/events", selectedEventId, "invitees"],
    queryFn: async () => {
      if (!selectedEventId) return [];
      const response = await fetch(`/api/events/${selectedEventId}/invitees`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
    enabled: !!selectedEventId,
  });

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: async (invitationData: { eventId: string; name: string; email: string; message: string }) => {
      const response = await fetch(`/api/events/${invitationData.eventId}/invitees`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: invitationData.name,
          email: invitationData.email,
          message: invitationData.message,
        }),
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Failed to create invitation");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Invitation Sent",
        description: "The invitation has been successfully sent.",
      });
      setInviteForm({ name: "", email: "", message: "" });
      setIsInviteModalOpen(false);
      refetchInvitees();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Send Invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete invitation mutation
  const deleteInvitationMutation = useMutation({
    mutationFn: async (invitationId: number) => {
      const response = await fetch(`/api/invitations/${invitationId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error("Failed to delete invitation");
      }
    },
    onSuccess: () => {
      toast({
        title: "Invitation Deleted",
        description: "The invitation has been successfully removed.",
      });
      refetchInvitees();
    },
    onError: () => {
      toast({
        title: "Failed to Delete",
        description: "Unable to delete the invitation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateInvitation = () => {
    if (!selectedEventId) {
      toast({
        title: "No Event Selected",
        description: "Please select an event first.",
        variant: "destructive",
      });
      return;
    }

    if (!inviteForm.name || !inviteForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in both name and email.",
        variant: "destructive",
      });
      return;
    }

    createInvitationMutation.mutate({
      eventId: selectedEventId,
      ...inviteForm,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-green-100 text-green-800";
      case "declined":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const selectedEvent = events.find((event: any) => event.id.toString() === selectedEventId);

  return (
    <div className="min-h-screen bg-background">
