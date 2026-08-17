// === XOALA COMMAND CENTER: ARTEMIS API LOGIC ===

// BUG FIX: Ensure absolutely NO trailing slash (/) at the end of this URL
const MIDDLEWARE_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');

    promptInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') executeQuery();
    });

    sendBtn.addEventListener('click', executeQuery);

    async function executeQuery() {
        const prompt = promptInput.value.trim();
        if (!prompt) return;

        // 1. Display User Message
        appendMessage(prompt, 'user');
        promptInput.value = '';
        promptInput.disabled = true;
        sendBtn.disabled = true;
        
        // 2. Create Loading Indicator
        const loadingId = 'loading-' + Date.now();
        appendLoading(loadingId);

        try {
            console.log("Transmitting payload to Cloudflare Edge...");
            
            // 3. Fire payload to the Middleware Worker
            const response = await fetch(MIDDLEWARE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: prompt }) 
            });

            const data = await response.json();
            console.log("Edge Response Received:", data);

            document.getElementById(loadingId).remove();

            // 4. Render Markdown Response
            if (response.ok && data.status === 200) {
                appendMessage(marked.parse(data.response), 'artemis', true);
            } else {
                appendMessage(`System Error [Code ${data.status || response.status}]: ${data.error || data.response || 'Connection failed.'}`, 'artemis');
            }

        } catch (error) {
            console.error("Fetch Exception:", error);
            document.getElementById(loadingId).remove();
            appendMessage(`Network Integrity Failure: ${error.message}. Check browser console (F12) for exact routing details.`, 'artemis');
        }

        promptInput.disabled = false;
        sendBtn.disabled = false;
        promptInput.focus();
    }

    function appendMessage(content, sender, isHTML = false) {
        const div = document.createElement('div');
        div.className = 'flex items-start max-w-3xl ' + (sender === 'user' ? 'ml-auto flex-row-reverse' : '');
        
        const avatar = sender === 'artemis' 
            ? `<div class="h-8 w-8 rounded bg-gold/10 border border-gold/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0"><i class="ph ph-sparkle text-gold text-lg"></i></div>`
            : `<div class="h-8 w-8 rounded bg-panel border border-white/10 flex items-center justify-center ml-4 mt-1 flex-shrink-0"><i class="ph ph-user text-gray-400 text-lg"></i></div>`;

        const bubbleClass = sender === 'artemis'
            ? 'bg-surface/50 border border-white/5 p-5 rounded-r-xl rounded-bl-xl shadow-lg markdown-body'
            : 'bg-panel border border-white/10 p-5 rounded-l-xl rounded-br-xl shadow-lg';

        const nameLabel = sender === 'artemis'
            ? `<div class="text-[10px] font-bold tracking-widest text-gold uppercase mb-2">Artemis Core</div>`
            : `<div class="text-[10px] font-bold tracking-widest text-gray-500 uppercase mb-2 text-right">Admin User</div>`;

        div.innerHTML = `
            ${avatar}
            <div class="${bubbleClass}">
                ${nameLabel}
                <div class="text-sm leading-relaxed text-gray-200">
                    ${isHTML ? content : escapeHTML(content)}
                </div>
            </div>
        `;
        
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function appendLoading(id) {
        const div = document.createElement('div');
        div.id = id;
        div.className = 'flex items-start max-w-3xl';
        div.innerHTML = `
            <div class="h-8 w-8 rounded bg-gold/10 border border-gold/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                <i class="ph ph-circle-notch text-gold text-lg animate-spin"></i>
            </div>
            <div class="bg-transparent p-5">
                <div class="text-xs font-mono italic text-gold/70 animate-pulse">Calculating telemetry...</div>
            </div>
        `;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                "'": '&#39;',
                '"': '&quot;'
            }[tag] || tag)
        );
    }
});
