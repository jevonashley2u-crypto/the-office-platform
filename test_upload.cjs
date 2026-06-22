const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const SUPABASE_URL = "https://uxpdrchfucfyjwckjhuu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGRyY2hmdWNmeWp3Y2tqaHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYyMTEsImV4cCI6MjA5NzM1MjIxMX0.i_p_C_MFb86C5b1IAEWblrNz3hPW9QC7djpYsN0rl1s";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testUpload() {
    console.log("Starting upload test...");
    try {
        const fileBuffer = Buffer.from('test video content');
        const fileName = 'test_video_' + Date.now() + '.mp4';
        
        console.log("Uploading as anon user...");
        const { data, error } = await supabase.storage
            .from('raw_footage')
            .upload(fileName, fileBuffer, {
                contentType: 'video/mp4',
                cacheControl: '3600',
                upsert: false
            });

        if (error) {
            console.error("UPLOAD ERROR:", error);
            process.exit(1);
        }

        console.log("UPLOAD SUCCESS:", data);
        
        // Clean up
        console.log("Cleaning up test file...");
        const { error: rmError } = await supabase.storage.from('raw_footage').remove([fileName]);
        if (rmError) console.error("Failed to clean up:", rmError);
        else console.log("Cleaned up successfully.");
        
    } catch (e) {
        console.error("EXCEPTION:", e);
        process.exit(1);
    }
}

testUpload();
