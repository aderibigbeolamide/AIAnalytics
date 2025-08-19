import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { FormFieldBuilder } from "@/components/form-field-builder";
import { Plus, X, CreditCard, Receipt, Upload, Image as ImageIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  eventType: z.enum(["registration", "ticket"]).default("registration"),
  startDate: z.string().min(1, "Event start date is required").refine((date) => {
    return new Date(date) > new Date();
  }, "Event start date cannot be in the past"),
  endDate: z.string().optional(),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  eligibleAuxiliaryBodies: z.array(z.string()).min(1, "At least one auxiliary body must be selected"),
  allowGuests: z.boolean().default(false),
  allowInvitees: z.boolean().default(false),
  requiresPayment: z.boolean().default(false),
  paymentAmount: z.string().optional(),
  eventImage: z.string().optional(),
  paymentSettings: z.object({
    requiresPayment: z.boolean().default(false),
    amount: z.string().optional(),
    currency: z.string().default("NGN"),
    paymentMethods: z.array(z.string()).default(["paystack", "manual_receipt"]),
    paymentRules: z.object({
      member: z.boolean().default(false),
      guest: z.boolean().default(false),
      invitee: z.boolean().default(false),
    }).default({ member: false, guest: false, invitee: false }),
    allowManualReceipt: z.boolean().default(true),
    paymentDescription: z.string().optional(),
  }).optional(),
  customRegistrationFields: z.array(z.any()).min(1, "At least one registration field is required"),
  ticketCategories: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Category name is required"),
    price: z.number().min(0, "Price must be 0 or greater"),
    currency: z.string().default("NGN"),
    description: z.string().optional(),
    maxQuantity: z.number().optional(),
    available: z.boolean().default(true),
  })).optional(),
  invitations: z.array(z.object({
    name: z.string().min(1, "Invitee name is required"),
    email: z.string().email("Valid email is required"),
    post: z.string().optional(),
  })).optional(),
  reminderSettings: z.object({
    enabled: z.boolean().default(true),
    days: z.array(z.number()).default([7, 3, 1]),
    hours: z.array(z.number()).default([24, 2]),
    customMessage: z.string().optional(),
    emailEnabled: z.boolean().default(true),
    inAppEnabled: z.boolean().default(true),
    reminderTitle: z.string().optional(),
  }).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  onClose: () => void;
  event?: any;
}

export function EventForm({ onClose, event }: EventFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(event?.eventImage || null);
  const [isImageUploading, setIsImageUploading] = useState(false);

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name || "",
      description: event?.description || "",
      location: event?.location || "",
      eventType: event?.eventType || "registration",
      startDate: event?.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      registrationStartDate: event?.registrationStartDate ? new Date(event.registrationStartDate).toISOString().slice(0, 16) : "",
      registrationEndDate: event?.registrationEndDate ? new Date(event.registrationEndDate).toISOString().slice(0, 16) : "",
      eligibleAuxiliaryBodies: event?.eligibleAuxiliaryBodies || [],
      allowGuests: event?.allowGuests || false,
      allowInvitees: event?.allowInvitees || false,
      requiresPayment: event?.requiresPayment || false,
      paymentAmount: event?.paymentAmount || "",
      eventImage: event?.eventImage || "",
      paymentSettings: event?.paymentSettings || {
        requiresPayment: false,
        amount: "",
        currency: "NGN",
        paymentMethods: ["paystack", "manual_receipt"],
        paymentRules: { member: false, guest: false, invitee: false },
        allowManualReceipt: true,
        paymentDescription: "",
      },
      customRegistrationFields: event?.customRegistrationFields || [],
      ticketCategories: event?.ticketCategories || [],
      invitations: event?.invitations || [],
      reminderSettings: event?.reminderSettings || {
        enabled: true,
        days: [7, 3, 1],
        hours: [24, 2],
        customMessage: "",
        emailEnabled: true,
        inAppEnabled: true,
        reminderTitle: "",
      },
    },
  });

  const createEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        registrationStartDate: new Date(data.registrationStartDate).toISOString(),
        registrationEndDate: new Date(data.registrationEndDate).toISOString(),
        // Convert paymentAmount from string to number if it exists
        paymentAmount: data.paymentAmount && data.paymentAmount.trim() ? parseFloat(data.paymentAmount) : undefined,
      };

      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        console.error("Event creation failed:", response.status, errorData);
        throw new Error(`Failed to create event: ${response.status} ${errorData}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Success",
        description: "Event created successfully",
      });
      onClose();
    },
    onError: (error: any) => {
      console.error("Create event mutation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create event",
        variant: "destructive",
      });
    },
  });

  const updateEventMutation = useMutation({
    mutationFn: async (data: EventFormData) => {
      const eventData = {
        ...data,
        startDate: new Date(data.startDate).toISOString(),
        endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
        registrationStartDate: new Date(data.registrationStartDate).toISOString(),
        registrationEndDate: new Date(data.registrationEndDate).toISOString(),
      };

      const response = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(eventData),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update event");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      toast({
        title: "Success",
        description: "Event updated successfully",
      });
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update event",
        variant: "destructive",
      });
    },
  });

  const [auxiliaryBodies, setAuxiliaryBodies] = useState(() => {
    // Start with existing auxiliary bodies from the event or empty array
    if (event?.eligibleAuxiliaryBodies && event.eligibleAuxiliaryBodies.length > 0) {
      return event.eligibleAuxiliaryBodies;
    }
    return [];
  });
  const [newAuxiliaryBody, setNewAuxiliaryBody] = useState("");

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invitations",
  });

  const { fields: customFields, append: appendCustomField, remove: removeCustomField, update: updateCustomField } = useFieldArray({
    control: form.control,
    name: "customRegistrationFields",
  });

  const { fields: ticketCategories, append: appendTicketCategory, remove: removeTicketCategory } = useFieldArray({
    control: form.control,
    name: "ticketCategories",
  });

  const addAuxiliaryBody = () => {
    if (newAuxiliaryBody.trim() && !auxiliaryBodies.includes(newAuxiliaryBody.trim())) {
      setAuxiliaryBodies([...auxiliaryBodies, newAuxiliaryBody.trim()]);
      setNewAuxiliaryBody("");
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsImageUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'event-images');

      const response = await fetch('/api/upload/image', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const { url } = await response.json();
      console.log('DEBUG: Image upload response URL:', url);
      setImagePreview(url);
      form.setValue('eventImage', url);
      console.log('DEBUG: Updated imagePreview state to:', url);
      console.log('DEBUG: Form eventImage value:', form.getValues('eventImage'));

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      });
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImageUploading(false);
    }
  };

  const removeAuxiliaryBody = (bodyToRemove: string) => {
    setAuxiliaryBodies(auxiliaryBodies.filter((body: string) => body !== bodyToRemove));
    // Remove from form if it was selected
    const currentBodies = form.getValues("eligibleAuxiliaryBodies");
    form.setValue("eligibleAuxiliaryBodies", currentBodies.filter((body: string) => body !== bodyToRemove));
  };

  const onSubmit = (data: EventFormData) => {
    console.log("Form data being submitted:", data);
    
    // Validate custom registration fields
    if (!data.customRegistrationFields || data.customRegistrationFields.length === 0) {
      toast({
        title: "Registration Fields Required",
        description: "Please add at least one registration field for members, guests, and invitees to fill out when registering for this event.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate ticket categories for ticket-based events
    if (data.eventType === "ticket" && (!data.ticketCategories || data.ticketCategories.length === 0)) {
      toast({
        title: "Ticket Categories Required",
        description: "Please add at least one ticket category for your ticket-based event.",
        variant: "destructive",
      });
      return;
    }
    
    // Set the eligible auxiliary bodies from our state
    const submissionData = {
      ...data,
      eligibleAuxiliaryBodies: auxiliaryBodies,
    };
    
    console.log("Final submission data:", submissionData);
    
    if (event) {
      updateEventMutation.mutate(submissionData);
    } else {
      createEventMutation.mutate(submissionData);
    }
  };

  const isLoading = createEventMutation.isPending || updateEventMutation.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter event name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Event description" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Event Image Upload */}
        <FormField
          control={form.control}
          name="eventImage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Image (Optional)</FormLabel>
              <FormControl>
                <div className="space-y-4">
                  {console.log('DEBUG: Rendering with imagePreview:', imagePreview)}
                  {imagePreview ? (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Event preview" 
                        className="w-full h-full object-cover"
                        onLoad={() => console.log('DEBUG: Image loaded successfully:', imagePreview)}
                        onError={(e) => console.error('DEBUG: Image failed to load:', imagePreview, e)}
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setImagePreview(null);
                          form.setValue('eventImage', '');
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-2">Upload an event image</p>
                      <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleImageUpload(file);
                        }
                      }}
                      disabled={isImageUploading}
                      className="hidden"
                      id="event-image-upload"
                    />
                    <label htmlFor="event-image-upload">
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        disabled={isImageUploading}
                        asChild
                      >
                        <span>
                          {isImageUploading ? (
                            <>
                              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4 mr-2" />
                              Choose Image
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input placeholder="Event location" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="eventType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Type</FormLabel>
              <FormControl>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select event type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registration">
                      <div className="space-y-1">
                        <div className="font-medium">Secure Registration Event</div>
                        <div className="text-xs text-muted-foreground">
                          Traditional validation with auxiliary body checks, CSV verification, and strict security
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="ticket">
                      <div className="space-y-1">
                        <div className="font-medium">Ticket-Based Event</div>
                        <div className="text-xs text-muted-foreground">
                          Simplified ticketing system - purchase, transfer, and validate with QR codes only
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event Start Date & Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Event End Date & Time (Optional)</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="registrationStartDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Opens</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="registrationEndDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Closes</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="eligibleAuxiliaryBodies"
          render={() => (
            <FormItem>
              <FormLabel>Eligible Groups</FormLabel>
              
              {/* Add new auxiliary body */}
              <div className="space-y-2 mb-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new group (e.g., Youth, Students, Committee)"
                    value={newAuxiliaryBody}
                    onChange={(e) => setNewAuxiliaryBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAuxiliaryBody();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={addAuxiliaryBody}
                    disabled={!newAuxiliaryBody.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  You can add custom groups and remove any groups (including defaults) that don't apply to your event.
                </p>
              </div>
              
              <div className="space-y-2">
                {auxiliaryBodies.map((body: string) => (
                  <FormField
                    key={body}
                    control={form.control}
                    name="eligibleAuxiliaryBodies"
                    render={({ field }) => {
                      return (
                        <FormItem
                          key={body}
                          className="flex flex-row items-center justify-between space-x-3 space-y-0 p-2 border rounded"
                        >
                          <div className="flex items-center space-x-3">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(body)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, body])
                                    : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== body
                                        )
                                      );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="text-sm font-normal">
                              {body}
                            </FormLabel>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAuxiliaryBody(body)}
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                            title={`Remove ${body} from available groups`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </FormItem>
                      );
                    }}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowGuests"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Allow Guests
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="allowInvitees"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>
                  Allow Invitees
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {/* Payment Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Payment Settings</span>
            </CardTitle>
            <CardDescription>
              Configure payment requirements and methods for this event
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="paymentSettings.requiresPayment"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      This event requires payment
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("paymentSettings.requiresPayment") && (
              <div className="space-y-4 border-l-2 border-blue-200 pl-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="paymentSettings.amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Amount</FormLabel>
                        <FormControl>
                          <Input 
                            type="number"
                            placeholder="5000"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentSettings.currency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Currency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select currency" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="NGN">NGN (₦)</SelectItem>
                            <SelectItem value="USD">USD ($)</SelectItem>
                            <SelectItem value="GBP">GBP (£)</SelectItem>
                            <SelectItem value="EUR">EUR (€)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="paymentSettings.paymentDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., This payment covers event materials, refreshments, and transportation"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-3">
                  <FormLabel className="text-base font-medium">Who needs to pay?</FormLabel>
                  
                  <FormField
                    control={form.control}
                    name="paymentSettings.paymentRules.member"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Members must pay
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentSettings.paymentRules.guest"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Guests must pay
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentSettings.paymentRules.invitee"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Invitees must pay
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-3">
                  <FormLabel className="text-base font-medium">Payment Methods</FormLabel>
                  
                  <FormField
                    control={form.control}
                    name="paymentSettings.paymentMethods"
                    render={() => (
                      <FormItem>
                        <div className="space-y-2">
                          <FormField
                            control={form.control}
                            name="paymentSettings.paymentMethods"
                            render={({ field }) => {
                              return (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes("paystack")}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        return checked
                                          ? field.onChange([...current.filter(m => m !== "paystack"), "paystack"])
                                          : field.onChange(current.filter(m => m !== "paystack"));
                                      }}
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="flex items-center space-x-2">
                                      <CreditCard className="h-4 w-4" />
                                      <span>Online payment via Paystack</span>
                                    </FormLabel>
                                    <p className="text-xs text-muted-foreground">
                                      Accept card payments, bank transfers, and mobile money
                                    </p>
                                  </div>
                                </FormItem>
                              );
                            }}
                          />
                          
                          <FormField
                            control={form.control}
                            name="paymentSettings.allowManualReceipt"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel className="flex items-center space-x-2">
                                    <Receipt className="h-4 w-4" />
                                    <span>Allow payment receipt uploads</span>
                                  </FormLabel>
                                  <p className="text-xs text-muted-foreground">
                                    Users can upload receipts for manual verification
                                  </p>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Ticket Categories Section - Only for ticket-based events */}
        {form.watch("eventType") === "ticket" && (
          <Card>
            <CardHeader>
              <CardTitle>Ticket Categories</CardTitle>
              <CardDescription>
                Define different ticket types with prices for your event
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <FormLabel className="text-base font-medium">Ticket Types</FormLabel>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendTicketCategory({
                    id: `ticket-${Date.now()}`,
                    name: "",
                    price: 0,
                    currency: "NGN",
                    description: "",
                    maxQuantity: undefined,
                    available: true,
                  })}
                  className="h-8"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Ticket Category
                </Button>
              </div>
              
              {ticketCategories.length > 0 ? (
                <div className="space-y-4">
                  {ticketCategories.map((category, index) => (
                    <div key={category.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">Ticket Category {index + 1}</h4>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeTicketCategory(index)}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`ticketCategories.${index}.name`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Category Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Regular, VIP, Student" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`ticketCategories.${index}.price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Price</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01" 
                                  placeholder="0.00" 
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`ticketCategories.${index}.description`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="e.g., Includes special seating and refreshments" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`ticketCategories.${index}.maxQuantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Max Quantity (Optional)</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min="1" 
                                  placeholder="Unlimited" 
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name={`ticketCategories.${index}.available`}
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-6">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Available for purchase</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
                  <p className="text-sm text-gray-500 mb-2">No ticket categories added yet</p>
                  <p className="text-xs text-gray-400">Add at least one ticket category for your event</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Event Reminder Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Event Reminders</CardTitle>
            <CardDescription>
              Configure automatic reminders to be sent to event participants
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="reminderSettings.enabled"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Enable automatic reminders
                    </FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Send reminders to participants before the event starts
                    </p>
                  </div>
                </FormItem>
              )}
            />

            {form.watch("reminderSettings.enabled") && (
              <div className="space-y-4 pl-6 border-l-2 border-gray-200">
                <FormField
                  control={form.control}
                  name="reminderSettings.reminderTitle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reminder Title (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Don't forget about our event!" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="reminderSettings.customMessage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Reminder Message (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., We're excited to see you at our event! Please arrive 15 minutes early for check-in. Don't forget to bring your ID and any required documents."
                          rows={4}
                          {...field} 
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        This message will be included in all reminder notifications. Leave empty to use the default message.
                      </p>
                      {field.value && (
                        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Preview:</p>
                          <p className="text-sm text-gray-800 dark:text-gray-200">
                            {field.value}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            + Event details (name, time, location) will be automatically added
                          </p>
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <FormLabel className="text-sm font-medium">Notification Methods</FormLabel>
                    
                    <FormField
                      control={form.control}
                      name="reminderSettings.emailEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Email reminders</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Send reminder emails to participants
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="reminderSettings.inAppEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>In-app notifications</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Notify admins about upcoming events
                            </p>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-3">
                    <FormLabel className="text-sm font-medium">Reminder Schedule</FormLabel>
                    
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="reminderSettings.days"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Days before event (separate with commas)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., 7, 3, 1" 
                                value={field.value?.join(', ') || '7, 3, 1'}
                                onChange={(e) => {
                                  const days = e.target.value
                                    .split(',')
                                    .map(d => parseInt(d.trim()))
                                    .filter(d => !isNaN(d) && d > 0)
                                    .sort((a, b) => b - a); // Sort descending
                                  field.onChange(days);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Enter days when reminders should be sent (e.g., 7, 3, 1 for 7 days, 3 days, and 1 day before)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="reminderSettings.hours"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Hours before event (separate with commas)</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., 24, 6, 2" 
                                value={field.value?.join(', ') || '24, 2'}
                                onChange={(e) => {
                                  const hours = e.target.value
                                    .split(',')
                                    .map(h => parseInt(h.trim()))
                                    .filter(h => !isNaN(h) && h > 0 && h <= 72)
                                    .sort((a, b) => b - a); // Sort descending
                                  field.onChange(hours);
                                }}
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Enter hours when final reminders should be sent (max 72 hours, e.g., 24, 6, 2)
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invitations Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel className="text-base font-medium">Specific Invitations</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ name: "", email: "", post: "" })}
              className="h-8"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Invitation
            </Button>
          </div>
          {fields.length > 0 && (
            <div className="space-y-3">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`invitations.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Invitee name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`invitations.${index}.email`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Email address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex-1">
                    <FormField
                      control={form.control}
                      name={`invitations.${index}.post`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Post/Role (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="h-10 w-10 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {fields.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              Click "Add Invitation" to invite specific people who aren't members
            </p>
          )}
        </div>

        {/* Custom Registration Fields Builder */}
        <div className="border-t pt-6">
          <FormFieldBuilder
            control={form.control}
            fields={customFields}
            append={appendCustomField}
            remove={removeCustomField}
            update={updateCustomField}
          />
        </div>

        <div className="flex space-x-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Saving..." : event ? "Update Event" : "Create Event"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
