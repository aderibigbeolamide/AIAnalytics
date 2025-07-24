import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Ticket, Calendar, MapPin, Users, DollarSign, Clock } from "lucide-react";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CountdownTimer } from "@/components/countdown-timer";

const ticketPurchaseSchema = z.object({
  ownerName: z.string().min(1, "Name is required"),
  ownerEmail: z.string().email("Valid email is required"),
  ownerPhone: z.string().optional(),
  ticketCategoryId: z.string().min(1, "Please select a ticket category"),
  paymentMethod: z.enum(["paystack", "manual"]),
});

type TicketPurchaseData = z.infer<typeof ticketPurchaseSchema>;

export default function BuyTicket() {
  const { eventId } = useParams<{ eventId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [paymentInitialized, setPaymentInitialized] = useState(false);

  const form = useForm<TicketPurchaseData>({
    resolver: zodResolver(ticketPurchaseSchema),
    defaultValues: {
      ownerName: "",
      ownerEmail: "",
      ownerPhone: "",
      ticketCategoryId: "",
      paymentMethod: "paystack",
    },
  });

  // Fetch event details from public endpoint to ensure eventType is included
  const { data: event, isLoading } = useQuery<any>({
    queryKey: ["/api/events", eventId, "public"],
    queryFn: async () => {
      const response = await fetch(`/api/events/${eventId}/public`);
      if (!response.ok) {
        throw new Error("Event not found");
      }
      return response.json();
    },
    enabled: !!eventId,
  });

  const purchaseTicketMutation = useMutation({
    mutationFn: async (data: TicketPurchaseData) => {
      const response = await fetch(`/api/tickets/purchase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          eventId: parseInt(eventId!),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to purchase ticket");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setPaymentInitialized(true);
      
      if (data.paymentUrl) {
        // Redirect to payment page for online payment
        window.location.href = data.paymentUrl;
      } else {
        // For manual payment, show QR code immediately
        toast({
          title: "Ticket Reserved!",
          description: "Your ticket has been reserved. Complete payment to activate it.",
        });
        
        // Redirect to ticket display page
        setLocation(`/ticket/${data.ticketId}`);
      }
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TicketPurchaseData) => {
    if (!event) return;
    
    // Check if registration is open
    const now = new Date();
    const registrationStart = new Date(event.registrationStartDate);
    const registrationEnd = new Date(event.registrationEndDate);
    
    if (now < registrationStart) {
      toast({
        title: "Registration Not Open",
        description: "Ticket sales haven't started yet.",
        variant: "destructive",
      });
      return;
    }
    
    if (now > registrationEnd) {
      toast({
        title: "Registration Closed",
        description: "Ticket sales have ended for this event.",
        variant: "destructive",
      });
      return;
    }
    
    purchaseTicketMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Event not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (event.eventType !== "ticket") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              This is not a ticket-based event
            </p>
            <p className="text-center text-sm text-gray-500 mt-2">
              Event: {event.name} (Type: {event.eventType})
            </p>
            <p className="text-center text-sm text-gray-500">
              Looking for ticket events? Try the "Code" event.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const now = new Date();
  const registrationStart = new Date(event.registrationStartDate);
  const registrationEnd = new Date(event.registrationEndDate);
  const eventStart = new Date(event.startDate);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Event Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">{event.name}</CardTitle>
                <CardDescription className="mt-2">{event.description}</CardDescription>
              </div>
              <Badge variant="secondary" className="ml-4">
                <Ticket className="h-4 w-4 mr-1" />
                Ticket Event
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {new Date(event.startDate).toLocaleDateString()} at{" "}
                  {new Date(event.startDate).toLocaleTimeString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{event.location}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  {event.eligibleAuxiliaryBodies?.join(", ") || "All groups"}
                </span>
              </div>
            </div>
            
            {/* Countdown Timer */}
            <div className="mt-4">
              <CountdownTimer event={event} showEventDetails={false} size="compact" />
            </div>
          </CardContent>
        </Card>

        {/* Registration Status */}
        {now < registrationStart && (
          <Card className="mb-8 border-orange-200 bg-orange-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-orange-600">
                  Ticket sales start on {registrationStart.toLocaleDateString()} at{" "}
                  {registrationStart.toLocaleTimeString()}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {now > registrationEnd && (
          <Card className="mb-8 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-red-600" />
                <span className="text-red-600">
                  Ticket sales have ended for this event
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ticket Purchase Form */}
        {now >= registrationStart && now <= registrationEnd && (
          <Card>
            <CardHeader>
              <CardTitle>Purchase Ticket</CardTitle>
              <CardDescription>
                Fill in your details to purchase a ticket for this event
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="ownerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownerEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ownerPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your phone number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="ticketCategoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ticket Category</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="">Select ticket category</option>
                            {event.ticketCategories?.filter((cat: any) => cat.available).map((category: any) => (
                              <option key={category.id} value={category.id}>
                                {category.name} - {category.currency} {category.price.toLocaleString()}
                                {category.description && ` (${category.description})`}
                              </option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <FormControl>
                          <select 
                            {...field} 
                            className="w-full p-2 border rounded-md"
                          >
                            <option value="paystack">Pay Online (Paystack)</option>
                            <option value="manual">Manual Payment</option>
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={purchaseTicketMutation.isPending || paymentInitialized}
                  >
                    {purchaseTicketMutation.isPending ? (
                      <LoadingSpinner />
                    ) : paymentInitialized ? (
                      "Redirecting to payment..."
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 mr-2" />
                        Purchase Ticket
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}