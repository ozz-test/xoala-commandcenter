// === XOALA COMMAND CENTER: ARTEMIS AI CORE ENGINE & SESSION MANAGER ===

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

// ==========================================
// 1. ARTEMIS VOICE TRANSMISSION SYNTHESIZER
// ==========================================
class ArtemisVoice {
    constructor() {
        this.synth = window.speechSynthesis;
        this.autoSpeak = localStorage.getItem('artemis_voice_enabled') !== 'false';
        this.currentUtterance = null;
        this.voice = null;
        this.initVoice();
    }

    initVoice() {
        if (!this.synth) return;
        const loadVoices = () => {
            const voices = this.synth.getVoices();
            this.voice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha') || v.name.includes('Victoria')) 
                      || voices.find(v => v.lang.startsWith('en-GB'))
                      || voices.find(v => v.lang.startsWith('en-US'))
                      || voices[0];
        };
        loadVoices();
        if (this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = loadVoices;
        }
    }

    cleanSpeechText(rawMarkdown) {
        return rawMarkdown
            .replace(/```json[\s\S]*?```/g, '') 
            .replace(/```[\s\S]*?```/g, '')     
            .replace(/\[.*?\]\(.*?\)/g, '')     
            .replace(/[*_~`#>]/g, '')           
            .replace(/\|\s*[-:]+\s*\|/g, '')    
            .replace(/\|/g, ', ')               
            .trim();
    }

    speak(text, onStartCallback, onEndCallback) {
        if (!this.synth) return;
        this.stop();

        const cleanText = this.cleanSpeechText(text);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (this.voice) utterance.voice = this.voice;
        utterance.rate = 1.05;  
        utterance.pitch = 1.0; 

        utterance.onstart = () => { if (onStartCallback) onStartCallback(); };
        utterance.onend = () => { if (onEndCallback) onEndCallback(); };
        utterance.onerror = () => { if (onEndCallback) onEndCallback(); };

        this.currentUtterance = utterance;
        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth && this.synth.speaking) {
            this.synth.cancel();
        }
    }
}

// ==========================================
// 2. UI, EVENT HANDLERS & SESSION LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const artemisVoice = new ArtemisVoice();

    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const chatStream = document.getElementById('chat-stream'); 
    const hologramContainer = document.getElementById('artemis-empty-state');
    const commandPalette = document.getElementById('command-palette');
    const artifactPane = document.getElementById('artemis-artifact-pane');
    const closeArtifactBtn = document.getElementById('close-artifact-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionsList = document.getElementById('chat-sessions-list');
    const pinnedList = document.getElementById('pinned-sessions-list');
    const pinnedHeader = document.getElementById('pinned-header');
    const exportCanvasBtn = document.getElementById('export-canvas-csv-btn');
    const voiceAutoToggleBtn = document.getElementById('voice-auto-toggle-btn');
    const voiceAutoIcon = document.getElementById('voice-auto-icon');
    const voiceAutoStatus = document.getElementById('voice-auto-status');
    const crystalCore = document.getElementById('crystal-core');

    let currentSessionId = Date.now().toString();
    let sessions = {};

    // 1. Safe LocalStorage Hydration (Prevents length/null errors)
    try {
        const raw = localStorage.getItem('xoala_chat_sessions');
        if (raw) {
            const parsed = JSON.parse(raw);
            for (const key in parsed) {
                if (parsed[key] && typeof parsed[key] === 'object') {
                    sessions[key] = {
                        title: parsed[key].title || "Investigation",
                        pinned: !!parsed[key].pinned,
                        history: Array.isArray(parsed[key].history) ? parsed[key].history : []
                    };
                }
            }
        }
    } catch (e) {
        sessions = {};
    }

    let activeCanvasData = null;
    let canvasChartInstance = null;

    // Synchronize Voice UI
    const updateVoiceToggleUI = () => {
        if (!voiceAutoIcon || !voiceAutoStatus) return;
        if (artemisVoice.autoSpeak) {
            voiceAutoIcon.className = "ph ph-speaker-high text-sm text-gold";
            voiceAutoStatus.textContent = "Voice: ON";
            voiceAutoStatus.className = "text-[10px] uppercase tracking-wider font-bold text-gray-200";
        } else {
            voiceAutoIcon.className = "ph ph-speaker-slash text-sm text-gray-500";
            voiceAutoStatus.textContent = "Voice: OFF";
            voiceAutoStatus.className = "text-[10px] uppercase tracking-wider font-bold text-gray-500";
        }
    };
    updateVoiceToggleUI();

    if (voiceAutoToggleBtn) {
        voiceAutoToggleBtn.addEventListener('click', () => {
            artemisVoice.autoSpeak = !artemisVoice.autoSpeak;
            localStorage.setItem('artemis_voice_enabled', artemisVoice.autoSpeak);
            if (!artemisVoice.autoSpeak) artemisVoice.stop();
            updateVoiceToggleUI();
        });
    }

    const getCrystalAvatar = (isThinking = false) => `
        <div class="w-8 h-8 rounded-full border border-gold/40 flex items-center justify-center bg-black flex-shrink-0 relative overflow-hidden ${isThinking ? 'shadow-[0_0_14px_rgba(221,170,51,0.7)] animate-pulse' : 'shadow-[0_0_6px_rgba(16,185,129,0.3)]'}">
            <svg viewBox="0 0 100 100" class="w-5 h-5">
                <polygon points="50,10 90,30 90,70 50,90 10,70 10,30" fill="${isThinking ? '#DDAA33' : '#10b981'}" fill-opacity="0.25" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="4"/>
                <polygon points="50,10 50,50 90,70" fill="${isThinking ? '#F0D788' : '#10b981'}" fill-opacity="0.4" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="2"/>
                <polygon points="50,90 10,70 50,50" fill="${isThinking ? '#997722' : '#064e3b'}" fill-opacity="0.5" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="2"/>
                <circle cx="50" cy="50" r="4" fill="#FFFFFF"/>
            </svg>
        </div>
    `;

    const setCoreThinking = (isProcessing) => {
        if (crystalCore) {
            if (isProcessing) crystalCore.classList.add('crystal-thinking-fast');
            else crystalCore.classList.remove('crystal-thinking-fast');
        }
    };

    // Safe Slash Command Palette
    if (promptInput) {
        promptInput.addEventListener('input', (e) => {
            if (!commandPalette) return;
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
            if (commandPalette) {
                commandPalette.classList.add('hidden'); commandPalette.classList.remove('flex');
            }
            promptInput.focus();
        });
    });

    const openArtifactCanvas = (parsedData) => {
        activeCanvasData = parsedData;
        let htmlContent = '';

        if (parsedData.type === 'interactive_table') {
            htmlContent = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl text-white font-light tracking-tight">${parsedData.title || 'Data Report'}</h2>
                    <span class="text-[10px] font-mono bg-white/5 border border-white/10 px-2.5 py-1 rounded text-gold font-bold">${parsedData.rows.length} Records</span>
                </div>
                <div class="overflow-x-auto glass-card rounded-xl border border-white/5 shadow-2xl">
                    <table class="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr class="bg-white/5 border-b border-white/10 text-[10px] uppercase tracking-widest text-gray-500 font-mono">
                                ${parsedData.columns.map(c => `<th class="py-3.5 px-4 font-semibold">${c}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="text-sm font-sans divide-y divide-white/5 text-gray-200">
                            ${parsedData.rows.map(r => `
                                <tr class="hover:bg-white/5 transition-colors">
                                    ${r.map((v, idx) => `<td class="py-3 px-4 ${idx===0 ? 'text-emerald-400 font-medium' : 'text-right font-mono text-gray-300'}">${v}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
            document.getElementById('artifact-content').innerHTML = htmlContent;
        } 
        else if (parsedData.type === 'interactive_chart') {
            htmlContent = `
                <h2 class="text-xl text-white font-light mb-6 tracking-tight">${parsedData.title || 'Visual Analytics'}</h2>
                <div class="p-6 glass-card rounded-xl border border-white/5 shadow-2xl relative w-full flex flex-col" style="min-height: 400px;">
                    <div class="relative w-full flex-1"><canvas id="gen-ui-chart"></canvas></div>
                </div>
            `;
            document.getElementById('artifact-content').innerHTML = htmlContent;
            
            setTimeout(() => {
                const ctx = document.getElementById('gen-ui-chart');
                if (!ctx) return;
                if (canvasChartInstance) canvasChartInstance.destroy();
                
                Chart.defaults.color = '#888'; 
                Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
                
                let bgColors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
                if (parsedData.chartType === 'bar') {
                    const ctx2d = ctx.getContext('2d');
                    bgColors = parsedData.labels.map((_, i) => { 
                        const grad = ctx2d.createLinearGradient(0, 0, 0, 400); 
                        grad.addColorStop(0, bgColors[i % bgColors.length]); 
                        grad.addColorStop(1, '#111111'); 
                        return grad; 
                    });
                }

                canvasChartInstance = new Chart(ctx, {
                    type: parsedData.chartType || 'bar',
                    data: { 
                        labels: parsedData.labels, 
                        datasets: [{ 
                            data: parsedData.data, 
                            backgroundColor: bgColors, 
                            borderWidth: 0, 
                            borderRadius: parsedData.chartType==='bar'?4:0 
                        }] 
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { legend: { display: parsedData.chartType==='doughnut' || parsedData.chartType==='pie' } } 
                    }
                });
            }, 250);
        }

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
            if (!activeCanvasData || activeCanvasData.type !== 'interactive_table') return alert("Only Data Tables can be exported to CSV.");
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

    // --- BULLETPROOF SESSION MANAGEMENT ---
    const renderSessions = () => {
        if (!sessionsList || !pinnedList) return;
        const keys = Object.keys(sessions);
        const pinnedKeys = keys.filter(k => sessions[k] && sessions[k].pinned);
        const recentKeys = keys.filter(k => sessions[k] && !sessions[k].pinned).reverse();

        if (pinnedKeys.length > 0) pinnedHeader.classList.remove('hidden');
        else pinnedHeader.classList.add('hidden');

        const buildSessionNode = (id) => {
            const s = sessions[id];
            const isSelected = (id === currentSessionId);
            return `
                <div class="session-item group px-2.5 py-2 rounded-lg text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-white/10 text-gold font-semibold' : ''}" data-id="${id}">
                    <span class="truncate max-w-[125px] session-title-text" title="${s.title}">${s.title}</span>
                    <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="pin-btn p-1 hover:text-gold transition-colors" title="${s.pinned ? 'Unpin' : 'Pin'}">
                            <i class="ph ${s.pinned ? 'ph-push-pin text-gold' : 'ph-push-pin'}"></i>
                        </button>
                        <button class="rename-btn p-1 hover:text-gold transition-colors" title="Rename">
                            <i class="ph ph-pencil-simple"></i>
                        </button>
                        <button class="delete-btn p-1 hover:text-red-400 transition-colors" title="Delete">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        };

        pinnedList.innerHTML = pinnedKeys.map(k => buildSessionNode(k)).join('');
        sessionsList.innerHTML = recentKeys.map(k => buildSessionNode(k)).join('');

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
                    const newTitle = prompt('Rename Thread:', sessions[id].title);
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
        
        // FIX: Safely clear ONLY the chat stream without breaking the Hologram Background Layer
        if (chatStream) chatStream.innerHTML = '';

        const session = sessions[id];
        
        if (!session || !Array.isArray(session.history) || session.history.length === 0) {
            if (hologramContainer) {
                hologramContainer.classList.remove('hologram-fade-out');
                hologramContainer.classList.add('hologram-focus');
            }
            renderSessions();
            return;
        }

        // Fade Hologram to Watermark if history exists
        if (hologramContainer) {
            hologramContainer.classList.add('hologram-fade-out');
            hologramContainer.classList.remove('hologram-focus');
        }
        
        session.history.forEach(msg => {
            try {
                if (!msg.parts || !msg.parts[0] || !msg.parts[0].text) return;
                
                if (msg.role === 'user') {
                    const u = document.createElement('div');
                    u.className = "self-end bg-surface/80 backdrop-blur border border-white/10 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm text-gray-300 shadow-md mt-4 relative z-10";
                    u.innerHTML = `<div class="text-[10px] font-mono text-gold mb-2 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${msg.parts[0].text}`;
                    chatStream.appendChild(u);
                } else {
                    const a = document.createElement('div');
                    a.className = "self-start bg-transparent p-4 w-full flex items-start space-x-4 mt-2 relative z-10";
                    
                    let cleanText = msg.parts[0].text;
                    const jsonBlockRegex = /\`\`\`json\s*([\s\S]*?)\s*\`\`\`/;
                    const match = cleanText.match(jsonBlockRegex);
                    let parsedGenUI = null;

                    if (match && match[1]) {
                        try {
                            parsedGenUI = JSON.parse(match[1]);
                            cleanText = cleanText.replace(jsonBlockRegex, '').trim();
                        } catch (e) { console.error("History GenUI Parse error", e); }
                    }

                    a.innerHTML = `
                        ${getCrystalAvatar(false)}
                        <div class="bg-surface/90 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${marked.parse(cleanText)}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-3 mt-3">
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 copy-resp-btn"><i class="ph ph-copy"></i><span>Copy Response</span></button>
                                ${parsedGenUI ? `<button class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded open-canvas-btn"><i class="ph ph-layout"></i><span>Open Canvas Artifact</span></button>` : ''}
                            </div>
                        </div>
                    `;

                    a.querySelector('.copy-resp-btn').addEventListener('click', () => { navigator.clipboard.writeText(cleanText); });
                    if (parsedGenUI) {
                        a.querySelector('.open-canvas-btn').addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                    }

                    chatStream.appendChild(a);
                }
            } catch (err) { console.warn("Failed to load historical message", err); }
        });
        
        // Scroll to the bottom of the scroll container
        document.getElementById('chat-stream-container').scrollTop = document.getElementById('chat-stream-container').scrollHeight;
        renderSessions();
    };

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            artemisVoice.stop();
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

            artemisVoice.stop();
            
            // Fade Hologram immediately
            if (hologramContainer) {
                hologramContainer.classList.add('hologram-fade-out');
                hologramContainer.classList.remove('hologram-focus');
            }

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", pinned: false, history: [] };
            } else if (!sessions[currentSessionId].history || sessions[currentSessionId].history.length === 0) {
                sessions[currentSessionId].title = val.substring(0, 24) + "...";
            }

            const userMsg = document.createElement('div');
            userMsg.className = "self-end bg-surface/80 backdrop-blur border border-white/10 rounded-2xl rounded-tr-none p-4 max-w-[80%] text-sm text-gray-300 shadow-md mt-4 relative z-10";
            userMsg.innerHTML = `<div class="text-[10px] font-mono text-gold mb-2 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${val}`;
            chatStream.appendChild(userMsg);
            
            promptInput.value = '';
            document.getElementById('chat-stream-container').scrollTop = document.getElementById('chat-stream-container').scrollHeight;

            const aiMsg = document.createElement('div');
            aiMsg.className = "self-start bg-transparent p-4 w-full flex items-start space-x-4 mt-2 relative z-10";
            const reqStartTime = Date.now();
            aiMsg.innerHTML = `
                ${getCrystalAvatar(true)}
                <div class="text-sm text-gray-400 font-mono pt-2 tracking-widest uppercase animate-pulse">Computing Data Lake nodes...</div>
            `;
            chatStream.appendChild(aiMsg);
            document.getElementById('chat-stream-container').scrollTop = document.getElementById('chat-stream-container').scrollHeight;

            setCoreThinking(true);

            try {
                const historyPayload = sessions[currentSessionId].history || [];
                const response = await fetch(ARTEMIS_API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: val, 
                        history: historyPayload, 
                        secret: 'system_dashboard_init',
                        model: document.getElementById('model-select').value || 'gemini-3.5-flash-lite'
                    })
                });

                if (!response.ok) {
                    throw new Error(`Server returned HTTP ${response.status}.`);
                }

                const data = await response.json();
                const latency = Date.now() - reqStartTime;
                setCoreThinking(false);

                if (data.status === 200 && data.response) {
                    let aiText = data.response;

                    if (!sessions[currentSessionId].history) sessions[currentSessionId].history = [];
                    sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
                    sessions[currentSessionId].history.push({role: "model", parts: [{text: aiText}]});
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));

                    // Parse Generative UI Artifacts
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
                        ${getCrystalAvatar(false)}
                        <div class="bg-surface/90 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
                            <div class="text-[9px] font-mono text-emerald-400 mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>Query Complete (${latency}ms)</span></div>
                                <div class="text-gray-500">${document.getElementById('model-select').value.replace('gemini-','').toUpperCase()}</div>
                            </div>
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-3 mt-3">
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 copy-resp-btn"><i class="ph ph-copy"></i><span>Copy Response</span></button>
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 speak-resp-btn"><i class="ph ph-speaker-high"></i><span>Speak</span></button>
                                ${parsedGenUI ? `<button class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded open-canvas-btn"><i class="ph ph-layout"></i><span>Open Canvas Artifact</span></button>` : ''}
                            </div>
                        </div>
                    `;

                    aiMsg.querySelector('.copy-resp-btn').addEventListener('click', () => { navigator.clipboard.writeText(aiText); });

                    // Inline Voice Control
                    const speakBtn = aiMsg.querySelector('.speak-resp-btn');
                    speakBtn.addEventListener('click', () => {
                        if (window.speechSynthesis && window.speechSynthesis.speaking) {
                            artemisVoice.stop();
                            speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`;
                        } else {
                            speakBtn.innerHTML = `<i class="ph ph-stop text-red-400"></i><span class="text-red-400">Stop</span>`;
                            artemisVoice.speak(
                                aiText,
                                () => setCoreThinking(true),
                                () => {
                                    setCoreThinking(false);
                                    speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`;
                                }
                            );
                        }
                    });

                    if (artemisVoice.autoSpeak) {
                        artemisVoice.speak(aiText, () => setCoreThinking(true), () => setCoreThinking(false));
                    }

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
                setCoreThinking(false);
                aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded relative z-10">Network Error: Unable to reach Artemis core.</div>`;
            }
            document.getElementById('chat-stream-container').scrollTop = document.getElementById('chat-stream-container').scrollHeight;
        });

        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendBtn.click();
            }
        });
    }

    // Init
    if (!sessions[currentSessionId]) {
        sessions[currentSessionId] = { title: "New Session", pinned: false, history: [] };
    }
    renderSessions();
    loadSession(currentSessionId);
});
