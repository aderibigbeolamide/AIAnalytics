import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegistrationCard } from "@/components/registration-card";

// Dynamic validation schemas
const createMemberSchema = (requiresPayment: boolean) => z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jamaat: z.string().min(1, "Jamaat is required"),
  auxiliaryBody: z.string().min(1, "Auxiliary body is required"),
  chandaNumber: z.string().optional(),
  circuit: z.string().optional(),
  email: z.string().email("Valid email is required"),
  registrationType: z.literal("member"),
  post: z.string().optional(),
  paymentAmount: z.string().optional(),
  paymentReceipt: requiresPayment ? z.any().refine(
    (file) => file && file.length > 0,
    "Payment receipt is required for members"
  ) : z.any().optional(),
});

const createGuestInviteeSchema = (requiresPayment: boolean) => z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jamaat: z.string().optional(),
  auxiliaryBody: z.string().optional(),
  chandaNumber: z.string().optional(),
  circuit: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  registrationType: z.enum(["guest", "invitee"]),
  post: z.string().optional(),
  paymentAmount: z.string().optional(),
  paymentReceipt: z.any().optional(), // Always optional for guests/invitees
});

type MemberFormData = z.infer<ReturnType<typeof createMemberSchema>>;
type GuestInviteeFormData = z.infer<ReturnType<typeof createGuestInviteeSchema>>;
type RegistrationFormData = MemberFormData | GuestInviteeFormData;

interface SimpleRegistrationFormProps {
  eventId: string;
  event: any;
}

export function SimpleRegistrationForm({ eventId, event }: SimpleRegistrationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRegistrationCard, setShowRegistrationCard] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [qrImageBase64, setQrImageBase64] = useState<string>("");
  const [registrationType, setRegistrationType] = useState<"member" | "guest" | "invitee">("member");

  const form = useForm({
    defaultValues: {
      firstName: "",
      lastName: "",
      jamaat: "",
      auxiliaryBody: "",
      chandaNumber: "",
      circuit: "",
      email: "",
      registrationType,
      post: "",
      paymentAmount: "",
      paymentReceipt: undefined,
    },
    mode: "onBlur",
  });

  // Update form validation and registration type when it changes
  React.useEffect(() => {
    const schema = registrationType === "member" 
      ? createMemberSchema(event?.requiresPayment || false)
      : createGuestInviteeSchema(event?.requiresPayment || false);
    
    // Update the form resolver with new schema
    form.setValue("registrationType", registrationType);
    form.clearErrors();
    
    // Re-validate with new schema
    form.trigger();
  }, [registrationType, event?.requiresPayment, form]);

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      console.log('=== CLIENT DEBUG ===');
      console.log('Data received from form:', data);
      
      // Use plain object instead of FormData for better debugging
      const payload = {
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        registrationType: registrationType, // Use state value
        jamaat: data.jamaat || '',
        auxiliaryBody: data.auxiliaryBody || '',
        chandaNumber: data.chandaNumber || '',
        circuit: data.circuit || '',
        email: data.email || '',
        post: data.post || '',
        paymentAmount: data.paymentAmount || '',
      };
      
      console.log('Payload to send:', payload);
      
      // Send as JSON instead of FormData for now
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setRegistrationData(data.registration);
      setQrImageBase64(data.qrImageBase64);
      setShowRegistrationCard(true);
      
      toast({
        title: "Registration successful!",
        description: "Your QR code has been generated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log('Form submit data:', data);
    console.log('Registration type:', registrationType);
    
    // Manual validation since schema might not be working properly
    if (!data.firstName?.trim() || !data.lastName?.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }

    if (registrationType === "member") {
      if (!data.jamaat?.trim() || !data.auxiliaryBody?.trim() || !data.email?.trim()) {
        toast({
          title: "Validation Error", 
          description: "Jamaat, auxiliary body, and email are required for members",
          variant: "destructive",
        });
        return;
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        toast({
          title: "Validation Error",
          description: "Please enter a valid email address",
          variant: "destructive",
        });
        return;
      }
    }
    
    console.log('Manual validation passed, submitting...');
    registerMutation.mutate({ ...data, registrationType });
  };

  const auxiliaryBodies = event?.eligibleAuxiliaryBodies || ["Atfal", "Khuddam", "Lajna", "Ansarullah", "Nasra"];

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Register for {event?.name}</CardTitle>
          <p className="text-muted-foreground">{event?.description}</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
              toast({
                title: "Validation Error", 
                description: "Please fill in all required fields correctly",
                variant: "destructive",
              });
            })} className="space-y-6">
              {/* Registration Type Selection */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Registration Type</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="member"
                        checked={registrationType === "member"}
                        onChange={(e) => {
                          setRegistrationType(e.target.value as "member");
                        }}
                      />
                      <span>Member</span>
                    </label>
                    {event?.allowGuests && (
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="guest"
                          checked={registrationType === "guest"}
                          onChange={(e) => {
                            setRegistrationType(e.target.value as "guest");
                          }}
                        />
                        <span>Guest</span>
                      </label>
                    )}
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="invitee"
                        checked={registrationType === "invitee"}
                        onChange={(e) => {
                          setRegistrationType(e.target.value as "invitee");
                        }}
                      />
                      <span>Invitee</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Basic fields for all types */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Email field - required for members, optional for others */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Email {registrationType === "member" ? "" : "(Optional)"}
                    </FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Member-specific fields */}
              {registrationType === "member" && (
                <>
                  <FormField
                    control={form.control}
                    name="jamaat"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jamaat</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your jamaat" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="auxiliaryBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auxiliary Body</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auxiliary body" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {auxiliaryBodies.map((body: string) => (
                              <SelectItem key={body} value={body}>
                                {body}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="chandaNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chanda/Wassiya Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter chanda/wassiya number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="circuit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Circuit (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your circuit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}

              {/* Invitee-specific fields */}
              {registrationType === "invitee" && (
                <FormField
                  control={form.control}
                  name="post"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Post/Position (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your post or position" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Payment fields - shown if event requires payment */}
              {event?.requiresPayment && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900">Payment Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="Enter payment amount" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentReceipt"
                    render={({ field: { onChange, value, ...fieldProps } }) => (
                      <FormItem>
                        <FormLabel>
                          Payment Receipt 
                          {registrationType === "member" ? " (Required)" : " (Optional)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => onChange(e.target.files)}
                            {...fieldProps}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? "Registering..." : "Register"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Registration Success Dialog */}
      <Dialog open={showRegistrationCard} onOpenChange={setShowRegistrationCard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-6 w-6" />
              Registration Successful
            </DialogTitle>
          </DialogHeader>
          {registrationData && (
            <RegistrationCard
              registration={registrationData}
              event={event}
              qrImageBase64={qrImageBase64}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}