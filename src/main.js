const STORAGE_KEY = 'fixmyroad-tickets-v1';
const statusOptions = ['Submitted', 'Under Review', 'Assigned', 'Resolved'];
const severityOptions = ['Low', 'Medium', 'High'];

const placeholderPhoto = (label) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="#ecf6ff"/>
          <stop offset="100%" stop-color="#dce9ff"/>
        </linearGradient>
      </defs>
      <rect width="800" height="600" fill="url(#bg)"/>
      <path d="M120 440 L275 180 L380 235 L470 120 L640 440 Z" fill="#7e8fa5" opacity="0.92"/>
      <path d="M175 440 L312 215 L430 215 L522 440 Z" fill="#9aa8ba" opacity="0.9"/>
      <circle cx="528" cy="142" r="46" fill="#ffd166"/>
      <path d="M510 143 L546 143 L528 171 Z" fill="#efb84d"/>
      <text x="35" y="560" font-size="42" font-family="Arial, sans-serif" fill="#1d3557">${label}</text>
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
    confidence: 96,
    riskScore: 88,
    duplicateHint: 'No likely duplicate found',
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
    note: 'Crack near the school entrance is worsening after rain.',
    aiConfirmed: true,
    confidence: 91,
    riskScore: 71,
    duplicateHint: 'Similar report exists within 0.7 km',
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
    confidence: 88,
    riskScore: 51,
    duplicateHint: 'No likely duplicate found',
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
  citizenName: 'Civic User',
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

const normalizeSeverity = (value) => {
  if (value === 'High' || /danger|deep|large|wide|severe|dangerous/i.test(value)) return 'High';
  if (value === 'Medium' || /warning|medium|crack|damaged|road/i.test(value)) return 'Medium';
  return 'Low';
};

const simulateAiAnalysis = (fileName = '', note = '', location = '') => {
  const keywords = [fileName, note, location].join(' ').toLowerCase();
  const severe = /danger|deep|large|wide|major|bus|school|lane|crack|hole/i.test(keywords);
  const medium = /road|pothole|asphalt|surface|damage|repair/i.test(keywords);
  const isPothole = /pothole|road|asphalt|crack|hole|tarmac|lane/i.test(keywords) || Math.random() > 0.2;
  const severity = isPothole
    ? severe
      ? 'High'
      : medium || Math.random() > 0.55
        ? 'Medium'
        : 'Low'
    : 'Low';

  const confidence = Math.min(99, 78 + (isPothole ? 13 : 0) + (severity === 'High' ? 7 : severity === 'Medium' ? 5 : 2) + Math.floor(Math.random() * 6));
  const riskScore = Math.min(98, (severity === 'High' ? 86 : severity === 'Medium' ? 69 : 46) + Math.floor((confidence - 80) / 2));

  return {
    isPothole,
    severity,
    confidence,
    riskScore,
    duplicateHint:
      /junction|main|ridge|lake|park|west|east|north|south/i.test(location)
        ? 'Similar patch request nearby: possible duplicate.'
        : 'No likely duplicate found',
    reason: isPothole
      ? 'The image and metadata are aligned with a road surface defect consistent with pothole damage.'
      : 'The report does not clearly match a pothole or road defect from the submitted evidence.',
  };
};

const getFilteredTickets = () => {
  const tickets = getTickets();

  return tickets.filter((ticket) => {
    const matchesStatus = state.statusFilter === 'all' || ticket.status === state.statusFilter;
    const matchesSeverity = state.severityFilter === 'all' || ticket.severity === state.severityFilter;
    const matchesLocation = state.locationFilter === 'all' || ticket.location === state.locationFilter;
    return matchesStatus && matchesSeverity && matchesLocation;
  });
};

const getSelectedTicket = (tickets) => {
  const selected = tickets.find((ticket) => ticket.id === state.selectedTicketId);
  return selected || tickets[0] || null;
};

const renderOverviewCards = () => {
  const tickets = getTickets();
  const resolvedCount = tickets.filter((ticket) => ticket.status === 'Resolved').length;
  const highPriority = tickets.filter((ticket) => ticket.severity === 'High').length;
  const avgConfidence = tickets.length
    ? Math.round(tickets.reduce((sum, ticket) => sum + (ticket.confidence || 88), 0) / tickets.length)
    : 0;

  return `
    <section class="metrics-grid">
      <article class="metric-card">
        <span class="metric-label">Total reports</span>
        <strong class="metric-value">${tickets.length}</strong>
        <small>Across all road segments</small>
      </article>
      <article class="metric-card accent">
        <span class="metric-label">High priority</span>
        <strong class="metric-value">${highPriority}</strong>
        <small>Needs urgent repair</small>
      </article>
      <article class="metric-card success">
        <span class="metric-label">Resolved</span>
        <strong class="metric-value">${resolvedCount}</strong>
        <small>Closed by officials</small>
      </article>
      <article class="metric-card warn">
        <span class="metric-label">AI confidence</span>
        <strong class="metric-value">${avgConfidence}%</strong>
        <small>Average defect detection</small>
      </article>
    </section>
  `;
};

const renderCitizenView = () => {
  const tickets = getTickets().slice(0, 5);

  return `
    <section class="card form-card">
      <div class="section-header">
        <div>
          <p class="eyebrow">Citizen</p>
          <h2>Report a pothole</h2>
        </div>
        <div class="smart-badge">AI verified</div>
      </div>

      <form id="citizenForm" class="stacked-form">
        <div class="field-grid">
          <label>
            <span>Name</span>
            <input name="reporterName" type="text" value="${state.citizenName}" required />
          </label>

          <label>
            <span>Location</span>
            <input name="locationCustom" type="text" placeholder="Type neighborhood, road, or landmark" />
          </label>
        </div>

        <label>
          <span>Recommended locations</span>
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
          <span>Damage details</span>
          <textarea name="note" rows="4" placeholder="Describe the pothole: size, depth, traffic risk, and exact location"></textarea>
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
        <div class="status-pill">${tickets.length} tracked</div>
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
                        <div class="mini-meter">
                          <div class="mini-meter-bar" style="width: ${ticket.riskScore || 60}%"></div>
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
          <h2>Operations</h2>
        </div>
        <div class="smart-badge">Smart queue</div>
      </div>

      <div class="filter-list">
        <label>
          <span>Status</span>
          <select id="statusFilter">
            <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>All</option>
            ${statusOptions
              .map(
                (status) => `<option value="${status}" ${state.statusFilter === status ? 'selected' : ''}>${status}</option>`,
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
                (severity) => `<option value="${severity}" ${state.severityFilter === severity ? 'selected' : ''}>${severity}</option>`,
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
                (location) => `<option value="${location}" ${state.locationFilter === location ? 'selected' : ''}>${location}</option>`,
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
        <div class="status-pill">${tickets.length} active</div>
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
                      <div class="mini-meter">
                        <div class="mini-meter-bar" style="width: ${ticket.riskScore || 60}%"></div>
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
              <span class="smart-badge">Priority ${selectedTicket.riskScore || 60}%</span>
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
                  <div><dt>AI confidence</dt><dd>${selectedTicket.confidence || 90}%</dd></div>
                </dl>
              </div>
            </div>

            <div class="note-box">
              <strong>Road impact summary</strong>
              <p>${selectedTicket.note || 'No additional notes provided.'}</p>
              <div class="signal-row">
                <span>Duplicate check</span>
                <strong>${selectedTicket.duplicateHint || 'No duplicate signal'}</strong>
              </div>
            </div>

            <label>
              <span>Update status</span>
              <select data-status-update="${selectedTicket.id}">
                ${statusOptions
                  .map(
                    (status) => `<option value="${status}" ${selectedTicket.status === status ? 'selected' : ''}>${status}</option>`,
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

      ${renderOverviewCards()}

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

  state.citizenName = reporterName || state.citizenName;

  if (!reporterName || !location || !photo) {
    window.alert('Please provide your name, the location, and a photo before submitting.');
    return;
  }

  try {
    const photoData = await readFileAsDataUrl(photo);
    const analysis = await new Promise((resolve) => {
      setTimeout(() => resolve(simulateAiAnalysis(photo.name, note, location)), 350);
    });

    if (!analysis.isPothole) {
      window.alert('AI could not confirm this is a pothole. Please upload a clearer photo or try again.');
      return;
    }

    const tickets = getTickets();
    const newTicket = {
      id: makeTicketId(),
      reporterName,
      location,
      severity: normalizeSeverity(analysis.severity),
      status: 'Submitted',
      note: note || 'Citizen report submitted for review.',
      aiConfirmed: true,
      confidence: analysis.confidence,
      riskScore: analysis.riskScore,
      duplicateHint: analysis.duplicateHint,
      photoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tickets.unshift(newTicket);
    saveTickets(tickets);
    form.reset();
    state.role = 'citizen';
    renderApp();
    window.alert(`Report submitted successfully. Ticket ${newTicket.id} was classified as ${newTicket.severity.toLowerCase()} severity.`);
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
