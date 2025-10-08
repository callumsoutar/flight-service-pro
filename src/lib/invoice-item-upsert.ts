/**
 * Invoice Item UPSERT Logic
 * 
 * This module provides smart matching and UPSERT (update or insert) logic
 * for invoice items during the check-in flow. Instead of always creating
 * new items, it matches existing items and updates them when appropriate.
 * 
 * This prevents duplicate invoice items when recalculating flight charges.
 */

export interface RequiredInvoiceItem {
  descriptionPattern: RegExp;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  chargeable_id?: string | null;
}

export interface ExistingInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  deleted_at: string | null;
}

export interface InvoiceItemAction {
  action: 'update' | 'insert' | 'delete';
  existingId?: string;
  data: RequiredInvoiceItem | { id: string };
}

/**
 * Match existing invoice items to required items and determine actions
 * 
 * @param existingItems - Current active invoice items
 * @param requiredItems - Items that should exist based on current calculation
 * @returns Array of actions (update, insert, delete) to perform
 */
export function matchInvoiceItems(
  existingItems: ExistingInvoiceItem[],
  requiredItems: RequiredInvoiceItem[]
): InvoiceItemAction[] {
  const actions: InvoiceItemAction[] = [];
  
  // Only consider active items (not soft-deleted)
  const activeExisting = existingItems.filter(item => !item.deleted_at);
  const matchedIds = new Set<string>();

  // Find updates and inserts
  for (const required of requiredItems) {
    // Try to find an existing item that matches this pattern
    const existing = activeExisting.find(item =>
      required.descriptionPattern.test(item.description) &&
      !matchedIds.has(item.id)
    );

    if (existing) {
      // UPDATE: Item exists, update it
      matchedIds.add(existing.id);
      actions.push({
        action: 'update',
        existingId: existing.id,
        data: required
      });
    } else {
      // INSERT: Item doesn't exist, create it
      actions.push({
        action: 'insert',
        data: required
      });
    }
  }

  // Find deletes (existing items that are no longer needed)
  for (const existing of activeExisting) {
    if (!matchedIds.has(existing.id)) {
      // This item is no longer needed, soft delete it
      actions.push({
        action: 'delete',
        data: { id: existing.id }
      });
    }
  }

  return actions;
}

/**
 * Helper function to round to 1 decimal place
 */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Generate required items based on flight parameters
 * 
 * @param params - Flight calculation parameters
 * @returns Array of required invoice items
 */
export function generateRequiredItems(params: {
  instructionType: 'dual' | 'solo' | 'trial' | null;
  dualTime: number;
  soloTime: number;
  aircraftRate: number;
  instructorRate: number;
  soloAircraftRate?: number;
  flightTypeName: string;
  aircraftReg: string;
  instructorName: string;
  taxRate: number;
}): RequiredInvoiceItem[] {
  const {
    instructionType,
    dualTime,
    soloTime,
    aircraftRate,
    instructorRate,
    soloAircraftRate,
    flightTypeName,
    aircraftReg,
    instructorName,
    taxRate
  } = params;

  const items: RequiredInvoiceItem[] = [];

  if (instructionType === 'solo') {
    // SOLO FLIGHTS: Only aircraft charge
    const totalTime = roundToOneDecimal(dualTime + soloTime);
    items.push({
      // Pattern matches: "Solo PPL Training - ZK-ABC"
      descriptionPattern: /^Solo .+ - [A-Z0-9-]+$/,
      description: `Solo ${flightTypeName} - ${aircraftReg}`,
      quantity: totalTime,
      unit_price: aircraftRate,
      tax_rate: taxRate
    });
  } else if (instructionType === 'dual') {
    // DUAL FLIGHTS: Dual time (aircraft + instructor) + optional solo time

    if (dualTime > 0) {
      // Dual aircraft charge
      items.push({
        // Pattern matches: "Dual PPL Training - ZK-ABC"
        descriptionPattern: /^Dual .+ - [A-Z0-9-]+$/,
        description: `Dual ${flightTypeName} - ${aircraftReg}`,
        quantity: roundToOneDecimal(dualTime),
        unit_price: aircraftRate,
        tax_rate: taxRate
      });

      // Dual instructor charge
      items.push({
        // Pattern matches: "Dual PPL Training - John Smith"
        descriptionPattern: /^Dual .+ - .+$/,
        description: `Dual ${flightTypeName} - ${instructorName}`,
        quantity: roundToOneDecimal(dualTime),
        unit_price: instructorRate,
        tax_rate: taxRate
      });
    }

    if (soloTime > 0) {
      // Solo continuation (aircraft only)
      const soloRate = soloAircraftRate || aircraftRate;
      items.push({
        // Pattern matches: "Solo PPL Training - ZK-ABC"
        descriptionPattern: /^Solo .+ - [A-Z0-9-]+$/,
        description: `Solo ${flightTypeName} - ${aircraftReg}`,
        quantity: roundToOneDecimal(soloTime),
        unit_price: soloRate,
        tax_rate: taxRate
      });
    }
  } else {
    // TRIAL FLIGHTS or FALLBACK: Standard items
    const totalTime = roundToOneDecimal(dualTime + soloTime);

    // Aircraft charge
    items.push({
      // Pattern matches: "PPL Training - ZK-ABC"
      // Use exact flight type name to avoid false matches
      descriptionPattern: new RegExp(`^${escapeRegExp(flightTypeName)} - [A-Z0-9-]+$`),
      description: `${flightTypeName} - ${aircraftReg}`,
      quantity: totalTime,
      unit_price: aircraftRate,
      tax_rate: taxRate
    });

    // Instructor charge (only if rate > 0)
    if (instructorRate > 0) {
      items.push({
        // Pattern matches: "PPL Training - John Smith"
        descriptionPattern: new RegExp(`^${escapeRegExp(flightTypeName)} - .+$`),
        description: `${flightTypeName} - ${instructorName}`,
        quantity: totalTime,
        unit_price: instructorRate,
        tax_rate: taxRate
      });
    }
  }

  return items;
}

/**
 * Escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
