"use client";

import { AircraftComponent } from "@/types/aircraft_components";

interface MaintenanceWarningsProps {
  aircraftId: string;
  currentHours: number | null;
  components: AircraftComponent[];
}

// Calculate extended due hours when extension_limit_hours is set
function getExtendedDueHours(comp: AircraftComponent): number | null {
  if (
    comp.extension_limit_hours !== null &&
    comp.extension_limit_hours !== undefined &&
    comp.current_due_hours !== null &&
    comp.current_due_hours !== undefined &&
    comp.interval_hours !== null &&
    comp.interval_hours !== undefined
  ) {
    // Explicitly convert to numbers to avoid string concatenation
    const currentDue = Number(comp.current_due_hours);
    const intervalHours = Number(comp.interval_hours);
    const extensionPercent = Number(comp.extension_limit_hours);

    return currentDue + (intervalHours * (extensionPercent / 100));
  }
  return null;
}

// Calculate extended due date when extension_limit_hours is set
function getExtendedDueDate(comp: AircraftComponent): Date | null {
  if (
    comp.extension_limit_hours !== null &&
    comp.extension_limit_hours !== undefined &&
    comp.current_due_date &&
    comp.interval_days !== null &&
    comp.interval_days !== undefined
  ) {
    const baseDate = new Date(comp.current_due_date);
    // Explicitly convert to numbers to avoid type issues
    const intervalDays = Number(comp.interval_days);
    const extensionPercent = Number(comp.extension_limit_hours);
    const extensionDays = intervalDays * (extensionPercent / 100);

    return new Date(baseDate.getTime() + extensionDays * 24 * 60 * 60 * 1000);
  }
  return null;
}

interface ComponentWarning {
  component: AircraftComponent;
  status: 'overdue' | 'within_extension' | 'due_soon';
  message: string;
  extendedHours: number | null;
  extendedDate: Date | null;
}

function getComponentWarnings(
  components: AircraftComponent[],
  currentHours: number | null
): ComponentWarning[] {
  const warnings: ComponentWarning[] = [];
  const now = new Date();

  for (const comp of components) {
    const extendedHours = getExtendedDueHours(comp);
    const extendedDate = getExtendedDueDate(comp);
    const effectiveDueHours = extendedHours ?? comp.current_due_hours;
    const effectiveDueDate = extendedDate ?? (comp.current_due_date ? new Date(comp.current_due_date) : null);

    let status: 'overdue' | 'within_extension' | 'due_soon' | null = null;
    let message = '';

    // Check hours-based components
    if (effectiveDueHours !== null && effectiveDueHours !== undefined && currentHours !== null) {
      const hoursRemaining = Number(effectiveDueHours) - currentHours;

      // Overdue (past extended hours)
      if (hoursRemaining <= 0) {
        // Check if within extension
        if (
          extendedHours !== null &&
          comp.current_due_hours !== null &&
          comp.current_due_hours !== undefined &&
          currentHours > Number(comp.current_due_hours) &&
          currentHours <= extendedHours
        ) {
          status = 'within_extension';
          message = `Due in ${hoursRemaining.toFixed(1)} hours (Within Extension)`;
        } else {
          status = 'overdue';
          message = `Overdue by ${Math.abs(hoursRemaining).toFixed(1)} hours`;
        }
      }
      // Due soon (within 10 hours)
      else if (hoursRemaining <= 10) {
        status = 'due_soon';
        message = `Due in ${hoursRemaining.toFixed(1)} hours`;
      }
    }
    // Check date-based components
    else if (effectiveDueDate) {
      const daysRemaining = Math.ceil((effectiveDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Overdue (past extended date)
      if (daysRemaining <= 0) {
        // Check if within extension
        if (
          extendedDate &&
          comp.current_due_date &&
          now > new Date(comp.current_due_date) &&
          now <= extendedDate
        ) {
          status = 'within_extension';
          message = `Due in ${daysRemaining} days (Within Extension)`;
        } else {
          status = 'overdue';
          message = `Overdue by ${Math.abs(daysRemaining)} days`;
        }
      }
      // Due soon (within 7 days)
      else if (daysRemaining <= 7) {
        status = 'due_soon';
        message = `Due in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`;
      }
    }

    if (status) {
      warnings.push({
        component: comp,
        status,
        message,
        extendedHours,
        extendedDate
      });
    }
  }

  // Sort by severity: overdue > within_extension > due_soon
  const severityOrder = { overdue: 0, within_extension: 1, due_soon: 2 };
  return warnings.sort((a, b) => severityOrder[a.status] - severityOrder[b.status]);
}

export default function MaintenanceWarnings({ aircraftId, currentHours, components }: MaintenanceWarningsProps) {
  // Filter components for the selected aircraft
  const aircraftComponents = components.filter(c => c.aircraft_id === aircraftId);

  // Get warnings
  const warnings = getComponentWarnings(aircraftComponents, currentHours);

  // Don't render if no warnings
  if (warnings.length === 0) return null;

  return (
    <div className="bg-red-50 border-l-4 border-red-600 p-2 rounded">
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">⚠️</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-red-900 text-xs">Maintenance:</span>
            {warnings.map((warning, idx) => (
              <span key={warning.component.id} className="text-xs text-red-800">
                {idx > 0 && ' • '}
                {warning.component.name} - {warning.message}
                <span className={`ml-1 px-1 py-0.5 rounded text-[9px] font-semibold ${
                  warning.status === 'overdue' ? 'bg-red-200 text-red-900' :
                  warning.status === 'within_extension' ? 'bg-yellow-200 text-yellow-900' :
                  'bg-amber-200 text-amber-900'
                }`}>
                  {warning.status === 'overdue' ? 'OVERDUE' :
                   warning.status === 'within_extension' ? 'EXT' : 'DUE SOON'}
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
