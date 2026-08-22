-- CreateEnum
CREATE TYPE "TodoStatus" AS ENUM ('todo', 'doing', 'done');

-- CreateTable
CREATE TABLE "todos" (
    "id" UUID NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "status" "TodoStatus" NOT NULL,
    "due_date" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "todos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "todos_owner_id_created_at_idx" ON "todos"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "todos_owner_id_status_idx" ON "todos"("owner_id", "status");
