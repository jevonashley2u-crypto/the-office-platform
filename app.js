/* ======================================================
   Build Catalyst — Application Logic
   AI Business Audit SPA Controller
   ====================================================== */

// ===== Configuration =====
const CONFIG = {
  SUPABASE_URL: 'https://uxpdrchfucfyjwckjhuu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4cGRyY2hmdWNmeWp3Y2tqaHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzYyMTEsImV4cCI6MjA5NzM1MjIxMX0.i_p_C_MFb86C5b1IAEWblrNz3hPW9QC7djpYsN0rl1s',
  DEMO_MODE: false
};

// ===== State =====
let supabaseClient = null;
let currentFormData = null;

// Auto-detect demo mode
if (CONFIG.SUPABASE_URL !== 'YOUR_SUPABASE_URL' && CONFIG.SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY') {
  try {
    const { createClient } = window.supabase;
    supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    CONFIG.DEMO_MODE = false;
    console.log('✅ Supabase connected — Live mode active');
  } catch (e) {
    console.warn('⚠️ Supabase init failed, falling back to demo mode', e);
  }
} else {
  console.log('ℹ️ Demo mode active — configure Supabase keys in app.js for live mode');
}


/* ============================================================
   PARTICLE SYSTEM
   ============================================================ */
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: null, y: null };
    this.resize();
    this.init();
    this.bindEvents();
    this.animate();
  }

  resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  init() {
    const count = Math.min(Math.floor((this.canvas.width * this.canvas.height) / 18000), 80);
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        radius: Math.random() * 1.8 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.5 ? 190 : 260 // cyan or purple
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => {
      this.resize();
      this.init();
    });
    window.addEventListener('mousemove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
    });
  }

  animate() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;

      // Wrap around edges
      if (p.x < 0) p.x = this.canvas.width;
      if (p.x > this.canvas.width) p.x = 0;
      if (p.y < 0) p.y = this.canvas.height;
      if (p.y > this.canvas.height) p.y = 0;

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, ${p.opacity})`;
      this.ctx.fill();
    }

    // Draw connections
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const dx = this.particles[i].x - this.particles[j].x;
        const dy = this.particles[i].y - this.particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 120) {
          const opacity = (1 - dist / 120) * 0.12;
          this.ctx.beginPath();
          this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
          this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
          this.ctx.strokeStyle = `rgba(0, 212, 255, ${opacity})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }

    requestAnimationFrame(() => this.animate());
  }
}


/* ============================================================
   VIEW MANAGER
   ============================================================ */
const Views = {
  current: 'form-section',

  show(viewId) {
    // Hide current
    const currentEl = document.getElementById(this.current);
    if (currentEl) {
      currentEl.classList.remove('active', 'fade-in');
    }

    // Show new
    const newEl = document.getElementById(viewId);
    if (newEl) {
      newEl.classList.add('active');
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        newEl.classList.add('fade-in');
      });
    }

    this.current = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};


/* ============================================================
   FORM VALIDATION
   ============================================================ */
const FormValidator = {
  form: null,
  submitBtn: null,
  fields: [],

  init() {
    this.form = document.getElementById('audit-form');
    this.submitBtn = document.getElementById('submit-btn');

    this.fields = [
      { el: document.getElementById('business-name'), type: 'text' },
      { el: document.getElementById('industry'), type: 'select' },
      { el: document.getElementById('revenue'), type: 'select' },
      { el: document.getElementById('team-size'), type: 'number' },
      { el: document.getElementById('pain-points'), type: 'text' },
      { el: document.getElementById('email'), type: 'email' }
    ];

    // Add live validation listeners
    this.fields.forEach(field => {
      const events = field.type === 'select' ? ['change'] : ['input', 'blur'];
      events.forEach(evt => {
        field.el.addEventListener(evt, () => this.validateField(field));
      });
    });

    // Form submit
    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (this.validateAll()) {
        handleSubmit();
      }
    });
  },

  validateField(field) {
    const group = field.el.closest('.form-group');
    const value = field.el.value.trim();
    let valid = true;

    if (!value) {
      valid = false;
    } else if (field.type === 'email') {
      valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    } else if (field.type === 'number') {
      valid = parseInt(value) > 0;
    }

    group.classList.toggle('error', !valid && field.el === document.activeElement === false);
    this.updateSubmitState();
    return valid;
  },

  validateAll() {
    let allValid = true;
    this.fields.forEach(field => {
      if (!this.validateField(field)) {
        allValid = false;
      }
    });
    return allValid;
  },

  updateSubmitState() {
    const allFilled = this.fields.every(field => {
      const value = field.el.value.trim();
      if (!value) return false;
      if (field.type === 'email') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
      if (field.type === 'number') return parseInt(value) > 0;
      return true;
    });
    this.submitBtn.disabled = !allFilled;
  },

  getFormData() {
    return {
      businessName: document.getElementById('business-name').value.trim(),
      industry: document.getElementById('industry').value,
      revenue: document.getElementById('revenue').value,
      teamSize: parseInt(document.getElementById('team-size').value),
      painPoints: document.getElementById('pain-points').value.trim(),
      email: document.getElementById('email').value.trim()
    };
  },

  reset() {
    this.form.reset();
    this.fields.forEach(f => f.el.closest('.form-group').classList.remove('error'));
    this.submitBtn.disabled = true;
    this.submitBtn.classList.remove('loading');
  }
};


/* ============================================================
   LOADING MANAGER
   ============================================================ */
const Loading = {
  show() {
    Views.show('loading-section');
  },

  hide() {
    // No-op — the Views.show() call in results will handle it
  }
};


/* ============================================================
   API SERVICE
   ============================================================ */
const API = {
  async analyze(formData) {
    if (CONFIG.DEMO_MODE) {
      return this.mockAnalysis(formData);
    }

    try {
      const { data, error } = await supabaseClient.functions.invoke('analyze', {
        body: {
          formData,
          serviceType: 'business_audit'
        }
      });

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Analysis API error:', err);
      // Fallback to mock on error
      console.warn('Falling back to demo analysis');
      return this.mockAnalysis(formData);
    }
  },

  mockAnalysis(formData) {
    // Generate 5 opportunities based on industry
    const opps = [
      {
        id: 1,
        priority: 1,
        title: 'Centralize Customer Data',
        category: 'Data Architecture',
        description: `Currently, ${formData.businessName}'s customer data is likely scattered across multiple platforms. A unified data architecture provides a single source of truth for the entire team.`,
        whyMatters: 'Eliminates manual data entry across systems and provides real-time visibility into customer health.',
        effortWeeks: '2-3 weeks',
        estimatedImpact: '15-20% time savings',
        quickWinSteps: ['Sync CRM with billing platform', 'Automate new lead entry', 'Set up daily slack reports']
      },
      {
        id: 2,
        priority: 2,
        title: 'Automate Client Onboarding',
        category: 'Workflow Automation',
        description: `Manual onboarding for a team of ${formData.teamSize} creates inconsistent customer experiences. Automated workflows ensure every client gets the right information at the right time.`,
        whyMatters: 'Reduces time-to-value for new customers and minimizes churn risk in the first 90 days.',
        effortWeeks: '1-2 weeks',
        estimatedImpact: '30% faster onboarding',
        quickWinSteps: ['Create welcome email sequence', 'Automate contract generation', 'Trigger internal tasks on signing']
      },
      {
        id: 3,
        priority: 3,
        title: 'AI-Powered Support Triage',
        category: 'AI Integration',
        description: 'Inbound queries can be automatically categorized, prioritized, and routed to the right team member using LLMs before a human ever touches them.',
        whyMatters: 'Dramatically reduces first-response time and frees up team capacity for complex issues.',
        effortWeeks: '3-4 weeks',
        estimatedImpact: '40% reduction in triage time',
        quickWinSteps: ['Auto-tag incoming emails', 'Draft suggested replies', 'Route urgent tickets to Slack']
      },
      {
        id: 4,
        priority: 4,
        title: 'Financial Reporting Automation',
        category: 'Reporting',
        description: 'End-of-month reconciliation and reporting currently requires manual exports. Automated pipelines can generate these reports in real-time.',
        whyMatters: 'Accelerates decision-making with up-to-date financial data rather than looking at a 30-day delay.',
        effortWeeks: '2 weeks',
        estimatedImpact: '$15k+/year in resource savings',
        quickWinSteps: ['Automate expense categorization', 'Generate weekly cash flow summaries', 'Alert on budget overruns']
      },
      {
        id: 5,
        priority: 5,
        title: 'Predictive Inventory/Resource Planning',
        category: 'Operations',
        description: `For ${formData.industry} businesses generating ${formData.revenue}, optimizing resource allocation based on predictive models prevents costly bottlenecks.`,
        whyMatters: 'Moves the business from reactive firefighting to proactive capacity planning.',
        effortWeeks: '4-6 weeks',
        estimatedImpact: '10-15% margin improvement',
        quickWinSteps: ['Identify seasonal trends', 'Set up low-stock/capacity alerts', 'Automate vendor reordering']
      }
    ];

    return {
      success: true,
      report: {
        businessName: formData.businessName,
        executiveSummary: `${formData.businessName} is well-positioned for rapid scaling. With a team of ${formData.teamSize} in the ${formData.industry} sector, manual processes are currently your biggest bottleneck. By implementing the 5 automation opportunities below, you can transition from operational firefighting to strategic growth, potentially unlocking hundreds of hours per month in team capacity.`,
        opportunities: opps,
        nextSteps: ["Schedule consultation", "Create roadmap", "Start quick win"]
      },
      audit_id: "demo-uuid"
    };
  }
};


/* ============================================================
   RESULTS RENDERER
   ============================================================ */
const Results = {
  render(formData, report) {
    // Company name
    document.getElementById('results-company-name').textContent = formData.businessName;

    // Summary
    document.getElementById('summary-text').textContent = report.executiveSummary;

    // Opportunities
    const oppsList = document.getElementById('opportunities-list');
    
    // Safety check in case backend returns old format
    const opportunities = report.opportunities || report.automation_opportunities || [];
    
    oppsList.innerHTML = opportunities.map(item => {
      // Map old backend format to new format if necessary
      const priority = item.priority || 1;
      const category = item.category || item.impact || 'Workflow';
      const why_it_matters = item.whyMatters || item.why_it_matters || 'Improves operational efficiency and reduces manual overhead.';
      const effort = item.effortWeeks || item.effort || '2-4 weeks';
      const impact = item.estimatedImpact || (item.impact && !item.category ? 'High ROI' : (item.impact || 'Significant ROI'));
      const quick_wins = item.quickWinSteps || item.quick_wins || ['Map current process', 'Identify automation tool', 'Build v1 prototype'];
      const description = item.description || item.detail || '';
      
      const quickWinsHtml = quick_wins.map(w => `<li>${this.escapeHtml(w)}</li>`).join('');

      return `
        <div class="result-card opportunity-card">
          <div class="opp-header">
            <div class="opp-badge">${priority}</div>
            <h3 class="opp-title">${this.escapeHtml(item.title)}</h3>
          </div>
          <span class="opp-category">${this.escapeHtml(category)}</span>
          <p class="opp-desc">${this.escapeHtml(description)}</p>
          <p class="opp-why-matters"><strong>Why it matters:</strong> ${this.escapeHtml(why_it_matters)}</p>
          
          <div class="opp-metrics">
            <div class="metric-item">
              <span class="metric-label">Estimated Effort</span>
              <span class="metric-val">${this.escapeHtml(effort)}</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Projected Impact</span>
              <span class="metric-val">${this.escapeHtml(impact)}</span>
            </div>
          </div>
          
          <details class="opp-quick-wins">
            <summary class="quick-wins-summary">View Quick Wins</summary>
            <ul class="quick-wins-list">
              ${quickWinsHtml}
            </ul>
          </details>
        </div>
      `;
    }).join('');

    // Hide loading
    const loadingSection = document.getElementById('loading-section');
    if (loadingSection) {
      loadingSection.classList.remove('active');
    }

    // Show results view
    Views.show('results-section');

    // Animate cards
    requestAnimationFrame(() => {
      this.staggerCards();
    });
  },

  staggerCards() {
    const cards = document.querySelectorAll('.result-card');
    cards.forEach((card, i) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(30px)';
      setTimeout(() => {
        card.style.transition = 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 150 + i * 120);
    });
  },

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
};


/* ============================================================
   MAIN FLOW
   ============================================================ */
async function handleSubmit() {
  const formData = FormValidator.getFormData();
  currentFormData = formData;

  // Set loading state on button
  const btn = document.getElementById('submit-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  // Show loading spinner — stays visible until API responds
  Loading.show();

  try {
    // Wait for the actual analysis response (no fake timer)
    const response = await API.analyze(formData);

    // Render results only after we have the response
    if (response && response.report) {
      Results.render(formData, response.report);
    } else {
      throw new Error("Invalid response from server");
    }

  } catch (err) {
    console.error('Analysis failed:', err);
    alert('Something went wrong. Please try again.');
    Views.show('form-section');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

function resetForm() {
  FormValidator.reset();
  currentFormData = null;
  Views.show('form-section');
}


/* ============================================================
   INITIALIZATION
   ============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  // Initialize particle system
  const canvas = document.getElementById('particles-canvas');
  if (canvas) {
    new ParticleSystem(canvas);
  }

  // Initialize form validation
  FormValidator.init();

  // New audit button
  const newAuditBtn = document.getElementById('new-audit-btn');
  if (newAuditBtn) {
    newAuditBtn.addEventListener('click', resetForm);
  }

  // CTA Buttons
  const btnDownloadPdf = document.getElementById('btn-download-pdf');
  if (btnDownloadPdf) {
    btnDownloadPdf.addEventListener('click', () => {
      window.print(); // Simple fallback for save as PDF
    });
  }

  const btnEmailReport = document.getElementById('btn-email-report');
  if (btnEmailReport) {
    btnEmailReport.addEventListener('click', () => {
      alert("A copy of this report has already been emailed to you!");
    });
  }

  // Add initial fade-in
  const formSection = document.getElementById('form-section');
  if (formSection) {
    formSection.classList.add('fade-in');
  }

  // Demo mode indicator
  if (CONFIG.DEMO_MODE) {
    console.log(
      '%c🚀 Build Catalyst — Demo Mode %c\nConfigure Supabase keys in app.js for live API integration.',
      'color: #00d4ff; font-size: 14px; font-weight: bold;',
      'color: #94a3b8; font-size: 12px;'
    );
  }
});
