/**
 * === FILE: api.js (Xoala Command Center Frontend Engine) ===
 * STABLE RELEASE: Vector Cache Fixed, Elite HITL UI, Date Extraction
 */

import { DATA_LAKE_SCHEMA } from './schema.js';

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

// ==========================================
// DATE PARAMETER EXTRACTION ENGINE
// ==========================================
function extractDateFilter(prompt) {
    const rangeMatch = prompt.match(/(?:between|from)\s+([\d\-\/\w\s,]+)\s+(?:to|and)\s+([\d\-\/\w\s,]+)/i);
    if (rangeMatch) {
        const start = new Date(rangeMatch[1].trim());
        const end = new Date(rangeMatch[2].trim());
        if (!isNaN(start) && !isNaN(end)) {
            return {
                mode: "range",
                startDate: start.toISOString(),
                endDate: end.toISOString()
            };
        }
    }

    const singleMatch = prompt.match(/(?:on|for|dated?)\s+([0-9]{4}[-\/][0-9]{1,2}[-\/][0-9]{1,2}|[A-Za-z]+\s+[0-9]{1,2}(?:st|nd|rd|th)?,?\s+[0-9]{4}|[0-9]{1,2}\s+[A-Za-z]+(?:\s+[0-9]{4})?)/i);
    if (singleMatch) {
        const parsedDate = new Date(singleMatch[1].trim());
        if (!isNaN(parsedDate)) {
            const year = parsedDate.getUTCFullYear();
            const month = parsedDate.getUTCMonth();
            const day = parsedDate.getUTCDate();

            const startWindow = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
            const endWindow = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

            return {
                mode: "single_day",
                targetDateFormatted: parsedDate.toISOString().split('T')[0],
                startWindow: startWindow.toISOString(),
                endWindow: endWindow.toISOString()
            };
        }
    }
    return null;
}

// ==========================================
// 1. CLIENT-SIDE VECTOR EMBEDDING ENGINE
// ==========================================
class VectorEmbeddingEngine {
    constructor() {
        this.extractor = null;
        this.isReady = false;
        this.isLoading = false;
        this.intentAnchors = {};
        this.schemaVectors = [];
    }
    
    async initialize(statusCallback) {
        if (this.isReady) return;
        this.isLoading = true;
        statusCallback("Loading Vector Engine...");
        
        try {
            const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers');
            
            env.allowLocalModels = false;
            // FIX: Removed useCustomCache to prevent crashes. useBrowserCache handles persistent storage natively.
            env.useBrowserCache = true; 
            env.remoteHost = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev/';
            
            this.extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
                progress_callback: (x) => {
                    if (x.status === 'progress') {
                        statusCallback(`Downloading... ${Math.round(x.progress)}%`);
                    }
                }
            });

            statusCallback("Mapping Intents...");
            this.intentAnchors = {
                "time_series": await this.getVector("show trends over time history dates timeline velocity when was created time to response sla createdate"),
                "filter_count": await this.getVector("how many tickets count total number amount of items assigned"),
                "group_by_region": await this.getVector("break down by distribution categorize by country geography region jurisdiction of incorporation residence"),
                "group_by_manager": await this.getVector("break down by manager owner assigned workload staff distribution hubspot owner agent"),
                "group_by_stage": await this.getVector("break down by stage status pipeline state distribution bottleneck"),
                "risk_compliance": await this.getVector("risk score adverse media pep sanctions kyc compliance verification"),
                "financial_volume": await this.getVector("transaction volume incoming outgoing crypto conversion deal size turnover")
            };
            
            statusCallback("Mapping Data Lake...");
            this.schemaVectors = [];
            let batchSize = 60;
            
            for (let i = 0; i < DATA_LAKE_SCHEMA.length; i += batchSize) {
                let batch = DATA_LAKE_SCHEMA.slice(i, i + batchSize);
                let cleanBatch = batch.map(c => c.replace(/[_]/g, ' '));
                
                let outputs = await this.extractor(cleanBatch, { pooling: 'mean', normalize: true });
                let vectors = outputs.tolist();
                
                for (let j = 0; j < batch.length; j++) {
                    this.schemaVectors.push({ name: batch[j], vector: vectors[j] });
                }
                statusCallback(`Mapping Schema... ${Math.round((i / DATA_LAKE_SCHEMA.length) * 100)}%`);
            }
            
            this.isReady = true;
            statusCallback("Vector AI Active");
        } catch (e) {
            console.error("Vector Engine Init Failed:", e);
            statusCallback("Engine Failed");
        }
        this.isLoading = false;
    }
    
    async getVector(text) {
        const output = await this.extractor(text, { pooling: 'mean', normalize: true });
        return output.data;
    }

    cosineSimilarity(vecA, vecB) {
        let dotProduct = 0; let normA = 0; let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    async extractAST(prompt) {
        if (!this.isReady) return null;
        try {
            const promptVec = await this.getVector(prompt.toLowerCase());
            
            let bestIntent = "filter_count";
            let highestIntentScore = -1;
            for (const [intent, anchorVec] of Object.entries(this.intentAnchors)) {
                const score = this.cosineSimilarity(promptVec, anchorVec);
                if (score > highestIntentScore) {
                    highestIntentScore = score;
                    bestIntent = intent;
                }
            }

            let columnScores = [];
            for (const schema of this.schemaVectors) {
                const score = this.cosineSimilarity(promptVec, schema.vector);
                columnScores.push({ name: schema.name, score: score });
            }
            columnScores.sort((a, b) => b.score - a.score);
            
            let topColumns = columnScores.slice(0, 6).map(c => c.name);
            
            // Override Alias fix for "create_date" -> "hs_createdate"
            if (prompt.toLowerCase().includes("create date") || prompt.toLowerCase().includes("createdate") || prompt.toLowerCase().includes("registered")) {
                if (!topColumns.includes("hs_createdate")) {
                    topColumns.unshift("hs_createdate");
                }
            }

            const dateFilter = extractDateFilter(prompt);

            return {
                needs_confirmation: true,
                operation: bestIntent,
                confidence: highestIntentScore.toFixed(3),
                top_columns: topColumns,
                date_filter: dateFilter
            };

        } catch (e) {
            console.error("Vector Parsing Error:", e);
            return null;
        }
    }
}

// ==========================================
// 2. DYNAMIC 3D HTML5 CANVAS HOLOGRAM ENGINE
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
// 3. DUAL-PERSONA VOICE SYNTHESIS ENGINE
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
// 4. SPEECH-TO-TEXT DICTATION ENGINE
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
// 5. UI CONTROLLER & EVENT ROUTER
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    
    const hologram = new CoreHologram('jarvis-core-canvas');
    const voiceEngine = new VoiceEngine();
    const localAI = new VectorEmbeddingEngine();

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

    // --- Artemis Command Manual Logic ---
    const manualBtn = document.getElementById('open-manual-btn');
    const manualDrawer = document.getElementById('artemis-manual-drawer');
    const manualOverlay = document.getElementById('manual-overlay');
    const closeManualBtn = document.getElementById('close-manual-btn');
    const manualSearch = document.getElementById('manual-search');

    if (manualBtn && manualDrawer) {
        const toggleManual = () => {
            const isOpen = manualDrawer.classList.contains('drawer-slide-in');
            if (isOpen) {
                manualDrawer.classList.remove('drawer-slide-in');
                manualOverlay.classList.remove('opacity-100');
                setTimeout(() => manualOverlay.classList.add('hidden'), 300);
            } else {
                manualOverlay.classList.remove('hidden');
                setTimeout(() => {
                    manualOverlay.classList.add('opacity-100');
                    manualDrawer.classList.add('drawer-slide-in');
                }, 10);
            }
        };

        manualBtn.addEventListener('click', toggleManual);
        closeManualBtn.addEventListener('click', toggleManual);
        manualOverlay.addEventListener('click', toggleManual);

        if (manualSearch) {
            manualSearch.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                document.querySelectorAll('.manual-section').forEach(section => {
                    const tags = section.getAttribute('data-tags') || '';
                    if (term === '' || tags.includes(term) || section.textContent.toLowerCase().includes(term)) {
                        section.style.display = 'block';
                    } else {
                        section.style.display = 'none';
                    }
                });
            });
        }

        // Manual Inject Buttons
        document.querySelectorAll('.manual-inject-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetPrompt = e.currentTarget.getAttribute('data-inject');
                if (targetPrompt && promptInput) {
                    promptInput.value = targetPrompt;
                    promptInput.focus();
                    promptInput.dispatchEvent(new Event('input'));
                    toggleManual(); // Close drawer automatically
                }
            });
        });
    }

    if (webgpuBtn) {
        webgpuBtn.addEventListener('click', async () => {
            if (localAI.isReady) {
                alert("Vector AI is already active.");
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
                webgpuStatus.textContent = "Vector AI: ON";
                webgpuStatus.classList.replace('text-gray-500', 'text-emerald-400');
            } else {
                webgpuIcon.className = "ph ph-warning-circle text-red-400 text-sm";
                webgpuStatus.textContent = "Vector AI Failed";
                webgpuStatus.classList.replace('text-gold', 'text-red-400');
            }
        });
    }

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
                    u.className = "self-end bg-[#1a1a1a]/80 backdrop-blur-md border border-white/5 rounded-lg p-4 max-w-[80%] text-[13px] text-gray-200 shadow-lg mt-6 relative z-10";
                    u.innerHTML = `
                        <div class="text-[9px] font-mono text-gold/70 mb-2 uppercase tracking-widest flex items-center justify-end space-x-1.5">
                            <span>Authorized Admin</span><i class="ph ph-user-circle text-gold text-sm"></i>
                        </div>
                        <div class="leading-relaxed font-sans">${msg.parts[0].text}</div>
                    `;
                    chatStream.appendChild(u);
                } else {
                    const a = document.createElement('div');
                    a.className = "self-start bg-transparent w-full flex items-start space-x-4 mt-4 relative z-10";
                    
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
                    if (parsedGenUI && parsedGenUI.type !== 'column_confirmation') {
                         genUIHtml = `<button class="open-ui-btn text-[11px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 px-3 py-1.5 rounded mt-4 flex items-center transition-colors shadow-lg"><i class="ph ph-layout mr-1.5"></i>View Artifact Rendering</button>`;
                    }

                    let cpuColor = activePersona === 'prometheus' ? 'text-crimson' : 'text-gold';
                    let glowColor = activePersona === 'prometheus' ? 'rgba(220,38,38,0.15)' : 'rgba(221,170,51,0.15)';

                    a.innerHTML = `
                        <div class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_${glowColor}] relative overflow-hidden mt-1">
                             <i class="ph ph-cpu ${cpuColor} text-base drop-shadow-[0_0_5px_currentColor]"></i>
                        </div>
                        <div class="bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-white/5 rounded-lg p-5 text-[13px] text-gray-300 shadow-2xl w-full max-w-[calc(100%-3rem)] relative overflow-hidden group">
                            <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-${activePersona === 'prometheus' ? 'red-500' : 'gold'}/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            <div class="text-[9px] font-mono ${colorClass} mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-3">
                                <div class="flex items-center space-x-1.5"><i class="ph ph-check-circle text-sm"></i><span>${targetPersona} Execution (${latency}ms)</span></div>
                                <div class="px-2 py-0.5 rounded-sm bg-white/5 text-gray-400 border border-white/10">${targetPersona === 'Prometheus' ? 'GEMINI API' : (skipBackend ? 'VECTOR AI' : 'LOCAL NLP')}</div>
                            </div>
                            
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed font-sans">${marked.parse(cleanText)}</div>
                            
                            <div id="gen-ui-container-${latency}"></div>

                            <div class="flex items-center space-x-4 border-t border-white/5 pt-3 mt-4">
                                <button class="copy-btn text-[11px] text-gray-500 hover:text-white transition-colors flex items-center space-x-1.5"><i class="ph ph-copy text-sm"></i><span>Copy Details</span></button>
                                <button class="speak-btn text-[11px] text-gray-500 hover:text-white transition-colors flex items-center space-x-1.5"><i class="ph ph-speaker-high text-sm"></i><span>Synthesize Audio</span></button>
                            </div>
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
        document.addEventListener('mouseup', () => { if (isDraggingCanvas) isDraggingCanvas = false; });
    }

    const openArtifactCanvas = (parsedData) => {
        let htmlContent = '';
        const contentArea = document.getElementById('artifact-content');

        if (parsedData.type === 'interactive_table') {
            htmlContent = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl text-white font-light tracking-tight">${parsedData.title || 'Data Grid'}</h2>
                    <div class="flex space-x-2">
                        <button class="pin-widget-btn text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 px-3 py-1.5 rounded transition-colors flex items-center shadow-lg"><i class="ph ph-push-pin mr-1"></i> Pin</button>
                        <button id="download-tabulator" class="text-xs text-gold border border-gold/30 hover:bg-gold/10 px-3 py-1.5 rounded transition-colors flex items-center shadow-lg"><i class="ph ph-download-simple mr-1"></i> Export Data</button>
                    </div>
                </div>
                <div id="tabulator-table" class="w-full text-sm"></div>
            `;
            contentArea.innerHTML = htmlContent;
            
            setTimeout(() => {
                const tableCols = parsedData.columns.map((colName, index) => ({ title: colName, field: `col${index}`, headerFilter: "input" }));
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
                    <button class="pin-widget-btn text-xs text-blue-400 border border-blue-400/30 hover:bg-blue-400/10 px-3 py-1.5 rounded transition-colors flex items-center shadow-lg"><i class="ph ph-push-pin mr-1"></i> Pin Widget</button>
                </div>
                <div class="p-6 bg-[#0a0a0a] rounded-xl border border-white/5 shadow-2xl relative w-full flex flex-col" style="min-height: 400px;">
                    <div class="relative w-full flex-1"><canvas id="gen-ui-chart"></canvas></div>
                </div>
            `;
            contentArea.innerHTML = htmlContent;
            
            setTimeout(() => {
                const ctx = document.getElementById('gen-ui-chart');
                if (!ctx) return;
                Chart.defaults.color = '#888'; 
                Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
                
                let bgColors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];
                new Chart(ctx, {
                    type: parsedData.chartType || 'bar',
                    data: { 
                        labels: parsedData.labels, 
                        datasets: [{ 
                            label: parsedData.title || 'Count',
                            data: parsedData.data, 
                            backgroundColor: bgColors, 
                            borderWidth: 0, 
                            borderRadius: 6 
                        }] 
                    },
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

            if (!sessions[currentSessionId]) { 
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", pinned: false, history: [] }; 
            } else if (sessions[currentSessionId].title === "New Session" || !sessions[currentSessionId].history.length) {
                sessions[currentSessionId].title = val.substring(0, 24) + "...";
            }
            sessions[currentSessionId].history.push({role: "user", parts: [{text: val}]});
            localStorage.setItem('xoala_chat_sessions', JSON.stringify(sessions));
            renderSessions();

            const userMsg = document.createElement('div');
            userMsg.className = "self-end bg-[#1a1a1a]/80 backdrop-blur-md border border-white/5 rounded-lg p-4 max-w-[80%] text-[13px] text-gray-200 shadow-lg mt-6 relative z-10";
            userMsg.innerHTML = `
                <div class="text-[9px] font-mono text-gold/70 mb-2 uppercase tracking-widest flex items-center justify-end space-x-1.5">
                    <span>Authorized Admin</span><i class="ph ph-user-circle text-gold text-sm"></i>
                </div>
                <div class="leading-relaxed font-sans">${val}</div>
            `;
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
            aiMsg.className = "self-start bg-transparent w-full flex items-start space-x-4 mt-4 relative z-10";
            const reqStartTime = Date.now();
            
            const isMacro = actionType === 'execute_macro';
            const loadingText = actionType === 'prometheus_query' 
                ? 'Synthesizing Strategy...' 
                : (isMacro ? 'Executing Terminal Macro...' : 'Analyzing Data Lake...');
                
            const colorClass = actionType === 'prometheus_query' ? 'text-crimson-light' : (isMacro ? 'text-emerald-400' : 'text-gold');
            let cpuColor = targetPersona === 'Prometheus' ? 'text-crimson' : 'text-gold';
            let glowColor = targetPersona === 'Prometheus' ? 'rgba(220,38,38,0.15)' : 'rgba(221,170,51,0.15)';
            
            aiMsg.innerHTML = `
                <div class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_${glowColor}] relative overflow-hidden mt-1">
                    <i class="ph ph-${targetPersona === 'Prometheus' ? 'brain' : 'cpu'} ${cpuColor} text-base drop-shadow-[0_0_5px_currentColor] animate-pulse"></i>
                </div>
                <div class="text-[13px] ${colorClass} font-mono pt-2.5 tracking-widest uppercase animate-pulse drop-shadow-[0_0_8px_currentColor]">${loadingText}</div>
            `;
            chatStream.appendChild(aiMsg);
            if (container) container.scrollTop = container.scrollHeight;

            hologram.setState(isMacro ? 'macro' : 'thinking');

            let clientAstPayload = null;
            let skipBackend = false;
            
            if (actionType === 'artemis_query' && localAI.isReady && !val.includes("using exact confirmed columns")) {
                clientAstPayload = await localAI.extractAST(val);
                if (clientAstPayload && clientAstPayload.needs_confirmation) {
                    skipBackend = true;
                }
            }

            try {
                let data;
                let isJson = true;
                let latency = Date.now() - reqStartTime;

                if (skipBackend) {
                    const payloadObj = {
                        type: "column_confirmation",
                        query_intent: clientAstPayload.operation,
                        date_filter: clientAstPayload.date_filter,
                        slots: [
                            {
                                role: "Target Schema Column",
                                selected_column: clientAstPayload.top_columns[0],
                                candidates: clientAstPayload.top_columns
                            }
                        ]
                    };
                    
                    data = {
                        status: 200,
                        response: `Local semantic vectors mathematically aligned to intent: **${clientAstPayload.operation.replace(/_/g, ' ').toUpperCase()}**.\n\nPlease verify or manually override the target mapping below.\n\n\`\`\`json\n${JSON.stringify(payloadObj, null, 2)}\n\`\`\``
                    };
                } else {
                    const requestPayload = { 
                        action: actionType, macro: macroCmd, prompt: val, 
                        history: sessions[currentSessionId].history.slice(0, -1),
                        secret: 'system_dashboard_init', 
                        model: modelSelect ? modelSelect.value : 'gemini-3.5-flash-lite',
                        context_payload: activeContextPayload,
                        session_id: currentSessionId
                    };

                    const response = await fetch(ARTEMIS_API_URL, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestPayload)
                    });

                    const textResponse = await response.text();
                    try { data = JSON.parse(textResponse); } catch(e) { isJson = false; data = textResponse; }

                    if (!response.ok) { throw new Error((isJson && data.error) ? data.error : `HTTP Error ${response.status}: ${data}`); }
                    latency = Date.now() - reqStartTime;
                }

                hologram.setState('idle');

                if (data.status === 200 && data.response) {
                    let aiText = data.response;
                    
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
                        <div class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_${glowColor}] relative overflow-hidden mt-1">
                            <i class="ph ph-${targetPersona === 'Prometheus' ? 'brain' : 'cpu'} ${cpuColor} text-base drop-shadow-[0_0_5px_currentColor]"></i>
                        </div>
                        <div class="bg-gradient-to-b from-[#111] to-[#050505] border border-white/5 rounded-lg p-5 text-[13px] text-gray-300 shadow-2xl w-full max-w-[calc(100%-3rem)] relative overflow-hidden group">
                            <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-${targetPersona === 'Prometheus' ? 'red-500' : 'gold'}/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            
                            <div class="text-[9px] font-mono ${colorClass} mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-3">
                                <div class="flex items-center space-x-1.5"><i class="ph ph-check-circle text-sm"></i><span>${targetPersona} Execution (${latency}ms)</span></div>
                                <div class="px-2 py-0.5 rounded-sm bg-white/5 text-gray-400 border border-white/10">${targetPersona === 'Prometheus' ? 'GEMINI API' : (skipBackend ? 'VECTOR AI' : 'LOCAL NLP')}</div>
                            </div>
                            
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed font-sans">${formattedText}</div>
                            
                            <div id="gen-ui-container-${latency}"></div>

                            <div class="flex items-center space-x-4 border-t border-white/5 pt-3 mt-4">
                                <button class="copy-btn text-[11px] text-gray-500 hover:text-white transition-colors flex items-center space-x-1.5"><i class="ph ph-copy text-sm"></i><span>Copy Details</span></button>
                                <button class="speak-btn text-[11px] text-gray-500 hover:text-white transition-colors flex items-center space-x-1.5"><i class="ph ph-speaker-high text-sm"></i><span>Synthesize Audio</span></button>
                            </div>
                        </div>
                    `;

                    if (parsedGenUI) {
                        const containerId = `gen-ui-container-${latency}`;
                        const dynamicContainer = aiMsg.querySelector(`#${containerId}`);

                        if (parsedGenUI.type === 'column_confirmation') {
                            const topCandidates = parsedGenUI.slots[0].candidates || [];
                            const defaultCol = parsedGenUI.slots[0].selected_column;
                            const datalistId = `schema-dl-${latency}`;
                            
                            const datalistOptions = DATA_LAKE_SCHEMA.map(col => `<option value="${col}"></option>`).join('');
                            const pillsHTML = topCandidates.map(c => `
                                <button type="button" class="quick-col-pill text-[10px] font-mono px-2.5 py-1 rounded bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 text-gray-400 hover:text-gold transition-all shadow-sm" data-col="${c}">
                                    ${c}
                                </button>
                            `).join('');
                            
                            let dateBadgeHTML = '';
                            if (parsedGenUI.date_filter && parsedGenUI.date_filter.mode === 'single_day') {
                                dateBadgeHTML = `<span class="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded ml-2">Filtered: ${parsedGenUI.date_filter.targetDateFormatted}</span>`;
                            } else if (parsedGenUI.date_filter && parsedGenUI.date_filter.mode === 'range') {
                                dateBadgeHTML = `<span class="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded ml-2">Range Active</span>`;
                            }

                            dynamicContainer.innerHTML = `
                                <div class="mt-5 border border-white/10 bg-[#050505]/95 backdrop-blur-2xl rounded-xl shadow-[0_20px_40px_-15px_rgba(0,0,0,1)] relative overflow-hidden">
                                    <div class="bg-gradient-to-r from-white/[0.03] to-transparent px-5 py-4 border-b border-white/5 flex items-center justify-between">
                                        <div class="flex items-center space-x-3">
                                            <div class="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center">
                                                <i class="ph ph-git-branch text-blue-400 text-xs"></i>
                                            </div>
                                            <span class="text-xs font-mono tracking-widest uppercase text-white font-semibold">Schema Resolution Required</span>
                                        </div>
                                        <div class="px-2 py-1 rounded bg-black/50 border border-white/5 text-[9px] font-mono text-gray-400 flex items-center shadow-inner">
                                            <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>${DATA_LAKE_SCHEMA.length} Properties
                                        </div>
                                    </div>

                                    <div class="p-5 space-y-6">
                                        <div class="flex flex-col space-y-2.5">
                                            <div class="text-[10px] font-mono uppercase tracking-widest text-gray-500">AI Semantic Suggestions (Click to Apply):</div>
                                            <div class="flex flex-wrap gap-2">${pillsHTML}</div>
                                        </div>

                                        <div class="relative group">
                                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                                <i class="ph ph-magnifying-glass text-gray-500 group-focus-within:text-gold transition-colors text-sm"></i>
                                            </div>
                                            <input list="${datalistId}" id="column-search-input-${latency}" 
                                                class="w-full bg-[#0a0a0a] border border-white/10 hover:border-white/20 focus:border-gold/50 focus:ring-1 focus:ring-gold/30 text-white font-mono text-[13px] rounded-lg pl-10 pr-4 py-3 outline-none transition-all shadow-inner" 
                                                value="${defaultCol}" 
                                                placeholder="Type to search all mapped data properties...">
                                            <datalist id="${datalistId}">${datalistOptions}</datalist>
                                        </div>

                                        <div class="pt-2 flex justify-between items-center">
                                            <div class="text-[10px] font-mono uppercase tracking-widest font-bold">
                                                ${dateBadgeHTML}
                                            </div>
                                            <button class="confirm-column-btn relative overflow-hidden group bg-gold text-obsidian font-bold text-[11px] uppercase tracking-widest px-6 py-2.5 rounded-md hover:bg-gold-light transition-colors flex items-center space-x-2 shadow-[0_0_15px_rgba(221,170,51,0.2)]">
                                                <i class="ph ph-rocket-launch text-sm transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5"></i>
                                                <span>Engage Pipeline</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            `;

                            const searchInput = dynamicContainer.querySelector(`#column-search-input-${latency}`);
                            dynamicContainer.querySelectorAll('.quick-col-pill').forEach(pill => {
                                pill.addEventListener('click', () => {
                                    searchInput.value = pill.getAttribute('data-col');
                                });
                            });

                            const confirmBtn = dynamicContainer.querySelector('.confirm-column-btn');
                            confirmBtn.addEventListener('click', () => {
                                const selectedCol = searchInput.value.trim() || defaultCol;
                                
                                let executePrompt = `Run ${parsedGenUI.query_intent || 'analysis'} using exact confirmed columns: ["${selectedCol}"]. Execute the calculation using your custom GAS tools.`;
                                if (parsedGenUI.date_filter) {
                                    executePrompt += ` DATE_FILTER_JSON: ${JSON.stringify(parsedGenUI.date_filter)}`;
                                }
                                
                                confirmBtn.disabled = true;
                                confirmBtn.innerHTML = `<i class="ph ph-circle-notch animate-spin text-obsidian text-sm"></i><span class="text-obsidian">Executing...</span>`;
                                
                                promptInput.value = executePrompt;
                                sendBtn.click();
                            });

                        } else {
                            dynamicContainer.innerHTML = `<button class="open-ui-btn text-[11px] text-emerald-400 font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded mt-4 flex items-center transition-colors shadow-lg"><i class="ph ph-layout mr-1.5 text-sm"></i>View Artifact Rendering</button>`;
                            const openBtn = dynamicContainer.querySelector('.open-ui-btn');
                            openBtn.addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                        }
                    }

                    aiMsg.querySelector('.copy-btn').addEventListener('click', () => { navigator.clipboard.writeText(aiText); });
                    const speakBtn = aiMsg.querySelector('.speak-btn');
                    speakBtn.addEventListener('click', () => {
                        if (window.speechSynthesis && window.speechSynthesis.speaking) {
                            voiceEngine.stop();
                            speakBtn.innerHTML = `<i class="ph ph-speaker-high text-sm"></i><span>Synthesize Audio</span>`;
                            hologram.setState('idle');
                        } else {
                            speakBtn.innerHTML = `<i class="ph ph-stop text-red-400 text-sm"></i><span class="text-red-400">Stop Synthesis</span>`;
                            voiceEngine.speak(
                                aiText, targetPersona.toLowerCase(),
                                () => hologram.setState('speaking'),
                                () => { hologram.setState('idle'); speakBtn.innerHTML = `<i class="ph ph-speaker-high text-sm"></i><span>Synthesize Audio</span>`; },
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
                    <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-5 text-[13px] text-red-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm mt-4 ml-12">
                        <div class="text-[10px] font-mono text-red-400 mb-3 uppercase tracking-widest flex items-center space-x-1.5 border-b border-red-500/20 pb-3">
                            <i class="ph ph-warning-circle text-sm"></i><span>System Exception Detected</span>
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
