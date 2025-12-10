/**** Global variables ****/

// Playback boolean
let isPlaying = false;

// Playback globals
let bpm = 125;
let speedMult = 1;

// Initialize Tone.js objects
let synths = []; // Array of FM synths
let gainNodes = []; // Array of gain nodes

// Import synths and samplers
import { samplers, fmSynths } from './instruments.js';

// HTML template for a sound module
import { createSoundModuleTemplate } from './soundModule.js';

// Menu items for the instruments
let instrumentsMenuItems = [];

// For assigning unique soundModule IDs
let moduleCounter = 0;

// Device and reading selections
let savedSensors = {};
let savedReadings = {};

// Array to hold MIDI pitches for each sound module
let midiPitchesArray = [];

// Array to hold sound modules
var soundModules = [];

// Sustain notes for each sound module
let sustainNotes = [];

// Time between notes in milliseconds
let timeBetweenNotes = 500;

// Hold the most recently retrieved data
var retrievedData;

// Array to hold x-axis data for each plot
let plotXData = [];

// Function to initialize a sound module
async function addSoundModule() {
  console.log('Adding a new sound module...');

  const moduleId = soundModules.length; // Determine the next module ID
  const modulesContainer = document.getElementById('modulesContainer');

  // Use the template function to generate the new module's HTML
  const newModuleHTML = createSoundModuleTemplate(moduleId);

  // Append the new module to the container
  modulesContainer.insertAdjacentHTML('beforeend', newModuleHTML);

  // Get the newly created module element
  const newModule = modulesContainer.lastElementChild;
  newModule.id = `module${moduleCounter++}`;

  // Populate the sound types dropdown
  const soundTypesSelect = newModule.querySelector('.soundTypes');
  soundTypesSelect.innerHTML = instrumentsMenuItems.join('');
  soundTypesSelect.value = 'retro'; // Set default value

  // Set default sustain notes for the new module
  sustainNotes[moduleId] = true; // Default to true

  // Add the module to the soundModules array
  // Make sure the new module isn't a null object
  if (newModule === null) {
    console.error('New module is null. Cannot add to soundModules array.');
    return;
  }
  soundModules.push(newModule);

  // Attach event listeners to the new module
  attachListenersToSoundModule(newModule);

  // Initialize the sound module with default values
  initializeModuleSelects(newModule, retrievedData);

  if (retrievedData) {
    updateSoundModule(moduleId);
  }

  if (isPlaying) {
    setupSynth(moduleId); // Create a new FM synth
  }
}

document.getElementById('addModule').onclick = addSoundModule;

// Event listener for the "Add Module" button

/******* Listners for sound module UI interactions ********/

function attachListenersToSoundModule(soundModule) {
  attachSustainNotesListener(soundModule);
  attachVolumeListener(soundModule);
  attachSensorListener(soundModule);
  attachReadingListener(soundModule);
  attachCollapseListener(soundModule);
  attachNoteOptionListeners(soundModule);
  attachSoundTypeListener(soundModule);
  attachRemoveListener(soundModule);
}

function attachSustainNotesListener(soundModule) {
  const sustainNotesCheckbox = soundModule.querySelector('.sustainNotes');
  sustainNotesCheckbox.addEventListener('change', () => {
    const moduleId = soundModules.indexOf(soundModule);
    // Print out module ID
    console.log('Module ID: ' + moduleId);
    sustainNotes[moduleId] = sustainNotesCheckbox.checked;
  });
}

function attachRemoveListener(soundModule) {
  const removeBtn = soundModule.querySelector('.removeModule');
  removeBtn.addEventListener('click', () => {
    // Ask for confirmation before deleting
    const isConfirmed = confirm('Are you sure you want to remove this sound track?');
    if (!isConfirmed) return; // Stop if user clicks "Cancel"

    const moduleId = parseInt(removeBtn.dataset.moduleId);

    // Remove the corresponding midi pitches
    if (midiPitchesArray[moduleId]) {
      midiPitchesArray.splice(moduleId, 1);
    }

    if (sustainNotes[moduleId] !== undefined) {
      sustainNotes.splice(moduleId, 1);
    }

    // Remove the module from the array
    soundModules.splice(moduleId, 1);

    // Remove the module from the DOM
    soundModule.remove();

    // Update the IDs and data-module-id attributes of the remaining modules
    soundModules.forEach((module, index) => {
      module.id = `module${index}`;
      const removeBtn = module.querySelector('.removeModule');
      removeBtn.dataset.moduleId = index;
    });

    console.log(`Removed module ${moduleId}`);
  });
}

function attachVolumeListener(soundModule) {
  const volumeSlider = soundModule.querySelector('.volume');
  volumeSlider.addEventListener('input', event => {
    const volumeValue = parseFloat(event.target.value);
    gainNodes[soundModules.indexOf(soundModule)].volume.value = volumeValue;
    console.log(`Volume for ${soundModule.id} set to ${volumeValue} dB`);
  });
}

function attachSensorListener(soundModule) {
  const sensorSelect = soundModule.querySelector('.sensors');
  sensorSelect.addEventListener('change', event => {
    const selectedSensor = event.target.value;
    setReadings(soundModules.indexOf(soundModule));
    console.log(`Sensor for ${soundModule.id} set to ${selectedSensor}`);
  });
}

function attachReadingListener(soundModule) {
  const readingSelect = soundModule.querySelector('.readings');
  readingSelect.addEventListener('change', event => {
    const selectedReading = event.target.value;
    plot(soundModules.indexOf(soundModule));
    console.log(`Reading for ${soundModule.id} set to ${selectedReading}`);
  });
}

function attachCollapseListener(soundModule) {
  const collapseBtn = soundModule.querySelector('.collapse-btn');
  collapseBtn.addEventListener('click', () => {
    const options = soundModule.querySelector('.moduleBottomOptions');
    const isVisible = options.style.display === 'block';
    options.style.display = isVisible ? 'none' : 'block';
    collapseBtn.textContent = isVisible ? '▼' : '▲';

    setTimeout(() => {
      const plotDiv = soundModule.querySelector('.plot');
      if (plotDiv && plotDiv.data) {
        Plotly.Plots.resize(plotDiv);
      }
    }, 0);
  });
}

function attachSoundTypeListener(soundModule) {
  const soundTypeSelect = soundModule.querySelector('.soundTypes');
  soundTypeSelect.addEventListener('change', event => {
    // Release all notes before changing the synth type
    synths[soundModules.indexOf(soundModule)].releaseAll();

    const selectedSoundType = event.target.value;
    const moduleId = soundModules.indexOf(soundModule);

    console.log('Selected sound type: ' + selectedSoundType);
    console.log('Number of synths: ' + synths.length);

    // Dispose of the previous synth/sampler if it exists
    if (synths[moduleId]) {
      synths[moduleId].dispose();
    }

    // If selected sound is in instruments, set the synth to a sampler
    if (selectedSoundType in samplers) {
      const samplerInfo = samplers[selectedSoundType];
      synths[moduleId] = new Tone.Sampler({
        urls: samplerInfo.urls,
        baseUrl: samplerInfo.baseUrl,
      });
      attachGainNode(synths[moduleId], moduleId);
    } else {
      setupSynth(moduleId); // Create a new FM synth
      synths[moduleId].set(fmSynths[selectedSoundType]);
    }
  });
}

function attachNoteOptionListeners(soundModule) {
  // Attach listeners to all relevant elements within the soundModule
  const elements = soundModule.querySelectorAll('.sensors, .readings, .tessitura, .tonic, .scale');
  elements.forEach(element => {
    element.addEventListener('change', event => {
      const moduleIdx = soundModules.indexOf(soundModule);

      if (moduleIdx !== -1) {
        // Call the update function with the correct module index
        updateSoundModule(moduleIdx);
      } else {
        console.error('Sound module not found for the given element.');
      }
    });
  });
}

// Setup Oscillators and Gain Nodes
function setupSynth(moduleId) {
  // Create a PolySynth with FMSynth voices
  const polySynth = new Tone.PolySynth(Tone.FMSynth, {
    maxPolyphony: 32, // Maximum simultaneous voices
  });

  polySynth.set(fmSynths['retro']); // Set default synth settings

  // Store the polyphonic synth and gain node in arrays
  synths[moduleId] = polySynth;

  attachGainNode(polySynth, moduleId); // Attach gain node to the synth
}

function attachGainNode(synth, moduleId) {
  // Get the volume slider value
  const volume = soundModules[moduleId].querySelector('.volume').value;
  const gainNode = new Tone.Volume(volume).toDestination();
  synth.connect(gainNode);
  gainNodes[moduleId] = gainNode;
}

// Helper function to convert MIDI note to frequency
function midiToFreq(midiNote) {
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

// Event listener for play button
document.getElementById('play').onclick = function () {
  if (soundModules.length === 0) {
    console.error('No sound modules initialized.');
    return;
  }

  for (let m of soundModules) {
    updateSoundModule(soundModules.indexOf(m));
  }

  playNotes();
};

// Function to update the playback bar on the plot
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

  // Get the stored x-axis timestamp data
  const xData = plotXData[moduleIndex];
  if (!xData || xData.length === 0) {
    console.error(`No x data found for module ${moduleIndex}`);
    return;
  }

  // Use the actual timestamp value at this position
  const xPosition = xData[position % xData.length];

  Plotly.relayout(plotDiv, {
    shapes: [
      {
        type: 'line',
        x0: xPosition, // Position of the playback bar
        x1: xPosition,
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
  console.log('Playing notes...');

  await Tone.start(); // Ensure Tone.js is ready to play audio

  // Clear previous synths and gain nodes
  synths.forEach(synth => {
    if (synth) {
      synth.dispose(); // Dispose of the previous synth
    }
  });
  gainNodes.forEach(gainNode => {
    if (gainNode) {
      gainNode.dispose(); // Dispose of the previous gain node
    }
  });

  // Reset arrays
  synths = [];
  gainNodes = [];

  // Create a synth for each sound module
  soundModules.forEach((module, index) => {
    const soundType = module.querySelector('.soundTypes').value;

    let synth;
    if (samplers[soundType]) {
      const samplerInfo = samplers[soundType];
      synth = new Tone.Sampler({
        urls: samplerInfo.urls,
        baseUrl: samplerInfo.baseUrl,
      });
    } else {
      synth = new Tone.PolySynth(Tone.FMSynth, {
        maxPolyphony: 32,
      });
      synth.set(fmSynths[soundType] || fmSynths['retro']);
    }

    attachGainNode(synth, index); // Attach gain node to the synth

    synths[index] = synth;
  });

  if (synths.length === 0 || gainNodes.length === 0) {
    console.error('Synths or gain nodes not initialized.');
    return;
  }

  gainNodes.forEach(gainNode => {
    // Set the volume for each gain node according to the slider value
    gainNode.volume.value =
      soundModules[gainNodes.indexOf(gainNode)].querySelector('.volume').value;
  });

  let i = 0; // Reset index
  isPlaying = true;

  Tone.Transport.cancel(0); // Clear previous scheduled events

  updateTimeBetween();

  let lastPlayedNote = new Array(synths.length).fill(null); // Track last played notes

  // Schedule playback for each synth
  Tone.Transport.scheduleRepeat(time => {
    if (!isPlaying) {
      Tone.Transport.stop();
      return;
    }

    synths.forEach((synth, moduleId) => {
      const midiPitches = midiPitchesArray[moduleId];
      if (!midiPitches || midiPitches.length === 0) return;

      const currentIndex = i % midiPitches.length;
      const currentNote = midiPitches[currentIndex];

      let sustainDuration = timeBetweenNotes / 1000;

      if (sustainNotes[moduleId]) {
        let sustainFactor = 1;
        let lookaheadIndex = (currentIndex + 1) % midiPitches.length;

        while (midiPitches[lookaheadIndex] === currentNote && lookaheadIndex !== currentIndex) {
          sustainFactor++;
          lookaheadIndex = (lookaheadIndex + 1) % midiPitches.length;
          if (lookaheadIndex === currentIndex) break;
        }

        sustainDuration *= sustainFactor;
      }

      // Play only if it's a new note (not a duplicate)
      if (currentNote !== lastPlayedNote[moduleId]) {
        const freq = midiToFreq(currentNote);
        synth.triggerAttackRelease(freq, sustainDuration, time);
        lastPlayedNote[moduleId] = currentNote;
      }
    });

    // Update playback bar once per tick
    soundModules.forEach((_, moduleId) => {
      const len = midiPitchesArray[moduleId]?.length || 1;
      updatePlaybackBar(moduleId, i % len);
    });

    i++;
  }, timeBetweenNotes / 1000);
  // Use the time interval for scheduling

  // // === Visual Loop ===
  // let barStep = 0;
  // Tone.Transport.scheduleRepeat((time) => {
  //     Tone.Draw.schedule(() => {
  //         soundModules.forEach((_, moduleId) => {
  //             const len = midiPitchesArray[moduleId]?.length || 1;
  //             updatePlaybackBar(moduleId, barStep % len);
  //         });
  //         barStep++;
  //     }, time);
  // }, timeBetweenNotes / 1000);

  // Start playback
  Tone.Transport.start();
}

// Stop oscillators
function stopSynths() {
  isPlaying = false;

  gainNodes.forEach(gainNode => {
    // Fade out the volume
    gainNode.volume.rampTo(-Infinity, 0.1);
  });

  setTimeout(() => {
    // Stop the synths without disposing them
    synths.forEach(synth => {
      if (synth) {
        synth.triggerRelease(); // Release any currently playing notes
      }
    });

    Tone.Transport.stop();
    Tone.Transport.cancel(0); // Cancel all scheduled events
  }, 50);
}

// Event listener for stop button
document.getElementById('stop').addEventListener('click', stopSynths);

function updateTimeBetween() {
  timeBetweenNotes = 60000 / bpm / speedMult;
  Tone.Transport.bpm.value = bpm * speedMult;
}

// Adjust tempo
document.getElementById('bpm').addEventListener('change', function () {
  document.getElementById('bpmText').innerText = document.getElementById('bpm').value;
  bpm = document.getElementById('bpm').value;
  updateTimeBetween();
});

// Function to handle speed change
function handleSpeedChange(event) {
  if (event.target.name === 'speed') {
    const selectedSpeed = event.target.value;
    console.log(`Speed changed to: ${selectedSpeed}`);
    speedMult = parseInt(selectedSpeed);
    updateTimeBetween();
  }
}

// Attach a single event listener to the speedOptions container
document.getElementById('speedOptions').addEventListener('change', handleSpeedChange);

document.addEventListener('DOMContentLoaded', () => {
  // Prioritize smooth playback
  const context = new Tone.Context({ latencyHint: 'playback' });
  Tone.setContext(context);

  // Initialize sound type menu items
  instrumentsMenuItems = Object.keys(samplers).map(key => {
    // Make the first letter uppercase
    const keyLabel = key.charAt(0).toUpperCase() + key.slice(1);
    return `<option value="${key}">${keyLabel} (Sampler)</option>`;
  });

  instrumentsMenuItems.push(
    ...Object.keys(fmSynths).map(key => {
      // Make the first letter uppercase
      const keyLabel = key.charAt(0).toUpperCase() + key.slice(1);
      return `<option value="${key}">${keyLabel} (FM Synth)</option>`;
    })
  );

  // Initialize existing soundModules in the DOM
  const existingModules = document.getElementsByClassName('soundModule');
  for (let m of existingModules) {
    soundModules.push(m);
  }

  // Toggle collapsible container for databases and devices
  const dataSource = document.getElementById('dataSource');
  const toggleButton = document.getElementById('toggleDataSource');
  toggleButton.addEventListener('click', () => {
    dataSource.style.display = dataSource.style.display === 'none' ? 'flex' : 'none';
    toggleButton.textContent = dataSource.style.display === 'none' ? '▼' : '▲';
  });

  const retrieveByNameDropdown = document.getElementById('retrieveByNameDropdown');

  // Fetch databases and populate the dropdown
  fetchDatabases();

  // Create one soundModule on startup
  addSoundModule();

  /**************
   *
   *
   * Curated database and device pairs
   *
   *
   **************/
  // Name is the displayed value in the dropdown menu
  // Database is the MongoDB database to use
  // Device is the collection within that database
  let predefinedPairs = [
    {
      name: 'Cascade Creek',
      database: 'TEK_Cascade',
      device: 'KutiChime13ISOTS',
    },
    { name: 'WhaleFest', database: 'WhaleFest23', device: 'KhutiChime7' },
    {
      name: 'OSU Solar Array 1 2025',
      database: 'Summer2025ChimeTest',
      device: 'EZ_Power_SD_29_Aug_2',
    },
    {
      name: 'OSU Solar Array 2 2025',
      database: 'Summer2025ChimeTest',
      device: 'CAP_FIX_29_Aug_1',
    },
  ];

  // Populate the "Retrieve by Name" dropdown with predefined database/device pairs
  predefinedPairs.forEach(pair => {
    let option = document.createElement('option');
    option.value = JSON.stringify(pair); // Store as a JSON string
    option.textContent = pair.name;
    retrieveByNameDropdown.appendChild(option);
  });

  // Handle selection from the named dropdown
  retrieveByNameDropdown.addEventListener('change', handleDatasetChange);
});

// Listener for "Dataset Name" dropdown
async function handleDatasetChange(event) {
  const selectedPair = JSON.parse(event.target.value);
  if (selectedPair) {
    // Check if the database exists
    const databasesDropdown = document.getElementById('databases');
    const devicesDropdown = document.getElementById('devices');
    let databaseExists = [...databasesDropdown.options].some(
      option => option.value.trim() === selectedPair.database.trim()
    );

    if (databaseExists) {
      databasesDropdown.value = selectedPair.database;

      // Wait for setDevices() to complete before checking for the device and setting it
      await fetchDevices();

      // Check if the selected device exists in the updated dropdown
      let deviceExists = [...devicesDropdown.options].some(
        option => option.value.trim() === selectedPair.device.trim()
      );

      if (deviceExists) {
        devicesDropdown.value = selectedPair.device;
        await setDateBoundsForSelection();
      } else {
        alert(
          `Warning: Device "${selectedPair.device}" not found in "${selectedPair.database}". Please select manually.`
        );
      }
    } else {
      alert(`Warning: Database "${selectedPair.database}" does not exist. Please select manually.`);
    }
  }
}

// Fetch databases from the server and populate the dropdown
function fetchDatabases() {
  fetch('/databases')
    .then(response => response.json())
    .then(data => {
      const select = document.getElementById('databases');
      select.innerHTML = '<option value="default">Select a database</option>'; // Default option

      if (data.length > 0) {
        data.forEach((item, index) => {
          const option = document.createElement('option');
          option.value = item;
          option.text = item;
          select.appendChild(option);

          // Automatically select the first available database
          if (index === 0) {
            select.value = item;
          }
        });

        // // Fetch devices for the first available database
        // fetchDevices();
        // Do not auto-select a DB; clear devices/dates until user chooses
        resetDevicesAndDates();
      }
    })
    .catch(error => {
      console.error('Error fetching databases:', error);
      // added 10/26
      resetDevicesAndDates();
    });
}

// Fetch devices based on the selected database and populate the dropdown
function fetchDevices() {
  return new Promise(resolve => {
    const select = document.getElementById('devices');
    select.innerHTML = '<option value="default">Select a sensor</option>';

    let database = document.getElementById('databases').value;
    if (database !== 'default') {
      fetch(`/collections?database=${database}`)
        .then(response => response.json())
        .then(async data => {
          data.forEach(item => {
            const option = document.createElement('option');
            option.value = item;
            option.text = item;
            select.appendChild(option);
          });

          // Automatically select the first available device
          if (data.length > 0) {
            select.value = data[0];
            await setDateBoundsForSelection();
          }

          resetDates();
          resolve(); // Resolve the Promise when devices are populated
        })
        .catch(error => {
          console.error('Error fetching devices:', error);
          resetDates();
          resolve(); // Still resolve to avoid blocking execution
        });
    } else {
      resolve(); // Resolve immediately if no valid database
    }
  });
}

// added 10/26
function resetDates() {
  const start = document.getElementById('startTime');
  const end = document.getElementById('endTime');
  ['min', 'max', 'value'].forEach(k => {
    start[k] = '';
    end[k] = '';
  });
}

// added 10/26
function resetDevicesAndDates() {
  const devSel = document.getElementById('devices');
  devSel.innerHTML = '<option value="default">Select a sensor</option>';
  resetDates();
}

// e.g., call after devices populated or when device changes:
document.getElementById('devices').addEventListener('change', setDateBoundsForSelection);

document.getElementById('databases').addEventListener('change', fetchDevices);

// Event listener to each radio button
document.getElementsByName('packetOption').forEach(radio => {
  // Get the input fields
  let numpacketsInput = document.getElementById('numpacketsInput');
  let timeInputs = document.getElementById('timeInputs');

  radio.addEventListener('change', async function () {
    // If "lastXPackets" is selected, show the "numpackets" and "prescaler" input fields and hide the "startTime" and "endTime" input fields
    if (this.value === 'lastXPackets') {
      numpacketsInput.style.display = 'block';
      timeInputs.style.display = 'none';
    }
    // If "timeRange" is selected, hide the "numpackets" input field and show the "startTime", "endTime" and "prescaler" input fields
    else if (this.value === 'timeRange') {
      numpacketsInput.style.display = 'none';
      timeInputs.style.display = 'block';
      await setDateBoundsForSelection(); // added 10/26
    } else {
      // added 10/26
      numpackets.style.display = 'block';
      timeInputs.style.display = 'none';
      resetDates();
    }
  });
});

// Main function to retrieve data and initialize modules
document.getElementById('retrieve').onclick = async function () {
  // Stop audio playback
  stopSynths();

  saveSelects();

  for (let m of soundModules) {
    // Clear the sensors and readings select elements
    let sensorsSelect = m.querySelector('.sensors');
    while (sensorsSelect.options.length > 1) {
      sensorsSelect.removeChild(sensorsSelect.lastChild);
    }

    let readingsSelect = m.querySelector('.readings');
    while (readingsSelect.options.length > 1) {
      readingsSelect.removeChild(readingsSelect.lastChild);
    }
  }

  let db = document.getElementById('databases').value;
  let collection = document.getElementById('devices').value;
  let x = document.getElementById('numpackets').value;
  let startTime = document.getElementById('startTime').value;
  let endTime = document.getElementById('endTime').value;

  let packetOption = document.querySelector('input[name="packetOption"]:checked').value;
  let prescaler = document.getElementById('prescaler').value;
  let url;

  // Error handling for inputs
  if (packetOption === 'lastXPackets') {
    if (x === '' || isNaN(x)) {
      alert('Number of packets must be an integer number');
      return;
    }
    url = `/data/?database=${db}&collection=${collection}&x=${x}&prescaler=${prescaler}`;
  } else if (packetOption === 'timeRange') {
    if (startTime === '' || endTime === '') {
      alert('Please enter a valid start time and end time');
      return;
    }

    if (startTime >= endTime) {
      alert('End time cannot be before start time');
      return;
    }

    // added 10/26
    const toISO = v => new Date(v).toISOString();
    url =
      `/data/?database=${db}&collection=${collection}` +
      `&startTime=${encodeURIComponent(toISO(startTime))}` +
      `&endTime=${encodeURIComponent(toISO(endTime))}` +
      `&prescaler=${prescaler}`;
  }

  if (collection === 'default') {
    alert('Please select a device');
    return;
  }

  // Fetch data from the server
  fetch(url)
    .then(response => response.json())
    .then(data => {
      retrievedData = data;

      // If data is empty, show an alert and return
      if (data.length === 0) {
        alert('No data available for the selected time range.');
        return;
      }
      data.sort(
        (a, b) =>
          new Date(fixTimestamp(a.Timestamp.time_local)) -
          new Date(fixTimestamp(b.Timestamp.time_local))
      );

      console.log(data);

      // Populate sound modules with the retrieved data
      for (let m of soundModules) {
        initializeModuleSelects(m, data);
        restoreSelects(m);
      }
    })
    .catch(error => console.error('Error:', error));
};

// Function to save currently selected sensor and reading
function saveSelects() {
  savedSensors = {};
  savedReadings = {};

  soundModules.forEach(module => {
    let moduleId = module.id; // Use unique module ID
    savedSensors[moduleId] = module.querySelector('.sensors').value;
    savedReadings[moduleId] = module.querySelector('.readings').value;
  });
}

// Function to restore previously selected sensor and reading
function restoreSelects(module) {
  let sensorsSelect = module.querySelector('.sensors');
  let readingsSelect = module.querySelector('.readings');
  const moduleId = module.id;

  let restoredData = false;

  // Restore the previously selected sensor if it still exists
  if (
    savedSensors[moduleId] &&
    [...sensorsSelect.options].some(option => option.value === savedSensors[moduleId])
  ) {
    sensorsSelect.value = savedSensors[moduleId];
    setReadings(soundModules.indexOf(module)); // Reinitialize readings
    restoredData = true;
  }

  // Restore the previously selected reading if it still exists
  if (
    savedReadings[moduleId] &&
    [...readingsSelect.options].some(option => option.value === savedReadings[moduleId])
  ) {
    readingsSelect.value = savedReadings[moduleId];
    restoredData = true;
  }

  plot(soundModules.indexOf(module)); // Reinitialize plot
}

// Function to initialize a sound module with given data
function initializeModuleSelects(module, data) {
  // Clear the sensors select element
  let sensorsSelect = module.querySelector('.sensors');
  while (sensorsSelect.firstChild) {
    sensorsSelect.removeChild(sensorsSelect.firstChild);
  }

  // Populate the sensors select element with data keys
  if (data && data.length > 0) {
    // Get the keys of the first object in the data array
    let keys = Object.keys(data[0]);

    // Add each key as an option to the sensors select element
    keys.forEach(key => {
      if (key === '_id' || key === 'Timestamp' || key === 'WiFi') return;
      let option = document.createElement('option');
      option.value = key;
      option.text = key;
      sensorsSelect.appendChild(option);
    });

    // Initialize readings select element
    setReadings(soundModules.indexOf(module));
  } else {
    console.error('No data available to initialize module selects.');
  }
}

// Sets readings on all sound modules
function setReadings(moduleIdx) {
  let m = soundModules[moduleIdx];
  let sensor = m.querySelector('.sensors').value;

  // Get the select element for readings
  let selectReadings = m.querySelector('.readings');

  // Remove any existing options
  while (selectReadings.firstChild) {
    selectReadings.removeChild(selectReadings.firstChild);
  }

  // If sensor is not "default"
  if (sensor !== 'default') {
    // Get the first object in the data array that has the sensor as a key
    let sensorData = retrievedData.find(d => d.hasOwnProperty(sensor));

    // If sensorData exists and its value is an object
    if (sensorData && typeof sensorData[sensor] === 'object') {
      // Get the keys of the sensorData object
      let keys = Object.keys(sensorData[sensor]);

      // Add each key as an option to the select element
      keys.forEach(key => {
        let option = document.createElement('option');
        option.value = key;
        option.text = key;
        selectReadings.appendChild(option);
      });

      plot(moduleIdx);
    }
  }
}

// Function called when a sound module value is updated
function updateSoundModule(moduleIdx) {
  const m = soundModules[moduleIdx];

  // Stop any currently playing notes
  if (synths[moduleIdx]) {
    synths[moduleIdx].releaseAll();
  }

  const sensor = m.querySelector('.sensors').value;
  const reading = m.querySelector('.readings').value;

  // Get and normalize the reading data
  const readingData = retrievedData
    .filter(d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading))
    .map(d => d[sensor][reading]);

  const normalizedData = normalizeData(readingData);

  // Get scale settings
  const tessitura = m.querySelector('.tessitura').value;
  const tonic = m.querySelector('.tonic').value;
  const scaleName = m.querySelector('.scale').value;
  const scale = createScaleArray(tonic, scaleName, tessitura);

  // Update the respective MIDI pitches array
  midiPitchesArray[moduleIdx] = dataToMidiPitches(normalizedData, scale);
}

function plot(moduleIdx) {
  let m = soundModules[moduleIdx];
  // Clear the plot area
  m.querySelector('.plot').innerHTML = '';

  // Get the selected sensor and reading
  let sensor = m.querySelector('.sensors').value;
  let reading = m.querySelector('.readings').value;

  // If sensor and reading are not "default"
  if (sensor !== 'default' && reading !== 'default') {
    // Get the data for the selected sensor and reading
    let filteredData = retrievedData.filter(
      d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading)
    );

    console.log(filteredData);

    // Ensure there is valid data and sort to prevent backtracking issues
    if (filteredData.length > 0) {
      filteredData.sort(
        (a, b) =>
          new Date(fixTimestamp(a.Timestamp.time_local)) -
          new Date(fixTimestamp(b.Timestamp.time_local))
      );

      // Use actual timestamps instead of indices to account for spacing issues
      let xData = filteredData.map(d => new Date(fixTimestamp(d.Timestamp.time_local)).getTime());
      let yData = filteredData.map(d => d[sensor][reading]);

      // Save xData for updatePlaybackBar to use
      plotXData[moduleIdx] = xData;

      // Convert timestamps to short readable format (MM/DD HH:mm:ss)
      let xLabels = filteredData.map(d =>
        new Date(fixTimestamp(d.Timestamp.time_local)).toLocaleString('en-US', {
          year: '2-digit',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );

      // Create hover text for all points (show exact timestamp on hover)
      let hoverTexts = filteredData.map((d, i) => `Date: ${xLabels[i]}<br>Value: ${yData[i]}`);

      // Reduce the number of x-axis labels for readability
      let tickStep = Math.max(1, Math.floor(xData.length / 6));
      let tickVals = xData.filter((_, i) => i % tickStep === 0);
      let tickText = xLabels.filter((_, i) => i % tickStep === 0);

      // Create the data array for the plot
      let plotData = [
        {
          x: xData,
          y: yData,
          type: 'scatter',
          mode: 'lines',
          line: { width: 2, color: 'blue' },
          text: hoverTexts,
          hoverinfo: 'text',
        },
      ];

      // Create the layout object for the plot
      let layout = {
        title: {
          text: `${sensor} - ${reading}`,
          y: 0.9,
        },
        // Commenting out x-axis to work on global/universal top x-axis
        xaxis: {
          // Use when universal x-axis is imlpemented
          // showticklabels: false, // This hides the values at the bottom
          title: '',
          tickmode: 'array',
          tickvals: tickVals,
          ticktext: tickText, // Show actual timestamps at selected spots
          tickangle: -20, // Rotate for readability
          showgrid: true,
        },
        margin: {
          l: 100, // left margin (adjust as needed for y-axis labels)
          r: 30, // right margin
          b: 90, // bottom margin (ideal 30 with hidden x-axis)
          t: 70, // top margin
          // pad: 20 // padding between the plot area and the margin border
        },
        yaxis: {
          title: {
            text: `${reading} Value`,
            standoff: 20,
          },
          showgrid: true,
          linecolor: 'white',
        },
        autosize: true,
        // margin: { l: 100, r: 50, t: 100, b: 100 } // Extra bottom margin for rotated labels
      };

      // Add config parameter
      let config = {
        responsive: true,
      };

      // Plot the data using Plotly
      Plotly.newPlot(m.querySelector('.plot'), plotData, layout, config);

      // Force resize after plot creation
      setTimeout(() => {
        Plotly.Plots.resize(m.querySelector('.plot'));
      }, 100);
    }
  }
}

async function setDateBoundsForSelection() {
  const database = document.getElementById('databases').value;
  const collection = document.getElementById('devices').value;

  // Only run when both are selected
  if (!database || database === 'default' || !collection || collection === 'default') {
    return;
  }

  try {
    const res = await fetch(
      `/date-range?database=${encodeURIComponent(database)}&collection=${encodeURIComponent(
        collection
      )}`
    );

    if (!res.ok) {
      console.error('Failed to fetch date range:', res.status, res.statusText);
      return;
    }

    const { minDate, maxDate } = await res.json();
    const startInput = document.getElementById('startTime');
    const endInput = document.getElementById('endTime');

    if (!minDate || !maxDate) {
      console.warn('No valid dates returned for this dataset.');
      startInput.value = '';
      endInput.value = '';
      startInput.min = '';
      startInput.max = '';
      endInput.min = '';
      endInput.max = '';
      return;
    }

    // Convert ISO UTC -> local "yyyy-MM-ddTHH:mm" for <input type="datetime-local">
    const toLocalInput = iso => {
      const d = new Date(iso);
      const offsetMs = d.getTimezoneOffset() * 60_000;
      const local = new Date(d.getTime() - offsetMs);
      return local.toISOString().slice(0, 16);
    };

    const minStr = toLocalInput(minDate);
    const maxStr = toLocalInput(maxDate);

    // Set bounds
    startInput.min = minStr;
    startInput.max = maxStr;
    endInput.min = minStr;
    endInput.max = maxStr;

    // Autofill values
    startInput.value = minStr;
    endInput.value = maxStr;

    console.log('Autofilled time range:', { minStr, maxStr });
  } catch (err) {
    console.error('Error fetching date range:', err);
  }
}

// Add a helper function to fix timestamp format
function fixTimestamp(ts) {
  // Remove trailing 'Z' then split on 'T'
  let [datePart, timePart] = ts.replace('Z', '').split('T');
  if (!timePart) return ts; // fallback
  // Split time components and pad if necessary
  let parts = timePart.split(':').map(p => p.padStart(2, '0'));
  return `${datePart}T${parts.join(':')}Z`;
}

/**** MIDI pitch conversion ****/

// Function to get MIDI number for a tonic note in the 2nd octave (MIDI numbers for C2 is 36)
function getMidiNumber(tonic) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const baseMidi = 24; // MIDI number for C2 using the "General MIDI" standard, where C4 is MIDI 60
  return baseMidi + notes.indexOf(tonic);
}

function getScaleIntervals(scaleName) {
  const scales = {
    Ionian: [2, 2, 1, 2, 2, 2, 1],
    Dorian: [2, 1, 2, 2, 2, 1, 2],
    Phrygian: [1, 2, 2, 2, 1, 2, 2],
    Lydian: [2, 2, 2, 1, 2, 2, 1],
    Mixolydian: [2, 2, 1, 2, 2, 1, 2],
    Aeolian: [2, 1, 2, 2, 1, 2, 2],
    Locrian: [1, 2, 2, 1, 2, 2, 2],
    'Melodic Minor': [2, 1, 2, 2, 2, 2, 1],
    'Harmonic Minor': [2, 1, 2, 2, 1, 3, 1],
    'Harmonic Major': [2, 2, 1, 2, 1, 3, 1],
    'Whole Tone': [2, 2, 2, 2, 2, 2],
    Chromatic: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    'Octatonic Major': [2, 1, 2, 1, 2, 1, 2, 1],
    'Octatonic Minor': [1, 2, 1, 2, 1, 2, 1, 2],
    Pentatonic: [2, 2, 3, 2, 3],
    'Synthetic Minor': [3, 1, 2, 2, 1, 2, 1],
    'Major Bitonal': [1, 3, 2, 1, 3, 1, 1],
    'Minor Bitonal': [1, 2, 3, 1, 2, 1, 2],
    Polytonal: [2, 1, 1, 1, 2, 1, 1, 1, 2],
    Ditone: [1, 3, 1, 3, 1, 3],
    Prometheus: [2, 2, 2, 3, 1, 2],
    'Trans-Pentatonic': [3, 2, 1, 2, 2, 2],
    Pelog: [1, 2, 4, 1, 4],
    Slendro: [2, 3, 2, 3, 2],
    'Hungarian-Bartok': [2, 1, 3, 1, 1, 3, 1],
    'Bulgarian-Bartok': [1, 2, 2, 2, 2, 1, 2],
    'Asian-Bartok': [2, 1, 3, 1, 2, 2, 1],
    Spain: [1, 2, 2, 2, 1, 3, 1],
    'India-Dharmavati': [2, 1, 3, 1, 2, 2, 1],
    Japan: [2, 1, 1, 2, 2, 1, 2, 1],
    Peru: [3, 2, 2, 1, 2, 2],
    Alaska: [3, 2, 1, 2, 1, 2, 1],
    'Jewish Ahavoh-Rabboh': [1, 3, 1, 2, 1, 2, 2],
    Slavic: [5, 2, 1, 2, 2],
    Blues: [3, 2, 1, 1, 3, 2],
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
    soprano: 4,
  };

  // Determine the number of octaves to shift
  const octaveShift = tessituraShifts[tessitura.toLowerCase()] || 0;

  // Get scale intervals and base tonic MIDI number
  const intervals = getScaleIntervals(scaleName);
  const tonicMidi = getMidiNumber(tonic);

  // Generate notes in a 2-octave range
  let scale = [];
  let currentNote = tonicMidi;

  // Generate the scale for two octaves
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

// Normalize sensor data from original range to 0.0 to 1.0
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

const metadataBtn = document.getElementById('metadataButton');
metadataBtn.onclick = async function () {
  let db = document.getElementById('databases').value;

  let url = `/metadata?database=${db}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      retrievedData = data;

      if (retrievedData == null) {
        alert('No metadata :(');
      } else {
        console.log(retrievedData);
      }
    })
    .catch(error => console.error('Error:', error));
};
