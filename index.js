// Create AudioContext
let WAContext = window.AudioContext || window.webkitAudioContext;
let context = new WAContext();

// Tone.js Audio Context
let device;
let isPlaying = false;

let currentMidiPitches1 = []; // Global variable for first oscillator notes
let currentMidiPitches2 = []; // Global variable for second oscillator notes

// Initialize Tone.js objects
let fm1, fm2, gain1, gain2;
let intervalId;
let timeBetweenNotes = 500; // Time between notes in milliseconds
let i = 0;
Tone.context.latencyHint = "playback"; // Prioritize smooth audio

const sound1 = {
    harmonicity: 3,
    modulationIndex: 15,
    oscillator: { type: "sine" },
    modulation: { type: "sine" },
    envelope: { attack: 0.2, decay: 5.0, sustain: 1, release: 4.0 },
    modulationEnvelope: { attack: 1.5, decay: 2.5, sustain: 0.6, release: 3.5 },
    oscillator: { partialCount: 2, partials: [1, 1], phase: 0, type: "sine2" }
};

// Setup Oscillators and Gain Nodes
function setup() {
    fm1 = new Tone.FMSynth(sound1);

    fm2 = new Tone.FMSynth(sound1);

    // Gain nodes for volume control
    gain1 = new Tone.Volume(-10).toDestination();
    gain2 = new Tone.Volume(-10).toDestination();

    fm1.connect(gain1);
    fm2.connect(gain2);
}

// Play notes using Tone.js
async function playNotes(midiPitches1, midiPitches2) {
    currentMidiPitches1 = midiPitches1;
    currentMidiPitches2 = midiPitches2;

    await Tone.start(); // Ensure Tone.js is ready to play audio

    if (!fm1 || !fm2) {
        setup(); // Initialize the synths if not already done
    }

    i = 0; // Reset index
    isPlaying = true;

    Tone.Transport.cancel(0); // Clear previous scheduled events

    // Schedule playback
    Tone.Transport.scheduleRepeat((time) => {
        if (!isPlaying) {
            Tone.Transport.stop();
            return;
        }

        const currentIndex1 = i % currentMidiPitches1.length;
        const currentIndex2 = i % currentMidiPitches2.length;

        const freq1 = midiToFreq(currentMidiPitches1[currentIndex1]);
        const freq2 = midiToFreq(currentMidiPitches2[currentIndex2]);

        // Play notes with specified duration
        fm1.triggerAttackRelease(freq1, "8n", time); // 8th note duration
        fm2.triggerAttackRelease(freq2, "8n", time);

        i++;
    }, timeBetweenNotes / 1000); // Use the time interval for scheduling

    // Start playback
    Tone.Transport.start();
}


// Stop oscillators
function stopOscillators() {
    isPlaying = false;

    // Fade out the volume
    gain1.volume.rampTo(-Infinity, 0.1);
    gain2.volume.rampTo(-Infinity, 0.1);

    setTimeout(() => {
        if (fm1) {
            fm1.dispose();
            fm1 = null;
        }
        if (fm2) {
            fm2.dispose();
            fm2 = null;
        }
        Tone.Transport.stop();
        Tone.Transport.cancel(0); // Cancel all scheduled events
    }, 100);
}

// Helper function to convert MIDI note to frequency
function midiToFreq(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Event listener for play button
document.getElementById("play").onclick = function () {
    if (!fm1 || !fm2) {
        setup(); // Initialize oscillators if not already done
    }

    const midiPitchesArr = [];

    for (let m of soundModules) {
        // Extract selected sensor, reading, and other settings
        const sensor = m.querySelector('.sensors').value;
        const reading = m.querySelector('.readings').value;

        const readingData = retrievedData
            .filter(d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading))
            .map(d => d[sensor][reading])
            .reverse();

        const normalizedData = normalizeData(readingData);

        const tessitura = m.querySelector(".tessitura").value;
        const tonic = m.querySelector(".tonic").value;
        const scaleName = m.querySelector(".scale").value;
        const scale = createScaleArray(tonic, scaleName, tessitura);
        const midiPitches = dataToMidiPitches(normalizedData, scale);

        midiPitchesArr.push(midiPitches);
    }

    isPlaying = false;

    setTimeout(() => {
        if (intervalId) {
            clearInterval(intervalId);
        }
        isPlaying = true;
        playNotes(midiPitchesArr[0], midiPitchesArr[1]);
    }, 700);
};

// Event listener for stop button
document.getElementById("stop").addEventListener("click", stopOscillators);

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
    for (let m of document.getElementsByClassName('soundModule')) {
        soundModules.push(m);
    }
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
            setup();
        })
        .catch(error => console.error('Error:', error));
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

document.getElementById("retrieve").onclick = function() {
    for (let m of soundModules) {
        // Clear the sensors select element
        let sensorsSelect = m.querySelector(".sensors");
        while (sensorsSelect.options.length > 1) {
            sensorsSelect.removeChild(sensorsSelect.lastChild);
        }
    
        // Clear the readings select element
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

    // Check which packet option is selected
    let packetOption = document.querySelector('input[name="packetOption"]:checked').value;

    let url;

    let prescaler = document.getElementById('prescaler').value;

    // If "lastXPackets" is selected, use x as the number of packets to retrieve
    if (packetOption === "lastXPackets") {
        if (x === "" || isNaN(x)) {
            alert("Number of packets must be an integer number");
            return;
        }

        url = `/data/?database=${db}&collection=${collection}&x=${x}&prescaler=${prescaler}`;
    }
    // If "timeRange" is selected, use startTime and endTime to retrieve packets
    else if (packetOption === "timeRange") {
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
                // Get the select element
                let select = m.querySelector(".sensors");

                // Remove any existing options
                while (select.firstChild) {
                    select.removeChild(select.firstChild);
                }

                // If data is not empty
                if (data.length > 0) {
                    // Get the keys of the first object in the data array
                    let keys = Object.keys(data[0]);

                    // Add each key as an option to the select element
                    keys.forEach(key => {
                        if (key === "_id" || key === "Timestamp") return;
                        let option = document.createElement("option");
                        option.value = key;
                        option.text = key;
                        select.appendChild(option);
                    });

                    setReadings(soundModules.indexOf(m));
                }
                else {
                    alert("No data found");
                    return;
                }
            }
        })
        .catch(error => console.error('Error:', error));
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

document.querySelectorAll('.readings').forEach(function(element) {
    element.addEventListener('change', function(event) {
        // Find the closest ancestor with the class "soundModule"
        let soundModule = event.target.closest('.soundModule');
        let moduleIdx = soundModules.indexOf(soundModule);
        console.log(moduleIdx);
        plot(moduleIdx);
    });
});

document.querySelectorAll('.sensors').forEach(function(element) {
    element.addEventListener('change', function(event) {
        // Find the closest ancestor with the class "soundModule"
        let soundModule = event.target.closest('.soundModule');
        let moduleIdx = soundModules.indexOf(soundModule);
        console.log(moduleIdx);
        setReadings(moduleIdx);
    });
});

// Update the notes when the user changes any setting in the sound module
document.querySelectorAll('.sensors, .readings, .tessitura, .tonic, .scale').forEach(element => {
    element.addEventListener('change', (event) => {
        // Find the parent soundModule for this element
        const soundModule = event.target.closest('.soundModule');
        const moduleIdx = soundModules.indexOf(soundModule);

        if (moduleIdx !== -1) {
            // Update MIDI pitches for this module
            updateSoundModule(moduleIdx);
        }
    });
});

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
    const updatedMidiPitches = dataToMidiPitches(normalizedData, scale);

    // Assign the updated pitches to the correct oscillator
    if (moduleIdx === 0) {
        currentMidiPitches1 = updatedMidiPitches;
    } else if (moduleIdx === 1) {
        currentMidiPitches2 = updatedMidiPitches;
    }

    // Optional: Log for debugging
    console.log(`Updated pitches for module ${moduleIdx}:`, updatedMidiPitches);
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

document.querySelectorAll('.collapse-btn').forEach(button => {
    button.addEventListener('click', () => {
        const moduleBottomOptions = button.nextElementSibling;
        const isVisible = moduleBottomOptions.style.display === 'block';
        
        moduleBottomOptions.style.display = isVisible ? 'none' : 'block';
        button.textContent = isVisible ? '▼' : '▲'; // Toggle button icon
    });
});

// Event listener for volume sliders
document.querySelectorAll('.volume').forEach((volumeSlider, index) => {
    volumeSlider.addEventListener('input', (event) => {
        const volumeValue = parseFloat(event.target.value); // Get volume in dB

        if (index === 0 && gain1) {
            gain1.volume.value = volumeValue; // Adjust volume for osc1
        } else if (index === 1 && gain2) {
            gain2.volume.value = volumeValue; // Adjust volume for osc2
        }
        console.log(`Volume for module ${index + 1} set to ${volumeValue} dB`);
    });
});