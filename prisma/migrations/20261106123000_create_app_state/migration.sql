CREATE TABLE "AppState" (
    "clientId" UUID NOT NULL,
    "data" JSONB NOT NULL,
    "questData" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppState_pkey" PRIMARY KEY ("clientId")
);
