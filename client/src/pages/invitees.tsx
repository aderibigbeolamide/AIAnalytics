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
import { Navbar } from "@/components/navbar";

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
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center">
            <UsersRound className="h-8 w-8 mr-3" />
            Manage Invitees
          </h1>
          <p className="text-gray-600">Send invitations and manage invitee responses for your events</p>
        </div>

        {/* Event Selection */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Select Event
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="event-select">Choose an event to manage invitees</Label>
                <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                  <SelectTrigger id="event-select">
                    <SelectValue placeholder="Select an event..." />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event: any) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name} - {new Date(event.startDate).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedEvent && (
                <div className="flex items-end">
                  <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Send Invitation
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Send Invitation</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="invite-name">Invitee Name</Label>
                          <Input
                            id="invite-name"
                            value={inviteForm.name}
                            onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                            placeholder="Enter invitee name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="invite-email">Email Address</Label>
                          <Input
                            id="invite-email"
                            type="email"
                            value={inviteForm.email}
                            onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                            placeholder="Enter email address"
                          />
                        </div>
                        <div>
                          <Label htmlFor="invite-message">Personal Message (Optional)</Label>
                          <Textarea
                            id="invite-message"
                            value={inviteForm.message}
                            onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                            placeholder="Add a personal message..."
                            rows={3}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setIsInviteModalOpen(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleCreateInvitation}
                            disabled={createInvitationMutation.isPending}
                          >
                            {createInvitationMutation.isPending ? "Sending..." : "Send Invitation"}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
            {selectedEvent && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-blue-800 mb-2">{selectedEvent.name}</h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Date:</strong> {new Date(selectedEvent.startDate).toLocaleDateString()} - {new Date(selectedEvent.endDate).toLocaleDateString()}</p>
                  <p><strong>Location:</strong> {selectedEvent.location}</p>
                  <p><strong>Status:</strong> <Badge className={getStatusBadge(selectedEvent.status)}>{selectedEvent.status}</Badge></p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitees List */}
        {selectedEventId && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  Invitees ({invitees.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invitees.length === 0 ? (
                <div className="text-center py-8">
                  <Mail className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No invitees yet</h3>
                  <p className="text-gray-600 mb-4">Start by sending your first invitation!</p>
                  <Button onClick={() => setIsInviteModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Send First Invitation
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invitee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Invited By
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date Sent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {invitees.map((invitee: any) => (
                        <tr key={invitee.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {invitee.inviteeName || "Unknown"}
                              </div>
                              <div className="text-sm text-gray-500">{invitee.inviteeEmail}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={getStatusBadge(invitee.status)}>
                              {invitee.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {invitee.invitedBy?.username || "System"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(invitee.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this invitation?")) {
                                  deleteInvitationMutation.mutate(invitee.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}