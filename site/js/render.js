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
}

function renderDashboard(container, auditData) {
    renderTitle(container, auditData.business_name);
    renderCompetitorTable(container, auditData.competitor_list, auditData.place_id, auditData.user_appeared, auditData.business_name, auditData.average_rating);
    renderTopDashText(container, auditData);
}

function renderTitle(container, placeName) {
    container.querySelector('.dashboard-title').textContent = `${placeName}'s Results`;
}

function renderCompetitorTable(container, competitorData, businessId, userAppeared, businessName, userRanking) {
    const tableBody = container.querySelector('.competitor-table-body');
    tableBody.innerHTML = '';

    competitorData.forEach(entry => {
        const newRow = document.createElement('tr');
        if (entry.place_id === businessId) {
            newRow.classList.add('comp-row-user');
            if (entry.rank > 5) newRow.classList.add('is-last');
        }
        newRow.innerHTML = `
            <td class="comp-lg">#${entry.rank}</td>
            <td>${entry.business_name}</td>
            <td class="comp-lg"><span class="star">★</span>${entry.average_rating ?? '--'}</td>
        `;
        tableBody.appendChild(newRow);
    });

    if (!userAppeared) {
        const notFoundRow = document.createElement('tr');
        notFoundRow.classList.add('comp-row-user', 'is-last');
        notFoundRow.innerHTML = `
            <td class="comp-lg">--</td>
            <td>${businessName}</td>
            <td class="comp-lg"><span class="star">★</span>${userRanking ?? '--'}</td>
        `;
        tableBody.appendChild(notFoundRow);
    }
}

function renderTopDashText(container, auditData) {
    const totalIssues = auditData.critical_issue_count_high + auditData.critical_issue_count_medium;
    const hasBoth = auditData.critical_issue_count_high > 0 && auditData.critical_issue_count_medium > 0;

    container.querySelector('.search-query-display').textContent =
        `Results for "${auditData.confirmed_trade_display} near ${auditData.search_county}, ${auditData.search_state}"`;

    // Only exists in state 5
    const healthScoreEl = container.querySelector('.dash-business-health-score');
    if (healthScoreEl) healthScoreEl.textContent = `Business Health Score: ${auditData.business_health_score}`;

    container.querySelector('.dash-right-location').textContent  = auditData.search_county;
    container.querySelector('.lead-capture-rank').textContent = auditData.rank_position ?? 'outside the top 20';
    container.querySelector('.lead-capture-pct').textContent     = `${(auditData.lead_capture_pct * 100).toFixed(1)}%`;
    container.querySelector('.missed-calls').textContent         = `${auditData.call_miss_low}-${auditData.call_miss_high}`;
    container.querySelector('.missed-rev').textContent           = `$${auditData.revenue_miss_low.toLocaleString()}-$${auditData.revenue_miss_high.toLocaleString()}`;

    // Issues — populate existing HTML elements dynamically
    container.querySelector('.dash-crit-issues').textContent = `Issues Found: ${totalIssues}`;

    const highPrio = container.querySelector('.high-prio');
    const medPrio  = container.querySelector('.med-prio');

    highPrio.querySelector('.high-prio-issue-count').textContent    = `${auditData.critical_issue_count_high} `;
    medPrio.querySelector('.medium-prio-issue-count').textContent   = `${auditData.critical_issue_count_medium} `;

    if (hasBoth) {
        highPrio.classList.add('two-issues');
        medPrio.classList.add('two-issues');
    } else {
        highPrio.classList.remove('two-issues');
        medPrio.classList.remove('two-issues');
    }
}

// State 5 only functions
function renderHealthGrid(auditData) {
    state5.querySelector('.health-gbp-score').textContent     = auditData.gbp_score ?? '--';
    state5.querySelector('.health-website-score').textContent = auditData.website_score ?? '--';
    state5.querySelector('.health-mobile-score').textContent  = auditData.pagespeed_mobile ?? '--';
    state5.querySelector('.health-photo-count').textContent   = auditData.photo_count ?? '--';
    state5.querySelector('.health-review-count').textContent  = auditData.review_count ?? '--';
    state5.querySelector('.health-recency-score').textContent = auditData.review_recency_score ?? '--';
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
            <p class="heading heading-small bold blue-font centered mb-sm">${issue.title}</p>
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
                        <p class="heading heading-small white-font centered">Suggested Steps</p>
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


async function handleSignOut() {
    await supabase.auth.signOut();
    localStorage.removeItem('siteseen_dashboard');
    localStorage.removeItem('session_token');
    window.location.reload();
}