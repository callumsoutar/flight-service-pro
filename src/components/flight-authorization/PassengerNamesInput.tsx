"use client";
import React from 'react';
import { Control, Controller, useFieldArray } from 'react-hook-form';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Plus, X, Users } from "lucide-react";

interface PassengerNamesInputProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: Control<any>;
  disabled?: boolean;
}

export function PassengerNamesInput({ control, disabled = false }: PassengerNamesInputProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { fields, append, remove } = useFieldArray<any>({
    control,
    name: "passenger_names"
  });

  const addPassenger = () => {
    if (fields.length < 3) {
      append("");
    }
  };

  const removePassenger = (index: number) => {
    remove(index);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium flex items-center gap-2">
        <Users className="w-4 h-4" />
        Passenger Names
        {fields.length > 0 && (
          <span className="text-xs text-gray-500">({fields.length}/3)</span>
        )}
      </Label>
      
      {fields.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No passengers added yet
        </div>
      )}
      
      {fields.map((field, index) => (
        <div key={field.id} className="flex items-center gap-2">
          <Controller
            name={`passenger_names.${index}`}
            control={control}
            render={({ field: inputField, fieldState }) => (
              <div className="flex-1 space-y-1">
                <Input
                  {...inputField}
                  placeholder={`Passenger ${index + 1} name`}
                  disabled={disabled}
                  className={fieldState.error ? 'border-red-500' : ''}
                />
                {fieldState.error && (
                  <p className="text-xs text-red-600">{fieldState.error.message}</p>
                )}
              </div>
            )}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => removePassenger(index)}
            disabled={disabled}
            className="flex-shrink-0 h-10 w-10 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      
      {fields.length < 3 && (
        <Button
          type="button"
          variant="outline"
          onClick={addPassenger}
          disabled={disabled}
          className="w-full flex items-center gap-2 border-dashed"
        >
          <Plus className="w-4 h-4" />
          Add Passenger {fields.length > 0 && `(${fields.length + 1}/3)`}
        </Button>
      )}
    </div>
  );
}
