-- This file includes SQL commands for the langchain schema.
-- This schema is used by services of the supabase-langchain package.

-- Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS langchain;

-- Grant access privileges
GRANT USAGE ON SCHEMA langchain TO "anon";
GRANT USAGE ON SCHEMA langchain TO "authenticated";
GRANT USAGE ON SCHEMA langchain TO "service_role";

