-- CreateTable
CREATE TABLE `Tournament` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NOT NULL,
    `season` VARCHAR(191) NOT NULL,
    `country` VARCHAR(191) NOT NULL DEFAULT 'Nepal',
    `logoUrl` VARCHAR(191) NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#2563EB',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#F8FAFC',
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `venue` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Tournament_season_idx`(`season`),
    UNIQUE INDEX `Tournament_name_season_key`(`name`, `season`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Franchise` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NULL,
    `ownerName` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `description` TEXT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Franchise_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Team` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `franchiseId` INTEGER NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NOT NULL,
    `primaryColor` VARCHAR(191) NOT NULL DEFAULT '#0F172A',
    `secondaryColor` VARCHAR(191) NOT NULL DEFAULT '#F8FAFC',
    `accentColor` VARCHAR(191) NULL,
    `themeName` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `homeGround` VARCHAR(191) NULL,
    `city` VARCHAR(191) NULL,
    `country` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `foundedYear` INTEGER NULL,
    `slogan` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Team_franchiseId_idx`(`franchiseId`),
    UNIQUE INDEX `Team_franchiseId_name_key`(`franchiseId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TournamentTeam` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NOT NULL,
    `teamId` INTEGER NOT NULL,
    `position` INTEGER NULL,
    `played` INTEGER NOT NULL DEFAULT 0,
    `won` INTEGER NOT NULL DEFAULT 0,
    `lost` INTEGER NOT NULL DEFAULT 0,
    `tied` INTEGER NOT NULL DEFAULT 0,
    `noResult` INTEGER NOT NULL DEFAULT 0,
    `points` INTEGER NOT NULL DEFAULT 0,
    `netRunRate` DOUBLE NOT NULL DEFAULT 0,

    INDEX `TournamentTeam_tournamentId_points_netRunRate_idx`(`tournamentId`, `points`, `netRunRate`),
    UNIQUE INDEX `TournamentTeam_tournamentId_teamId_key`(`tournamentId`, `teamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Player` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `teamId` INTEGER NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `jerseyNumber` INTEGER NULL,
    `dateOfBirth` DATETIME(3) NULL,
    `nationality` VARCHAR(191) NULL,
    `role` ENUM('BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKET_KEEPER') NOT NULL,
    `battingStyle` ENUM('RIGHT_HAND', 'LEFT_HAND') NULL,
    `bowlingStyle` ENUM('RIGHT_ARM_FAST', 'RIGHT_ARM_MEDIUM', 'LEFT_ARM_FAST', 'LEFT_ARM_MEDIUM', 'OFF_SPIN', 'LEG_SPIN', 'LEFT_ARM_ORTHODOX', 'LEFT_ARM_CHINAMAN', 'NONE') NOT NULL DEFAULT 'NONE',
    `imageUrl` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `bio` TEXT NULL,
    `isCaptain` BOOLEAN NOT NULL DEFAULT false,
    `isWicketKeeper` BOOLEAN NOT NULL DEFAULT false,
    `isOverseas` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Player_teamId_idx`(`teamId`),
    INDEX `Player_displayName_idx`(`displayName`),
    UNIQUE INDEX `Player_teamId_displayName_key`(`teamId`, `displayName`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Match` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tournamentId` INTEGER NULL,
    `matchNumber` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `stage` ENUM('LEAGUE', 'QUALIFIER', 'ELIMINATOR', 'FINAL', 'FRIENDLY') NOT NULL DEFAULT 'LEAGUE',
    `venue` VARCHAR(191) NULL,
    `startTime` DATETIME(3) NOT NULL,
    `status` ENUM('SCHEDULED', 'LIVE', 'COMPLETED', 'ABANDONED') NOT NULL DEFAULT 'SCHEDULED',
    `overs` INTEGER NOT NULL DEFAULT 20,
    `homeTeamId` INTEGER NOT NULL,
    `awayTeamId` INTEGER NOT NULL,
    `winnerTeamId` INTEGER NULL,
    `resultText` VARCHAR(191) NULL,
    `playerOfMatch` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Match_tournamentId_idx`(`tournamentId`),
    INDEX `Match_homeTeamId_idx`(`homeTeamId`),
    INDEX `Match_awayTeamId_idx`(`awayTeamId`),
    INDEX `Match_startTime_idx`(`startTime`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Toss` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` INTEGER NOT NULL,
    `winnerTeamId` INTEGER NOT NULL,
    `decision` ENUM('BAT', 'BOWL') NOT NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Toss_matchId_key`(`matchId`),
    INDEX `Toss_winnerTeamId_idx`(`winnerTeamId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MatchInnings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` INTEGER NOT NULL,
    `teamId` INTEGER NOT NULL,
    `inningsNumber` INTEGER NOT NULL DEFAULT 1,
    `runs` INTEGER NOT NULL DEFAULT 0,
    `wickets` INTEGER NOT NULL DEFAULT 0,
    `balls` INTEGER NOT NULL DEFAULT 0,
    `extras` INTEGER NOT NULL DEFAULT 0,
    `target` INTEGER NULL,
    `status` ENUM('NOT_STARTED', 'LIVE', 'COMPLETED') NOT NULL DEFAULT 'NOT_STARTED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `MatchInnings_matchId_idx`(`matchId`),
    INDEX `MatchInnings_teamId_idx`(`teamId`),
    UNIQUE INDEX `MatchInnings_matchId_inningsNumber_key`(`matchId`, `inningsNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlayerMatchStat` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `matchId` INTEGER NOT NULL,
    `playerId` INTEGER NOT NULL,
    `teamId` INTEGER NOT NULL,
    `innings` INTEGER NOT NULL DEFAULT 1,
    `runs` INTEGER NOT NULL DEFAULT 0,
    `ballsFaced` INTEGER NOT NULL DEFAULT 0,
    `fours` INTEGER NOT NULL DEFAULT 0,
    `sixes` INTEGER NOT NULL DEFAULT 0,
    `wickets` INTEGER NOT NULL DEFAULT 0,
    `ballsBowled` INTEGER NOT NULL DEFAULT 0,
    `runsConceded` INTEGER NOT NULL DEFAULT 0,
    `maidens` INTEGER NOT NULL DEFAULT 0,
    `catches` INTEGER NOT NULL DEFAULT 0,
    `stumpings` INTEGER NOT NULL DEFAULT 0,
    `runOuts` INTEGER NOT NULL DEFAULT 0,
    `isOut` BOOLEAN NOT NULL DEFAULT false,
    `dismissal` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PlayerMatchStat_matchId_idx`(`matchId`),
    INDEX `PlayerMatchStat_playerId_idx`(`playerId`),
    INDEX `PlayerMatchStat_teamId_idx`(`teamId`),
    UNIQUE INDEX `PlayerMatchStat_matchId_playerId_innings_key`(`matchId`, `playerId`, `innings`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `originalName` VARCHAR(191) NOT NULL,
    `url` VARCHAR(191) NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `size` INTEGER NOT NULL,
    `kind` ENUM('IMAGE', 'VIDEO', 'DOCUMENT', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `altText` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MediaAsset_fileName_key`(`fileName`),
    INDEX `MediaAsset_kind_idx`(`kind`),
    INDEX `MediaAsset_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Team` ADD CONSTRAINT `Team_franchiseId_fkey` FOREIGN KEY (`franchiseId`) REFERENCES `Franchise`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentTeam` ADD CONSTRAINT `TournamentTeam_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TournamentTeam` ADD CONSTRAINT `TournamentTeam_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Player` ADD CONSTRAINT `Player_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_tournamentId_fkey` FOREIGN KEY (`tournamentId`) REFERENCES `Tournament`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_homeTeamId_fkey` FOREIGN KEY (`homeTeamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_awayTeamId_fkey` FOREIGN KEY (`awayTeamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Match` ADD CONSTRAINT `Match_winnerTeamId_fkey` FOREIGN KEY (`winnerTeamId`) REFERENCES `Team`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Toss` ADD CONSTRAINT `Toss_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Toss` ADD CONSTRAINT `Toss_winnerTeamId_fkey` FOREIGN KEY (`winnerTeamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchInnings` ADD CONSTRAINT `MatchInnings_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MatchInnings` ADD CONSTRAINT `MatchInnings_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMatchStat` ADD CONSTRAINT `PlayerMatchStat_matchId_fkey` FOREIGN KEY (`matchId`) REFERENCES `Match`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMatchStat` ADD CONSTRAINT `PlayerMatchStat_playerId_fkey` FOREIGN KEY (`playerId`) REFERENCES `Player`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PlayerMatchStat` ADD CONSTRAINT `PlayerMatchStat_teamId_fkey` FOREIGN KEY (`teamId`) REFERENCES `Team`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
