import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { MemberForm } from "@/components/member-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAuthHeaders } from "@/lib/auth";
import { UserPlus, Edit, QrCode, Users, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Members() {
  const { toast } = useToast();
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilter, setMemberFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["/api/members", memberFilter, memberSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (memberFilter !== "all") params.append("auxiliaryBody", memberFilter);
      if (memberSearch) params.append("search", memberSearch);
      
      const response = await fetch(`/api/members?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      return response.json();
    },
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

  // Filter members by event participation if event filter is selected
  const filteredMembers = eventFilter === "all" ? members : 
    members.filter((member: any) => {
      // This would need to be enhanced with actual registration data
      return true; // Placeholder logic
    });

  const getAuxiliaryBodyBadge = (auxiliaryBody: string) => {
    const colors: Record<string, string> = {
      "Atfal": "bg-blue-100 text-blue-800",
      "Khuddam": "bg-green-100 text-green-800",
      "Lajna": "bg-purple-100 text-purple-800",
      "Ansarullah": "bg-orange-100 text-orange-800",
      "Nasra": "bg-pink-100 text-pink-800",
    };
    return colors[auxiliaryBody] || "bg-gray-100 text-gray-800";
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                  <p className="text-sm font-medium text-gray-600">Total Members</p>
                  <p className="text-2xl font-bold text-gray-900">{members.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {members.filter((m: any) => m.status === 'active').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Online Members</p>
                <p className="text-2xl font-bold text-gray-900">
                  {members.filter((m: any) => m.status === 'online').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Auxiliary Bodies</p>
                <p className="text-2xl font-bold text-gray-900">
                  {new Set(members.map((m: any) => m.auxiliaryBody)).size}
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
                All Members
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
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                </div>
                <Select value={memberFilter} onValueChange={setMemberFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by auxiliary body" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Auxiliary Bodies</SelectItem>
                    <SelectItem value="Atfal">Atfal</SelectItem>
                    <SelectItem value="Khuddam">Khuddam</SelectItem>
                    <SelectItem value="Lajna">Lajna</SelectItem>
                    <SelectItem value="Ansarullah">Ansarullah</SelectItem>
                    <SelectItem value="Nasra">Nasra</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by event" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((event: any) => (
                      <SelectItem key={event.id} value={event.id.toString()}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Members Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Auxiliary Body</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chanda #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jamaat</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMembers.map((member: any) => (
                    <tr key={member.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {member.firstName} {member.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getAuxiliaryBodyBadge(member.auxiliaryBody)}>
                          {member.auxiliaryBody}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.chandaNumber || "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusBadge(member.status)}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {member.jamaat}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mr-2"
                          onClick={() => {
                            setEditingMember(member);
                            setIsMemberModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <QrCode className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredMembers.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No members found matching your criteria.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}