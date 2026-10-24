CREATE TABLE `NplSourceSnapshot` (
  `season` VARCHAR(20) NOT NULL,
  `payload` JSON NOT NULL,
  `fetchedAt` DATETIME(3) NOT NULL,
  `rostersFetchedAt` DATETIME(3) NOT NULL,
  `lastAttemptAt` DATETIME(3) NOT NULL,
  `lastError` TEXT NULL,
  PRIMARY KEY (`season`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
