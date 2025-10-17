// Dashboard functionality
let complaintsMap = null;

// Problem types for dropdown
const problemTypes = {
    power: [
        { value: 'no_electricity', label: 'No Electricity' },
        { value: 'voltage_fluctuation', label: 'Voltage Fluctuation' },
        { value: 'meter_problem', label: 'Meter Problem' },
        { value: 'street_light_fault', label: 'Street Light Fault' },
        { value: 'transformer_issue', label: 'Transformer Issue' },
        { value: 'wire_damage', label: 'Wire Damage' }
    ],
    water: [
        { value: 'no_water', label: 'No Water Supply' },
        { value: 'low_pressure', label: 'Low Water Pressure' },
        { value: 'dirty_water', label: 'Dirty Water' },
        { value: 'pipe_leakage', label: 'Pipe Leakage' },
        { value: 'overflow', label: 'Tank Overflow' },
        { value: 'meter_issue', label: 'Water Meter Issue' }
    ]
};

// Show report modal
function showReportModal(type) {
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    const title = document.getElementById('reportModalTitle');
    const problemSelect = document.getElementById('problemSelect');
    
    // Set modal title and type
    title.textContent = `Report ${type.charAt(0).toUpperCase() + type.slice(1)} Issue`;
    document.getElementById('issueType').value = type;
    
    // Populate problem types
    problemSelect.innerHTML = '';
    problemTypes[type].forEach(problem => {
        const option = document.createElement('option');
        option.value = problem.value;
        option.textContent = problem.label;
        problemSelect.appendChild(option);
    });
    
    // Auto-fill location with user's area
    document.getElementById('location').value = currentUser.area;
    
    // Reset form
    document.getElementById('reportForm').reset();
    
    modal.show();
}

// Submit complaint
async function submitComplaint() {
    const formData = {
        type: document.getElementById('issueType').value,
        problemType: document.getElementById('problemSelect').value,
        description: document.getElementById('description').value,
        location: document.getElementById('location').value,
        userId: currentUser.id,
        area: currentUser.area
    };

    if (!formData.description || !formData.location) {
        alert('Please fill in all required fields');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            alert('Complaint submitted successfully! Tracking ID: NM' + result.complaint.id);
            bootstrap.Modal.getInstance(document.getElementById('reportModal')).hide();
            loadMyComplaints();
        } else {
            alert('Failed to submit complaint: ' + result.message);
        }
    } catch (error) {
        console.error('Error submitting complaint:', error);
        alert('Error submitting complaint. Please try again.');
    }
}

// Load user's complaints
async function loadMyComplaints() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/complaints?userId=${currentUser.id}`);
        const result = await response.json();

        if (result.success) {
            displayComplaints(result.complaints);
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

// Display complaints in the table
function displayComplaints(complaints) {
    const container = document.getElementById('complaintsList');
    
    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted">
                <i class="fas fa-inbox fa-3x mb-3"></i>
                <p>No complaints yet</p>
                <button class="btn btn-primary mt-2" onclick="showReportModal('power')">
                    Report Your First Issue
                </button>
            </div>
        `;
        return;
    }

    // Sort by creation date (newest first)
    complaints.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    let html = `
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Problem</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Date</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;

    complaints.forEach(complaint => {
        const date = new Date(complaint.createdAt).toLocaleDateString();
        const priorityClass = getPriorityClass(complaint.priority);
        const statusClass = getStatusClass(complaint.status);
        
        html += `
            <tr class="complaint-item ${complaint.priority}">
                <td><strong>NM${complaint.id}</strong></td>
                <td>
                    <span class="badge ${complaint.type === 'power' ? 'bg-danger' : 'bg-primary'}">
                        <i class="fas ${complaint.type === 'power' ? 'fa-bolt' : 'fa-tint'} me-1"></i>
                        ${complaint.type}
                    </span>
                </td>
                <td>${getProblemLabel(complaint.problemType)}</td>
                <td>
                    <span class="badge ${priorityClass}">${complaint.priority.toUpperCase()}</span>
                </td>
                <td>
                    <span class="badge ${statusClass}">${complaint.status}</span>
                </td>
                <td>${date}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewComplaintDetails(${complaint.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
        </div>
    `;

    container.innerHTML = html;
}

// Get problem label from value
function getProblemLabel(problemValue) {
    for (const type in problemTypes) {
        const problem = problemTypes[type].find(p => p.value === problemValue);
        if (problem) return problem.label;
    }
    return problemValue;
}

// Get priority CSS class
function getPriorityClass(priority) {
    const classes = {
        critical: 'bg-critical',
        high: 'bg-high',
        medium: 'bg-medium',
        low: 'bg-low'
    };
    return classes[priority] || 'bg-secondary';
}

// Get status CSS class
function getStatusClass(status) {
    const classes = {
        submitted: 'bg-secondary',
        assigned: 'bg-info',
        'in-progress': 'bg-warning',
        resolved: 'bg-success'
    };
    return classes[status] || 'bg-secondary';
}

// Load announcements
async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_BASE}/announcements`);
        const result = await response.json();

        if (result.success && result.announcements.length > 0) {
            displayAnnouncements(result.announcements);
        } else {
            document.getElementById('announcementsList').innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-info-circle"></i>
                    <small>No announcements</small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Display announcements
function displayAnnouncements(announcements) {
    const container = document.getElementById('announcementsList');
    
    let html = '';
    announcements.forEach(announcement => {
        const date = new Date(announcement.createdAt).toLocaleDateString();
        const typeClass = announcement.type === 'alert' ? 'text-danger' : 'text-info';
        
        html += `
            <div class="alert alert-light border ${typeClass} mb-2">
                <div class="d-flex justify-content-between align-items-start">
                    <strong>${announcement.title}</strong>
                    <small class="text-muted">${date}</small>
                </div>
                <p class="mb-0 small">${announcement.message}</p>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load area status
async function loadAreaStatus() {
    try {
        const response = await fetch(`${API_BASE}/areas`);
        const result = await response.json();

        if (result.success) {
            const userArea = result.areas.find(area => area.name === currentUser.area);
            if (userArea) {
                document.getElementById('areaPowerStatus').textContent = 
                    userArea.powerStatus.charAt(0).toUpperCase() + userArea.powerStatus.slice(1);
                document.getElementById('areaWaterStatus').textContent = 
                    userArea.waterStatus.charAt(0).toUpperCase() + userArea.waterStatus.slice(1);
            }
        }
    } catch (error) {
        console.error('Error loading area status:', error);
    }
}

// View complaint details
function viewComplaintDetails(complaintId) {
    alert(`Complaint NM${complaintId} details would open in a detailed view.\n\nThis would show:\n- Complete complaint history\n- Technician updates\n- Resolution timeline\n- Contact information`);
}

// Initialize map
function initializeMap() {
    // Map initialization is handled in map.js
    console.log('Map initialization requested');
}