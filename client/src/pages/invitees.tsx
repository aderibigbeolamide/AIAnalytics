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

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const response = await fetch("/api/events", {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
  });

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
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" data-testid="text-invitees-title">
            <UsersRound className="inline mr-2" />
            Event Invitees
          </h1>
          <p className="text-muted-foreground">Manage and track event invitations</p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Event</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger data-testid="select-event">
                  <SelectValue placeholder="Choose an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event: any) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedEvent && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Invitees for {selectedEvent.name}</span>
                  <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                    <DialogTrigger asChild>
                      <Button data-testid="button-create-invitation">
                        <Plus className="w-4 h-4 mr-2" />
                        Create Invitation
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Send Invitation</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invitee-name">Name</Label>
                          <Input
                            id="invitee-name"
                            data-testid="input-invitee-name"
                            placeholder="Enter invitee name"
                            value={inviteForm.name}
                            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invitee-email">Email</Label>
                          <Input
                            id="invitee-email"
                            data-testid="input-invitee-email"
                            type="email"
                            placeholder="Enter invitee email"
                            value={inviteForm.email}
                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="invitation-message">Message (Optional)</Label>
                          <Textarea
                            id="invitation-message"
                            data-testid="textarea-invitation-message"
                            placeholder="Add a personal message"
                            value={inviteForm.message}
                            onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                          />
                        </div>
                        <Button
                          onClick={handleCreateInvitation}
                          disabled={createInvitationMutation.isPending}
                          data-testid="button-send-invitation"
                          className="w-full"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invitees.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {invitees.map((invitee: any) => (
                          <tr key={invitee.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {invitee.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {invitee.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge className={getStatusBadge(invitee.status)}>
                                {invitee.status}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteInvitationMutation.mutate(invitee.id)}
                                disabled={deleteInvitationMutation.isPending}
                                data-testid={`button-delete-${invitee.id}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Mail className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">No invitees for this event yet.</p>
                    <p className="text-sm text-gray-400">Create an invitation to get started.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {!selectedEventId && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center">
                  <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-gray-500">Please select an event to view invitees</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
