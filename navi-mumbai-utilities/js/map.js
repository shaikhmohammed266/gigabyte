// Map functionality
let map = null;
let markers = [];
let heatmapLayer = null;

// Initialize the map
function initializeMap() {
    // Center on Navi Mumbai
    map = L.map('liveMap').setView([19.0330, 73.0297], 12);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);

    // Load initial complaints on map
    loadComplaintsForMap();
}

// Load complaints to display on map
async function loadComplaintsForMap() {
    try {
        const response = await fetch(`${API_BASE}/complaints`);
        const result = await response.json();

        if (result.success) {
            // Show only recent complaints (last 24 hours)
            const recentComplaints = result.complaints.filter(complaint => {
                const complaintTime = new Date(complaint.createdAt);
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return complaintTime > yesterday;
            });
            
            updateMapWithComplaints(recentComplaints);
        }
    } catch (error) {
        console.error('Error loading complaints for map:', error);
    }
}

// Update map with complaints
function updateMapWithComplaints(complaints) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Add new markers
    complaints.forEach(complaint => {
        // Generate random coordinates within Navi Mumbai area for demo
        const lat = 19.0330 + (Math.random() - 0.5) * 0.05;
        const lng = 73.0297 + (Math.random() - 0.5) * 0.05;

        const markerColor = complaint.type === 'power' ? 'red' : 'blue';
        const icon = L.divIcon({
            className: `custom-marker ${complaint.type}`,
            html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
        });

        const marker = L.marker([lat, lng], { icon: icon }).addTo(map);
        
        const popupContent = `
            <div class="map-popup">
                <strong>NM${complaint.id}</strong><br>
                <span class="badge ${complaint.type === 'power' ? 'bg-danger' : 'bg-primary'}">
                    ${complaint.type}
                </span>
                <span class="badge bg-${complaint.priority}">${complaint.priority}</span><br>
                <small>${complaint.area}</small><br>
                <small>${new Date(complaint.createdAt).toLocaleString()}</small>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        markers.push(marker);
    });

    // Create heatmap data
    createHeatmap(complaints);
}

// Create heatmap overlay
function createHeatmap(complaints) {
    // Remove existing heatmap
    if (heatmapLayer) {
        map.removeLayer(heatmapLayer);
    }

    // Group complaints by area for heatmap intensity
    const areaComplaints = {};
    complaints.forEach(complaint => {
        if (!areaComplaints[complaint.area]) {
            areaComplaints[complaint.area] = 0;
        }
        areaComplaints[complaint.area]++;
    });

    // Create heatmap points (more points for areas with more complaints)
    const heatPoints = [];
    const areaCoordinates = {
        'Vashi': [19.0760, 72.8777],
        'Nerul': [19.0330, 73.0297],
        'Kharghar': [19.0361, 73.0612],
        'Sanpada': [19.0726, 73.0073],
        'Seawoods': [19.0153, 73.0153]
    };

    Object.keys(areaComplaints).forEach(area => {
        const count = areaComplaints[area];
        const coords = areaCoordinates[area] || [19.0330, 73.0297];
        
        // Add multiple points based on complaint count for heatmap intensity
        for (let i = 0; i < count * 5; i++) {
            const lat = coords[0] + (Math.random() - 0.5) * 0.01;
            const lng = coords[1] + (Math.random() - 0.5) * 0.01;
            heatPoints.push([lat, lng, 0.5]); // intensity 0.5 for each point
        }
    });

    // Add heatmap layer
    heatmapLayer = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
            0.4: 'blue',
            0.6: 'cyan',
            0.7: 'lime',
            0.8: 'yellow',
            1.0: 'red'
        }
    }).addTo(map);
}

// Update map with new complaint (for real-time updates)
function updateMapWithComplaint(complaint) {
    // Reload all complaints to keep map updated
    loadComplaintsForMap();
}

// Add custom CSS for map markers
const style = document.createElement('style');
style.textContent = `
    .custom-marker {
        background: transparent;
        border: none;
    }
    .map-popup {
        font-size: 12px;
        min-width: 150px;
    }
    .map-popup .badge {
        font-size: 10px;
        margin: 2px 0;
    }
`;
document.head.appendChild(style);