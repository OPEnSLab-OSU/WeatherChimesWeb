// Create AudioContext
let WAContext = window.AudioContext || window.webkitAudioContext;
let context = new WAContext();

// Tone.js Audio Context
let device;
let isPlaying = false;

// Initialize Tone.js objects
let fmSynths = []; // Array of FM synths
let gainNodes = []; // Array of gain nodes

midiPitchesArray = []; // Array to hold MIDI pitches for each sound module

let intervalId;
let timeBetweenNotes = 500; // Time between notes in milliseconds
let i = 0;
Tone.context.latencyHint = "playback"; // Prioritize smooth audio

const sound1 = {
    harmonicity: 3,
    modulationIndex: 15,
    oscillator: { type: "sine" },
    modulation: { type: "sine" },
    envelope: { attack: 0.2, decay: 5.0, sustain: 1, release: 8.0 },
    modulationEnvelope: { attack: 1.5, decay: 2.5, sustain: 0.6, release: 3.5 },
    oscillator: { partialCount: 2, partials: [1, 1], phase: 0, type: "sine2" }
};

// Template for creating a sound module
function createSoundModuleTemplate(moduleId) {
    return `
        <div class="soundModule" id="module${moduleId}">
            <div class="volumeContainer">
        <label for="volume">Volume:</label>
        <input type="range" class="volume" min="-60" max="0" value="-10">
            </div>

            <div class="moduleDataOptions">
                <div class="sensorsContainer">
                    <label for="sensors">Sensor:</label>
                    <select class="sensors">
                        <option value="default">Select a sensor</option>
                    </select>
                </div>

                <div class="readingsContainer">
                    <label for="readings">Reading:</label>
                    <select class="readings">
                        <option value="default">Select a reading</option>
                    </select>
                </div>
            </div>
            
            <div class="plot"></div>
            
            <button class="collapse-btn">▼</button> <!-- Collapse button -->
            
            <div class="moduleBottomOptions" style="display: none;"> <!-- Initially hidden -->
                <div>
                    <label for="tonic">Tonic:</label>
                    <select class="tonic">
                        <option value="C">C</option>
                        <option value="C#">C#</option>
                        <option value="D">D</option>
                        <option value="D#">D#</option>
                        <option value="E">E</option>
                        <option value="F">F</option>
                        <option value="F#">F#</option>
                        <option value="G">G</option>
                        <option value="G#">G#</option>
                        <option value="A">A</option>
                        <option value="A#">A#</option>
                        <option value="B">B</option>
                    </select>
                    
                    <label for="scale">Scale:</label>
                    <select class="scale">
                        <option value="Pentatonic">Pentatonic</option>
                        <option value="Ionian">Ionian</option>
                        <option value="Dorian">Dorian</option>
                        <option value="Phrygian">Phrygian</option>
                        <option value="Lydian">Lydian</option>
                        <option value="Mixolydian">Mixolydian</option>
                        <option value="Aeolian">Aeolian</option>
                        <option value="Locrian">Locrian</option>
                        <option value="Melodic Minor">Melodic Minor</option>
                        <option value="Harmonic Minor">Harmonic Minor</option>
                        <option value="Harmonic Major">Harmonic Major</option>
                        <option value="Whole Tone">Whole Tone</option>
                        <option value="Chromatic">Chromatic</option>
                        <option value="Octatonic Major">Octatonic Major</option>
                        <option value="Octatonic Minor">Octatonic Minor</option>
                        <option value="Synthetic Minor">Synthetic Minor</option>
                        <option value="Major Bitonal">Major Bitonal</option>
                        <option value="Minor Bitonal">Minor Bitonal</option>
                        <option value="Polytonal">Polytonal</option>
                        <option value="Ditone">Ditone</option>
                        <option value="Prometheus">Prometheus</option>
                        <option value="Trans-Pentatonic">Trans-Pentatonic</option>
                        <option value="Pelog">Pelog</option>
                        <option value="Slendro">Slendro</option>
                        <option value="Hungarian-Bartok">Hungarian-Bartok</option>
                        <option value="Bulgarian-Bartok">Bulgarian-Bartok</option>
                        <option value="Asian-Bartok">Asian-Bartok</option>
                        <option value="Spain">Spain</option>
                        <option value="India-Dharmavati">India-Dharmavati</option>
                        <option value="Japan">Japan</option>
                        <option value="Peru">Peru</option>
                        <option value="Alaska">Alaska</option>
                        <option value="Jewish Ahavoh-Rabboh">Jewish Ahavoh-Rabboh</option>
                        <option value="Slavic">Slavic</option>
                        <option value="Blues">Blues</option>
                    </select>

                    <label for="tessitura">Tessitura:</label>
                    <select class="tessitura">
                        <option value="Bass">Bass</option>
                        <option value="Baritone">Baritone</option>
                        <option value="Tenor">Tenor</option>
                        <option value="Alto">Alto</option>
                        <option value="Soprano">Soprano</option>
                    </select>
                </div>
            </div>
        </div>`;
}

// Function to initialize a sound module
function addSoundModule() {
    console.log("Adding a new sound module...");
    const moduleId = soundModules.length; // Determine the next module ID
    const modulesContainer = document.getElementById("modulesContainer");

    // Use the template function to generate the new module's HTML
    const newModuleHTML = createSoundModuleTemplate(moduleId);

    // Append the new module to the container
    modulesContainer.insertAdjacentHTML("beforeend", newModuleHTML);

    // Get the newly created module element
    const newModule = document.getElementById(`module${moduleId}`);

    // Add the module to the soundModules array
    soundModules.push(newModule);

    // Setup synth and gain nodes for this module
    setupSoundModule(moduleId);

    // Attach event listeners to the new module
    attachListenersToSoundModule(newModule);

    // Initialize the sound module with default values
    initializeModuleSelects(newModule, retrievedData);
}

document.getElementById("addModule").onclick = addSoundModule;

// Event listener for the "Add Module" button

/******* Listners for sound modules ********/

function attachListenersToSoundModule(soundModule) {
    attachVolumeListener(soundModule);
    attachSensorListener(soundModule);
    attachReadingListener(soundModule);
    attachCollapseListener(soundModule);
    attachSoundOptionListeners(soundModule);
}

function attachVolumeListener(soundModule) {
    const volumeSlider = soundModule.querySelector(".volume");
    volumeSlider.addEventListener("input", (event) => {
        const volumeValue = parseFloat(event.target.value);
        gainNodes[soundModules.indexOf(soundModule)].volume.value = volumeValue;
        console.log(`Volume for ${soundModule.id} set to ${volumeValue} dB`);
    });
}

function attachSensorListener(soundModule) {
    const sensorSelect = soundModule.querySelector(".sensors");
    sensorSelect.addEventListener("change", (event) => {
        const selectedSensor = event.target.value;
        setReadings(soundModules.indexOf(soundModule));
        console.log(`Sensor for ${soundModule.id} set to ${selectedSensor}`);
    });
}

function attachReadingListener(soundModule) {
    const readingSelect = soundModule.querySelector(".readings");
    readingSelect.addEventListener("change", (event) => {
        const selectedReading = event.target.value;
        plot(soundModules.indexOf(soundModule));
        console.log(`Reading for ${soundModule.id} set to ${selectedReading}`);
    });
}

function attachCollapseListener(soundModule) {
    const collapseBtn = soundModule.querySelector(".collapse-btn");
    collapseBtn.addEventListener("click", () => {
        const options = soundModule.querySelector(".moduleBottomOptions");
        const isVisible = options.style.display === "block";
        options.style.display = isVisible ? "none" : "block";
        collapseBtn.textContent = isVisible ? "▼" : "▲";
    });
}

function attachSoundOptionListeners(soundModule) {
    // Attach listeners to all relevant elements within the soundModule
    const elements = soundModule.querySelectorAll('.sensors, .readings, .tessitura, .tonic, .scale');
    elements.forEach((element) => {
        element.addEventListener('change', (event) => {
            console.log("Change detected in sound module settings.");
            const moduleIdx = soundModules.indexOf(soundModule);

            if (moduleIdx !== -1) {
                console.log(`Updating sound module ${soundModule.id} for change in ${event.target.className}.`);
                // Call the update function with the correct module index
                updateSoundModule(moduleIdx);
            } else {
                console.error("Sound module not found for the given element.");
            }
        });
    });
}


// Setup Oscillators and Gain Nodes
function setupSoundModule(moduleId) {
    const fmSynth = new Tone.FMSynth(sound1);
    const gainNode = new Tone.Volume(-10).toDestination();

    fmSynth.connect(gainNode);

    // Add to arrays
    fmSynths[moduleId] = fmSynth;
    gainNodes[moduleId] = gainNode;
}

// Helper function to convert MIDI note to frequency
function midiToFreq(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Event listener for play button
document.getElementById("play").onclick = function () {
    if (fmSynths.length === 0 || gainNodes.length === 0) {
        console.error("No sound modules initialized.");
        return;
    }

    for (let m of soundModules) {
        updateSoundModule(soundModules.indexOf(m));
    }

    playNotes();
};

// Play notes using Tone.js
async function playNotes() {
    console.log("Playing notes...");

    await Tone.start(); // Ensure Tone.js is ready to play audio

    if (fmSynths.length === 0 || gainNodes.length === 0) {
        console.error("Synths or gain nodes not initialized.");
        return;
    }

    gainNodes.forEach((gainNode) => {
        gainNode.volume.value = -10; // Restore the default volume level
    });

    i = 0; // Reset index
    isPlaying = true;

    Tone.Transport.cancel(0); // Clear previous scheduled events

    // Schedule playback for each synth
    Tone.Transport.scheduleRepeat((time) => {
        if (!isPlaying) {
            Tone.Transport.stop();
            return;
        }

        fmSynths.forEach((synth, moduleId) => {
            const midiPitches = midiPitchesArray[moduleId];
            if (!midiPitches || midiPitches.length === 0) return;

            const currentIndex = i % midiPitches.length;
            const newNote = midiPitches[currentIndex];
            
            // Do not play note if it is the same as the previous one
            if (currentIndex == 0 || newNote !== midiPitches[currentIndex - 1]) {
                const freq = midiToFreq(midiPitches[currentIndex]);

                // Play note with specified duration
                synth.triggerAttackRelease(freq, 0.25, time); // 8th note duration   
            }
        });

        i++;
    }, timeBetweenNotes / 1000); // Use the time interval for scheduling

    // Start playback
    Tone.Transport.start();
}

// Stop oscillators
function stopSynths() {
    isPlaying = false;

    gainNodes.forEach((gainNode) => {
        // Fade out the volume
        gainNode.volume.rampTo(-Infinity, 0.1);
    });

    setTimeout(() => {
        // Stop the synths without disposing them
        fmSynths.forEach((synth) => {
            if (synth) {
                synth.triggerRelease(); // Release any currently playing notes
            }
        });

        Tone.Transport.stop();
        Tone.Transport.cancel(0); // Cancel all scheduled events
    }, 100);
}

// Event listener for stop button
document.getElementById("stop").addEventListener("click", stopSynths);

// Adjust tempo
document.getElementById("bpm").addEventListener("change", function () {
    timeBetweenNotes = 60000 / document.getElementById("bpm").value;
    document.getElementById("bpmText").innerText = document.getElementById("bpm").value;
    Tone.Transport.bpm.value = document.getElementById("bpm").value; // Update Tone.js Transport tempo
});

var retrievedData;
var data2;

var soundModules = [];

// Initialize Tone.js setup when document loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize existing soundModules in the DOM
    const existingModules = document.getElementsByClassName('soundModule');
    for (let m of existingModules) {
        soundModules.push(m);
    }

    // Fetch databases and populate the dropdown
    fetch('/databases')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('databases');
            select.innerHTML = '';

            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.text = item;
                select.appendChild(option);
            });

            setDatabases();
        })
        .catch(error => console.error('Error:', error));

    // Create two soundModules on page load
    const modulesContainer = document.getElementById("modulesContainer");

    // Initialize two soundModules
    for (let i = 0; i < 2; i++) {
        addSoundModule(); // Dynamically create and set up modules
    }
});

function setDatabases() {
    const select = document.getElementById('devices');
    select.innerHTML = '';

    let database = document.getElementById("databases").value;
    fetch(`/collections?database=${database}`)
        .then(response => response.json())
        .then(data => {
            // Append the collection names to the "collections" select element as options
            data.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.text = item;
                select.appendChild(option);
            });
        })
        .catch(error => console.error('Error:', error));
}

document.getElementById("databases").addEventListener('change', setDatabases);

// Event listener to each radio button
document.getElementsByName("packetOption").forEach(radio => {
    // Get the input fields
    let numpacketsInput = document.getElementById("numpacketsInput");
    let timeInputs = document.getElementById("timeInputs");

    radio.addEventListener('change', function() {
        // If "lastXPackets" is selected, show the "numpackets" and "prescaler" input fields and hide the "startTime" and "endTime" input fields
        if (this.value === "lastXPackets") {
            numpacketsInput.style.display = "block";
            timeInputs.style.display = "none";
        }
        // If "timeRange" is selected, hide the "numpackets" input field and show the "startTime", "endTime" and "prescaler" input fields
        else if (this.value === "timeRange") {
            numpacketsInput.style.display = "none";
            timeInputs.style.display = "block";
        }
    });
});

// Main function to retrieve data and initialize modules
document.getElementById("retrieve").onclick = function () {
    for (let m of soundModules) {
        // Clear the sensors and readings select elements
        let sensorsSelect = m.querySelector(".sensors");
        while (sensorsSelect.options.length > 1) {
            sensorsSelect.removeChild(sensorsSelect.lastChild);
        }

        let readingsSelect = m.querySelector(".readings");
        while (readingsSelect.options.length > 1) {
            readingsSelect.removeChild(readingsSelect.lastChild);
        }
    }

    let db = document.getElementById("databases").value;
    let collection = document.getElementById("devices").value;
    let x = document.getElementById("numpackets").value;
    let startTime = document.getElementById("startTime").value;
    let endTime = document.getElementById("endTime").value;

    let packetOption = document.querySelector('input[name="packetOption"]:checked').value;
    let prescaler = document.getElementById("prescaler").value;

    let url;

    if (packetOption === "lastXPackets") {
        if (x === "" || isNaN(x)) {
            alert("Number of packets must be an integer number");
            return;
        }
        url = `/data/?database=${db}&collection=${collection}&x=${x}&prescaler=${prescaler}`;
    } else if (packetOption === "timeRange") {
        if (startTime === "" || endTime === "") {
            alert("Please enter a valid start time and end time");
            return;
        }

        if (startTime >= endTime) {
            alert("End time cannot be before start time");
            return;
        }

        url = `/data/?database=${db}&collection=${collection}&startTime=${startTime}&endTime=${endTime}&prescaler=${prescaler}`;
    }

    if (collection === "default") {
        alert("Please select a device");
        return;
    }

    fetch(url)
        .then(response => response.json())
        .then(data => {
            retrievedData = data;

            console.log(data);

            for (let m of soundModules) {
                initializeModuleSelects(m, data);
            }
        })
        .catch(error => console.error("Error:", error));
};

// Function to initialize a sound module with given data
function initializeModuleSelects(module, data) {
    // Clear the sensors select element
    let sensorsSelect = module.querySelector(".sensors");
    while (sensorsSelect.firstChild) {
        sensorsSelect.removeChild(sensorsSelect.firstChild);
    }

    // Populate the sensors select element with data keys
    if (data && data.length > 0) {
        // Get the keys of the first object in the data array
        let keys = Object.keys(data[0]);

        // Add each key as an option to the sensors select element
        keys.forEach(key => {
            if (key === "_id" || key === "Timestamp") return;
            let option = document.createElement("option");
            option.value = key;
            option.text = key;
            sensorsSelect.appendChild(option);
        });

        // Initialize readings select element
        setReadings(soundModules.indexOf(module));
    }
}

// Sets readings on all sound modules
function setReadings(moduleIdx) {
    let m = soundModules[moduleIdx];
    let sensor = m.querySelector(".sensors").value;
    
    // Get the select element for readings
    let selectReadings = m.querySelector(".readings");

    // Remove any existing options
    while (selectReadings.firstChild) {
        selectReadings.removeChild(selectReadings.firstChild);
    }

    // If sensor is not "default"
    if (sensor !== "default") {
        // Get the first object in the data array that has the sensor as a key
        let sensorData = retrievedData.find(d => d.hasOwnProperty(sensor));

        // If sensorData exists and its value is an object
        if (sensorData && typeof sensorData[sensor] === "object") {
            // Get the keys of the sensorData object
            let keys = Object.keys(sensorData[sensor]);

            // Add each key as an option to the select element
            keys.forEach(key => {
                let option = document.createElement("option");
                option.value = key;
                option.text = key;
                selectReadings.appendChild(option);
            });

            plot(moduleIdx);
        }
    }
}

// // Update the notes when the user changes any setting in the sound module
// document.querySelectorAll('.sensors, .readings, .tessitura, .tonic, .scale').forEach(element => {
//     element.addEventListener('change', (event) => {
//         // Find the parent soundModule for this element
//         const soundModule = event.target.closest('.soundModule');
//         const moduleIdx = soundModules.indexOf(soundModule);

//         if (moduleIdx !== -1) {
//             // Update MIDI pitches for this module
//             updateSoundModule(moduleIdx);
//         }
//     });
// });

function updateSoundModule(moduleIdx) {
    const m = soundModules[moduleIdx];

    const sensor = m.querySelector('.sensors').value;
    const reading = m.querySelector('.readings').value;

    // Get and normalize the reading data
    const readingData = retrievedData
        .filter(d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading))
        .map(d => d[sensor][reading])
        .reverse();

    const normalizedData = normalizeData(readingData);

    // Get scale settings
    const tessitura = m.querySelector(".tessitura").value;
    const tonic = m.querySelector(".tonic").value;
    const scaleName = m.querySelector(".scale").value;
    const scale = createScaleArray(tonic, scaleName, tessitura);

    // Update the respective MIDI pitches array
    midiPitchesArray[moduleIdx] = dataToMidiPitches(normalizedData, scale);

    // Optional: Log for debugging
    console.log(`Updated pitches for module ${moduleIdx}:`, midiPitchesArray[moduleIdx]);
}

function plot(moduleIdx) {
    let m = soundModules[moduleIdx];
    // Clear the plot area
    m.querySelector('.plot').innerHTML = "";

    // Get the selected sensor and reading
    let sensor = m.querySelector('.sensors').value;
    let reading = m.querySelector('.readings').value;

    // If sensor and reading are not "default"
    if (sensor !== "default" && reading !== "default") {
        // Get the data for the selected sensor and reading
        let readingData = retrievedData
            .filter(d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading))
            .map(d => d[sensor][reading]);

        console.log(readingData);

        // If readingData exists
        if (readingData.length > 0) {
            // Reverse the readingData array
            readingData = readingData.reverse();

            // Create an array of numbers for the x-axis
            let xData = Array.from({length: readingData.length}, (_, i) => i);

            // Create the data array for the plot
            let plotData = [{
                x: xData,
                y: readingData,
                type: 'scatter',
                mode: 'lines'
            }];

            // Create the layout object for the plot
            let layout = {
                title: `${sensor} - ${reading}`,
                autosize: true // Enables automatic sizing
            };

            // Plot the data using Plotly
            Plotly.newPlot(m.querySelector('.plot'), plotData, layout);
        }
    }
}

// Function to get MIDI number for a tonic note in the 2nd octave (MIDI numbers for C2 is 36)
function getMidiNumber(tonic) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const baseMidi = 24; // MIDI number for C2 using the "General MIDI" standard, where C4 is MIDI number 60
    console.log(baseMidi + notes.indexOf(tonic));
    return baseMidi + notes.indexOf(tonic);
}

function getScaleIntervals(scaleName) {
    const scales = {
        'Ionian': [2, 2, 1, 2, 2, 2, 1],
        'Dorian': [2, 1, 2, 2, 2, 1, 2],
        'Phrygian': [1, 2, 2, 2, 1, 2, 2],
        'Lydian': [2, 2, 2, 1, 2, 2, 1],
        'Mixolydian': [2, 2, 1, 2, 2, 1, 2],
        'Aeolian': [2, 1, 2, 2, 1, 2, 2], 
        'Locrian': [1, 2, 2, 1, 2, 2, 2],
        'Melodic Minor': [2, 1, 2, 2, 2, 2, 1],
        'Harmonic Minor': [2, 1, 2, 2, 1, 3, 1],
        'Harmonic Major': [2, 2, 1, 2, 1, 3, 1],
        'Whole Tone': [2, 2, 2, 2, 2, 2], 
        'Chromatic': [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 
        'Octatonic Major': [2, 1, 2, 1, 2, 1, 2, 1], 
        'Octatonic Minor': [1, 2, 1, 2, 1, 2, 1, 2],
        'Pentatonic': [2, 2, 3, 2, 3], 
        'Synthetic Minor': [3, 1, 2, 2, 1, 2, 1],
        'Major Bitonal': [1, 3, 2, 1, 3, 1, 1], 
        'Minor Bitonal': [1, 2, 3, 1, 2, 1, 2],
        'Polytonal': [2, 1, 1, 1, 2, 1, 1, 1, 2], 
        'Ditone': [1, 3, 1, 3, 1, 3], 
        'Prometheus': [2, 2, 2, 3, 1, 2], 
        'Trans-Pentatonic': [3, 2, 1, 2, 2, 2], 
        'Pelog': [1, 2, 4, 1, 4],
        'Slendro': [2, 3, 2, 3, 2],
        'Hungarian-Bartok': [2, 1, 3, 1, 1, 3, 1],
        'Bulgarian-Bartok': [1, 2, 2, 2, 2, 1, 2],
        'Asian-Bartok': [2, 1, 3, 1, 2, 2, 1],
        'Spain': [1, 2, 2, 2, 1, 3, 1],
        'India-Dharmavati': [2, 1, 3, 1, 2, 2, 1],
        'Japan': [2, 1, 1, 2, 2, 1, 2, 1],
        'Peru': [3, 2, 2, 1, 2, 2],
        'Alaska': [3, 2, 1, 2, 1, 2, 1],
        'Jewish Ahavoh-Rabboh': [1, 3, 1, 2, 1, 2, 2],
        'Slavic': [5, 2, 1, 2, 2],
        'Blues': [3, 2, 1, 1, 3, 2]
    };

    return scales[scaleName] || []; // Return the intervals array or an empty array if not found
}

// Function to create a scale based on a tonic and intervals, up to 5 octaves
function createScaleArray(tonic, scaleName, tessitura) {
    // Define how many octaves to shift based on tessitura
    const tessituraShifts = {
        bass: 0, // Base 2-octave range (e.g., starting from E2 for C4)
        baritone: 1,
        tenor: 2,
        alto: 3,
        soprano: 4
    };

    // Determine the number of octaves to shift
    const octaveShift = tessituraShifts[tessitura.toLowerCase()] || 0;

    // Get scale intervals and base tonic MIDI number
    const intervals = getScaleIntervals(scaleName);
    const tonicMidi = getMidiNumber(tonic);

    // Generate notes in a 2-octave range
    let scale = [];
    let currentNote = tonicMidi;

    for (let octave = 0; octave < 2; octave++) {
        for (let interval of intervals) {
            scale.push(currentNote);
            currentNote += interval;
        }
        currentNote = tonicMidi + 12 * (octave + 1); // Move to the next octave
    }

    // Shift notes up by the desired number of octaves
    const shiftedScale = scale.map(note => note + octaveShift * 12);

    return shiftedScale;
}

// Normalize data
function normalizeData(data) {
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
    if (minVal === maxVal) {
        // Return an array of 0.5s or handle as appropriate
        return data.map(() => 0.5);
    }
    return data.map(x => (x - minVal) / (maxVal - minVal));
}

// Map normalized data to MIDI pitches
function dataToMidiPitches(normalizedData, scale) {
    const scaleLength = scale.length;
    return normalizedData.map(value => scale[Math.floor(value * (scaleLength - 1))]);
}

function calculateIntervalsFromPitches(pitches) {
    let intervals = [];
    for (let i = 0; i < pitches.length - 1; i++) {
        intervals.push(pitches[i + 1] - pitches[i]);
    }
    return intervals;
}