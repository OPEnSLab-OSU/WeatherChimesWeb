# Ear2Earth

A web-based tool that retrieves environmental sensor data from a database and sonifies it using sound synthesis. This project integrates **MongoDB**, **Node.js**, **Express**, and **Tone.js** to generate soundscapes based on real-world data.

## Table of Contents
- [Features](#features)
- [Setup](#setup)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [Future Enhancements](#future-enhancements)

## Features
- Fetch sensor data from a MongoDB database.
- Choose between different sound synthesis modules.
- Select musical scales, tonalities, and tempo for sonification.
- Visualize sensor data in real-time with **Plotly.js**.
- Flexible playback options including tempo adjustment.

## Setup
### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- **Optional:** A `.env` file with a valid MongoDB connection string (`URI=<your-mongo-db-uri>`).

### Installation
1. Clone this repository:
   ```sh
   git clone <repository-url>
   cd weatherchimes
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Run the server:
   ```sh
   node server.js
   ```

4. Open `http://localhost:3000` in a web browser.

## Usage
1. **Select a Database**: Choose an available MongoDB database.
2. **Select a Device**: Pick a sensor from the database.
3. **Configure Sound Settings**:
   - Choose a **sensor reading** to map to sound.
   - Select a **tonic note**, **scale**, and **tessitura** (vocal range).
   - Adjust playback **BPM** and **speed**.
4. **Playback**: Press the **Play** button to generate sound.

## File Structure
```
/weatherchimes
│── index.html      # Main frontend UI
│── style.css       # Styling for UI elements
│── index.js        # Frontend logic, Tone.js integration
│── server.js       # Express.js backend, MongoDB interactions
│── .env            # MongoDB connection string (not included in repo)
│── package.json    # Dependencies
```

## Contributing
### Where to Start?
If you’re new to this project, start by understanding the following:
1. **Backend (server.js)**
   - How MongoDB databases and collections are retrieved.
   - API endpoints (`/databases`, `/collections`, `/data`).
   - Express.js static file serving.

2. **Frontend (index.js)**
   - How sound modules are created dynamically.
   - Tone.js integration and how sensor data maps to pitch.
   - How UI events trigger data retrieval and playback.

3. **Data Flow**
   - How sensor data is normalized and mapped to MIDI pitches.
   - The relationship between sensor readings and musical scales.

### How to Contribute
- Fork the repository and create a feature branch.
- Make changes and test thoroughly.
- Submit a **pull request** with a detailed description of changes.

## Future Enhancements
- Improve UI with more visual feedback.
- Expand sonification options with more sound synthesis techniques.
- Add support for more complex data transformation algorithms.
