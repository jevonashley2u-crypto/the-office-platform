// Initialize Supabase Client
const SUPABASE_URL = "https://uxpdrchfucfyjwckjhuu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGRyY2hmdWNmeWp3Y2tqaHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYyMTEsImV4cCI6MjA5NzM1MjIxMX0.i_p_C_MFb86C5b1IAEWblrNz3hPW9QC7djpYsN0rl1s";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener("DOMContentLoaded", () => {
    fetchInsights();
    fetchContentCalendar();
    fetchRenderQueue();
    fetchAgents();
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

        return `
        <div class="content-item" style="border-left: 3px solid ${statusColor}; margin-bottom: 0.75rem; padding-left: 1rem;">
            <span class="platform-tag" style="background: ${statusColor}22; color: ${statusColor}; font-weight: bold; border: 1px solid ${statusColor}55;">${item.status.replace('_', ' ').toUpperCase()}</span>
            <strong style="display: block; margin-top: 0.5rem; font-size: 1rem;">${item.title}</strong>
            <p style="margin: 0.25rem 0 0 0; color: #94a3b8;">${item.description || item.concept}</p>
        </div>
        `;
    }).join("");
}

// Chat Widget Logic
document.addEventListener("DOMContentLoaded", () => {
    const chatToggle = document.getElementById("chat-toggle-btn");
    const chatHeader = document.getElementById("chat-header");
    const chatWidget = document.getElementById("chat-widget");
    const chatInput = document.getElementById("chat-input");
    const chatSend = document.getElementById("chat-send-btn");
    const chatMessages = document.getElementById("chat-messages");

    function toggleChat() {
        chatWidget.classList.toggle("collapsed");
        chatToggle.innerText = chatWidget.classList.contains("collapsed") ? "▲" : "▼";
    }

    chatHeader.addEventListener("click", toggleChat);

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
