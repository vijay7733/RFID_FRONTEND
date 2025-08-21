// index.js (ESM style)
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing Supabase environment variables");
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// GET: fetch all attendance records
app.get("/api/attendance", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .order("check_in", { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("⚠️ Error fetching attendance:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST: check-out endpoint
app.post("/api/attendance/checkout", async (req, res) => {
  const { card_uid } = req.body;

  try {
    // Find latest record with check_out = null
    const { data: record, error: fetchError } = await supabase
      .from("attendance")
      .select("*")
      .eq("card_uid", card_uid)
      .is("check_out", null)
      .order("check_in", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !record) {
      return res.status(404).json({ error: "No active check-in found" });
    }

    const check_out_time = new Date();
    const duration_sec = Math.floor(
      (new Date(check_out_time) - new Date(record.check_in)) / 1000
    );

    const { data, error: updateError } = await supabase
      .from("attendance")
      .update({ check_out: check_out_time, duration: duration_sec })
      .eq("id", record.id)
      .select()
      .single();

    if (updateError) throw updateError;

    res.json(data);
  } catch (err) {
    console.error("⚠️ Error during checkout:", err.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start server
app.listen(PORT, () =>
  console.log(`✅ Backend running on http://localhost:${PORT}`)
);
