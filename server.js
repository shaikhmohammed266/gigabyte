const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// ✅ CRITICAL FIX: Serve static files from parent directory FIRST
app.use(express.static(path.join(__dirname, '..')));

// ✅ EXPLICIT ROUTE DEFINITIONS
app.get('/', (req, res) => {
    console.log('📄 SERVER: Serving login page (index.html)');
    res.sendFile(path.join(__dirname, '../index.html'));
});

app.get('/admin', (req, res) => {
    console.log('👑 SERVER: Serving admin dashboard');
    res.sendFile(path.join(__dirname, '../admin.html'));
});

app.get('/user-dashboard', (req, res) => {
    console.log('👤 SERVER: Serving user dashboard');
    res.sendFile(path.join(__dirname, '../user-dashboard.html'));
});

// Database file path
const DB_PATH = path.join(__dirname, 'database.json');

// Initialize database
function initializeDatabase() {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [
        {
          id: 1,
          phone: "9876543210",
          name: "Admin User",
          area: "Vashi",
          role: "admin",
          createdAt: new Date().toISOString()
        },
        {
          id: 2,
          phone: "9876543211", 
          name: "Test User",
          area: "Nerul",
          role: "user",
          createdAt: new Date().toISOString()
        }
      ],
      complaints: [
        {
          id: 1,
          type: "power",
          problemType: "no_electricity",
          description: "Complete power outage in building",
          location: "Vashi Sector 15",
          area: "Vashi",
          userId: 2,
          status: "submitted",
          priority: "high",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 2,
          type: "water",
          problemType: "low_pressure",
          description: "Very low water pressure since morning",
          location: "Nerul Sector 20",
          area: "Nerul", 
          userId: 2,
          status: "in-progress",
          priority: "medium",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      announcements: [
        {
          id: 1,
          title: "Welcome to Navi Mumbai Utilities",
          message: "Report power and water issues in real-time. Our team is here to help you 24/7.",
          type: "info",
          createdAt: new Date().toISOString(),
          active: true
        },
        {
          id: 2,
          title: "Scheduled Maintenance",
          message: "Power maintenance in Kharghar on Saturday 2PM-4PM. Sorry for the inconvenience.",
          type: "maintenance", 
          createdAt: new Date().toISOString(),
          active: true
        },
        {
          id: 3,
          title: "Water Supply Update",
          message: "Water supply will be affected in Vashi tomorrow from 10AM-2PM for pipeline repair.",
          type: "alert",
          createdAt: new Date().toISOString(),
          active: true
        }
      ],
      technicians: [
        {
          id: 1,
          name: "Raj Sharma",
          phone: "9876543211",
          specialization: "power",
          status: "available",
          location: { lat: 19.0760, lng: 72.8777 },
          complaintsAssigned: [1]
        },
        {
          id: 2,
          name: "Priya Patel", 
          phone: "9876543212",
          specialization: "water",
          status: "busy",
          location: { lat: 19.0330, lng: 73.0297 },
          complaintsAssigned: [2]
        },
        {
          id: 3,
          name: "Amit Kumar",
          phone: "9876543213", 
          specialization: "both",
          status: "available",
          location: { lat: 19.0361, lng: 73.0612 },
          complaintsAssigned: []
        }
      ],
      areas: [
        { name: "Vashi", powerStatus: "normal", waterStatus: "normal", complaints: 5 },
        { name: "Nerul", powerStatus: "normal", waterStatus: "low", complaints: 3 },
        { name: "Kharghar", powerStatus: "outage", waterStatus: "normal", complaints: 8 },
        { name: "Sanpada", powerStatus: "normal", waterStatus: "normal", complaints: 2 },
        { name: "Seawoods", powerStatus: "normal", waterStatus: "normal", complaints: 1 },
        { name: "Panvel", powerStatus: "fluctuating", waterStatus: "normal", complaints: 4 },
        { name: "Kamothe", powerStatus: "normal", waterStatus: "low", complaints: 2 }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
    console.log("✅ DATABASE: Initialized successfully with sample data!");
  }
}

// Read database
function readDB() {
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error("❌ DATABASE: Error reading database:", error);
    return { users: [], complaints: [], announcements: [], technicians: [], areas: [] };
  }
}

// Write to database
function writeDB(data) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error("❌ DATABASE: Error writing database:", error);
    return false;
  }
}

// Smart priority calculation
function calculatePriority(complaint, allComplaints) {
  const similarComplaints = allComplaints.filter(c => 
    c.type === complaint.type && 
    c.area === complaint.area &&
    c.status !== 'resolved' &&
    new Date(c.createdAt) > new Date(Date.now() - 2 * 60 * 60 * 1000) // Last 2 hours
  );
  
  const similarCount = similarComplaints.length;
  
  if (similarCount >= 10) return 'critical';
  if (similarCount >= 5) return 'high';
  if (similarCount >= 2) return 'medium';
  return 'low';
}

// ==================== API ROUTES ====================

// Authentication Routes
app.post('/api/login', (req, res) => {
  const { phone } = req.body;
  const db = readDB();
  
  console.log('🔐 API: Login attempt for phone:', phone);
  const user = db.users.find(u => u.phone === phone);
  
  if (user) {
    console.log('✅ API: User found -', user.name, 'Role:', user.role);
    res.json({ 
      success: true, 
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        area: user.area,
        role: user.role
      }
    });
  } else {
    console.log('❌ API: User not found');
    res.json({ 
      success: false, 
      message: "User not found. Please register." 
    });
  }
});

app.post('/api/register', (req, res) => {
  const { phone, name, area } = req.body;
  const db = readDB();
  
  console.log('📝 API: Registration attempt:', { phone, name, area });
  
  if (db.users.find(u => u.phone === phone)) {
    return res.json({ success: false, message: "User already exists" });
  }
  
  const newUser = {
    id: db.users.length + 1,
    phone,
    name,
    area,
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  db.users.push(newUser);
  writeDB(db);
  
  console.log('✅ API: New user registered:', newUser.name);
  
  res.json({ 
    success: true, 
    user: {
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      area: newUser.area,
      role: newUser.role
    }
  });
});

// Complaints Routes
app.post('/api/complaints', (req, res) => {
  const complaintData = req.body;
  const db = readDB();
  
  const newComplaint = {
    id: db.complaints.length + 1,
    ...complaintData,
    status: 'submitted',
    priority: 'low',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  // Calculate smart priority
  newComplaint.priority = calculatePriority(newComplaint, db.complaints);
  
  db.complaints.push(newComplaint);
  writeDB(db);
  
  console.log('✅ API: New complaint created - NM' + newComplaint.id, 'by User', newComplaint.userId);
  
  // Broadcast real-time update
  io.emit('new_complaint', newComplaint);
  io.emit('stats_update', getStats(db));
  
  res.json({ success: true, complaint: newComplaint });
});

app.get('/api/complaints', (req, res) => {
  const { userId, area } = req.query;
  const db = readDB();
  
  let complaints;
  if (userId) {
    complaints = db.complaints.filter(c => c.userId === parseInt(userId));
    console.log('📋 API: Fetching complaints for user', userId, '- Found:', complaints.length);
  } else if (area) {
    complaints = db.complaints.filter(c => c.area === area);
    console.log('📋 API: Fetching complaints for area', area, '- Found:', complaints.length);
  } else {
    complaints = db.complaints;
    console.log('📋 API: Fetching all complaints - Total:', complaints.length);
  }
  
  res.json({ success: true, complaints });
});

// Announcements Routes
app.get('/api/announcements', (req, res) => {
  const db = readDB();
  const activeAnnouncements = db.announcements.filter(a => a.active);
  console.log('📢 API: Fetching announcements - Active:', activeAnnouncements.length);
  res.json({ success: true, announcements: activeAnnouncements });
});

// Stats Routes
app.get('/api/stats', (req, res) => {
  const db = readDB();
  const stats = getStats(db);
  console.log('📊 API: Fetching system statistics');
  res.json({ success: true, stats });
});

// Areas Routes
app.get('/api/areas', (req, res) => {
  const db = readDB();
  console.log('📍 API: Fetching area data');
  res.json({ success: true, areas: db.areas });
});

// ==================== ADMIN ROUTES ====================

app.get('/api/admin/complaints', (req, res) => {
  const db = readDB();
  console.log('👑 ADMIN: Fetching all complaints for admin');
  res.json({ success: true, complaints: db.complaints });
});

app.post('/api/admin/announcements', (req, res) => {
  const announcement = req.body;
  const db = readDB();
  
  const newAnnouncement = {
    id: db.announcements.length + 1,
    ...announcement,
    createdAt: new Date().toISOString(),
    active: true
  };
  
  db.announcements.push(newAnnouncement);
  writeDB(db);
  
  console.log('📢 ADMIN: New announcement created by admin');
  
  io.emit('new_announcement', newAnnouncement);
  res.json({ success: true, announcement: newAnnouncement });
});

app.get('/api/admin/stats', (req, res) => {
  const db = readDB();
  const stats = getAdminStats(db);
  console.log('📊 ADMIN: Fetching admin statistics');
  res.json({ success: true, stats });
});

// ==================== UTILITY FUNCTIONS ====================

function getStats(db) {
  const totalComplaints = db.complaints.length;
  const activeComplaints = db.complaints.filter(c => c.status !== 'resolved').length;
  const resolvedComplaints = db.complaints.filter(c => c.status === 'resolved').length;
  
  const powerComplaints = db.complaints.filter(c => c.type === 'power').length;
  const waterComplaints = db.complaints.filter(c => c.type === 'water').length;
  
  // Calculate average resolution time (mock data for demo)
  const avgResolutionTime = totalComplaints > 0 ? '2.1h' : '0h';
  const resolutionRate = totalComplaints > 0 ? (resolvedComplaints / totalComplaints * 100).toFixed(1) : 0;
  
  return {
    totalComplaints,
    activeComplaints,
    resolvedComplaints,
    powerComplaints,
    waterComplaints,
    avgResolutionTime,
    resolutionRate: resolutionRate + '%'
  };
}

function getAdminStats(db) {
  const basicStats = getStats(db);
  const totalUsers = db.users.length;
  const totalTechnicians = db.technicians.length;
  const availableTechnicians = db.technicians.filter(t => t.status === 'available').length;
  
  // Area-wise stats
  const areaStats = db.areas.map(area => ({
    name: area.name,
    powerStatus: area.powerStatus,
    waterStatus: area.waterStatus,
    complaintCount: area.complaints
  }));
  
  return {
    ...basicStats,
    totalUsers,
    totalTechnicians,
    availableTechnicians,
    areaStats
  };
}

// ==================== SOCKET.IO ====================

io.on('connection', (socket) => {
  console.log('🔌 SOCKET: User connected:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('❌ SOCKET: User disconnected:', socket.id);
  });
  
  // Join room based on user role/area for targeted updates
  socket.on('join_user', (userData) => {
    if (userData.role === 'admin') {
      socket.join('admin_room');
      console.log('👑 SOCKET: Admin joined admin room');
    } else {
      socket.join(`area_${userData.area}`);
      console.log('👤 SOCKET: User joined area room:', userData.area);
    }
  });
});

// ==================== SERVER STARTUP ====================

const PORT = process.env.PORT || 3000;

// Clear console and show startup message
console.clear();
console.log(`
╔══════════════════════════════════════════════════════════════╗
║                 🚀 Navi Mumbai Utilities                    ║
║                   Server Starting...                        ║
╚══════════════════════════════════════════════════════════════╝
`);

// Initialize database
initializeDatabase();

server.listen(PORT, () => {
  console.log(`
✅ SERVER STARTED SUCCESSFULLY!
📍 Local: http://localhost:${PORT}
🌐 Network: http://YOUR_IP:${PORT}

📋 ACCESS POINTS:
   👉 LOGIN PAGE: http://localhost:${PORT}/
   👤 USER DASHBOARD: http://localhost:${PORT}/user-dashboard  
   👑 ADMIN DASHBOARD: http://localhost:${PORT}/admin

🔐 DEMO CREDENTIALS:
   📱 User: 9876543211 (Any area)
   🔧 Admin: 9876543210

🗄️  DATABASE STATUS:
   👥 Users: ${readDB().users.length}
   📋 Complaints: ${readDB().complaints.length} 
   📢 Announcements: ${readDB().announcements.length}
   🔧 Technicians: ${readDB().technicians.length}

💡 TIP: Always start at the login page for proper authentication.
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n🛑 Server shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});