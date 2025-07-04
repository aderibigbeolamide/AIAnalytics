import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, MapPin, Users, QrCode, User, Share, Copy, FileText, Camera, Upload } from "lucide-react";
import { useAuthStore } from "@/lib/auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CsvValidation } from "@/components/csv-validation";
import { FaceRecognition } from "@/components/face-recognition";

export default function EventDetail() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [showRegistrationLink, setShowRegistrationLink] = useState(false);

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", id],
    enabled: !!id,
  });

  const { data: registrations = [] } = useQuery<any[]>({
    queryKey: ["/api/events", id, "registrations"],
    enabled: !!id,
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/events/${id}/register`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: "You've been registered for this event.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/events", id, "registrations"] });
      
      // Show QR code
      if (data.qrImage) {
        setQrImageUrl(data.qrImage);
        setShowQR(true);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register for event",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading event...</div>;
  }

  if (!event) {
    return <div className="text-center py-8">Event not found</div>;
  }

  const isRegistered = registrations?.some((reg: any) => reg.userId === user?.id);
  const canRegister = user && !isRegistered;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{event.name}</CardTitle>
              <p className="text-muted-foreground mt-2">{event.description}</p>
            </div>
            <Badge variant={event.status === "active" ? "default" : "secondary"}>
              {event.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>{new Date(event.startDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          </div>

          {event.eligibleAuxiliaryBodies && event.eligibleAuxiliaryBodies.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Eligible Auxiliary Bodies:</h3>
              <div className="flex flex-wrap gap-2">
                {event.eligibleAuxiliaryBodies.map((body: string) => (
                  <Badge key={body} variant="outline">
                    {body}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-4 pt-4">
            {canRegister && (
              <Button
                onClick={() => registerMutation.mutate()}
                disabled={registerMutation.isPending}
                className="flex items-center gap-2"
              >
                <User className="h-4 w-4" />
                {registerMutation.isPending ? "Registering..." : "Register for Event"}
              </Button>
            )}
            
            {isRegistered && (
              <Button
                variant="outline"
                onClick={() => {
                  const registration = registrations?.find((reg: any) => reg.userId === user?.id);
                  if (registration?.qrCode) {
                    // Generate QR image for existing registration
                    fetch(`/api/qr/generate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ data: registration.qrCode }),
                    })
                      .then(res => res.json())
                      .then(data => {
                        setQrImageUrl(data.qrImage);
                        setShowQR(true);
                      });
                  }
                }}
                className="flex items-center gap-2"
              >
                <QrCode className="h-4 w-4" />
                Show QR Code
              </Button>
            )}

            {user?.role === "admin" && (
              <Button
                variant="outline"
                onClick={() => setShowRegistrationLink(true)}
                className="flex items-center gap-2"
              >
                <Share className="h-4 w-4" />
                Share Registration Link
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {registrations && registrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Registrations ({registrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {registrations.map((reg: any) => (
                <div key={reg.id} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <span className="font-medium">
                      {reg.guestName || reg.guest_name || (reg.member ? `${reg.member.firstName} ${reg.member.lastName}` : "Guest")}
                    </span>
                    <Badge variant="outline" className="ml-2">
                      {reg.registrationType || reg.registration_type}
                    </Badge>
                    {(reg.guestAuxiliaryBody || reg.guest_auxiliary_body) && (
                      <Badge variant="secondary" className="ml-2">
                        {reg.guestAuxiliaryBody || reg.guest_auxiliary_body}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={reg.status === "attended" ? "default" : "secondary"}>
                    {reg.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Tools for Validation */}
      {user?.role === "admin" && event && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Event Validation Tools
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="csv" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="csv" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  CSV Validation
                </TabsTrigger>
                <TabsTrigger value="face" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Face Recognition
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center gap-2">
                  <Share className="h-4 w-4" />
                  Reports
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="csv" className="mt-4">
                <CsvValidation eventId={id!} />
              </TabsContent>
              
              <TabsContent value="face" className="mt-4">
                <FaceRecognition eventId={id!} />
              </TabsContent>
              
              <TabsContent value="reports" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Event Reports</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Public report form link for collecting feedback and complaints about this event.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/report/${id}`}
                        readOnly
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/report/${id}`);
                          toast({
                            title: "Link copied!",
                            description: "Report form link copied to clipboard",
                          });
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => window.open(`/report/${id}`, '_blank')}
                      className="w-full"
                    >
                      View Report Form
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Event QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrImageUrl && (
              <img 
                src={qrImageUrl} 
                alt="Event QR Code" 
                className="w-64 h-64 border rounded"
              />
            )}
            <p className="text-sm text-muted-foreground text-center">
              Show this QR code at the event entrance for attendance validation
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRegistrationLink} onOpenChange={setShowRegistrationLink}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Registration Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Event Registration Link</label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={`${window.location.origin}/register/${id}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/register/${id}`);
                    toast({
                      title: "Link copied!",
                      description: "Registration link copied to clipboard",
                    });
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Share this link with members so they can register for the event. After registration, they'll receive a QR code for event validation.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}