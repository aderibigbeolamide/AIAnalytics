import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { MemberForm } from "@/components/member-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuxiliaryBodyFilter } from "@/components/auxiliary-body-filter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { getAuthHeaders } from "@/lib/auth";
import { UserPlus, Edit, QrCode, Users, Filter, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Members() {
  const { toast } = useToast();
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const queryClient = useQueryClient();

  const deleteMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      return apiRequest("DELETE", `/api/members/${memberId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({
        title: "Success",
        description: "Member has been temporarily removed from the system",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members", memberFilter, memberSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memberFilter !== "all") params.append("auxiliaryBody", memberFilter);
      if (memberSearch) params.append("search", memberSearch);
      
      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {};
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      const response = await fetch(`/api/members?${params.toString()}`, {
        headers,
      });
      return response.json();
    },
  });

  const { data: events = [] } = useQuery({
    queryKey: ["/api/events"],
    queryFn: async () => {
      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {};
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      const response = await fetch("/api/events", {
        headers,
      });
      return response.json();
    },
  });

  // Query to get event registrations when specific event is selected
  const { data: eventRegistrations = [] } = useQuery({
    queryKey: ["/api/event-registrations", eventFilter],
    queryFn: async () => {
      if (eventFilter === "all") return [];
      
      const authHeaders = getAuthHeaders();
      const headers: Record<string, string> = {};
      if (authHeaders.Authorization) {
        headers.Authorization = authHeaders.Authorization;
      }
      
      const response = await fetch(`/api/events/${eventFilter}/registrations`, {
        headers,
      });
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: eventFilter !== "all",
  });

  // Display either general members or event registrations based on filter
  const displayItems = eventFilter === "all" ? members : eventRegistrations;

  const totalPages = Math.ceil(displayItems.length / itemsPerPage);
  const effectiveCurrentPage = Math.min(currentPage, Math.max(totalPages, 1));
  const startIndex = (effectiveCurrentPage - 1) * itemsPerPage;
  const paginatedItems = displayItems.slice(startIndex, startIndex + itemsPerPage);
  
  useEffect(() => {
    if (currentPage !== effectiveCurrentPage && effectiveCurrentPage > 0) {
      setCurrentPage(effectiveCurrentPage);
    }
  }, [currentPage, effectiveCurrentPage]);

  const getAuxiliaryBodyBadge = (auxiliaryBody: string) => {
    // Generate consistent colors based on auxiliary body name
    const colors = [
      "bg-blue-100 text-blue-800",
      "bg-green-100 text-green-800", 
      "bg-purple-100 text-purple-800",
      "bg-orange-100 text-orange-800",
      "bg-pink-100 text-pink-800",
      "bg-indigo-100 text-indigo-800",
      "bg-yellow-100 text-yellow-800",
      "bg-red-100 text-red-800",
    ];
    
    // Generate consistent color index based on string hash
    let hash = 0;
    for (let i = 0; i < auxiliaryBody.length; i++) {
      hash = auxiliaryBody.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      "active": "bg-green-100 text-green-800",
      "online": "bg-blue-100 text-blue-800",
      "inactive": "bg-gray-100 text-gray-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Member Management</h1>
          <p className="text-gray-600">Manage community members and track their participation</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {eventFilter === "all" ? "Total Members" : "Total Registrations"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{displayItems.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {eventFilter === "all" ? "Active Members" : "Pending Validation"}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {displayItems.filter((m: any) => m.status === 'active').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {eventFilter === "all" ? "Online Members" : "Validated/Present"}
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {displayItems.filter((m: any) => m.status === 'online').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Auxiliary Bodies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(displayItems.map((m: any) => m.auxiliaryBody).filter(Boolean)).size}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                {eventFilter === "all" ? "All Members" : `${events.find((e: any) => e.id === eventFilter)?.name || "Event"} Registrations`}
              </CardTitle>
              <Dialog open={isMemberModalOpen} onOpenChange={setIsMemberModalOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingMember ? "Edit Member" : "Add New Member"}
                    </DialogTitle>
                  </DialogHeader>
                  <MemberForm 
                    onClose={() => {
                      setIsMemberModalOpen(false);
                      setEditingMember(null);
                    }} 
                    member={editingMember}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Input
                    placeholder="Search members..."
                    value={memberSearch}
                    onChange={(e) => { setMemberSearch(e.target.value); setCurrentPage(1); }}
                  />
                </div>
                <AuxiliaryBodyFilter 
                  value={memberFilter} 
                  onValueChange={(value) => { setMemberFilter(value); setCurrentPage(1); }} 
                />
                <div className="w-[200px]">
                  <Select value={eventFilter} onValueChange={(value) => { setEventFilter(value); setCurrentPage(1); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select event to view registrations" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members (Traditional)</SelectItem>
                      {events.map((event: any) => (
                        <SelectItem key={event.id} value={event.id.toString()}>
                          {event.name} Registrations
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auxiliary Body</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedItems.map((item: any) => {
                    // Handle both member and registration display
                    const displayName = eventFilter === "all" ? 
                      `${item.firstName} ${item.lastName}` : 
                      (item.guestName || `${item.firstName || ''} ${item.lastName || ''}`.trim() || 'N/A');
                    const displayEmail = item.email || item.guestEmail;
                    // Get auxiliary body from multiple possible sources
                    const displayAuxiliaryBody = item.auxiliaryBody || 
                                                item.guestAuxiliaryBody || 
                                                item.registrationData?.auxiliaryBody ||
                                                item.registrationData?.AuxiliaryBody ||
                                                item.registrationData?.auxiliary_body ||
                                                (item.auxiliaryBody === "" ? "Not Specified" : item.auxiliaryBody);
                    const displayStatus = item.status || 'registered';
                    const itemId = item.id || item._id;
                    
                    return (
                      <tr key={itemId}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {item.firstName?.[0]}{item.lastName?.[0]}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {displayName}
                              </div>
                              <div className="text-sm text-gray-500">{displayEmail}</div>
                              {eventFilter !== "all" && (
                                <div className="text-xs text-blue-600">
                                  ID: {item.uniqueId || 'N/A'}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getAuxiliaryBodyBadge(displayAuxiliaryBody)}>
                            {displayAuxiliaryBody}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getStatusBadge(displayStatus)}>
                            {displayStatus === 'online' ? 'Present' : displayStatus}
                          </Badge>
                        </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => {
                              if (eventFilter === "all") {
                                setEditingMember(item);
                                setIsMemberModalOpen(true);
                              }
                            }}
                            disabled={eventFilter !== "all"}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to temporarily remove <strong>{displayName}</strong> from the system? 
                                  This action will hide the member from the active list, but their data will be preserved and can be restored later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => eventFilter === "all" && deleteMemberMutation.mutate(itemId)}
                                  disabled={eventFilter !== "all" || deleteMemberMutation.isPending}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  {deleteMemberMutation.isPending ? "Removing..." : "Remove Member"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {displayItems.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {eventFilter === "all" ? 
                      "No members found matching your criteria." : 
                      "No registrations found for this event."
                    }
                  </p>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, displayItems.length)} of {displayItems.length} {eventFilter === "all" ? "members" : "registrations"} (Page {effectiveCurrentPage} of {totalPages})
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={effectiveCurrentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={effectiveCurrentPage === totalPages}
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}