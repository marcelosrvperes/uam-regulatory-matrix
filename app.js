/* ===================================================================
   3D x 9T Regulatory Governance Matrix — Interactive Portal
   UAM/eVTOL Regulatory Framework for Brazil
   =================================================================== */

(function () {
  'use strict';

  /* ---------- Constants ---------- */
  const DIMENSIONS = [
    { code: 'D1', label: 'Actors & Competencies', pt: 'Atores e Competências' },
    { code: 'D2', label: 'Normative Instruments', pt: 'Instrumentos Normativos' },
    { code: 'D3', label: 'Territorial Integration', pt: 'Integração Regulatória Territorial' }
  ];

  const THEMES = [
    { code: 'T1', label: 'Urban Noise',              short: 'Noise',    pt: 'Ruído Urbano' },
    { code: 'T2', label: 'Social Integration',        short: 'Social',   pt: 'Integração Social' },
    { code: 'T3', label: 'Land Use',                  short: 'Land',     pt: 'Uso do Solo' },
    { code: 'T4', label: 'Energy Infrastructure',     short: 'Energy',   pt: 'Infraestrutura Energética' },
    { code: 'T5', label: 'Vertiport Infrastructure',  short: 'Vertip.',  pt: 'Vertiportos' },
    { code: 'T6', label: 'Airspace Governance',       short: 'Airsp.',   pt: 'Espaço Aéreo' },
    { code: 'T7', label: 'Environment',               short: 'Envir.',   pt: 'Meio Ambiente' },
    { code: 'T8', label: 'Supporting Technologies',   short: 'Tech',     pt: 'Tecnologias' },
    { code: 'T9', label: 'Economic Viability',        short: 'Econ.',    pt: 'Viab. Econômica' }
  ];

  const SCORE_LABELS = {
    0: 'Absent / Critical Gap',
    1: 'Partial / Analogous Coverage',
    2: 'Adequate / UAM-Specific'
  };

  const SCORE_COLORS = {
    0: '#dc3545',
    1: '#ffc107',
    2: '#28a745'
  };

  let DATA = [];

  /* ---------- Bootstrap ---------- */
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    try {
      const resp = await fetch('data.json');
      DATA = await resp.json();
    } catch (e) {
      document.getElementById('matrix-container').innerHTML =
        '<p style="color:red;text-align:center;">Error loading data.json. Make sure it is in the same folder as index.html.</p>';
      return;
    }

    renderMatrix();
    renderLegend();
    renderAggregates();
    setupModal();
    setupNavToggle();
  }

  /* ---------- Helpers ---------- */
  function getCell(dimCode, themeCode) {
    return DATA.find(d => d.dim_code === dimCode && d.theme_code === themeCode);
  }

  function avg(arr) {
    if (!arr.length) return 0;
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  function barColor(val, max) {
    const ratio = val / max;
    if (ratio < 0.35) return '#dc3545';
    if (ratio < 0.65) return '#ffc107';
    return '#28a745';
  }

  /* ---------- Matrix ---------- */
  function renderMatrix() {
    const container = document.getElementById('matrix-container');
    const table = document.createElement('table');
    table.className = 'matrix-table';
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', '3D x 9T Regulatory Governance Matrix');

    // Header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.className = 'corner';
    corner.textContent = '';
    headerRow.appendChild(corner);

    THEMES.forEach(t => {
      const th = document.createElement('th');
      th.className = 'theme-label';
      th.innerHTML = '<span title="' + t.label + ' (' + t.pt + ')">' + t.code + '<br>' + t.short + '</span>';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Body rows
    const tbody = document.createElement('tbody');
    DIMENSIONS.forEach(dim => {
      const row = document.createElement('tr');
      const dimTh = document.createElement('th');
      dimTh.className = 'dim-label';
      dimTh.innerHTML = dim.code + ': ' + dim.label;
      dimTh.title = dim.pt;
      row.appendChild(dimTh);

      THEMES.forEach(theme => {
        const cell = getCell(dim.code, theme.code);
        const td = document.createElement('td');
        td.className = 'matrix-cell score-' + (cell ? cell.score_012 : '');
        td.setAttribute('role', 'gridcell');
        td.setAttribute('tabindex', '0');
        td.setAttribute('aria-label',
          dim.code + ' x ' + theme.code + ': ' + dim.label + ' x ' + theme.label +
          ' — Score: ' + (cell ? cell.score_012 : 'N/A'));
        td.dataset.dim = dim.code;
        td.dataset.theme = theme.code;

        if (cell) {
          td.innerHTML = cell.score_012 + '<span class="cell-raw">' + cell.score_raw_010.toFixed(1) + '</span>';
        }

        td.addEventListener('click', () => openModal(dim.code, theme.code));
        td.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openModal(dim.code, theme.code);
          }
        });

        row.appendChild(td);
      });
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  /* ---------- Legend ---------- */
  function renderLegend() {
    const container = document.getElementById('legend-container');
    [
      { score: 0, label: '0 = Absent / Critical Gap' },
      { score: 1, label: '1 = Partial / Analogous' },
      { score: 2, label: '2 = Adequate / UAM-Specific' }
    ].forEach(item => {
      const div = document.createElement('div');
      div.className = 'legend-item';
      div.innerHTML =
        '<span class="legend-swatch" style="background:' + SCORE_COLORS[item.score] + '"></span>' +
        '<span>' + item.label + '</span>';
      container.appendChild(div);
    });
  }

  /* ---------- Aggregates ---------- */
  function renderAggregates() {
    const container = document.getElementById('aggregates-container');

    // By dimension (rows)
    const dimPanel = document.createElement('div');
    dimPanel.className = 'agg-panel';
    dimPanel.innerHTML = '<h3>Average by Dimension (Row)</h3>';
    DIMENSIONS.forEach(dim => {
      const cells = DATA.filter(d => d.dim_code === dim.code);
      const rawAvg = avg(cells.map(c => c.score_raw_010));
      const discreteAvg = avg(cells.map(c => c.score_012));
      dimPanel.appendChild(makeAggRow(
        dim.code + ': ' + dim.label,
        rawAvg,
        10,
        discreteAvg.toFixed(2) + ' / ' + rawAvg.toFixed(2)
      ));
    });

    // Overall
    const overallRaw = avg(DATA.map(c => c.score_raw_010));
    const overallDiscrete = avg(DATA.map(c => c.score_012));
    dimPanel.appendChild(makeAggRow(
      'Overall',
      overallRaw,
      10,
      overallDiscrete.toFixed(2) + ' / ' + overallRaw.toFixed(2),
      true
    ));

    // By theme (columns)
    const themePanel = document.createElement('div');
    themePanel.className = 'agg-panel';
    themePanel.innerHTML = '<h3>Average by Theme (Column)</h3>';
    THEMES.forEach(theme => {
      const cells = DATA.filter(d => d.theme_code === theme.code);
      const rawAvg = avg(cells.map(c => c.score_raw_010));
      const discreteAvg = avg(cells.map(c => c.score_012));
      themePanel.appendChild(makeAggRow(
        theme.code + ': ' + theme.short,
        rawAvg,
        10,
        discreteAvg.toFixed(2) + ' / ' + rawAvg.toFixed(2)
      ));
    });

    themePanel.appendChild(makeAggRow(
      'Overall',
      overallRaw,
      10,
      overallDiscrete.toFixed(2) + ' / ' + overallRaw.toFixed(2),
      true
    ));

    container.appendChild(dimPanel);
    container.appendChild(themePanel);
  }

  function makeAggRow(label, value, max, displayText, isBold) {
    const row = document.createElement('div');
    row.className = 'agg-row';
    if (isBold) row.style.fontWeight = '700';

    const pct = Math.round((value / max) * 100);
    const color = barColor(value, max);

    row.innerHTML =
      '<span class="agg-label">' + label + '</span>' +
      '<div class="agg-bar-container">' +
        '<div class="agg-bar" style="width:' + pct + '%;background:' + color + '"></div>' +
      '</div>' +
      '<span class="agg-value">' + displayText + '</span>';

    return row;
  }

  /* ---------- Modal ---------- */
  function setupModal() {
    const overlay = document.getElementById('modal-overlay');
    const closeBtn = document.getElementById('modal-close');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    closeBtn.addEventListener('click', closeModal);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  function openModal(dimCode, themeCode) {
    const cell = getCell(dimCode, themeCode);
    if (!cell) return;

    const dim = DIMENSIONS.find(d => d.code === dimCode);
    const theme = THEMES.find(t => t.code === themeCode);

    // Title
    document.getElementById('modal-title').textContent =
      dimCode + ' x ' + themeCode + ': ' + dim.label + ' x ' + theme.label;

    // Build body
    const body = document.getElementById('modal-body');
    body.innerHTML = '';

    // Score badge
    const badgeDiv = document.createElement('div');
    badgeDiv.innerHTML =
      '<span class="score-badge s' + cell.score_012 + '">' +
        'Score: ' + cell.score_012 +
      '</span>' +
      '<span class="score-label-text">' + SCORE_LABELS[cell.score_012] +
      ' (raw: ' + cell.score_raw_010.toFixed(2) + '/10)</span>';
    body.appendChild(badgeDiv);

    // Component scores
    const compGrid = document.createElement('div');
    compGrid.className = 'components';
    [
      { name: 'C1: UAM Specificity', value: cell.C1_especificidade_uam },
      { name: 'C2: Operationality', value: cell.C2_operacionalidade },
      { name: 'C3: Institutional Comp.', value: cell.C3_competencia_inst }
    ].forEach(comp => {
      const card = document.createElement('div');
      card.className = 'comp-card';
      const pct = Math.round((comp.value / 10) * 100);
      const color = barColor(comp.value, 10);
      card.innerHTML =
        '<div class="comp-name">' + comp.name + '</div>' +
        '<div class="comp-value">' + comp.value.toFixed(1) + '</div>' +
        '<div class="comp-bar"><div class="comp-bar-fill" style="width:' + pct + '%;background:' + color + '"></div></div>';
      compGrid.appendChild(card);
    });
    body.appendChild(compGrid);

    // C2 justification
    if (cell.c2_nota) {
      const justDiv = document.createElement('div');
      justDiv.className = 'justification';
      justDiv.innerHTML =
        '<div class="justification-label">C2 Qualitative Justification (Researcher Assessment)</div>' +
        '<p>' + escapeHtml(cell.c2_nota) + '</p>';
      body.appendChild(justDiv);
    }

    // C1 traceability
    if (cell.c1_explanation) {
      const c1Div = document.createElement('div');
      c1Div.className = 'justification';
      c1Div.innerHTML =
        '<div class="justification-label">C1 Traceability (UAM Specificity)</div>' +
        '<p>' + escapeHtml(cell.c1_explanation) + '</p>';
      body.appendChild(c1Div);
    }

    // C3 traceability
    if (cell.c3_explanation) {
      const c3Div = document.createElement('div');
      c3Div.className = 'justification';
      c3Div.innerHTML =
        '<div class="justification-label">C3 Traceability (Institutional Competence)</div>' +
        '<p>' + escapeHtml(cell.c3_explanation) + '</p>';
      body.appendChild(c3Div);
    }

    // Metadata grid
    const metaGrid = document.createElement('div');
    metaGrid.className = 'meta-grid';

    metaGrid.appendChild(makeMetaItem('Relevant Documents', String(cell.n_docs_relevantes)));
    metaGrid.appendChild(makeMetaItem('UAM-Specific Documents', String(cell.n_uam_direto)));
    metaGrid.appendChild(makeMetaItem(
      'Regulatory Bodies (Orgaos)',
      cell.orgaos_presentes ? cell.orgaos_presentes.replace(/;\s*/g, ', ') : 'None identified'
    ));
    metaGrid.appendChild(makeMetaItem('Dimension (pt-BR)', dim.pt));
    body.appendChild(metaGrid);

    // Top 3 docs
    if (cell.top3_docs && cell.top3_docs.trim() !== '-') {
      const docsDiv = document.createElement('div');
      docsDiv.className = 'docs-section';
      docsDiv.innerHTML = '<h4>Top 3 Documents Cited</h4>';
      const docs = cell.top3_docs.split(';').map(s => s.trim()).filter(Boolean);
      docs.forEach(doc => {
        const tag = document.createElement('span');
        tag.className = 'doc-tag';
        tag.textContent = doc;
        docsDiv.appendChild(tag);
      });
      body.appendChild(docsDiv);
    }

    // Show modal
    document.getElementById('modal-overlay').classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.remove('open');
    document.body.style.overflow = '';
  }

  function makeMetaItem(label, value) {
    const div = document.createElement('div');
    div.className = 'meta-item';
    div.innerHTML =
      '<div class="meta-label">' + label + '</div>' +
      '<div class="meta-value">' + escapeHtml(value) + '</div>';
    return div;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /* ---------- Navigation toggle ---------- */
  function setupNavToggle() {
    const toggle = document.querySelector('.navbar-toggle');
    const links = document.querySelector('.navbar-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => {
        links.classList.toggle('open');
      });
    }
  }

})();
