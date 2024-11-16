// Create AudioContext
let WAContext = window.AudioContext || window.webkitAudioContext;
let context = new WAContext();
let device;

let isPlaying = false;

// Upon clicking calculate button, schedule events
document.getElementById("play").onclick = function() {
    if (context.state === "suspended") {
        context.resume();
    }

    var midiPitchesArr = [];

    for (let m of soundModules) {
        // Get the selected sensor and reading
        let sensor = m.querySelector('.sensors').value;
        let reading = m.querySelector('.readings').value;

        let readingData = retrievedData
        .filter(d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading))
        .map(d => d[sensor][reading]);

        readingData = readingData.reverse();

        console.log("Reading data:", readingData);
        // Normalize readingData
        let normalizedData = normalizeData(readingData);

        console.log("Normalized data:", normalizedData);

        let tessitura = m.querySelector(".tessitura").value;
        let tonic = m.querySelector(".tonic").value;
        let scaleName = m.querySelector(".scale").value;
        let scale = createScaleArray(tonic, scaleName, tessitura);
        let midiPitches = dataToMidiPitches(normalizedData, scale);
        
        console.log("Midi pitches: ", midiPitches);

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

let osc1, osc2;
let intervalId;
let i = 0;
let timeBetweenNotes = 500; // Time between notes in milliseconds

function setup() {
    // Initialize the two oscillators
    osc1 = new p5.Oscillator('sine');
    osc1.amp(0); // Start muted

    osc2 = new p5.Oscillator('sine');
    osc2.amp(0); // Start muted
}

// This remains the main entry point
async function playNotes(midiPitches1, midiPitches2) {
    osc1.start();
    osc2.start();

    isPlaying = true;
    
    // Enter a loop that continues while isPlaying is true
    while (isPlaying) {
        // Convert MIDI to frequency for the current note in the sequence
        let freq1 = midiToFreq(midiPitches1[i]);
        let freq2 = midiToFreq(midiPitches2[i]);

        // Set frequencies and start oscillators
        osc1.freq(freq1);
        osc1.amp(0.5, 0.05); // Fade in slightly

        osc2.freq(freq2);
        osc2.amp(0.5, 0.05); // Fade in slightly

        // Advance to the next note
        i = (i + 1) % Math.min(midiPitches1.length, midiPitches2.length);

        // Wait for the current interval duration before the next note
        await new Promise(resolve => setTimeout(resolve, timeBetweenNotes));
    }
}

// Helper function to stop the loop
function stopOscillators() {
    isPlaying = false; // Set the flag to false to stop the loop
    osc1.amp(0, 0.5); // Fade out
    osc2.amp(0, 0.5);
}

// Helper function to convert MIDI note to frequency
function midiToFreq(midiNote) {
    return 440 * Math.pow(2, (midiNote - 69) / 12);
}

document.getElementById("stop").addEventListener("click", function() {
    stopOscillators()
});

document.getElementById("bpm").addEventListener("change", function() {
    timeBetweenNotes = 60000 / document.getElementById("bpm").value;
    document.getElementById("bpmText").innerText = document.getElementById("bpm").value;
});

var retrievedData;
var data2;

var soundModules = [];

document.addEventListener('DOMContentLoaded', (event) => {
    for (let m of document.getElementsByClassName('soundModule')) {
        soundModules.push(m);
    }
    fetch('/databases')
        .then(response => response.json())
        .then(data => {
            const select = document.getElementById('databases');
            select.innerHTML = '';

            // Append the database names to the "devices" select element as options
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
                console.log(m);
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
        let moduleIdx = soundModules.indexOf(event.target.parentNode);
        console.log(moduleIdx);
        plot(moduleIdx);
    });
});

document.querySelectorAll('.sensors').forEach(function(element) {
    element.addEventListener('change', function(event) {
        let moduleIdx = soundModules.indexOf(event.target.parentNode);
        console.log(moduleIdx);
        setReadings(moduleIdx);
    });
});

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
    let midiMin, midiMax = 0;

    switch (tessitura.toLowerCase()) {
        case "bass":
            midiMin = 40; // E2
            midiMax = 64; // E4
            break;
        case "baritone":
            midiMin = 45; // A2
            midiMax = 69; // A4
            break;
        case "tenor":
            midiMin = 48; // C3
            midiMax = 72; // C5
            break;
        case "alto":
            midiMin = 53; // F3
            midiMax = 77; // F5
            break;
        case "mezzo-soprano":
            midiMin = 57; // A3
            midiMax = 81; // A5
            break;
        case "soprano":
            midiMin = 60; // C4
            midiMax = 84; // C6
            break;
        default:
            alert("Please select a tessitura");
            return;
    }

    let intervals = getScaleIntervals(scaleName);
    let midiNumber = getMidiNumber(tonic);
    let scale = [];
    let currentNote = midiNumber;
    // Create an array for 8 octaves of the scale
    while (currentNote <= midiMax) {
        for (let i = 0; i < intervals.length; i++) {
            currentNote += intervals[i];
            // If we don't want to add the first note of the 6th octave
            /* if (!(octave === 4 && i === intervals.length - 1)) {
                scale.push(currentNote);
            } */

            if (currentNote < midiMin || currentNote > midiMax)
                continue;

            scale.push(currentNote);
        }
    }

    return scale;
}

// Normalize data
function normalizeData(data) {
    const minVal = Math.min(...data);
    const maxVal = Math.max(...data);
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

// Example usage:
/*const data = [100, 200, 300, 400]; // Example data points
const tonic = 'D#'; // Tonic in the 2nd octave
const scaleName = 'Blues'; // Scale name
const phrygianScale = createScaleArray(tonic, scaleName);
const normalizedData = normalizeData(data);
const midiPitches = dataToMidiPitches(normalizedData, phrygianScale);

console.log(phrygianScale);
console.log(midiPitches);*/