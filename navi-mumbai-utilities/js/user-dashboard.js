// User Dashboard functionality
const API_BASE = 'http://localhost:3000/api';

let userMap = null;
let currentUser = null;
let userSocket = null;
let mapMarkers = [];
let uploadedFiles = [];

// Initialize user dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('👤 USER DASHBOARD: Starting initialization...');
    
    // Check authentication
    const savedUser = localStorage.getItem('currentUser');
    
    if (!savedUser) {
        window.location.href = '/';
        return;
    }
    
    try {
        currentUser = JSON.parse(savedUser);
        
        // Security check
        if (currentUser.role === 'admin') {
            window.location.href = '/admin';
            return;
        }
        
        initializeUserDashboard();
        
    } catch (error) {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    }
});

function initializeUserDashboard() {
    console.log('🎯 Initializing dashboard for:', currentUser.name);
    
    // Update user info
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userArea').textContent = currentUser.area;
    document.getElementById('userInitials').textContent = currentUser.name.charAt(0).toUpperCase();
    
    // Initialize components
    initializeUserMap();
    loadDashboardData();
    initializeUserSocket();
    initializeReportForm();
}

// Initialize report form functionality
function initializeReportForm() {
    // File upload handling
    const uploadArea = document.getElementById('uploadArea');
    const photoUpload = document.getElementById('photoUpload');
    const uploadPreview = document.getElementById('uploadPreview');
    const previewContainer = document.getElementById('previewContainer');
    
    if (uploadArea && photoUpload) {
        uploadArea.addEventListener('click', () => photoUpload.click());
        
        photoUpload.addEventListener('change', function(e) {
            const files = Array.from(e.target.files);
            uploadedFiles = files.slice(0, 5); // Limit to 5 files
            
            if (uploadedFiles.length > 0) {
                uploadPreview.classList.remove('d-none');
                previewContainer.innerHTML = '';
                
                uploadedFiles.forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const previewItem = document.createElement('div');
                        previewItem.className = 'col-4';
                        previewItem.innerHTML = `
                            <div class="position-relative">
                                <img src="${e.target.result}" class="img-thumbnail" style="height: 80px; width: 100%; object-fit: cover;">
                                <button type="button" class="btn btn-sm btn-danger position-absolute top-0 end-0" onclick="removeImage(${index})">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `;
                        previewContainer.appendChild(previewItem);
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                uploadPreview.classList.add('d-none');
            }
        });
    }
    
    // Issue type radio buttons
    const powerRadio = document.getElementById('powerRadio');
    const waterRadio = document.getElementById('waterRadio');
    const powerOption = document.getElementById('powerOption');
    const waterOption = document.getElementById('waterOption');
    
    if (powerRadio && waterRadio) {
        powerRadio.addEventListener('change', function() {
            if (this.checked) updateProblemTypes('power');
        });
        
        waterRadio.addEventListener('change', function() {
            if (this.checked) updateProblemTypes('water');
        });
        
        // Add hover effects
        powerOption.addEventListener('mouseenter', () => powerOption.style.borderColor = '#ffc107');
        powerOption.addEventListener('mouseleave', () => {
            if (!powerRadio.checked) powerOption.style.borderColor = '#dee2e6';
        });
        
        waterOption.addEventListener('mouseenter', () => waterOption.style.borderColor = '#17a2b8');
        waterOption.addEventListener('mouseleave', () => {
            if (!waterRadio.checked) waterOption.style.borderColor = '#dee2e6';
        });
    }
}

// Remove uploaded image
function removeImage(index) {
    uploadedFiles.splice(index, 1);
    document.getElementById('photoUpload').value = '';
    initializeReportForm(); // Reinitialize to update preview
}

// Update problem types based on selected issue type
function updateProblemTypes(type) {
    const problemSelect = document.getElementById('problemSelect');
    if (!problemSelect) return;
    
    problemSelect.innerHTML = '<option value="">Select problem type...</option>';
    
    const problemTypes = {
        power: [
            { value: 'no_electricity', label: '⚡ No Electricity - Complete power outage' },
            { value: 'voltage_fluctuation', label: '🔌 Voltage Fluctuation - Lights flickering' },
            { value: 'meter_problem', label: '📊 Meter Problem - Meter not working' },
            { value: 'street_light_fault', label: '💡 Street Light Fault - Street light not working' },
            { value: 'transformer_issue', label: '🏭 Transformer Issue - Transformer problem' },
            { value: 'wire_damage', label: '⚠️ Wire Damage - Damaged electrical wires' }
        ],
        water: [
            { value: 'no_water', label: '💧 No Water Supply - Complete water cutoff' },
            { value: 'low_pressure', label: '📉 Low Water Pressure - Weak water flow' },
            { value: 'dirty_water', label: '🚱 Dirty Water - Water quality issues' },
            { value: 'pipe_leakage', label: '🕳️ Pipe Leakage - Leaking pipes' },
            { value: 'overflow', label: '🌊 Tank Overflow - Water tank overflowing' },
            { value: 'meter_issue', label: '📈 Water Meter Issue - Meter not working' }
        ]
    };
    
    problemTypes[type].forEach(problem => {
        const option = document.createElement('option');
        option.value = problem.value;
        option.textContent = problem.label;
        problemSelect.appendChild(option);
    });
}

// Show report modal
function showReportModal(type) {
    const modal = new bootstrap.Modal(document.getElementById('reportModal'));
    const title = document.getElementById('reportModalTitle');
    
    // Set modal title
    title.innerHTML = `<i class="fas fa-edit me-2"></i>Report ${type.charAt(0).toUpperCase() + type.slice(1)} Issue`;
    document.getElementById('issueType').value = type;
    
    // Set the radio button
    if (type === 'power') {
        document.getElementById('powerRadio').checked = true;
        document.getElementById('powerOption').style.borderColor = '#ffc107';
        document.getElementById('waterOption').style.borderColor = '#dee2e6';
    } else {
        document.getElementById('waterRadio').checked = true;
        document.getElementById('waterOption').style.borderColor = '#17a2b8';
        document.getElementById('powerOption').style.borderColor = '#dee2e6';
    }
    
    // Update problem types
    updateProblemTypes(type);
    
    // Auto-fill location with user's area
    document.getElementById('location').value = currentUser.area;
    
    // Reset form
    document.getElementById('reportForm').reset();
    document.getElementById('uploadPreview').classList.add('d-none');
    uploadedFiles = [];
    
    modal.show();
}

// Submit complaint
async function submitComplaint() {
    const submitBtn = document.getElementById('submitReportBtn');
    const originalText = submitBtn.innerHTML;
    
    // Get form data
    const formData = {
        type: document.getElementById('issueType').value,
        problemType: document.getElementById('problemSelect').value,
        description: document.getElementById('description').value,
        location: document.getElementById('location').value,
        landmark: document.getElementById('landmark').value,
        urgency: document.getElementById('urgencyLevel').value,
        userId: currentUser.id,
        area: currentUser.area
    };

    // Validation
    if (!formData.problemType || !formData.description || !formData.location) {
        showAlert('Please fill in all required fields', 'error');
        return;
    }

    if (formData.description.length < 10) {
        showAlert('Please provide a more detailed description (at least 10 characters)', 'error');
        return;
    }

    try {
        // Show loading state
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i>Submitting...';
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE}/complaints`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (result.success) {
            showAlert('✅ Complaint submitted successfully! Tracking ID: NM' + result.complaint.id, 'success');
            bootstrap.Modal.getInstance(document.getElementById('reportModal')).hide();
            
            // Reload data
            loadMyComplaints();
            loadComplaintsForUserMap();
            
        } else {
            showAlert('❌ Failed to submit complaint: ' + result.message, 'error');
        }
        
    } catch (error) {
        console.error('Error submitting complaint:', error);
        showAlert('❌ Error submitting complaint. Please try again.', 'error');
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    const alertClass = type === 'error' ? 'alert-danger' : 
                      type === 'success' ? 'alert-success' : 'alert-info';
    
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(alertDiv);

    // Auto remove after 5 seconds
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// ==================== MAP FUNCTIONALITY ====================

function initializeUserMap() {
    console.log('🗺️ Initializing map...');
    
    setTimeout(() => {
        const mapContainer = document.getElementById('liveMap');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }
        
        try {
            userMap = L.map('liveMap').setView([19.0330, 73.0297], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(userMap);
            
            // Add user marker
            const userMarker = L.marker([19.0330, 73.0297]).addTo(userMap);
            userMarker.bindPopup(`<b>Your Location</b><br>${currentUser.area}`).openPopup();
            
            console.log('✅ Map initialized successfully');
            
            // Load complaints
            loadComplaintsForUserMap();
            
        } catch (error) {
            console.error('Map initialization failed:', error);
        }
    }, 500);
}

async function loadComplaintsForUserMap() {
    try {
        const response = await fetch(`${API_BASE}/complaints`);
        const result = await response.json();
        
        if (result.success) {
            displayComplaintsOnMap(result.complaints);
        }
    } catch (error) {
        console.error('Error loading complaints for map:', error);
    }
}

function displayComplaintsOnMap(complaints) {
    // Clear existing markers
    mapMarkers.forEach(marker => userMap.removeLayer(marker));
    mapMarkers = [];
    
    // Add complaint markers
    complaints.forEach(complaint => {
        const lat = 19.0330 + (Math.random() - 0.5) * 0.03;
        const lng = 73.0297 + (Math.random() - 0.5) * 0.03;
        
        const markerColor = complaint.type === 'power' ? 'red' : 'blue';
        const marker = L.circleMarker([lat, lng], {
            color: markerColor,
            fillColor: markerColor,
            fillOpacity: 0.5,
            radius: 8
        }).addTo(userMap);
        
        marker.bindPopup(`
            <div style="min-width: 200px;">
                <strong>${complaint.type.toUpperCase()} Issue</strong><br>
                <small>Area: ${complaint.area}</small><br>
                <small>Status: ${complaint.status}</small>
            </div>
        `);
        
        mapMarkers.push(marker);
    });
}

function filterMap(type) {
    console.log('Filtering map by:', type);
    
    // Update button states
    document.querySelectorAll('.btn-group .btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Show/hide markers based on type
    mapMarkers.forEach(marker => {
        const complaintType = marker._popup._content.includes('POWER ISSUE') ? 'power' : 'water';
        if (type === 'all' || complaintType === type) {
            userMap.addLayer(marker);
        } else {
            userMap.removeLayer(marker);
        }
    });
}

// ==================== DASHBOARD FUNCTIONALITY ====================

async function loadDashboardData() {
    await loadMyComplaints();
    await loadAnnouncements();
    await loadAreaStatus();
    await loadUserStats();
}

async function loadMyComplaints() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE}/complaints?userId=${currentUser.id}`);
        const result = await response.json();

        if (result.success) {
            displayComplaints(result.complaints);
            updateComplaintStats(result.complaints);
        }
    } catch (error) {
        console.error('Error loading complaints:', error);
    }
}

function displayComplaints(complaints) {
    const container = document.getElementById('complaintsList');
    
    if (complaints.length === 0) {
        container.innerHTML = `
            <div class="text-center py-5 text-muted">
                <i class="fas fa-inbox fa-3x mb-3 opacity-50"></i>
                <p class="mb-3">No complaints yet</p>
                <button class="btn btn-primary" onclick="showReportModal('power')">
                    Report Your First Issue
                </button>
            </div>
        `;
        return;
    }

    let html = '';
    complaints.forEach(complaint => {
        const date = new Date(complaint.createdAt).toLocaleDateString();
        const priorityClass = getPriorityClass(complaint.priority);
        const statusClass = getStatusClass(complaint.status);
        
        html += `
            <div class="complaint-card ${complaint.priority}">
                <div class="row align-items-center">
                    <div class="col-md-2">
                        <span class="badge ${complaint.type === 'power' ? 'bg-danger' : 'bg-primary'} badge-pill">
                            <i class="fas ${complaint.type === 'power' ? 'fa-bolt' : 'fa-tint'} me-1"></i>
                            ${complaint.type}
                        </span>
                    </div>
                    <div class="col-md-3">
                        <strong>NM${complaint.id}</strong>
                        <br>
                        <small class="text-muted">${getProblemLabel(complaint.problemType)}</small>
                    </div>
                    <div class="col-md-2">
                        <span class="badge ${priorityClass} badge-pill">${complaint.priority.toUpperCase()}</span>
                    </div>
                    <div class="col-md-2">
                        <span class="badge ${statusClass} badge-pill">${complaint.status}</span>
                    </div>
                    <div class="col-md-2">
                        <small class="text-muted">${date}</small>
                    </div>
                    <div class="col-md-1">
                        <button class="btn btn-sm btn-outline-primary" onclick="viewComplaintDetails(${complaint.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateComplaintStats(complaints) {
    const activeComplaints = complaints.filter(c => c.status !== 'resolved').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;
    
    document.getElementById('activeComplaints').textContent = activeComplaints;
    document.getElementById('resolvedComplaints').textContent = resolvedComplaints;
}

async function loadAnnouncements() {
    try {
        const response = await fetch(`${API_BASE}/announcements`);
        const result = await response.json();

        if (result.success && result.announcements.length > 0) {
            let html = '';
            result.announcements.forEach(announcement => {
                const date = new Date(announcement.createdAt).toLocaleDateString();
                const typeClass = announcement.type === 'alert' ? 'border-warning' : 
                                 announcement.type === 'maintenance' ? 'border-info' : 'border-primary';
                
                html += `
                    <div class="announcement-card border-start ${typeClass}" style="border-left-width: 4px !important;">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <strong>${announcement.title}</strong>
                            <small class="text-muted">${date}</small>
                        </div>
                        <p class="mb-0 small">${announcement.message}</p>
                    </div>
                `;
            });
            document.getElementById('announcementsList').innerHTML = html;
        } else {
            document.getElementById('announcementsList').innerHTML = `
                <div class="announcement-card text-center text-muted">
                    <i class="fas fa-info-circle fa-2x mb-3 opacity-50"></i>
                    <p class="mb-0">No announcements</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading announcements:', error);
    }
}

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

async function loadUserStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const result = await response.json();

        if (result.success) {
            document.getElementById('activeComplaints').textContent = result.stats.activeComplaints;
            document.getElementById('resolvedComplaints').textContent = result.stats.resolvedComplaints;
            document.getElementById('avgResponseTime').textContent = result.stats.avgResolutionTime || '2.1h';
            document.getElementById('resolutionRate').textContent = result.stats.resolutionRate || '94%';
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Utility functions
function getProblemLabel(problemValue) {
    const problemTypes = {
        'no_electricity': 'No Electricity',
        'voltage_fluctuation': 'Voltage Fluctuation',
        'meter_problem': 'Meter Problem',
        'street_light_fault': 'Street Light Fault',
        'transformer_issue': 'Transformer Issue',
        'wire_damage': 'Wire Damage',
        'no_water': 'No Water Supply',
        'low_pressure': 'Low Water Pressure',
        'dirty_water': 'Dirty Water',
        'pipe_leakage': 'Pipe Leakage',
        'overflow': 'Tank Overflow',
        'meter_issue': 'Water Meter Issue'
    };
    return problemTypes[problemValue] || problemValue;
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

function viewComplaintDetails(complaintId) {
    alert(`Complaint NM${complaintId} details would show here`);
}

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
}

// Socket initialization
function initializeUserSocket() {
    userSocket = io('http://localhost:3000');
    
    userSocket.on('connect', () => {
        console.log('🔌 Connected to real-time updates');
    });

    userSocket.on('new_complaint', (complaint) => {
        if (complaint.userId === currentUser.id || complaint.area === currentUser.area) {
            loadMyComplaints();
            loadComplaintsForUserMap();
        }
    });

    userSocket.on('new_announcement', (announcement) => {
        loadAnnouncements();
    });

    userSocket.on('stats_update', (stats) => {
        updateComplaintStats(stats);
    });
}