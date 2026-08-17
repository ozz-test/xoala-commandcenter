// === XOALA COMMAND CENTER: ARTEMIS API LOGIC (Gemini Web App UX) ===

const MIDDLEWARE_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev'; 

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const fileInput = document.getElementById('file-input');
    const fileNameLabel = document.getElementById('file-name-label');
    const modelSelect = document.getElementById('model-select');
    const micBtn = document.getElementById('mic-btn');
    const micStatus = document.getElementById('mic-status');
    const genImageBtn = document.getElementById('gen-image-btn');

    let attachedFileContent = null;
    let chatHistory = []; // Memory Management for Artemis

    // Image Generation shortcut
    genImageBtn.addEventListener('click', () => {
        promptInput.value = "Generate an executive visual analytics chart showing Cyprus vs UK ticket growth trends: ";
        promptInput.focus();
    });

    // Voice Input (Web Speech API)
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        micBtn.addEventListener('click', () => {
            try {
                recognition.start();
                micStatus.textContent = "Listening...";
                micBtn.classList.add('border-gold', 'text-gold');
            } catch (e) {
                console.error(e);
            }
        });

        recognition.onresult = (event) => {
            const speechToText = event.results[0][0].transcript;
            promptInput.value += (promptInput.value ? ' ' : '') + speechToText;
            micStatus.textContent = "Voice";
            micBtn.classList.remove('border-gold', 'text-gold');
        };

        recognition.onerror = () => {
            micStatus.textContent = "Voice";
            micBtn.classList.remove('border-gold', 'text-gold');
        };

        recognition.onend = () => {
            micStatus.textContent = "Voice";
            micBtn.classList.remove('border-gold', 'text-gold');
        };
    } else {
        micBtn.style.display = 'none'; // Hide if browser unsupported
    }

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

        const selectedModel = modelSelect.value;

        // Append to memory history
        chatHistory.push({ role: "user", parts: [{ text: prompt }] });

        appendMessage(promptInput.value.trim() || "Uploaded file analysis request", 'user');
        
        promptInput.value = '';
        fileNameLabel.textContent = "Add File";
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
                    model: selectedModel,
                    history: chatHistory.slice(-6) // Send last 3 turns for context memory
                }) 
            });

            const data = await response.json();
            document.getElementById(loadingId).remove();

            if (response.ok && data.status === 200) {
                chatHistory.push({ role: "model", parts: [{ text: data.response }] });
                appendMessage(marked.parse(data.response), 'artemis', true, selectedModel);
            } else {
                appendMessage(`System Error [Code ${data.status || response.status}]: ${data.error || data.response || 'Connection failed.'}`, 'artemis', false, selectedModel);
            }

        } catch (error) {
            document.getElementById(loadingId).remove();
            appendMessage(`Network Integrity Failure: ${error.message}.`, 'artemis', false, selectedModel);
        }

        promptInput.disabled = false;
        sendBtn.disabled = false;
        promptInput.focus();
    }

    function appendMessage(content, sender, isHTML = false, model = '') {
        const div = document.createElement('div');
        div.className = 'flex items-start max-w-4xl ' + (sender === 'user' ? 'ml-auto flex-row-reverse' : '');
        
        const avatar = sender === 'artemis' 
            ? `<div class="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0 shadow-md"><i class="ph ph-sparkle text-gold text-lg"></i></div>`
            : `<div class="h-9 w-9 rounded-xl bg-panel border border-white/10 flex items-center justify-center ml-4 mt-1 flex-shrink-0 shadow-md"><i class="ph ph-user text-gray-400 text-lg"></i></div>`;

        const bubbleClass = sender === 'artemis'
            ? 'bg-surface/80 border border-white/5 p-6 rounded-2xl shadow-xl backdrop-blur-md markdown-body w-full'
            : 'bg-panel border border-white/10 p-6 rounded-2xl shadow-xl w-full';

        const modelTag = model ? ` (${model.replace('-preview', '').toUpperCase()})` : '';
        const nameLabel = sender === 'artemis'
            ? `<div class="text-[10px] font-bold tracking-widest text-gold uppercase mb-2">Artemis Core${modelTag}</div>`
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
        div.className = 'flex items-start max-w-4xl';
        div.innerHTML = `
            <div class="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0 shadow-md">
                <i class="ph ph-sparkle text-gold text-lg animate-pulse"></i>
            </div>
            <div class="bg-surface/80 border border-white/5 p-6 rounded-2xl shadow-xl backdrop-blur-md flex items-center space-x-3">
                <div class="text-xs font-mono text-gold tracking-widest uppercase">Artemis is analyzing HubSpot Data Lake</div>
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
