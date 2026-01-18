-- CreateTable
CREATE TABLE "GoogleCalendarLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "calendarId" TEXT,
    "calendarName" TEXT,
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GoogleCalendarLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "KonsistProfessionalMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "konsistProfissionalNome" TEXT NOT NULL,
    "konsistProfissionalId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "KonsistProfessionalMap_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GoogleCalendarLink_userId_key" ON "GoogleCalendarLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "KonsistProfessionalMap_userId_key" ON "KonsistProfessionalMap"("userId");
