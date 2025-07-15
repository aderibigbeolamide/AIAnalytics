import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Users, UserPlus, Mail, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegistrationCard } from "@/components/registration-card";
import { CountdownTimer } from "@/components/countdown-timer";

// Dynamic validation schemas
const createDynamicSchema = (registrationType: string, event: any) => {
  let schemaFields: any = {
    registrationType: z.enum(["member", "guest", "invitee"]),
  };

  // Only basic registration type field is required by default
  // All other fields come from admin configuration

  // Add custom fields dynamically
  if (event.customRegistrationFields) {
    event.customRegistrationFields.forEach((field: any) => {
      let fieldSchema: any;
      
      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email("Valid email is required");
          break;
        case 'number':
          fieldSchema = z.number().min(field.validation?.min || 0);
          break;
        case 'tel':
          fieldSchema = z.string().min(10, "Valid phone number is required");
          break;
        case 'checkbox':
          fieldSchema = z.array(z.string()).optional();
          break;
        case 'file':
          fieldSchema = z.any().optional();
          break;
        default:
          fieldSchema = z.string();
      }
      
      if (field.required) {
        fieldSchema = fieldSchema.min ? fieldSchema.min(1, `${field.label} is required`) : fieldSchema.refine((val: any) => val !== undefined && val !== null && val !== "", `${field.label} is required`);
      } else {
        fieldSchema = fieldSchema.optional();
      }
      
      schemaFields[field.name] = fieldSchema;
    });
  }

  return z.object(schemaFields);
};

interface DynamicRegistrationFormProps {
  eventId: string;
  event: any;
}

export function DynamicRegistrationForm({ eventId, event }: DynamicRegistrationFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRegistrationCard, setShowRegistrationCard] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [qrImageBase64, setQrImageBase64] = useState<string>("");
  const [registrationType, setRegistrationType] = useState<"member" | "guest" | "invitee">("member");

  // Create form with dynamic validation
  const form = useForm({
    resolver: zodResolver(createDynamicSchema(registrationType, event)),
    defaultValues: {
      registrationType: "member",
      ...event.customRegistrationFields?.reduce((acc: any, field: any) => {
        acc[field.name] = field.defaultValue || "";
        return acc;
      }, {}),
    },
  });

  // Check if registration is currently open
  const isRegistrationOpen = () => {
    const now = new Date();
    const regStart = new Date(event.registrationStartDate);
    const regEnd = new Date(event.registrationEndDate);
    return now >= regStart && now <= regEnd;
  };

  // Check if auxiliary body is allowed
  const isAuxiliaryBodyAllowed = (auxBody: string) => {
    return !event.eligibleAuxiliaryBodies?.length || event.eligibleAuxiliaryBodies.includes(auxBody);
  };

  const registrationMutation = useMutation({
    mutationFn: async (data: any) => {
      const formData = new FormData();
      
      // Add all form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (key === 'paymentReceipt' && value instanceof FileList) {
            if (value.length > 0) {
              formData.append(key, value[0]);
            }
          } else {
            formData.append(key, String(value));
          }
        }
      });
      
      formData.append("eventId", eventId);
      
      return apiRequest(`/api/events/${eventId}/register`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: (response) => {
      setRegistrationData(response.registration);
      setQrImageBase64(response.qrImageBase64);
      setShowRegistrationCard(true);
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/registration-counts`] });
      toast({
        title: "Registration Successful",
        description: "Your registration has been completed successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for the event",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    registrationMutation.mutate(data);
  };

  if (!isRegistrationOpen()) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <XCircle className="h-5 w-5" />
            Registration Closed
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              Registration for this event is not currently open.
            </AlertDescription>
          </Alert>
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <strong>Registration Period:</strong> {new Date(event.registrationStartDate).toLocaleDateString()} - {new Date(event.registrationEndDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              <strong>Event Date:</strong> {new Date(event.startDate).toLocaleDateString()}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Event Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {event.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-600">Event Date</Label>
              <p className="text-sm">{new Date(event.startDate).toLocaleDateString()}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Location</Label>
              <p className="text-sm">{event.location}</p>
            </div>
          </div>
          
          {/* Registration Period Info */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Registration Period</h4>
            <p className="text-sm text-blue-700">
              {new Date(event.registrationStartDate).toLocaleDateString()} - {new Date(event.registrationEndDate).toLocaleDateString()}
            </p>
          </div>

          {/* Eligible Auxiliary Bodies */}
          {event.eligibleAuxiliaryBodies?.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-600">Eligible Auxiliary Bodies</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {event.eligibleAuxiliaryBodies.map((body: string) => (
                  <Badge key={body} variant="outline">
                    {body}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Register for Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Registration Type Selection */}
              <FormField
                control={form.control}
                name="registrationType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Type</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => {
                          field.onChange(value);
                          setRegistrationType(value as "member" | "guest" | "invitee");
                        }}
                        value={field.value}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="member" id="member" />
                          <Label htmlFor="member">Member</Label>
                        </div>
                        {event.allowGuests && (
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

              {/* Only show custom fields configured by admin */}

              {/* Admin-configured fields only */}
              {event.customRegistrationFields?.map((field: any) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>
                        {field.label} 
                        {field.required && <span className="text-red-500">*</span>}
                      </FormLabel>
                      <FormControl>
                        {field.type === 'textarea' ? (
                          <textarea
                            className="w-full p-3 border rounded-md"
                            placeholder={field.placeholder}
                            {...formField}
                          />
                        ) : field.type === 'select' ? (
                          <Select onValueChange={formField.onChange} value={formField.value}>
                            <SelectTrigger>
                              <SelectValue placeholder={field.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {field.options?.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : field.type === 'file' ? (
                          <Input
                            type="file"
                            accept={field.accept}
                            onChange={(e) => formField.onChange(e.target.files)}
                          />
                        ) : (
                          <Input
                            type={field.type}
                            placeholder={field.placeholder}
                            {...formField}
                          />
                        )}
                      </FormControl>
                      {field.description && (
                        <p className="text-sm text-gray-600">{field.description}</p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ))}

              {/* Payment Information */}
              {event.requiresPayment && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Payment Required</h4>
                  <p className="text-sm text-yellow-700">
                    This event requires a payment of {event.paymentAmount}. Please ensure payment is completed before attending.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={registrationMutation.isPending}
              >
                {registrationMutation.isPending ? "Registering..." : "Register for Event"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Registration Success Dialog */}
      <Dialog open={showRegistrationCard} onOpenChange={setShowRegistrationCard}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
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
    </div>
  );
}