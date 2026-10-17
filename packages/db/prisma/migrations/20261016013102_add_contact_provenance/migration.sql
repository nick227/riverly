-- CreateTable
CREATE TABLE `ContactProvenance` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `provider` ENUM('WOOCOMMERCE', 'HUBSPOT', 'ZAPIER', 'EMAIL_SERVER') NOT NULL,
    `integrationId` VARCHAR(191) NULL,
    `externalId` VARCHAR(191) NOT NULL,
    `externalData` JSON NULL,
    `lastSyncedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ContactProvenance_organizationId_contactId_idx`(`organizationId`, `contactId`),
    INDEX `ContactProvenance_contactId_idx`(`contactId`),
    INDEX `ContactProvenance_integrationId_idx`(`integrationId`),
    UNIQUE INDEX `ContactProvenance_organizationId_provider_externalId_key`(`organizationId`, `provider`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ContactProvenance` ADD CONSTRAINT `ContactProvenance_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactProvenance` ADD CONSTRAINT `ContactProvenance_contactId_organizationId_fkey` FOREIGN KEY (`contactId`, `organizationId`) REFERENCES `Contact`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ContactProvenance` ADD CONSTRAINT `ContactProvenance_integrationId_fkey` FOREIGN KEY (`integrationId`) REFERENCES `Integration`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
