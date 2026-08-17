// === XOALA COMMAND CENTER: ARTEMIS API LOGIC (Gemini Web App UX) ===

const MIDDLEWARE_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const fileInput = document.getElementById('file-input');
    const fileNameLabel = document.getElementById('file-name-label');
    
    const btnFlash = document.getElementById('model-flash');
    const btnPro = document.getElementById('model-pro');
    
    let selectedModel = 'flash'; // Default
    let attachedFileContent = null;

    // Model Selector Toggles
    btnFlash.addEventListener('click', () => {
        selectedModel = 'flash';
        btnFlash.className = "px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all bg-gold text-obsidian shadow";
        btnPro.className = "px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all text-gray-400 hover:text-white";
    });

    btnPro.addEventListener('click', () => {
        selectedModel = 'pro';
        btnPro.className = "px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all bg-gold text-obsidian shadow";
        btnFlash.className = "px-3 py-1.5 rounded text-xs font-bold tracking-wider uppercase transition-all text-gray-400 hover:text-white";
    });

    // File Attachment Reader
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameLabel.textContent = file.name;
            const reader = new FileReader();
            reader.onload = function(event) {
                attachedFileContent = event.target.result;
            };
            reader.readAsText(file);
        }
    });

    promptInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            executeQuery();
        }
    });

    sendBtn.addEventListener('click', executeQuery);

    async function executeQuery() {
        let prompt = promptInput.value.trim();
        if (!prompt && !attachedFileContent) return;

        if (attachedFileContent) {
            prompt += `\n\n[Attached File Data Content]:\n${attachedFileContent}`;
        }

        appendMessage(promptInput.value.trim() || "Uploaded file analysis request", 'user');
        
        promptInput.value = '';
        fileNameLabel.textContent = "Attach File";
        attachedFileContent = null;
        fileInput.value = '';
        
        promptInput.disabled = true;
        sendBtn.disabled = true;
        
        const loadingId = 'loading-' + Date.now();
        appendLoading(loadingId);

        try {
            const response = await fetch(MIDDLEWARE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: prompt,
                    model: selectedModel 
                }) 
            });

            const data = await response.json();
            document.getElementById(loadingId).remove();

            if (response.ok && data.status === 200) {
                appendMessage(marked.parse(data.response), 'artemis', true);
            } else {
                appendMessage(`System Error [Code ${data.status || response.status}]: ${data.error || data.response || 'Connection failed.'}`, 'artemis');
            }

        } catch (error) {
            document.getElementById(loadingId).remove();
            appendMessage(`Network Integrity Failure: ${error.message}.`, 'artemis');
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
            ? `<div class="text-[10px] font-bold tracking-widest text-gold uppercase mb-2">Artemis Core (${selectedModel.toUpperCase()})</div>`
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
                <i class="ph ph-sparkle text-gold text-lg animate-pulse"></i>
            </div>
            <div class="bg-surface/50 border border-white/5 p-5 rounded-r-xl rounded-bl-xl shadow-lg flex items-center space-x-3">
                <div class="text-xs font-mono text-gold tracking-widest uppercase">Artemis is thinking</div>
                <div class="py-1 px-2"><div class="dot-pulse"></div></div>
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
