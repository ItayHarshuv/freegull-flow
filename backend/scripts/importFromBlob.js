import dotenv from "dotenv";
import { writeState } from "../src/stateRepository.js";
import { pool } from "../src/db.js";

dotenv.config();

const blobUrl =
  process.env.BLOB_IMPORT_URL ||
  "https://jsonblob.com/api/jsonBlob/1340277874983059456";
const clubId = process.env.CLUB_ID || "FREEGULL_MAIN";

async function run() {
  const res = await fetch(blobUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch blob: ${res.status}`);
  }
  const payload = await res.json();

  const state = {
    ...payload,
    clubId,
    currentUser: null,
    isEditorMode: false,
    isTourActive: false,
    syncStatus: "synced",
    lastSyncTime: new Date().toISOString(),
  };

  await writeState(clubId, state);
  console.log("Imported blob data into PostgreSQL");
}

run()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await pool.end();
    process.exit(1);
  });
