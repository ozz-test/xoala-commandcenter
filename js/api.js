// === XOALA COMMAND CENTER: ARTEMIS AI CORE ENGINE ===

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

// --- HTML5 CANVAS PARTICLE ENGINE (THE NEURAL KOALA) ---
class NeuralKoala {
    constructor() {
        this.canvas = document.getElementById('koala-particles');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.width = 400;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.particles = [];
        this.isProcessing = false;
        this.init();
        this.animate();
    }
    
    init() {
        this.particles = [];
        const cx = this.width / 2;
        const cy = this.height / 2 - 20; // Shifted up slightly
        
        const headR = 65; 
        const earR = 38;

        for (let i = 0; i < 200; i++) {
            let bx, by;
            const region = Math.random();
            
            // Mathematically distribute particles to form the Koala silhouette
            if (region < 0.60) {
                // Head
                const a = Math.random() * 2 * Math.PI;
                const r = Math.sqrt(Math.random()) * headR;
                bx = cx + r * Math.cos(a);
                by = cy + r * Math.sin(a) + 15; // Flatten bottom slightly
            } else if (region < 0.80) {
                // Left Ear
                const a = Math.random() * 2 * Math.PI;
                const r = Math.sqrt(Math.random()) * earR;
                bx = cx - 60 + r * Math.cos(a);
                by = cy - 40 + r * Math.sin(a);
            } else {
                // Right Ear
                const a = Math.random() * 2 * Math.PI;
                const r = Math.sqrt(Math.random()) * earR;
                bx = cx + 60 + r * Math.cos(a);
                by = cy - 40 + r * Math.sin(a);
            }
            
            this.particles.push({
                baseX: bx, baseY: by,
                x: bx, y: by,
                angle: Math.random() * Math.PI * 2,
                speed: Math.random() * 0.02 + 0.01,
                radius: Math.random() * 1.5 + 0.5,
                color: Math.random() > 0.15 ? 'rgba(16, 185, 129, 0.9)' : 'rgba(221, 170, 51, 0.9)', // Emerald dominant, Gold accents
                orbitRadius: Math.sqrt(Math.pow(bx - cx, 2) + Math.pow(by - cy, 2)),
                orbitSpeed: (Math.random() * 0.05 + 0.02) * (Math.random() > 0.5 ? 1 : -1)
            });
        }
    }
    
    setProcessing(state) {
        this.isProcessing = state;
        if (this.canvas) {
            if (state) this.canvas.classList.add('scale-110'); // Slight zoom during vortex
            else this.canvas.classList.remove('scale-110');
        }
    }
    
    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        const cx = this.width / 2;
        const cy = this.height / 2;

        this.particles.forEach(p => {
            if (this.isProcessing) {
                // Vortex Mode (Shattered Orbit)
                p.angle += p.orbitSpeed;
                const targetX = cx + Math.cos(p.angle) * p.orbitRadius * (1 + Math.random() * 0.2);
                const targetY = cy + Math.sin(p.angle) * p.orbitRadius * (1 + Math.random() * 0.2);
                p.x += (targetX - p.x) * 0.08;
                p.y += (targetY - p.y) * 0.08;
            } else {
                // Idle Breathing Mode (Magnetic Shape)
                p.angle += p.speed;
                const targetX = p.baseX + Math.cos(p.angle) * 6;
                const targetY = p.baseY + Math.sin(p.angle) * 6;
                p.x += (targetX - p.x) * 0.05;
                p.y += (targetY - p.y) * 0.05;
            }

            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fill();
        });

        // Draw Synapse Connections
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const dist = dx*dx + dy*dy;
                
                if (dist < 1500) { // Connect nearby nodes
                    this.ctx.beginPath();
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.strokeStyle = `rgba(16, 185, 129, ${0.15 - dist/10000})`; // Fades out over distance
                    this.ctx.stroke();
                }
            }
        }
        requestAnimationFrame(() => this.animate());
    }
}

// --- ARTEMIS FRONTEND LOGIC ---
let koalaEngine;

document.addEventListener('DOMContentLoaded', () => {
    
    // Initialize the Particle Engine
    koalaEngine = new NeuralKoala();

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

    // FIX: Abstracted AI Node for Chat Bubbles (Matches the particle aesthetic)
    const getAvatarNode = (isThinking = false) => `
        <div class="w-8 h-8 rounded-full border border-gold flex items-center justify-center bg-black flex-shrink-0 ${isThinking ? 'shadow-[0_0_12px_rgba(221,170,51,0.6)] animate-pulse' : 'shadow-[0_0_8px_rgba(16,185,129,0.3)]'}">
            <svg width="18" height="18" viewBox="0 0 100 100" class="${isThinking ? 'spin-slow' : ''}">
                <circle cx="50" cy="50" r="40" stroke="${isThinking ? '#DDAA33' : '#10b981'}" stroke-width="6" stroke-dasharray="40 20" fill="none"/>
                <circle cx="50" cy="50" r="20" fill="${isThinking ? '#DDAA33' : '#10b981'}"/>
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
        
        // Restore empty state wrapper
        chatBox.appendChild(emptyState);

        const session = sessions[id];
        if (!session || session.history.length === 0) {
            emptyState.classList.remove('opacity-0');
            if (koalaEngine) koalaEngine.setProcessing(false);
            renderSessions();
            return;
        }

        // Hide empty text if session has history
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
                    ${getAvatarNode(false)}
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

            // Fade out the "Artemis is Online" text
            if (emptyState) emptyState.classList.add('opacity-0');

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", history: [] };
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
                ${getAvatarNode(true)}
                <div class="text-sm text-gray-400 font-mono pt-2 tracking-widest uppercase animate-pulse">Connecting to Data Lake...</div>
            `;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;

            // Trigger the Koala Vortex state
            if (koalaEngine) koalaEngine.setProcessing(true);

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

                // Stop the Vortex
                if (koalaEngine) koalaEngine.setProcessing(false);

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
                        ${getAvatarNode(false)}
                        <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
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
                    aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded relative z-10">API Error: ${data.error || "Execution failed."}</div>`;
                }
            } catch (err) {
                if (koalaEngine) koalaEngine.setProcessing(false);
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
