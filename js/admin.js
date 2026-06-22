// Initialize Supabase Client
const SUPABASE_URL = "https://uxpdrchfucfyjwckjhuu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGRyY2hmdWNmeWp3Y2tqaHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYyMTEsImV4cCI6MjA5NzM1MjIxMX0.i_p_C_MFb86C5b1IAEWblrNz3hPW9QC7djpYsN0rl1s";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
    const { data, error } = await supabaseClient
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
    const { data, error } = await supabaseClient
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
    const { data, error } = await supabaseClient
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
    
    const { data, error } = await supabaseClient
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
            const { data: publicUrlData } = supabaseClient.storage.from('rendered_shorts').getPublicUrl(item.rendered_file_path);
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

    const { data, error } = await supabaseClient
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

    // Update metrics
    const metricTotal = document.getElementById("metric-total");
    const metricTime = document.getElementById("metric-time");
    const metricLastFile = document.getElementById("metric-lastfile");
    if (metricTotal) metricTotal.innerText = files.length;
    if (metricTime && files.length > 0) {
        metricTime.innerText = new Date(files[0].created_at).toLocaleString();
    }
    if (metricLastFile && files.length > 0) {
        metricLastFile.innerText = files[0].name;
    }

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
        console.log("Upload clicked");
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            console.log("Selected file:", file);
            
            // Hide previous cards
            const successCard = document.getElementById('upload-success-card');
            const errorCard = document.getElementById('upload-error-card');
            if(successCard) successCard.style.display = 'none';
            if(errorCard) errorCard.style.display = 'none';

            // Show progress container
            const progressContainer = document.getElementById('upload-progress-container');
            if(progressContainer) progressContainer.style.display = 'block';

            // Reset progress bar
            const percentText = document.getElementById('progress-percent');
            const fill = document.getElementById('progress-bar-fill');
            const btn = document.getElementById('upload-btn');
            if(percentText) percentText.innerText = '0%';
            if(fill) fill.style.width = '0%';
            if(btn) {
                btn.innerText = 'Uploading... 0%';
                btn.style.opacity = '0.7';
                btn.style.pointerEvents = 'none';
            }
            fileInput.disabled = true;

            console.log("Upload started");
            handleUpload(file);
        }
    });

    function handleUpload(file) {
        const startTime = Date.now();
        // Clean filename: remove spaces, lowercase, add timestamp to avoid collisions
        const cleanName = file.name.replace(/\s+/g, '_').toLowerCase();
        const fileName = `${Date.now()}_${cleanName}`;

        const successCard = document.getElementById('upload-success-card');
        const errorCard = document.getElementById('upload-error-card');
        const progressContainer = document.getElementById('upload-progress-container');
        const percentText = document.getElementById('progress-percent');
        const fill = document.getElementById('progress-bar-fill');
        const btn = document.getElementById('upload-btn');
        const fileInput = document.getElementById('raw-file-input');

        const resetUploadState = () => {
            if(btn) {
                btn.innerText = 'Upload Another File';
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            }
            if(progressContainer) progressContainer.style.display = 'none';
            if(fileInput) {
                fileInput.disabled = false;
                fileInput.value = '';
            }
        };

        const uploadUrl = `${SUPABASE_URL}/storage/v1/upload/resumable`;

        const upload = new tus.Upload(file, {
            endpoint: uploadUrl,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                apikey: SUPABASE_ANON_KEY,
                'x-upsert': 'false'
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
                bucketName: 'raw_footage',
                objectName: fileName,
                contentType: file.type || 'video/mp4',
                cacheControl: '3600'
            },
            chunkSize: 6 * 1024 * 1024, // 6MB chunks
            onError: function(error) {
                resetUploadState();
                console.error("UPLOAD CRASHED:", error);
                if(errorCard) {
                    errorCard.style.display = 'block';
                    document.getElementById('error-reason').innerText = error.message || "Network Error - check console.";
                }
            },
            onProgress: function(bytesUploaded, bytesTotal) {
                const percent = Math.round((bytesUploaded / bytesTotal) * 100);
                if(percentText) percentText.innerText = percent + '%';
                if(fill) fill.style.width = percent + '%';
                if(btn) btn.innerText = `Uploading... ${percent}%`;
                console.log("Progress:", percent + "%");
            },
            onSuccess: function() {
                resetUploadState();
                console.log("Upload completed");
                console.log("Upload response:", { url: upload.url });

                const { data: { publicUrl } } = supabaseClient.storage.from('raw_footage').getPublicUrl(fileName);
                console.log("File URL:", publicUrl);

                if(successCard) {
                    successCard.style.display = 'block';
                    document.getElementById('success-filename').innerText = file.name;
                    document.getElementById('success-size').innerText = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
                    document.getElementById('success-time').innerText = ((Date.now() - startTime) / 1000).toFixed(1) + ' seconds';
                    document.getElementById('success-url').href = publicUrl;
                }
                fetchRawFootage();
            }
        });

        // Check if there are any previous uploads to continue.
        upload.findPreviousUploads().then(function (previousUploads) {
            if (previousUploads.length) {
                upload.resumeFromPreviousUpload(previousUploads[0]);
            }
            upload.start();
        });
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
            const { data, error } = await supabaseClient.functions.invoke("chat-agent", {
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
