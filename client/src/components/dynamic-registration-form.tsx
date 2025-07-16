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
import { Checkbox } from "@/components/ui/checkbox";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { QrCode, Users, UserPlus, Mail, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RegistrationCard } from "@/components/registration-card";
import { CountdownTimer } from "@/components/countdown-timer";

// Helper function to determine if a field is required for a specific registration type
function isFieldRequiredForRegistrationType(field: any, registrationType: string): boolean {
  // If field has type-specific requirements, check them
  if (field.requiredForTypes && Array.isArray(field.requiredForTypes)) {
    return field.requiredForTypes.includes(registrationType);
  }
  
  // If field has conditional requirements based on registration type
  if (field.conditionalRequired) {
    return field.conditionalRequired[registrationType] === true;
  }
  
  // Default to the field's general required setting
  return field.required === true;
}

// Helper function to determine if a field should be shown for a specific registration type
function shouldShowFieldForRegistrationType(field: any, registrationType: string): boolean {
  // If field has visibility rules for specific types
  if (field.visibleForTypes && Array.isArray(field.visibleForTypes)) {
    return field.visibleForTypes.includes(registrationType);
  }
  
  // If field has conditional visibility
  if (field.conditionalVisible) {
    return field.conditionalVisible[registrationType] !== false;
  }
  
  // Default to showing the field for all types
  return true;
}

// Dynamic validation schemas
const createDynamicSchema = (registrationType: string, event: any) => {
  let schemaFields: any = {
    registrationType: z.enum(["member", "guest", "invitee"]),
  };

  // Add custom fields dynamically with type-specific requirements
  if (event.customRegistrationFields) {
    event.customRegistrationFields.forEach((field: any) => {
      // Skip fields that shouldn't be shown for this registration type
      if (!shouldShowFieldForRegistrationType(field, registrationType)) {
        return;
      }
      
      let fieldSchema: any;
      
      switch (field.type) {
        case 'email':
          fieldSchema = z.string().email("Valid email is required");
          break;
        case 'number':
          fieldSchema = z.coerce.number().min(field.validation?.min || 0);
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
        case 'select':
          if (field.options && field.options.length > 0) {
            fieldSchema = z.enum(field.options);
          } else {
            fieldSchema = z.string();
          }
          break;
        case 'textarea':
          fieldSchema = z.string();
          break;
        default:
          fieldSchema = z.string();
      }
      
      // Check if field is required for this specific registration type
      const isRequiredForType = isFieldRequiredForRegistrationType(field, registrationType);
      
      if (isRequiredForType) {
        if (field.type === 'number') {
          fieldSchema = fieldSchema.min(field.validation?.min || 0, `${field.label} is required`);
        } else if (field.type === 'email') {
          fieldSchema = fieldSchema.min(1, `${field.label} is required`);
        } else {
          fieldSchema = fieldSchema.min ? fieldSchema.min(1, `${field.label} is required`) : fieldSchema.refine((val: any) => val !== undefined && val !== null && val !== "", `${field.label} is required`);
        }
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

  // Create form with dynamic validation that updates when registration type changes
  const form = useForm({
    resolver: zodResolver(createDynamicSchema(registrationType, event)),
    defaultValues: {
      registrationType: registrationType,
      ...event.customRegistrationFields?.reduce((acc: any, field: any) => {
        acc[field.name] = field.defaultValue || "";
        return acc;
      }, {}),
    },
  });

  // Update form validation when registration type changes
  React.useEffect(() => {
    form.setValue("registrationType", registrationType);
    form.clearErrors();
    form.trigger();
  }, [registrationType, form]);

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
      // For file uploads, we need to use fetch directly since apiRequest expects JSON
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
      
      // Use fetch directly for FormData uploads
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`/api/events/${eventId}/register`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      return await response.json();
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
    // Ensure registrationType is included in the submission data
    const submissionData = {
      ...data,
      registrationType: registrationType || data.registrationType || "member"
    };
    
    console.log("Submitting registration with data:", submissionData);
    registrationMutation.mutate(submissionData);
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
                          // Re-validate form when registration type changes
                          setTimeout(() => form.trigger(), 100);
                        }}
                        value={field.value}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      >
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="member" id="member" />
                          <div>
                            <Label htmlFor="member" className="font-medium">Member</Label>
                            <p className="text-xs text-gray-600">Organization member</p>
                          </div>
                        </div>
                        {event.allowGuests && (
                          <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                            <RadioGroupItem value="guest" id="guest" />
                            <div>
                              <Label htmlFor="guest" className="font-medium">Guest</Label>
                              <p className="text-xs text-gray-600">External guest</p>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                          <RadioGroupItem value="invitee" id="invitee" />
                          <div>
                            <Label htmlFor="invitee" className="font-medium">Invitee</Label>
                            <p className="text-xs text-gray-600">Special invitee</p>
                          </div>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Only show custom fields configured by admin */}

              {/* Admin-configured fields only - filtered by registration type */}
              {event.customRegistrationFields?.filter((field: any) => 
                shouldShowFieldForRegistrationType(field, registrationType)
              ).map((field: any) => (
                <FormField
                  key={field.name}
                  control={form.control}
                  name={field.name}
                  render={({ field: formField }) => (
                    <FormItem>
                      <FormLabel>
                        {field.label} 
                        {isFieldRequiredForRegistrationType(field, registrationType) && <span className="text-red-500">*</span>}
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
                        ) : field.type === 'radio' ? (
                          <RadioGroup
                            onValueChange={formField.onChange}
                            value={formField.value}
                            className="flex flex-col space-y-2"
                          >
                            {field.options?.map((option: string, idx: number) => (
                              <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${field.name}-${idx}`} />
                                <Label htmlFor={`${field.name}-${idx}`}>{option}</Label>
                              </div>
                            ))}
                          </RadioGroup>
                        ) : field.type === 'checkbox' ? (
                          <div className="space-y-2">
                            {field.options?.map((option: string, idx: number) => (
                              <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`${field.name}-${idx}`}
                                  checked={(formField.value || []).includes(option)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = formField.value || [];
                                    if (checked) {
                                      formField.onChange([...currentValues, option]);
                                    } else {
                                      formField.onChange(currentValues.filter((v: string) => v !== option));
                                    }
                                  }}
                                />
                                <Label htmlFor={`${field.name}-${idx}`}>{option}</Label>
                              </div>
                            ))}
                          </div>
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

              {/* Payment Information - conditional based on registration type */}
              {event.requiresPayment && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium text-yellow-900 mb-2">Payment Required</h4>
                  <p className="text-sm text-yellow-700">
                    {registrationType === "member" ? (
                      <>This event requires a payment of {event.paymentAmount}. Please ensure payment is completed before attending.</>
                    ) : registrationType === "guest" ? (
                      <>Guest registration may require payment of {event.paymentAmount}. Please check with organizers.</>
                    ) : (
                      <>As an invitee, payment requirements may vary. Please check with organizers.</>
                    )}
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