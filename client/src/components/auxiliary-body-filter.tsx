import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AuxiliaryBodyFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAll?: boolean;
}

export function AuxiliaryBodyFilter({ 
  value, 
  onValueChange, 
  placeholder = "Filter by auxiliary body",
  includeAll = true 
}: AuxiliaryBodyFilterProps) {
  const { data: auxiliaryBodies = [] } = useQuery({
    queryKey: ['/api/auxiliary-bodies'],
  });

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Auxiliary Bodies</SelectItem>
        )}
        {auxiliaryBodies.length === 0 ? (
          <SelectItem value="no_bodies_available" disabled>No auxiliary bodies available</SelectItem>
        ) : (
          auxiliaryBodies.filter((body: string) => body && body.trim()).map((body: string) => (
            <SelectItem key={body} value={body}>
              {body}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

export function useAuxiliaryBodies() {
  return useQuery({
    queryKey: ['/api/auxiliary-bodies'],
  });
}