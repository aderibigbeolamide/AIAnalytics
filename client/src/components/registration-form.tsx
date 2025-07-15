import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegistrationCard } from "@/components/registration-card";

// Base schema for all registration types
const baseRegistrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  registrationType: z.enum(["member", "guest", "invitee"]),
  post: z.string().optional(),
  paymentReceiptUrl: z.string().optional(),
  paymentAmount: z.string().optional(),
});

// Create dynamic schema based on registration type
const createRegistrationSchema = (registrationType: string) => {
  if (registrationType === "member") {
    // Members need all fields
    return baseRegistrationSchema.extend({
      jamaat: z.string().min(1, "Jamaat is required"),
      auxiliaryBody: z.string().min(1, "Auxiliary body is required"),
      chandaNumber: z.string().optional(),
      circuit: z.string().optional(),
      email: z.string().email("Valid email is required"),
    });
  } else {
    // Guests and invitees only need basic info
    return baseRegistrationSchema.extend({
      jamaat: z.string().optional(),
      auxiliaryBody: z.string().optional(),
      chandaNumber: z.string().optional(),
      circuit: z.string().optional(),
      email: z.string().email().optional().or(z.literal("")),
    });
  }
};

// Use full schema for TypeScript types
const registrationSchema = baseRegistrationSchema.extend({
  jamaat: z.string().optional(),
  auxiliaryBody: z.string().optional(),
  chandaNumber: z.string().optional(),
  circuit: z.string().optional(),
  email: z.string().optional(),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  eventId: string;
  event: any;
}

export function RegistrationForm({ eventId, event }: RegistrationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRegistrationCard, setShowRegistrationCard] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [qrImageBase64, setQrImageBase64] = useState<string>("");
  const [registrationType, setRegistrationType] = useState<"member" | "guest" | "invitee">("member");
  const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
  const [paymentReceiptPreview, setPaymentReceiptPreview] = useState<string | null>(null);

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(createRegistrationSchema(registrationType)),
    defaultValues: {
      firstName: "",
      lastName: "",
      jamaat: "",
      auxiliaryBody: "",
      chandaNumber: "",
      circuit: "",
      email: "",
      registrationType: "member",
      post: "",
    },
    mode: "onChange",
  });

  // Update validation schema when registration type changes
  React.useEffect(() => {
    form.clearErrors();
    const newSchema = createRegistrationSchema(registrationType);
    form.trigger(); // Re-validate with new schema
  }, [registrationType, form]);

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const formData = new FormData();
      
      // Add all form fields
      const requiredFields = ['firstName', 'lastName', 'registrationType'];
      
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          // Include required fields even if empty, and non-empty optional fields
          if (requiredFields.includes(key) || value !== '') {
            formData.append(key, value);
          }
        }
      });
      
      // Add payment receipt file if present
      if (paymentReceiptFile) {
        formData.append('paymentReceipt', paymentReceiptFile);
      }
      
      const response = await fetch(`/api/events/${eventId}/register`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: data.message || "Your registration card is ready! Save it to show at the event entrance.",
      });
      
      setRegistrationData(data.registration);
      setQrImageBase64(data.qrImage?.replace('data:image/png;base64,', '') || '');
      setShowRegistrationCard(true);
      
      // Invalidate queries to update dashboard and member counts
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
      
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to register for event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegistrationFormData) => {
    registerMutation.mutate({ ...data, registrationType });
  };

  const auxiliaryBodies = event?.eligibleAuxiliaryBodies || ["Atfal", "Khuddam", "Lajna", "Ansarullah", "Nasra"];
  
  // Debug log to check if requiresPayment is being received
  console.log('Event data in registration form:', event);

  return (
    <>
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Register for {event?.name}</CardTitle>
          <p className="text-muted-foreground">{event?.description}</p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

              {/* Registration Type Selection */}
              <FormField
                control={form.control}
                name="registrationType"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Registration Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setRegistrationType(value as "member" | "guest" | "invitee");
                          form.setValue("registrationType", value);
                          // Clear validation errors when registration type changes
                          setTimeout(() => form.trigger(), 100);
                        }}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="member" id="member" />
                          <Label htmlFor="member">Member</Label>
                        </div>
                        {event?.allowGuests && (
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="guest" id="guest" />
                            <Label htmlFor="guest">Guest</Label>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="invitee" id="invitee" />
                          <Label htmlFor="invitee">Invitee</Label>
                        </div>
                      </RadioGroup>
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
                            {auxiliaryBodies.filter((body: string) => body && body.trim()).map((body: string) => (
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

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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

              {/* Email field for all types - required for members, optional for guests/invitees */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email {registrationType === "member" ? "" : "(Optional)"}</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter your email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {event?.requiresPayment && (
                <>
                  <FormField
                    control={form.control}
                    name="paymentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount (Optional)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder={event?.paymentAmount || "Enter payment amount"} 
                            defaultValue={event?.paymentAmount || ""}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="space-y-3 p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                    <label className="text-sm font-medium text-red-600">Payment Receipt * (Required)</label>
                    <div className="flex items-center justify-center w-full">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-white hover:bg-gray-50">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          <svg className="w-8 h-8 mb-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                          </svg>
                          <p className="mb-2 text-sm text-gray-500">
                            <span className="font-semibold">Click to upload</span> your payment receipt
                          </p>
                          <p className="text-xs text-gray-500">PNG, JPG or JPEG (max 5MB)</p>
                        </div>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Validate file type
                              if (!file.type.startsWith('image/')) {
                                toast({
                                  title: "Invalid file type",
                                  description: "Please upload an image file (PNG, JPG, JPEG)",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              // Validate file size (max 5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                toast({
                                  title: "File too large",
                                  description: "Please upload an image smaller than 5MB",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              setPaymentReceiptFile(file);
                              
                              // Generate preview
                              const reader = new FileReader();
                              reader.onload = (e) => {
                                setPaymentReceiptPreview(e.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {paymentReceiptFile && (
                      <div className="space-y-3">
                        <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm text-green-700 font-medium">
                            ✓ {paymentReceiptFile.name} selected ({(paymentReceiptFile.size / 1024 / 1024).toFixed(2)}MB)
                          </p>
                        </div>
                        
                        {paymentReceiptPreview && (
                          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-700">Payment Receipt Preview:</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setPaymentReceiptFile(null);
                                  setPaymentReceiptPreview(null);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                            <div className="max-w-md mx-auto">
                              <img 
                                src={paymentReceiptPreview} 
                                alt="Payment Receipt Preview" 
                                className="w-full h-auto border border-gray-300 rounded-md shadow-sm"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full"
              >
                {registerMutation.isPending ? "Registering..." : "Register for Event"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={showRegistrationCard} onOpenChange={setShowRegistrationCard}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registration Complete!</DialogTitle>
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