-- Create a secure function for membership checks that bypasses RLS
CREATE OR REPLACE FUNCTION check_membership_status(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    is_member BOOLEAN;
BEGIN
    -- This function runs with elevated privileges to bypass RLS
    -- but only for membership status checks
    SELECT membership_status INTO is_member
    FROM user_profiles
    WHERE email = user_email;
    
    RETURN COALESCE(is_member, FALSE);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_membership_status(TEXT) TO authenticated;

-- Test the function
SELECT check_membership_status('camfleety@gmail.com');

-- Keep RLS enabled on the main table with restrictive policy
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create restrictive policy for the main table
DROP POLICY IF EXISTS "Restrict user_profiles access" ON user_profiles;
CREATE POLICY "Restrict user_profiles access" ON user_profiles
FOR ALL
TO authenticated
USING (auth.uid() = auth_id)
WITH CHECK (auth.uid() = auth_id); 