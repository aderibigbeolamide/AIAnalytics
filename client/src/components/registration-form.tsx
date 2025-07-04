import { useState } from "react";
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

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jamaat: z.string().min(1, "Jamaat is required"),
  auxiliaryBody: z.string().min(1, "Auxiliary body is required"),
  chandaNumber: z.string().optional(),
  circuit: z.string().optional(),
  email: z.string().email("Valid email is required"),
  registrationType: z.enum(["member", "guest", "invitee"]),
  post: z.string().optional(),
  paymentReceiptUrl: z.string().optional(),
  paymentAmount: z.string().optional(),
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

  const form = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
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
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          formData.append(key, value);
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

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Registration Type</label>
                  <div className="flex gap-4 mt-2">
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="member"
                        checked={registrationType === "member"}
                        onChange={(e) => setRegistrationType(e.target.value as "member")}
                      />
                      <span>Member</span>
                    </label>
                    {event?.allowGuests && (
                      <label className="flex items-center space-x-2">
                        <input
                          type="radio"
                          value="guest"
                          checked={registrationType === "guest"}
                          onChange={(e) => setRegistrationType(e.target.value as "guest")}
                        />
                        <span>Guest</span>
                      </label>
                    )}
                    <label className="flex items-center space-x-2">
                      <input
                        type="radio"
                        value="invitee"
                        checked={registrationType === "invitee"}
                        onChange={(e) => setRegistrationType(e.target.value as "invitee")}
                      />
                      <span>Invitee</span>
                    </label>
                  </div>
                </div>

                {(registrationType === "member" || registrationType === "guest") && (
                  <>
                    <FormField
                      control={form.control}
                      name="chandaNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chanda/Wassiya Number</FormLabel>
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
                          <FormLabel>Circuit</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your circuit" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

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
              </div>

              <FormField
                control={form.control}
                name="email"
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

              {(event?.requiresPayment || true) && (
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
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                    {paymentReceiptFile && (
                      <div className="p-2 bg-green-50 border border-green-200 rounded-md">
                        <p className="text-sm text-green-700 font-medium">
                          ✓ {paymentReceiptFile.name} selected ({(paymentReceiptFile.size / 1024 / 1024).toFixed(2)}MB)
                        </p>
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