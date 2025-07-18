import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CustomFormField } from "@/../../shared/schema";
import { Users, UserPlus, Mail, CreditCard, Receipt } from "lucide-react";
import { PaymentForm } from "@/components/PaymentForm";

interface FlexibleRegistrationFormProps {
  event: any;
  onSubmit: (data: any) => void;
  isLoading?: boolean;
}

export function FlexibleRegistrationForm({ event, onSubmit, isLoading }: FlexibleRegistrationFormProps) {
  const [registrationType, setRegistrationType] = useState<"member" | "guest" | "invitee">("member");
  const [paymentStep, setPaymentStep] = useState<"registration" | "payment" | "complete">("registration");
  const [registrationData, setRegistrationData] = useState<any>(null);
  
  // Build dynamic schema based on event configuration
  const buildSchema = () => {
    let schemaFields: any = {
      registrationType: z.enum(["member", "guest", "invitee"]),
    };

    // Base fields for all types
    if (registrationType === "member") {
      schemaFields.firstName = z.string().min(1, "First name is required");
      schemaFields.lastName = z.string().min(1, "Last name is required");
      schemaFields.email = z.string().email("Valid email is required");
      schemaFields.auxiliaryBody = z.string().min(1, "Auxiliary body is required");
      schemaFields.circuit = z.string().optional();
    } else {
      schemaFields.guestName = z.string().min(1, "Name is required");
      schemaFields.guestEmail = z.string().email("Valid email is required");
      schemaFields.guestAuxiliaryBody = z.string().min(1, "Auxiliary body is required");
      schemaFields.guestCircuit = z.string().optional();
      if (registrationType === "invitee") {
        schemaFields.guestPost = z.string().optional();
      }
    }

    // Add custom fields
    if (event.customRegistrationFields) {
      event.customRegistrationFields.forEach((field: CustomFormField) => {
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
          fieldSchema = fieldSchema.min ? fieldSchema.min(1, `${field.label} is required`) : fieldSchema;
        } else {
          fieldSchema = fieldSchema.optional();
        }
        
        schemaFields[field.name] = fieldSchema;
      });
    }

    // Payment fields
    if (event.requiresPayment) {
      schemaFields.paymentReceiptFile = z.any().optional();
    }

    return z.object(schemaFields);
  };

  const schema = buildSchema();
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      registrationType,
      firstName: "",
      lastName: "",
      email: "",
      jamaat: "",
      auxiliaryBody: "",
      chandaNumber: "",
      circuit: "",
      guestName: "",
      guestEmail: "",
      guestJamaat: "",
      guestAuxiliaryBody: "",
      guestCircuit: "",
      guestPost: "",
    },
  });

  // Check if payment is required for the current registration type
  const shouldShowPayment = () => {
    if (!event.paymentSettings?.requiresPayment) return false;
    
    const paymentRules = event.paymentSettings.paymentRules;
    switch (registrationType) {
      case "member":
        return paymentRules.member;
      case "guest":
        return paymentRules.guest;
      case "invitee":
        return paymentRules.invitee;
      default:
        return false;
    }
  };

  // Get payment display text
  const getPaymentDisplay = () => {
    const amount = event.paymentSettings?.amount || event.paymentAmount;
    const currency = event.paymentSettings?.currency || "NGN";
    
    if (currency === "NGN") {
      return `₦${amount}`;
    } else if (currency === "USD") {
      return `$${amount}`;
    } else {
      return `${amount} ${currency}`;
    }
  };

  // Handle online payment
  const handleOnlinePayment = async () => {
    // First validate the form
    const isValid = await form.trigger();
    if (!isValid) return;

    const formData = form.getValues();
    setRegistrationData(formData);
    setPaymentStep("payment");
  };

  const renderCustomField = (field: CustomFormField) => {
    return (
      <FormField
        key={field.id}
        control={form.control}
        name={field.name}
        render={({ field: formField }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {field.label}
              {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
            </FormLabel>
            {field.helperText && (
              <p className="text-sm text-gray-500 mb-2">{field.helperText}</p>
            )}
            <FormControl>
              {renderFieldControl(field, formField)}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  };

  const renderFieldControl = (field: CustomFormField, formField: any) => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
        return (
          <Input
            type={field.type}
            placeholder={field.placeholder}
            {...formField}
          />
        );
      case 'textarea':
        return (
          <Textarea
            placeholder={field.placeholder}
            {...formField}
          />
        );
      case 'select':
        return (
          <Select value={formField.value} onValueChange={formField.onChange}>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.filter(option => option && option.trim()).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <RadioGroup value={formField.value} onValueChange={formField.onChange}>
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`${field.name}-${option}`} />
                <Label htmlFor={`${field.name}-${option}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  checked={formField.value?.includes(option)}
                  onCheckedChange={(checked) => {
                    const currentValue = formField.value || [];
                    if (checked) {
                      formField.onChange([...currentValue, option]);
                    } else {
                      formField.onChange(currentValue.filter((v: string) => v !== option));
                    }
                  }}
                />
                <Label>{option}</Label>
              </div>
            ))}
          </div>
        );
      case 'file':
        return (
          <Input
            type="file"
            onChange={(e) => formField.onChange(e.target.files?.[0])}
          />
        );
      default:
        return <Input {...formField} />;
    }
  };

  const handleSubmit = (data: any) => {
    // Combine base registration data with custom field data
    const customFieldData: Record<string, any> = {};
    
    if (event.customRegistrationFields) {
      event.customRegistrationFields.forEach((field: CustomFormField) => {
        if (data[field.name] !== undefined) {
          customFieldData[field.name] = data[field.name];
        }
      });
    }

    const registrationData = {
      ...data,
      customFieldData,
      eventId: event.id,
    };

    onSubmit(registrationData);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Register for {event.name}</CardTitle>
        <p className="text-gray-600">{event.description}</p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Registration Type Selection */}
            <div className="space-y-4">
              <Label className="text-base font-medium">Registration Type</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card 
                  className={`cursor-pointer transition-all ${registrationType === "member" ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"}`}
                  onClick={() => setRegistrationType("member")}
                >
                  <CardContent className="p-4 text-center">
                    <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                    <h3 className="font-medium">Member</h3>
                    <p className="text-sm text-gray-600">Registered community member</p>
                  </CardContent>
                </Card>
                
                {event.allowGuests && (
                  <Card 
                    className={`cursor-pointer transition-all ${registrationType === "guest" ? "border-green-500 bg-green-50" : "hover:bg-gray-50"}`}
                    onClick={() => setRegistrationType("guest")}
                  >
                    <CardContent className="p-4 text-center">
                      <UserPlus className="h-8 w-8 mx-auto mb-2 text-green-600" />
                      <h3 className="font-medium">Guest</h3>
                      <p className="text-sm text-gray-600">Visiting guest</p>
                    </CardContent>
                  </Card>
                )}
                
                <Card 
                  className={`cursor-pointer transition-all ${registrationType === "invitee" ? "border-purple-500 bg-purple-50" : "hover:bg-gray-50"}`}
                  onClick={() => setRegistrationType("invitee")}
                >
                  <CardContent className="p-4 text-center">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                    <h3 className="font-medium">Invitee</h3>
                    <p className="text-sm text-gray-600">Special invitation</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Base Registration Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registrationType === "member" ? (
                <>
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} />
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
                          <Input placeholder="Enter your last name" {...field} />
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

                  <FormField
                    control={form.control}
                    name="auxiliaryBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auxiliary Body</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auxiliary body" />
                            </SelectTrigger>
                            <SelectContent>
                              {event.eligibleAuxiliaryBodies.filter((body: string) => body && body.trim()).map((body: string) => (
                                <SelectItem key={body} value={body}>
                                  {body}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />


                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="guestName"
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
                    name="guestEmail"
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
                  <FormField
                    control={form.control}
                    name="guestJamaat"
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
                    name="guestAuxiliaryBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Auxiliary Body</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select auxiliary body" />
                            </SelectTrigger>
                            <SelectContent>
                              {event.eligibleAuxiliaryBodies.filter((body: string) => body && body.trim()).map((body: string) => (
                                <SelectItem key={body} value={body}>
                                  {body}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {registrationType === "invitee" && (
                    <FormField
                      control={form.control}
                      name="guestPost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Post/Role (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your post or role" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </>
              )}
            </div>

            {/* Custom Fields */}
            {event.customRegistrationFields && event.customRegistrationFields.length > 0 && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Additional Information</h3>
                <div className="space-y-4">
                  {event.customRegistrationFields.map((field: CustomFormField) => 
                    renderCustomField(field)
                  )}
                </div>
              </div>
            )}

            {/* Payment Section - only show if payment is required for this user type */}
            {shouldShowPayment() && (
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4 flex items-center space-x-2">
                  <CreditCard className="h-5 w-5" />
                  <span>Payment Required</span>
                </h3>
                
                <Alert className="mb-4">
                  <AlertDescription>
                    This event requires payment of {getPaymentDisplay()}. Choose your payment method below.
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  {/* Payment Method Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Paystack Payment Option */}
                    {event.paymentSettings?.paymentMethods?.includes("paystack") && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <CreditCard className="h-4 w-4" />
                          <span className="font-medium">Pay Online</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Secure payment with cards, bank transfer, or mobile money
                        </p>
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full"
                          onClick={() => handleOnlinePayment()}
                        >
                          Pay with Paystack
                        </Button>
                      </div>
                    )}
                    
                    {/* Manual Receipt Upload Option */}
                    {event.paymentSettings?.allowManualReceipt && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <Receipt className="h-4 w-4" />
                          <span className="font-medium">Upload Receipt</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Upload receipt for manual verification
                        </p>
                        <FormField
                          control={form.control}
                          name="paymentReceiptFile"
                          render={({ field }) => (
                            <FormItem>
                              <FormControl>
                                <Input 
                                  type="file" 
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) => field.onChange(e.target.files?.[0])}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : shouldShowPayment() ? "Proceed to Payment" : "Register for Event"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}