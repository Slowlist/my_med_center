// systems/grants.js — Grant Program full modal UI

let currentGrantTab = 'available';

function setGrantTab(tab) {
  currentGrantTab = tab;
  renderGrants();
}

// ─── Category helpers ────────────────────────────────────────────────────────

function _grantCatClass(cat) {
  if (!cat) return 'gr-cat--government';
  const c = cat.toLowerCase();
  if (c.includes('government') || c.includes('public')) return 'gr-cat--government';
  if (c.includes('medical') || c.includes('department')) return 'gr-cat--medical';
  if (c.includes('workforce')) return 'gr-cat--workforce';
  return 'gr-cat--infrastructure';
}

function _grantColor(cat) {
  if (!cat) return '#1976d2';
  const c = cat.toLowerCase();
  if (c.includes('government') || c.includes('public')) return '#1976d2';
  if (c.includes('medical') || c.includes('department')) return '#e91e63';
  if (c.includes('workforce')) return '#43a047';
  return '#f57f17';
}

// ─── Writer status block ─────────────────────────────────────────────────────

function _renderWriterBlock() {
  if (typeof hasGrantWriterOfficeBuilt !== 'function') return '';
  if (!hasGrantWriterOfficeBuilt()) {
    return `<div class="gr-writer-block">
      <span class="gr-writer-locked">📝 Build a Grant Writer Office to unlock the grant program.</span>
    </div>`;
  }
  if (!hasGrantWriterOfficeAccess()) {
    return `<div class="gr-writer-block">
      <span class="gr-writer-locked">📝 Grant Writer Office built — hire a Grant Writer to start applying.</span>
    </div>`;
  }
  const writers = typeof getGrantWriterTeam === 'function' ? getGrantWriterTeam() : [];
  if (!writers.length) {
    return `<div class="gr-writer-block">
      <span class="gr-writer-locked">📝 No active Grant Writer on shift. Hire or schedule one to apply for grants.</span>
    </div>`;
  }
  return writers.map(w => {
    const trait = typeof getGrantWriterTrait === 'function' ? getGrantWriterTrait(w) : null;
    const energy = w.energy ?? 100;
    const morale = w.morale ?? 100;
    const energyPct = Math.round(energy);
    const energyCls = energy >= 60 ? '#66bb6a' : energy >= 35 ? '#ffa726' : '#ef5350';
    const traitHtml = trait ? `<span class="gr-writer-trait">${trait.label}</span>` : '';
    const skillBonus = typeof getGrantWriterSkillBonus === 'function'
      ? Math.round(getGrantWriterSkillBonus() * 100) : 0;
    return `<div class="gr-writer-block">
      <div>
        <div class="gr-writer-name">📝 ${w.name}</div>
        <div class="gr-writer-meta">
          <span>Energy: ${energyPct}%</span>
          <div class="gr-writer-energy">
            <div class="gr-writer-energy-bar"><div class="gr-writer-energy-fill" style="width:${energyPct}%;background:${energyCls}"></div></div>
          </div>
          <span>Morale: ${Math.round(morale)}%</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
        ${traitHtml}
        <span class="gr-writer-meta">Skill bonus: +${skillBonus}%</span>
      </div>
    </div>`;
  }).join('');
}

// ─── Chance breakdown ────────────────────────────────────────────────────────

function _renderChanceBreakdown(offer) {
  const def = typeof getGrantDef === 'function' ? getGrantDef(offer?.id) : null;
  const base = (def?.successChance ?? 0.70) - 0.25;
  const skill = typeof getGrantWriterSkillBonus === 'function' ? getGrantWriterSkillBonus() : 0;
  const trait = Number.isFinite(offer?.grantTraitApprovalBonus)
    ? offer.grantTraitApprovalBonus
    : (typeof getGrantWriterOfferModifiers === 'function' ? getGrantWriterOfferModifiers(offer).approval : 0);
  const rep = typeof reputation !== 'undefined' ? (reputation - 50) / 500 : 0;
  const comp = typeof getGrantGovernmentComplianceBonus === 'function' ? getGrantGovernmentComplianceBonus() : 0;
  const admin = typeof getGrantAdminBonus === 'function' ? getGrantAdminBonus() : 0;
  const total = typeof getGrantApprovalChance === 'function' ? getGrantApprovalChance(offer) : 0;
  const totalPct = Math.round(total * 100);
  const chanceCls = total >= 0.70 ? 'gr-chance-fill--high' : total >= 0.50 ? 'gr-chance-fill--med' : 'gr-chance-fill--low';
  const numCls = total >= 0.70 ? 'gr-stat-num--good' : total >= 0.50 ? 'gr-stat-num--warn' : 'gr-stat-num--bad';

  const rows = [
    { label: 'Grant base', val: base },
    { label: 'Writer skill', val: skill },
    { label: 'Trait bonus', val: trait },
    { label: 'Reputation', val: rep },
    { label: 'Compliance', val: comp },
    { label: 'Admin dept.', val: admin },
  ].filter(r => Math.abs(r.val) >= 0.005);

  const rowsHtml = rows.map(r => {
    const cls = r.val > 0 ? 'gr-breakdown-val--pos' : 'gr-breakdown-val--neg';
    return `<div class="gr-breakdown-row"><span>${r.label}</span><span class="${cls}">${r.val > 0 ? '+' : ''}${Math.round(r.val * 100)}%</span></div>`;
  }).join('');

  return `<div class="gr-chance-bar-wrap">
    <div class="gr-chance-bar"><div class="gr-chance-fill ${chanceCls}" style="width:${totalPct}%"></div></div>
    <div style="display:flex;justify-content:space-between;font-size:.74rem;">
      <span style="color:#666;">Approval chance</span>
      <span class="gr-stat-num ${numCls}">${totalPct}%</span>
    </div>
  </div>
  <details class="gr-breakdown" style="cursor:pointer;">
    <summary style="font-size:.71rem;color:#aaa;list-style:none;">Show breakdown</summary>
    ${rowsHtml}
  </details>`;
}

// ─── Tab: Available ──────────────────────────────────────────────────────────

function _renderAvailableTab() {
  const offers = (typeof grantOffers !== 'undefined' ? grantOffers : []).filter(o => o.status === 'available');
  const hasWriter = typeof hasGrantWriterOfficeAccess === 'function' && hasGrantWriterOfficeAccess();

  if (!offers.length) {
    return `<div class="gr-empty">No grants available right now.<br><span class="gr-empty-sub">Grants rotate as you complete or decline existing applications.</span></div>`;
  }

  return offers.map(offer => {
    const def = typeof getGrantDef === 'function' ? getGrantDef(offer.id) : offer;
    const reqMet = typeof isGrantRequirementMet === 'function' ? isGrantRequirementMet(def) : true;
    const color = _grantColor(offer.category);
    const catCls = _grantCatClass(offer.category);
    const total = typeof getGrantApprovalChance === 'function' ? getGrantApprovalChance(offer) : 0;
    const canApply = hasWriter && reqMet;

    // Parse requirements into a displayable list
    const reqText = def?.requirementText || '';
    const reqItems = reqText.split(/[.;]/).map(s => s.trim()).filter(s => s.length > 3);
    const reqHtml = reqItems.length
      ? `<div class="gr-reqs">
          <div class="gr-req-label">Requirements</div>
          ${reqItems.map(r => `<div class="gr-req-item ${reqMet ? 'gr-req--met' : 'gr-req--unmet'}">
            <span class="gr-req-icon">${reqMet ? '✓' : '✗'}</span>
            <span>${r}</span>
          </div>`).join('')}
        </div>`
      : '';

    const reviewText = offer.reviewDaysAdjusted || offer.reviewDays || 3;
    const durText = offer.durationDays > 0 ? `${offer.durationDays}d effect` : 'One-time';

    return `<div class="gr-card${reqMet ? '' : ' gr-card--unmet'}" data-tt-grant="${offer.id}" tabindex="0" style="--gr-color:${color}">
      <div class="gr-card-header">
        <span class="gr-cat-chip ${catCls}">${offer.category}</span>
        <span class="gr-card-name">${offer.label}</span>
      </div>
      <p class="gr-card-desc">${offer.desc || ''}</p>
      ${reqHtml}
      ${_renderChanceBreakdown(offer)}
      <div class="gr-stats-row">
        <div class="gr-stat-cell">
          <span class="gr-stat-lbl">Review Time</span>
          <span class="gr-stat-num">${reviewText} day${reviewText === 1 ? '' : 's'}</span>
        </div>
        <div class="gr-stat-cell">
          <span class="gr-stat-lbl">Duration</span>
          <span class="gr-stat-num">${durText}</span>
        </div>
        <div class="gr-stat-cell">
          <span class="gr-stat-lbl">Base Chance</span>
          <span class="gr-stat-num">${Math.round((def?.successChance ?? 0.70) * 100)}%</span>
        </div>
      </div>
      <div class="gr-reward">💵 ${offer.rewardText}</div>
      <button class="gr-apply-btn" onclick="applyForGrant('${offer.id}')" ${canApply ? '' : 'disabled'}>
        ${!hasWriter ? 'Needs Grant Writer' : !reqMet ? 'Requirements Not Met' : 'Apply Now'}
      </button>
    </div>`;
  }).join('');
}

// ─── Tab: In Review ──────────────────────────────────────────────────────────

function _renderReviewTab() {
  const offers = (typeof grantOffers !== 'undefined' ? grantOffers : []).filter(o => o.status === 'review');
  if (!offers.length) {
    return `<div class="gr-empty">No applications in review.<br><span class="gr-empty-sub">Apply for available grants to start the review process.</span></div>`;
  }
  return offers.map(offer => {
    const reviewTotal = offer.reviewDaysAdjusted || offer.reviewDays || 3;
    const pct = Math.round(((reviewTotal - (offer.daysLeft || 0)) / reviewTotal) * 100);
    const chance = typeof getGrantApprovalChance === 'function' ? getGrantApprovalChance(offer) : 0;
    const chancePct = Math.round(chance * 100);
    const numCls = chance >= 0.70 ? 'gr-stat-num--good' : chance >= 0.50 ? 'gr-stat-num--warn' : 'gr-stat-num--bad';
    return `<div class="gr-review-card">
      <div class="gr-review-header">
        <div>
          <span class="gr-cat-chip ${_grantCatClass(offer.category)}">${offer.category}</span>
          <span class="gr-review-name"> ${offer.label}</span>
        </div>
        <span class="gr-review-days">${offer.daysLeft} day${offer.daysLeft === 1 ? '' : 's'} left</span>
      </div>
      <div class="gr-review-bar-wrap"><div class="gr-review-bar" style="width:${pct}%"></div></div>
      <div class="gr-review-meta">
        Approval chance: <strong class="${numCls}">${chancePct}%</strong>
        &nbsp;·&nbsp; ${offer.rewardText}
      </div>
    </div>`;
  }).join('');
}

// ─── Tab: Active ─────────────────────────────────────────────────────────────

function _renderActiveGrantsTab() {
  const offers = (typeof grantOffers !== 'undefined' ? grantOffers : []).filter(o => o.status === 'active');
  if (!offers.length) {
    return `<div class="gr-empty">No grants currently active.<br><span class="gr-empty-sub">Approved grants provide ongoing effects to your hospital during their active period.</span></div>`;
  }
  return offers.map(offer => {
    const def = typeof getGrantDef === 'function' ? getGrantDef(offer.id) : offer;
    const eff = def?.effect || {};
    const totalDays = offer.durationDays || def?.durationDays || 7;
    const pct = Math.min(100, Math.round(((offer.daysLeft || 0) / totalDays) * 100));

    // Build effect chips
    const chips = [];
    if (eff.approvalCash) chips.push(`💵 $${eff.approvalCash.toLocaleString()} received`);
    if (eff.subsidyPerCase) chips.push(`📋 +$${eff.subsidyPerCase}/public case/day`);
    if (eff.moralePerDay) chips.push(`💚 +${eff.moralePerDay} nurse morale/day`);
    if (eff.stressRelief) chips.push(`😌 −${eff.stressRelief} stress/day`);
    if (eff.rpPerDay) chips.push(`🔬 +${eff.rpPerDay} RP/day`);
    if (eff.discount) chips.push(`🏗 ${Math.round(eff.discount * 100)}% build discount`);
    if (eff.xpMult) chips.push(`📈 Intern XP ×${eff.xpMult}`);

    return `<div class="gr-active-card">
      <div class="gr-active-header">
        <div>
          <span class="gr-cat-chip ${_grantCatClass(offer.category)}">${offer.category}</span>
          <span class="gr-active-name"> ${offer.label}</span>
        </div>
        <span class="gr-active-days">${offer.daysLeft} day${offer.daysLeft === 1 ? '' : 's'} left</span>
      </div>
      <div class="gr-active-bar-wrap"><div class="gr-active-bar" style="width:${pct}%"></div></div>
      <div class="gr-active-effects">
        ${chips.map(c => `<span class="gr-effect-chip">${c}</span>`).join('')}
      </div>
    </div>`;
  }).join('');
}

// ─── Tab: Denied/History ─────────────────────────────────────────────────────

function _renderDeniedTab() {
  const offers = (typeof grantOffers !== 'undefined' ? grantOffers : []).filter(o => o.status === 'denied');
  if (!offers.length) {
    return `<div class="gr-empty">No recently denied applications.<br><span class="gr-empty-sub">Denied grants clear after a couple of days and open space for new offers.</span></div>`;
  }
  return offers.map(offer => `<div class="gr-denied-card">
    <div>
      <span class="gr-cat-chip ${_grantCatClass(offer.category)}">${offer.category}</span>
      <span class="gr-denied-name"> ${offer.label}</span>
    </div>
    <span class="gr-denied-label">Denied</span>
  </div>`).join('');
}

// ─── Main render ─────────────────────────────────────────────────────────────

function renderGrants() {
  const panel = document.getElementById('grantpanel');
  if (!panel) return;

  if (typeof hasGrantWriterOfficeBuilt !== 'function' || !hasGrantWriterOfficeBuilt()) {
    panel.innerHTML = `<div class="gr-writer-block">
      <span class="gr-writer-locked">📝 Build a Grant Writer Office to unlock the grant funding program.</span>
    </div>
    <div class="gr-empty">The Grant Writer Office enables your hospital to apply for government, medical, workforce, and infrastructure grants.<br><span class="gr-empty-sub">Build the office in the Offices section of the build menu.</span></div>`;
    return;
  }

  if (!hasGrantWriterOfficeAccess()) {
    panel.innerHTML = `<div class="gr-writer-block">
      <span class="gr-writer-locked">📝 Office built — hire a Grant Writer to start applying for grants.</span>
    </div>
    <div class="gr-empty">A Grant Writer is needed to prepare and submit grant applications.<br><span class="gr-empty-sub">Hire one from the Staff menu to begin.</span></div>`;
    return;
  }

  if (typeof ensureGrantOffers === 'function') ensureGrantOffers();

  const offers = typeof grantOffers !== 'undefined' ? grantOffers : [];
  const availCount = offers.filter(o => o.status === 'available').length;
  const reviewCount = offers.filter(o => o.status === 'review').length;
  const activeCount = offers.filter(o => o.status === 'active').length;
  const deniedCount = offers.filter(o => o.status === 'denied').length;

  const tabs = [
    { id: 'available', label: `Available (${availCount})` },
    { id: 'review', label: `In Review (${reviewCount})` },
    { id: 'active', label: `Active (${activeCount})` },
    { id: 'denied', label: `History (${deniedCount})` },
  ];

  const tabHtml = tabs.map(t =>
    `<button class="gr-tab${currentGrantTab === t.id ? ' gr-tab--active' : ''}" onclick="setGrantTab('${t.id}')">${t.label}</button>`
  ).join('');

  let content = '';
  if (currentGrantTab === 'available') content = _renderAvailableTab();
  else if (currentGrantTab === 'review') content = _renderReviewTab();
  else if (currentGrantTab === 'active') content = _renderActiveGrantsTab();
  else content = _renderDeniedTab();

  panel.innerHTML = `
    ${_renderWriterBlock()}
    <div class="gr-tab-bar">${tabHtml}</div>
    <div class="gr-tab-content">${content}</div>
  `;
}
