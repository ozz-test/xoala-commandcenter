// === XOALA COMMAND CENTER: ARTEMIS API LOGIC (Chat History & Resync Engine) ===

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
    const resyncBtn = document.getElementById('resync-btn');
    const resyncIcon = document.getElementById('resync-icon');
    const syncTimeBadge = document.getElementById('sync-time-badge');
    const newChatBtn = document.getElementById('new-chat-btn');
    const chatSessionsList = document.getElementById('chat-sessions-list');

    let attachedFileContent = null;
    let sessions = JSON.parse(localStorage.getItem('xoala_chat_sessions')) || [{ id: 'default', title: 'New Investigation', messages: [], pinned: false }];
    let currentSessionId = sessions[0].id;

    renderSessions();
    loadSession(currentSessionId);

    // --- Resync Data Lake Trigger ---
    resyncBtn.addEventListener('click', () => executeQuery("Resync the data lake and verify all tickets.", true));

    // --- New Chat Session ---
    newChatBtn.addEventListener('click', () => {
        const newSession = { id: 'session_' + Date.now(), title: 'New Investigation', messages: [], pinned: false };
        sessions.unshift(newSession);
        currentSessionId = newSession.id;
        saveSessions();
        renderSessions();
        loadSession(currentSessionId);
    });

    // --- Voice Input ---
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        micBtn.addEventListener('click', () => {
            recognition.start();
            micStatus.textContent = "Listening...";
            micBtn.classList.add('border-gold', 'text-gold');
        });
        recognition.onresult = (e) => {
            promptInput.value += (promptInput.value ? ' ' : '') + e.results[0][0].transcript;
            micStatus.textContent = "Voice";
            micBtn.classList.remove('border-gold', 'text-gold');
        };
        recognition.onend = () => { micStatus.textContent = "Voice"; micBtn.classList.remove('border-gold', 'text-gold'); };
    } else {
        micBtn.style.display = 'none';
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            fileNameLabel.textContent = file.name;
            const reader = new FileReader();
            reader.onload = (event) => { attachedFileContent = event.target.result; };
            reader.readAsText(file);
        }
    });

    promptInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); executeQuery(); }
    });
    sendBtn.addEventListener('click', () => executeQuery());

    async function executeQuery(customPrompt = null, isResync = false) {
        let prompt = customPrompt || promptInput.value.trim();
        if (!prompt && !attachedFileContent && !isResync) return;

        if (attachedFileContent) {
            prompt += `\n\n[Attached File Data Content]:\n${attachedFileContent}`;
        }

        const selectedModel = modelSelect.value;
        const session = sessions.find(s => s.id === currentSessionId);

        if (!isResync && session.messages.length === 0) {
            session.title = prompt.length > 25 ? prompt.substring(0, 25) + '...' : prompt;
        }

        session.messages.push({ role: "user", text: prompt, isHTML: false });
        appendMessage(prompt, 'user');

        promptInput.value = '';
        fileNameLabel.textContent = "Add File";
        attachedFileContent = null;
        fileInput.value = '';
        promptInput.disabled = true;
        sendBtn.disabled = true;

        if (isResync) resyncIcon.classList.add('animate-spin');

        const loadingId = 'loading-' + Date.now();
        appendLoading(loadingId);

        try {
            const historyPayload = session.messages.slice(-6).map(m => ({
                role: m.role === 'user' ? 'user' : 'model',
                parts: [{ text: m.text }]
            }));

            const response = await fetch(MIDDLEWARE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    prompt: prompt,
                    model: selectedModel,
                    forceRefresh: isResync,
                    history: historyPayload
                }) 
            });

            const data = await response.json();
            document.getElementById(loadingId).remove();
            if (isResync) resyncIcon.classList.remove('animate-spin');

            if (response.ok && data.status === 200) {
                const htmlResponse = marked.parse(data.response);
                session.messages.push({ role: "artemis", text: htmlResponse, isHTML: true });
                appendMessage(htmlResponse, 'artemis', true, selectedModel);
                
                if (data.lastSynced) {
                    syncTimeBadge.textContent = data.lastSynced;
                }
            } else {
                const errText = `System Error: ${data.error || 'Connection failed.'}`;
                session.messages.push({ role: "artemis", text: errText, isHTML: false });
                appendMessage(errText, 'artemis', false, selectedModel);
            }

            saveSessions();
            renderSessions();

        } catch (error) {
            document.getElementById(loadingId).remove();
            if (isResync) resyncIcon.classList.remove('animate-spin');
            appendMessage(`Network Integrity Failure: ${error.message}`, 'artemis');
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

        div.innerHTML = `
            ${avatar}
            <div class="${bubbleClass}">
                <div class="text-[10px] font-bold tracking-widest text-gold uppercase mb-2">${sender === 'artemis' ? 'Artemis Core' : 'Admin User'}</div>
                <div class="text-sm leading-relaxed text-gray-200">${isHTML ? content : escapeHTML(content)}</div>
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

    function renderSessions() {
        chatSessionsList.innerHTML = '';
        sessions.forEach(session => {
            const btn = document.createElement('div');
            btn.className = `group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${session.id === currentSessionId ? 'bg-gold/10 text-gold border border-gold/30' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;
            
            btn.innerHTML = `
                <div class="flex items-center space-x-2 truncate flex-1" onclick="switchSession('${session.id}')">
                    <i class="ph ${session.pinned ? 'ph-push-pin-simple text-gold' : 'ph-chat-circle'} text-sm"></i>
                    <span class="truncate">${session.title}</span>
                </div>
                <div class="hidden group-hover:flex items-center space-x-1 ml-2">
                    <i class="ph ph-push-pin hover:text-gold p-1" onclick="event.stopPropagation(); togglePin('${session.id}')" title="Pin"></i>
                    <i class="ph ph-trash hover:text-red-400 p-1" onclick="event.stopPropagation(); deleteSession('${session.id}')" title="Delete"></i>
                </div>
            `;
            chatSessionsList.appendChild(btn);
        });
    }

    window.switchSession = function(id) {
        currentSessionId = id;
        renderSessions();
        loadSession(id);
    };

    window.togglePin = function(id) {
        const s = sessions.find(x => x.id === id);
        if (s) { s.pinned = !s.pinned; saveSessions(); renderSessions(); }
    };

    window.deleteSession = function(id) {
        if (sessions.length <= 1) return;
        sessions = sessions.filter(x => x.id !== id);
        currentSessionId = sessions[0].id;
        saveSessions();
        renderSessions();
        loadSession(currentSessionId);
    };

    function loadSession(id) {
        chatBox.innerHTML = '';
        const session = sessions.find(s => s.id === id);
        if (session && session.messages.length > 0) {
            session.messages.forEach(m => {
                appendMessage(m.text, m.role === 'user' ? 'user' : 'artemis', m.isHTML);
            });
        } else {
            chatBox.innerHTML = `
                <div class="flex items-start max-w-4xl">
                    <div class="h-9 w-9 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center mr-4 mt-1 flex-shrink-0 shadow-md">
                        <i class="ph ph-sparkle text-gold text-lg"></i>
                    </div>
                    <div class="bg-surface/80 border border-white/5 p-6 rounded-2xl shadow-xl backdrop-blur-md">
                        <div class="text-[10px] font-bold tracking-widest text-gold uppercase mb-2">Artemis Core</div>
                        <div class="text-sm leading-relaxed text-gray-200">
                            New session initialized. Ready for compliance queries, data lake audits, or document reviews, master.
                        </div>
                    </div>
                </div>
            `;
        }
    }

    function saveSessions() {
        localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
    }
});
