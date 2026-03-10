/**
 * TruthMesh — Topography Heatmap Visualization
 * Chart.js-powered model reliability heatmap with drill-down tooltips.
 */

let topographyChart = null;

function getColorForScore(score) {
    // Red (0) → Yellow (0.5) → Green (1.0)
    if (score >= 0.7) {
        const t = (score - 0.7) / 0.3;
        const r = Math.round(34 + (1 - t) * 50);
        const g = Math.round(197 - (1 - t) * 40);
        const b = Math.round(94 - (1 - t) * 30);
        return `rgb(${r}, ${g}, ${b})`;
    } else if (score >= 0.4) {
        const t = (score - 0.4) / 0.3;
        const r = Math.round(245 - t * 100);
        const g = Math.round(158 + t * 39);
        const b = Math.round(11 + t * 50);
        return `rgb(${r}, ${g}, ${b})`;
    } else {
        const t = score / 0.4;
        const r = Math.round(239 + (1 - t) * 16);
        const g = Math.round(68 + t * 90);
        const b = Math.round(68 - t * 30);
        return `rgb(${r}, ${g}, ${b})`;
    }
}

function getTextColorForScore(score) {
    return score > 0.6 ? '#0a0e1a' : '#e8ecf5';
}

function initTopographyChart(topoData, models, domains) {
    const ctx = document.getElementById('topographyChart');
    if (!ctx) return;

    // Build matrix data
    const matrixData = [];
    const scoreMap = {};

    topoData.forEach(entry => {
        const key = `${entry.model}::${entry.domain}`;
        scoreMap[key] = entry;
    });

    models.forEach((model, mi) => {
        domains.forEach((domain, di) => {
            const key = `${model}::${domain}`;
            const entry = scoreMap[key];
            if (entry) {
                matrixData.push({
                    x: di,
                    y: mi,
                    v: entry.reliability_score,
                    lower: entry.confidence_lower,
                    upper: entry.confidence_upper,
                    samples: entry.sample_count,
                    label: entry.source_label,
                    model: model,
                    domain: domain
                });
            }
        });
    });

    // Destroy existing chart if any
    if (topographyChart) {
        topographyChart.destroy();
    }

    topographyChart = new Chart(ctx, {
        type: 'matrix',
        data: {
            datasets: [{
                label: 'Reliability Score',
                data: matrixData,
                backgroundColor(ctx) {
                    const v = ctx.dataset.data[ctx.dataIndex]?.v || 0;
                    return getColorForScore(v);
                },
                borderColor: 'rgba(203, 213, 225, 0.6)',
                borderWidth: 2,
                borderRadius: 4,
                width: ({ chart }) => (chart.chartArea?.width || 200) / domains.length - 6,
                height: ({ chart }) => (chart.chartArea?.height || 150) / models.length - 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(26, 31, 53, 0.95)',
                    borderColor: 'rgba(99, 115, 171, 0.3)',
                    borderWidth: 1,
                    titleFont: { family: 'Inter', weight: '700', size: 13 },
                    bodyFont: { family: 'JetBrains Mono', size: 11 },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        title(items) {
                            const d = items[0].raw;
                            return `${d.model} → ${d.domain}`;
                        },
                        label(item) {
                            const d = item.raw;
                            return [
                                `Reliability: ${(d.v * 100).toFixed(0)}%`,
                                `CI: [${(d.lower * 100).toFixed(0)}% – ${(d.upper * 100).toFixed(0)}%]`,
                                `Samples: n=${d.samples}`,
                                `Source: ${d.label}`
                            ];
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'category',
                    labels: domains,
                    offset: true,
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Inter', size: 10, weight: '600' },
                    },
                    grid: { display: false },
                    border: { display: false }
                },
                y: {
                    type: 'category',
                    labels: models,
                    offset: true,
                    ticks: {
                        color: '#64748b',
                        font: { family: 'Inter', size: 10, weight: '600' },
                    },
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });
}

function refreshTopography() {
    fetch('/api/topography')
        .then(r => r.json())
        .then(data => {
            initTopographyChart(data.topography, data.models, data.domains);
        });
}
