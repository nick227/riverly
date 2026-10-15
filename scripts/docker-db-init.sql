-- Dev only: Prisma `migrate dev` needs to create a shadow database; tests use riverly_test.
CREATE DATABASE IF NOT EXISTS riverly_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL ON *.* TO 'riverly'@'%';
