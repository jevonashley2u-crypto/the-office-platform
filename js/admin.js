// Initialize Supabase Client
const SUPABASE_URL = "https://uxpdrchfucfyjwckjhuu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGRyY2hmdWNmeWp3Y2tqaHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYyMTEsImV4cCI6MjA5NzM1MjIxMX0.i_p_C_MFb86C5b1IAEWblrNz3hPW9QC7djpYsN0rl1s";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    fetchInsights();
    fetchContentCalendar();
    fetchRenderQueue();
    fetchAgents();
    fetchRawFootage();
    setupUploadZone();
});

async function fetchInsights() {
    const container = document.getElementById("insights-container");
    const { data, error } = await supabase
        .from('insight_impacts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">Error loading insights: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="loading">No cross-division insights generated yet. Check back after 10:00 AM.</div>`;
        return;
    }

    container.innerHTML = data.map(item => `
        <div class="insight-item">
            <span class="platform-tag">From: ${item.source_agent}</span>
            <strong>${item.insight_extracted}</strong>
            <p><strong>Action:</strong> ${item.build_catalyst_application}</p>
            <div class="impact-badge">Est. Impact: +${item.expected_impact}% ROI</div>
        </div>
    `).join("");
}

async function fetchContentCalendar() {
    const container = document.getElementById("content-container");
    const { data, error } = await supabase
        .from('content_calendar')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">Error: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="loading">No content generated yet. Check back after 9:00 AM.</div>`;
        return;
    }

    container.innerHTML = data.map(item => {
        const brandBadge = item.brand === 'Tech' 
            ? `<span style="background: rgba(0,210,255,0.2); color: #00d2ff; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">💻 Tech</span>`
            : item.brand === 'Platform'
            ? `<span style="background: rgba(0,200,100,0.2); color: #00c864; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">🌊 Platform</span>`
            : `<span style="background: rgba(138,43,226,0.2); color: #e2b3ff; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; margin-left: 5px;">🎵 Music</span>`;

        return `
        <div class="content-item">
            <span class="platform-tag">${item.platform.toUpperCase()} ${brandBadge}</span>
            <strong>${item.content_type.replace('_', ' ').toUpperCase()}</strong>
            <p>${item.description}</p>
            <div style="margin-top: 0.5rem; font-size: 0.8rem; color: #94a3b8;">Status: ${item.status}</div>
        </div>
        `;
    }).join("");
}

async function fetchAgents() {
    const container = document.getElementById("agents-container");
    const { data, error } = await supabase
        .from('agents')
        .select('*')
        .order('last_run', { ascending: false });

    if (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">Error: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="loading">Waiting for agents to wake up...</div>`;
        return;
    }

    container.innerHTML = data.map(agent => {
        const lastRun = new Date(agent.last_run);
        const timeString = lastRun.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return `
            <div class="agent-item">
                <div>
                    <strong>${agent.agent_name}</strong>
                    <div style="font-size: 0.85rem; color: #94a3b8;">${agent.role}</div>
                </div>
                <div class="agent-time">Last ran: ${timeString}</div>
            </div>
        `;
    }).join("");
}

async function fetchRenderQueue() {
    const container = document.getElementById("render-container");
    if (!container) return;
    
    const { data, error } = await supabase
        .from('video_queue')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">Error: ${error.message}</div>`;
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = `<div class="loading">No videos in the render queue.</div>`;
        return;
    }

    container.innerHTML = data.map(item => {
        let statusColor = "#94a3b8";
        if (item.status === 'pending_approval') statusColor = "#eab308"; // yellow
        if (item.status === 'pending_render') statusColor = "#f97316";   // orange
        if (item.status === 'ready_to_post') statusColor = "#22c55e";    // green
        if (item.status === 'posted') statusColor = "#3b82f6";           // blue
        if (item.status === 'failed') statusColor = "#ef4444";           // red

        let videoElement = '';
        if (item.rendered_file_path && (item.status === 'ready_to_post' || item.status === 'posted')) {
            const { data: publicUrlData } = supabase.storage.from('rendered_shorts').getPublicUrl(item.rendered_file_path);
            const videoUrl = publicUrlData.publicUrl;
            videoElement = `
                <div style="margin-top: 10px;">
                    <video width="100%" height="200" controls style="border-radius: 8px; background: #000;">
                        <source src="${videoUrl}" type="video/mp4">
                        Your browser does not support the video tag.
                    </video>
                </div>
            `;
        } else if (item.status === 'pending_render') {
             videoElement = `
                <div style="margin-top: 10px; padding: 20px; background: rgba(249, 115, 22, 0.1); border-radius: 8px; text-align: center; border: 1px dashed #f97316;">
                    <span style="color: #f97316;">⚙️ Local Render Farm is cutting this video...</span>
                </div>
            `;
        }

        return `
        <div class="content-item" style="border-left: 3px solid ${statusColor}; margin-bottom: 0.75rem; padding-left: 1rem;">
            <span class="platform-tag" style="background: ${statusColor}22; color: ${statusColor}; font-weight: bold; border: 1px solid ${statusColor}55;">${item.status.replace('_', ' ').toUpperCase()}</span>
            <strong style="display: block; margin-top: 0.5rem; font-size: 1rem;">${item.title}</strong>
            <p style="margin: 0.25rem 0 0 0; color: #94a3b8;">${item.description || item.concept}</p>
            ${videoElement}
        </div>
        `;
    }).join("");
}

// Raw Footage Vault Logic
async function fetchRawFootage() {
    const container = document.getElementById("vault-container");
    if (!container) return;

    const { data, error } = await supabase
        .storage
        .from('raw_footage')
        .list('', {
            limit: 20,
            offset: 0,
            sortBy: { column: 'created_at', order: 'desc' }
        });

    if (error) {
        container.innerHTML = `<div class="loading" style="color: #ef4444;">Error: ${error.message}</div>`;
        return;
    }

    // Filter out the hidden placeholder file Supabase sometimes creates
    const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');

    if (files.length === 0) {
        container.innerHTML = `<div class="loading">No raw footage found. Upload a video above to start.</div>`;
        return;
    }

    container.innerHTML = files.map(file => {
        const sizeMB = (file.metadata?.size / (1024 * 1024)).toFixed(1);
        return `
        <div class="vault-item">
            <div class="vault-item-name">🎞️ ${file.name}</div>
            <div class="vault-item-size">${sizeMB} MB</div>
        </div>
        `;
    }).join("");
}

function setupUploadZone() {
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('raw-file-input');
    const uploadContent = document.getElementById('upload-content');
    const uploadProgress = document.getElementById('upload-progress');
    const percentText = document.getElementById('upload-percent');

    if (!uploadBtn || !fileInput) return;

    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            
            // Force the UI update synchronously
            uploadContent.style.display = 'none';
            uploadProgress.style.display = 'block';
            percentText.innerText = 'Starting upload for: ' + file.name + '...';
            
            // Start the upload asynchronously
            handleUpload(file);
        }
    });

    async function handleUpload(file) {
        // Basic extension validation instead of MIME type
        const fileNameOriginal = file.name.toLowerCase();
        if (!fileNameOriginal.endsWith('.mp4') && !fileNameOriginal.endsWith('.mov')) {
            alert('Warning: File might not be a video. Attempting upload anyway...');
        }

        // Clean filename: remove spaces, lowercase, add timestamp to avoid collisions
        const cleanName = file.name.replace(/\s+/g, '_').toLowerCase();
        const fileName = `${Date.now()}_${cleanName}`;

        try {
            const { data, error } = await supabase.storage
                .from('raw_footage')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) throw error;

            // Success
            percentText.innerText = 'Upload Complete! ✅';
            setTimeout(() => {
                uploadContent.style.display = 'block';
                uploadProgress.style.display = 'none';
                fetchRawFootage(); // Refresh the list
            }, 2000);

        } catch (error) {
            console.error('Upload error:', error);
            percentText.innerText = 'Upload Failed ❌';
            setTimeout(() => {
                uploadContent.style.display = 'block';
                uploadProgress.style.display = 'none';
            }, 3000);
            alert('Failed to upload video: ' + error.message);
        } finally {
            // Reset the file input so the same file can be selected again
            const fileInput = document.getElementById('raw-file-input');
            if (fileInput) fileInput.value = '';
        }
    }
}

// Chat Widget Logic
document.addEventListener("DOMContentLoaded", () => {
    const chatToggle = document.getElementById("chat-toggle-btn");
    const chatHeader = document.getElementById("chat-header");
    const chatWidget = document.getElementById("chat-widget");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send-btn");
    const chatMessages = document.getElementById("chat-messages");

    function toggleChat(e) {
        if (e) {
            // Prevent event bubbling if they click the button directly
            e.stopPropagation();
        }
        chatWidget.classList.toggle("collapsed");
        chatToggle.innerText = chatWidget.classList.contains("collapsed") ? "▲" : "▼";
    }

    chatHeader.addEventListener("click", toggleChat);
    chatToggle.addEventListener("click", toggleChat);

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        // Add User Message
        const userMsg = document.createElement("div");
        userMsg.className = "message user";
        userMsg.innerText = text;
        chatMessages.appendChild(userMsg);
        chatInput.value = "";
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // Loading state
        const loadingMsg = document.createElement("div");
        loadingMsg.className = "message system";
        loadingMsg.innerText = "Agent is thinking...";
        chatMessages.appendChild(loadingMsg);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const { data, error } = await supabase.functions.invoke("chat-agent", {
                body: { message: text }
            });

            chatMessages.removeChild(loadingMsg);

            if (error) throw error;

            const sysMsg = document.createElement("div");
            sysMsg.className = "message system";
            sysMsg.innerText = data.reply || "No response received.";
            chatMessages.appendChild(sysMsg);
        } catch (err) {
            chatMessages.removeChild(loadingMsg);
            const sysMsg = document.createElement("div");
            sysMsg.className = "message system";
            sysMsg.style.color = "#ef4444";
            sysMsg.innerText = "Error contacting Lead Agent.";
            chatMessages.appendChild(sysMsg);
        }
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatSend.addEventListener("click", sendMessage);
    chatInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") sendMessage();
    });

    // Start collapsed by default
    chatWidget.classList.add("collapsed");
    chatToggle.innerText = "▲";
});
