// Create AudioContext
let WAContext = window.AudioContext || window.webkitAudioContext;
let context = new WAContext();

// Tone.js Audio Context
let device;
let isPlaying = false;

// Playback globals
let bpm = 125;
let speedMult = 1;

// Initialize Tone.js objects
let fmSynths = []; // Array of FM synths
let gainNodes = []; // Array of gain nodes

midiPitchesArray = []; // Array to hold MIDI pitches for each sound module

let intervalId;
let timeBetweenNotes = 500; // Time between notes in milliseconds
let i = 0;
Tone.context.latencyHint = "playback"; // Prioritize smooth audio


/***** Predefined sound settings *****/

const sound1 = 
{
    volume: 8,
    harmonicity: 3,
    oscillator: {
      type: "triangle",
      phase: 35
    },
    envelope: {
      attack: 0.2,
      decay: 0.5,
      sustain: 0.8,
      release: 1.5
    },
    modulation: {
      type: "sine",
      phase: 0
    },
    modulationEnvelope: {
      attack: 0.2,
      decay: 0.01,
      sustain: 1,
      release: 0.5
    },
    modulationIndex: 2
  };

const sound2 = 
{
	"volume": 4,
	"detune": 0,
	"portamento": 0,
	"harmonicity": 4,
	"oscillator": {
		"partialCount": 0,
		"partials": [],
		"phase": 0,
		"type": "sine"
	},
	"envelope": {
		"attack": 0.005,
		"attackCurve": "linear",
		"decay": 0.4,
		"decayCurve": "exponential",
		"release": 0.5,
		"releaseCurve": "exponential",
		"sustain": 1
	},
	"modulation": {
		"partialCount": 0,
		"partials": [],
		"phase": 0,
		"type": "triangle"
	},
	"modulationEnvelope": {
		"attack": 0.2,
		"attackCurve": "linear",
		"decay": 0.01,
		"decayCurve": "exponential",
		"release": 0.5,
		"releaseCurve": "exponential",
		"sustain": 1
	},
	"modulationIndex": 10.22
};

// Tom drum sound
const sound3 = {
    harmonicity: 1,
    modulationIndex: 0,
    volume: 8,
    oscillator: {
        type: "sine",
    },
    modulation: {
        type: "sine",
    },
    envelope: {
        attack: 0.005,
        decay: 0.5,
        sustain: 0.5,
        release: 1.5,
    },
    modulationEnvelope: {
        attack: 0.005,
        decay: 0.4,
        sustain: 0.3,
        release: 1.2,
    },
    volume: 5, // Increase the volume in decibels
};

sound4 =
{
	"volume": 6,
	"detune": 0,
	"portamento": 0,
	"harmonicity": 1,
	"oscillator": {
		"partialCount": 0,
		"partials": [],
		"phase": 0,
		"type": "sine"
	},
	"envelope": {
		"attack": 0.005,
		"attackCurve": "linear",
		"decay": 0.4,
		"decayCurve": "exponential",
		"release": 1.5,
		"releaseCurve": "exponential",
		"sustain": 1
	},
	"modulation": {
		"partialCount": 0,
		"partials": [],
		"phase": 0,
		"type": "triangle"
	},
	"modulationEnvelope": {
		"attack": 0.2,
		"attackCurve": "linear",
		"decay": 0.01,
		"decayCurve": "exponential",
		"release": 0.5,
		"releaseCurve": "exponential",
		"sustain": 1
	},
	"modulationIndex": 8
}

// HTML template for a sound module
function createSoundModuleTemplate(moduleId) {
    return `
        <div class="soundModule" id="module${moduleId}">
            <div class="moduleTopOptions">
                <div class="volumeContainer">
                    <label for="volume">Volume:</label>
                    <input type="range" class="volume" min="-60" max="0" value="-10">
                </div>
                <button class="removeModule" data-module-id="${moduleId}"></button>
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

                    <label for="soundTypes">Sound Type:</label>
                    <select class="soundTypes">
                        <option value="sound1">Sound 1</option>
                        <option value="sound2">Woodwind</option>
                        <option value="sound3">Tom Drum</option>
                        <option value="sound4">Sound 4</option>
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

    if (isPlaying) {
        updateSoundModule(moduleId);
    }
}

document.getElementById("addModule").onclick = addSoundModule;

// Event listener for the "Add Module" button

/******* Listners for sound modules ********/

function attachListenersToSoundModule(soundModule) {
    attachVolumeListener(soundModule);
    attachSensorListener(soundModule);
    attachReadingListener(soundModule);
    attachCollapseListener(soundModule);
    attachNoteOptionListeners(soundModule);
    attachSoundTypeListener(soundModule);
    attachRemoveListener(soundModule);
}

function attachRemoveListener(soundModule) {
    const removeBtn = soundModule.querySelector(".removeModule");
    removeBtn.addEventListener("click", () => {
        const moduleId = parseInt(removeBtn.dataset.moduleId);

        // Remove the corresponding synth and gain node
        if (fmSynths[moduleId]) {
            fmSynths[moduleId].dispose();
            fmSynths.splice(moduleId, 1);
        }
        if (gainNodes[moduleId]) {
            gainNodes[moduleId].dispose();
            gainNodes.splice(moduleId, 1);
        }

        // Remove the corresponding midi pitches
        if (midiPitchesArray[moduleId]) {
            midiPitchesArray.splice(moduleId, 1);
        }

        // Remove the module from the array
        soundModules.splice(moduleId, 1);

        // Remove the module from the DOM
        soundModule.remove();

        // Update the IDs and data-module-id attributes of the remaining modules
        soundModules.forEach((module, index) => {
            module.id = `module${index}`;
            const removeBtn = module.querySelector(".removeModule");
            removeBtn.dataset.moduleId = index;
        });

        console.log(`Removed module ${moduleId}`);
    });
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

function attachSoundTypeListener(soundModule) {
    const soundTypeSelect = soundModule.querySelector(".soundTypes");
    soundTypeSelect.addEventListener("change", (event) => {
        const selectedSoundType = event.target.value;
        const moduleId = soundModules.indexOf(soundModule);
        switch (selectedSoundType) {
            case "sound1":
                fmSynths[moduleId].set(sound1);
                break;
            case "sound2":
                fmSynths[moduleId].set(sound2);
                break;
            case "sound3":
                fmSynths[moduleId].set(sound3);
                break;
            case "sound4":
                fmSynths[moduleId].set(sound4);
                break;
            case "sound5":
                fmSynths[moduleId].set(sound5);
                break;
            default:
                console.log("Default sound type selected");
        }
        console.log(`Sound type for ${soundModule.id} set to ${selectedSoundType}`);
    });
}

function attachNoteOptionListeners(soundModule) {
    // Attach listeners to all relevant elements within the soundModule
    const elements = soundModule.querySelectorAll('.sensors, .readings, .tessitura, .tonic, .scale');
    elements.forEach((element) => {
        element.addEventListener('change', (event) => {
            const moduleIdx = soundModules.indexOf(soundModule);

            if (moduleIdx !== -1) {
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
    // Create a PolySynth with FMSynth voices, explicitly applying the `sound1` configuration
    const polySynth = new Tone.PolySynth(Tone.FMSynth, {
        maxPolyphony: 16, // Maximum simultaneous voices
    }).set(sound1); // Apply the `sound1` settings to all voices

    // Create a gain node for volume control
    const gainNode = new Tone.Volume(-10).toDestination();

    // Connect the polyphonic synth to the gain node
    polySynth.connect(gainNode);

    // Store the polyphonic synth and gain node in arrays
    fmSynths[moduleId] = polySynth;
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

function updatePlaybackBar(moduleIndex, position) {
    const module = soundModules[moduleIndex]; // Get the module from the array
    if (!module) {
        console.error(`Module at index ${moduleIndex} not found.`);
        return;
    }

    const plotDiv = module.querySelector('.plot'); // Access the plot within the module
    if (!plotDiv) {
        console.error(`Plot not found in module at index ${moduleIndex}.`);
        return;
    }

    Plotly.relayout(plotDiv, {
        shapes: [
            {
                type: 'line',
                x0: position, // Position of the playback bar
                x1: position,
                y0: 0,
                y1: 1, // Full height of the graph
                xref: 'x',
                yref: 'paper', // Use `paper` to span the full height
                line: {
                    color: 'red', // Bar color
                    width: 2, // Bar width
                },
            },
        ],
    });
}

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

    updateTimeBetween();

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

            console.log("Updating playback bar for module index " + moduleId);

            // Update the playback bar position
            updatePlaybackBar(moduleId, currentIndex);
            
            // Only play note if it is not the same as the previous one
            if (currentIndex == 0 || newNote !== midiPitches[currentIndex - 1]) {
                const freq = midiToFreq(midiPitches[currentIndex]);

                // Play note with specified duration
                synth.triggerAttackRelease(freq, timeBetweenNotes / 1000, time); // 8th note duration   
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
    }, 50);
}

// Event listener for stop button
document.getElementById("stop").addEventListener("click", stopSynths);

function updateTimeBetween()
{
    timeBetweenNotes = 60000 / bpm / speedMult;
    Tone.Transport.bpm.value = bpm * speedMult;
}

// Adjust tempo
document.getElementById("bpm").addEventListener("change", function () {
    document.getElementById("bpmText").innerText = document.getElementById("bpm").value;
    bpm = document.getElementById("bpm").value;
    updateTimeBetween();
});

// Function to handle speed change
function handleSpeedChange(event) {
    if (event.target.name === "speed") {
        const selectedSpeed = event.target.value;
        console.log(`Speed changed to: ${selectedSpeed}`);
        speedMult = parseInt(selectedSpeed);
        updateTimeBetween();
    }
}

// Attach a single event listener to the speedOptions container
document.getElementById("speedOptions").addEventListener("change", handleSpeedChange);

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
    // Stop audio playback
    stopSynths();

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

            // If data is empty, show an alert and return
            if (data.length === 0) {
                alert("No data available for the selected time range.");
                return;
            }

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
        .map(d => d[sensor][reading]);

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
        let filteredData = retrievedData
            .filter(d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading));

        console.log(filteredData);

        // Ensure there is valid data
        if (filteredData.length > 0) {
            // Generate an evenly spaced index for each packet
            let xData = filteredData.map((_, index) => index); // Keep consistent spacing
            let yData = filteredData.map(d => d[sensor][reading]);

            // Convert timestamps to short readable format (MM/DD HH:mm:ss)
            let xLabels = filteredData.map(d => new Date(d.Timestamp.time_utc).toLocaleString("en-US", { 
                month: "2-digit", 
                day: "2-digit", 
                hour: "2-digit", 
                minute: "2-digit", 
                second: "2-digit"
            }));

            // Create hover text for all points (show exact timestamp on hover)
            let hoverTexts = filteredData.map((d, i) => 
                `Date: ${xLabels[i]}<br>Value: ${yData[i]}`
            );

            // Reduce the number of x-axis labels for readability
            let tickStep = Math.max(1, Math.floor(xData.length / 6));
            let tickVals = xData.filter((_, i) => i % tickStep === 0);
            let tickText = xLabels.filter((_, i) => i % tickStep === 0);

            // Create the data array for the plot
            let plotData = [{
                x: xData,
                y: yData,
                type: 'scatter',
                mode: 'lines',
                line: { width: 2, color: 'blue' },
                text: hoverTexts, // Hover text with actual date and value
                hoverinfo: 'text'
            }];

            // Create the layout object for the plot
            let layout = {
                title: `${sensor} - ${reading}`,
                xaxis: {
                    title: '',
                    tickmode: 'array',
                    tickvals: tickVals,
                    ticktext: tickText, // Show actual timestamps at selected spots
                    tickangle: -25, // Rotate for readability
                    showgrid: true
                },
                yaxis: {
                    title: `${reading} Value`,
                    showgrid: true
                },
                autosize: true
            };

            // Plot the data using Plotly
            Plotly.newPlot(m.querySelector('.plot'), plotData, layout);
        }
    }
}


// Function to get MIDI number for a tonic note in the 2nd octave (MIDI numbers for C2 is 36)
function getMidiNumber(tonic) {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const baseMidi = 24; // MIDI number for C2 using the "General MIDI" standard, where C4 is MIDI 60
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
    console.log(data);
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