-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `avatarUrl` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    UNIQUE INDEX `User_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `activeOrganizationId` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSeenAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Session_tokenHash_key`(`tokenHash`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Organization` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `timezone` VARCHAR(191) NOT NULL DEFAULT 'America/Denver',
    `logoUrl` VARCHAR(1024) NULL,
    `reviewUrl` VARCHAR(1024) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Organization_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Membership` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'MEMBER') NOT NULL,
    `status` ENUM('ACTIVE', 'DEACTIVATED') NOT NULL DEFAULT 'ACTIVE',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Membership_userId_idx`(`userId`),
    UNIQUE INDEX `Membership_organizationId_userId_key`(`organizationId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Invitation` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'MANAGER', 'MEMBER') NOT NULL,
    `tokenHash` VARCHAR(191) NOT NULL,
    `invitedById` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `acceptedById` VARCHAR(191) NULL,
    `revokedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Invitation_tokenHash_key`(`tokenHash`),
    INDEX `Invitation_organizationId_email_idx`(`organizationId`, `email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlatformRoleGrant` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `role` ENUM('PLATFORM_ADMIN', 'AFFILIATE') NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    UNIQUE INDEX `PlatformRoleGrant_userId_role_key`(`userId`, `role`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkflowVersion` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `templateKey` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `definition` JSON NOT NULL,
    `publishedById` VARCHAR(191) NULL,
    `publishedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `changeNote` TEXT NULL,

    INDEX `WorkflowVersion_organizationId_publishedAt_idx`(`organizationId`, `publishedAt`),
    UNIQUE INDEX `WorkflowVersion_organizationId_templateKey_version_key`(`organizationId`, `templateKey`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Resource` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NOT NULL,
    `description` TEXT NULL,
    `stageIds` JSON NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Resource_organizationId_isActive_idx`(`organizationId`, `isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Contact` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `emailNormalized` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `phoneNormalized` VARCHAR(191) NULL,
    `addressLine` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `region` VARCHAR(191) NULL,
    `postalCode` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Contact_organizationId_emailNormalized_idx`(`organizationId`, `emailNormalized`),
    INDEX `Contact_organizationId_phoneNormalized_idx`(`organizationId`, `phoneNormalized`),
    INDEX `Contact_organizationId_name_idx`(`organizationId`, `name`),
    INDEX `Contact_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    UNIQUE INDEX `Contact_id_organizationId_key`(`id`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Opportunity` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `workflowVersionId` VARCHAR(191) NOT NULL,
    `stageId` VARCHAR(191) NOT NULL,
    `stageEnteredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` ENUM('OPEN', 'WON', 'LOST', 'ON_HOLD', 'CANCELED') NOT NULL DEFAULT 'OPEN',
    `statusReason` TEXT NULL,
    `ownerId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `propertyAddress` VARCHAR(191) NULL,
    `inquiry` TEXT NULL,
    `leadSourceOptionId` VARCHAR(191) NULL,
    `urgencyOptionId` VARCHAR(191) NULL,
    `estimatedValueCents` INTEGER NULL,
    `contractValueCents` INTEGER NULL,
    `nextFollowUpAt` DATETIME(3) NULL,
    `leadReceivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `leadReceivedVia` ENUM('PROVIDER', 'SYSTEM', 'MANUAL', 'IMPORTED') NOT NULL DEFAULT 'SYSTEM',
    `sourceRecordId` VARCHAR(191) NULL,
    `lastActivityAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Opportunity_sourceRecordId_key`(`sourceRecordId`),
    INDEX `Opportunity_organizationId_stageId_status_idx`(`organizationId`, `stageId`, `status`),
    INDEX `Opportunity_organizationId_ownerId_status_idx`(`organizationId`, `ownerId`, `status`),
    INDEX `Opportunity_organizationId_contactId_idx`(`organizationId`, `contactId`),
    INDEX `Opportunity_organizationId_lastActivityAt_idx`(`organizationId`, `lastActivityAt`),
    INDEX `Opportunity_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    UNIQUE INDEX `Opportunity_id_organizationId_key`(`id`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpportunityFieldValue` (
    `organizationId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NOT NULL,
    `value` JSON NOT NULL,
    `workflowVersionId` VARCHAR(191) NOT NULL,
    `updatedById` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `OpportunityFieldValue_organizationId_fieldId_idx`(`organizationId`, `fieldId`),
    PRIMARY KEY (`opportunityId`, `fieldId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StageTransition` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `workflowVersionId` VARCHAR(191) NOT NULL,
    `kind` ENUM('FORWARD', 'BACKWARD', 'ADMIN_MAPPING', 'STATUS') NOT NULL,
    `fromStageId` VARCHAR(191) NULL,
    `toStageId` VARCHAR(191) NOT NULL,
    `fromStatus` ENUM('OPEN', 'WON', 'LOST', 'ON_HOLD', 'CANCELED') NULL,
    `toStatus` ENUM('OPEN', 'WON', 'LOST', 'ON_HOLD', 'CANCELED') NULL,
    `reason` TEXT NULL,
    `actorId` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `idempotencyKey` VARCHAR(191) NULL,

    INDEX `StageTransition_organizationId_occurredAt_idx`(`organizationId`, `occurredAt`),
    INDEX `StageTransition_organizationId_toStageId_occurredAt_idx`(`organizationId`, `toStageId`, `occurredAt`),
    UNIQUE INDEX `StageTransition_opportunityId_idempotencyKey_key`(`opportunityId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActivityEvent` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `category` ENUM('WORK', 'MESSAGE', 'TEAM', 'SYSTEM') NOT NULL,
    `actorType` ENUM('USER', 'SYSTEM', 'INTEGRATION') NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `actorLabel` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `opportunityId` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `workflowVersionId` VARCHAR(191) NULL,
    `methodId` VARCHAR(191) NULL,
    `outcomeId` VARCHAR(191) NULL,
    `note` TEXT NULL,
    `payload` JSON NULL,
    `verification` ENUM('SELF_REPORTED', 'PROVIDER_VERIFIED', 'SYSTEM_RECORDED') NOT NULL,
    `postId` VARCHAR(191) NULL,
    `recognitionId` VARCHAR(191) NULL,
    `outboundMessageId` VARCHAR(191) NULL,
    `importRunId` VARCHAR(191) NULL,
    `revisionOfId` VARCHAR(191) NULL,
    `correlationId` VARCHAR(191) NULL,
    `idempotencyKey` VARCHAR(191) NULL,
    `occurredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `recordedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ActivityEvent_postId_key`(`postId`),
    UNIQUE INDEX `ActivityEvent_recognitionId_key`(`recognitionId`),
    UNIQUE INDEX `ActivityEvent_outboundMessageId_key`(`outboundMessageId`),
    INDEX `ActivityEvent_organizationId_occurredAt_id_idx`(`organizationId`, `occurredAt`, `id`),
    INDEX `ActivityEvent_organizationId_category_occurredAt_idx`(`organizationId`, `category`, `occurredAt`),
    INDEX `ActivityEvent_organizationId_actorId_occurredAt_idx`(`organizationId`, `actorId`, `occurredAt`),
    INDEX `ActivityEvent_opportunityId_occurredAt_idx`(`opportunityId`, `occurredAt`),
    INDEX `ActivityEvent_contactId_occurredAt_idx`(`contactId`, `occurredAt`),
    INDEX `ActivityEvent_organizationId_type_occurredAt_idx`(`organizationId`, `type`, `occurredAt`),
    UNIQUE INDEX `ActivityEvent_organizationId_idempotencyKey_key`(`organizationId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Post` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `opportunityId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `deletedAt` DATETIME(3) NULL,

    INDEX `Post_organizationId_createdAt_idx`(`organizationId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Comment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `activityEventId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `body` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    INDEX `Comment_activityEventId_createdAt_idx`(`activityEventId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Reaction` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `activityEventId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Reaction_activityEventId_userId_code_key`(`activityEventId`, `userId`, `code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RecognitionType` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `key` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `emoji` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RecognitionType_organizationId_key_key`(`organizationId`, `key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Recognition` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `recipientUserId` VARCHAR(191) NOT NULL,
    `giverUserId` VARCHAR(191) NOT NULL,
    `typeId` VARCHAR(191) NOT NULL,
    `note` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revokedAt` DATETIME(3) NULL,

    INDEX `Recognition_organizationId_recipientUserId_createdAt_idx`(`organizationId`, `recipientUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Appointment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `stageId` VARCHAR(191) NOT NULL,
    `kind` VARCHAR(191) NOT NULL DEFAULT 'inspection',
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NULL,
    `status` ENUM('SCHEDULED', 'COMPLETED', 'CANCELED', 'NO_SHOW') NOT NULL DEFAULT 'SCHEDULED',
    `assigneeUserId` VARCHAR(191) NULL,
    `externalPersonId` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Appointment_organizationId_startsAt_idx`(`organizationId`, `startsAt`),
    INDEX `Appointment_opportunityId_idx`(`opportunityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalPerson` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExternalPerson_organizationId_displayName_idx`(`organizationId`, `displayName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OpportunityParticipant` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `roleKey` VARCHAR(191) NOT NULL,
    `stageId` VARCHAR(191) NULL,
    `memberUserId` VARCHAR(191) NULL,
    `externalPersonId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `removedAt` DATETIME(3) NULL,

    INDEX `OpportunityParticipant_opportunityId_roleKey_idx`(`opportunityId`, `roleKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attachment` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `byteLength` INTEGER NOT NULL,
    `sha256` VARCHAR(191) NOT NULL,
    `uploadedById` VARCHAR(191) NULL,
    `uploadedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `deletedAt` DATETIME(3) NULL,

    UNIQUE INDEX `Attachment_storageKey_key`(`storageKey`),
    INDEX `Attachment_organizationId_uploadedAt_idx`(`organizationId`, `uploadedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttachmentLink` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `attachmentId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NULL,
    `contactId` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `fieldId` VARCHAR(191) NULL,
    `activityEventId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AttachmentLink_opportunityId_stageId_idx`(`opportunityId`, `stageId`),
    INDEX `AttachmentLink_activityEventId_idx`(`activityEventId`),
    INDEX `AttachmentLink_organizationId_contactId_idx`(`organizationId`, `contactId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExternalRecordLink` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `kind` ENUM('INVOICE', 'PAYMENT', 'DEPOSIT', 'ESTIMATE', 'OTHER') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `url` VARCHAR(2048) NULL,
    `amountCents` INTEGER NULL,
    `statusLabel` VARCHAR(191) NULL,
    `provenance` ENUM('MANUAL', 'PROVIDER') NOT NULL DEFAULT 'MANUAL',
    `statusRecordedAt` DATETIME(3) NULL,
    `recordedById` VARCHAR(191) NULL,
    `lastSyncedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ExternalRecordLink_opportunityId_idx`(`opportunityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Source` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `kind` ENUM('MANUAL', 'CSV', 'FORM', 'API') NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Source_organizationId_kind_displayName_key`(`organizationId`, `kind`, `displayName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SourceRecord` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `entityKind` VARCHAR(191) NOT NULL DEFAULT 'lead',
    `externalId` VARCHAR(191) NOT NULL,
    `importRunId` VARCHAR(191) NULL,
    `rawPayload` JSON NOT NULL,
    `contentHash` VARCHAR(191) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `providerTimestamp` DATETIME(3) NULL,
    `providerTimestampVia` ENUM('PROVIDER', 'SYSTEM', 'MANUAL', 'IMPORTED') NULL,
    `dedupeStatus` ENUM('PENDING_REVIEW', 'NEW_CONTACT', 'LINKED_EXISTING', 'REJECTED') NOT NULL,
    `matchCandidateIds` JSON NULL,
    `canonicalContactId` VARCHAR(191) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `SourceRecord_organizationId_dedupeStatus_idx`(`organizationId`, `dedupeStatus`),
    INDEX `SourceRecord_organizationId_receivedAt_idx`(`organizationId`, `receivedAt`),
    UNIQUE INDEX `SourceRecord_organizationId_sourceId_entityKind_externalId_key`(`organizationId`, `sourceId`, `entityKind`, `externalId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ContactSourceLink` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `sourceRecordId` VARCHAR(191) NOT NULL,
    `matchedBy` VARCHAR(191) NOT NULL,
    `confirmedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `ContactSourceLink_contactId_sourceRecordId_key`(`contactId`, `sourceRecordId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportRun` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `fileName` VARCHAR(191) NOT NULL,
    `state` ENUM('RUNNING', 'SUCCEEDED', 'PARTIALLY_COMPLETED', 'FAILED') NOT NULL,
    `columnMapping` JSON NOT NULL,
    `rowsSeen` INTEGER NOT NULL DEFAULT 0,
    `created` INTEGER NOT NULL DEFAULT 0,
    `linked` INTEGER NOT NULL DEFAULT 0,
    `duplicatesFlagged` INTEGER NOT NULL DEFAULT 0,
    `errors` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NOT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `ImportRun_organizationId_startedAt_idx`(`organizationId`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ImportIssue` (
    `id` VARCHAR(191) NOT NULL,
    `importRunId` VARCHAR(191) NOT NULL,
    `rowNumber` INTEGER NOT NULL,
    `message` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ImportIssue_importRunId_idx`(`importRunId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LeadForm` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `sourceId` VARCHAR(191) NOT NULL,
    `publicToken` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `headline` VARCHAR(191) NULL,
    `successMessage` TEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `LeadForm_publicToken_key`(`publicToken`),
    INDEX `LeadForm_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SenderIdentity` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `provider` ENUM('DEV_LOG', 'RESEND') NOT NULL,
    `fromName` VARCHAR(191) NOT NULL,
    `fromEmail` VARCHAR(191) NOT NULL,
    `replyTo` VARCHAR(191) NULL,
    `credentialCiphertext` TEXT NULL,
    `verification` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'FAILED') NOT NULL DEFAULT 'UNVERIFIED',
    `verifiedAt` DATETIME(3) NULL,
    `verificationDetail` TEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `SenderIdentity_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailTemplate` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `stableKey` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `stageId` VARCHAR(191) NULL,
    `subjectTemplate` TEXT NOT NULL,
    `bodyTemplate` TEXT NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `version` INTEGER NOT NULL DEFAULT 1,
    `updatedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EmailTemplate_organizationId_stableKey_key`(`organizationId`, `stableKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OutboundMessage` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NULL,
    `opportunityId` VARCHAR(191) NULL,
    `stageId` VARCHAR(191) NULL,
    `templateId` VARCHAR(191) NULL,
    `templateKey` VARCHAR(191) NULL,
    `templateVersion` INTEGER NULL,
    `senderIdentityId` VARCHAR(191) NOT NULL,
    `provider` ENUM('DEV_LOG', 'RESEND') NOT NULL,
    `fromSnapshot` VARCHAR(191) NOT NULL,
    `replyToSnapshot` VARCHAR(191) NULL,
    `toEmail` VARCHAR(191) NOT NULL,
    `toName` VARCHAR(191) NULL,
    `subject` TEXT NOT NULL,
    `bodyText` TEXT NOT NULL,
    `idempotencyKey` VARCHAR(191) NOT NULL,
    `status` ENUM('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED') NOT NULL DEFAULT 'QUEUED',
    `providerMessageId` VARCHAR(191) NULL,
    `attempts` INTEGER NOT NULL DEFAULT 0,
    `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lockedUntil` DATETIME(3) NULL,
    `lastError` TEXT NULL,
    `requestedById` VARCHAR(191) NOT NULL,
    `reviewRequestId` VARCHAR(191) NULL,
    `queuedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OutboundMessage_providerMessageId_key`(`providerMessageId`),
    INDEX `OutboundMessage_status_nextAttemptAt_idx`(`status`, `nextAttemptAt`),
    INDEX `OutboundMessage_organizationId_opportunityId_queuedAt_idx`(`organizationId`, `opportunityId`, `queuedAt`),
    INDEX `OutboundMessage_organizationId_contactId_queuedAt_idx`(`organizationId`, `contactId`, `queuedAt`),
    UNIQUE INDEX `OutboundMessage_organizationId_idempotencyKey_key`(`organizationId`, `idempotencyKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DeliveryAttempt` (
    `id` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NOT NULL,
    `attemptNumber` INTEGER NOT NULL,
    `outcome` VARCHAR(191) NOT NULL,
    `errorCode` VARCHAR(191) NULL,
    `errorSummary` TEXT NULL,
    `attemptedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DeliveryAttempt_messageId_attemptNumber_key`(`messageId`, `attemptNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `EmailProviderEvent` (
    `id` VARCHAR(191) NOT NULL,
    `provider` ENUM('DEV_LOG', 'RESEND') NOT NULL,
    `providerEventId` VARCHAR(191) NOT NULL,
    `messageId` VARCHAR(191) NULL,
    `type` VARCHAR(191) NOT NULL,
    `occurredAt` DATETIME(3) NOT NULL,
    `payload` JSON NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `EmailProviderEvent_provider_providerEventId_key`(`provider`, `providerEventId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ReviewRequest` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `opportunityId` VARCHAR(191) NOT NULL,
    `contactId` VARCHAR(191) NOT NULL,
    `destinationUrl` VARCHAR(2048) NOT NULL,
    `reviewStatus` ENUM('UNKNOWN', 'CONFIRMED') NOT NULL DEFAULT 'UNKNOWN',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReviewRequest_opportunityId_idx`(`opportunityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkerRun` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NULL,
    `kind` VARCHAR(191) NOT NULL,
    `status` ENUM('RUNNING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_COMPLETED') NOT NULL,
    `detail` JSON NULL,
    `error` TEXT NULL,
    `startedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finishedAt` DATETIME(3) NULL,

    INDEX `WorkerRun_kind_startedAt_idx`(`kind`, `startedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RateLimitBucket` (
    `key` VARCHAR(191) NOT NULL,
    `count` INTEGER NOT NULL,
    `windowEnd` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Membership` ADD CONSTRAINT `Membership_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Invitation` ADD CONSTRAINT `Invitation_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlatformRoleGrant` ADD CONSTRAINT `PlatformRoleGrant_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkflowVersion` ADD CONSTRAINT `WorkflowVersion_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Contact` ADD CONSTRAINT `Contact_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `Organization`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_contactId_organizationId_fkey` FOREIGN KEY (`contactId`, `organizationId`) REFERENCES `Contact`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_workflowVersionId_fkey` FOREIGN KEY (`workflowVersionId`) REFERENCES `WorkflowVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Opportunity` ADD CONSTRAINT `Opportunity_sourceRecordId_fkey` FOREIGN KEY (`sourceRecordId`) REFERENCES `SourceRecord`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpportunityFieldValue` ADD CONSTRAINT `OpportunityFieldValue_opportunityId_organizationId_fkey` FOREIGN KEY (`opportunityId`, `organizationId`) REFERENCES `Opportunity`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `StageTransition` ADD CONSTRAINT `StageTransition_opportunityId_organizationId_fkey` FOREIGN KEY (`opportunityId`, `organizationId`) REFERENCES `Opportunity`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Comment` ADD CONSTRAINT `Comment_activityEventId_fkey` FOREIGN KEY (`activityEventId`) REFERENCES `ActivityEvent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Reaction` ADD CONSTRAINT `Reaction_activityEventId_fkey` FOREIGN KEY (`activityEventId`) REFERENCES `ActivityEvent`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Recognition` ADD CONSTRAINT `Recognition_typeId_fkey` FOREIGN KEY (`typeId`) REFERENCES `RecognitionType`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_opportunityId_organizationId_fkey` FOREIGN KEY (`opportunityId`, `organizationId`) REFERENCES `Opportunity`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `Appointment` ADD CONSTRAINT `Appointment_externalPersonId_fkey` FOREIGN KEY (`externalPersonId`) REFERENCES `ExternalPerson`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OpportunityParticipant` ADD CONSTRAINT `OpportunityParticipant_opportunityId_organizationId_fkey` FOREIGN KEY (`opportunityId`, `organizationId`) REFERENCES `Opportunity`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `OpportunityParticipant` ADD CONSTRAINT `OpportunityParticipant_externalPersonId_fkey` FOREIGN KEY (`externalPersonId`) REFERENCES `ExternalPerson`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttachmentLink` ADD CONSTRAINT `AttachmentLink_attachmentId_fkey` FOREIGN KEY (`attachmentId`) REFERENCES `Attachment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExternalRecordLink` ADD CONSTRAINT `ExternalRecordLink_opportunityId_organizationId_fkey` FOREIGN KEY (`opportunityId`, `organizationId`) REFERENCES `Opportunity`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `SourceRecord` ADD CONSTRAINT `SourceRecord_sourceId_fkey` FOREIGN KEY (`sourceId`) REFERENCES `Source`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SourceRecord` ADD CONSTRAINT `SourceRecord_importRunId_fkey` FOREIGN KEY (`importRunId`) REFERENCES `ImportRun`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ContactSourceLink` ADD CONSTRAINT `ContactSourceLink_contactId_organizationId_fkey` FOREIGN KEY (`contactId`, `organizationId`) REFERENCES `Contact`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE `ContactSourceLink` ADD CONSTRAINT `ContactSourceLink_sourceRecordId_fkey` FOREIGN KEY (`sourceRecordId`) REFERENCES `SourceRecord`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ImportIssue` ADD CONSTRAINT `ImportIssue_importRunId_fkey` FOREIGN KEY (`importRunId`) REFERENCES `ImportRun`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OutboundMessage` ADD CONSTRAINT `OutboundMessage_reviewRequestId_fkey` FOREIGN KEY (`reviewRequestId`) REFERENCES `ReviewRequest`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DeliveryAttempt` ADD CONSTRAINT `DeliveryAttempt_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `OutboundMessage`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EmailProviderEvent` ADD CONSTRAINT `EmailProviderEvent_messageId_fkey` FOREIGN KEY (`messageId`) REFERENCES `OutboundMessage`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ReviewRequest` ADD CONSTRAINT `ReviewRequest_opportunityId_organizationId_fkey` FOREIGN KEY (`opportunityId`, `organizationId`) REFERENCES `Opportunity`(`id`, `organizationId`) ON DELETE RESTRICT ON UPDATE RESTRICT;
