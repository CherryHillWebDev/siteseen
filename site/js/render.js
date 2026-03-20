export function renderState2(businesses) {
    const container = document.querySelector('.search-results-container');
    
    container.innerHTML = businesses.map((b, i) => `
        <div class="search-result-card" data-index="${i}" data-place-id="${b.id}">
            <p class="searched-business-name">${b.displayName.text}</p>
            <p class="searched-business-address">${b.formattedAddress}</p>
        </div>
    `).join('');
}

export function handleSearchSelection(business) {
    const confirmSearchText = document.querySelector('.p-el-select');
    confirmSearchText.textContent = `✓ Selected: ${business.displayName.text}`;
}

// Rendering states 4 and 5
const state4 = document.getElementById('state-4-guest');
const state5 = document.getElementById('state-5-dashboard');

export function renderState4(auditData) {
    renderDashboard(state4, auditData);
}

export function renderState5(dashboardData) {
    renderDashboard(state5, dashboardData);
    renderHealthGrid(dashboardData);
    renderIssueTracker(dashboardData.issues);
    renderRescanButton(dashboardData.updated_at ?? dashboardData.created_at);
    renderKeywordSection(dashboardData);
}

function renderDashboard(container, auditData) {
    renderTitle(container, auditData.business_name);
    renderCompetitorTable(container, auditData.competitor_list, auditData.place_id, auditData.user_appeared, auditData.business_name, auditData.average_rating, auditData.review_count);
    renderTopDashText(container, auditData);
    renderIssuesChart(container, auditData);
    const gaugeContainer = container.querySelector('.health-gauge');
    if (gaugeContainer) renderGauge(gaugeContainer, auditData.business_health_score, 180);

    const select = container.querySelector('.missed-holder-select');
    if (select) {
        select.addEventListener('change', (e) => {
            const miss = container.querySelector('.miss');
            miss.querySelectorAll('.missed-holder').forEach(div => div.classList.remove('active'));
            miss.querySelector(`.${e.target.value}`).classList.add('active');
        });
    }
}

function renderTitle(container, placeName) {
    container.querySelector('.dashboard-title').textContent = `${placeName}'s Results`;
}


// Business health SVG gauge
function scoreColor(score) {
    if (score >= 75) return { track: '#3B6D11', label: 'Excellent' };
    if (score >= 50) return { track: '#BA7517', label: 'Needs Work' };
    if (score >= 25) return { track: '#D85A30', label: 'Poor' };
    return { track: '#E24B4A', label: 'Critical' };
}

function polarToXY(cx, cy, r, angle) {
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function buildArcPath(cx, cy, r, startAngle, endAngle) {
    const s = polarToXY(cx, cy, r, startAngle);
    const e = polarToXY(cx, cy, r, endAngle);
    const large = (endAngle - startAngle) > Math.PI ? 1 : 0;
    return `M ${s.x.toFixed(3)} ${s.y.toFixed(3)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(3)} ${e.y.toFixed(3)}`;
}

function renderGauge(container, score, size) {
    size = size || 180;
    const clamped    = Math.max(0, Math.min(100, score));
    const R          = size * 0.36;
    const cx         = size / 2;
    const cy         = size * 0.54;
    const sw         = size * 0.09;
    const startAngle = Math.PI;
    const totalArc   = Math.PI;
    const fillArc    = totalArc * (clamped / 100);
    const { track, label } = scoreColor(clamped);
    const uid = 'gf_' + Math.random().toString(36).slice(2, 7);

    container.innerHTML = `
        <svg width="100%" height="auto" viewBox="0 0 ${size} ${Math.round(size * 0.72)}" xmlns="http://www.w3.org/2000/svg" style="display:block;">
            <path d="${buildArcPath(cx, cy, R, startAngle, startAngle + totalArc)}" fill="none" stroke="#e5e7eb" stroke-width="${sw}" stroke-linecap="round"/>
            <path id="${uid}" d="${buildArcPath(cx, cy, R, startAngle, startAngle + 0.001)}" fill="none" stroke="${track}" stroke-width="${sw}" stroke-linecap="round"/>
            <text x="${cx}" y="${cy + R * 0.00}" text-anchor="middle" font-size="${Math.round(size * 0.18)}" font-weight="500" fill="${track}" font-family="system-ui,sans-serif">${Math.round(clamped)}</text>
            <text x="${cx}" y="${cy + R * 0.25}" text-anchor="middle" font-size="${Math.round(size * 0.09)}" fill="#6b7280" font-family="system-ui,sans-serif">${label}</text>
        </svg>`;

    const pathEl = container.querySelector('#' + uid);
    if (!pathEl || clamped <= 0) return;

    let startTime = null;
    const duration = 800;
    function ease(t) { return t < 0.5 ? 2*t*t : -1+(4-2*t)*t; }
    function animate(now) {
        if (!startTime) startTime = now;
        const t = Math.min((now - startTime) / duration, 1);
        const arc = fillArc * ease(t);
        if (arc > 0.001) pathEl.setAttribute('d', buildArcPath(cx, cy, R, startAngle, startAngle + arc));
        if (t < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
}

// Competitor table rendering
const COMPETITOR_LOOKUP_TABLE = {
    1: "39%",
    2: "19%",
    3: "10%",
    4: "7%",
    5: "5%",
    6: "4%",
    7: "3%",
    8: "2%",
    9: "2%",
    10: "1.5%"
}

function renderCompetitorTable(container, competitorData, businessId, userAppeared, businessName, userRanking, userReviewCount) {
    const tableBody = container.querySelector('.competitor-table-body');
    tableBody.innerHTML = '';

    competitorData.forEach(entry => {
        const newRow = document.createElement('tr');
        if (entry.place_id === businessId) {
            newRow.classList.add('comp-row-user');
            if (entry.rank > 5) newRow.classList.add('is-last');
        }
        
        const capPercent = COMPETITOR_LOOKUP_TABLE[entry.rank] ?? "< 1%";

        newRow.innerHTML = `
            <td class="comp-lg">#${entry.rank}</td>
            <td>${entry.business_name}</td>
            <td class="centered">${capPercent ?? '--'}</td>
            <td class="centered"><span class="star">★</span>${entry.average_rating ?? '--'}</td>
            <td class="centered">${entry.user_rating_count}</td>
        `;
        tableBody.appendChild(newRow);
    });

    if (!userAppeared) {
        const notFoundRow = document.createElement('tr');
        notFoundRow.classList.add('comp-row-user', 'is-last');
        notFoundRow.innerHTML = `
            <td class="comp-lg">--</td>
            <td>${businessName}</td>
            <td class="centered">< 1%</td>
            <td class="centered"><span class="star">★</span>${userRanking ?? '--'}</td>
            <td class="centered">${userReviewCount ?? '--'}</td>
        `;
        tableBody.appendChild(notFoundRow);
    }
}



function renderTopDashText(container, auditData) {
    container.querySelector('.search-query-display').textContent =
        `Results for "${auditData.confirmed_trade_display} near ${auditData.search_county}, ${auditData.search_state}"`;

    container.querySelector('.dash-right-location').textContent  = auditData.search_county;
    container.querySelector('.lead-capture-rank').textContent = auditData.rank_position ?? 'outside the top 10';
    container.querySelector('.lead-capture-pct').textContent     = `${(auditData.lead_capture_pct * 100).toFixed(1)}%`;
    container.querySelector('.miss-call-number').textContent         = `${auditData.call_miss_low}-${auditData.call_miss_high}`;
    container.querySelector('.miss-rev-number').textContent           = `$${auditData.revenue_miss_low.toLocaleString()}-$${auditData.revenue_miss_high.toLocaleString()}`;
}

function renderIssuesChart(container, auditData) {
    const chart = container.querySelector('.issues-chart');
    if (!chart) return;

    const highBar = container.querySelector('.bar-high');
    const medBar = container.querySelector('.bar-medium');
    const wrappers = chart.querySelectorAll('.chart-bar-wrapper');
    if (!highBar || !medBar) return;

    const highCount = auditData.critical_issue_count_high || 0;
    const medCount = auditData.critical_issue_count_medium || 0;
    const maxCount = Math.max(highCount, medCount);
    const maxHeight = 150;

    let messageEl = chart.querySelector('.no-issues-message');
    if (!messageEl) {
        messageEl = document.createElement('p');
        messageEl.className = 'no-issues-message centered';
        messageEl.textContent = 'No issues right now, good job!';
        chart.appendChild(messageEl);
    }

    if(maxCount > 0) {
        wrappers.forEach(w => w.style.display = '');
        messageEl.style.display = 'none';

        highBar.style.height = (highCount / maxCount) * maxHeight + 'px';
        medBar.style.height = (medCount / maxCount) * maxHeight + 'px';

        highBar.dataset.count = highCount;
        medBar.dataset.count = medCount;

        const highTooltip = highBar.querySelector('.chart-tooltip');
        const medTooltip = medBar.querySelector('.chart-tooltip');
        if (highTooltip) highTooltip.textContent = `${highCount} High Priority Issues`;
        if (medTooltip) medTooltip.textContent = `${medCount} Medium Priority Issues`;    
    }
    else {
        wrappers.forEach(w => w.style.display = 'none');
        messageEl.style.display = '';
    }
}

// State 5 only functions
function healthColor(value, thresholds) {
    if (value === null || value === undefined) return '';
    if (value >= thresholds.green) return '#3B6D11';
    if (value >= thresholds.yellow) return '#BA7517';
    return '#E24B4A';
}

function renderHealthGrid(auditData) {
    const fields = [
        { selector: '.health-gbp-score',      value: auditData.gbp_score,            thresholds: { green: 75, yellow: 50 } },
        { selector: '.health-website-score',   value: auditData.website_score,        thresholds: { green: 75, yellow: 50 } },
        { selector: '.health-mobile-score',    value: auditData.pagespeed_mobile,     thresholds: { green: 75, yellow: 50 } },
        { selector: '.health-photo-count',     value: auditData.photo_count,          thresholds: { green: 10, yellow: 5  } },
        { selector: '.health-review-count',    value: auditData.review_count,         thresholds: { green: 20, yellow: 10 } },
        { selector: '.health-recency-score',   value: auditData.review_recency_score, thresholds: { green: 75, yellow: 50 } },
    ];

    fields.forEach(({ selector, value, thresholds }) => {
        const el = state5.querySelector(selector);
        if (!el) return;
        el.textContent = value ?? '--';
        el.style.color = value !== null && value !== undefined
            ? healthColor(value, thresholds)
            : '';
    });
}

function renderIssueTracker(issues) {
    const tracker = state5.querySelector('.issue-tracker');

    if (!issues || issues.length === 0) {
        tracker.innerHTML = `
            <div class="issue-card issue-empty">
                <p class="heading heading-small blue-font centered">No issues found — nice job!</p>
                <p class="centered mt-sm">Your Google Business Profile looks healthy. Keep collecting reviews and adding photos to maintain your ranking.</p>
            </div> 
        `;
        return;
    }

    tracker.innerHTML = issues.map(issue => `
        <div class="issue-card">
            <p class="heading heading-small bold dg-font centered mb-sm">${issue.title}</p>
            <div class="issue-card-upper grid">
                <div class="issue-type">
                    <div class="issue-color ${issue.priority === 1 ? 'issue-red' : 'issue-yellow'}"></div>
                    <div class="issue-type-title">
                        <p class="extra-bold">${issue.priority === 1 ? 'High Priority' : 'Medium Priority'}</p>
                    </div>
                </div>
                <div class="issue-description">
                    <p class="dg-font">${issue.description}</p>
                </div>
                <div class="issue-carrot-holder">
                    <svg class="issue-carrot" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                    </svg>
                </div>
            </div>
            <div class="issue-dropdown-wrapper">
                <div class="issue-dropdown">
                    <div class="issue-dropdown-inner">
                        <p class="heading heading-small dg-font centered">Suggested Steps</p>
                        <ul class="issue-ol">
                            ${issue.fix.map(step => `<li>${step}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Wire up accordion listeners on freshly rendered cards
    wireIssueCards();
}

function renderRescanButton(createdAt) {
    const lastScanned = document.getElementById('last-scanned');
    const rescanNote  = document.getElementById('rescan-note');

    const scanDate = new Date(createdAt);
    lastScanned.textContent = `Last scanned ${scanDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`;
    rescanNote.hidden = true;
}

function wireIssueCards() {
    state5.querySelectorAll('.issue-card').forEach(card => {
        const upper   = card.querySelector('.issue-card-upper');
        const carrot  = card.querySelector('.issue-carrot');
        const wrapper = card.querySelector('.issue-dropdown-wrapper');
        if (!upper || !wrapper) return;

        upper.addEventListener('click', () => {
            const isOpen = wrapper.classList.contains('active');
            state5.querySelectorAll('.issue-dropdown-wrapper.active').forEach(w => {
                w.classList.remove('active');
                w.closest('.issue-card').querySelector('.issue-carrot')?.classList.remove('active');
            });
            if (!isOpen) {
                wrapper.classList.add('active');
                carrot.classList.add('active');
            }
        });
    });
}

export function renderHeader(user, supabase) {
    const authLinks = document.getElementById('header-auth-links');
    if (!authLinks) return;

    if (user) {
        authLinks.innerHTML = `
            <span class="header-link lg-font">${user.email}</span>
            <button id="btn-signout" class="header-link cta-btn btn-red">Sign Out</button>
        `;
        document.getElementById('btn-signout').addEventListener('click', async () => {
            await supabase.auth.signOut();
            localStorage.removeItem('siteseen_dashboard');
            localStorage.removeItem('session_token');
            window.location.reload();
        });
    } else {
        authLinks.innerHTML = `
            <a href="/auth.html" class="header-link">Sign In</a>
            <a href="/auth.html#signup" class="header-link cta-btn btn-red">Sign Up</a>
        `;
    }
}


//Keyword table section
function renderKeywordList(containerId, keywords) {
    const el = document.getElementById(containerId);
 
    if (!keywords || keywords.length === 0) {
        el.innerHTML = '<p class="kw-empty">No keyword data available for this site.</p>';
        return;
    }
 
    const sorted = [...keywords].sort((a, b) => b.count - a.count);
    const max = Math.max(...sorted.map(k => k.count), 1);
 
    el.innerHTML = sorted.map(({ term, type, count }) => `
        <div class="keyword-row">
            <span class="kw-term" title="${term}">${term}</span>
            <div class="kw-bar-wrap">
                <div class="kw-bar ${type}" style="width:${Math.round((count / max) * 100)}%"></div>
            </div>
            <span class="kw-count">${count}x</span>
            <span class="kw-badge ${type}">${type}</span>
        </div>
    `).join('');
}

function buildDropdown(competitorKeywordData, userPlaceId) {
    const select = document.getElementById('competitor-select');
    select.innerHTML = '';
 
    const valid = Object.entries(competitorData)
        .filter(([placeId, data]) => 
            placeId !== userPlaceId &&
            !data.crawl_failed && 
            data.keywords
        )
        .sort((a, b) => a[1].rank - b[1].rank);
 
    if (valid.length === 0) {
        select.innerHTML = '<option>No data available</option>';
        renderKeywordList('competitor-keyword-list', null);
        return;
    }
 
    valid.forEach(([placeId, data]) => {
        const opt = document.createElement('option');
        opt.value = placeId;
        opt.textContent = `${data.business_name}`;
        select.appendChild(opt);
    });
 
    // Default to first (highest ranked valid competitor)
    renderKeywordList('competitor-keyword-list', valid[0][1].keywords);
 
    select.addEventListener('change', () => {
        const selected = competitorKeywordData[select.value];
        renderKeywordList('competitor-keyword-list', selected?.keywords ?? null);
    });
}

function renderKeywordSection(dashboardData) {
    const userKeywords = dashboardData.keyword_analysis?.keywords ?? null;
    const competitorData = dashboardData.competitor_keyword_data ?? {};

    renderKeywordList('user-keyword-list', userKeywords);
    buildDropdown(competitorData, dashboardData.place_id);
}

async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('siteseen_dashboard');
    localStorage.removeItem('session_token');
    window.location.reload();
}