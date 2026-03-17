import { searchBusiness, detailedSearch, fetchDashboard, rescanBusiness } from './api.js';
import { renderState2, renderState4, renderState5, handleSearchSelection, renderHeader  } from './render.js';
import { supabase } from './supabase.js'

const STATES = [
    'state-1-search',
    'state-2-confirm',
    'state-3-loading',
    'state-4-guest',
    'state-5-dashboard'
]

export function setState(stateId) {
    STATES.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = id === stateId ? 'block' : 'none'
    })
}

async function routeUser() {
    const { data: { session } } = await supabase.auth.getSession();

    if(!session) {
        renderHeader(null, supabase)
        setState(STATES[0]);
        hidePageLoader();
        return;
    }

    const dashboardData = await fetchDashboard();

    if (!dashboardData.success || !dashboardData.dashboard) {
        renderHeader(null, supabase)
        setState(STATES[0]);
        hidePageLoader();
        return;
    }

    renderHeader(session.user, supabase)
    renderState5(dashboardData.dashboard);
    setState(STATES[4]);
    hidePageLoader();
}

function hidePageLoader() {
    const loader = document.getElementById('page-loader');
    loader.classList.add('hidden');
    setTimeout(() => loader.remove(), 300);
}

// Grabs cleaned up values from search parameters, and passes them as parameters name, location, and trade, into
// the searchBusinesses() function from the api.js module. That one passes the info plus headers and stuff into 
// the worker, who will then call the Text Search API, and once it receives results back, format it into json (passed back as businesses: [])
// Then, the array of objects result of that search is used for renderState2 and wireSearchResultCards

let _selectedTrade = null;

async function handleSearch(e) {
    e.preventDefault();
    const searchedBusinessName = document.getElementById('business-name').value.trim();
    const searchedBusinessLocation = document.getElementById('business-location').value.trim();
    const selectedTradeType = document.getElementById('trade-type').value;
    
    const submitBtn = document.querySelector('.state-1-submit-btn');
    submitBtn.textContent = "Loading...";
    submitBtn.disabled = true;

    const result = await searchBusiness({
        name: searchedBusinessName,
        location: searchedBusinessLocation,
        trade: selectedTradeType
    })

    submitBtn.textContent = 'Analyze Your Business';
    submitBtn.disabled = false;

    if (!result.success) {
        alert('Error searching - try again!')
        console.error(result.error);
        return;
    }

    _selectedTrade = selectedTradeType;
    renderState2(result.businesses);
    wireSearchResultCards(result.businesses);
    setState('state-2-confirm');
}


// Hooking up event listeners to the business confirmation screens in state 2
// Grabs each card, disables the confirmBtn, adds an event listener to each card that adds the selected class to the card clicked, and 
// takes the index of the card and passes that index of the Array from the data returned from Text Search API into the _selectedBusiness variable
//_selectedBusiness variable now contains an object with the business' displayName.text, id (is this called place_id at this point?), and formattedAddress
let _selectedBusiness = null;

function wireSearchResultCards(businesses) {
    const cards = document.querySelectorAll('.search-result-card');
    const confirmBtn = document.querySelector('.state-2-confirm-btn');

    confirmBtn.disabled = true;

    cards.forEach(card => {
        card.addEventListener('click', () => {

            cards.forEach(card => card.classList.remove('selected'));
            card.classList.add('selected');
            _selectedBusiness = businesses[card.dataset.index];
            confirmBtn.disabled = false;

            handleSearchSelection(_selectedBusiness);
        })
    })
}

// This function needs to take _selectedBusinesses variable, and send that over to api.js to pass to a
// worker endpoint to perform the detailed search
// Also needs to set state3
async function handleConfirm(business) {
    if (!business) return;
    setState(STATES[2]);
    startLoadingCycle();

    const result = await detailedSearch({ business, trade: _selectedTrade });

    if (!result.success) {
        resetProgress();
        alert('Something went wrong. Please try again.');
        setState(STATES[0]);
        return;
    }

    if (result.businessDetails.session_token) {
        localStorage.setItem('session_token', result.businessDetails.session_token);
    }

    completeProgress(async () => {
        const { data: {user} } = await supabase.auth.getUser();

        if(user) {
            renderHeader(user, supabase);
            const dashboardData = await fetchDashboard()
            renderState5(dashboardData.dashboard)
            setState(STATES[4])
        } else {
            renderState4(result.businessDetails)
            setState(STATES[3])
        }
    });
}

// ------------------------------
// STATE 3 FUNCTIONS
// ------------------------------
let _barTimeouts = [];
let _messageTimeouts = [];

function startLoadingCycle() {
    const loadingBar = document.getElementById('progress-bar-fill');
    const textUpdate = document.querySelector('.loading-text');
    startBarCycle(loadingBar);
    startMessageCycle(textUpdate);
}

function startBarCycle(loadingBar) {
    const LOADING_STAGES = [
        { pct: 10, duration: 2000  },
        { pct: 25, duration: 3000  },
        { pct: 40, duration: 4000  },
        { pct: 50, duration: 5000  },
        { pct: 60, duration: 5000  },
        { pct: 75, duration: 3000  },
        { pct: 88, duration: 2000  },
        { pct: 93, duration: 2000  },
    ];

    let elapsed = 0;

    LOADING_STAGES.forEach(stage => {
        elapsed += stage.duration;
        const id = setTimeout(() => {
            loadingBar.style.width = `${stage.pct}%`
        }, elapsed);
        _barTimeouts.push(id);
    })
}

function startMessageCycle(textUpdate) {
    const LOADING_MESSAGES = [
        'Finding your business listing...',
        'Scanning competitors in your area...',
        'Pulling your Google profile...',
        'Running speed tests...',
        'Analyzing mobile site...',
        'Performing Google search...',
        'Crunching the numbers...',
        'Calculating your scores...',
        'Almost there...',
        'Still working, this one is taking a little longer than usual...',
    ];

    let elapsed = 0;
    let interval = 3000;

    LOADING_MESSAGES.forEach(message => {
        elapsed += interval;
        const id = setTimeout(() => {
            textUpdate.textContent = message;
        }, elapsed);
        _messageTimeouts.push(id);
    })
}

function completeProgress(callback) {
    _barTimeouts.forEach(id => clearTimeout(id));
    _messageTimeouts.forEach(id => clearTimeout(id));
    _barTimeouts = [];
    _messageTimeouts = [];

    const loadingBar = document.getElementById('progress-bar-fill');
    const textUpdate = document.querySelector('.loading-text');
    loadingBar.style.width = '100%';
    textUpdate.textContent = 'Done!';

    setTimeout(callback, 600);
}

function resetProgress() {
    _barTimeouts.forEach(id => clearTimeout(id));
    _messageTimeouts.forEach(id => clearTimeout(id));
    _barTimeouts = [];
    _messageTimeouts = [];

    const loadingBar = document.getElementById('progress-bar-fill');
    const textUpdate = document.querySelector('.loading-text');
    loadingBar.style.width = '0%';
    textUpdate.textContent = 'Getting things ready...';
}

// Rescan button
// Sends user back to state 3 and basically reruns the test
async function reRunAudit() {
    document.getElementById('btn-rescan').disabled = true;
    const { business, trade } = await reSearchInit()

    setState(STATES[2]);
    startLoadingCycle();

    const result = await rescanBusiness({ place_id: business.id, confirmed_trade: trade });
    
    if(!result.success) {
        resetProgress();
        alert('Something went wrong. Please try again.');
        setState(STATES[4])
        return;
    }

    completeProgress(async () => {
        const dashboardData = await fetchDashboard();
        renderState5(dashboardData.dashboard);
        setState(STATES[4]);
        document.getElementById('btn-rescan').disabled = false
    })
}

async function reSearchInit() {
    const cached = localStorage.getItem('siteseen_dashboard');
    
    if (cached) {
        const dashboard = JSON.parse(cached);
        return {
            business: { id: dashboard.place_id },
            trade: dashboard.confirmed_trade
        };
    }

    const data = await fetchDashboard();
    return {
        business: { id: data.dashboard.place_id },
        trade: data.dashboard.confirmed_trade
    };
}


// Wiring up all functions and eventListeners to the DOMContentLoaded eventListener
document.addEventListener('DOMContentLoaded', () => {
    routeUser();

    const hamburger = document.getElementById('hamburger');
    const headerRight = document.getElementById('header-right');

    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('active');
        headerRight.classList.toggle('open');
    });

    // Close menu when a link is clicked
    headerRight.addEventListener('click', (e) => {
        if (e.target.closest('a') || e.target.closest('button')) {
            hamburger.classList.remove('active');
            headerRight.classList.remove('open');
        }
    });

    document.getElementById('business-search-form').addEventListener('submit', handleSearch);

    document.querySelector('.state-2-retry-btn').addEventListener('click', () => {
        _selectedBusiness = null;
        setState('state-1-search');
    });

    document.querySelector('.state-2-confirm-btn').addEventListener('click', () => handleConfirm(_selectedBusiness) )

    document.getElementById('btn-rescan').addEventListener('click', () => reRunAudit());

})