-- RLS Policies for users_endorsements table
-- This table stores user endorsements and ratings

-- Enable RLS if not already enabled
ALTER TABLE "public"."users_endorsements" ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own endorsements
CREATE POLICY "users_endorsements_view_own" ON "public"."users_endorsements" 
FOR SELECT USING ("auth"."uid"() = "user_id");

-- Policy: Admins, owners, and instructors can view all user endorsements
CREATE POLICY "users_endorsements_view_all" ON "public"."users_endorsements" 
FOR SELECT USING ("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"]));

-- Policy: Admins, owners, and instructors can insert user endorsements
CREATE POLICY "users_endorsements_insert" ON "public"."users_endorsements" 
FOR INSERT WITH CHECK ("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"]));

-- Policy: Admins, owners, and instructors can update user endorsements
CREATE POLICY "users_endorsements_update" ON "public"."users_endorsements" 
FOR UPDATE USING ("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"]));

-- Policy: Admins, owners, and instructors can delete user endorsements
CREATE POLICY "users_endorsements_delete" ON "public"."users_endorsements" 
FOR DELETE USING ("public"."check_user_role"("auth"."uid"(), ARRAY['admin'::"public"."user_role", 'owner'::"public"."user_role", 'instructor'::"public"."user_role"]));
