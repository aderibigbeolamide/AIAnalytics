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
import { Plus, X, CreditCard, Receipt } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const eventSchema = z.object({
  name: z.string().min(1, "Event name is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  startDate: z.string().min(1, "Event start date is required"),
  endDate: z.string().optional(),
  registrationStartDate: z.string().min(1, "Registration start date is required"),
  registrationEndDate: z.string().min(1, "Registration end date is required"),
  eligibleAuxiliaryBodies: z.array(z.string()).min(1, "At least one auxiliary body must be selected"),
  allowGuests: z.boolean().default(false),
  requiresPayment: z.boolean().default(false),
  paymentAmount: z.string().optional(),
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
  invitations: z.array(z.object({
    name: z.string().min(1, "Invitee name is required"),
    email: z.string().email("Valid email is required"),
    post: z.string().optional(),
  })).optional(),
});

type EventFormData = z.infer<typeof eventSchema>;

interface EventFormProps {
  onClose: () => void;
  event?: any;
}

export function EventForm({ onClose, event }: EventFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EventFormData>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      name: event?.name || "",
      description: event?.description || "",
      location: event?.location || "",
      startDate: event?.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : "",
      endDate: event?.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : "",
      registrationStartDate: event?.registrationStartDate ? new Date(event.registrationStartDate).toISOString().slice(0, 16) : "",
      registrationEndDate: event?.registrationEndDate ? new Date(event.registrationEndDate).toISOString().slice(0, 16) : "",
      eligibleAuxiliaryBodies: event?.eligibleAuxiliaryBodies || [],
      allowGuests: event?.allowGuests || false,
      requiresPayment: event?.requiresPayment || false,
      paymentAmount: event?.paymentAmount || "",
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
      invitations: event?.invitations || [],
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

  const addAuxiliaryBody = () => {
    if (newAuxiliaryBody.trim() && !auxiliaryBodies.includes(newAuxiliaryBody.trim())) {
      setAuxiliaryBodies([...auxiliaryBodies, newAuxiliaryBody.trim()]);
      setNewAuxiliaryBody("");
    }
  };

  const removeAuxiliaryBody = (bodyToRemove: string) => {
    setAuxiliaryBodies(auxiliaryBodies.filter(body => body !== bodyToRemove));
    // Remove from form if it was selected
    const currentBodies = form.getValues("eligibleAuxiliaryBodies");
    form.setValue("eligibleAuxiliaryBodies", currentBodies.filter(body => body !== bodyToRemove));
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
                {auxiliaryBodies.map((body) => (
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
