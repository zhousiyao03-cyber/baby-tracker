-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'unknown');

-- CreateEnum
CREATE TYPE "BabyMemberRole" AS ENUM ('admin', 'member');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('feeding_breast', 'feeding_formula', 'poop', 'pee', 'sleep', 'bath', 'temperature', 'weight', 'jaundice', 'daily_change');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "babies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "gender" "Gender" NOT NULL DEFAULT 'unknown',
    "birth_date" DATE NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "babies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "baby_members" (
    "baby_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "BabyMemberRole" NOT NULL DEFAULT 'member',
    "invite_code" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "baby_members_pkey" PRIMARY KEY ("baby_id","user_id")
);

-- CreateTable
CREATE TABLE "records" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "RecordType" NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "text_content" TEXT,
    "audio_url" TEXT,
    "audio_duration_seconds" DOUBLE PRECISION,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "photos" (
    "id" UUID NOT NULL,
    "baby_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "record_id" UUID,
    "message_id" UUID,
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "baby_members_invite_code_key" ON "baby_members"("invite_code");

-- CreateIndex
CREATE INDEX "records_baby_id_recorded_at_idx" ON "records"("baby_id", "recorded_at");

-- CreateIndex
CREATE INDEX "messages_baby_id_recorded_at_idx" ON "messages"("baby_id", "recorded_at");

-- CreateIndex
CREATE INDEX "photos_baby_id_uploaded_at_idx" ON "photos"("baby_id", "uploaded_at");

-- AddForeignKey
ALTER TABLE "baby_members" ADD CONSTRAINT "baby_members_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "baby_members" ADD CONSTRAINT "baby_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "records" ADD CONSTRAINT "records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_baby_id_fkey" FOREIGN KEY ("baby_id") REFERENCES "babies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_record_id_fkey" FOREIGN KEY ("record_id") REFERENCES "records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
