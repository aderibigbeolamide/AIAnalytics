import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { RegistrationForm } from "@/components/registration-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users } from "lucide-react";

export default function EventRegistration() {
  const { id } = useParams();

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", id, "public"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}/public`);
      if (!response.ok) {
        throw new Error('Event not found');
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading event...</div>;
  }

  if (!event) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-muted-foreground">The event you're looking for doesn't exist or has been removed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (event.status === "cancelled") {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Event Cancelled</h2>
            <p className="text-muted-foreground">This event has been cancelled and is no longer accepting registrations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Event Info */}
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
                {event.endDate && (
                  <span>- {new Date(event.endDate).toLocaleDateString()}</span>
                )}
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

            {event.allowGuests && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Guests are welcome</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration Form */}
        <RegistrationForm eventId={id!} event={event} />
      </div>
    </div>
  );
}