CREATE TABLE `communication_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`direction` enum('request','response') NOT NULL,
	`apduData` text NOT NULL,
	`clientType` enum('reader','emulator') NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `communication_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `relay_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sessionId` varchar(128) NOT NULL,
	`readerConnected` boolean NOT NULL DEFAULT false,
	`emulatorConnected` boolean NOT NULL DEFAULT false,
	`relayActive` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastActivity` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `relay_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `relay_sessions_sessionId_unique` UNIQUE(`sessionId`)
);
