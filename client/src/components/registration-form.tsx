import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
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

const registrationSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  jamaat: z.string().min(1, "Jamaat is required"),
  auxiliaryBody: z.string().min(1, "Auxiliary body is required"),
  chandaNumber: z.string().optional(),
  circuit: z.string().optional(),
  email: z.string().email("Valid email is required"),
  registrationType: z.enum(["member", "guest", "invitee"]),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface RegistrationFormProps {
  eventId: string;
  event: any;
}

export function RegistrationForm({ eventId, event }: RegistrationFormProps) {
  const { toast } = useToast();
  const [showQR, setShowQR] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string>("");
  const [registrationType, setRegistrationType] = useState<"member" | "guest" | "invitee">("member");

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
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegistrationFormData) => {
      const response = await apiRequest("POST", `/api/events/${eventId}/register`, data);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Registration successful!",
        description: "Your personal QR code is ready! Save it to show at the event entrance.",
      });
      
      if (data.qrImage) {
        setQrImageUrl(data.qrImage);
        setShowQR(true);
      }
      
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
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Show this QR code at the event entrance for attendance validation
              </p>
              <p className="text-xs text-muted-foreground">
                A copy has also been sent to your email address
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}