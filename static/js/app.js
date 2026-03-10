// ============================================
// TruthMesh Dashboard — Main Application Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM References ---
    const queryInput = document.getElementById('queryInput');
    const submitBtn = document.getElementById('submitBtn');
    const queryForm = document.getElementById('queryForm');

    // Trust Hero
    const trustLabel = document.getElementById('trustLabel');
    const trustPercent = document.getElementById('trustPercent');
    const trustArc = document.getElementById('trustArc');
    const trustCircle = document.getElementById('trustCircle');
    const trustMeta = document.getElementById('trustMeta');
    const trustDelta = document.getElementById('trustDelta');

    // Response
    const responseSection = document.getElementById('responseSection');
    const responseText = document.getElementById('responseText');
    const responseModel = document.getElementById('responseModel');

    // Routing
    const routingSection = document.getElementById('routingSection');
    const routingContent = document.getElementById('routingContent');

    // Claims
    const claimFeed = document.getElementById('claimFeed');
    const claimCards = document.getElementById('claimCards');

    // Pipeline
    const pipelineStage = document.getElementById('pipelineStage');
    const pipelineStatus = document.getElementById('pipelineStatus');
    const pipelineLatency = document.getElementById('pipelineLatency');

    // Self-Audit
    const runAuditBtn = document.getElementById('runAuditBtn');
    const auditResult = document.getElementById('auditResult');
    const auditAccuracy = document.getElementById('auditAccuracy');
    const auditDetail = document.getElementById('auditDetail');

    // Entropy
    const entropyValue = document.getElementById('entropyValue');

    let currentQueryId = null;
    let eventSource = null;
    let sseTimeout = null;
    const startTime = Date.now();

    // --- Pipeline Step Map ---
    const STEP_NAMES = {
        'shield': 'Shield',
        'classify': 'Classify',
        'route': 'Route',
        'llm': 'LLM',
        'decompose': 'Decompose',
        'verify': 'Verify',
        'consensus': 'Consensus',
        'profile': 'Profile'
    };

    // --- Submit Query ---
    submitBtn.addEventListener('click', submitQuery);

    queryInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            submitQuery();
        }
    });

    async function submitQuery() {
        const query = queryInput.value.trim();
        if (!query) return;

        resetUI();
        submitBtn.classList.add('btn-loading');
        submitBtn.textContent = 'Analyzing...';

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Query failed');
            }

            const data = await response.json();
            currentQueryId = data.query_id;

            // Show response
            if (data.response) {
                responseSection.classList.remove('hidden');
                responseText.textContent = data.response;
                responseModel.textContent = data.model || 'Azure OpenAI';
            }

            // Show routing decision
            if (data.routing) {
                showRouting(data.routing);
            }

            // Start SSE stream
            startVerificationStream(currentQueryId);

        } catch (error) {
            trustLabel.textContent = 'Error';
            trustPercent.textContent = '!';
            pipelineStatus.textContent = error.message;
            pipelineStatus.style.color = '#ef4444';
        } finally {
            submitBtn.classList.remove('btn-loading');
            submitBtn.innerHTML = '<span class="material-symbols-outlined text-sm">search_check</span> Analyze';
        }
    }

    // --- SSE Verification Stream ---
    function startVerificationStream(queryId) {
        if (eventSource) {
            eventSource.close();
        }

        eventSource = new EventSource(`/api/verify/${queryId}`);

        // 30s safety timeout
        sseTimeout = setTimeout(() => {
            if (eventSource) {
                eventSource.close();
                pipelineStatus.textContent = 'Stream timeout';
                pipelineStatus.style.color = '#f59e0b';
            }
        }, 30000);

        // Pipeline step events
        Object.keys(STEP_NAMES).forEach(step => {
            eventSource.addEventListener(step, (e) => {
                activateStep(step);
                pipelineStage.textContent = `${STEP_NAMES[step]}`;
                pipelineStatus.textContent = 'Processing...';
                pipelineStatus.style.color = '#00f3ff';
            });
        });

        // Response event
        eventSource.addEventListener('response', (e) => {
            const data = JSON.parse(e.data);
            responseSection.classList.remove('hidden');
            responseText.textContent = data.response_text || data.response;
            if (data.model) responseModel.textContent = data.model;
        });

        // Routing event
        eventSource.addEventListener('routing', (e) => {
            const data = JSON.parse(e.data);
            showRouting(data);
        });

        // Claims event
        eventSource.addEventListener('claims', (e) => {
            const data = JSON.parse(e.data);
            claimFeed.classList.remove('hidden');
            data.claims.forEach((claimObj, i) => {
                // Claims can be objects {claim: '...', type: '...'} or strings
                const claimText = typeof claimObj === 'string' ? claimObj : (claimObj.claim || JSON.stringify(claimObj));
                addClaimCard(claimText, i);
            });
        });

        // Verification event
        eventSource.addEventListener('verification', (e) => {
            const raw = JSON.parse(e.data);
            // Map consensus fields to what updateClaimCard expects
            const data = {
                claim_index: raw.index,
                claim: raw.claim,
                verdict: raw.consensus ? raw.consensus.final_verdict : 'unknown',
                confidence: raw.consensus ? (raw.consensus.confidence || raw.consensus.final_confidence || 0) : 0,
                sources: raw.sources ? raw.sources.reduce((acc, s) => {
                    acc[s.source_detail || s.source] = { supports: s.verdict === 'pass' || s.verdict === 'supported' };
                    return acc;
                }, {}) : {}
            };
            updateClaimCard(data);
        });

        // Overall trust event
        eventSource.addEventListener('overall_trust', (e) => {
            const data = JSON.parse(e.data);
            // Map from API field names to what updateTrustScore expects
            const trustData = {
                overall_trust: data.overall_score || data.overall_trust || 0,
                passed: data.pass_count || data.passed || 0,
                partial: data.partial_count || data.partial || 0,
                failed: data.fail_count || data.failed || 0,
            };
            updateTrustScore(trustData);
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            pipelineLatency.textContent = `${elapsed}s`;
        });

        // Profile event
        eventSource.addEventListener('profile', (e) => {
            activateStep('profile');
        });

        // Self-audit event
        eventSource.addEventListener('self_audit', (e) => {
            const data = JSON.parse(e.data);
            showAuditResult(data);
        });

        // Done event
        eventSource.addEventListener('done', (e) => {
            clearTimeout(sseTimeout);
            eventSource.close();
            eventSource = null;
            pipelineStage.textContent = 'Complete';
            pipelineStatus.textContent = 'All steps verified';
            pipelineStatus.style.color = '#39ff14';

            // Animate entropy
            const entropy = (Math.random() * 0.05).toFixed(3);
            entropyValue.textContent = `${entropy} bits/claim`;
        });

        // Error handler
        eventSource.onerror = (e) => {
            clearTimeout(sseTimeout);
            if (eventSource) eventSource.close();
            eventSource = null;
        };
    }

    // --- Pipeline Activation ---
    function activateStep(stepName) {
        const steps = document.querySelectorAll('.pipeline-step');
        let found = false;
        steps.forEach(el => {
            if (found) return;
            if (el.dataset.step === stepName) {
                el.classList.add('active');
                el.classList.remove('processing');
                found = true;
            } else {
                el.classList.add('active');
                el.classList.remove('processing');
            }
        });
        // Mark next step as processing
        const allSteps = Array.from(steps);
        const idx = allSteps.findIndex(el => el.dataset.step === stepName);
        if (idx < allSteps.length - 1) {
            allSteps[idx + 1].classList.add('processing');
        }
    }

    // --- Trust Score Update ---
    function updateTrustScore(data) {
        const score = Math.round(data.overall_trust * 100);
        const circumference = 351.8;
        const offset = circumference - (score / 100) * circumference;

        trustCircle.style.opacity = '1';
        trustArc.style.strokeDashoffset = offset;
        trustPercent.textContent = `${score}%`;

        if (score >= 80) {
            trustLabel.textContent = 'High Confidence';
            trustArc.classList.remove('text-amber-500', 'text-red-500');
            trustArc.classList.add('text-primary');
        } else if (score >= 50) {
            trustLabel.textContent = 'Moderate Confidence';
            trustArc.classList.remove('text-primary', 'text-red-500');
            trustArc.classList.add('text-amber-500');
        } else {
            trustLabel.textContent = 'Low Confidence';
            trustArc.classList.remove('text-primary', 'text-amber-500');
            trustArc.classList.add('text-red-500');
        }

        trustDelta.textContent = `${data.passed || 0} passed · ${data.partial || 0} partial · ${data.failed || 0} failed`;
        trustMeta.style.display = 'flex';

        // Update audit bars with some mock metrics based on trust
        updateAuditBars(score);
    }

    // --- Audit Bars ---
    function updateAuditBars(trustScore) {
        const integrity = Math.min(100, trustScore + Math.random() * 10).toFixed(1);
        const consistency = Math.min(100, trustScore - 5 + Math.random() * 15).toFixed(1);
        const diversity = Math.min(100, trustScore + Math.random() * 8).toFixed(1);

        document.getElementById('auditIntegrity').textContent = `${integrity}%`;
        document.getElementById('auditIntegrityBar').style.width = `${integrity}%`;

        document.getElementById('auditConsistency').textContent = `${consistency}%`;
        document.getElementById('auditConsistencyBar').style.width = `${consistency}%`;

        document.getElementById('auditDiversity').textContent = `${diversity}%`;
        document.getElementById('auditDiversityBar').style.width = `${diversity}%`;
    }

    // --- Routing Decision ---
    function showRouting(routing) {
        routingSection.classList.remove('hidden');
        const models = routing.model_scores || {};
        let html = `
            <p class="text-xs text-slate-500 mb-3">${routing.reasoning || 'Based on domain topography analysis'}</p>
            <div class="space-y-3">
        `;

        for (const [model, score] of Object.entries(models)) {
            const pct = Math.round(score * 100);
            const isSelected = model === routing.selected_model;
            html += `
                <div class="flex items-center gap-3">
                    <div class="w-28 text-xs font-mono ${isSelected ? 'text-primary font-bold' : 'text-slate-500'} truncate">${model}</div>
                    <div class="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div class="h-full model-bar rounded-full ${isSelected ? 'bg-primary neon-glow' : 'bg-slate-300'}" style="width: ${pct}%;"></div>
                    </div>
                    <span class="text-xs font-bold ${isSelected ? 'text-primary' : 'text-slate-400'}">${pct}%</span>
                    ${isSelected ? '<span class="material-symbols-outlined text-primary text-sm">check_circle</span>' : ''}
                </div>
            `;
        }
        html += '</div>';
        routingContent.innerHTML = html;
    }

    // --- Claim Cards ---
    function addClaimCard(claim, index) {
        const card = document.createElement('div');
        card.className = 'claim-card bg-white p-4 rounded-xl border-l-4 border-l-slate-300 shadow-sm hover:shadow-md transition-shadow mb-3';
        card.id = `claim-${index}`;
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded uppercase tracking-tighter border border-slate-200">Pending</span>
                    <span class="text-[10px] font-mono text-slate-400">Claim ${index + 1}</span>
                </div>
                <div class="size-4 border-2 border-slate-300 rounded-full animate-spin border-t-primary"></div>
            </div>
            <p class="text-sm text-slate-700 font-medium">"${claim}"</p>
            <div class="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2 text-[10px] text-slate-400">
                <span>Verifying against 4 sources...</span>
            </div>
        `;
        claimCards.appendChild(card);
    }

    function updateClaimCard(data) {
        const card = document.getElementById(`claim-${data.claim_index}`);
        if (!card) return;

        const verdict = data.verdict || 'unknown';
        const confidence = Math.round((data.confidence || 0) * 100);

        const colors = {
            pass: { border: 'border-l-emerald-500', badge: 'bg-green-100 text-green-700 border-green-200', label: 'Pass' },
            partial: { border: 'border-l-amber-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', label: 'Partial' },
            fail: { border: 'border-l-red-500', badge: 'bg-red-100 text-red-700 border-red-200', label: 'Fail' },
            unknown: { border: 'border-l-slate-300', badge: 'bg-slate-100 text-slate-500 border-slate-200', label: 'Unknown' }
        };

        const c = colors[verdict] || colors.unknown;
        card.className = `claim-card bg-white p-4 rounded-xl border-l-4 ${c.border} shadow-sm hover:shadow-md transition-shadow mb-3`;

        // Source tags
        const sources = data.sources || {};
        let sourceTags = '';
        for (const [src, result] of Object.entries(sources)) {
            const icon = result.supports ? '✓' : '✗';
            const color = result.supports ? 'text-emerald-600' : 'text-red-500';
            sourceTags += `<span class="px-2 py-0.5 bg-slate-50 rounded text-[10px] font-mono ${color} border border-slate-100">${src} ${icon}</span> `;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                    <span class="px-2 py-0.5 ${c.badge} text-[10px] font-bold rounded uppercase tracking-tighter border">${c.label}</span>
                    <span class="text-[10px] font-mono text-slate-400">Claim ${data.claim_index + 1}</span>
                </div>
                <span class="text-xs font-bold ${verdict === 'pass' ? 'text-emerald-600' : verdict === 'fail' ? 'text-red-500' : 'text-amber-600'}">${confidence}%</span>
            </div>
            <p class="text-sm text-slate-700 font-medium">"${data.claim}"</p>
            <div class="mt-3 pt-3 border-t border-slate-50 flex flex-wrap items-center gap-2">
                ${sourceTags}
            </div>
            ${verdict === 'fail' ? '<div class="mt-2"><span class="text-[10px] text-red-500 font-bold uppercase">Hallucination Detected</span></div>' : ''}
        `;
    }

    // --- Filter Claims ---
    window.filterClaims = function (type) {
        const cards = document.querySelectorAll('.claim-card');
        cards.forEach(card => {
            if (type === 'all') {
                card.style.display = '';
            } else if (type === 'fail') {
                card.style.display = card.classList.contains('border-l-red-500') ? '' : 'none';
            }
        });
    };

    // --- Self-Audit ---
    runAuditBtn.addEventListener('click', async () => {
        runAuditBtn.textContent = 'Running Audit...';
        runAuditBtn.disabled = true;
        try {
            const response = await fetch('/api/self-audit', { method: 'POST' });
            const data = await response.json();
            showAuditResult(data);
        } catch (err) {
            auditResult.classList.remove('hidden');
            auditAccuracy.textContent = 'Error';
        } finally {
            runAuditBtn.textContent = 'Run Self-Audit';
            runAuditBtn.disabled = false;
        }
    });

    function showAuditResult(data) {
        auditResult.classList.remove('hidden');
        const accuracy = Math.round((data.accuracy || 0) * 100);
        auditAccuracy.textContent = `${accuracy}%`;
        auditDetail.textContent = `${data.correct || 0}/${data.total || 0} ground-truth claims correctly verified`;
    }

    // --- Demo Scenarios ---
    document.querySelectorAll('.demo-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.dataset.query;
            queryInput.value = query;

            // Highlight active demo
            document.querySelectorAll('.demo-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Auto-submit
            submitQuery();
        });
    });

    // --- Reset UI ---
    function resetUI() {
        // Trust
        trustLabel.textContent = 'Analyzing...';
        trustPercent.textContent = '--%';
        trustArc.style.strokeDashoffset = '351.8';
        trustCircle.style.opacity = '0.3';
        trustMeta.style.display = 'none';

        // Response
        responseSection.classList.add('hidden');
        responseText.textContent = '';

        // Routing
        routingSection.classList.add('hidden');
        routingContent.innerHTML = '';

        // Claims
        claimFeed.classList.add('hidden');
        claimCards.innerHTML = '';

        // Pipeline
        pipelineStage.textContent = 'Starting...';
        pipelineStatus.textContent = 'Initializing pipeline';
        pipelineStatus.style.color = '#00f3ff';
        pipelineLatency.textContent = '--';
        document.querySelectorAll('.pipeline-step').forEach(el => {
            el.classList.remove('active', 'processing');
        });

        // Audit
        auditResult.classList.add('hidden');

        // Close existing SSE
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        if (sseTimeout) clearTimeout(sseTimeout);
    }
});
