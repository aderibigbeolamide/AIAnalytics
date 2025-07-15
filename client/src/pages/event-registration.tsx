import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { DynamicRegistrationForm } from "@/components/dynamic-registration-form";
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

  // Check registration timing - use registration dates if available, otherwise fall back to event dates
  const now = new Date();
  
  const registrationStart = event.registrationStartDate ? new Date(event.registrationStartDate) : new Date(event.startDate);
  const registrationEnd = event.registrationEndDate ? new Date(event.registrationEndDate) : (event.endDate ? new Date(event.endDate) : null);
  
  const registrationStarted = now >= registrationStart;
  const registrationEnded = registrationEnd && now > registrationEnd;

  // Block registration if registration period hasn't started yet
  if (!registrationStarted) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Registration Not Yet Open</h2>
            <p className="text-muted-foreground mb-4">
              Registration for this event is not yet open. Please wait until the registration period starts.
            </p>
            <p className="text-sm text-gray-500">
              Registration opens on {registrationStart.toLocaleDateString()} at {registrationStart.toLocaleTimeString()}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (registrationEnded) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Registration Period Ended</h2>
            <p className="text-muted-foreground">
              The registration period for this event has ended on {registrationEnd.toLocaleDateString()}.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Event Info Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Event Registration</h1>
          <p className="text-gray-600">Join us for an amazing event experience</p>
        </div>

        {/* Event Info */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg">
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-3xl font-bold">{event.name}</CardTitle>
                <p className="text-blue-100 mt-2 text-lg">{event.description}</p>
              </div>
              <Badge variant={event.status === "active" ? "default" : "secondary"} className="bg-white/20 text-white border-white/20">
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Event Date</p>
                  <p className="font-semibold text-lg">
                    {new Date(event.startDate).toLocaleDateString()}
                    {event.endDate && event.endDate !== event.startDate && (
                      <span> - {new Date(event.endDate).toLocaleDateString()}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg">
                <MapPin className="h-6 w-6 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600 font-medium">Location</p>
                  <p className="font-semibold text-lg">{event.location}</p>
                </div>
              </div>
            </div>

            {event.eligibleAuxiliaryBodies && event.eligibleAuxiliaryBodies.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 text-gray-800">Eligible Auxiliary Bodies:</h3>
                <div className="flex flex-wrap gap-2">
                  {event.eligibleAuxiliaryBodies.map((body: string) => (
                    <Badge key={body} variant="outline" className="bg-white border-gray-300">
                      {body}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className={`flex items-center gap-3 p-4 rounded-lg ${event.allowGuests ? 'bg-green-50' : 'bg-red-50'}`}>
              <Users className={`h-6 w-6 ${event.allowGuests ? 'text-green-600' : 'text-red-600'}`} />
              <div>
                <p className="text-sm text-gray-600 font-medium">Guest Policy</p>
                <p className={`font-semibold ${event.allowGuests ? 'text-green-800' : 'text-red-800'}`}>
                  {event.allowGuests ? 'Guests are welcome to attend' : 'Guests are not welcome'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Registration Period Information */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="h-6 w-6 text-green-600" />
              <h3 className="text-xl font-semibold text-green-800">Registration Period</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white/70 p-4 rounded-lg">
                <p className="text-sm text-gray-600 font-medium">Registration Opens</p>
                <p className="font-semibold text-lg text-green-800">
                  {registrationStart.toLocaleDateString()} at {registrationStart.toLocaleTimeString()}
                </p>
              </div>
              {registrationEnd && (
                <div className="bg-white/70 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 font-medium">Registration Closes</p>
                  <p className="font-semibold text-lg text-orange-800">
                    {registrationEnd.toLocaleDateString()} at {registrationEnd.toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-lg">
              <p className="text-sm text-green-700">
                ✅ Registration is currently <strong>OPEN</strong>. You can register for this event now.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Registration Form */}
        <DynamicRegistrationForm
          eventId={id!}
          event={event}
        />
        
        {/* Footer */}
        <div className="text-center py-6 text-gray-500">
          <p>© 2024 EventValidate. Secure event registration system.</p>
        </div>
      </div>
    </div>
  );
}