const SUPABASE_URL = "https://uxpdrchfucfyjwckjhuu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGRyY2hmdWNmeWp3Y2tqaHV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTc3NjIxMSwiZXhwIjoyMDk3MzUyMjExfQ.0c1alP8y0XfA4L8rpnxf82Lobp7TroheYE-wqjZoeEw";

async function checkBucket() {
    try {
        const response = await fetch(`${SUPABASE_URL}/storage/v1/bucket/raw_footage`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
            }
        });
        const data = await response.json();
        console.log("Bucket Config:", JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}
checkBucket();
