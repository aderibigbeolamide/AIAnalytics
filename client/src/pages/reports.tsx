import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { FileText, Search, Eye, Clock, CheckCircle, XCircle, MessageSquare, User, Mail, Phone, Calendar } from "lucide-react";
import { format } from "date-fns";

interface Report {
  id: number;
  eventId: number;
  reporterName: string;
  reporterEmail: string;
  reporterPhone: string;
  reportType: string;
  message: string;
  status: string;
  createdAt: string;
  event?: {
    id: number;
    name: string;
  };
}

export default function Reports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/reports');
      return response.json();
    },
  });

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, notes }: { reportId: number; status: string; notes?: string }) => {
      const response = await apiRequest('PUT', `/api/reports/${reportId}`, {
        status,
        reviewNotes: notes
      });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Report updated",
        description: `Report has been ${data.status}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      setShowReviewDialog(false);
      setSelectedReport(null);
      setReviewNotes("");
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update report",
        variant: "destructive",
      });
    },
  });

  const handleReviewReport = (report: Report) => {
    setSelectedReport(report);
    setReviewNotes("");
    setShowReviewDialog(true);
  };

  const handleStatusUpdate = (status: string) => {
    if (selectedReport) {
      updateReportMutation.mutate({
        reportId: selectedReport.id,
        status,
        notes: reviewNotes
      });
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = searchTerm === "" || 
      report.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.reporterEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || report.status === statusFilter;
    const matchesType = typeFilter === "all" || report.reportType === typeFilter;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'reviewed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircle className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'reviewed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'closed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'complaint':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'suggestion':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'praise':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'technical':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Reports</h1>
          <p className="text-gray-600">
            Manage and review all event feedback and reports
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="complaint">Complaint</SelectItem>
              <SelectItem value="suggestion">Suggestion</SelectItem>
              <SelectItem value="observation">Observation</SelectItem>
              <SelectItem value="praise">Praise</SelectItem>
              <SelectItem value="technical">Technical</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              {filteredReports.length} report{filteredReports.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Reports List */}
        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading reports...</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                  ? "No reports match your filters"
                  : "No reports submitted yet"
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle className="text-lg">{report.reporterName}</CardTitle>
                        <Badge className={getStatusColor(report.status)}>
                          {getStatusIcon(report.status)}
                          <span className="ml-1 capitalize">{report.status}</span>
                        </Badge>
                        <Badge variant="outline" className={getTypeColor(report.reportType)}>
                          {report.reportType}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{report.reporterEmail}</span>
                        {report.reporterPhone && <span>{report.reporterPhone}</span>}
                        <span>{format(new Date(report.createdAt), 'MMM d, yyyy h:mm a')}</span>
                      </div>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleReviewReport(report)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <p className="text-gray-800 mb-3 line-clamp-3">{report.message}</p>
                  
                  {report.event && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">Event:</span>
                      <span>{report.event.name}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Report</DialogTitle>
          </DialogHeader>
          
          {selectedReport && (
            <div className="space-y-4">
              {/* Report Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{selectedReport.reporterName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{selectedReport.reporterEmail}</span>
                  </div>
                  {selectedReport.reporterPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-600">{selectedReport.reporterPhone}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {format(new Date(selectedReport.createdAt), 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getTypeColor(selectedReport.reportType)}>
                      {selectedReport.reportType}
                    </Badge>
                    <Badge className={getStatusColor(selectedReport.status)}>
                      {selectedReport.status}
                    </Badge>
                  </div>
                  {selectedReport.event && (
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">Event:</span> {selectedReport.event.name}
                    </div>
                  )}
                </div>
              </div>

              {/* Report Message */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Report Message</span>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-32 overflow-y-auto">
                  <p className="text-sm text-gray-800">{selectedReport.message}</p>
                </div>
              </div>

              {/* Review Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Review Notes (Optional)</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add any review notes or comments..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  variant="outline"
                  onClick={() => setShowReviewDialog(false)}
                >
                  Cancel
                </Button>
                
                {selectedReport.status === 'pending' && (
                  <Button 
                    onClick={() => handleStatusUpdate('reviewed')}
                    disabled={updateReportMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {updateReportMutation.isPending ? 'Updating...' : 'Mark as Reviewed'}
                  </Button>
                )}
                
                {selectedReport.status !== 'closed' && (
                  <Button 
                    onClick={() => handleStatusUpdate('closed')}
                    disabled={updateReportMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {updateReportMutation.isPending ? 'Updating...' : 'Close Report'}
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}