// ============================================
// TruthMesh Pipeline — Live Terminal & Step Nodes
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const terminalOutput = document.getElementById('terminalOutput');
    const progressLine = document.getElementById('progressLine');
    const pipelineCompletion = document.getElementById('pipelineCompletion');
    const pipelinePulse = document.getElementById('pipelinePulse');
    const pipelineBreadcrumb = document.getElementById('pipelineBreadcrumb');
    const pipelineId = document.getElementById('pipelineId');

    const STEPS = ['shield', 'classify', 'route', 'llm', 'decompose', 'verify', 'consensus', 'profile'];
    let completedSteps = 0;

    // Check if there's a recent query to display
    checkForActiveQuery();

    async function checkForActiveQuery() {
        try {
            const response = await fetch('/api/recent-query');
            if (response.ok) {
                const data = await response.json();
                if (data.query_id) {
                    pipelineBreadcrumb.textContent = `Execution: ${data.query_id.substring(0, 8)}`;
                    pipelineId.textContent = `#${data.query_id.substring(0, 6)}`;

                    // Show cached results in terminal
                    if (data.log) {
                        terminalOutput.innerHTML = '';
                        data.log.forEach(line => addTerminalLine(line.type, line.text));
                    }
                }
            }
        } catch (e) {
            // Silently fail — no active query
        }
    }

    function addTerminalLine(type, text) {
        const div = document.createElement('div');
        div.className = `terminal-line-${type || 'info'}`;
        div.textContent = text;
        terminalOutput.appendChild(div);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function activateStepNode(stepName) {
        const stepIdx = STEPS.indexOf(stepName);
        if (stepIdx === -1) return;

        completedSteps = stepIdx + 1;
        const pct = Math.round((completedSteps / STEPS.length) * 100);

        progressLine.style.width = `${pct}%`;
        pipelineCompletion.textContent = `${pct}% Complete`;
        pipelineCompletion.classList.remove('text-slate-400');
        pipelineCompletion.classList.add('text-primary');

        pipelinePulse.classList.add('bg-primary', 'animate-pulse');
        pipelinePulse.classList.remove('bg-slate-300');

        // Update step nodes
        const stepContainers = document.querySelectorAll('[data-step]');
        stepContainers.forEach((container, i) => {
            const node = container.querySelector('.step-node');
            const label = container.querySelector('span:last-child');

            if (i < completedSteps) {
                node.className = 'step-node size-10 rounded-full completed flex items-center justify-center';
                label.className = 'text-[10px] font-bold uppercase text-primary';
            } else if (i === completedSteps) {
                node.className = 'step-node size-12 rounded-full active flex items-center justify-center';
                label.className = 'text-[10px] font-bold uppercase text-primary underline underline-offset-4';
            } else {
                node.className = 'step-node size-10 rounded-full pending flex items-center justify-center';
                label.className = 'text-[10px] font-bold uppercase text-slate-400';
            }
        });
    }

    // Listen for pipeline events from the dashboard via BroadcastChannel
    const channel = new BroadcastChannel('truthmesh_pipeline');
    channel.onmessage = (event) => {
        const { type, data } = event.data;

        if (type === 'step') {
            activateStepNode(data.step);
            addTerminalLine('time', `[${new Date().toLocaleTimeString()}] ${data.step.toUpperCase()} step activated`);
        } else if (type === 'claim') {
            addTerminalLine('claim', `>> DETECTED CLAIM: "${data.text}"`);
        } else if (type === 'verification') {
            const verdict = data.verdict === 'pass' ? 'info' : data.verdict === 'fail' ? 'error' : 'meta';
            addTerminalLine(verdict, `>> Claim ${data.index + 1}: ${data.verdict.toUpperCase()} (${Math.round(data.confidence * 100)}%)`);
        } else if (type === 'response') {
            addTerminalLine('info', `>> AI Response received (${data.length} chars)`);
        } else if (type === 'done') {
            addTerminalLine('processing', '>> PIPELINE COMPLETE');
            pipelineCompletion.textContent = '100% Complete';
            progressLine.style.width = '100%';
        }
    };
});
