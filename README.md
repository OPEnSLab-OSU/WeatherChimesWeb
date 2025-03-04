# Ear2Earth

A web-based tool that retrieves environmental sensor data from a database and sonifies it using sound synthesis. This project integrates **MongoDB**, **Node.js**, **Express**, and **Tone.js** to generate soundscapes based on real-world data.

## Website Link
https://ear2earth.com/

## Table of Contents
- [Features](#features)
- [Setup](#setup)
- [Usage](#usage)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [Future Enhancements](#future-enhancements)

## Features
- Fetch sensor data from a **MongoDB** database.
- Choose between different sound synthesis modules.
- Select musical scales, tonalities, and tempo for sonification using **Tone.js**.
- Visualize sensor data in real-time with **Plotly.js**.
- Flexible playback options including tempo adjustment.

## Setup
### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)
- **Optional:** A `.env` file with a valid MongoDB connection string (`URI=<your-mongo-db-uri>`).

### Development Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/OPEnSLab-OSU/WeatherChimesWeb.git
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create the .env (secrets) file
   At the root of the repository, create a file called ".env". The Node.js server will use the credentials you place in this file to connect to the MongoDB database.
   In this file, create a secret variable called URI like so:
   ```sh
   URI="<MonogoDB connection string goes here>"
   ```

4. Run the server:
   ```sh
   node server.js
   ```

5. Open `http://localhost:3000` in a web browser.

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
   - Pushes to main automatically forwards the changes to the web server, causing it to restart with the new content

2. **Frontend (index.js)**
   - How sound modules are created dynamically.
   - Tone.js integration and how sensor data maps to pitch.
   - How UI events trigger data retrieval and playback.

3. **Data Flow**
   - How sensor data is normalized and mapped to MIDI pitches.
   - The relationship between sensor readings and musical scales.

## Future Enhancements
- Improve UI with more visual feedback.
- Expand sonification options.
