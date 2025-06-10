// USERS object: plate number (uppercase) -> { password, hauler }
const USERS = {
  "NKD8241": { password: "nkd8421miras", hauler: "Team Miras" }
  // Add more plate numbers as needed!
};

const HEADERS = [
  "Haulers Name",
  "Plate Number",
  "Delivery Date",
  "Shipment Number",
  "Route",
  "Drops",
  "Type",
  "Delivery Checklist #",
  "Delivery Rates",
  "Billing Date",
  "Payout Date"
];

let deliveries = [];
let currentPlate = null;
let currentHauler = null;

function parseCSV(text) {
  const rows = [];
  let row = [];
  let inQuotes = false;
  let value = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        value += '"'; i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      row.push(value); value = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (value.length || row.length) { row.push(value); value = ''; }
      if (row.length) { rows.push(row); row = []; }
      if (c === '\r' && text[i + 1] === '\n') i++;
    } else {
      value += c;
    }
  }
  if (value.length || row.length) { row.push(value); }
  if (row.length) { rows.push(row); }
  const [header, ...data] = rows;
  return data.filter(r => r.length === header.length && r.some(cell => cell.trim()))
    .map(row => {
      let obj = {};
      header.forEach((h, i) => obj[h.trim()] = (row[i] || '').trim());
      return obj;
    });
}

function fetchDeliveries() {
  if (!currentPlate) return;
  const csvFile = `${currentPlate}.csv`;
  fetch(csvFile + '?t=' + Date.now()) // prevent caching
    .then(res => res.ok ? res.text() : Promise.reject())
    .then(text => {
      deliveries = parseCSV(text);
      renderDeliveries();
    })
    .catch(() => {
      deliveries = [];
      renderDeliveries();
      alert("Walang nakuha na data mula sa CSV. Pakicheck ang CSV file para sa plate number na ito.");
    });
}

function renderDeliveries() {
  const tbody = document.querySelector('#delivery-table tbody');
  tbody.innerHTML = '';

  if (!deliveries.length) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="11" style="text-align:center;color:#888;">Walang delivery data</td>`;
    tbody.appendChild(tr);
    return;
  }

  for (const d of deliveries) {
    const tr = document.createElement('tr');
    tr.innerHTML = HEADERS.map(h => `<td>${d[h] || ''}</td>`).join('');
    tbody.appendChild(tr);
  }
}

document.addEventListener('DOMContentLoaded', function() {
  const loginForm = document.getElementById('login-form');
  const loginContainer = document.getElementById('login-container');
  const dashboard = document.getElementById('dashboard');
  const loginError = document.getElementById('login-error');
  const logoutBtn = document.getElementById('logout-btn');
  const welcomePlate = document.getElementById('welcome-plate');

  loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const plate = document.getElementById('plate-number').value.trim().toUpperCase();
    const pass = document.getElementById('password').value.trim();
    if (USERS[plate] && USERS[plate].password === pass) {
      currentPlate = plate;
      currentHauler = USERS[plate].hauler;
      loginContainer.style.display = 'none';
      dashboard.style.display = 'block';
      welcomePlate.textContent = `Welcome, ${currentHauler}!`;
      fetchDeliveries();
      // Auto-update every 10 seconds
      if (!window.autoUpdateInterval) {
        window.autoUpdateInterval = setInterval(fetchDeliveries, 10000);
      }
    } else {
      loginError.style.display = 'block';
    }
  });

  logoutBtn.addEventListener('click', function() {
    dashboard.style.display = 'none';
    loginContainer.style.display = 'block';
    loginForm.reset();
    loginError.style.display = 'none';
    deliveries = [];
    currentPlate = null;
    currentHauler = null;
    renderDeliveries();
    if (window.autoUpdateInterval) {
      clearInterval(window.autoUpdateInterval);
      window.autoUpdateInterval = null;
    }
  });

  document.getElementById('plate-number').addEventListener('input', () => loginError.style.display = 'none');
  document.getElementById('password').addEventListener('input', () => loginError.style.display = 'none');

  document.getElementById('export-btn').addEventListener('click', function() {
    if (!deliveries.length) return alert('Walang data.');
    const csvRows = [
      HEADERS.join(','),
      ...deliveries.map(d => HEADERS.map(h => `"${(d[h]||'').replace(/"/g,'""')}"`).join(','))
    ];
    const csv = csvRows.join('\r\n');
    const blob = new Blob([csv], {type: 'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${currentPlate}-trip-tracker.csv`;
    a.click();
  });
});