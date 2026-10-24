CREATE TABLE `NplSourceSettings` (
 `season` VARCHAR(20) NOT NULL,
 `sourceUrl` VARCHAR(500) NOT NULL,
 `secondaryUrl` VARCHAR(500) NULL,
 `updatedAt` DATETIME(3) NOT NULL,
 PRIMARY KEY (`season`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
