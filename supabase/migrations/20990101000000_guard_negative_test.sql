-- NEGATIVE TEST ONLY: deliberately destructive migration used to verify that
-- the CI migration-guard job rejects DROP statements and fails the PR with an
-- ::error:: annotation. NEVER merge this file. The DROP is a no-op at runtime
-- (IF EXISTS on a table that is never created), so applying it cannot harm any
-- database; only the guard's static classification is exercised.
DROP TABLE IF EXISTS "__migration_guard_negative_test__";
