// === XOALA COMMAND CENTER: ARTEMIS AI CORE ENGINE & SESSION MANAGER ===

const ARTEMIS_API_URL = 'https://xoala-command-center-middleware.osama-mohammad.workers.dev';

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('prompt-input');
    const sendBtn = document.getElementById('send-btn');
    const chatBox = document.getElementById('chat-box');
    const emptyState = document.getElementById('artemis-empty-state');
    const artifactPane = document.getElementById('artemis-artifact-pane');
    const closeArtifactBtn = document.getElementById('close-artifact-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const sessionsList = document.getElementById('chat-sessions-list');
    const exportCanvasBtn = document.getElementById('export-canvas-csv-btn');

    let currentSessionId = Date.now().toString();
    let sessions = JSON.parse(localStorage.getItem('xoala_chat_sessions') || '{}');
    let activeCanvasData = null;
    let canvasChartInstance = null;

    // FIX: The "Data Core" Mini-Avatar for Chat Feed
    const getCoreAvatar = (isThinking = false) => `
        <div class="w-8 h-8 rounded-full flex items-center justify-center bg-black flex-shrink-0 relative overflow-hidden ${isThinking ? 'shadow-[0_0_12px_rgba(16,185,129,0.6)]' : 'shadow-[0_0_4px_rgba(221,170,51,0.3)]'}">
            <div class="absolute inset-[1px] rounded-full border border-gold/40 border-dotted ${isThinking ? 'spin-layer-2' : ''}"></div>
            <div class="absolute inset-[2px] rounded-full border border-emerald-500/50 border-dashed ${isThinking ? 'spin-layer-1' : ''}"></div>
            <div class="absolute inset-[4px] rounded-full bg-gradient-to-tr from-emerald-600 to-gold ${isThinking ? 'animate-pulse blur-[1px]' : 'opacity-40'}"></div>
            <div class="absolute inset-[7px] rounded-full bg-obsidian z-10 flex items-center justify-center"><i class="ph ph-cpu text-[10px] ${isThinking ? 'text-white' : 'text-gray-500'}"></i></div>
        </div>
    `;

    const setCoreProcessing = (isProcessing) => {
        const glow = document.getElementById('core-glow');
        if (glow) {
            if (isProcessing) {
                glow.classList.replace('from-emerald-600', 'from-red-500');
                glow.classList.add('scale-125');
            } else {
                glow.classList.replace('from-red-500', 'from-emerald-600');
                glow.classList.remove('scale-125');
            }
        }
    };

    document.querySelectorAll('.quick-pill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            promptInput.value = e.currentTarget.getAttribute('data-prompt');
            promptInput.focus();
        });
    });

    const openArtifactCanvas = (parsedData) => {
        activeCanvasData = parsedData;
        let htmlContent = '';

        if (parsedData.type === 'interactive_table') {
            htmlContent = `
                <div class="flex justify-between items-center mb-6">
                    <h2 class="text-xl text-white font-light tracking-tight">${parsedData.title || 'Data Grid'}</h2>
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
        } 
        else if (parsedData.type === 'interactive_chart') {
            htmlContent = `
                <h2 class="text-xl text-white font-light mb-6 tracking-tight">${parsedData.title || 'Visual Analytics'}</h2>
                <div class="p-6 glass-card rounded-xl border border-white/5 shadow-2xl relative w-full flex flex-col" style="min-height: 400px;">
                    <div class="relative w-full flex-1"><canvas id="gen-ui-chart"></canvas></div>
                </div>
            `;
            document.getElementById('artifact-content').innerHTML = htmlContent;
            
            // Allow DOM to paint, then render Chart.js
            setTimeout(() => {
                const ctx = document.getElementById('gen-ui-chart');
                if (!ctx) return;
                if (canvasChartInstance) canvasChartInstance.destroy();
                
                Chart.defaults.color = '#888'; Chart.defaults.font.family = "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace";
                
                // Colors
                let bgColors = ['#DDAA33', '#10b981', '#3b82f6', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];
                if (parsedData.chartType === 'bar') {
                    const ctx2d = ctx.getContext('2d');
                    bgColors = parsedData.labels.map((_, i) => { 
                        const grad = ctx2d.createLinearGradient(0, 0, 0, 400); 
                        grad.addColorStop(0, bgColors[i % bgColors.length]); grad.addColorStop(1, '#111111'); return grad; 
                    });
                }

                canvasChartInstance = new Chart(ctx, {
                    type: parsedData.chartType || 'bar',
                    data: { labels: parsedData.labels, datasets: [{ data: parsedData.data, backgroundColor: bgColors, borderWidth: 0, borderRadius: parsedData.chartType==='bar'?4:0 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: parsedData.chartType==='doughnut' || parsedData.chartType==='pie' } } }
                });
            }, 300);
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

    const renderSessions = () => {
        if (!sessionsList) return;
        sessionsList.innerHTML = Object.keys(sessions).reverse().map(id => `
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
                    ${getCoreAvatar(false)}
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

            if (emptyState) emptyState.classList.add('opacity-0');

            if (!sessions[currentSessionId]) {
                sessions[currentSessionId] = { title: val.substring(0, 24) + "...", history: [] };
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
                ${getCoreAvatar(true)}
                <div class="text-sm text-gray-400 font-mono pt-2 tracking-widest uppercase animate-pulse">Computing Data Lake nodes...</div>
            `;
            chatBox.appendChild(aiMsg);
            chatBox.scrollTop = chatBox.scrollHeight;

            setCoreProcessing(true);

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
                setCoreProcessing(false);

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
                        ${getCoreAvatar(false)}
                        <div class="bg-surface/80 border border-white/5 rounded-2xl rounded-tl-none p-5 text-sm text-gray-200 shadow-lg w-full max-w-[calc(100%-3rem)] backdrop-blur-sm">
                            <div class="text-[9px] font-mono text-emerald-400 mb-3 uppercase tracking-widest flex items-center justify-between border-b border-white/5 pb-2">
                                <div class="flex items-center space-x-1"><i class="ph ph-check-circle"></i><span>Execution Complete (${latency}ms)</span></div>
                                <div class="text-gray-500">${document.getElementById('model-select').value.replace('gemini-','').toUpperCase()}</div>
                            </div>
                            <div class="prose prose-invert prose-sm max-w-none leading-relaxed prose-a:text-gold">${formattedText}</div>
                            <div class="flex items-center space-x-3 border-t border-white/5 pt-3 mt-3">
                                <button class="text-xs text-gray-500 hover:text-gold transition-colors flex items-center space-x-1 copy-resp-btn"><i class="ph ph-copy"></i><span>Copy Response</span></button>
                                ${parsedGenUI ? `<button class="text-xs text-emerald-400 hover:text-emerald-300 transition-colors flex items-center space-x-1 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded open-canvas-btn"><i class="ph ph-layout"></i><span>Open Canvas Artifact</span></button>` : ''}
                            </div>
                        </div>
                    `;

                    aiMsg.querySelector('.copy-resp-btn').addEventListener('click', () => { navigator.clipboard.writeText(aiText); });

                    if (parsedGenUI) {
                        aiMsg.querySelector('.open-canvas-btn').addEventListener('click', () => { openArtifactCanvas(parsedGenUI); });
                        openArtifactCanvas(parsedGenUI);
                    }
                    renderSessions();

                } else {
                    aiMsg.innerHTML = `<div class="text-red-400 font-mono text-sm border border-red-500/20 bg-red-500/10 p-3 rounded relative z-10">API Error: ${data.error || "Execution failed."}</div>`;
                }
            } catch (err) {
                setCoreProcessing(false);
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
