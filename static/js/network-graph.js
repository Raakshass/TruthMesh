/**
 * TruthMesh — Interactive Network Graph Animation
 * Inspired by smith.langchain.com hero section.
 * Pure HTML5 Canvas, zero dependencies.
 *
 * Creates a floating, glowing network of nodes and connections
 * representing the AI verification mesh. Mouse-reactive.
 */

(function () {
  'use strict';

  // ── Configuration ──────────────────────────────────────────────────────
  const CONFIG = {
    nodeCount: 60,
    connectionDistance: 180,
    mouseInfluenceRadius: 200,
    mouseRepelStrength: 0.08,
    baseDriftSpeed: 0.3,
    glowIntensity: 0.6,
    // Blue design system palette
    colors: {
      nodePrimary: '#0052FF',
      nodeSecondary: '#b7c4ff',
      nodeAccent: '#003ec7',
      connectionBase: 'rgba(0, 82, 255, 0.12)',
      connectionActive: 'rgba(0, 82, 255, 0.35)',
      glowColor: 'rgba(0, 82, 255, 0.25)',
      bgGradientStart: '#0a0e1a',
      bgGradientEnd: '#131b2e',
    },
    nodeLabels: [
      'GPT-4o', 'Claude-3.5', 'Gemini-2', 'PubMed', 'Wikipedia',
      'Wolfram', 'Bing', 'Medical', 'Legal', 'Finance',
      'Science', 'History', 'Consensus', 'Router', 'Verifier',
      'Decomposer', 'Profiler', 'Shield', 'Audit', 'Trust',
    ],
  };

  // ── Node Class ─────────────────────────────────────────────────────────
  class Node {
    constructor(canvas) {
      this.x = Math.random() * canvas.width;
      this.y = Math.random() * canvas.height;
      this.radius = 2 + Math.random() * 4;
      this.vx = (Math.random() - 0.5) * CONFIG.baseDriftSpeed;
      this.vy = (Math.random() - 0.5) * CONFIG.baseDriftSpeed;
      this.baseAlpha = 0.4 + Math.random() * 0.6;
      this.alpha = this.baseAlpha;
      this.pulsePhase = Math.random() * Math.PI * 2;
      this.pulseSpeed = 0.01 + Math.random() * 0.02;
      this.label = CONFIG.nodeLabels[Math.floor(Math.random() * CONFIG.nodeLabels.length)];
      this.showLabel = this.radius > 4;
      this.isHighlighted = false;

      // Assign color tier
      const roll = Math.random();
      if (roll < 0.3) this.color = CONFIG.colors.nodePrimary;
      else if (roll < 0.6) this.color = CONFIG.colors.nodeSecondary;
      else this.color = CONFIG.colors.nodeAccent;
    }

    update(canvas, mouseX, mouseY, dt) {
      // Pulse
      this.pulsePhase += this.pulseSpeed * dt;
      this.alpha = this.baseAlpha + Math.sin(this.pulsePhase) * 0.15;

      // Mouse repulsion
      if (mouseX !== null && mouseY !== null) {
        const dx = this.x - mouseX;
        const dy = this.y - mouseY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < CONFIG.mouseInfluenceRadius && dist > 0) {
          const force = (CONFIG.mouseInfluenceRadius - dist) / CONFIG.mouseInfluenceRadius;
          this.vx += (dx / dist) * force * CONFIG.mouseRepelStrength * dt;
          this.vy += (dy / dist) * force * CONFIG.mouseRepelStrength * dt;
          this.isHighlighted = true;
        } else {
          this.isHighlighted = false;
        }
      } else {
        this.isHighlighted = false;
      }

      // Drift
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Damping
      this.vx *= 0.995;
      this.vy *= 0.995;

      // Boundary wrap
      const margin = 20;
      if (this.x < -margin) this.x = canvas.width + margin;
      if (this.x > canvas.width + margin) this.x = -margin;
      if (this.y < -margin) this.y = canvas.height + margin;
      if (this.y > canvas.height + margin) this.y = -margin;
    }

    draw(ctx) {
      ctx.save();

      // Glow
      if (this.isHighlighted || this.radius > 4) {
        ctx.shadowColor = this.color;
        ctx.shadowBlur = this.isHighlighted ? 20 : 10;
      }

      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.isHighlighted ? this.radius * 1.5 : this.radius, 0, Math.PI * 2);
      ctx.fill();

      // Label
      if (this.showLabel || this.isHighlighted) {
        ctx.shadowBlur = 0;
        ctx.globalAlpha = this.isHighlighted ? 0.9 : 0.35;
        ctx.fillStyle = '#b7c4ff';
        ctx.font = `${this.isHighlighted ? '11' : '9'}px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(this.label, this.x, this.y - this.radius - 6);
      }

      ctx.restore();
    }
  }

  // ── Main Animation Controller ──────────────────────────────────────────
  class NetworkGraph {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.nodes = [];
      this.mouseX = null;
      this.mouseY = null;
      this.lastTime = performance.now();
      this.animationId = null;
      this.isVisible = true;

      this._resize();
      this._initNodes();
      this._bindEvents();
      this._animate();
    }

    _resize() {
      const parent = this.canvas.parentElement;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      this.canvas.width = rect.width * dpr;
      this.canvas.height = rect.height * dpr;
      this.canvas.style.width = rect.width + 'px';
      this.canvas.style.height = rect.height + 'px';
      this.ctx.scale(dpr, dpr);
      this.displayWidth = rect.width;
      this.displayHeight = rect.height;
    }

    _initNodes() {
      this.nodes = [];
      for (let i = 0; i < CONFIG.nodeCount; i++) {
        // Use display dimensions for node placement
        const node = new Node({ width: this.displayWidth, height: this.displayHeight });
        this.nodes.push(node);
      }
    }

    _bindEvents() {
      // Throttled resize
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          this._resize();
          this._initNodes();
        }, 250);
      });

      // Mouse tracking
      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouseX = e.clientX - rect.left;
        this.mouseY = e.clientY - rect.top;
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.mouseX = null;
        this.mouseY = null;
      });

      // Visibility API — pause when tab is hidden
      document.addEventListener('visibilitychange', () => {
        this.isVisible = !document.hidden;
        if (this.isVisible) {
          this.lastTime = performance.now();
          this._animate();
        }
      });
    }

    _drawConnections() {
      const ctx = this.ctx;
      const maxDist = CONFIG.connectionDistance;

      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const a = this.nodes[i];
          const b = this.nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.25;
            const isActive = a.isHighlighted || b.isHighlighted;

            ctx.save();
            ctx.globalAlpha = isActive ? alpha * 2.5 : alpha;
            ctx.strokeStyle = isActive ? CONFIG.colors.connectionActive : CONFIG.colors.connectionBase;
            ctx.lineWidth = isActive ? 1.5 : 0.5;

            // Glow effect on active connections
            if (isActive) {
              ctx.shadowColor = CONFIG.colors.nodePrimary;
              ctx.shadowBlur = 8;
            }

            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    _drawBackground() {
      const ctx = this.ctx;
      const w = this.displayWidth;
      const h = this.displayHeight;

      const gradient = ctx.createLinearGradient(0, 0, w, h);
      gradient.addColorStop(0, CONFIG.colors.bgGradientStart);
      gradient.addColorStop(1, CONFIG.colors.bgGradientEnd);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      // Subtle radial glow at center
      const radial = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.6);
      radial.addColorStop(0, 'rgba(0, 82, 255, 0.06)');
      radial.addColorStop(1, 'rgba(0, 82, 255, 0)');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, w, h);
    }

    _animate() {
      if (!this.isVisible) return;

      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 16.67, 3); // Normalize to ~60fps, cap at 3x
      this.lastTime = now;

      this.ctx.clearRect(0, 0, this.displayWidth, this.displayHeight);

      // Background
      this._drawBackground();

      // Update nodes
      const canvasBounds = { width: this.displayWidth, height: this.displayHeight };
      for (const node of this.nodes) {
        node.update(canvasBounds, this.mouseX, this.mouseY, dt);
      }

      // Draw connections first (behind nodes)
      this._drawConnections();

      // Draw nodes on top
      for (const node of this.nodes) {
        node.draw(this.ctx);
      }

      this.animationId = requestAnimationFrame(() => this._animate());
    }

    destroy() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
    }
  }

  // ── Auto-initialize ────────────────────────────────────────────────────
  // Expose globally for manual init if needed
  window.TruthMeshNetworkGraph = NetworkGraph;

  // Auto-init on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('network-graph-canvas');
    if (canvas) {
      new NetworkGraph('network-graph-canvas');
    }
  });
})();
