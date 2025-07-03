import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { FileText, Send } from "lucide-react";

export default function Report() {
  const [, params] = useRoute("/report/:eventId");
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    reportType: "",
    message: "",
  });

  const submitReport = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch(`/api/events/${params?.eventId}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to submit report");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Report Submitted",
        description: "Thank you for your feedback. Your report has been submitted successfully.",
      });
      setFormData({
        name: "",
        email: "",
        phone: "",
        reportType: "",
        message: "",
      });
    },
    onError: () => {
      toast({
        title: "Submission Failed",
        description: "Failed to submit your report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.reportType || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }
    submitReport.mutate(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Feedback</h1>
          <p className="text-gray-600">
            Share your thoughts, suggestions, or report any issues about the event
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Submit Your Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      placeholder="your.email@example.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange("phone", e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Report Type */}
              <div>
                <Label htmlFor="reportType">Report Type *</Label>
                <Select value={formData.reportType} onValueChange={(value) => handleInputChange("reportType", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select the type of your report" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="suggestion">Suggestion</SelectItem>
                    <SelectItem value="observation">General Observation</SelectItem>
                    <SelectItem value="praise">Positive Feedback</SelectItem>
                    <SelectItem value="technical">Technical Issue</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div>
                <Label htmlFor="message">Your Message *</Label>
                <Textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => handleInputChange("message", e.target.value)}
                  placeholder="Please provide detailed information about your feedback, suggestion, or issue..."
                  rows={6}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Please be as specific as possible to help us better understand and address your feedback.
                </p>
              </div>

              {/* Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">Submission Guidelines:</h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Be respectful and constructive in your feedback</li>
                  <li>• Provide specific details and examples when possible</li>
                  <li>• For urgent issues, please contact event staff directly</li>
                  <li>• Your feedback helps us improve future events</li>
                </ul>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button 
                  type="submit" 
                  disabled={submitReport.isPending}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {submitReport.isPending ? (
                    <>Submitting...</>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Submit Report
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <div className="mt-8 text-center">
          <p className="text-gray-600 text-sm">
            Your feedback is important to us. All reports are reviewed by our event management team.
            <br />
            For urgent matters, please contact event staff directly at the venue.
          </p>
        </div>
      </div>
    </div>
  );
}