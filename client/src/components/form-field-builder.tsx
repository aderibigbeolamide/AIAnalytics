import { useState } from "react";
import { useFieldArray, Control } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Edit, Eye, EyeOff } from "lucide-react";
import { CustomFormField } from "@/../../shared/schema";

interface FormFieldBuilderProps {
  control: Control<any>;
  fields: any[];
  append: (field: any) => void;
  remove: (index: number) => void;
  update: (index: number, field: any) => void;
}

export function FormFieldBuilder({ control, fields, append, remove, update }: FormFieldBuilderProps) {
  const [isBuilding, setIsBuilding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [previewMode, setPreviewMode] = useState(false);

  const fieldTypes = [
    { value: 'text', label: 'Text Input' },
    { value: 'email', label: 'Email' },
    { value: 'number', label: 'Number' },
    { value: 'tel', label: 'Phone Number' },
    { value: 'select', label: 'Dropdown' },
    { value: 'radio', label: 'Radio Buttons' },
    { value: 'checkbox', label: 'Checkboxes' },
    { value: 'textarea', label: 'Text Area' },
    { value: 'file', label: 'File Upload' },
  ];

  const [newField, setNewField] = useState<CustomFormField>({
    id: '',
    name: '',
    label: '',
    type: 'text',
    required: false,
    placeholder: '',
    options: [],
    helperText: '',
  });

  const handleAddField = () => {
    const fieldId = `field_${Date.now()}`;
    const field = {
      ...newField,
      id: fieldId,
      name: newField.name || fieldId,
    };
    
    if (editingIndex !== null) {
      update(editingIndex, field);
      setEditingIndex(null);
    } else {
      append(field);
    }
    
    setNewField({
      id: '',
      name: '',
      label: '',
      type: 'text',
      required: false,
      placeholder: '',
      options: [],
      helperText: '',
    });
    setIsBuilding(false);
  };

  const handleEditField = (index: number) => {
    setNewField(fields[index]);
    setEditingIndex(index);
    setIsBuilding(true);
  };

  const addOption = () => {
    setNewField({
      ...newField,
      options: [...(newField.options || []), '']
    });
  };

  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...(newField.options || [])];
    updatedOptions[index] = value;
    setNewField({ ...newField, options: updatedOptions });
  };

  const removeOption = (index: number) => {
    const updatedOptions = [...(newField.options || [])];
    updatedOptions.splice(index, 1);
    setNewField({ ...newField, options: updatedOptions });
  };

  const renderPreviewField = (field: CustomFormField) => {
    const baseProps = {
      placeholder: field.placeholder,
      required: field.required,
      disabled: true,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
      case 'tel':
        return <Input {...baseProps} type={field.type} />;
      case 'textarea':
        return <Textarea {...baseProps} />;
      case 'select':
        return (
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder={field.placeholder || "Select an option"} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option, idx) => (
                <SelectItem key={idx} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <input type="radio" disabled className="text-blue-600" />
                <Label>{option}</Label>
              </div>
            ))}
          </div>
        );
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, idx) => (
              <div key={idx} className="flex items-center space-x-2">
                <Checkbox disabled />
                <Label>{option}</Label>
              </div>
            ))}
          </div>
        );
      case 'file':
        return <Input type="file" disabled />;
      default:
        return <Input {...baseProps} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Custom Registration Fields</h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
          >
            {previewMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {previewMode ? 'Edit' : 'Preview'}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsBuilding(!isBuilding)}
          >
            <Plus className="h-4 w-4" />
            Add Field
          </Button>
        </div>
      </div>

      {/* Existing Fields */}
      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field, index) => (
            <Card key={field.id || index} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{field.type}</Badge>
                  <span className="font-medium">{field.label}</span>
                  {field.required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                </div>
                <div className="flex gap-2">
                  {!previewMode && (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditField(index)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
              
              {previewMode && (
                <div className="mt-3">
                  <Label className="text-sm font-medium">{field.label}</Label>
                  {field.helperText && (
                    <p className="text-sm text-gray-500 mb-2">{field.helperText}</p>
                  )}
                  {renderPreviewField(field)}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Field Builder */}
      {isBuilding && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editingIndex !== null ? 'Edit Field' : 'Add New Field'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-label">Field Label *</Label>
                <Input
                  id="field-label"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                  placeholder="Enter field label"
                />
              </div>
              <div>
                <Label htmlFor="field-name">Field Name</Label>
                <Input
                  id="field-name"
                  value={newField.name}
                  onChange={(e) => setNewField({ ...newField, name: e.target.value })}
                  placeholder="Auto-generated if empty"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="field-type">Field Type</Label>
                <Select
                  value={newField.type}
                  onValueChange={(value) => setNewField({ ...newField, type: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fieldTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="field-placeholder">Placeholder</Label>
                <Input
                  id="field-placeholder"
                  value={newField.placeholder}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  placeholder="Enter placeholder text"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="field-helper">Helper Text</Label>
              <Input
                id="field-helper"
                value={newField.helperText}
                onChange={(e) => setNewField({ ...newField, helperText: e.target.value })}
                placeholder="Additional help text for users"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="field-required"
                checked={newField.required}
                onCheckedChange={(checked) => setNewField({ ...newField, required: checked as boolean })}
              />
              <Label htmlFor="field-required">Required field</Label>
            </div>

            {/* Options for select, radio, checkbox */}
            {['select', 'radio', 'checkbox'].includes(newField.type) && (
              <div>
                <Label>Options</Label>
                <div className="space-y-2">
                  {newField.options?.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addOption}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAddField}
                disabled={!newField.label}
              >
                {editingIndex !== null ? 'Update Field' : 'Add Field'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBuilding(false);
                  setEditingIndex(null);
                  setNewField({
                    id: '',
                    name: '',
                    label: '',
                    type: 'text',
                    required: false,
                    placeholder: '',
                    options: [],
                    helperText: '',
                  });
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}