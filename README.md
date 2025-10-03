# DMS Digitalization Tool

A comprehensive industrial management web application designed to streamline production monitoring, data analysis, and reporting for manufacturing environments. Built with a modern React frontend and robust backend infrastructure.

## 🚀 Features

### Frontend (React + TypeScript)
- **Multi-role Dashboard**: Section Manager, Process Engineer, and Line Lead interfaces
- **Real-time Production Monitoring**: Live production plans, GE statistics, and performance metrics
- **Interactive Data Visualization**: Dynamic charts for GE, Volume, Waste, and Speed Loss analysis
- **Loss Management**: Track breakdowns, minor stoppages, and operational losses
- **Safety Management**: Behavioral Observation System and Near Miss reporting
- **Report Generation**: PDF export capabilities for all data views
- **Responsive Design**: Mobile-friendly interface with modern UI components

### Backend (Node.js + Express)
- **RESTful API**: Comprehensive endpoints for data management
- **SQLite Database**: Efficient local data storage and retrieval
- **File Upload System**: Drag & drop support for Excel files and reports
- **Real-time Data Processing**: Live updates and calculations
- **Authentication Ready**: Azure AD integration framework

### Data Processing (Python)
- **Excel Automation**: Automated extraction and processing of production data
- **Data Transformation**: Convert Excel formats to structured JSON/DB formats
- **Report Generation**: Automated reporting from raw production data

## 🏗️ Architecture

```
DMS-App/
├── frontend/                 # React TypeScript Application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── AuthProvider.tsx     # Authentication context
│   │   ├── authConfig.ts     # Authentication context
│   │   └── App.tsx          # Main application
│   └── public/
├── backend/                  # Node.js Express Server
│   ├── routes/              # API endpoints
│   ├── scripts/             # Python data processing scripts
│   └── public/data/         # Database and JSON files
└── docs/                    # Documentation
```

## 📊 Core Modules

### Production Monitoring
- Real-time production plan visualization
- Equipment efficiency tracking
- Shift-based performance analysis
- Current and upcoming production scheduling

### Data Analytics
- Monthly and quarterly performance trends
- Target vs. actual performance comparison
- Color-coded performance indicators
- Interactive chart visualizations

### Loss Management
- Breakdown tracking with detailed comments
- Minor stoppages analysis
- Operational losses monitoring
- Root cause documentation

### Safety & Compliance
- Behavioral Observation System (BOS)
- Near Miss reporting
- Unsafe conditions tracking
- Safety metrics dashboard

### Reporting
- Custom report creation
- PDF export functionality
- Historical data analysis
- Multi-format data export

## 🛠️ Technology Stack

**Frontend:**
- React 18 with TypeScript
- Chart.js for data visualization
- HTML2Canvas & jsPDF for reporting
- CSS3 with modern responsive design

**Backend:**
- Node.js with Express.js
- SQLite database
- Multer for file uploads
- CORS-enabled API architecture

**Data Processing:**
- Python 3.x
- Pandas for Excel processing
- Custom data transformation scripts

## 🔧 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/dms-2-digitalization-tool.git
   cd dms-2-digitalization-tool
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm start
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Python Dependencies**
   ```bash
   pip install pandas openpyxl
   ```

## 📈 Key Benefits

- **Digital Transformation**: Replace paper-based systems with digital workflows
- **Real-time Insights**: Immediate access to production performance data
- **Data-Driven Decisions**: Comprehensive analytics for operational improvements
- **Cross-Platform**: Accessible from any device with a web browser
- **Scalable Architecture**: Modular design for easy feature expansion

## 👥 Target Users

- **Section Managers**: Overall production oversight and reporting
- **Process Engineers**: Technical analysis and process optimization
- **Line Leads**: Daily operations management and real-time monitoring
- **Safety Officers**: Compliance tracking and incident reporting

## 🔒 Security Features

- Role-based access control
- Secure file upload validation
- Input sanitization
- Prepared SQL statements
- CORS configuration

---

*Built for modern manufacturing excellence* 🏭⚡
