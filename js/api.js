/**
 * === XOALA COMMAND CENTER: ARTEMIS UI & SESSION MANAGER ===
 * 
 * Purpose: Handles all frontend logic for the Artemis AI Terminal.
 * Responsibilities:
 * 1. Rendering the 3D physics-based hologram engine.
 * 2. Managing WebSocket/HTTP connections to the Cloudflare Middleware.
 * 3. Rendering AI Chat sequences, including Generative UI (Data Canvas).
 * 4. Human-in-the-Loop (HITL) column confirmation forms.
 * 5. Audio Synthesis and Speech-to-Text Dictation.
 */

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

// ==========================================
// 1. 3D HTML5 CANVAS HOLOGRAM ENGINE (Interactive Physics)
// Purpose: Renders the central glowing core indicating AI state (thinking, speaking, macro execution).
// ==========================================
class ArtemisHologram {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.width = 400;
        this.height = 400;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.particles = [];
        this.time = 0;
        this.state = 'idle'; 
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

        for (let i = 0; i < 180; i++) {
            const theta = Math.acos(2 * Math.random() - 1);
            const phi = 2 * Math.PI * Math.random();
            const r = 120 + (Math.random() * 30 - 15);
            this.particles.push({
                x: r * Math.sin(theta) * Math.cos(phi),
                y: r * Math.sin(theta) * Math.sin(phi),
                z: r * Math.cos(theta),
                size: Math.random() * 1.5 + 0.5,
                color: Math.random() > 0.3 ? 'rgba(221, 170, 51, 0.8)' : 'rgba(16, 185, 129, 0.8)'
            });
        }

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
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

        const grad = this.ctx.createRadialGradient(cx, cy, 0, cx, cy, coreRadius * 2.5);
        grad.addColorStop(0, '#FFFFFF');
        grad.addColorStop(0.2, '#DDAA33');
        grad.addColorStop(0.6, this.state === 'macro' ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.3)');
        grad.addColorStop(1, 'transparent');
        
        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(cx, cy, coreRadius * 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        this.drawRing(60, this.time * 1.2 + parallaxY, this.time * 0.9 + parallaxX, 0, 'rgba(255,255,255,0.4)', true);
        this.drawRing(100, 0.4 + parallaxY, this.time * 0.7 + parallaxX, this.time * 0.5, 'rgba(221,170,51,0.5)', false);
        this.drawRing(140, -this.time * 0.3 + parallaxY, 0.9 + parallaxX, -this.time * 0.6, 'rgba(16,185,129,0.3)', true);

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
// 2. VOICE SYNTHESIS ENGINE
// Purpose: Utilizes browser-native Text-to-Speech API to vocalize Artemis's responses.
// ==========================================
class VoiceEngine {
    constructor() {
        this.synth = window.speechSynthesis;
        this.autoSpeak = localStorage.getItem('artemis_voice_enabled') !== 'false';
        this.voice = null;
        
        if (this.synth) {
            const loadVoices = () => {
                const voices = this.synth.getVoices();
                this.voice = voices.find(v => v.name.includes('Google UK English Female') || v.name.includes('Samantha')) 
                          || voices.find(v => v.lang.startsWith('en-GB')) 
                          || voices[0];
            };
            loadVoices();
            if (this.synth.onvoiceschanged !== undefined) this.synth.onvoiceschanged = loadVoices;
        }
    }

    cleanText(markdown) {
        return markdown.replace(/```json[\s\S]*?```/g, '').replace(/```[\s\S]*?```/g, '').replace(/[*_~`#>]/g, '').trim();
    }

    speak(text, onStart, onEnd, onBoundary) {
        if (!this.synth) return;
        this.synth.cancel();

        const clean = this.cleanText(text);
        if (!clean) return;

        const utterance = new SpeechSynthesisUtterance(clean);
        if (this.voice) utterance.voice = this.voice;
        utterance.rate = 1.05;

        utterance.onstart = () => { if (onStart) onStart(); };
        utterance.onend = () => { if (onEnd) onEnd(); };
        utterance.onerror = () => { if (onEnd) onEnd(); };
        utterance.onboundary = () => { if (onBoundary) onBoundary(Math.random()); };

        this.synth.speak(utterance);
    }

    stop() {
        if (this.synth && this.synth.speaking) this.synth.cancel();
    }
}

// ==========================================
// 3. SPEECH-TO-TEXT DICTATION ENGINE
// Purpose: Enables users to speak queries directly into the terminal input box.
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
        this.input.placeholder = "Type '/' for macros, or query data lake...";
    }
}

// ==========================================
// 4. UI CONTROLLER & SESSION MANAGER
// Purpose: Binds frontend components, manages local storage session history, handles message rendering and HITL forms.
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    const hologram = new ArtemisHologram('jarvis-core-canvas');
    const voiceEngine = new VoiceEngine();

    const promptInput = document.getElementById('prompt-input');
    const promptContainer = document.getElementById('prompt-container');
    const commandPalette = document.getElementById('command-palette');
    const sendBtn = document.getElementById('send-btn');
    const chatStream = document.getElementById('chat-stream'); 
    const hologramContainer = document.getElementById('artemis-empty-state');
    const hologramText = document.getElementById('hologram-text');
    const artifactPane = document.getElementById('artemis-artifact-pane');
    const closeArtifactBtn = document.getElementById('close-artifact-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionsList = document.getElementById('chat-sessions-list');
    const pinnedList = document.getElementById('pinned-sessions-list');
    const pinnedHeader = document.getElementById('pinned-header');
    const voiceAutoToggleBtn = document.getElementById('voice-auto-toggle-btn');
    const voiceAutoIcon = document.getElementById('voice-auto-icon');
    const voiceAutoStatus = document.getElementById('voice-auto-status');
    const modelSelect = document.getElementById('model-select');

    let currentSessionId = Date.now().toString();
    let sessions = {};

    new SpeechInputEngine('prompt-input', 'voice-dictation-btn');

    // -- Command Palette Input Detection --
    if (promptInput && promptContainer && commandPalette) {
        promptInput.addEventListener('input', (e) => {
            const val = e.target.value;
            if (val.startsWith('/')) {
                promptContainer.classList.add('border-emerald-500/50', 'shadow-[0_0_15px_rgba(16,185,129,0.1)]');
                promptContainer.classList.remove('border-white/10');
                promptInput.classList.add('text-emerald-400', 'font-mono');
                promptInput.classList.remove('text-white', 'font-sans');
                
                commandPalette.classList.remove('hidden');
                commandPalette.classList.add('flex');
            } else {
                promptContainer.classList.remove('border-emerald-500/50', 'shadow-[0_0_15px_rgba(16,185,129,0.1)]');
                promptContainer.classList.add('border-white/10');
                promptInput.classList.remove('text-emerald-400', 'font-mono');
                promptInput.classList.add('text-white', 'font-sans');
                
                commandPalette.classList.add('hidden');
                commandPalette.classList.remove('flex');
            }
        });

        document.querySelectorAll('.command-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                promptInput.value = e.currentTarget.getAttribute('data-prompt');
                commandPalette.classList.add('hidden');
                promptInput.focus();
            });
        });
    }

    // -- Session Initialization --
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
    } catch (e) { sessions = {}; }

    const updateVoiceToggleUI = () => {
        if (!voiceAutoIcon || !voiceAutoStatus) return;
        if (voiceEngine.autoSpeak) {
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
            voiceEngine.autoSpeak = !voiceEngine.autoSpeak;
            localStorage.setItem('artemis_voice_enabled', voiceEngine.autoSpeak);
            if (!voiceEngine.autoSpeak) voiceEngine.stop();
            updateVoiceToggleUI();
        });
    }

    const getAvatarNode = (isThinking = false) => `
        <div class="w-8 h-8 rounded-sm border border-emerald-500/50 flex items-center justify-center bg-obsidian flex-shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.4)] relative overflow-hidden">
             <i class="ph ph-cpu text-emerald-400 text-sm ${isThinking ? 'animate-pulse' : ''}"></i>
        </div>
    `;

    document.querySelectorAll('.quick-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            promptInput.value = e.currentTarget.getAttribute('data-prompt');
            promptInput.focus();
        });
    });

    // -- Floating & Draggable Data Canvas Logic --
    let isDraggingCanvas = false;
    let dragStartX, dragStartY, initialLeft, initialTop;

    const artifactHeader = artifactPane.querySelector('.h-14');
    if (artifactHeader) {
        artifactHeader.style.cursor = 'move';
        
        artifactHeader.addEventListener('mousedown', (e) => {
            if(e.target.closest('button')) return; 
            
            isDraggingCanvas = true;
            startX = e.clientX;
            startY = e.clientY;
            
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
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
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

    if (closeArtifactBtn) {
        closeArtifactBtn.addEventListener('click', () => {
            artifactPane.classList.remove('is-floating');
            artifactPane.style = ''; 
            artifactPane.style.width = '0px';
            artifactPane.classList.add('opacity-0');
            artifactPane.classList.remove('artifact-slide-in');
        });
    }

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

    function renderColumnConfirmationCard(payload) {
        const slots = payload.slots || [];
        const queryIntent = payload.query_intent || "Quantitative Analysis";
        
        let slotsHTML = slots.map((slot, sIdx) => {
            const candidates = slot.candidates || [slot.selected_column];
            const optionsHTML = candidates.map(c => 
                `<option value="${c}" ${c === slot.selected_column ? 'selected' : ''}>${c}</option>`
            ).join('');

            return `
                <div class="bg-black/40 border border-white/5 p-3 rounded-sm space-y-1.5 mt-2">
                    <div class="flex items-center justify-between">
                        <span class="text-[10px] font-mono uppercase tracking-widest text-gold font-semibold">${slot.role || `Column ${sIdx + 1}`}</span>
                        <span class="text-[9px] font-mono text-gray-500">${slot.inferred_type || 'String'}</span>
                    </div>
                    <div class="relative">
                        <select class="column-slot-select w-full bg-surface border border-white/10 text-white font-mono text-xs rounded px-2.5 py-1.5 outline-none focus:border-gold/50 cursor-pointer" data-slot-index="${sIdx}">
                            ${optionsHTML}
                        </select>
                    </div>
                    ${slot.sample ? `<div class="text-[9px] font-mono text-gray-400 mt-1">Sample: <span class="text-gray-300 font-semibold">${slot.sample}</span></div>` : ''}
                </div>
            `;
        }).join('');

        return `
            <div class="column-confirmation-widget border border-gold/30 bg-surface/95 rounded-sm p-4 mt-4 w-full shadow-2xl">
                <div class="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
                    <div class="flex items-center space-x-2">
                        <i class="ph ph-sliders-horizontal text-gold text-base"></i>
                        <span class="text-xs font-mono tracking-widest uppercase text-white font-bold">Confirm Target Schema</span>
                    </div>
                    <span class="text-[9px] font-mono uppercase bg-gold/10 text-gold px-2 py-0.5 rounded border border-gold/20 truncate max-w-[120px]" title="${queryIntent}">${queryIntent}</span>
                </div>
                <p class="text-xs text-gray-300">Artemis identified candidate database fields. Verify or switch columns below before execution:</p>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
                    ${slotsHTML}
                </div>
                <div class="flex items-center justify-end pt-3 border-t border-white/5">
                    <button class="confirm-column-btn bg-gradient-to-r from-gold-light to-gold text-obsidian font-bold text-[11px] uppercase tracking-wider px-4 py-2 rounded-sm hover:shadow-[0_0_12px_rgba(221,170,51,0.4)] transition-all flex items-center space-x-1.5">
                        <i class="ph ph-check-circle font-bold text-sm"></i>
                        <span>Confirm & Execute</span>
                    </button>
                </div>
            </div>
        `;
    }

    const renderChatHistory = (historyArray) => {
        if (!chatStream) return;
        chatStream.innerHTML = '';
        
        if (!historyArray || historyArray.length === 0) {
            if(hologramText) {
                hologramText.style.opacity = '1';
            }
            return;
        }

        if(hologramText) {
            hologramText.style.opacity = '0';
        }

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

                    let genUIHtml = '';
                    if (parsedGenUI) {
                        if (parsedGenUI.type === 'column_confirmation') {
                            genUIHtml = renderColumnConfirmationCard(parsedGenUI);
                        } else {
                            genUIHtml = `<button class="open-ui-btn text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-sm mt-3"><i class="ph ph-layout mr-1"></i>Open Data Grid</button>`;
                        }
                    }

                    let logsHtml = '';
                    if (msg.parts[0].logs && msg.parts[0].logs.length > 0) {
                        const logItems = msg.parts[0].logs.map(log => 
                            `<div class="flex justify-between items-center text-[10px] text-gray-400 border-b border-white/5 py-1">
                                <span><i class="ph ph-gear-six text-emerald-500 mr-1"></i> ${log.tool}</span>
                                <span class="text-gray-500">${log.duration}ms</span>
                            </div>`
                        ).join('');
                        logsHtml = `
                            <div class="mb-3 bg-black/40 rounded-sm border border-white/5 p-2 font-mono">
                                <div class="text-[9px] text-gray-500 uppercase tracking-widest mb-1 flex items-center"><i class="ph ph-activity mr-1"></i>Execution Trace</div>
                                ${logItems}
                            </div>
                        `;
                    }

                    a.innerHTML = `
                        ${getAvatarNode(false)}
                        <div class="bg-surface/90 border border-white/5 rounded-sm p-4 text-[13px] text-gray-200 shadow-lg w-full max-w-[calc(100%-2.5rem)] backdrop-blur-sm">
                            ${logsHtml}
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${marked.parse(cleanText)}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-2 mt-3">
                                <button class="copy-btn text-[11px] text-gray-500 hover:text-gold transition-colors flex items-center space-x-1"><i class="ph ph-copy"></i><span>Copy</span></button>
                                <button class="speak-btn text-[11px] text-gray-500 hover:text-gold transition-colors flex items-center space-x-1"><i class="ph ph-speaker-high"></i><span>Speak</span></button>
                            </div>
                            ${parsedGenUI ? genUIHtml : ''}
                        </div>
                    `;

                    a.querySelector('.copy-btn').addEventListener('click', () => { navigator.clipboard.writeText(cleanText); });
                    
                    const speakBtn = a.querySelector('.speak-btn');
                    speakBtn.addEventListener('click', () => {
                        if (window.speechSynthesis && window.speechSynthesis.speaking) {
                            voiceEngine.stop();
                            speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`;
                            hologram.setState('idle');
                        } else {
                            speakBtn.innerHTML = `<i class="ph ph-stop text-red-400"></i><span class="text-red-400">Stop</span>`;
                            voiceEngine.speak(
                                cleanText,
                                () => hologram.setState('speaking'),
                                () => { hologram.setState('idle'); speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`; },
                                (freq) => hologram.setAudioPulse(freq)
                            );
                        }
                    });

                    // Execute Calculation from confirmed columns
                    if (parsedGenUI) {
                        if (parsedGenUI.type === 'column_confirmation') {
                            const confirmBtn = a.querySelector('.confirm-column-btn');
                            if (confirmBtn) {
                                confirmBtn.addEventListener('click', () => {
                                    const selects = a.querySelectorAll('.column-slot-select');
                                    const confirmedColumns = Array.from(selects).map(s => s.value);
                                    const executePrompt = `Run ${parsedGenUI.query_intent || 'analysis'} using exact confirmed columns: [${confirmedColumns.map(c => `"${c}"`).join(', ')}]. Execute the calculation using your custom GAS tools.`;
                                    
                                    confirmBtn.disabled = true;
                                    confirmBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin text-obsidian"></i><span class="text-obsidian">Executing...</span>`;
                                    
                                    promptInput.value = executePrompt;
                                    sendBtn.click();
                                });
                            }
                        } else {
                            const openBtn = a.querySelector('.open-ui-btn');
                            if (openBtn) {
                                openBtn.addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                            }
                        }
                    }

                    chatStream.appendChild(a);
                }
            } catch (err) { console.warn("Failed to load historical message", err); }
        });
        
        const container = document.getElementById('chat-stream-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    };

    if (sendBtn && promptInput) {
        sendBtn.addEventListener('click', async () => {
            const val = promptInput.value.trim();
            if (!val) return;

            voiceEngine.stop();
            
            if(hologramText) {
                hologramText.style.opacity = '0';
            }

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", pinned: false, history: [] };
            } else if (!sessions[currentSessionId].history || sessions[currentSessionId].history.length === 0) {
                sessions[currentSessionId].title = val.substring(0, 24) + "...";
            }

            const userMsg = document.createElement('div');
            userMsg.className = "self-end bg-surface/80 backdrop-blur border border-white/10 rounded-sm p-3 max-w-[85%] text-[13px] text-gray-300 shadow-md mt-4 relative z-10";
            userMsg.innerHTML = `<div class="text-[10px] font-mono text-gold mb-1 uppercase tracking-widest flex items-center justify-end space-x-1"><span>Admin User</span><i class="ph ph-user"></i></div>${val}`;
            chatStream.appendChild(userMsg);
            
            promptInput.value = '';
            
            let actionType = 'query_agent';
            let macroCmd = '';
            
            if (val.startsWith('/')) {
                actionType = 'execute_macro';
                macroCmd = val.substring(1).trim();
            }

            if (promptContainer) {
                promptContainer.classList.remove('border-emerald-500/50', 'shadow-[0_0_15px_rgba(16,185,129,0.1)]');
                promptContainer.classList.add('border-white/10');
                promptInput.classList.remove('text-emerald-400', 'font-mono');
                promptInput.classList.add('text-white', 'font-sans');
            }
            if (commandPalette) {
                commandPalette.classList.add('hidden');
                commandPalette.classList.remove('flex');
            }
            
            const container = document.getElementById('chat-stream-container');
            if (container) container.scrollTop = container.scrollHeight;

            const aiMsg = document.createElement('div');
            aiMsg.className = "self-start bg-transparent w-full flex items-start space-x-3 mt-2 relative z-10";
            const reqStartTime = Date.now();
            
            const isMacro = actionType === 'execute_macro';
            aiMsg.innerHTML = `
                ${getAvatarNode(true)}
                <div class="text-[13px] ${isMacro ? 'text-emerald-400' : 'text-gray-400'} font-mono pt-2 tracking-widest uppercase animate-pulse">
                    ${isMacro ? 'Executing direct macro script...' : 'Running quantitative query...'}
                </div>
            `;
            chatStream.appendChild(aiMsg);
            if (container) container.scrollTop = container.scrollHeight;

            hologram.setState(isMacro ? 'macro' : 'thinking');

            try {
                const historyPayload = sessions[currentSessionId].history || [];
                const response = await fetch(ARTEMIS_API_URL, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: actionType,
                        macro: macroCmd,
                        prompt: val, 
                        history: historyPayload, 
                        secret: 'system_dashboard_init',
                        model: modelSelect ? modelSelect.value : 'gemini-3.5-flash-lite'
                    })
                });

                let data;
                let isJson = true;
                try {
                    data = await response.json();
                } catch(e) {
                    isJson = false;
                    data = await response.text();
                }

                if (!response.ok) {
                    const errorMsg = isJson && data.error ? data.error : (isJson ? JSON.stringify(data) : data);
                    throw new Error(errorMsg || `HTTP Error ${response.status}`);
                }

                const latency = Date.now() - reqStartTime;
                hologram.setState('idle');

                if (data.status === 200 && data.response) {
                    let aiText = data.response;
                    const logsArray = data.logs || [];

                    sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
                    sessions[currentSessionId].history.push({role: "model", parts: [{text: aiText, logs: logsArray}]});
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

                    let genUIHtml = '';
                    if (parsedGenUI) {
                        if (parsedGenUI.type === 'column_confirmation') {
                            genUIHtml = renderColumnConfirmationCard(parsedGenUI);
                        } else {
                            genUIHtml = `<button class="open-ui-btn text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-sm mt-3"><i class="ph ph-layout mr-1"></i>Open Data Grid</button>`;
                        }
                    }

                    let logsHtml = '';
                    if (logsArray && logsArray.length > 0) {
                        const logItems = logsArray.map(log => 
                            `<div class="flex justify-between items-center text-[10px] text-gray-400 border-b border-white/5 py-1">
                                <span><i class="ph ph-gear-six text-emerald-500 mr-1"></i> ${log.tool}</span>
                                <span class="text-gray-500">${log.duration}ms</span>
                            </div>`
                        ).join('');
                        logsHtml = `
                            <div class="mb-3 bg-black/40 rounded-sm border border-white/5 p-2 font-mono">
                                <div class="text-[9px] text-gray-500 uppercase tracking-widest mb-1 flex items-center"><i class="ph ph-activity mr-1"></i>Execution Trace</div>
                                ${logItems}
                            </div>
                        `;
                    }

                    aiMsg.innerHTML = `
                        ${getAvatarNode(false)}
                        <div class="bg-surface/90 border border-white/5 rounded-sm p-4 text-[13px] text-gray-200 shadow-lg w-full max-w-[calc(100%-2.5rem)] backdrop-blur-sm">
                            <div class="text-[9px] font-mono ${isMacro ? 'text-emerald-400' : 'text-gold'} mb-2 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>${isMacro ? 'Macro Execution Complete' : 'Query Complete'} (${latency}ms)</span></div>
                                <div class="text-gray-500">${isMacro ? 'SCRIPT' : (modelSelect ? modelSelect.value.replace('gemini-','').toUpperCase() : 'FLASH')}</div>
                            </div>
                            ${logsHtml}
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-2 mt-3">
                                <button class="copy-btn text-[11px] text-gray-500 hover:text-gold transition-colors flex items-center space-x-1"><i class="ph ph-copy"></i><span>Copy</span></button>
                                <button class="speak-btn text-[11px] text-gray-500 hover:text-gold transition-colors flex items-center space-x-1"><i class="ph ph-speaker-high"></i><span>Speak</span></button>
                            </div>
                            ${parsedGenUI ? genUIHtml : ''}
                        </div>
                    `;

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
                                aiText,
                                () => hologram.setState('speaking'),
                                () => { hologram.setState('idle'); speakBtn.innerHTML = `<i class="ph ph-speaker-high"></i><span>Speak</span>`; },
                                (freq) => hologram.setAudioPulse(freq)
                            );
                        }
                    });

                    if (voiceEngine.autoSpeak && !isMacro) {
                        voiceEngine.speak(aiText, () => hologram.setState('speaking'), () => hologram.setState('idle'), (freq) => hologram.setAudioPulse(freq));
                    }

                    if (parsedGenUI) {
                        if (parsedGenUI.type === 'column_confirmation') {
                            const confirmBtn = aiMsg.querySelector('.confirm-column-btn');
                            if (confirmBtn) {
                                confirmBtn.addEventListener('click', () => {
                                    const selects = aiMsg.querySelectorAll('.column-slot-select');
                                    const confirmedColumns = Array.from(selects).map(s => s.value);
                                    const executePrompt = `Run ${parsedGenUI.query_intent || 'analysis'} using exact confirmed columns: [${confirmedColumns.map(c => `"${c}"`).join(', ')}]. Execute the calculation using your custom GAS tools.`;
                                    
                                    confirmBtn.disabled = true;
                                    confirmBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin text-obsidian"></i><span class="text-obsidian">Executing...</span>`;
                                    
                                    promptInput.value = executePrompt;
                                    sendBtn.click();
                                });
                            }
                        } else {
                            const openBtn = aiMsg.querySelector('.open-ui-btn');
                            if (openBtn) {
                                openBtn.addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                                if(isMacro) openArtifactCanvas(parsedGenUI); 
                            }
                        }
                    }
                    renderSessions();

                } else {
                    throw new Error(data.error || "Execution failed without a specific error code.");
                }
            } catch (err) {
                hologram.setState('idle');
                const errDetails = err.message || "Network Error: Unable to reach Artemis core.";
                aiMsg.innerHTML = `
                    ${getAvatarNode(false)}
                    <div class="bg-red-500/10 border border-red-500/20 rounded-sm p-4 text-[13px] text-red-200 shadow-lg w-full max-w-[calc(100%-2.5rem)] backdrop-blur-sm mt-2">
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

    if (!sessions[currentSessionId]) {
        sessions[currentSessionId] = { title: "New Session", pinned: false, history: [] };
    }
    renderSessions();
    renderChatHistory(sessions[currentSessionId].history);
});
