-- AlterTable
ALTER TABLE `ImportRun` ADD COLUMN `updated` INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `Integration` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `provider` ENUM('WOOCOMMERCE', 'HUBSPOT', 'ZAPIER', 'EMAIL_SERVER') NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `status` ENUM('CONNECTED', 'DISCONNECTED', 'ERROR') NOT NULL DEFAULT 'DISCONNECTED',
    `config` JSON NULL,
    `credentialCiphertext` TEXT NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `lastTestedAt` DATETIME(3) NULL,
    `errorMessage` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Integration_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `Integration_organizationId_provider_key`(`organizationId`, `provider`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Integration` ADD CONSTRAINT `Integration_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
