/**
 * === XOALA COMMAND CENTER: DUAL-PERSONA TERMINAL ENGINE ===
 */

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

// ==========================================
// NEW: CLIENT-SIDE WEBGPU AI ENGINE
// ==========================================
class LocalAIEngine {
    constructor() {
        this.engine = null;
        this.isReady = false;
        this.isLoading = false;
    }
    async initialize(statusCallback) {
        if (this.isReady) return;
        this.isLoading = true;
        statusCallback("Downloading WebGPU Engine...");
        try {
            // FIX: Corrected package name from @mlc.ai to @mlc-ai
            const webllm = await import("https://esm.run/@mlc-ai/web-llm");
            this.engine = await webllm.CreateMLCEngine("gemma-2b-it-q4f16_1-MLC", { 
    initProgressCallback: (info) => statusCallback(info.text) 
});
            });
            this.isReady = true;
            statusCallback("WebGPU Active");
        } catch (e) {
            console.error("WebLLM Init Failed:", e);
            statusCallback("WebGPU Failed");
        }
        this.isLoading = false;
    }
    async extractAST(prompt) {
        if (!this.isReady) return null;
        try {
            const messages = [
                { role: "system", content: "You are a compiler. Convert the user query into a JSON object with keys: operation (filter_count, group_by, or time_series), title, filterValue (if applicable), and slots (array of objects with role, inferred_type, selected_column). Return ONLY valid JSON." },
                { role: "user", content: prompt }
            ];
            const reply = await this.engine.chat.completions.create({ messages, temperature: 0.1 });
            const jsonText = reply.choices[0].message.content;
            const match = jsonText.match(/\{[\s\S]*\}/);
            return match ? JSON.parse(match[0]) : null;
        } catch (e) {
            console.error("WebLLM Parse Error:", e);
            return null;
        }
    }
}

// ==========================================
// 1. DYNAMIC 3D HTML5 CANVAS HOLOGRAM ENGINE
// ==========================================
class CoreHologram {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.width = 350;
        this.height = 350;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.particles = [];
        this.time = 0;
        this.state = 'idle'; 
        this.persona = 'artemis'; 
        this.audioPulse = 0;
        this.baseSpeed = 1.0;
        
        this.mouseX = this.width / 2;
        this.mouseY = this.height / 2;
        this.targetMouseX = this.width / 2;
        this.targetMouseY = this.height / 2;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.targetMouseX = e.clientX - rect.left;
            this.targetMouseY = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.targetMouseX = this.width / 2;
            this.targetMouseY = this.height / 2;
        });

        this.initParticles();
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    initParticles() {
        this.particles = [];
        for (let i = 0; i < 180; i++) {
            const theta = Math.acos(2 * Math.random() - 1);
            const phi = 2 * Math.PI * Math.random();
            const r = 120 + (Math.random() * 30 - 15);
            this.particles.push({
                x: r * Math.sin(theta) * Math.cos(phi),
                y: r * Math.sin(theta) * Math.sin(phi),
                z: r * Math.cos(theta),
                size: Math.random() * 1.5 + 0.5,
                color: this.getParticleColor()
            });
        }
    }

    getParticleColor() {
        if (this.persona === 'prometheus') {
            return Math.random() > 0.3 ? 'rgba(220, 38, 38, 0.8)' : 'rgba(251, 191, 36, 0.8)';
        }
        return Math.random() > 0.3 ? 'rgba(221, 170, 51, 0.8)' : 'rgba(16, 185, 129, 0.8)';
    }

    setPersona(p) {
        if (this.persona === p) return;
        this.persona = p;
        this.particles.forEach(part => { part.color = this.getParticleColor(); });
    }

    setState(s) { this.state = s; }
    setAudioPulse(v) { this.audioPulse = v; }

    project(x, y, z, rotX, rotY, rotZ) {
        let x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
        let z1 = -x * Math.sin(rotY) + z * Math.cos(rotY);
        let y2 = y * Math.cos(rotX) - z1 * Math.sin(rotX);
        let z2 = y * Math.sin(rotX) + z1 * Math.cos(rotX);
        let x3 = x1 * Math.cos(rotZ) - y2 * Math.sin(rotZ);
        let y3 = x1 * Math.sin(rotZ) + y2 * Math.cos(rotZ);
        
        const fov = 400;
        const scale = fov / (fov + z2 + 150);
        return { x: x3 * scale + this.width / 2, y: y3 * scale + this.height / 2, scale: scale };
    }

    drawRing(radius, rotX, rotY, rotZ, color, isDashed) {
        const segments = 60;
        this.ctx.beginPath();
        if (isDashed) this.ctx.setLineDash([6, 10]); else this.ctx.setLineDash([]);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1.5;

        let first = true;
        for (let i = 0; i <= segments; i++) {
            const angle = (i / segments) * Math.PI * 2;
            const p = this.project(radius * Math.cos(angle), radius * Math.sin(angle), 0, rotX, rotY, rotZ);
            if (first) { this.ctx.moveTo(p.x, p.y); first = false; } 
            else { this.ctx.lineTo(p.x, p.y); }
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = 'lighter';

        this.mouseX += (this.targetMouseX - this.mouseX) * 0.1;
        this.mouseY += (this.targetMouseY - this.mouseY) * 0.1;

        let speed = this.baseSpeed;
        if (this.state === 'thinking') speed = 4;
        if (this.state === 'speaking') speed = 2;
        if (this.state === 'macro') speed = 8;
        this.time += 0.01 * speed;

        const parallaxX = (this.mouseX - this.width / 2) * 0.003;
        const parallaxY = (this.mouseY - this.height / 2) * 0.003;
        const cx = this.width / 2;
        const cy = this.height / 2;

        let coreRadius = 25 + Math.sin(this.time * 3) * 3;
        if (this.state === 'speaking') coreRadius += this.audioPulse * 15;
        if (this.state === 'thinking') coreRadius += 10;
        if (this.state === 'macro') coreRadius += 5;

        const isPrometheus = this.persona === 'prometheus';
        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2.5);
        
        grad.addColorStop(0, '#FFFFFF');
        if (isPrometheus) {
            grad.addColorStop(0.2, '#dc2626'); 
            grad.addColorStop(0.6, this.state === 'macro' ? 'rgba(251, 191, 36, 0.6)' : 'rgba(251, 191, 36, 0.3)'); 
        } else {
            grad.addColorStop(0.2, '#DDAA33'); 
            grad.addColorStop(0.6, this.state === 'macro' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.3)'); 
        }
        grad.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, coreRadius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        const r1Color = isPrometheus ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.4)';
        const r2Color = isPrometheus ? 'rgba(220, 38, 38, 0.5)' : 'rgba(221,170,51,0.5)';
        const r3Color = isPrometheus ? 'rgba(251, 191, 36, 0.3)' : 'rgba(16,185,129,0.3)';

        this.drawRing(60, this.time * 1.2 + parallaxY, this.time * 0.9 + parallaxX, 0, r1Color, true);
        this.drawRing(100, 0.4 + parallaxY, this.time * 0.7 + parallaxX, this.time * 0.5, r2Color, false);
        this.drawRing(140, -this.time * 0.3 + parallaxY, 0.9 + parallaxX, -this.time * 0.6, r3Color, true);

        this.particles.forEach(p => {
            let zDistort = p.z;
            if (this.state === 'thinking' || this.state === 'macro') zDistort += Math.sin(this.time * 8 + p.x) * 20;

            const proj = this.project(p.x, p.y, zDistort, this.time * 0.3 + parallaxY, this.time * 0.5 + parallaxX, 0);
            if (proj.scale > 0) {
                this.ctx.beginPath();
                this.ctx.arc(proj.x, proj.y, p.size * proj.scale, 0, Math.PI * 2);
                this.ctx.fillStyle = p.color;
                this.ctx.fill();
            }
        });

        requestAnimationFrame(this.animate);
    }
}

// ==========================================
// 2. DUAL-PERSONA VOICE SYNTHESIS ENGINE
// ==========================================
class VoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.autoSpeak = localStorage.getItem('artemis_voice_enabled') !== 'false';
        this.femaleVoice = null;
        this.maleVoice = null;
        
        if (this.synth) {
            const loadVoices = () => {
                const voices = this.synth.getVoices();
                this.femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Samantha') || v.name.includes('Victoria') || v.name.includes('Google UK English Female')) || voices[0];
                this.maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Alex') || v.name.includes('Daniel') || v.name.includes('Google UK English Male')) || voices.reverse()[0];
            };
            loadVoices();
            if (this.synth.onvoiceschanged !== undefined) this.synth.onvoiceschanged = loadVoices;
        }
    }

    cleanText(markdown) { return markdown.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/[*_~`#>]/g, '').trim(); }
    
    speak(text, persona, onStart, onEnd, onBoundary) {
        if (!this.synth) return;
        this.synth.cancel();
        
        const clean = this.cleanText(text);
        if (!clean) return;
        
        const utterance = new SpeechSynthesisUtterance(clean);
        
        if (persona === 'prometheus') {
            if (this.maleVoice) utterance.voice = this.maleVoice;
            utterance.pitch = 0.8; 
            utterance.rate = 1.0;  
        } else {
            if (this.femaleVoice) utterance.voice = this.femaleVoice;
            utterance.pitch = 1.1; 
            utterance.rate = 1.05; 
        }
        
        utterance.onstart = () => { if (onStart) onStart(); };
        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = () => { if (onEnd) onEnd(); };
        utterance.onboundary = () => { if (onBoundary) onBoundary(Math.random()); };
        
        this.synth.speak(utterance);
    }
    
    stop() { if (this.synth && this.synth.speaking) this.synth.cancel(); }
}

// ==========================================
// 3. SPEECH-TO-TEXT DICTATION ENGINE
// ==========================================
class SpeechInputEngine {
    constructor(inputId, btnId) {
        this.input = document.getElementById(inputId);
        this.btn = document.getElementById(btnId);
        this.isRecording = false;
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            if(this.btn) this.btn.style.display = 'none'; 
            return;
        }
        
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        
        this.recognition.onstart = () => {
            this.isRecording = true;
            this.btn.classList.add('text-red-500', 'bg-red-500/10', 'border-red-500/30', 'animate-pulse');
            this.btn.classList.remove('text-gray-400', 'bg-surface/50', 'border-white/5');
            this.input.placeholder = "Listening...";
        };
        
        this.recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; i++) {
                transcript += event.results[i][0].transcript;
            }
            this.input.value = transcript;
            this.input.dispatchEvent(new Event('input')); 
        };
        
        this.recognition.onerror = () => this.stopRecording();
        this.recognition.onend = () => this.stopRecording();
        
        if (this.btn) {
            this.btn.addEventListener('click', () => {
                if (this.isRecording) this.stopRecording();
                else this.recognition.start();
            });
        }
    }
    
    stopRecording() {
        this.isRecording = false;
        this.recognition.stop();
        this.btn.classList.remove('text-red-500', 'bg-red-500/10', 'border-red-500/30', 'animate-pulse');
        this.btn.classList.add('text-gray-400', 'bg-surface/50', 'border-white/5');
        this.input.placeholder = "Type '/' for macros, or '@Prometheus' for Strategic Analysis...";
    }
}

// ==========================================
// 4. UI CONTROLLER & ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    const hologram = new CoreHologram('jarvis-core-canvas');
    const voiceEngine = new VoiceEngine();
    const localAI = new LocalAIEngine();

    const promptInput = document.getElementById('prompt-input');
    const promptContainer = document.getElementById('prompt-container');
    const commandPalette = document.getElementById('command-palette');
    const sendBtn = document.getElementById('send-btn');
    const sendBtnText = document.getElementById('send-btn-text');
    const chatStream = document.getElementById('chat-stream'); 
    const hologramText = document.getElementById('hologram-text');
    const artifactPane = document.getElementById('artemis-artifact-pane');
    
    const contextDock = document.getElementById('context-dock');
    const contextStatusBadge = document.getElementById('context-status-badge');
    const clearContextBtn = document.getElementById('clear-context-btn');

    const terminalHeader = document.getElementById('terminal-header');
    const personaBadge = document.getElementById('persona-badge');
    const personaIcon = document.getElementById('persona-icon');
    const personaTitle = document.getElementById('persona-title');
    const holoTitle = document.getElementById('holo-title');
    const holoSubtitle = document.getElementById('holo-subtitle');
    const modelSelect = document.getElementById('model-select');

    const sessionsList = document.getElementById('chat-sessions-list');
    const pinnedList = document.getElementById('pinned-sessions-list');
    const pinnedHeader = document.getElementById('pinned-header');
    const newChatBtn = document.getElementById('new-chat-btn');
    
    const webgpuBtn = document.getElementById('webgpu-toggle-btn');
    const webgpuStatus = document.getElementById('webgpu-status');
    const webgpuIcon = document.getElementById('webgpu-icon');

    let currentSessionId = Date.now().toString();
    let sessions = {};
    let activeContextPayload = null; 
    let activePersona = 'artemis';

    new SpeechInputEngine('prompt-input', 'voice-dictation-btn');

    // --- WebGPU Toggle Logic ---
    if (webgpuBtn) {
        webgpuBtn.addEventListener('click', async () => {
            if (localAI.isReady) {
                alert("WebGPU AI is already active and running in memory.");
                return;
            }
            if (localAI.isLoading) return;
            webgpuIcon.classList.remove('ph-lightning');
            webgpuIcon.classList.add('ph-circle-notch', 'animate-spin', 'text-gold');
            webgpuStatus.classList.add('text-gold');
            
            await localAI.initialize((msg) => {
                webgpuStatus.textContent = msg.substring(0, 20) + "...";
            });

            if (localAI.isReady) {
                webgpuIcon.classList.remove('ph-circle-notch', 'animate-spin', 'text-gold');
                webgpuIcon.classList.add('ph-lightning-fill', 'text-emerald-400');
                webgpuStatus.textContent = "WebGPU AI: ON";
                webgpuStatus.classList.replace('text-gray-500', 'text-emerald-400');
            } else {
                webgpuIcon.className = "ph ph-warning-circle text-red-400 text-sm";
                webgpuStatus.textContent = "WebGPU Failed";
                webgpuStatus.classList.replace('text-gold', 'text-red-400');
            }
        });
    }

    // --- Session Persistence Methods ---
    try {
        const raw = localStorage.getItem('xoala_chat_sessions');
        if (raw) {
            const parsed = JSON.parse(raw);
            for (const key in parsed) {
                if (parsed[key] && typeof parsed[key] === 'object') {
                    sessions[key] = { title: parsed[key].title || "Investigation", pinned: !!parsed[key].pinned, history: Array.isArray(parsed[key].history) ? parsed[key].history : [] };
                }
            }
        }
    } catch (e) { sessions = {}; }

    const renderSessions = () => {
        if (!sessionsList || !pinnedList) return;
        const keys = Object.keys(sessions);
        const pinnedKeys = keys.filter(k => sessions[k] && sessions[k].pinned);
        const recentKeys = keys.filter(k => sessions[k] && !sessions[k].pinned).reverse();

        if (pinnedKeys.length > 0) pinnedHeader.classList.remove('hidden');
        else pinnedHeader.classList.add('hidden');

        const buildSessionNodeHTML = (id) => {
            const s = sessions[id];
            const isSelected = (id === currentSessionId);
            return `
                <div class="session-item group px-2.5 py-2 rounded-sm text-xs font-mono text-gray-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-white/10 text-gold font-semibold border-l border-gold pl-2' : ''}" data-id="${id}">
                    <span class="truncate max-w-[125px]" title="${s.title}">${s.title}</span>
                    <div class="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button class="pin-btn p-1 hover:text-gold" data-id="${id}"><i class="ph ${s.pinned ? 'ph-push-pin text-gold' : 'ph-push-pin'}"></i></button>
                        <button class="delete-btn p-1 hover:text-red-400" data-id="${id}"><i class="ph ph-trash"></i></button>
                    </div>
                </div>
            `;
        };

        pinnedList.innerHTML = pinnedKeys.map(key => buildSessionNodeHTML(key)).join('');
        sessionsList.innerHTML = recentKeys.map(key => buildSessionNodeHTML(key)).join('');

        document.querySelectorAll('.session-item').forEach(el => {
            const id = el.getAttribute('data-id');
            el.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                currentSessionId = id;
                voiceEngine.stop();
                hologram.setState('idle');
                renderChatHistory(sessions[id].history);
                renderSessions();
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

            const deleteBtn = el.querySelector('.delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if(!confirm("Permanently delete this thread?")) return;
                    delete sessions[id];
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
                    if (currentSessionId === id) {
                        currentSessionId = Date.now().toString();
                        sessions[currentSessionId] = { title: "New Session", pinned: false, history: [] };
                        renderChatHistory([]);
                    }
                    renderSessions();
                });
            }
        });
    };

    const renderChatHistory = (historyArray) => {
        if (!chatStream) return;
        chatStream.innerHTML = '';
        
        if (!historyArray || historyArray.length === 0) {
            if(hologramText) hologramText.style.opacity = '1';
            return;
        }

        if(hologramText) hologramText.style.opacity = '0';

        historyArray.forEach(msg => {
            try {
                if (!msg.parts || !msg.parts[0] || !msg.parts[0].text) return;
                
                if (msg.role === 'user') {
                    const u = document.createElement('div');
                    u.className = "self-end bg-surface/80 border border-white/10 rounded-sm p-3 max-w-[85%] text-[13px] text-gray-300 shadow-md mt-4 relative z-10";
                    u.innerHTML = `<div class="text-[10px] font-mono text-gold mb-1 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${msg.parts[0].text}`;
                    chatStream.appendChild(u);
                } else {
                    const a = document.createElement('div');
                    a.className = "self-start bg-transparent w-full flex items-start space-x-3 mt-2 relative z-10";
                    
                    let cleanText = msg.parts[0].text;
                    const jsonBlockRegex = /\`\`\`json\s*([\s\S]*?)\s*\`\`\`/;
                    const match = cleanText.match(jsonBlockRegex);
                    let parsedGenUI = null;

                    if (match && match[1]) {
                        try {
                            parsedGenUI = JSON.parse(match[1]);
                            cleanText = cleanText.replace(jsonBlockRegex, '').trim();
                        } catch (e) {}
                    }

                    // FIX: Safe history rendering for old column confirmations
                    let genUIHtml = '';
                    if (parsedGenUI) {
                        if (parsedGenUI.type === 'column_confirmation') {
                             genUIHtml = `<div class="text-[10px] text-gray-500 italic mt-2 border-t border-white/5 pt-2">Schema confirmation requested.</div>`;
                        } else {
                             genUIHtml = `<button class="open-ui-btn text-[11px] text-emerald-400 font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm mt-3 flex items-center"><i class="ph ph-layout mr-1"></i>View Artifact</button>`;
                        }
                    }

                    a.innerHTML = `
                        <div class="w-8 h-8 rounded-sm border border-emerald-500/50 flex items-center justify-center bg-obsidian flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)] relative overflow-hidden">
                             <i class="ph ph-cpu text-emerald-400 text-sm"></i>
                        </div>
                        <div class="bg-surface/90 border border-white/5 rounded-sm p-4 text-[13px] text-gray-200 shadow-lg w-full max-w-[calc(100%-2.5rem)] backdrop-blur-sm">
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${marked.parse(cleanText)}</div>
                            ${genUIHtml}
                        </div>
                    `;

                    if (parsedGenUI && parsedGenUI.type !== 'column_confirmation') {
                        const openBtn = a.querySelector('.open-ui-btn');
                        if (openBtn) {
                            openBtn.addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                        }
                    }
                    chatStream.appendChild(a);
                }
            } catch (err) {}
        });
        
        const container = document.getElementById('chat-stream-container');
        if (container) container.scrollTop = container.scrollHeight;
    };

    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            currentSessionId = Date.now().toString();
            sessions[currentSessionId] = { title: "New Session", pinned: false, history: [] };
            renderSessions();
            renderChatHistory([]);
            promptInput.focus();
        });
    }

    // --- Input Listener ---
    promptInput.addEventListener('input', (e) => {
        const val = e.target.value;
        
        if (val.startsWith('/')) {
            promptContainer.classList.add('border-emerald-500/50', 'shadow-[0_0_15px_rgba(16,185,129,0.1)]');
            promptInput.classList.add('text-emerald-400');
            promptInput.classList.remove('text-white', 'text-crimson');
            commandPalette.classList.remove('hidden');
            commandPalette.classList.add('flex');
            
            resetToArtemis();
            sendBtnText.textContent = "Execute Macro";
            
        } else if (val.toLowerCase().startsWith('@prometheus')) {
            promptContainer.classList.add('border-crimson/50', 'shadow-[0_0_15px_rgba(220,38,38,0.1)]');
            promptInput.classList.add('text-crimson-light');
            promptInput.classList.remove('text-white', 'text-emerald-400');
            commandPalette.classList.add('hidden');
            commandPalette.classList.remove('flex');
            
            switchToPrometheus();
            
        } else {
            promptContainer.classList.remove('border-emerald-500/50', 'shadow-[0_0_15px_rgba(16,185,129,0.1)]', 'border-crimson/50', 'shadow-[0_0_15px_rgba(220,38,38,0.1)]');
            promptContainer.classList.add('border-white/10');
            promptInput.classList.remove('text-emerald-400', 'text-crimson-light');
            promptInput.classList.add('text-white');
            commandPalette.classList.add('hidden');
            commandPalette.classList.remove('flex');
            
            resetToArtemis();
            sendBtnText.textContent = "Execute Local";
        }
    });

    function switchToPrometheus() {
        if (activePersona === 'prometheus') return;
        activePersona = 'prometheus';
        hologram.setPersona('prometheus');
        
        personaBadge.style.color = '#dc2626'; 
        personaIcon.className = "ph ph-brain text-lg";
        personaTitle.textContent = "PROMETHEUS STRATEGIC CORE";
        
        holoTitle.textContent = "PROMETHEUS ACTIVE";
        holoTitle.style.color = '#dc2626';
        holoSubtitle.textContent = "Strategic Synthesis • Gemini API Routing";
        
        sendBtn.style.backgroundImage = "linear-gradient(to right, #dc2626, #991b1b)";
        sendBtnText.textContent = "Synthesize (API)";
        
        contextDock.classList.remove('hidden', 'opacity-0', 'h-0');
        contextDock.classList.add('h-10', 'opacity-100');
        modelSelect.classList.remove('hidden');
    }

    function resetToArtemis() {
        if (activePersona === 'artemis') return;
        activePersona = 'artemis';
        hologram.setPersona('artemis');
        
        personaBadge.style.color = '#DDAA33'; 
        personaIcon.className = "ph ph-cpu text-lg";
        personaTitle.textContent = "ARTEMIS CORE";
        
        holoTitle.textContent = "ARTEMIS QUANTITATIVE CORE";
        holoTitle.style.color = '#ffffff';
        holoSubtitle.textContent = "NLP Processing Active • Zero-API Routing";
        
        sendBtn.style.backgroundImage = "linear-gradient(to right, #DDAA33, #997722)";
        
        contextDock.classList.add('opacity-0', 'h-0');
        setTimeout(() => { if (activePersona === 'artemis') contextDock.classList.add('hidden'); }, 300);
        clearContextPayload();
        modelSelect.classList.add('hidden');
    }

    // --- Context Dock Actions ---
    document.getElementById('attach-grid-btn').addEventListener('click', () => {
        activeContextPayload = { type: 'active_grid_data' };
        contextStatusBadge.textContent = "Grid Attached";
        contextStatusBadge.className = "px-2 py-0.5 rounded bg-emerald-500/10 text-[9px] font-mono text-emerald-400 border border-emerald-500/30 uppercase tracking-widest";
        clearContextBtn.classList.remove('hidden');
    });

    clearContextBtn.addEventListener('click', clearContextPayload);

    function clearContextPayload() {
        activeContextPayload = null;
        contextStatusBadge.textContent = "Blank Slate";
        contextStatusBadge.className = "px-2 py-0.5 rounded bg-white/5 text-[9px] font-mono text-gray-500 border border-white/10 uppercase tracking-widest";
        clearContextBtn.classList.add('hidden');
    }

    document.querySelectorAll('.command-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            promptInput.value = e.currentTarget.getAttribute('data-prompt');
            commandPalette.classList.add('hidden');
            promptInput.focus();
            promptInput.dispatchEvent(new Event('input')); 
        });
    });

    document.querySelectorAll('.quick-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            promptInput.value = e.currentTarget.getAttribute('data-prompt');
            promptInput.focus();
            promptInput.dispatchEvent(new Event('input'));
        });
    });

    // --- Floating Canvas UI ---
    let isDraggingCanvas = false;
    let dragStartX, dragStartY, initialLeft, initialTop;

    const artifactHeader = artifactPane.querySelector('.h-14');
    if (artifactHeader) {
        artifactHeader.style.cursor = 'move';
        
        artifactHeader.addEventListener('mousedown', (e) => {
            if(e.target.closest('button')) return; 
            
            isDraggingCanvas = true;
            dragStartX = e.clientX;
            dragStartY = e.clientY;
            
            if (!artifactPane.classList.contains('is-floating')) {
                artifactPane.classList.add('is-floating');
                const rect = artifactPane.getBoundingClientRect();
                artifactPane.style.position = 'fixed';
                artifactPane.style.left = rect.left + 'px';
                artifactPane.style.top = rect.top + 'px';
                artifactPane.style.height = '600px';
                artifactPane.style.width = '800px';
                artifactPane.style.resize = 'both';
                artifactPane.style.overflow = 'auto';
                artifactPane.style.zIndex = '9999';
                artifactPane.style.boxShadow = '0 25px 50px -12px rgba(0, 0, 0, 1)';
                artifactPane.classList.remove('artifact-slide-in'); 
            }
            
            initialLeft = parseInt(artifactPane.style.left || 0, 10);
            initialTop = parseInt(artifactPane.style.top || 0, 10);
            artifactPane.style.transition = 'none'; 
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDraggingCanvas) return;
            const dx = e.clientX - dragStartX;
            const dy = e.clientY - dragStartY;
            artifactPane.style.left = `${initialLeft + dx}px`;
            artifactPane.style.top = `${initialTop + dy}px`;
        });

        document.addEventListener('mouseup', () => {
            if (isDraggingCanvas) {
                isDraggingCanvas = false;
            }
        });
    }

    const openArtifactCanvas = (parsedData) => {
        let htmlContent = '';
        const contentArea = document.getElementById('artifact-content');

        if (parsedData.type === 'interactive_table') {
            htmlContent = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl text-white font-light tracking-tight">${parsedData.title || 'Data Grid'}</h2>
                    <div class="flex space-x-2">
                        <button class="pin-widget-btn text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 px-3 py-1.5 rounded transition-colors flex items-center shadow-lg" title="Pin to Dashboard"><i class="ph ph-push-pin mr-1"></i> Pin</button>
                        <button id="download-tabulator" class="text-xs text-gold border border-gold/30 hover:bg-gold/10 px-3 py-1.5 rounded transition-colors flex items-center shadow-lg"><i class="ph ph-download-simple mr-1"></i> Export Data</button>
                    </div>
                </div>
                <div id="tabulator-table" class="w-full text-sm"></div>
            `;
            contentArea.innerHTML = htmlContent;
            
            setTimeout(() => {
                const tableCols = parsedData.columns.map((colName, index) => ({ 
                    title: colName, field: `col${index}`, headerFilter: "input" 
                }));
                
                const tableData = parsedData.rows.map(rowArray => {
                    let obj = {};
                    parsedData.columns.forEach((_, index) => { obj[`col${index}`] = rowArray[index]; });
                    return obj;
                });
                
                const table = new Tabulator("#tabulator-table", {
                    data: tableData, columns: tableCols, layout: "fitColumns", theme: "midnight", pagination: "local", paginationSize: 15,
                });
                
                document.getElementById('download-tabulator').addEventListener('click', () => { table.download("csv", "artemis_data_export.csv"); });
            }, 100);
        } 
        else if (parsedData.type === 'interactive_chart') {
            htmlContent = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl text-white font-light tracking-tight">${parsedData.title || 'Visual Analytics'}</h2>
                    <button class="pin-widget-btn text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 px-3 py-1.5 rounded transition-colors flex items-center shadow-lg" title="Pin to Dashboard"><i class="ph ph-push-pin mr-1"></i> Pin Widget</button>
                </div>
                <div class="p-6 glass-card rounded-sm border border-white/5 shadow-2xl relative w-full flex flex-col" style="min-height: 400px;">
                    <div class="relative w-full flex-1"><canvas id="gen-ui-chart"></canvas></div>
                </div>
            `;
            contentArea.innerHTML = htmlContent;
            
            setTimeout(() => {
                const ctx = document.getElementById('gen-ui-chart');
                if (!ctx) return;
                Chart.defaults.color = '#888'; 
                Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
                
                let bgColors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444'];
                new Chart(ctx, {
                    type: parsedData.chartType || 'bar',
                    data: { labels: parsedData.labels, datasets: [{ data: parsedData.data, backgroundColor: bgColors, borderWidth: 0, borderRadius: 4 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                });
            }, 250);
        }

        const pinBtn = contentArea.querySelector('.pin-widget-btn');
        if (pinBtn) {
            pinBtn.addEventListener('click', () => {
                let existingPins = [];
                try { existingPins = JSON.parse(localStorage.getItem('xoala_pinned_widgets')) || []; } catch(e) {}
                existingPins.push(parsedData);
                localStorage.setItem('xoala_pinned_widgets', JSON.stringify(existingPins));
                pinBtn.innerHTML = `<i class="ph ph-check text-emerald-400 mr-1"></i> <span class="text-emerald-400">Pinned!</span>`;
                setTimeout(() => { pinBtn.innerHTML = `<i class="ph ph-push-pin mr-1"></i> Pin Widget`; }, 2000);
            });
        }

        if (!artifactPane.classList.contains('is-floating')) {
            artifactPane.style.width = '55%';
            artifactPane.classList.remove('opacity-0');
            artifactPane.classList.add('artifact-slide-in');
        }
    };

    const closeArtifactBtn = document.getElementById('close-artifact-btn');
    if (closeArtifactBtn) {
        closeArtifactBtn.addEventListener('click', () => {
            artifactPane.classList.remove('is-floating');
            artifactPane.style = ''; 
            artifactPane.style.width = '0px';
            artifactPane.classList.add('opacity-0');
            artifactPane.classList.remove('artifact-slide-in');
        });
    }

    // --- Execution Engine ---
    if (sendBtn && promptInput) {
        sendBtn.addEventListener('click', async () => {
            const val = promptInput.value.trim();
            if (!val) return;

            voiceEngine.stop();
            if(hologramText) hologramText.style.opacity = '0';

            // FIX: Instantly save session title & user prompt to memory
            if (!sessions[currentSessionId]) { 
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", pinned: false, history: [] }; 
            } else if (sessions[currentSessionId].title === "New Session" || !sessions[currentSessionId].history.length) {
                sessions[currentSessionId].title = val.substring(0, 24) + "...";
            }
            sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
            localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
            renderSessions();

            // Display User Message
            const userMsg = document.createElement('div');
            userMsg.className = "self-end bg-surface/80 backdrop-blur border border-white/10 rounded-sm p-3 max-w-[85%] text-[13px] text-gray-300 shadow-md mt-4 relative z-10";
            userMsg.innerHTML = `<div class="text-[10px] font-mono text-gold mb-1 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${val}`;
            chatStream.appendChild(userMsg);
            
            promptInput.value = '';
            promptInput.dispatchEvent(new Event('input')); 
            
            let actionType = 'artemis_query'; 
            let targetPersona = 'Artemis';
            let macroCmd = '';
            
            if (val.startsWith('/')) {
                actionType = 'execute_macro';
                macroCmd = val.substring(1).trim();
            } else if (val.toLowerCase().startsWith('@prometheus')) {
                actionType = 'prometheus_query';
                targetPersona = 'Prometheus';
            }
            
            const container = document.getElementById('chat-stream-container');
            if (container) container.scrollTop = container.scrollHeight;

            const aiMsg = document.createElement('div');
            aiMsg.className = "self-start bg-transparent w-full flex items-start space-x-3 mt-2 relative z-10";
            const reqStartTime = Date.now();
            
            const isMacro = actionType === 'execute_macro';
            const loadingText = actionType === 'prometheus_query' 
                ? 'Synthesizing Strategy...' 
                : (isMacro ? 'Executing Terminal Macro...' : 'Analyzing Data Lake...');
                
            const colorClass = actionType === 'prometheus_query' ? 'text-crimson-light' : (isMacro ? 'text-emerald-400' : 'text-gold');
            
            aiMsg.innerHTML = `
                <div class="w-8 h-8 rounded-sm border border-${colorClass.split('-')[1]}/50 flex items-center justify-center bg-obsidian flex-shrink-0 shadow-[0_0_8px_currentColor] relative overflow-hidden">
                    <i class="ph ph-${targetPersona === 'Prometheus' ? 'brain' : 'cpu'} ${colorClass} text-sm animate-pulse"></i>
                </div>
                <div class="text-[13px] ${colorClass} font-mono pt-2 tracking-widest uppercase animate-pulse">${loadingText}</div>
            `;
            chatStream.appendChild(aiMsg);
            if (container) container.scrollTop = container.scrollHeight;

            hologram.setState(isMacro ? 'macro' : 'thinking');

            // NEW: Attempt WebGPU AST extraction silently if engine is ready
            let clientAstPayload = null;
            if (actionType === 'artemis_query' && localAI.isReady && !val.includes("using exact confirmed columns")) {
                clientAstPayload = await localAI.extractAST(val);
            }

            try {
                // FIX: Added session_id parameter to explicitly link frontend to backend Drive logger
                const requestPayload = { 
                    action: actionType, macro: macroCmd, prompt: val, 
                    history: sessions[currentSessionId].history.slice(0, -1), // Send history excluding current msg
                    secret: 'system_dashboard_init', 
                    model: modelSelect ? modelSelect.value : 'gemini-3.5-flash-lite',
                    context_payload: activeContextPayload,
                    session_id: currentSessionId,
                    client_ast: clientAstPayload // NEW: Passes to backend
                };

                const response = await fetch(ARTEMIS_API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestPayload)
                });

                const textResponse = await response.text();
                let data;
                let isJson = true;
                try { data = JSON.parse(textResponse); } catch(e) { isJson = false; data = textResponse; }

                if (!response.ok) { throw new Error((isJson && data.error) ? data.error : `HTTP Error ${response.status}: ${data}`); }

                const latency = Date.now() - reqStartTime;
                hologram.setState('idle');

                if (data.status === 200 && data.response) {
                    let aiText = data.response;
                    
                    // FIX: Save AI response immediately to local memory
                    sessions[currentSessionId].history.push({role: "model", parts: [{text: aiText}]});
                    localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));

                    const jsonBlockRegex = /\`\`\`json\s*([\s\S]*?)\s*\`\`\`/;
                    const match = aiText.match(jsonBlockRegex);
                    let parsedGenUI = null;

                    if (match && match[1]) {
                        try {
                            parsedGenUI = JSON.parse(match[1]);
                            aiText = aiText.replace(jsonBlockRegex, '').trim();
                        } catch (e) {}
                    }

                    const formattedText = marked.parse(aiText);
                    
                    aiMsg.innerHTML = `
                        <div class="w-8 h-8 rounded-sm border border-${colorClass.split('-')[1]}/50 flex items-center justify-center bg-obsidian flex-shrink-0 shadow-[0_0_8px_currentColor] relative overflow-hidden">
                            <i class="ph ph-${targetPersona === 'Prometheus' ? 'brain' : 'cpu'} ${colorClass} text-sm"></i>
                        </div>
                        <div class="bg-surface/90 border border-white/5 rounded-sm p-4 text-[13px] text-gray-200 shadow-lg w-full max-w-[calc(100%-2.5rem)] backdrop-blur-sm">
                            <div class="text-[9px] font-mono ${colorClass} mb-2 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>${targetPersona} Execution (${latency}ms)</span></div>
                                <div class="text-gray-500">${targetPersona === 'Prometheus' ? 'GEMINI API' : (clientAstPayload ? 'WEBGPU LLM' : 'LOCAL NLP')}</div>
                            </div>
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            
                            <div id="gen-ui-container-${latency}"></div>

                            <div class="flex items-center space-x-3 border-t border-white/5 pt-2 mt-3">
                                <button class="copy-btn text-[11px] text-gray-500 hover:text-white transition-colors flex items-center space-x-1"><i class="ph ph-copy"></i><span>Copy</span></button>
                                <button class="speak-btn text-[11px] text-gray-500 hover:text-white transition-colors flex items-center space-x-1"><i class="ph ph-speaker-high"></i><span>Speak</span></button>
                            </div>
                        </div>
                    `;

                    if (parsedGenUI) {
                        const containerId = `gen-ui-container-${latency}`;
                        const dynamicContainer = aiMsg.querySelector(`#${containerId}`);

                        if (parsedGenUI.type === 'column_confirmation') {
                            let slotsHTML = (parsedGenUI.slots || []).map((slot, sIdx) => {
                                const candidates = slot.candidates || [slot.selected_column];
                                const optionsHTML = candidates.map(c => `<option value="${c}" ${c === slot.selected_column ? 'selected' : ''}>${c}</option>`).join('');
                                return `
                                    <div class="bg-black/40 border border-white/5 p-3 rounded-sm space-y-1.5 mt-2">
                                        <div class="flex items-center justify-between">
                                            <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-semibold">${slot.role || `Column ${sIdx + 1}`}</span>
                                        </div>
                                        <div class="relative">
                                            <select class="column-slot-select w-full bg-surface border border-white/10 text-white font-mono text-xs rounded px-2.5 py-1.5 outline-none focus:border-gold/50 cursor-pointer" data-slot-index="${sIdx}">${optionsHTML}</select>
                                        </div>
                                    </div>
                                `;
                            }).join('');

                            dynamicContainer.innerHTML = `
                                <div class="column-confirmation-widget border border-gold/30 bg-surface/95 rounded-sm p-4 mt-4 w-full shadow-2xl">
                                    <div class="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                                        <div class="flex items-center space-x-2">
                                            <i class="ph ph-sliders-horizontal text-gold text-base"></i>
                                            <span class="text-xs font-mono tracking-widest uppercase text-white font-bold">Confirm Target Schema</span>
                                        </div>
                                    </div>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">${slotsHTML}</div>
                                    <div class="flex items-center justify-end pt-3 border-t border-white/5">
                                        <button class="confirm-column-btn bg-gradient-to-r from-gold-light to-gold text-obsidian font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm hover:shadow-[0_0_12px_rgba(221,170,51,0.4)] transition-all flex items-center space-x-1.5">
                                            <i class="ph ph-check-circle font-bold text-sm"></i><span>Confirm & Execute</span>
                                        </button>
                                    </div>
                                </div>
                            `;

                            const confirmBtn = dynamicContainer.querySelector('.confirm-column-btn');
                            confirmBtn.addEventListener('click', () => {
                                const selects = dynamicContainer.querySelectorAll('.column-slot-select');
                                const confirmedColumns = Array.from(selects).map(s => s.value);
                                
                                const executePrompt = `Run ${parsedGenUI.query_intent || 'analysis'} using exact confirmed columns: ["${confirmedColumns[0]}"]. Execute the calculation using your custom GAS tools.`;
                                
                                confirmBtn.disabled = true;
                                confirmBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin text-obsidian"></i><span class="text-obsidian">Executing...</span>`;
                                
                                promptInput.value = executePrompt;
                                sendBtn.click();
                            });

                        } else {
                            dynamicContainer.innerHTML = `<button class="open-ui-btn text-[11px] ${colorClass} font-medium bg-white/5 border border-white/10 px-2 py-0.5 rounded-sm mt-3 flex items-center"><i class="ph ph-layout mr-1"></i>View Artifact</button>`;
                            const openBtn = dynamicContainer.querySelector('.open-ui-btn');
                            openBtn.addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                        }
                    }

                    aiMsg.querySelector('.copy-btn').addEventListener('click', () => { navigator.clipboard.writeText(aiText); });
                    const speakBtn = aiMsg.querySelector('.speak-btn');
                    speakBtn.addEventListener('click', () => {
                        if (window.speechSynthesis && window.speechSynthesis.speaking) {
                            voiceEngine.stop();
                            speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`;
                            hologram.setState('idle');
                        } else {
                            speakBtn.innerHTML = `<i class="ph ph-stop text-red-400"></i><span class="text-red-400">Stop</span>`;
                            voiceEngine.speak(
                                aiText, targetPersona.toLowerCase(),
                                () => hologram.setState('speaking'),
                                () => { hologram.setState('idle'); speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`; },
                                (freq) => hologram.setAudioPulse(freq)
                            );
                        }
                    });

                    if (voiceEngine.autoSpeak && !isMacro) {
                        voiceEngine.speak(
                            aiText, targetPersona.toLowerCase(), 
                            () => hologram.setState('speaking'), 
                            () => hologram.setState('idle'), 
                            (freq) => hologram.setAudioPulse(freq)
                        );
                    }

                } else {
                    throw new Error(data.error || "Execution failed without a specific error code.");
                }
            } catch (err) {
                hologram.setState('idle');
                const errDetails = err.message || "Network Error: Unable to reach Core.";
                aiMsg.innerHTML = `
                    <div class="bg-red-500/10 border border-red-500/20 rounded-sm p-4 text-[13px] text-red-200 shadow-lg w-full max-w-[calc(100%-2.5rem)] backdrop-blur-sm mt-2 ml-11">
                        <div class="text-[10px] font-mono text-red-400 mb-2 uppercase tracking-widest flex items-center space-x-1 border-b border-red-500/20 pb-2">
                            <i class="ph ph-warning-circle"></i><span>System Exception Detected</span>
                        </div>
                        <div class="font-mono whitespace-pre-wrap">${errDetails}</div>
                    </div>
                `;
            }
            if (container) container.scrollTop = container.scrollHeight;
        });

        promptInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
        });
    }
    
    // INITIALIZATION RENDER CALLS
    if (!sessions[currentSessionId]) {
        sessions[currentSessionId] = { title: "New Session", pinned: false, history: [] };
    }
    renderSessions();
    renderChatHistory(sessions[currentSessionId].history);
});
