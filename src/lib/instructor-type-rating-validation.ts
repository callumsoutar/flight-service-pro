import { createClient } from "@/lib/SupabaseServerClient";
import type { TypeRatingValidation } from "@/types/instructor_aircraft_ratings";

// Reusable validation function
export async function verifyInstructorTypeRating(
  supabase: Awaited<ReturnType<typeof createClient>>,
  instructorId: string,
  aircraftId: string
): Promise<TypeRatingValidation> {
  try {
    // First, get the aircraft and its type
    const { data: aircraft, error: aircraftError } = await supabase
      .from("aircraft")
      .select(`
        id,
        registration,
        aircraft_type_id,
        aircraft_type:aircraft_type_id(id, name, category)
      `)
      .eq("id", aircraftId)
      .single();

    if (aircraftError || !aircraft) {
      return {
        valid: false,
        message: "Aircraft not found"
      };
    }

    // If no aircraft type is assigned, allow (backward compatibility)
    if (!aircraft.aircraft_type_id) {
      return {
        valid: true,
        message: "No type rating required (aircraft type not specified)"
      };
    }

    // Check if instructor has a valid rating for this aircraft type
    const { data: rating, error: ratingError } = await supabase
      .from("instructor_aircraft_ratings")
      .select(`
        *,
        instructor:instructor_id(
          *,
          user:user_id(id, first_name, last_name, email)
        ),
        aircraft_type:aircraft_type_id(*)
      `)
      .eq("instructor_id", instructorId)
      .eq("aircraft_type_id", aircraft.aircraft_type_id)
      .single();

    if (ratingError || !rating) {
      return {
        valid: false,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        message: `Instructor does not have a type rating for ${(aircraft.aircraft_type as any)?.name || 'this aircraft type'}`
      };
    }


    return {
      valid: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      message: `Valid type rating for ${(aircraft.aircraft_type as any)?.name}`,
      rating
    };
  } catch (error) {
    console.error("Error in verifyInstructorTypeRating:", error);
    return {
      valid: false,
      message: "Error validating type rating"
    };
  }
}