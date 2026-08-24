// === XOALA COMMAND CENTER: ARTEMIS AI CORE ENGINE & SESSION MANAGER ===

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
    const pinnedList = document.getElementById('pinned-sessions-list');
    const pinnedHeader = document.getElementById('pinned-header');
    const exportCanvasBtn = document.getElementById('export-canvas-csv-btn');

    let currentSessionId = Date.now().toString();
    let sessions = JSON.parse(localStorage.getItem('xoala_chat_sessions') || '{}');
    let activeCanvasData = null;

    // Mini Hologram Koala Avatar for message stream
    const getKoalaAvatar = (isThinking = false) => `
        <div class="w-8 h-8 rounded-full border ${isThinking ? 'border-gold shadow-[0_0_15px_rgba(221,170,51,0.6)]' : 'border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]'} flex items-center justify-center bg-black flex-shrink-0 overflow-hidden relative">
            <div class="${isThinking ? 'liquid-gradient-layer liquid-gradient-thinking opacity-90' : 'liquid-gradient-layer opacity-40'} absolute -inset-full"></div>
            <svg class="relative z-10 w-5 h-5" viewBox="0 0 100 100" fill="none">
                <circle cx="24" cy="38" r="16" fill="#000" stroke="#fff" stroke-width="4"/>
                <circle cx="76" cy="38" r="16" fill="#000" stroke="#fff" stroke-width="4"/>
                <ellipse cx="50" cy="56" rx="32" ry="26" fill="#000" stroke="#fff" stroke-width="4"/>
                <ellipse cx="50" cy="58" rx="8" ry="10" fill="#10b981"/>
                <circle cx="34" cy="48" r="3" fill="#ffffff"/>
                <circle cx="66" cy="48" r="3" fill="#ffffff"/>
            </svg>
        </div>
    `;

    // Trigger Liquid Hero animation pulse
    const setLiquidHeroProcessing = (isProcessing) => {
        const mesh = document.getElementById('koala-liquid-mesh');
        const glow = document.getElementById('koala-ambient-glow');
        if (mesh) {
            if (isProcessing) mesh.classList.add('liquid-gradient-thinking');
            else mesh.classList.remove('liquid-gradient-thinking');
        }
        if (glow) {
            if (isProcessing) {
                glow.classList.replace('bg-emerald-500/10', 'bg-gold/30');
                glow.classList.add('scale-125');
            } else {
                glow.classList.replace('bg-gold/30', 'bg-emerald-500/10');
                glow.classList.remove('scale-125');
            }
        }
    };

    // Slash Commands Palette
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

    // Artifact Canvas Mechanics
    const openArtifactCanvas = (parsedData) => {
        activeCanvasData = parsedData;
        const htmlContent = `
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-xl text-white font-light tracking-tight">${parsedData.title || 'Data Grid'}</h2>
                <span class="text-[10px] font-mono bg-white/5 border border-white/10 px-2 py-0.5 rounded text-gray-400">${parsedData.rows.length} Rows Computed</span>
            </div>
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
            activeCanvasData = null;
        });
    }

    if (exportCanvasBtn) {
        exportCanvasBtn.addEventListener('click', () => {
            if (!activeCanvasData) return;
            let csv = "data:text/csv;charset=utf-8," + activeCanvasData.columns.join(",") + "\n";
            activeCanvasData.rows.forEach(r => { csv += r.map(c => `"${c}"`).join(",") + "\n"; });
            const link = document.createElement("a");
            link.setAttribute("href", encodeURI(csv));
            link.setAttribute("download", `${activeCanvasData.title || 'Artemis_Report'}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // --- REFINED SESSION MANAGEMENT (Pin, Rename, Delete) ---
    const renderSessions = () => {
        if (!sessionsList || !pinnedList) return;
        const keys = Object.keys(sessions);
        const pinnedKeys = keys.filter(k => sessions[k].pinned);
        const recentKeys = keys.filter(k => !sessions[k].pinned).reverse();

        if (pinnedKeys.length > 0) pinnedHeader.classList.remove('hidden');
        else pinnedHeader.classList.add('hidden');

        const createSessionItem = (id) => {
            const s = sessions[id];
            const isSelected = (id === currentSessionId);
            return `
                <div class="session-item group px-2.5 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-white/10 text-gold font-bold' : ''}" data-id="${id}">
                    <span class="truncate max-w-[125px] session-title-text" title="${s.title}">${s.title}</span>
                    <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="pin-btn p-1 hover:text-gold transition-colors" title="${s.pinned ? 'Unpin' : 'Pin'}" data-id="${id}">
                            <i class="ph ${s.pinned ? 'ph-push-pin text-gold' : 'ph-push-pin'}"></i>
                        </button>
                        <button class="rename-btn p-1 hover:text-gold transition-colors" title="Rename" data-id="${id}">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="delete-btn p-1 hover:text-red-400 transition-colors" title="Delete" data-id="${id}">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        };

        pinnedList.innerHTML = pinnedKeys.map(k => createSessionItem(k)).join('');
        sessionsList.innerHTML = recentKeys.map(k => createSessionItem(k)).join('');

        // Bind Session Actions
        document.querySelectorAll('.session-item').forEach(el => {
            const id = el.getAttribute('data-id');
            el.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                loadSession(id);
            });

            const pinBtn = el.querySelector('.pin-btn');
            if (pinBtn) {
                pinBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    sessions[id].pinned = !sessions[id].pinned;
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
                    renderSessions();
                });
            }

            const renameBtn = el.querySelector('.rename-btn');
            if (renameBtn) {
                renameBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const newTitle = prompt('Enter new session title:', sessions[id].title);
                    if (newTitle && newTitle.trim()) {
                        sessions[id].title = newTitle.trim();
                        localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
                        renderSessions();
                    }
                });
            }

            const deleteBtn = el.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    delete sessions[id];
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
                    if (currentSessionId === id) {
                        currentSessionId = Date.now().toString();
                        sessions[currentSessionId] = { title: "New Query", pinned: false, history: [] };
                    }
                    loadSession(currentSessionId);
                });
            }
        });
    };

    const loadSession = (id) => {
        currentSessionId = id;
        chatBox.innerHTML = '';
        chatBox.appendChild(emptyState);

        const session = sessions[id];
        if (!session || session.history.length === 0) {
            emptyState.classList.remove('opacity-0');
            renderSessions();
            return;
        }

        emptyState.classList.add('opacity-0');
        session.history.forEach(msg => {
            if (msg.role === 'user') {
                const u = document.createElement('div');
                u.className = "self-end bg-surface/50 border border-white/10 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm text-gray-300 shadow-md mt-4 relative z-10";
                u.innerHTML = `<div class="text-[10px] font-mono text-gold mb-2 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${msg.parts[0].text}`;
                chatBox.appendChild(u);
            } else {
                const a = document.createElement('div');
                a.className = "self-start bg-transparent p-4 w-full flex items-start space-x-4 mt-2 relative z-10";
                a.innerHTML = `
                    ${getKoalaAvatar(false)}
                    <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
                        <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${marked.parse(msg.parts[0].text)}</div>
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
            sessions[currentSessionId] = { title: "New Query", pinned: false, history: [] };
            localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
            loadSession(currentSessionId);
            if (closeArtifactBtn) closeArtifactBtn.click();
        });
    }

    if (sendBtn && promptInput) {
        sendBtn.addEventListener('click', async () => {
            const val = promptInput.value.trim();
            if (!val) return;

            if (emptyState) emptyState.classList.add('opacity-0');

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", pinned: false, history: [] };
            } else if (sessions[currentSessionId].history.length === 0) {
                sessions[currentSessionId].title = val.substring(0, 24) + "...";
            }

            const userMsg = document.createElement('div');
            userMsg.className = "self-end bg-surface/50 border border-white/10 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm text-gray-300 shadow-md mt-4 relative z-10";
            userMsg.innerHTML = `<div class="text-[10px] font-mono text-gold mb-2 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${val}`;
            chatBox.appendChild(userMsg);
            
            promptInput.value = '';
            chatBox.scrollTop = chatBox.scrollHeight;

            const aiMsg = document.createElement('div');
            aiMsg.className = "self-start bg-transparent p-4 w-full flex items-start space-x-4 mt-2 relative z-10";
            const reqStartTime = Date.now();
            aiMsg.innerHTML = `
                ${getKoalaAvatar(true)}
                <div class="text-sm text-gray-400 font-mono pt-2 tracking-widest uppercase animate-pulse">Computing Data Lake nodes...</div>
            `;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;

            setLiquidHeroProcessing(true);

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
                setLiquidHeroProcessing(false);

                if (data.status === 200 && data.response) {
                    let aiText = data.response;

                    sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
                    sessions[currentSessionId].history.push({role: "model", parts: [{text: aiText}]});
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));

                    const jsonBlockRegex = /\`\`\`json\s*([\s\S]*?)\s*\`\`\`/;
                    const match = aiText.match(jsonBlockRegex);
                    let parsedGenUI = null;

                    if (match && match[1]) {
                        try {
                            parsedGenUI = JSON.parse(match[1]);
                            aiText = aiText.replace(jsonBlockRegex, '').trim();
                        } catch (e) { console.error("GenUI Parse error", e); }
                    }

                    const formattedText = marked.parse(aiText);

                    aiMsg.innerHTML = `
                        ${getKoalaAvatar(false)}
                        <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
                            <div class="text-[9px] font-mono text-emerald-400 mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>Execution Complete (${latency}ms)</span></div>
                                <div class="text-gray-500">${document.getElementById('model-select').value.replace('gemini-','').toUpperCase()}</div>
                            </div>
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-3 mt-3">
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 copy-resp-btn"><i class="ph ph-copy"></i><span>Copy Response</span></button>
                                ${parsedGenUI ? `<button class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded open-canvas-btn"><i class="ph ph-layout"></i><span>Open Canvas Grid</span></button>` : ''}
                            </div>
                        </div>
                    `;

                    aiMsg.querySelector('.copy-resp-btn').addEventListener('click', () => {
                        navigator.clipboard.writeText(aiText);
                    });

                    if (parsedGenUI) {
                        aiMsg.querySelector('.open-canvas-btn').addEventListener('click', () => {
                            openArtifactCanvas(parsedGenUI);
                        });
                        openArtifactCanvas(parsedGenUI);
                    }
                    renderSessions();

                } else {
                    aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded relative z-10">API Error: ${data.error || "Execution failed."}</div>`;
                }
            } catch (err) {
                setLiquidHeroProcessing(false);
                aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded relative z-10">Network Error: Unable to reach Artemis core.</div>`;
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
