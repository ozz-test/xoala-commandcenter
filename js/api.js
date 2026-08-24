// === XOALA COMMAND CENTER: ARTEMIS AI CORE & JARVIS VOICE ENGINE ===

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

// ==========================================
// 1. 3D JARVIS HOLOGRAPHIC CANVAS ENGINE
// ==========================================
class JarvisHologram {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.width = 300;
        this.height = 300;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.state = 'idle'; // 'idle', 'thinking', 'speaking'
        this.time = 0;

        // 3D Particles Sphere Halo
        this.particles = [];
        const count = 160;
        for (let i = 0; i < count; i++) {
            const theta = Math.acos(2 * Math.random() - 1);
            const phi = 2 * Math.PI * Math.random();
            const r = 90 + (Math.random() * 20 - 10);
            this.particles.push({
                x: r * Math.sin(theta) * Math.cos(phi),
                y: r * Math.sin(theta) * Math.sin(phi),
                z: r * Math.cos(theta),
                size: Math.random() * 1.8 + 0.6,
                glow: Math.random() > 0.25 ? '#DDAA33' : '#10b981'
            });
        }

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setState(newState) {
        this.state = newState;
    }

    project(x, y, z, rotX, rotY, rotZ) {
        // 3D Euler Rotations
        let radX = rotX, radY = rotY, radZ = rotZ;
        
        // Rotate Y
        let x1 = x * Math.cos(radY) + z * Math.sin(radY);
        let y1 = y;
        let z1 = -x * Math.sin(radY) + z * Math.cos(radY);

        // Rotate X
        let x2 = x1;
        let y2 = y1 * Math.cos(radX) - z1 * Math.sin(radX);
        let z2 = y1 * Math.sin(radX) + z1 * Math.cos(radX);

        // Rotate Z
        let x3 = x2 * Math.cos(radZ) - y2 * Math.sin(radZ);
        let y3 = x2 * Math.sin(radZ) + y2 * Math.cos(radZ);
        let z3 = z2;

        const fov = 350;
        const scale = fov / (fov + z3 + 120);
        return {
            x: x3 * scale + this.width / 2,
            y: y3 * scale + this.height / 2,
            z: z3,
            scale: scale
        };
    }

    drawRing(radius, rotX, rotY, rotZ, color, isDashed = false, dashPattern = [6, 8], lineWidth = 1.2) {
        const segments = 64;
        this.ctx.beginPath();
        if (isDashed) this.ctx.setLineDash(dashPattern);
        else this.ctx.setLineDash([]);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = lineWidth;

        let first = true;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const px = radius * Math.cos(angle);
            const py = radius * Math.sin(angle);
            const p = this.project(px, py, 0, rotX, rotY, rotZ);

            if (first) {
                this.ctx.moveTo(p.x, p.y);
                first = false;
            } else {
                this.ctx.lineTo(p.x, p.y);
            }
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);

        let speedMultiplier = 1;
        if (this.state === 'thinking') speedMultiplier = 3.5;
        if (this.state === 'speaking') speedMultiplier = 2.0;

        this.time += 0.02 * speedMultiplier;
        const cx = this.width / 2;
        const cy = this.height / 2;

        // 1. Central Singularity / Core Flare
        const corePulse = (this.state === 'speaking') 
            ? Math.sin(this.time * 6) * 8 + 24
            : Math.sin(this.time * 2) * 4 + 18;

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, corePulse * 2.5);
        if (this.state === 'thinking') {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.2, '#DDAA33');
            grad.addColorStop(0.7, 'rgba(239, 68, 68, 0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
        } else {
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.25, '#F0D788');
            grad.addColorStop(0.6, 'rgba(16, 185, 129, 0.4)');
            grad.addColorStop(1, 'rgba(0,0,0,0)');
        }

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, corePulse * 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        // 2. Multi-Axis 3D Gyroscope Rings (Jarvis Optics)
        this.drawRing(40, this.time * 0.9, this.time * 1.3, 0, '#FFFFFF', true, [4, 4], 1.5);
        this.drawRing(62, this.time * 0.6, 0.8, this.time * 0.8, '#DDAA33', false, [], 1.4);
        this.drawRing(82, 0.6, -this.time * 0.7, this.time * 0.5, '#10b981', true, [14, 8], 1.2);
        this.drawRing(105, -this.time * 0.4, this.time * 0.5, 0.7, 'rgba(221, 170, 51, 0.45)', true, [2, 10], 1.0);
        this.drawRing(122, 1.2, this.time * 0.3, -this.time * 0.3, 'rgba(16, 185, 129, 0.3)', false, [], 0.8);

        // 3. 3D Particle Swarm Projection
        this.particles.forEach(p => {
            const proj = this.project(p.x, p.y, p.z, this.time * 0.3, this.time * 0.5, 0);
            if (proj.scale > 0) {
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
                this.ctx.fillStyle = p.glow;
                this.ctx.shadowColor = p.glow;
                this.ctx.shadowBlur = 6 * proj.scale;
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        });

        requestAnimationFrame(this.animate);
    }
}

// ==========================================
// 2. JARVIS VOICE TRANSMISSION SYNTHESIZER
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
            // Prioritize British/Natural AI accents for Jarvis persona
            this.voice = voices.find(v => v.name.includes('Google UK English Male') || v.name.includes('Daniel') || v.name.includes('Oliver') || v.name.includes('George')) 
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
            .replace(/```json[\s\S]*?```/g, '') // Strip JSON Blocks
            .replace(/```[\s\S]*?```/g, '')     // Strip Code Blocks
            .replace(/\[.*?\]\(.*?\)/g, '')     // Strip Markdown Links
            .replace(/[*_~`#>]/g, '')           // Strip Formatting Symbols
            .replace(/\|\s*[-:]+\s*\|/g, '')    // Strip Table Bars
            .replace(/\|/g, ', ')               // Replace Table Delimiters with Pauses
            .trim();
    }

    speak(text, onStartCallback, onEndCallback) {
        if (!this.synth) return;
        this.stop();

        const cleanText = this.cleanSpeechText(text);
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        if (this.voice) utterance.voice = this.voice;
        utterance.rate = 1.05;  // Crisp, authoritative cadence
        utterance.pitch = 0.95; // Authoritative tenor

        utterance.onstart = () => {
            if (onStartCallback) onStartCallback();
        };
        utterance.onend = () => {
            if (onEndCallback) onEndCallback();
        };
        utterance.onerror = () => {
            if (onEndCallback) onEndCallback();
        };

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
// 3. UI, EVENT HANDLERS & SESSION LOGIC
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    const jarvisHolo = new JarvisHologram('jarvis-core-canvas');
    const jarvisVoice = new ArtemisVoice();

    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');
    const emptyState = document.getElementById('artemis-empty-state');
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

    let currentSessionId = Date.now().toString();
    let sessions = {};

    // 1. Safe LocalStorage Hydration & Normalization
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

    // Synchronize Auto-Voice Toggle UI
    const updateVoiceToggleUI = () => {
        if (jarvisVoice.autoSpeak) {
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
            jarvisVoice.autoSpeak = !jarvisVoice.autoSpeak;
            localStorage.setItem('artemis_voice_enabled', jarvisVoice.autoSpeak);
            if (!jarvisVoice.autoSpeak) jarvisVoice.stop();
            updateVoiceToggleUI();
        });
    }

    // Mini Hologram Avatar for chat stream
    const getMessageAvatar = () => `
        <div class="w-8 h-8 rounded-full border border-gold/40 flex items-center justify-center bg-black flex-shrink-0 relative overflow-hidden shadow-[0_0_8px_rgba(221,170,51,0.4)]">
            <div class="absolute inset-[1px] rounded-full border border-emerald-500/40 border-dotted animate-spin" style="animation-duration: 9s;"></div>
            <i class="ph ph-cpu text-xs text-gold"></i>
        </div>
    `;

    document.querySelectorAll('.quick-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            promptInput.value = e.currentTarget.getAttribute('data-prompt');
            promptInput.focus();
        });
    });

    // Data Canvas Renderer
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

    // --- WORKING THREAD MANAGEMENT (Pinned, Rename, Delete) ---
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
        chatBox.innerHTML = '';
        chatBox.appendChild(emptyState);

        const session = sessions[id];
        if (!session || !Array.isArray(session.history) || session.history.length === 0) {
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
                    ${getMessageAvatar()}
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
            jarvisVoice.stop();
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

            jarvisVoice.stop();
            if (emptyState) emptyState.classList.add('opacity-0');

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", pinned: false, history: [] };
            } else if (!sessions[currentSessionId].history || sessions[currentSessionId].history.length === 0) {
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
                ${getMessageAvatar()}
                <div class="text-sm text-gray-400 font-mono pt-2 tracking-widest uppercase animate-pulse">Running quantitative query...</div>
            `;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;

            // Trigger Hologram Thinking State
            jarvisHolo.setState('thinking');

            try {
                const historyPayload = sessions[currentSessionId].history || [];
                const response = await fetch(ARTEMIS_API_URL, {
                    method: 'POST', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        prompt: val, 
                        history: historyPayload, 
                        secret: 'system_dashboard_init',
                        model: document.getElementById('model-select').value || 'gemini-3.5-flash-lite'
                    })
                });

                const data = await response.json();
                const latency = Date.now() - reqStartTime;
                jarvisHolo.setState('idle');

                if (data.status === 200 && data.response) {
                    let aiText = data.response;

                    if (!sessions[currentSessionId].history) sessions[currentSessionId].history = [];
                    sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
                    sessions[currentSessionId].history.push({role: "model", parts: [{text: aiText}]});
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));

                    // Parse Generative UI Artifacts (Table or Chart)
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
                        ${getMessageAvatar()}
                        <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
                            <div class="text-[9px] font-mono text-emerald-400 mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>Query Complete (${latency}ms)</span></div>
                                <div class="text-gray-500">${document.getElementById('model-select').value.replace('gemini-','').toUpperCase()}</div>
                            </div>
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-3 mt-3">
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 copy-resp-btn"><i class="ph ph-copy"></i><span>Copy</span></button>
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 speak-resp-btn"><i class="ph ph-speaker-high"></i><span>Speak</span></button>
                                ${parsedGenUI ? `<button class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded open-canvas-btn"><i class="ph ph-layout"></i><span>Open Canvas Artifact</span></button>` : ''}
                            </div>
                        </div>
                    `;

                    aiMsg.querySelector('.copy-resp-btn').addEventListener('click', () => { 
                        navigator.clipboard.writeText(aiText); 
                    });

                    // Voice Output Trigger
                    const speakBtn = aiMsg.querySelector('.speak-resp-btn');
                    speakBtn.addEventListener('click', () => {
                        if (window.speechSynthesis && window.speechSynthesis.speaking) {
                            jarvisVoice.stop();
                            speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`;
                        } else {
                            speakBtn.innerHTML = `<i class="ph ph-stop text-red-400"></i><span class="text-red-400">Stop</span>`;
                            jarvisVoice.speak(
                                aiText,
                                () => jarvisHolo.setState('speaking'),
                                () => {
                                    jarvisHolo.setState('idle');
                                    speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`;
                                }
                            );
                        }
                    });

                    // Auto-Speak if Master Voice is Enabled
                    if (jarvisVoice.autoSpeak) {
                        jarvisVoice.speak(
                            aiText,
                            () => jarvisHolo.setState('speaking'),
                            () => jarvisHolo.setState('idle')
                        );
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
                jarvisHolo.setState('idle');
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
