# Ear2Earth

## Purpose

Ear2Earth is an open source web-based environmental sensor sonification tool that brings environmental sensor data to life through interactive sound and UI components. 

Most environmental monitoring tools speak only to experts — dense graphs and raw numbers that require training to interpret. That leaves out students, educators, and anyone who wants to understand what's happening in our ecosystems without a science degree.

Ear2Earth bridges that gap. By converting real sensor readings into dynamic soundscapes, it gives field scientists an intuitive way to catch anomalies in real time, and gives students a sensory, hands-on entry point into understanding how temperature, humidity, and other environmental forces are connected.

## Website Link
https://ear2earth.com/

## Table of Contents
- [Features](#features)
- [Quick Start](#quick-start)
- [Usage Guide](#usage-guide)
- [Developer Setup](#developer-setup)
- [System Diagram](#system-diagram)
- [File Structure](#file-structure)
- [How It Works](#how-it-works)
- [Contributing](#contributing)
- [Acknowledgments](#acknowledgments)
- [Upcoming Features](#upcoming-features)
- [License](#license)

## Features

- **Data Retrieval**: Fetch sensor data from MongoDB by packet count or time range
- **Flexible Sonification**: Choose from multiple sound synthesis modules with customizable settings
- **Musical Control**: Select scales, tonalities, starting notes, and tempo
- **Real-time Visualization**: View sensor data with interactive Plotly.js graphs
- **Dynamic Playback**: Adjust tempo on-the-fly with BPM controls and multipliers
- **Multi-module Support**: Layer multiple sound modules for complex soundscapes
- **Undo/Redo**: Step backward and forward through workspace changes
- **Export/Import Workspace**: Save and reload your workspace configuration
- **Download CSV**: Export retrieved sensor data as a CSV file
- **Clear Workspace**: Reset all sound modules and settings at once
- **Metadata Viewer**: View sensor metadata including coordinates and device info
- **Packet Refresh**: Automatically re-fetches the latest sensor data every 5 minutes, keeping your workspace in sync with the most recent packets
- **Draggable Toolbar**: Rearrange toolbar sections to customize your workspace layout
- **Multi-Axis Visualization**: Plot multiple sensors on a shared graph with independent y-axis scales
- **Global Timeline**: A shared x-axis timeline that syncs zoom and pan across all plots
- **Onboarding Tour**: A step-by-step walkthrough on first visit, relaunchable from the toolbar

## Quick Start

1. Visit [ear2earth.com](https://ear2earth.com/)
2. Follow the onboarding tour or dismiss it to explore on your own
3. Click the "Select a Database" button to select a data source
4. Choose how to retrieve data (Last X Packets or Time Range)
5. Configure your sound modules
6. Press Play and enjoy!

For more details, see the [User Guide](https://ear2earth.com/user-guide).

## Usage Guide
_A quick overview of the core workflow._

![Data Retrieval Screenshot](screenshots/updated-top-menu.png)

1. **Select a Data Source**:  
- Click "Select a Database" to open the data source modal
- Choose a preset or select a database and device manually, then click "Retrieve Data"
<img src="screenshots/updated-data-selection-3.png" width="40%"/>

_Screenshot of the data source selection panel showing a popup menu for choosing a preset pair or manual pair selection_

**Pick Your Retrieval Method:**
- **Last Packets**: Set a time window relative to the most recent packet (e.g. last 2 hours) and click Retrieve Data
<img src="screenshots/updated-last-packets.png" width="40%" />

- **Time Range**: Specify a custom start and end date/time and click Retrieve Data
- If neither is selected, the full dataset is retrieved by default
<img src="screenshots/updated-date-range.png" width="40%" />


**Use of Every:**
- Filters your data by using every Nth packet
- Example: Retrieving 16 packets with "Use of Every" of 4 → actual result is 4 packets (16 ÷ 4)

2. **Sound Module Settings**:  
![Sound Module Screenshot](screenshots/updated-sound-configs.png)

_Screenshot of a sound module panel showing volume slider, sensor dropdown, reading dropdown, and a delete button in the top left; as well as sound settings panel showing toggles and dropdowns for sustain, tonic, scale, tessitura, and sound type_

**Basic Settings:**
- **Volume Control**: Adjust the module's volume with the slider
- **Sensor Selection**: Choose a sensor from the dropdown
- **Reading Selection**: Pick one of the sensor's readings
- **Delete Module**: Click the X in the top-left to remove this track

**Advanced Settings:**
- Click the "Sound Options ▼" at the bottom to access detailed options

3. **Configure Sound Settings**:  
- **Sustain Notes**: Toggle whether notes hold until the next note or use default duration
- **Tonic (Starting Note)**: Set the base note for pitch conversion (e.g., C, D, E)
- **Scale**: Choose the musical scale (Major, Minor, Pentatonic, etc.)
- **Tessitura**: Select the pitch range (Bass, Tenor, Soprano, etc.)
- **Sound Type**: Pick from FM synthesis sounds or real instrument samples


4. **Add Sound Track**:  
![Add Module Screenshot](screenshots/add_track.png)
_Screenshot showing the Add Track button with a plus icon below the last sound module_

- Click the "Add Track ⊕" button below your last sound module
- Each module can be configured independently
- Layer multiple modules to create rich, complex soundscapes

5. **Playback**:  
![Sound Module Screenshot](screenshots/updated-playback-2.png) 

_Screenshot of the playback controls panel showing play and stop buttons, BPM and volume sliders, and multiplier buttons for 1x, 2x, 4x, and 8x speed_

**Basic Controls:**
- **Play Button** (▶): Start playback (press again to restart)
- **Stop Button** (■): Stop playback completely

**Tempo Control:**
- **BPM Slider**: Adjust Beats Per Minute (shown as a number below the slider)
- **Multiplier Buttons (1x, 2x, 4x, 8x)**: Multiply the slider BPM for faster playback

**Live Adjustments:**
- All sound module settings can be changed during playback
- Changes take effect immediately

## Developer Setup

### Prerequisites
Ensure you have the following installed:
- [Node.js — Download Node.js®](https://nodejs.org/)

### Environment Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/OPEnSLab-OSU/Ear2Earth.git
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create the .env (secrets) file

   At the root of the repository, create a file called ".env". The Node.js server will use the credentials you place in this file to connect to the MongoDB database.
   In this file, create a secret variable called URI like so:
   ```sh
   URI="mongodb+srv://<username>:<password>@<cluster-name>.<unique-cluster-variable>.mongodb.net/?retryWrites=true&w=majority"
   ```

4. Run the server:
   ```sh
   node server.js
   ```

5. Open `http://localhost:3000` in a web browser.

> ⚠️ Note: Microsoft Edge may suffer performance issues when running on battery power. Plug in or use another browser if audio playback becomes choppy/disfunctional.

## System Diagram
<br> ![System Diagram](screenshots/system_diagram.png) <br>
_System diagram showing Ear2Earth's architecture. The frontend (web browser) consists of index.html, which loads index.js and style.css. index.js uses Tone.js for audio and Plotly.js for visualization. The frontend communicates with the backend via HTTP requests and responses. The backend runs server.js, which uses Express.js and Node.js, and queries a MongoDB database for environmental sensor data._

## File Structure
```
/WEATHERCHIMESWEB
│── .github/workflows       # CI/CD workflow files
│── diagrams                # System diagrams
│── images                  # UI images
│── samples                 # Audio sample files
│── screenshots             # README screenshots
│── tests                   # Playwright test suite
│── user_guide_images       # Images for the user guide
│── index.html              # Main frontend UI
│── style.css               # Styling for UI elements
│── index.js                # Frontend logic, Tone.js integration
│── soundModule.js          # Sound module HTML template
│── instruments.js          # Synth and sampler definitions
│── sensorNames.js          # Sensor display name mappings
│── server.js               # Express.js backend, MongoDB interactions
│── user-guide.html         # User guide page
│── contributor-guide.html  # Contributor guide page
│── CONTRIBUTING.md         # Development workflow instructions
│── SOP.md                  # Standard operating procedures
│── .env                    # MongoDB connection string (not included in repo)
│── package.json            # Dependencies
```

## How It Works

### Data-to-Sound Pipeline

**1. Scale Construction**
   - Musical scales are built using interval patterns (e.g., Major: [2,2,1,2,2,2,1])
   - Supports classical, synthetic, and culturally specific modes

**2. Pitch Range Setup**
   - Scales span two octaves
   - Tessitura setting shifts the range (bass, tenor, soprano, etc.)

**3. Data Normalization**
   - Raw sensor data is normalized to 0.0–1.0 range
   - Ensures consistent mapping regardless of original units

**4. Pitch Mapping**
   - Normalized values select notes from the scale
   - Example: 0.75 → note at 75% position in the scale
   - Creates musically coherent transformation from data to sound

## Contributing

### Getting Started

**Backend (`server.js`):**
- MongoDB database and collection retrieval
- API endpoints: `/databases`, `/collections`, `/data`
- Express.js static file serving
- Automatic deployment via webhook on push to main

**Frontend (`index.js`):**
- Dynamic sound module creation
- Tone.js integration for audio synthesis
- UI event handling for data retrieval and playback
- [Plotly.js](https://plotly.com/javascript/) for real-time data visualization

### Recommended Learning Path

- [Node.js Tutorial](https://www.w3schools.com/nodejs/)
- [Node.js with MongoDB](https://www.w3schools.com/nodejs/nodejs_mongodb.asp)
- [Tone.js Documentation](https://tonejs.github.io/)
- OSU Course: CS 261 (Data Structures)

### Development Workflow
Please see our [CONTRIBUTING](CONTRIBUTING.md) for in-depth development workflow instructions.

## Acknowledgments
<a href="https://github.com/OPEnSLab-OSU/Ear2Earth/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=OPEnSLab-OSU/Ear2Earth" alt="contrib.rocks image" />
</a>

## Upcoming Features
- About page
- Contribution page
- Complete ADA-compliant UI recolor

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

See the [LICENSE](LICENSE.md) file for details, or visit [https://www.gnu.org/licenses/agpl-3.0.html](https://www.gnu.org/licenses/agpl-3.0.html)
