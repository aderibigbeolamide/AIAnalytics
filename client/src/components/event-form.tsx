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
import { Plus, X } from "lucide-react";

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
    // Always start with default bodies, user can remove them if needed
    const defaultBodies = ["Atfal", "Khuddam", "Lajna", "Ansarullah", "Nasra"];
    if (event?.eligibleAuxiliaryBodies && event.eligibleAuxiliaryBodies.length > 0) {
      // If editing an event, use existing auxiliary bodies plus any defaults not already included
      const existingBodies = event.eligibleAuxiliaryBodies;
      const allBodies = [...new Set([...defaultBodies, ...existingBodies])];
      return allBodies;
    }
    return defaultBodies;
  });
  const [newAuxiliaryBody, setNewAuxiliaryBody] = useState("");

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "invitations",
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

        <FormField
          control={form.control}
          name="requiresPayment"
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
                  Requires Payment
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {form.watch("requiresPayment") && (
          <FormField
            control={form.control}
            name="paymentAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Payment Amount</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., $50.00 or ₦5000"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

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
