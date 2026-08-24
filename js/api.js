// === XOALA COMMAND CENTER: ARTEMIS AI CORE ENGINE ===

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');
    const emptyState = document.getElementById('artemis-empty-state');
    const commandPalette = document.getElementById('command-palette');
    const artifactPane = document.getElementById('artemis-artifact-pane');
    const closeArtifactBtn = document.getElementById('close-artifact-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionsList = document.getElementById('chat-sessions-list');

    let currentSessionId = Date.now().toString();
    let sessions = JSON.parse(localStorage.getItem('xoala_chat_sessions') || '{}');

    // FIX: Micro-Hologram Koala Avatar (Anatomically matches the big center Koala)
    const getKoalaAvatar = (isThinking = false) => `
        <div class="w-8 h-8 rounded-full border border-gold flex items-center justify-center bg-black flex-shrink-0 ${isThinking ? 'koala-thinking shadow-[0_0_12px_rgba(221,170,51,0.4)]' : 'shadow-[0_0_8px_rgba(16,185,129,0.3)]'}">
            <svg width="20" height="20" viewBox="0 0 100 100" fill="none">
                <!-- Ears -->
                <circle cx="22" cy="38" r="16" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="4" fill="#000"/>
                <circle cx="78" cy="38" r="16" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="4" fill="#000"/>
                <!-- Head -->
                <ellipse cx="50" cy="55" rx="34" ry="28" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="4" fill="#000"/>
                <!-- Nose -->
                <ellipse cx="50" cy="59" rx="7" ry="10" fill="${isThinking ? '#DDAA33' : '#10b981'}"/>
                <!-- Eyes -->
                <circle cx="36" cy="50" r="4" fill="${isThinking ? '#DDAA33' : '#10b981'}"/>
                <circle cx="64" cy="50" r="4" fill="${isThinking ? '#DDAA33' : '#10b981'}"/>
            </svg>
        </div>
    `;

    if (promptInput) {
        promptInput.addEventListener('input', (e) => {
            if (e.target.value === '/') {
                commandPalette.classList.remove('hidden'); commandPalette.classList.add('flex');
            } else if (!e.target.value.startsWith('/')) {
                commandPalette.classList.add('hidden'); commandPalette.classList.remove('flex');
            }
        });
    }

    document.querySelectorAll('.command-item, .quick-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const prompt = e.currentTarget.getAttribute('data-prompt');
            promptInput.value = prompt;
            commandPalette.classList.add('hidden'); commandPalette.classList.remove('flex');
            promptInput.focus();
        });
    });

    const openArtifactCanvas = (htmlContent) => {
        document.getElementById('artifact-content').innerHTML = htmlContent;
        artifactPane.style.width = '50%';
        artifactPane.classList.remove('opacity-0');
        artifactPane.classList.add('artifact-slide-in');
    };

    if (closeArtifactBtn) {
        closeArtifactBtn.addEventListener('click', () => {
            artifactPane.style.width = '0px';
            artifactPane.classList.add('opacity-0');
            artifactPane.classList.remove('artifact-slide-in');
        });
    }

    const renderSessions = () => {
        if (!sessionsList) return;
        sessionsList.innerHTML = Object.keys(sessions).map(id => `
            <div class="session-item px-3 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer truncate transition-colors flex items-center justify-between ${id === currentSessionId ? 'bg-white/10 text-gold' : ''}" data-id="${id}">
                <span class="truncate max-w-[170px]">${sessions[id].title || 'Investigation'}</span>
                <i class="ph ph-trash hover:text-red-400 p-1 delete-session-btn" data-id="${id}"></i>
            </div>
        `).join('');

        sessionsList.querySelectorAll('.session-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.classList.contains('delete-session-btn')) {
                    delete sessions[e.target.getAttribute('data-id')];
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
                    renderSessions();
                    return;
                }
                loadSession(el.getAttribute('data-id'));
            });
        });
    };

    const loadSession = (id) => {
        currentSessionId = id;
        chatBox.innerHTML = '';
        const session = sessions[id];
        if (!session || session.history.length === 0) {
            chatBox.appendChild(emptyState);
            emptyState.classList.remove('hidden');
            renderSessions();
            return;
        }

        emptyState.classList.add('hidden');
        session.history.forEach(msg => {
            if (msg.role === 'user') {
                const u = document.createElement('div');
                u.className = "self-end bg-surface/50 border border-white/10 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm text-gray-300 shadow-md mt-4";
                u.innerHTML = `<div class="text-[10px] font-mono text-gold mb-2 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${msg.parts[0].text}`;
                chatBox.appendChild(u);
            } else {
                const a = document.createElement('div');
                a.className = "self-start bg-transparent p-4 w-full flex items-start space-x-4 mt-2";
                a.innerHTML = `
                    ${getKoalaAvatar(false)}
                    <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)]">
                        <div class="prose prose-invert prose-sm max-w-none leading-relaxed">${marked.parse(msg.parts[0].text)}</div>
                    </div>
                `;
                chatBox.appendChild(a);
            }
        });
        chatBox.scrollTop = chatBox.scrollHeight;
        renderSessions();
    };

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            currentSessionId = Date.now().toString();
            sessions[currentSessionId] = { title: "New Query", history: [] };
            localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
            loadSession(currentSessionId);
            if (closeArtifactBtn) closeArtifactBtn.click();
        });
    }

    if (sendBtn && promptInput) {
        sendBtn.addEventListener('click', async () => {
            const val = promptInput.value.trim();
            if (!val) return;

            if (emptyState) emptyState.classList.add('hidden');

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", history: [] };
            }

            const userMsg = document.createElement('div');
            userMsg.className = "self-end bg-surface/50 border border-white/10 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm text-gray-300 shadow-md mt-4";
            userMsg.innerHTML = `<div class="text-[10px] font-mono text-gold mb-2 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${val}`;
            chatBox.appendChild(userMsg);
            
            promptInput.value = '';
            chatBox.scrollTop = chatBox.scrollHeight;

            const aiMsg = document.createElement('div');
            aiMsg.className = "self-start bg-transparent p-4 w-full flex items-start space-x-4 mt-2";
            const reqStartTime = Date.now();
            aiMsg.innerHTML = `
                ${getKoalaAvatar(true)}
                <div class="text-sm text-gray-400 font-mono pt-2 tracking-widest uppercase animate-pulse">Connecting to Data Lake...</div>
            `;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;

            try {
                const historyPayload = sessions[currentSessionId].history;
                const response = await fetch(ARTEMIS_API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: val, history: historyPayload, secret: 'system_dashboard_init',
                        model: document.getElementById('model-select').value || 'gemini-3.5-flash-lite'
                    })
                });

                const data = await response.json();
                const latency = Date.now() - reqStartTime;

                if (data.status === 200 && data.response) {
                    let aiText = data.response;

                    sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
                    sessions[currentSessionId].history.push({role: "model", parts: [{text: aiText}]});
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));

                    const jsonBlockRegex = /\`\`\`json\s*([\s\S]*?)\s*\`\`\`/;
                    const match = aiText.match(jsonBlockRegex);
                    let artifactHtml = null;

                    if (match && match[1]) {
                        try {
                            const parsedData = JSON.parse(match[1]);
                            if (parsedData.type === 'interactive_table') {
                                artifactHtml = `
                                    <h2 class="text-xl text-white font-light mb-6 tracking-tight">${parsedData.title || 'Data Grid'}</h2>
                                    <div class="overflow-x-auto glass-card rounded-xl border border-white/5 shadow-2xl">
                                        <table class="w-full text-left border-collapse whitespace-nowrap">
                                            <thead>
                                                <tr class="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-500 font-mono">
                                                    ${parsedData.columns.map(c => `<th class="py-3 px-4 font-semibold">${c}</th>`).join('')}
                                                </tr>
                                            </thead>
                                            <tbody class="text-sm font-sans divide-y divide-white/5 text-gray-200">
                                                ${parsedData.rows.map(r => `
                                                    <tr class="hover:bg-white/5 transition-colors">
                                                        ${r.map((v, idx) => `<td class="py-3 px-4 ${idx===0 ? 'text-emerald-400 font-medium' : 'text-right font-mono text-gray-400'}">${v}</td>`).join('')}
                                                    </tr>
                                                `).join('')}
                                            </tbody>
                                        </table>
                                    </div>
                                `;
                            }
                            aiText = aiText.replace(jsonBlockRegex, '').trim();
                        } catch (e) { console.error("GenUI Parse error", e); }
                    }

                    const formattedText = marked.parse(aiText);

                    aiMsg.innerHTML = `
                        ${getKoalaAvatar(false)}
                        <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)]">
                            <div class="text-[9px] font-mono text-emerald-400 mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>Execution Complete (${latency}ms)</span></div>
                                <div class="text-gray-500">${document.getElementById('model-select').value.replace('gemini-','').toUpperCase()}</div>
                            </div>
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-3 mt-3">
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1" onclick="navigator.clipboard.writeText(this.closest('.bg-surface\\/80').innerText)"><i class="ph ph-copy"></i><span>Copy Response</span></button>
                                ${artifactHtml ? `<button class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded" onclick="document.getElementById('artemis-artifact-pane').style.width='50%'; document.getElementById('artemis-artifact-pane').classList.remove('opacity-0'); document.getElementById('artemis-artifact-pane').classList.add('artifact-slide-in');"><i class="ph ph-layout"></i><span>Open Canvas</span></button>` : ''}
                            </div>
                        </div>
                    `;

                    if (artifactHtml) openArtifactCanvas(artifactHtml);
                    renderSessions();

                } else {
                    aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded">API Error: ${data.error || "Execution failed."}</div>`;
                }
            } catch (err) {
                aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded">Network Error: Unable to reach Artemis core.</div>`;
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        });

        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
    }

    renderSessions();
});
