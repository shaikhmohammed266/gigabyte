// Admin Dashboard functionality
const ADMIN_API_BASE = 'http://localhost:3000/api';

let adminMap = null;
let currentUser = null;
let adminSocket = null;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('👑 Initializing Admin Dashboard...');
    
    // Check authentication
    currentUser = JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        console.log('❌ No user found, redirecting to login');
        window.location.href = '/';
        return;
    }
    
    console.log('✅ User authenticated:', currentUser.name);
    console.log('👤 User role:', currentUser.role);
    
    // Ensure user is admin
    if (currentUser.role !== 'admin') {
        console.log('❌ Non-admin user in admin dashboard, redirecting to user dashboard');
        window.location.href = '/user-dashboard';
        return;
    }
    
    initializeAdminDashboard();
});

function initializeAdminDashboard() {
    updateCurrentTime();
    setInterval(updateCurrentTime, 60000);
    
    loadAdminData();
    initializeAdminMap();
    initializeAdminSocket();
}

// Update current time
function updateCurrentTime() {
    const now = new Date();
    document.getElementById('currentTime').textContent = 
        now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
}

// Load all admin data
async function loadAdminData() {
    await loadAllComplaints();
    await loadAdminStats();
    await loadTechnicians();
    await loadRecentActivity();
    await loadAnnouncementsManagement();
}

// Show/hide sections
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.section-content').forEach(section => {
        section.classList.add('d-none');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section and activate nav link
    document.getElementById(sectionName + 'Section').classList.remove('d-none');
    event.target.classList.add('active');
}

// Load all complaints for admin
async function loadAllComplaints() {
    try {
        const response = await fetch(`${ADMIN_API_BASE}/admin/complaints`);
        const result = await response.json();

        if (result.success) {
            displayAllComplaints(result.complaints);
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

// Display all complaints in table
function displayAllComplaints(complaints) {
    const tbody = document.getElementById('allComplaintsTable');
    
    if (complaints.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-inbox fa-2x mb-3"></i>
                    <p>No complaints found</p>
                </td>
            </tr>
        `;
        return;
    }

    // Sort by priority and creation date
    complaints.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        if (priorityOrder[b.priority] !== priorityOrder[a.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    let html = '';
    complaints.forEach(complaint => {
        const date = new Date(complaint.createdAt).toLocaleString();
        const priorityClass = getPriorityClass(complaint.priority);
        const statusClass = getStatusClass(complaint.status);
        
        html += `
            <tr class="complaint-row">
                <td><strong>NM${complaint.id}</strong></td>
                <td>
                    <span class="badge ${complaint.type === 'power' ? 'bg-danger' : 'bg-primary'}">
                        ${complaint.type}
                    </span>
                </td>
                <td>User ${complaint.userId}</td>
                <td>${complaint.area}</td>
                <td>${complaint.problemType.replace('_', ' ')}</td>
                <td>
                    <span class="badge ${priorityClass}">${complaint.priority.toUpperCase()}</span>
                </td>
                <td>
                    <select class="form-select form-select-sm status-dropdown" 
                            onchange="updateComplaintStatus(${complaint.id}, this.value)"
                            data-current="${complaint.status}">
                        <option value="submitted" ${complaint.status === 'submitted' ? 'selected' : ''}>Submitted</option>
                        <option value="assigned" ${complaint.status === 'assigned' ? 'selected' : ''}>Assigned</option>
                        <option value="in-progress" ${complaint.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
                        <option value="resolved" ${complaint.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                    </select>
                </td>
                <td><small>${date}</small></td>
                <td>
                    <div class="complaint-actions">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewComplaintDetails(${complaint.id})" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-success" onclick="assignTechnician(${complaint.id})" title="Assign Technician">
                            <i class="fas fa-user-check"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    tbody.innerHTML = html;
}

// Filter complaints
function filterComplaints() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    
    console.log('Filtering by:', { statusFilter, priorityFilter });
    // Implementation would filter the existing complaints array
}

// Update complaint status
async function updateComplaintStatus(complaintId, newStatus) {
    try {
        console.log(`Updating complaint ${complaintId} to status: ${newStatus}`);
        showNotification(`Complaint NM${complaintId} status updated to ${newStatus}`, 'success');
        
    } catch (error) {
        console.error('Error updating complaint status:', error);
        showNotification('Error updating status', 'error');
    }
}

// Load admin statistics
async function loadAdminStats() {
    try {
        const response = await fetch(`${ADMIN_API_BASE}/stats`);
        const result = await response.json();

        if (result.success) {
            const stats = result.stats;
            document.getElementById('totalComplaints').textContent = stats.totalComplaints;
            document.getElementById('pendingComplaints').textContent = stats.activeComplaints;
            document.getElementById('criticalComplaints').textContent = stats.complaints ? 
                stats.complaints.filter(c => c.priority === 'critical').length : 0;
            document.getElementById('resolvedToday').textContent = stats.resolvedComplaints;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load technicians
async function loadTechnicians() {
    // Mock technicians data
    const technicians = [
        { id: 1, name: 'Raj Sharma', phone: '9876543211', specialization: 'power', status: 'available', complaints: 3 },
        { id: 2, name: 'Priya Patel', phone: '9876543212', specialization: 'water', status: 'busy', complaints: 5 },
        { id: 3, name: 'Amit Kumar', phone: '9876543213', specialization: 'both', status: 'available', complaints: 1 },
        { id: 4, name: 'Sneha Desai', phone: '9876543214', specialization: 'power', status: 'offline', complaints: 0 }
    ];

    displayTechnicians(technicians);
}

// Display technicians
function displayTechnicians(technicians) {
    const container = document.getElementById('techniciansGrid');
    
    let html = '';
    technicians.forEach(tech => {
        const statusClass = `technician-${tech.status}`;
        const specializationBadge = tech.specialization === 'both' ? 'bg-info' : 
                                   tech.specialization === 'power' ? 'bg-danger' : 'bg-primary';
        
        html += `
            <div class="col-md-6 col-lg-3 mb-3">
                <div class="card">
                    <div class="card-body text-center">
                        <div class="mb-3">
                            <i class="fas fa-user-circle fa-3x text-secondary"></i>
                        </div>
                        <h6 class="card-title">${tech.name}</h6>
                        <p class="card-text">
                            <small class="text-muted">${tech.phone}</small><br>
                            <span class="badge ${specializationBadge}">${tech.specialization}</span><br>
                            <span class="${statusClass}">${tech.status.toUpperCase()}</span><br>
                            <small>Assigned: ${tech.complaints} complaints</small>
                        </p>
                        <div class="btn-group w-100">
                            <button class="btn btn-sm btn-outline-primary" onclick="contactTechnician('${tech.phone}')">
                                <i class="fas fa-phone"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-warning" onclick="reassignComplaints(${tech.id})">
                                <i class="fas fa-tasks"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="removeTechnician(${tech.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Load recent activity
async function loadRecentActivity() {
    // Mock recent activity
    const activities = [
        { action: 'Complaint NM45 marked as resolved', time: '2 minutes ago', type: 'success' },
        { action: 'New complaint NM52 submitted from Vashi', time: '5 minutes ago', type: 'info' },
        { action: 'Technician Raj assigned to NM48', time: '10 minutes ago', type: 'warning' },
        { action: 'Critical priority assigned to NM49', time: '15 minutes ago', type: 'danger' }
    ];

    displayRecentActivity(activities);
}

// Display recent activity
function displayRecentActivity(activities) {
    const container = document.getElementById('recentActivity');
    
    let html = '';
    activities.forEach(activity => {
        const icon = activity.type === 'success' ? 'fa-check-circle' :
                    activity.type === 'danger' ? 'fa-exclamation-triangle' :
                    activity.type === 'warning' ? 'fa-user-check' : 'fa-info-circle';
        
        const textClass = activity.type === 'success' ? 'text-success' :
                         activity.type === 'danger' ? 'text-danger' :
                         activity.type === 'warning' ? 'text-warning' : 'text-info';

        html += `
            <div class="d-flex mb-3">
                <div class="flex-shrink-0">
                    <i class="fas ${icon} ${textClass}"></i>
                </div>
                <div class="flex-grow-1 ms-3">
                    <small class="d-block">${activity.action}</small>
                    <small class="text-muted">${activity.time}</small>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Initialize admin map
function initializeAdminMap() {
    adminMap = L.map('adminMap').setView([19.0330, 73.0297], 11);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(adminMap);

    // Add area markers
    const areas = [
        { name: 'Vashi', lat: 19.0760, lng: 72.8777 },
        { name: 'Nerul', lat: 19.0330, lng: 73.0297 },
        { name: 'Kharghar', lat: 19.0361, lng: 73.0612 },
        { name: 'Sanpada', lat: 19.0726, lng: 73.0073 },
        { name: 'Seawoods', lat: 19.0153, lng: 73.0153 }
    ];

    areas.forEach(area => {
        const marker = L.marker([area.lat, area.lng]).addTo(adminMap);
        marker.bindPopup(`<b>${area.name}</b><br>Power: Normal<br>Water: Normal`);
    });
}

// Initialize admin socket for real-time updates
function initializeAdminSocket() {
    adminSocket = io('http://localhost:3000');

    adminSocket.on('connect', () => {
        console.log('🔌 Admin connected to real-time updates');
    });

    adminSocket.on('new_complaint', (complaint) => {
        loadAdminData();
        showNotification(`New complaint submitted: NM${complaint.id}`, 'info');
    });

    adminSocket.on('stats_update', () => {
        loadAdminStats();
    });
}

// Show notification
function showNotification(message, type = 'info') {
    // Create a simple notification
    const alertClass = type === 'error' ? 'alert-danger' : 
                      type === 'success' ? 'alert-success' : 
                      type === 'warning' ? 'alert-warning' : 'alert-info';

    const notification = document.createElement('div');
    notification.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Refresh all data
function refreshData() {
    loadAdminData();
    showNotification('Data refreshed successfully', 'success');
}

// Modal functions
function showAnnouncementModal() {
    const modal = new bootstrap.Modal(document.getElementById('announcementModal'));
    document.getElementById('announcementForm').reset();
    modal.show();
}

function showTechnicianModal() {
    alert('Technician modal would open here');
}

// Create announcement
async function createAnnouncement() {
    const title = document.getElementById('announcementTitle').value;
    const message = document.getElementById('announcementMessage').value;
    const type = document.getElementById('announcementType').value;

    if (!title || !message) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    try {
        const response = await fetch(`${ADMIN_API_BASE}/admin/announcements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, message, type })
        });

        const result = await response.json();

        if (result.success) {
            showNotification('Announcement published successfully', 'success');
            bootstrap.Modal.getInstance(document.getElementById('announcementModal')).hide();
            loadAnnouncementsManagement();
        }
    } catch (error) {
        console.error('Error creating announcement:', error);
        showNotification('Error publishing announcement', 'error');
    }
}

// Load announcements for management
async function loadAnnouncementsManagement() {
    try {
        const response = await fetch(`${ADMIN_API_BASE}/announcements`);
        const result = await response.json();

        if (result.success) {
            displayAnnouncementsManagement(result.announcements);
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

// Display announcements for management
function displayAnnouncementsManagement(announcements) {
    const container = document.getElementById('announcementsManagement');
    
    if (announcements.length === 0) {
        container.innerHTML = '<p class="text-muted">No announcements found</p>';
        return;
    }

    let html = '<div class="row">';
    announcements.forEach(announcement => {
        html += `
            <div class="col-md-6 mb-3">
                <div class="card">
                    <div class="card-body">
                        <h6 class="card-title">${announcement.title}</h6>
                        <p class="card-text">${announcement.message}</p>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">${new Date(announcement.createdAt).toLocaleString()}</small>
                            <span class="badge bg-${announcement.type === 'alert' ? 'danger' : 'info'}">
                                ${announcement.type}
                            </span>
                        </div>
                        <div class="mt-2">
                            <button class="btn btn-sm btn-outline-warning" onclick="editAnnouncement(${announcement.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger ms-1" onclick="deleteAnnouncement(${announcement.id})">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    html += '</div>';
    
    container.innerHTML = html;
}

// Utility functions
function contactTechnician(phone) {
    alert(`Calling technician: ${phone}`);
}

function reassignComplaints(techId) {
    alert(`Reassigning complaints for technician ${techId}`);
}

function removeTechnician(techId) {
    if (confirm('Are you sure you want to remove this technician?')) {
        showNotification('Technician removed', 'success');
    }
}

function generateReport() {
    alert('Generating comprehensive report...');
}

function showBulkActions() {
    alert('Bulk actions modal would open here');
}

function viewComplaintDetails(complaintId) {
    document.getElementById('complaintIdTitle').textContent = `NM${complaintId}`;
    document.getElementById('complaintDetailsContent').innerHTML = `
        <h6>Complaint Information</h6>
        <p><strong>Type:</strong> Power Issue</p>
        <p><strong>Problem:</strong> No Electricity</p>
        <p><strong>Location:</strong> Vashi Sector 15</p>
        <p><strong>Description:</strong> Complete power outage since 2 hours</p>
        <p><strong>Priority:</strong> <span class="badge bg-high">HIGH</span></p>
        <p><strong>Status:</strong> <span class="badge bg-warning">In Progress</span></p>
        
        <h6 class="mt-3">Assignment</h6>
        <p><strong>Technician:</strong> Raj Sharma (9876543211)</p>
        <p><strong>Assigned At:</strong> ${new Date().toLocaleString()}</p>
        
        <h6 class="mt-3">Updates</h6>
        <div class="alert alert-info">
            <small>Technician dispatched to location - 30 minutes ago</small>
        </div>
        <div class="alert alert-warning">
            <small>Complaint assigned to technician - 1 hour ago</small>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('complaintDetailsModal'));
    modal.show();
}

function assignTechnician(complaintId) {
    alert(`Assign technician to complaint NM${complaintId}`);
}

function editAnnouncement(id) {
    alert(`Edit announcement ${id}`);
}

function deleteAnnouncement(id) {
    if (confirm('Are you sure you want to delete this announcement?')) {
        showNotification('Announcement deleted', 'success');
    }
}

function getPriorityClass(priority) {
    const classes = {
        critical: 'bg-danger',
        high: 'bg-warning',
        medium: 'bg-info',
        low: 'bg-success'
    };
    return classes[priority] || 'bg-secondary';
}

function getStatusClass(status) {
    const classes = {
        submitted: 'bg-secondary',
        assigned: 'bg-primary',
        'in-progress': 'bg-warning',
        resolved: 'bg-success'
    };
    return classes[status] || 'bg-secondary';
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    if (adminSocket) {
        adminSocket.disconnect();
    }
    window.location.href = '/';
}