import './styles.css';

const STORAGE_KEY = 'fixmyroad-tickets-v1';
const statusOptions = ['Submitted', 'Under Review', 'Assigned', 'Resolved'];
const severityOptions = ['Low', 'Medium', 'High'];

const placeholderPhoto = (label) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <rect width="800" height="600" fill="#dfeaf8"/>
      <path d="M180 420 L250 160 L350 230 L420 110 L545 420 Z" fill="#7b8ea9" opacity="0.9"/>
      <path d="M210 420 L300 210 L420 210 L500 420 Z" fill="#9faec0" opacity="0.9"/>
      <circle cx="532" cy="126" r="44" fill="#ffd166"/>
      <path d="M512 124 L545 124 L528 152 Z" fill="#f4b942"/>
      <text x="35" y="560" font-size="44" font-family="Arial, sans-serif" fill="#233a52">${label}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

const seededTickets = [
  {
    id: 'TCK-1001',
    reporterName: 'Aisha',
    location: 'Main St & 2nd Ave',
    severity: 'High',
    status: 'Under Review',
    note: 'Large pothole spreading across the lane near the bus stop.',
    aiConfirmed: true,
    photoData: placeholderPhoto('Main St'),
    createdAt: '2026-10-08T09:45:00Z',
    updatedAt: '2026-10-08T10:10:00Z',
  },
  {
    id: 'TCK-1002',
    reporterName: 'Daniel',
    location: 'North Ridge Rd',
    severity: 'Medium',
    status: 'Assigned',
    note: 'Crack near the school entrance is getting worse with rain.',
    aiConfirmed: true,
    photoData: placeholderPhoto('North Ridge'),
    createdAt: '2026-10-07T14:10:00Z',
    updatedAt: '2026-10-07T15:05:00Z',
  },
  {
    id: 'TCK-1003',
    reporterName: 'Mila',
    location: 'Lakeview Blvd',
    severity: 'Low',
    status: 'Submitted',
    note: 'Small but deep pothole by the curb.',
    aiConfirmed: true,
    photoData: placeholderPhoto('Lakeview'),
    createdAt: '2026-10-09T07:35:00Z',
    updatedAt: '2026-10-09T07:35:00Z',
  },
];

const state = {
  role: 'citizen',
  statusFilter: 'all',
  severityFilter: 'all',
  locationFilter: 'all',
  selectedTicketId: null,
};

const app = document.querySelector('#app');

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = () => reject(new Error('Unable to read file.'));
    reader.readAsDataURL(file);
  });

const getTickets = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return JSON.parse(saved);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(seededTickets));
  return seededTickets;
};

const saveTickets = (tickets) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tickets));
};

const makeTicketId = () => {
  const datePart = Date.now().toString(36).toUpperCase();
  const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TCK-${datePart}-${randomPart}`;
};

const formatDate = (isoString) => {
  const date = new Date(isoString || Date.now());
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const simulateAiAnalysis = (fileName = '') =>
  new Promise((resolve) => {
    const lowerName = fileName.toLowerCase();
    const matchesRoadKeyword = /pothole|road|asphalt|crack|hole|tarmac|lane/i.test(lowerName);
    const isPothole = matchesRoadKeyword || Math.random() > 0.2;
    const severity =
      (matchesRoadKeyword && /large|deep|wide|danger/i.test(lowerName)) || Math.random() > 0.75
        ? 'High'
        : Math.random() > 0.45
          ? 'Medium'
          : 'Low';

    resolve({
      isPothole,
      severity,
      reason: isPothole
        ? 'The image matches a road defect consistent with a pothole.'
        : 'The image does not clearly show a pothole or road damage.',
    });
  });

const getFilteredTickets = () => {
  const tickets = getTickets();

  return tickets.filter((ticket) => {
    const matchesStatus =
      state.statusFilter === 'all' || ticket.status === state.statusFilter;
    const matchesSeverity =
      state.severityFilter === 'all' || ticket.severity === state.severityFilter;
    const matchesLocation =
      state.locationFilter === 'all' || ticket.location === state.locationFilter;

    return matchesStatus && matchesSeverity && matchesLocation;
  });
};

const getSelectedTicket = (tickets) => {
  const selected = tickets.find((ticket) => ticket.id === state.selectedTicketId);
  return selected || tickets[0] || null;
};

const renderCitizenView = () => {
  const tickets = getTickets().filter((ticket) => ticket.reporterName === 'Citizen');

  return `
    <section class="card form-card">
      <div class="section-header">
        <div>
          <p class="eyebrow">Citizen</p>
          <h2>Report a pothole</h2>
        </div>
      </div>

      <form id="citizenForm" class="stacked-form">
        <div class="field-grid">
          <label>
            <span>Name</span>
            <input name="reporterName" type="text" placeholder="Your name" required />
          </label>

          <label>
            <span>Location</span>
            <input name="locationCustom" type="text" placeholder="Type a neighborhood, street, or landmark" />
          </label>
        </div>

        <label>
          <span>Choose a common location</span>
          <select name="locationPreset">
            <option value="">Select a location</option>
            <option>Main St & 2nd Ave</option>
            <option>North Ridge Rd</option>
            <option>Lakeview Blvd</option>
            <option>Downtown Junction</option>
            <option>Elm Park</option>
            <option>Westfield Ave</option>
          </select>
        </label>

        <label>
          <span>Upload photo</span>
          <input name="photo" type="file" accept="image/*" required />
        </label>

        <label>
          <span>Details</span>
          <textarea name="note" rows="4" placeholder="Add a note about what you saw"></textarea>
        </label>

        <button type="submit" class="primary-button">Analyze with AI</button>
      </form>
    </section>

    <section class="card">
      <div class="section-header split-header">
        <div>
          <p class="eyebrow">My reports</p>
          <h2>Live status</h2>
        </div>
        <div class="status-pill">${tickets.length} total</div>
      </div>

      <div class="report-list">
        ${
          tickets.length
            ? tickets
                .map(
                  (ticket) => `
                    <article class="report-item">
                      <div class="media-preview">
                        <img src="${ticket.photoData || placeholderPhoto(ticket.location)}" alt="Pothole report" />
                      </div>
                      <div class="report-body">
                        <div class="report-topline">
                          <strong>${ticket.location}</strong>
                          <span class="priority-badge ${ticket.severity.toLowerCase()}">${ticket.severity}</span>
                        </div>
                        <p>${ticket.note}</p>
                        <div class="meta-row">
                          <span>${formatDate(ticket.createdAt)}</span>
                          <span class="status-chip ${ticket.status.toLowerCase().replace(/\s+/g, '-')}">${ticket.status}</span>
                        </div>
                      </div>
                    </article>
                  `,
                )
                .join('')
            : '<p class="empty-state">No pothole reports yet. Submit your first report to track progress.</p>'
        }
      </div>
    </section>
  `;
};

const renderOfficerView = () => {
  const tickets = getFilteredTickets();
  const selectedTicket = getSelectedTicket(tickets);

  const allLocations = [...new Set(getTickets().map((ticket) => ticket.location))];

  return `
    <section class="card sidebar-panel">
      <div class="section-header">
        <div>
          <p class="eyebrow">Officer</p>
          <h2>Dashboard</h2>
        </div>
      </div>

      <div class="filter-list">
        <label>
          <span>Status</span>
          <select id="statusFilter">
            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All</option>
            ${statusOptions
              .map(
                (status) =>
                  `<option value="${status}" ${state.statusFilter === status ? 'selected' : ''}>${status}</option>`,
              )
              .join('')}
          </select>
        </label>

        <label>
          <span>Severity</span>
          <select id="severityFilter">
            <option value="all" ${state.severityFilter === 'all' ? 'selected' : ''}>All</option>
            ${severityOptions
              .map(
                (severity) =>
                  `<option value="${severity}" ${state.severityFilter === severity ? 'selected' : ''}>${severity}</option>`,
              )
              .join('')}
          </select>
        </label>

        <label>
          <span>Location</span>
          <select id="locationFilter">
            <option value="all" ${state.locationFilter === 'all' ? 'selected' : ''}>All</option>
            ${allLocations
              .map(
                (location) =>
                  `<option value="${location}" ${state.locationFilter === location ? 'selected' : ''}>${location}</option>`,
              )
              .join('')}
          </select>
        </label>
      </div>
    </section>

    <section class="card ticket-list-panel">
      <div class="section-header split-header">
        <div>
          <p class="eyebrow">Queue</p>
          <h2>Open tickets</h2>
        </div>
        <div class="status-pill">${tickets.length} tickets</div>
      </div>

      <div class="ticket-list">
        ${
          tickets.length
            ? tickets
                .map(
                  (ticket) => `
                    <article class="ticket-item ${selectedTicket && selectedTicket.id === ticket.id ? 'selected' : ''}" data-ticket-id="${ticket.id}">
                      <div class="ticket-head">
                        <strong>${ticket.location}</strong>
                        <span class="priority-badge ${ticket.severity.toLowerCase()}">${ticket.severity}</span>
                      </div>
                      <p>${ticket.reporterName}</p>
                      <div class="meta-row">
                        <span>${formatDate(ticket.createdAt)}</span>
                        <span class="status-chip ${ticket.status.toLowerCase().replace(/\s+/g, '-')}">${ticket.status}</span>
                      </div>
                    </article>
                  `,
                )
                .join('')
            : '<p class="empty-state">No tickets match the current filters.</p>'
        }
      </div>
    </section>

    <section class="card detail-panel">
      ${
        selectedTicket
          ? `
            <div class="section-header split-header">
              <div>
                <p class="eyebrow">Ticket</p>
                <h2>${selectedTicket.id}</h2>
              </div>
              <span class="status-pill">AI verified</span>
            </div>

            <div class="detail-grid">
              <div class="detail-image-wrap">
                <img src="${selectedTicket.photoData || placeholderPhoto(selectedTicket.location)}" alt="Ticket detail" />
              </div>
              <div class="detail-info">
                <dl>
                  <div><dt>Reporter</dt><dd>${selectedTicket.reporterName}</dd></div>
                  <div><dt>Location</dt><dd>${selectedTicket.location}</dd></div>
                  <div><dt>Severity</dt><dd>${selectedTicket.severity}</dd></div>
                  <div><dt>Status</dt><dd>${selectedTicket.status}</dd></div>
                </dl>
              </div>
            </div>

            <div class="note-box">
              <strong>Report note</strong>
              <p>${selectedTicket.note || 'No extra notes available.'}</p>
            </div>

            <label>
              <span>Update status</span>
              <select data-status-update="${selectedTicket.id}">
                ${statusOptions
                  .map(
                    (status) =>
                      `<option value="${status}" ${selectedTicket.status === status ? 'selected' : ''}>${status}</option>`,
                  )
                  .join('')}
              </select>
            </label>
          `
          : '<p class="empty-state">Select a ticket to review details.</p>'
      }
    </section>
  `;
};

const renderApp = () => {
  const mainLayout = `
    <div class="app-shell">
      <header class="topbar">
        <div>
          <p class="eyebrow">Smart city maintenance</p>
          <h1>FixMyRoad</h1>
        </div>

        <div class="role-toggle" aria-label="Role switcher">
          <button class="role-button ${state.role === 'citizen' ? 'active' : ''}" data-role="citizen">Citizen</button>
          <button class="role-button ${state.role === 'officer' ? 'active' : ''}" data-role="officer">Officer</button>
        </div>
      </header>

      <main class="content-grid ${state.role === 'officer' ? 'officer-grid' : 'citizen-grid'}">
        ${state.role === 'citizen' ? renderCitizenView() : renderOfficerView()}
      </main>
    </div>
  `;

  app.innerHTML = mainLayout;
  bindUiEvents();
};

const updateTicketStatus = (ticketId, nextStatus) => {
  const tickets = getTickets();
  const ticketIndex = tickets.findIndex((ticket) => ticket.id === ticketId);

  if (ticketIndex >= 0) {
    tickets[ticketIndex].status = nextStatus;
    tickets[ticketIndex].updatedAt = new Date().toISOString();
    saveTickets(tickets);
    state.selectedTicketId = ticketId;
    renderApp();
  }
};

const handleCitizenSubmit = async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const reporterName = form.reporterName.value.trim();
  const typedLocation = form.locationCustom.value.trim();
  const selectedLocation = form.locationPreset.value;
  const photo = form.photo.files[0];
  const note = form.note.value.trim();
  const location = typedLocation || selectedLocation;

  if (!reporterName || !location || !photo) {
    window.alert('Please provide your name, the location, and a photo before submitting.');
    return;
  }

  try {
    const photoData = await readFileAsDataUrl(photo);
    const analysis = await simulateAiAnalysis(photo.name);

    if (!analysis.isPothole) {
      window.alert('AI could not confirm this is a pothole. Please upload a clearer photo or try again.');
      return;
    }

    const tickets = getTickets();
    const newTicket = {
      id: makeTicketId(),
      reporterName,
      location,
      severity: analysis.severity,
      status: 'Submitted',
      note: note || 'Citizen report submitted for review.',
      aiConfirmed: true,
      photoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tickets.unshift(newTicket);
    saveTickets(tickets);
    form.reset();
    state.role = 'citizen';
    renderApp();
    window.alert(`Report submitted successfully. Ticket ${newTicket.id} was marked as ${analysis.severity} severity.`);
  } catch (error) {
    window.alert('There was an issue processing your report. Please try again.');
  }
};

const bindUiEvents = () => {
  document.querySelectorAll('[data-role]').forEach((button) => {
    button.addEventListener('click', () => {
      state.role = button.dataset.role;
      renderApp();
    });
  });

  const citizenForm = document.querySelector('#citizenForm');
  if (citizenForm) {
    citizenForm.addEventListener('submit', handleCitizenSubmit);
  }

  const statusFilter = document.querySelector('#statusFilter');
  if (statusFilter) {
    statusFilter.addEventListener('change', (event) => {
      state.statusFilter = event.target.value;
      renderApp();
    });
  }

  const severityFilter = document.querySelector('#severityFilter');
  if (severityFilter) {
    severityFilter.addEventListener('change', (event) => {
      state.severityFilter = event.target.value;
      renderApp();
    });
  }

  const locationFilter = document.querySelector('#locationFilter');
  if (locationFilter) {
    locationFilter.addEventListener('change', (event) => {
      state.locationFilter = event.target.value;
      renderApp();
    });
  }

  document.querySelectorAll('[data-ticket-id]').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedTicketId = card.dataset.ticketId;
      renderApp();
    });
  });

  document.querySelectorAll('[data-status-update]').forEach((select) => {
    select.addEventListener('change', (event) => {
      const ticketId = event.target.dataset.statusUpdate;
      updateTicketStatus(ticketId, event.target.value);
    });
  });
};

const initializeApp = () => {
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveTickets(seededTickets);
  }

  const allTickets = getTickets();
  state.selectedTicketId = allTickets[0]?.id || null;
  renderApp();
};

initializeApp();
