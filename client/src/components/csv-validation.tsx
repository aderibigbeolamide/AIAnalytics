import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getAuthHeaders } from "@/lib/auth";
import { Upload, Trash2, FileText } from "lucide-react";

interface CsvValidationProps {
  eventId: string;
}

export function CsvValidation({ eventId }: CsvValidationProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: csvFiles = [] } = useQuery({
    queryKey: [`/api/events/${eventId}/csv-validation`],
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("csvFile", file);

      const response = await fetch(`/api/events/${eventId}/csv-validation`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload CSV file");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CSV file uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/csv-validation`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to upload CSV file",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (csvId: number) => {
      const response = await fetch(`/api/csv-validation/${csvId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to delete CSV file");
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "CSV file deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/csv-validation`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete CSV file",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          CSV Member Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upload CSV files with member data for additional validation during event check-in.
            CSV should contain: name, email, chandaNumber, auxiliaryBody columns.
          </p>
          
          <div className="flex items-center gap-2">
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              disabled={uploading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {uploading ? "Uploading..." : "Upload CSV"}
            </Button>
          </div>
        </div>

        {csvFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files</h4>
            {csvFiles.map((csv: any) => (
              <div key={csv.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">{csv.fileName}</p>
                  <p className="text-sm text-muted-foreground">
                    {csv.memberData.length} members • Uploaded {new Date(csv.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteMutation.mutate(csv.id)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}