import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Trash2, AlertTriangle, Info, Calendar, Users } from "lucide-react";
import { formatDate } from "date-fns";

interface CleanupCandidate {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  organizationId: string;
  daysSinceEnded: number;
  totalRegistrations: number;
}

export function EventCleanupManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEvent, setSelectedEvent] = useState<CleanupCandidate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["/api/cleanup/cleanup-candidates"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/cleanup/cleanup-candidates");
      const data = await response.json();
      return data.candidates || [];
    },
  });

  const previewDeletionQuery = useQuery({
    queryKey: ["/api/cleanup/preview-deletion", selectedEvent?.id],
    queryFn: async () => {
      if (!selectedEvent?.id) return null;
      const response = await apiRequest("GET", `/api/cleanup/preview-deletion/${selectedEvent.id}`);
      return response.json();
    },
    enabled: !!selectedEvent?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await apiRequest("DELETE", `/api/cleanup/delete-event/${eventId}`, {
        confirmed: true
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Event Deleted",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/cleanup/cleanup-candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setDeleteDialogOpen(false);
      setSelectedEvent(null);
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDelete = (event: CleanupCandidate) => {
    setSelectedEvent(event);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedEvent) {
      deleteMutation.mutate(selectedEvent.id);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Event Cleanup Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading cleanup candidates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Event Cleanup Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {candidates.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Events to Clean Up</h3>
              <p className="text-gray-500">
                You don't have any events that ended more than 3 months ago.
              </p>
            </div>
          ) : (
            <>
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  These events ended more than 3 months ago. You can delete them to free up database space.
                  <strong> This action cannot be undone.</strong>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                {candidates.map((candidate: CleanupCandidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                  >
                    <div className="flex-1">
                      <h4 className="font-semibold text-gray-900">{candidate.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(new Date(candidate.startDate), 'MMM dd, yyyy')}
                          {candidate.endDate && ` - ${formatDate(new Date(candidate.endDate), 'MMM dd, yyyy')}`}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {candidate.totalRegistrations} registrations
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {Math.floor(candidate.daysSinceEnded / 30)} months ago
                      </Badge>
                      
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(candidate)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm Event Deletion
            </DialogTitle>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to permanently delete <strong>"{selectedEvent.name}"</strong>?
              </p>
              
              {previewDeletionQuery.data && (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-800 mb-2">This will delete:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    <li>• The event: "{selectedEvent.name}"</li>
                    <li>• {previewDeletionQuery.data.dataToDelete.registrations} member registrations</li>
                    {previewDeletionQuery.data.dataToDelete.tickets > 0 && (
                      <li>• {previewDeletionQuery.data.dataToDelete.tickets} tickets</li>
                    )}
                    <li>• All associated attendance records</li>
                  </ul>
                  <p className="text-red-800 font-semibold mt-2">
                    Total: {previewDeletionQuery.data.dataToDelete.totalRecords} database records
                  </p>
                </div>
              )}
              
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. All data associated with this event will be permanently removed.
                </AlertDescription>
              </Alert>
              
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(false)}
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Yes, Delete Permanently"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}