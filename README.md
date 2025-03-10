# Ear2Earth

A web-based tool that retrieves environmental sensor data from a database and sonifies it using sound synthesis. This project integrates **MongoDB**, **Node.js**, **Express**, and **Tone.js** to generate soundscapes based on real-world data.

## Website Link
https://ear2earth.com/

## Table of Contents
- [Features](#features)
- [Usage Guide](#usage)
- [Setup](#setup)
- [System Diagram](#system-diagram)
- [File Structure](#file-structure)
- [Contributing](#contributing)
- [Future Enhancements](#future-enhancements)

## Features
- Fetch sensor data from a **MongoDB** database.
- Choose between different sound synthesis modules.
- Select musical scales, tonalities, and tempo for sonification using **Tone.js**.
- Visualize sensor data in real-time with **Plotly.js**.
- Flexible playback options including tempo adjustment.

## Usage Guide
1. **Select a Data Source**:
<br> ![Data Retrieval Screenshot](screenshots/data-retrieval1.png) <br>
- As shown in the red box, select a data source from the curated list.
   - If you would like, expand further data source options with the "▼" in the green box
- Select either "Last X Packets" or "Time Range":
   - "Last X Packets" will retrieve the X most recent packets from your specified data source
   - "Time Range" will let you specify a time range to retrieve packets in
 
<br> ![Data Retrieval Screenshot](screenshots/data-retrieval2.png) <br>
- Select the calendar symbol in the Start and End boxes to pull up a date selection menu, or use your keyboard to manually enter a date  
   -  If you select "Last X Packets", you can specify the number of packets you would like to retrieve
- Next, as in the purple box, specify the prescaling value
   - For example, if you specify 16 as the number of packets to retrieve and use one of every 4 packets, a total of 16 / 4 = 4 packets will be retrieved
- Once you've set all the values as desired, press the "Retrieve Data" button to pull packets from the database

2. **Sound Module Settings**:
<br> ![Sound Module Screenshot](screenshots/sound_module.png) <br>
- As shown in the green box, you can specify a sensor and one of the readings from that sensor
- Labeled in orange in the screenshot, there is also a volume setting on each sound module
- If you would like to remove a sound module, there is a trash icon that can be used to delete it, labeled with the blue box at the top right
- At the bottom left of each sound module, labeled in yellow, there is a button to expand the options for altering the sound
   
3. **Configure Sound Settings**:
<br> ![Sound Configuration Screenshot](screenshots/sound_settings.png) <br>
- Black: Each note sustains until the next unique note. If unchecked, each note lasts only the default duration for that instrument
- Red: The "starting" note for the conversion from reading values to MIDI pitches
- Green: Adjust the scale to be used for conversion to MIDI
- Blue: Adjust the pitch range, or "tessitura", to be used for MIDI conversion
- Orange: Select a sound type -- Each option is either a sound produced from FM synthesis, or from a real instrument sample

4. **Add Modules**:
<br> ![Add Module Screenshot](screenshots/add_module.png) <br>
- Below the bottom sound module, there is a "+" button to add more sound modules
   - Each sound module has its own options which can be uniquely adjusted

5. **Playback**:
<br> ![Sound Module Screenshot](screenshots/playback.png) <br>
- Once you've got all of your sound modules configured as you like, press the Play button!
   - Note that all of the soundModule settings can still be adjusted during playback
   - When you want to restart playback, you can just press Play again
- Use the slider to adjust the speed of note playback, in the form of Beats Per Minute
- The 1x, 2x, 4x, and 8x buttons allow you to multiply the Beats Per Minute from the slider
- When you would like to stop playback, just click the large square Stop button next to the play button

## Setup
### Prerequisites
Ensure you have the following installed:
- [Node.js](https://nodejs.org/)
- [MongoDB](https://www.mongodb.com/)

### Development Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/OPEnSLab-OSU/WeatherChimesWeb.git
   ```

2. Install dependencies:
   ```sh
   npm install
   ```

3. Create the .env (secrets) file <br><br>
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

## System Diagram
<br> ![System Diagram](screenshots/system_diagram.png) <br>

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
