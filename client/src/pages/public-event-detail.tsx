import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock, QrCode, Ticket } from "lucide-react";
import { CountdownTimer } from "@/components/countdown-timer";
import { Link } from "wouter";
import { EventImage } from "@/lib/event-utils";

export default function PublicEventDetail() {
  const { id } = useParams();

  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", id, "public"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${id}/public`);
      if (!response.ok) {
        throw new Error("Event not found");
      }
      return response.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading event details...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600 mb-4">The event you're looking for doesn't exist.</p>
          <Link href="/">
            <Button>Return Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  const getEventStatus = () => {
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    
    if (now < start) return 'upcoming';
    if (now >= start && now < end) return 'live';
    return 'ended';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Upcoming</Badge>;
      case 'live':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 animate-pulse">Live Now</Badge>;
      case 'ended':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Ended</Badge>;
    }
  };

  const isRegistrationOpen = () => {
    const now = new Date();
    const regStart = new Date(event.registrationStartDate);
    const regEnd = new Date(event.registrationEndDate);
    return now >= regStart && now <= regEnd;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header with Event Image */}
        <div className="text-center mb-8">
          {/* Event Image */}
          <div className="mx-auto mb-6 h-64 w-full max-w-2xl overflow-hidden rounded-lg shadow-lg bg-gray-100">
            <EventImage 
              event={event} 
              className="w-full h-full object-cover object-center"
            />
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{event.name}</h1>
          <p className="text-xl text-gray-600">{event.description}</p>
        </div>

        {/* Event Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">Event Information</CardTitle>
              {getStatusBadge(getEventStatus())}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Event Date</p>
                    <p className="font-semibold">
                      {new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Location</p>
                    <p className="font-semibold">{event.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Registration Period</p>
                    <p className="font-semibold text-sm">
                      {new Date(event.registrationStartDate).toLocaleDateString()} - {new Date(event.registrationEndDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Eligible Groups</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.eligibleAuxiliaryBodies?.map((body: string) => (
                        <Badge key={body} variant="outline" className="text-xs">
                          {body}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {event.requiresPayment && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800">
                      Payment Required: {event.paymentAmount || 'Amount TBD'}
                    </p>
                  </div>
                )}

                {event.allowGuests && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      Guests Welcome
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Registration/Ticket Button */}
            <div className="flex justify-center pt-4">
              {event.eventType === "ticket" ? (
                // Ticket-based event
                <Link href={`/buy-ticket/${event.id}`}>
                  <Button size="lg" className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700">
                    <Ticket className="h-5 w-5" />
                    Buy Tickets
                  </Button>
                </Link>
              ) : (
                // Registration-based event
                isRegistrationOpen() ? (
                  <Link href={`/register/${event.id}`}>
                    <Button size="lg" className="flex items-center gap-2">
                      <QrCode className="h-5 w-5" />
                      Register for Event
                    </Button>
                  </Link>
                ) : (
                  <div className="text-center">
                    <Button size="lg" disabled>
                      Registration Closed
                    </Button>
                    <p className="text-sm text-gray-500 mt-2">
                      Registration period has ended
                    </p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Countdown Timer */}
        <CountdownTimer
          event={event}
          showEventDetails={false}
          size="large"
        />
      </div>
    </div>
  );
}