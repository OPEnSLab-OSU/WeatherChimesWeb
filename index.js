/**** Global variables ****/

// Metadata
let metadata;
const metadataBtn = document.getElementById('metadataButton');
let isMetadataDisplayed = false;

// Playback boolean
let isPlaying = false;

// Playback globals
let bpm = 125;
let speedMult = 1;

// Initialize Tone.js objects
let synths = []; // Array of FM synths
let gainNodes = []; // Array of gain nodes

// Boolean to track if data is displayed
let workspaceHasData = false

// Track if user has confirmed a date range
let dateRangeConfirmed = false;

// Import synths and samplers
import { samplers, fmSynths } from './instruments.js';

// HTML template for a sound module
import { createSoundModuleTemplate } from './soundModule.js';

// Import sensor display name function
import { sensorDisplayName } from "./sensorNames.js";

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

// Store min/max for each moduleIdx
let plotRanges = {}; 

// Sustain notes for each sound module
let sustainNotes = [];

// Time between notes in milliseconds
let timeBetweenNotes = 500;

// Hold the most recently retrieved data
var retrievedData;

// Array to hold x-axis data for each plot
let plotXData = {};

// Track if onboarding is in progress
let openPresetBtn;

// Undo/Redo state management
let historyStack = [];
let historyIndex = -1;
let isRestoring = false; // Flag to prevent capturing state while restoring
let sensorChanging = false; // Flag to prevent state capture during sensor-reading dependent changes
const MAX_HISTORY = 50; // Limit history to prevent memory issues

// ===== UNDO/REDO memory fix =====
let currentDatasetKey = null;

// tiny cache so undo doesn't re-download every time,
// but also doesn't store 50 copies in history
const datasetCache = new Map();
const DATASET_CACHE_LIMIT = 2;

function makeDatasetKey(params) {
  return JSON.stringify(params);
}

function cacheDataset(key, data) {
  if (!key || !data) return;

  if (datasetCache.has(key)) datasetCache.delete(key);
  datasetCache.set(key, data);

  while (datasetCache.size > DATASET_CACHE_LIMIT) {
    const oldest = datasetCache.keys().next().value;
    datasetCache.delete(oldest);
  }
}

function getCachedDataset(key) {
  return datasetCache.get(key) || null;
}

function getRetrievalParams() {
  return {
    db: document.getElementById("databases")?.value,
    device: document.getElementById("devices")?.value,
    packetOption: document.querySelector('input[name="packetOption"]:checked')?.value,
    x: document.getElementById("numpackets")?.value,
    startTime: document.getElementById("startTime")?.value,
    endTime: document.getElementById("endTime")?.value,
    prescaler: document.getElementById("prescaler")?.value,
  };
}

function buildDataUrlFromParams(p) {
  if (!p?.db || !p?.device) return null;

  if (p.packetOption === "timeRange") {
    if (!p.startTime || !p.endTime) return null;
    return `/data/?database=${encodeURIComponent(p.db)}&collection=${encodeURIComponent(
      p.device
    )}&startTime=${encodeURIComponent(p.startTime)}&endTime=${encodeURIComponent(
      p.endTime
    )}&prescaler=${encodeURIComponent(p.prescaler || 1)}`;
  }

  // default to lastXPackets
  if (!p.x) return null;
  return `/data/?database=${encodeURIComponent(p.db)}&collection=${encodeURIComponent(
    p.device
  )}&x=${encodeURIComponent(p.x)}&prescaler=${encodeURIComponent(p.prescaler || 1)}`;
}

// ====== UNDO/REDO FUNCTIONALITY ======
function captureState() {
  return {
    modules: soundModules.map(module => ({
      id: module.id,
      sensor: module.querySelector('.sensors')?.value,
      reading: module.querySelector('.readings')?.value,
      volume: module.querySelector('.volume')?.value,
      soundType: module.querySelector('.soundTypes')?.value,
      tessitura: module.querySelector('.tessitura')?.value,
      tonic: module.querySelector('.tonic')?.value,
      scale: module.querySelector('.scale')?.value,
      sustainNotes: module.querySelector('.sustainNotes')?.checked,
      panelOpen: module.querySelector('.moduleBottomOptions')?.style.display === 'block',
      plotTitle: module.querySelector('.plot-title-bar')?.textContent || '',
      plotYAxis: module.querySelector('.plot-yaxis-label')?.textContent || '',
      plotTitleVisible: module.querySelector('.plot-title-bar')?.style.display || 'none',
      plotYAxisVisible: module.querySelector('.plot-yaxis-label')?.style.display || 'none',
    })),
    database: document.getElementById('databases')?.value,
    device: document.getElementById('devices')?.value,
    bpm: document.getElementById('bpm')?.value,
    masterVolume: document.getElementById('masterVolume')?.value,
    speed: document.querySelector('input[name="speed"]:checked')?.value,
    numPackets: document.getElementById('numpackets')?.value,
    prescaler: document.getElementById('prescaler')?.value,
    presetButtonText: document.getElementById('openPresetModal')?.textContent.trim(),
    startTime: document.getElementById('startTime')?.value,
    endTime: document.getElementById('endTime')?.value,
    dateRangeText: document.getElementById('dateRangeText')?.textContent.trim(),
    packetOption: document.querySelector('input[name="packetOption"]:checked')?.value,
    retrievalParams: getRetrievalParams(),
    datasetKey: currentDatasetKey,
    hadData: !!retrievedData,
  };
}

// Save state to history
function saveState() {
  if (isRestoring) 
    return;
  if (sensorChanging) 
    return;

  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
  }

  historyStack.push(captureState());
  historyIndex = historyStack.length - 1;

  if (historyStack.length > MAX_HISTORY) {
    historyStack.shift();
    historyIndex = historyStack.length - 1;
  }

  updateUndoRedoButtons();
}

// Restore state from history
async function restoreState(state) {
  isRestoring = true;

  try {
    stopSynths();

    // Restore/reload dataset
    if (!state.hadData) {
      retrievedData = null;
      currentDatasetKey = null;
    } else {
      // try cache first
      const cached = getCachedDataset(state.datasetKey);
      if (cached) {
        retrievedData = cached;
        currentDatasetKey = state.datasetKey;
      } else {
        // re-fetch using saved params
        const url = buildDataUrlFromParams(state.retrievalParams);
        if (url) {
          const res = await fetch(url);
          const data = await res.json();
          retrievedData = data;

          const newKey = makeDatasetKey(state.retrievalParams);
          currentDatasetKey = newKey;
          cacheDataset(newKey, retrievedData);
        } else {
          // fallback: treat as no data
          retrievedData = null;
          currentDatasetKey = null;
        }
      }
    }

    // Restore global settings
    if (state.presetButtonText === '' || state.presetButtonText?.includes('Select a Preset')) {
      openPresetBtn.innerHTML = '';
      const iconEl = document.createElement('i');
      iconEl.setAttribute('data-lucide', 'folder-search');
      openPresetBtn.appendChild(iconEl);
      openPresetBtn.append(' Select Preset');
      lucide.createIcons();
      const modalPresetDropdown = document.getElementById('modalPreset');
      if (modalPresetDropdown) modalPresetDropdown.value = 'default';
    } else if (state.presetButtonText) {
      openPresetBtn.textContent = state.presetButtonText;
    }

    if (state.database) document.getElementById('databases').value = state.database;
    if (state.device) document.getElementById('devices').value = state.device;
    if (state.bpm) {
      document.getElementById('bpm').value = state.bpm;
      document.getElementById('bpmText').innerText = state.bpm;
      bpm = parseFloat(state.bpm);
      updateTimeBetween();
    }
    if (state.masterVolume !== undefined) {
      const mv = parseFloat(state.masterVolume);
      document.getElementById('masterVolume').value = mv;
      gainNodes.forEach(gainNode => {
        if (gainNode) gainNode.volume.value = mv;
      });
    }
    if (state.speed) {
      const speedRadio = document.querySelector(`input[name="speed"][value="${state.speed}"]`);
      if (speedRadio) speedRadio.checked = true;

      speedMult = parseInt(state.speed, 10);
      updateTimeBetween();
    }
    if (state.numPackets) document.getElementById('numpackets').value = state.numPackets;
    if (state.prescaler) document.getElementById('prescaler').value = state.prescaler;
    if (state.startTime !== undefined) document.getElementById('startTime').value = state.startTime;
    if (state.endTime !== undefined) document.getElementById('endTime').value = state.endTime;
    if (state.dateRangeText !== undefined) document.getElementById('dateRangeText').textContent = state.dateRangeText;
    if (state.packetOption) {
      const radio = document.querySelector(`input[name="packetOption"][value="${state.packetOption}"]`);
      if (radio) radio.checked = true;
      const isLastX = state.packetOption === 'lastXPackets';
      document.getElementById('numpacketsInput').style.display = isLastX ? '' : 'none';
      document.getElementById('skipPackets').style.display = isLastX ? '' : 'none';
    }

    const modulesContainer = document.getElementById('modulesContainer');
    const currentCount = soundModules.length;
    const targetCount = state.modules.length;

    // ── Add missing modules ──
    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        addSoundModule(); // isRestoring flag prevents saveState inside
      }
    }

    // ── Remove extra modules ──
    if (targetCount < currentCount) {
      for (let i = currentCount - 1; i >= targetCount; i--) {
        const mod = soundModules[i];
        if (mod) {
          mod.remove();
          soundModules.splice(i, 1);
          if (midiPitchesArray[i]) midiPitchesArray.splice(i, 1);
          if (sustainNotes[i] !== undefined) sustainNotes.splice(i, 1);
        }
      }
    }

    soundModules.forEach((mod) => {
      const s = mod.querySelector('.sensors');
      const r = mod.querySelector('.readings');

      if (retrievedData) {
        initializeModuleSelects(mod, retrievedData);
      } else {
        if (s) { s.innerHTML = ''; s.value = 'default'; }
        if (r) { r.innerHTML = ''; r.value = 'default'; }
      }
    });

    // ── Update each module in place ──
    state.modules.forEach((moduleState, index) => {
      const mod = soundModules[index];
      if (!mod) return;

      // Sound options — set these FIRST before updateSoundModule
      if (moduleState.tessitura) mod.querySelector('.tessitura').value = moduleState.tessitura;
      if (moduleState.tonic) mod.querySelector('.tonic').value = moduleState.tonic;
      if (moduleState.scale) mod.querySelector('.scale').value = moduleState.scale;
      if (moduleState.volume) mod.querySelector('.volume').value = moduleState.volume;
      if (moduleState.sustainNotes !== undefined) {
        mod.querySelector('.sustainNotes').checked = moduleState.sustainNotes;
        sustainNotes[index] = moduleState.sustainNotes;
      }

      // Sensor + reading
      const prevSensor = mod.querySelector('.sensors').value;
      const prevReading = mod.querySelector('.readings').value;
      if (moduleState.sensor) mod.querySelector('.sensors').value = moduleState.sensor;
      if (moduleState.reading) {
        isRestoring = true;
        setReadings(index);
        isRestoring = false;
        mod.querySelector('.readings').value = moduleState.reading;
      }

      // Sound type — re-init synth directly
      if (moduleState.soundType) {
        mod.querySelector('.soundTypes').value = moduleState.soundType;
        const selectedSoundType = moduleState.soundType;
        if (synths[index]) synths[index].dispose();
        if (samplers[selectedSoundType]) {
          const samplerInfo = samplers[selectedSoundType];
          synths[index] = new Tone.Sampler({
            urls: samplerInfo.urls,
            baseUrl: samplerInfo.baseUrl,
          });
        } else {
          const polySynth = new Tone.PolySynth(Tone.FMSynth, { maxPolyphony: 32 });
          polySynth.set(fmSynths[selectedSoundType] || fmSynths['retro']);
          synths[index] = polySynth;
        }
        attachGainNode(synths[index], index);
      }

      // Replot only if sensor/reading changed or plot is missing
      const sensorChanged = moduleState.sensor !== prevSensor;
      const readingChanged = moduleState.reading !== prevReading;
      const plotDiv = mod.querySelector('.plot');
      const hasPlot = plotDiv && plotDiv.data;

      if (retrievedData && (sensorChanged || readingChanged || !hasPlot)) {
        plot(index);
      } else if (!retrievedData) {
        try { Plotly.purge(plotDiv); } catch(e) {}
        try { Plotly.purge(document.getElementById('globalTimeline')); } catch(e) {}
      }

      // Update MIDI pitches to match restored sound options
      if (retrievedData) {
        updateSoundModule(index);
      }

      // ── Restore plot title bar ──
      const titleBar = mod.querySelector('.plot-title-bar');
      const yAxisLabel = mod.querySelector('.plot-yaxis-label');
      if (titleBar) {
        titleBar.textContent = moduleState.plotTitle || '';
        titleBar.style.display = moduleState.plotTitleVisible || 'none';
      }
      if (yAxisLabel) {
        yAxisLabel.textContent = moduleState.plotYAxis || '';
        yAxisLabel.style.display = moduleState.plotYAxisVisible || 'none';
      }

      // ── Restore panel open/close state WITHOUT setTimeout ──
      const options = mod.querySelector('.moduleBottomOptions');
      const collapseBtn = mod.querySelector('.collapse-btn');
      if (moduleState.panelOpen) {
        if (options) options.style.display = 'block';
        if (collapseBtn) collapseBtn.innerHTML = ' Hide Options <span class="arrow-icon">▲</span>';
      } else {
        if (options) options.style.display = 'none';
        if (collapseBtn) collapseBtn.innerHTML = ' Sound Options <span class="arrow-icon">▼</span>';
      }
    });

    updateUndoRedoButtons();
  } finally {
    isRestoring = false;
  }
}

// Update undo/redo button states
function updateUndoRedoButtons() {
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');
  
  if (undoBtn) {
    undoBtn.disabled = historyStack.length === 0 || historyIndex <= 0;
    undoBtn.style.opacity = historyIndex <= 0 ? '0.5' : '1';
    undoBtn.style.cursor = historyIndex <= 0 ? 'not-allowed' : 'pointer';
  }
  
  if (redoBtn) {
    redoBtn.disabled = historyStack.length === 0 || historyIndex >= historyStack.length - 1;
    redoBtn.style.opacity = historyIndex >= historyStack.length - 1 ? '0.5' : '1';
    redoBtn.style.cursor = historyIndex >= historyStack.length - 1 ? 'not-allowed' : 'pointer';
  }
}

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
  soundTypesSelect.value = 'harp'; // Set default value

  const tessituraSelect = newModule.querySelector('.tessitura');
  tessituraSelect.value = "Tenor";

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

  if (!isRestoring)
    saveState(); // Capture state after adding a new module
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
    if (!isRestoring) 
      saveState();
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

    saveState(); // Capture state after removing a module
  });
}

function attachVolumeListener(soundModule) {
  const volumeSlider = soundModule.querySelector('.volume');
  volumeSlider.addEventListener('input', () => {
    const idx = soundModules.indexOf(soundModule);
    applyVolume(idx);
  });
  volumeSlider.addEventListener('change', () => saveState());
}

function attachSensorListener(soundModule) {
  const sensorSelect = soundModule.querySelector('.sensors');
  sensorSelect.addEventListener('change', event => {
    const selectedSensor = event.target.value;
    sensorChanging = true; // Prevent state capture during restoration
    setReadings(soundModules.indexOf(soundModule));
    sensorChanging = false; // Re-enable state capture after readings are set
    console.log(`Sensor for ${soundModule.id} set to ${selectedSensor}`);
    if (!isRestoring)
      saveState(); // Capture state after changing sensor
  });
}

function attachReadingListener(soundModule) {
  const readingSelect = soundModule.querySelector('.readings');
  readingSelect.addEventListener('change', event => {
    const selectedReading = event.target.value;
    plot(soundModules.indexOf(soundModule));
    console.log(`Reading for ${soundModule.id} set to ${selectedReading}`);
    if (!isRestoring && !sensorChanging)
      saveState(); // Capture state after changing reading
  });
}

// Left menu collapse (accordion) logic
function attachCollapseListener(soundModule) {
  const collapseBtn = soundModule.querySelector('.collapse-btn');
  const options = soundModule.querySelector('.moduleBottomOptions');
  const plotDiv = soundModule.querySelector('.plot');

  // 1. Setup an Observer to watch for height changes in this specific module
  const resizeObserver = new ResizeObserver(() => {
    if (plotDiv && plotDiv.offsetParent != null && (plotDiv.data || plotDiv.layout)) {
      Plotly.Plots.resize(plotDiv);
    }
  });
  
  // Start observing the module
  resizeObserver.observe(soundModule);

  collapseBtn.addEventListener('click', () => {
    // const isExpanding = options.style.display === 'none' || options.style.display === '';
    const isExpanding = options.style.display !== 'block';

    if (isExpanding) {
      // Close all other open modules
      document.querySelectorAll('.soundModule').forEach(module => {
        const otherOptions = module.querySelector('.moduleBottomOptions');
        const otherBtn = module.querySelector('.collapse-btn');
        if (otherOptions && otherOptions !== options) {
          otherOptions.style.display = 'none';
          if (otherBtn) {
            otherBtn.innerHTML = ' Sound Options <span class="arrow-icon">▼</span>';
          }
        }
      });

      options.style.display = 'block';
      collapseBtn.innerHTML = ' Hide Options <span class="arrow-icon">▲</span>';
    } else {
      options.style.display = 'none';
      collapseBtn.innerHTML = ' Sound Options <span class="arrow-icon">▼</span>';
    }
    
    if (!isRestoring) 
      saveState();
    // NO setTimeout needed! The Observer handles it instantly.
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

    if (!isRestoring) 
      saveState();
  });
}

function attachNoteOptionListeners(soundModule) {
  // Attach listeners to all relevant elements within the soundModule
  const elements = soundModule.querySelectorAll('.tessitura, .tonic, .scale');
  elements.forEach(element => {
    element.addEventListener('change', event => {
      const moduleIdx = soundModules.indexOf(soundModule);

      if (moduleIdx !== -1) {
        // Call the update function with the correct module index
        updateSoundModule(moduleIdx);
        saveState(); // Capture state after changing note options
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
  applyVolume(moduleId);
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

  gainNodes.forEach((_, idx) => applyVolume(idx));

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

function applyVolume(moduleId) {
  const gainNode = gainNodes[moduleId];
  if (!gainNode) {
    return;
  }
  
  const trackVol = parseFloat(soundModules[moduleId].querySelector('.volume').value);
  const masterVol = parseFloat(document.getElementById('masterVolume').value);
  
  gainNode.volume.value = trackVol + masterVol;
}

function updateTimeBetween() {
  timeBetweenNotes = 60000 / bpm / speedMult;
  Tone.Transport.bpm.value = bpm * speedMult;
}

// Adjust tempo
document.getElementById('bpm').addEventListener('change', function () {
  document.getElementById('bpmText').innerText = document.getElementById('bpm').value;
  bpm = parseFloat(document.getElementById('bpm').value);
  updateTimeBetween();
  saveState(); // Capture state after changing BPM
});

// Function to handle speed change
function handleSpeedChange(event) {
  if (event.target.name === 'speed') {
    const selectedSpeed = event.target.value;
    console.log(`Speed changed to: ${selectedSpeed}`);
    speedMult = parseInt(selectedSpeed);
    updateTimeBetween();
    if (!isRestoring) 
      saveState();
  }
}

// Master Volume 
document.getElementById('masterVolume').addEventListener('change', function () {
  const masterVolValue = parseFloat(this.value);
  // Apply to all active gain nodes
  gainNodes.forEach(gainNode => {
    if (gainNode) gainNode.volume.value = masterVolValue;
  });
  saveState();
});


function clearWorkspace() {
  const confirmed = confirm("Are you sure you want to clear your workspace?");
  if (!confirmed) return;

  // capture state BEFORE clearing so Undo can return to it
  saveState();

  isRestoring = true;
  try {
    // Stop any playback
    stopSynths();

    // Clear global “loaded data” state
    retrievedData = null;
    midiPitchesArray = [];
    plotXData = {};

    // Clear the universal x-axis timeline
    const globalTimeline = document.getElementById('globalTimeline');
    if (globalTimeline) {
      try { 
        Plotly.purge(globalTimeline); 
      } catch(e) {
        console.warn("Plotly purge failed (safe to ignore):", e);
      }
      globalTimeline.innerHTML = "";
    }

    // Remove extra modules so only one remains
    const modulesContainer = document.getElementById('modulesContainer');
    if (modulesContainer) {
      while (modulesContainer.children.length > 1) {
        modulesContainer.removeChild(modulesContainer.lastElementChild);
      }
    }

    // Rebuild soundModules to match what is in the DOM
    soundModules = [];
    const remainingModules = document.getElementsByClassName('soundModule');
    for (let m of remainingModules) {
      soundModules.push(m);
    }

    // Ensure IDs + remove button data attributes are correct
    soundModules.forEach((module, index) => {
      module.id = `module${index}`;
      const removeBtn = module.querySelector('.removeModule');
      if (removeBtn) removeBtn.dataset.moduleId = index;
    });

    // Reset the remaining module UI safely
    if (soundModules.length > 0) {
      const module = soundModules[0];

      const plotDiv = module.querySelector(".plot");
      if (plotDiv) {
        try { Plotly.purge(plotDiv); } catch(e) {
          console.warn("Plotly purge failed (safe to ignore):", e);
        }
        plotDiv.innerHTML = "";
      }

      // Reset title of graph
      const titleBar = module.querySelector(".plot-title-bar");
      if (titleBar) {
        titleBar.textContent = '';
        titleBar.style.display = 'none';
      }

      // Reset y-axis label
      const yAxisLabel = module.querySelector(".plot-yaxis-label");
      if (yAxisLabel) {
        yAxisLabel.textContent = '';
        yAxisLabel.style.display = 'none';
      }

      // NOT delete dropdown options. Just reset selection + disable.
      const sensorsSelect = module.querySelector(".sensors");
      if (sensorsSelect) {
        sensorsSelect.innerHTML = `<option value="default">Select a sensor</option>`;
        sensorsSelect.value = "default";
        //sensorsSelect.disabled = true;
      }

      const readingsSelect = module.querySelector(".readings");
      if (readingsSelect) {
        sensorsSelect.innerHTML = `<option value="default">Select a sensor</option>`;
        readingsSelect.value = "default";
        //readingsSelect.disabled = true;
      }
    }

    workspaceHasData = false;
    updateClearWorkspaceButton();

  } finally {
    isRestoring = false;
  }

  // capture the "cleared" state so Redo can go back to cleared
  saveState();
  updateUndoRedoButtons();
}

function updateClearWorkspaceButton() {
  const btn = document.getElementById("clearWorkspace");
  if (!btn) return;

  btn.disabled = !workspaceHasData;
  btn.classList.toggle("disabled", btn.disabled);
}


const ONBOARDING_STORAGE_KEY = 'ear2earth-onboarding-v1-complete';

function shouldRunOnboarding() {
  return localStorage.getItem(ONBOARDING_STORAGE_KEY) !== 'true';
}

function setOnboardingComplete() {
  localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}

function resetToLastPacketsMode() {
  const lastXPacketsRadio = document.getElementById('lastXPackets');
  const timeRangeRadio = document.getElementById('timeRange');
  const numpacketsInput = document.getElementById('numpacketsInput');
  const skipPackets = document.getElementById('skipPackets');

  if (lastXPacketsRadio) lastXPacketsRadio.checked = true;
  if (timeRangeRadio) timeRangeRadio.checked = false;
  if (numpacketsInput) numpacketsInput.style.display = 'block';
  if (skipPackets) skipPackets.style.display = 'block';
  resetDateRangeState();
}

function updateDateRangeModalButton() {
  const confirmDateTime = document.getElementById('confirmDateTime');
  const timeRangeRadio = document.getElementById('timeRange');
  if (!confirmDateTime || !timeRangeRadio) return;
  confirmDateTime.textContent = timeRangeRadio.checked ? 'Retrieve Data' : 'Apply';
}

function isTimeRangeSelected() {
  const timeRangeRadio = document.getElementById('timeRange');
  return !!(timeRangeRadio && timeRangeRadio.checked);
}

function updateDateRangeTextFromValues(startValue, endValue) {
  const dateRangeText = document.getElementById('dateRangeText');
  if (!dateRangeText) return;

  if (!startValue || !endValue) {
    dateRangeText.textContent = 'Date Range';
    return;
  }

  const startDate = new Date(startValue).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });
  const endDate = new Date(endValue).toLocaleDateString('en-US', {
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });

  dateRangeText.textContent = `${startDate} - ${endDate}`;
}

function resetDateRangeState() {
  dateRangeConfirmed = false;
  const dateRangeText = document.getElementById('dateRangeText');
  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const prescalerInput = document.getElementById('prescaler');
  const modalStartTime = document.getElementById('modalStartTime');
  const modalEndTime = document.getElementById('modalEndTime');
  const modalPrescaler = document.getElementById('modalPrescaler');

  if (dateRangeText) dateRangeText.textContent = 'Date Range';
  if (startTimeInput) startTimeInput.value = '';
  if (endTimeInput) endTimeInput.value = '';
  if (prescalerInput) prescalerInput.value = '1';
  if (modalStartTime) modalStartTime.value = '';
  if (modalEndTime) modalEndTime.value = '';
  if (modalPrescaler) modalPrescaler.value = '1';
  updateDateRangeModalButton();
}

let activeOnboardingSession = null;

function startFirstTimeOnboarding(options = {}) {
  const { manual = false } = options;
  if (activeOnboardingSession) {
    activeOnboardingSession.close(false);
  }

  const dataSourceModal = document.getElementById('dataSourceModal');
  const dateTimeModal = document.getElementById('dateTimeModal');
  const onboardingLockTargets = [
    '.topmenu',
    '.timeline-row',
    '#modulesContainer',
    '#addModule',
    '#popover',
    '#status-message'
  ];

  const steps = [
    {
      selectors: ['#openPresetModal'],
      title: 'Choose Data Source',
      text: 'Start here to open the dataset and device selector.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['#modalPreset'],
      title: 'Select a Preset',
      text: 'Choose a named preset to auto-fill database and device selections.',
      showDataSourceModal: true,
      showDateTimeModal: false
    },
    {
      selectors: ['#databases'],
      title: 'Select a Dataset',
      text: 'Pick the database containing the packets you want to sonify.',
      showDataSourceModal: true,
      showDateTimeModal: false
    },
    {
      selectors: ['#devices'],
      title: 'Select a Device',
      text: 'Choose the device/collection within the selected dataset.',
      showDataSourceModal: true,
      showDateTimeModal: false
    },
    {
      selectors: ['#confirmDataSource'],
      title: 'Confirm Source',
      text: 'Save your dataset and device selection for retrieval.',
      showDataSourceModal: true,
      showDateTimeModal: false
    },
    {
      selectors: ['#dataOptions label[for="lastXPackets"]', '#dataOptions label[for="timeRange"]'],
      title: 'Packet Mode',
      text: 'Pick between Last Packets and Date Range modes.',
      anchorSelector: '#dataOptions',
      cardPlacement: 'below',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['.packet-inputs-group'],
      title: 'Packet Setup',
      text: 'Configure packet count and prescaler (use every Nth packet).',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['#dateRangeLabel'],
      title: 'Date Range',
      text: 'Click Date Range to open the date/time picker modal.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['#modalStartTime', '#modalEndTime', '#modalPrescaler'],
      title: 'Select Date & Time Range',
      text: 'Set start time, end time, and "Use of every" here. These bounds update when the preset, database, or device changes.',
      beforeShow: () => {
        document.getElementById('timeRange').checked = true;
        updateDateRangeModalButton();
      },
      anchorSelector: '#confirmDateTime',
      cardPlacement: 'below',
      showDataSourceModal: false,
      showDateTimeModal: true
    },
    {
      selectors: ['#confirmDateTime'],
      title: 'Retrieve From Date Range',
      text: 'Use this button to retrieve data directly from the date range modal.',
      showDataSourceModal: false,
      showDateTimeModal: true
    },
    {
      selectors: ['#retrieve'],
      title: 'Retrieve Data',
      text: 'Use this main button when you are in Last Packets mode.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['.soundModule .sensors'],
      title: 'Sensor Mapping',
      text: 'Each track can target a sensor from the retrieved data.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['.soundModule .readings'],
      title: 'Reading Mapping',
      text: 'Choose which reading for the selected sensor drives the notes.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['.soundModule .collapse-btn'],
      title: 'Sound Options',
      text: 'Use Sound Options to open the scrollable sound settings menu for this track.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['.soundModule .moduleBottomOptions'],
      title: 'Advanced Sound Controls',
      text: 'Here you can adjust tonic, scale, tessitura, sustain notes, and sound type.',
      beforeShow: () => {
        const collapseBtn = document.querySelector('.soundModule .collapse-btn');
        const options = document.querySelector('.soundModule .moduleBottomOptions');
        if (collapseBtn && options && (options.style.display === 'none' || options.style.display === '')) {
          collapseBtn.click();
        }
      },
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['#addModule'],
      title: 'Add Tracks',
      text: 'Add more sound modules to map multiple sensor readings.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: [
        '#play',
        '#stop',
        '#bpmContainer',
        '#speedOptions label[for="speed1x"]',
        '#speedOptions label[for="speed2x"]',
        '#speedOptions label[for="speed4x"]',
        '#speedOptions label[for="speed8x"]'
      ],
      title: 'Playback Controls',
      text: 'Use Play/Stop, BPM, and speed controls to audition results.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['#metadataButton'],
      title: 'Metadata',
      text: 'Open metadata for context about the current dataset.',
      showDataSourceModal: false,
      showDateTimeModal: false
    },
    {
      selectors: ['#clearWorkspace'],
      title: 'Clear Workspace',
      text: 'Reset tracks and state when starting a new exploration.',
      showDataSourceModal: false,
      showDateTimeModal: false
    }
  ];

  const overlay = document.createElement('div');
  overlay.className = 'onboarding-overlay';

  const card = document.createElement('div');
  card.className = 'onboarding-card';
  card.innerHTML = `
    <div class="onboarding-title"></div>
    <div class="onboarding-text"></div>
    <div class="onboarding-footer">
      <span class="onboarding-progress"></span>
      <div class="onboarding-controls">
        <button type="button" class="onboarding-btn onboarding-skip">Skip</button>
        <button type="button" class="onboarding-btn onboarding-back">Back</button>
        <button type="button" class="onboarding-btn onboarding-next">Next</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(card);

  const titleEl = card.querySelector('.onboarding-title');
  const textEl = card.querySelector('.onboarding-text');
  const progressEl = card.querySelector('.onboarding-progress');
  const skipBtn = card.querySelector('.onboarding-skip');
  const backBtn = card.querySelector('.onboarding-back');
  const nextBtn = card.querySelector('.onboarding-next');

  let stepIndex = 0;
  let highlightedEls = [];

  function clearHighlight() {
    if (highlightedEls.length === 0) return;
    highlightedEls.forEach(el => el.classList.remove('onboarding-highlight'));
    highlightedEls = [];
  }

  function placeCard(target, placement = 'auto') {
    const rect = target.getBoundingClientRect();
    const margin = 12;
    const cardRect = card.getBoundingClientRect();
    const maxTop = window.innerHeight - cardRect.height - margin;
    const maxLeft = window.innerWidth - cardRect.width - margin;

    function clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }

    const positions = {
      below: {
        top: rect.bottom + margin,
        left: rect.left + (rect.width - cardRect.width) / 2
      },
      above: {
        top: rect.top - cardRect.height - margin,
        left: rect.left + (rect.width - cardRect.width) / 2
      },
      right: {
        top: rect.top + (rect.height - cardRect.height) / 2,
        left: rect.right + margin
      },
      left: {
        top: rect.top + (rect.height - cardRect.height) / 2,
        left: rect.left - cardRect.width - margin
      }
    };

    const orderedPlacements = placement === 'auto'
      ? ['below', 'above', 'right', 'left']
      : [placement, 'below', 'above', 'right', 'left'];

    let chosen = positions.below;
    for (const candidate of orderedPlacements) {
      const p = positions[candidate];
      if (
        p.top >= margin &&
        p.left >= margin &&
        p.top <= maxTop &&
        p.left <= maxLeft
      ) {
        chosen = p;
        break;
      }
    }

    const top = clamp(chosen.top, margin, maxTop);
    const left = clamp(chosen.left, margin, maxLeft);
    card.style.top = `${top}px`;
    card.style.left = `${left}px`;
  }

  function closeTour(markComplete = true) {
    clearHighlight();
    overlay.remove();
    card.remove();
    document.body.classList.remove('onboarding-modal-lock');
    onboardingLockTargets.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.classList.remove('onboarding-locked');
    });
    document.getElementById('dataSourceModal').style.display = 'none';
    document.getElementById('dateTimeModal').style.display = 'none';
    document.getElementById('dataSourceModal').classList.remove('onboarding-modal-active');
    document.getElementById('dateTimeModal').classList.remove('onboarding-modal-active');
    activeOnboardingSession = null;
    resetToLastPacketsMode();
    if (markComplete && !manual) {
      setOnboardingComplete();
    }
    window.removeEventListener('resize', handleViewportUpdate);
    window.removeEventListener('scroll', handleViewportUpdate, true);
  }

  function renderStep() {
    if (stepIndex < 0) stepIndex = 0;
    if (stepIndex >= steps.length) {
      closeTour(true);
      return;
    }

    const step = steps[stepIndex];
    if (typeof step.beforeShow === 'function') {
      step.beforeShow();
    }

    if (dataSourceModal) {
      dataSourceModal.style.display = step.showDataSourceModal ? 'flex' : 'none';
      dataSourceModal.classList.toggle('onboarding-modal-active', !!step.showDataSourceModal);
    }
    if (dateTimeModal) {
      dateTimeModal.style.display = step.showDateTimeModal ? 'flex' : 'none';
      dateTimeModal.classList.toggle('onboarding-modal-active', !!step.showDateTimeModal);
    }

    const lockToModal = !!(step.showDataSourceModal || step.showDateTimeModal);
    document.body.classList.toggle('onboarding-modal-lock', lockToModal);
    onboardingLockTargets.forEach(selector => {
      const el = document.querySelector(selector);
      if (el) el.classList.toggle('onboarding-locked', lockToModal);
    });

    const targets = (step.selectors || [])
      .map(selector => document.querySelector(selector))
      .filter(Boolean);

    if (targets.length === 0) {
      stepIndex += 1;
      renderStep();
      return;
    }

    clearHighlight();
    highlightedEls = targets;
    highlightedEls.forEach(el => el.classList.add('onboarding-highlight'));
    const anchorTarget = step.anchorSelector
      ? (document.querySelector(step.anchorSelector) || targets[0])
      : targets[0];

    anchorTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });

    titleEl.textContent = step.title;
    textEl.textContent = step.text;
    progressEl.textContent = `${stepIndex + 1}/${steps.length}`;
    backBtn.disabled = stepIndex === 0;
    nextBtn.textContent = stepIndex === steps.length - 1 ? 'Finish' : 'Next';

    requestAnimationFrame(() => placeCard(anchorTarget, step.cardPlacement || 'auto'));
  }

  function handleViewportUpdate() {
    if (highlightedEls.length === 0) return;
    placeCard(highlightedEls[0]);
  }

  skipBtn.addEventListener('click', () => closeTour(true));
  backBtn.addEventListener('click', () => {
    stepIndex -= 1;
    renderStep();
  });
  nextBtn.addEventListener('click', () => {
    stepIndex += 1;
    renderStep();
  });

  window.addEventListener('resize', handleViewportUpdate);
  window.addEventListener('scroll', handleViewportUpdate, true);

  activeOnboardingSession = {
    close: closeTour
  };

  renderStep();
}

// Attach a single event listener to the speedOptions container
document.getElementById('speedOptions').addEventListener('change', handleSpeedChange);

document.addEventListener('DOMContentLoaded', () => {

  const row = document.querySelector('.topmenu .row');
  const startTourLink = document.getElementById('startTourLink');
  
  // Wrap specific sections in draggable containers
  const sections = [
    // Section 1: Dataset controls (Preset → Retrieve)
    {
      items: ['#openPresetModal', '#dataOptions', '.packet-inputs-group', '#retrieve'],
      name: 'dataset-section'
    },
    // Section 2: Metadata
    {
      items: ['.group:has(#metadataButton)'],
      name: 'metadata-section'
    },
    // Section 3: Playback (Volume → Speed)
    {
      items: ['.control-group', '.transport-group:has(#play)', '#bpmContainer', '#speedOptions'],
      name: 'playback-section'
    },
    // Section 4: Tools (Multi-function grid + Refresh)
    {
      items: ['.multi-function-grid:not(#speedOptions)', '.group:has(#refresh)'],
      name: 'tools-section'
    },
    // Section 5: Clear Workspace
    {
      items: ['.group:has(#clearWorkspace)'],
      name: 'clear-section'
    }
  ];

  sections.forEach(section => {
    // Create wrapper for this section
    const wrapper = document.createElement('div');
    wrapper.className = `draggable-section ${section.name}`;
    
    // Create drag handle
    const handle = document.createElement('span');
    handle.className = 'drag-handle';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'grip-vertical');
    handle.appendChild(icon);
    
    wrapper.appendChild(handle);
    
    // Move items into wrapper
    section.items.forEach(selector => {
      const item = row.querySelector(selector);
      if (item) {
        wrapper.appendChild(item);
      }
    });
    
    row.appendChild(wrapper);
  });
  
  // Make sections draggable
  Sortable.create(row, {
    animation: 150,
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    draggable: '.draggable-section',
    handle: '.drag-handle',
    onEnd: function(evt) {
      console.log('Section moved from', evt.oldIndex, 'to', evt.newIndex);
    }
  });

  function updateToolbarScale() {
  const DESIGN_WIDTH = 1440;
  const MIN_SCALE    = 0.45;

  const raw   = window.innerWidth / DESIGN_WIDTH;
  // Clamp to a minimum but allow unlimited growth above 1.0
  // Use 0.99 instead of 1.0 as the effective baseline to prevent
  // 1-2px overflow from sub-pixel rounding at exact design width
  const scale = Math.max(MIN_SCALE, raw * 0.99);

  document.documentElement.style.setProperty('--tb-scale', scale);
  }

  // Run immediately — sized before first paint
  updateToolbarScale();

  // Debounced resize handler
  let _tbScaleTimer;
  window.addEventListener('resize', () => {
    clearTimeout(_tbScaleTimer);
    _tbScaleTimer = setTimeout(updateToolbarScale, 30);
  });

  // Initialize Lucide icons
  lucide.createIcons();

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
  
  // === POP-UP Functionally for Preset, Database, and Device ===
  const modal = document.getElementById('dataSourceModal');
  const closeBtn = document.querySelector('.close-modal');
  const confirmBtn = document.getElementById('confirmDataSource');
  openPresetBtn = document.getElementById('openPresetModal');  
  const modalPresetDropdown = document.getElementById('modalPreset');

  // Show modal when clicking the preset button
  openPresetBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });

  // Close modal when X is clicked
  closeBtn.addEventListener('click', () => {
    if (modal.classList.contains('onboarding-modal-active')) return;
    modal.style.display = 'none';
  });

  // Close modal when clicking outside
  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      if (modal.classList.contains('onboarding-modal-active')) return;
      modal.style.display = 'none';
    }
  });

  // Confirm selection and close modal
  confirmBtn.addEventListener('click', () => {
    const selectedDatabase = document.getElementById('databases').value;
    const selectedDevice = document.getElementById('devices').value;
    const selectedPreset = document.getElementById('modalPreset').value;
    
    if (selectedDatabase !== 'default' && selectedDevice !== 'default') {
      // Update the button text to show what was selected
      if (selectedPreset !== 'default') {
        const presetData = JSON.parse(selectedPreset);
        // Clear button
        openPresetBtn.textContent = '';
        
        // Add preset name
        openPresetBtn.textContent = presetData.name;
      } else {
        openPresetBtn.textContent = `${selectedDatabase} - ${selectedDevice}`;
      }
      modal.style.display = 'none';
      saveState();
    } else {
      alert('Please select both a database and a device');
    }
  });


  // === Date/Time Range Modal Functionality ===
  const dateTimeModal = document.getElementById('dateTimeModal');
  const closeDateModal = document.getElementById('closeDateModal');
  const confirmDateTime = document.getElementById('confirmDateTime');
  const dateRangeText = document.getElementById('dateRangeText');

  const startTimeInput = document.getElementById('startTime');
  const endTimeInput = document.getElementById('endTime');
  const modalStartTime = document.getElementById('modalStartTime');
  const modalEndTime = document.getElementById('modalEndTime');
  const modalPrescaler = document.getElementById('modalPrescaler');
  const prescalerInput = document.getElementById('prescaler');

  // Open modal when Date Range radio is clicked (using the span to detect re-clicks)
  const dateRangeLabel = document.getElementById('dateRangeLabel');
  const timeRangeRadio = document.getElementById('timeRange');
  updateDateRangeModalButton();

  dateRangeLabel.addEventListener('click', (e) => {
    // Check if clicking on the label/span (not the radio itself) or if radio is already checked
    if (e.target !== timeRangeRadio || timeRangeRadio.checked) {
      setTimeout(() => {
        dateTimeModal.style.display = 'flex';
        dateRangeConfirmed = false;
        updateDateRangeModalButton();
        
        // Pre-populate modal with current values if they exist
        if (startTimeInput.value) modalStartTime.value = startTimeInput.value;
        if (endTimeInput.value) modalEndTime.value = endTimeInput.value;
        if (prescalerInput.value) modalPrescaler.value = prescalerInput.value;
      }, 10);
    }
  });

  // Add listener to Last Packets radio to clear date range display
  const lastXPacketsRadio = document.getElementById('lastXPackets');
  lastXPacketsRadio.addEventListener('change', () => {
    if (lastXPacketsRadio.checked) {
      // Clear the date range display
      dateRangeText.textContent = 'Date Range';
      // Clear the hidden inputs
      startTimeInput.value = '';
      endTimeInput.value = '';
      prescalerInput.value = '1';
      // Clear the modal inputs
      modalStartTime.value = '';
      modalEndTime.value = '';
      modalPrescaler.value = '1';
      // Reset confirmation 
      dateRangeConfirmed = false;
      saveState();
    }
  });

  // Close modal when X is clicked
  closeDateModal.addEventListener('click', () => {
    if (dateTimeModal.classList.contains('onboarding-modal-active')) return;
    dateTimeModal.style.display = 'none';
    
    // Only reset if user hasn't confirmed a date range
    if (!dateRangeConfirmed) {
      lastXPacketsRadio.checked = true;
      document.getElementById('numpacketsInput').style.display = '';
      document.getElementById('skipPackets').style.display = '';
      dateRangeText.textContent = 'Date Range';
    }
  });

  // Apply selections and close modal
  confirmDateTime.addEventListener('click', () => {
    // Validate that both dates are selected
    if (!modalStartTime.value || !modalEndTime.value) {
      alert('Please select both start and end times');
      return;
    }

    if (modalStartTime.value >= modalEndTime.value) {
      alert('End time must be after start time');
      return;
    }

    // Apply values to hidden inputs
    startTimeInput.value = modalStartTime.value;
    endTimeInput.value = modalEndTime.value;
    prescalerInput.value = modalPrescaler.value;

    // Update the radio button label text to show selected dates
    const startDate = new Date(modalStartTime.value).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    const endDate = new Date(modalEndTime.value).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
    
    dateRangeText.textContent = `${startDate} - ${endDate}`;
    dateRangeConfirmed = true; // Mark as confirmed
    dateTimeModal.style.display = 'none';
    saveState();
    updateDateRangeModalButton();

    if (timeRangeRadio.checked) {
      retrieveData();
    }
  });

  // Close modal when clicking outside
  window.addEventListener('click', (e) => {
    if (e.target === dateTimeModal) {
      if (dateTimeModal.classList.contains('onboarding-modal-active')) return;
      dateTimeModal.style.display = 'none';
      
      // Only reset if user hasn't confirmed a date range
      if (!dateRangeConfirmed) {
        resetToLastPacketsMode();
      }
    }
  });

  // ==== Popover functionality for Metadata and Packet Refresh info buttons ====
  const popover = document.getElementById('popover');
  const popoverBody = popover.querySelector('.popover-body');
  const popoverClose = popover.querySelector('.popover-close');

  const popover1 = document.getElementById('popover1');
  const popover1Body = popover1.querySelector('.popover-body');
  const popover1Close = popover1.querySelector('.popover-close');

  const popover2 = document.getElementById('popover2');
  const popover2Body = popover2.querySelector('.popover-body');
  const popover2Close = popover2.querySelector('.popover-close');


  function showPopover(button, content) {
    // Set content
    popoverBody.textContent = content;
    
    // Position popover below the button
    const rect = button.getBoundingClientRect();
    popover.style.display = 'block';
    popover.style.left = rect.left + 'px';
    popover.style.top = (rect.bottom + 8) + 'px';
  }

  function showPopover1(button, content) {
    popover1Body.textContent = content;
    const rect = button.getBoundingClientRect();
    popover1.style.display = 'block';
    // Align to right edge of button
    popover1.style.left = (rect.right - popover1.offsetWidth) + 'px';
    popover1.style.top = (rect.bottom + 8) + 'px';
  }

  function showPopover2(button, content) {
    popover2Body.textContent = content;
    const rect = button.getBoundingClientRect();
    popover2.style.display = 'block';
    popover2.style.left = rect.left + 'px';
    popover2.style.top = (rect.bottom + 8) + 'px';
  }

  function hidePopover() {
    popover.style.display = 'none';
  }

  function hidePopover1() {
    popover1.style.display = 'none';
  }

  function hidePopover2() {
    popover2.style.display = 'none';
  }

   popoverClose.addEventListener('click', (e) => {
      e.stopPropagation();
      hidePopover();
    });

    popover1Close.addEventListener('click', (e) => {
      e.stopPropagation();
      hidePopover1();
    });

    popover2Close.addEventListener('click', (e) => {
      e.stopPropagation();
      hidePopover2();
    });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!popover.contains(e.target) && !e.target.closest('.icon-btn')) {
      hidePopover();
    }
    if (!popover1.contains(e.target) && !e.target.closest('.icon-btn')) {
      hidePopover1();
    }
    if (!popover2.contains(e.target) && !e.target.closest('.icon-btn')) {
      hidePopover2();
    }
  });

  const metadataHelp = document.getElementById('metadataHelp');
  const refreshHelp = document.getElementById('refreshHelp');
  
  if (metadataHelp) {
    metadataHelp.addEventListener('click', (e) => {
      e.stopPropagation();
      showPopover(e.currentTarget, 'Metadata shows device deployment information including date, location (latitude/longitude), and database owner.');
    });
  }
  
  if (refreshHelp) {
    refreshHelp.addEventListener('click', (e) => {
      e.stopPropagation();
      showPopover1(e.currentTarget, 'Reloads the latest packet data from your selected source while preserving your workspace configuration and tracks.');
    });
  }

  metadataBtn.addEventListener("click", (e) => {
  e.stopPropagation();

  if (!metadata) {
    showPopover2(e.currentTarget, "No available metadata");
    isMetadataDisplayed = true;
    return;
  }

  const metadataContent = `
    Deployment Date: ${metadata.deployment_date}\n
    Latitude: ${metadata.latitude}\n
    Longitude: ${metadata.longitude}\n
    Owner: ${metadata.owner}\n
    `;

  showPopover2(e.currentTarget, metadataContent);
  isMetadataDisplayed = true;
});

  // ====== UNDO/REDO button functionality ======
  const undoBtn = document.getElementById('undo');
  const redoBtn = document.getElementById('redo');

  if (undoBtn) {
    undoBtn.addEventListener("click", async () => {
      if (historyIndex > 0) {
        historyIndex--;
        await restoreState(historyStack[historyIndex]);
        showStatusMessage("Undone", "info");
      }
    });
  }

  if (redoBtn) {
    redoBtn.addEventListener("click", async () => {
      if (historyIndex < historyStack.length - 1) {
        historyIndex++;
        await restoreState(historyStack[historyIndex]);
        showStatusMessage("Redone", "info");
      }
    });
  }

  // Status message notification function
  function showStatusMessage(message, type = 'success') {
    const statusMessage = document.getElementById('status-message');
    statusMessage.textContent = message;
    statusMessage.className = `status-message show ${type}`;
    
    setTimeout(() => {
      statusMessage.className = 'status-message';
    }, 3000); // Hide after 3 seconds
  }

  // Initialize draggable toolbar sections
  const topmenu = document.querySelector('.topmenu');
  
  Sortable.create(topmenu, {
    animation: 150,
    handle: '.toolbar-drag-handle',
    ghostClass: 'sortable-ghost',
    dragClass: 'sortable-drag',
    direction: 'horizontal',
    
  });

  // Fetch databases and populate the dropdown
  fetchDatabases();

  // Set null before first module is created 
  retrievedData = null;

  // Create one soundModule on startup
  addSoundModule();

  document.getElementById('clearWorkspace').addEventListener('click', clearWorkspace);
  
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

  // Populate the preset dropdown with predefined database/device pairs
  predefinedPairs.forEach(pair => {
    // Add to modal preset dropdown
    let modalOption = document.createElement('option');
    modalOption.value = JSON.stringify(pair); // Store as a JSON string
    modalOption.textContent = pair.name;
    modalPresetDropdown.appendChild(modalOption);
  });
// Handle preset selection inside the popup 
  modalPresetDropdown.addEventListener('change', async (event) => {
    if (event.target.value !== 'default') {
      const presetData = JSON.parse(event.target.value);

      const databaseDropdown = document.getElementById('databases');
      const deviceDropdown = document.getElementById('devices');
      
      // Check if the database exists
      let databaseExists = [...databaseDropdown.options].some(
        option => option.value.trim() === presetData.database.trim()
      );
      
      if (databaseExists) {
        databaseDropdown.value = presetData.database;
        
        // Wait for devices to load before checking for the device
        await fetchDevices({ autoSelectFirst: false, refreshDates: false });
        
        // Check if the selected device exists in the updated dropdown
        let deviceExists = [...deviceDropdown.options].some(
          option => option.value.trim() === presetData.device.trim()
        );
        
        if (deviceExists) {
          deviceDropdown.value = presetData.device;
          await setDateBoundsForSelection(isTimeRangeSelected());
        } else {
          alert(
            `Warning: Device "${presetData.device}" not found in "${presetData.database}". Please select manually.`
          );
        }
      } else {
        alert(
          `Warning: Database "${presetData.database}" does not exist. Please select manually.`
        );
      }
      
    } else {
      // Reset and enable if "Select a preset" is chosen
      databaseDropdown.value = 'default';
      deviceDropdown.value = 'default';
      
    }
  });
  // Handle selection from the named dropdown

// Handle selection from the named dropdown
  const modalPreset = document.getElementById("modalPreset");
  modalPreset.addEventListener('change', async e => {
    handleDatasetChange(e);
    isMetadataDisplayed = false;
    metadataContainer.style.display = 'none';

    const metadataTxt = metadataBtn.querySelector('#metadataTxt');
    let metadataIcon = metadataBtn.querySelector('#metadataIcon');

    metadataIcon.setAttribute("data-lucide", "loader");
    metadataTxt.textContent = 'Loading...';
    lucide.createIcons();
    metadata = await retrieveMetadata();


    if (metadata == null) {
      metadataIcon = metadataBtn.querySelector('#metadataIcon');
      metadataIcon.setAttribute("data-lucide", "circle-off");
      lucide.createIcons();
      metadataTxt.textContent = 'No Metadata';
    } else {
      metadataIcon = metadataBtn.querySelector('#metadataIcon');
      metadataIcon.setAttribute("data-lucide", "codeXml");
      lucide.createIcons();
      metadataTxt.textContent = 'View Metadata';
    }

    return;
  });

  workspaceHasData = false;
  updateClearWorkspaceButton();

  //saveState(); // Save initial state for undo/redo
  updateUndoRedoButtons();

  if (startTourLink) {
    startTourLink.addEventListener('click', () => {
      startFirstTimeOnboarding({ manual: true });
    });
  }
  
  if (shouldRunOnboarding()) {
    setTimeout(() => {
      startFirstTimeOnboarding();
    }, 350);
  }
});

// Listener for "Dataset Name" dropdown
async function handleDatasetChange(event) {

  if (event.target.value === 'default') {
    return; 
  }

  // show the popup/modal
  document.getElementById('dataSourceModal').style.display = 'flex';

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
      await fetchDevices({ autoSelectFirst: false, refreshDates: false });

      // Check if the selected device exists in the updated dropdown
      let deviceExists = [...devicesDropdown.options].some(
        option => option.value.trim() === selectedPair.device.trim()
      );

      if (deviceExists) {
        devicesDropdown.value = selectedPair.device;
        await setDateBoundsForSelection(isTimeRangeSelected());
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
      resetDevicesAndDates();
    });
}

// Fetch devices based on the selected database and populate the dropdown
function fetchDevices(options = {}) {
  const { autoSelectFirst = true, refreshDates = true } = options;
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

          // Optionally auto-select first device for manual DB changes
          if (data.length > 0 && autoSelectFirst) {
            select.value = data[0];
            if (refreshDates) {
              await setDateBoundsForSelection(isTimeRangeSelected());
            }
          } else if (data.length === 0) {
            resetDates();
            updateDateRangeTextFromValues('', '');
          }

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

function resetDates() {
  const start = document.getElementById('startTime');
  const end = document.getElementById('endTime');
  ['min', 'max', 'value'].forEach(k => {
    start[k] = '';
    end[k] = '';
  });
}

function resetDevicesAndDates() {
  const devSel = document.getElementById('devices');
  devSel.innerHTML = '<option value="default">Select a sensor</option>';
  resetDates();
}

// e.g., call after devices populated or when device changes:
document.getElementById('devices').addEventListener('change', () => {
  setDateBoundsForSelection(isTimeRangeSelected());
});

document.getElementById('databases').addEventListener('change', fetchDevices);

// Event listener to each radio button
document.getElementsByName('packetOption').forEach(radio => {
  // Get the input fields
  let numpacketsInput = document.getElementById('numpacketsInput');
  // let timeInputs = document.getElementById('timeInputs');
  let skipPackets = document.getElementById('skipPackets');

  radio.addEventListener('change', async function () {
    // If "lastXPackets" is selected, show the "numpackets" and "prescaler" input fields and hide the "startTime" and "endTime" input fields
    if (this.value === 'lastXPackets') {
      numpacketsInput.style.display = '';
      skipPackets.style.display = '';
      updateDateRangeModalButton();
      //timeInputs.style.display = 'none';
    }
    // If "timeRange" is selected, hide the "numpackets" input field and show the "startTime", "endTime" and "prescaler" input fields
    else if (this.value === 'timeRange') {
      numpacketsInput.style.display = 'none';
      skipPackets.style.display = 'none';
      //timeInputs.style.display = 'block';
      dateRangeConfirmed = false;
      
      // await setDateBoundsForSelection(); // added 10/26

      const modalStartTime = document.getElementById('modalStartTime');
      const modalEndTime = document.getElementById('modalEndTime');
      const modalPrescaler = document.getElementById('modalPrescaler');
      const startTimeInput = document.getElementById('startTime');
      const endTimeInput = document.getElementById('endTime');
      const prescalerInput = document.getElementById('prescaler');
      
      modalStartTime.value = startTimeInput.value;
      modalEndTime.value = endTimeInput.value;
      modalPrescaler.value = prescalerInput.value;
      
      modalStartTime.min = startTimeInput.min;
      modalStartTime.max = startTimeInput.max;
      modalEndTime.min = endTimeInput.min;
      modalEndTime.max = endTimeInput.max;
      
      // Show the modal
      document.getElementById('dateTimeModal').style.display = 'flex';
      updateDateRangeModalButton();

      setDateBoundsForSelection().then(() => {
        // Update modal with new bounds after they load
        modalStartTime.value = startTimeInput.value;
        modalEndTime.value = endTimeInput.value;
        modalStartTime.min = startTimeInput.min;
        modalStartTime.max = startTimeInput.max;
        modalEndTime.min = endTimeInput.min;
        modalEndTime.max = endTimeInput.max;
      });
    } else {
      // added 10/26
      numpacketsInput.style.display = '';
    
      resetDates();
    }
  });
});

// Main function to retrieve data and initialize modules
async function retrieveData() {
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
  let metadataUrl;

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

    url = `/data/?database=${db}&collection=${collection}` +
          `&startTime=${encodeURIComponent(startTime)}` +
          `&endTime=${encodeURIComponent(endTime)}` +
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
        workspaceHasData = false;
        updateClearWorkspaceButton();
        return;
      }

      const params = getRetrievalParams();
      currentDatasetKey = makeDatasetKey(params);
      cacheDataset(currentDatasetKey, retrievedData);

      data.sort(
        (a, b) =>
          new Date(fixTimestamp(a.Timestamp.time_local)) -
          new Date(fixTimestamp(b.Timestamp.time_local))
      );

      console.log(data);

      // Populate sound modules with the retrieved data
      for (let m of soundModules) {
        initializeModuleSelects(m, data);
        
        const s = m.querySelector('.sensors');
        const r = m.querySelector('.readings');
        //if (s) s.disabled = false;
        //if (r) r.disabled = false;

        restoreSelects(m);
      }
      
      workspaceHasData = true;
      updateClearWorkspaceButton();

      saveState(); // Save state after data retrieval and module initialization
      setDateBoundsForSelection();
    })
    .catch(error => console.error('Error:', error));
}

document.getElementById('retrieve').onclick = retrieveData;

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

    // Sensor order
    const sensorOrder = ['SHT31', 'TSL2591', 'MS5803_118', 'MS5803_119', 'TippingBucket', 'Teros10', 'A55311', 'DFR_MultiGas_0', 'DFR_MultiGas_1', 'DFR_MultiGas_2', 'T6793', 'Analog']; 

    // Sort keys
    keys.sort((a, b) => {
      const indexA = sensorOrder.indexOf(a);
      const indexB = sensorOrder.indexOf(b);
      
      // If both are in the order array, sort by their position
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      
      // If only A is in the array, A comes first
      if (indexA !== -1) return -1;
      
      // If only B is in the array, B comes first
      if (indexB !== -1) return 1;
      
      // If neither is in the array, sort alphabetically
      return a.localeCompare(b);
    });

    // Add each key as an option to the sensors select element
    keys.forEach(key => {
      if (key === '_id' || key === 'Timestamp' || key === 'WiFi') return;
      let option = document.createElement('option');
      option.value = key;
      option.textContent = sensorDisplayName(key);
      sensorsSelect.appendChild(option);
    });

    // Initialize readings select element
    setReadings(soundModules.indexOf(module));

    // Enable dropdowns now that they have data
    sensorsSelect.disabled = false;
    module.querySelector('.readings').disabled = false;
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
    // Special case for Analog sensor - add virtual "Volts" option
    if (sensor === 'Analog') {
      let option = document.createElement('option');
      option.value = 'Volts';
      option.text = 'Volts';
      selectReadings.appendChild(option);
    } else {
      // Normal handling for other sensors
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
      }
    }

    plot(moduleIdx);
  }
}

// Function called when a sound module value is updated
function updateSoundModule(moduleIdx) {
  if (!retrievedData) 
    return;
  
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

// <--------- GLOBAL X-AXIS ---------->

/* ================== GLOBAL STATE & RESIZE ================== */
let isSyncing = false;
let resizeTimer;

window.addEventListener('resize', function() {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function() {
    // 1. Find the current range from any active plot
    const firstPlot = document.querySelector(".plot.js-plotly-plot");
    if (!firstPlot) return;

    const xMin = firstPlot.layout.xaxis.range[0];
    const xMax = firstPlot.layout.xaxis.range[1];

    // 2. Recalculate ticks
    const tMin = new Date(xMin).getTime();
    const tMax = new Date(xMax).getTime();
    const allData = Object.values(plotXData).flat();
    const masterTicks = getGlobalTicks(tMin, tMax, allData);

    // 3. Force Resize and Relayout for Universal Axis
    const timelineDiv = document.getElementById('globalTimeline');
    if (timelineDiv && timelineDiv.classList.contains('js-plotly-plot')) {
        Plotly.relayout(timelineDiv, {
            'xaxis.range': [xMin, xMax],
            'xaxis.tickvals': masterTicks.tickVals,
            'xaxis.ticktext': masterTicks.tickText
        });
        Plotly.Plots.resize(timelineDiv);
    }

    // 4. Force Resize for all module plots
    document.querySelectorAll(".plot").forEach(p => {
      if (p.classList.contains('js-plotly-plot')) {
        Plotly.Plots.resize(p);
      }
    });
  }, 150); 
});

/* ================== HELPER FUNCTIONS ================== */

function getGlobalTicks(globalMin, globalMax, xData) {
  let visibleData = [];
  for (let i = 0; i < xData.length; i++) {
    if (xData[i] >= globalMin && xData[i] <= globalMax) {
      visibleData.push(xData[i]);
    }
  }

  // If no data is visible, return empty
  if (visibleData.length === 0) return { tickVals: [], tickText: [] };

  // If only one point is visible show it regardless 
  if (visibleData.length === 1) {
    let d = new Date(visibleData[0]);
    let label = d.toLocaleString('en-US', {
      year: '2-digit', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });
    return { tickVals: [visibleData[0]], tickText: [label] };
  }

  // Max gridlines based on screensize 
  const MAX_GRID_LINES = 9; 
  const containerWidth = document.getElementById('globalTimeline').offsetWidth || 1000;
  
  // Line density for data points that are close in time
  let calculatedLineCount = Math.max(6, Math.floor(containerWidth / 110));
  let targetLineCount = Math.min(calculatedLineCount, MAX_GRID_LINES);
  
  let tickStep = visibleData.length > targetLineCount 
                 ? Math.floor(visibleData.length / targetLineCount) 
                 : 1;

  let baseTickVals = [];
  for (let i = 0; i < visibleData.length; i += tickStep) {
    baseTickVals.push(visibleData[i]);
  }

  // Overlap protection for date tickvals
  const minPixelGap = containerWidth < 500 ? 140 : 110;
  const overlapThreshold = (globalMax - globalMin) * (minPixelGap / containerWidth); 
  
  let finalTickVals = [];
  let finalTickText = [];
  let lastKeptTime = -Infinity;

  baseTickVals.forEach((val) => {
    let d = new Date(val);
    let currentLabel = d.toLocaleString('en-US', {
      year: '2-digit', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    });

    if (val - lastKeptTime >= overlapThreshold) {
      // Show show date on 2nd, 4th, 6th, 8th kept line
      let isDateSlot = (finalTickVals.length % 2 !== 0);

      finalTickVals.push(val); 
      finalTickText.push(isDateSlot ? currentLabel : ""); 
      
      lastKeptTime = val;
    }
  });

  // Show date if there's only one data point (not skipping the first if it's
  // the only data point)
  if (finalTickText.length > 0 && finalTickText.every(t => t === "")) {
      finalTickText[0] = new Date(finalTickVals[0]).toLocaleString('en-US', {
        year: '2-digit', 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
      });
  }

  return { tickVals: finalTickVals, tickText: finalTickText };
}

// Universal axis
function buildGlobalTimeline(xData, xMin, xMax, masterTicks) {
  let timelineTrace = {
    x: xData,
    y: new Array(xData.length).fill(0),
    type: "scatter",
    mode: "markers",
    marker: { opacity: 0 },
    hoverinfo: "skip"
  };

  let layout = {
    height: 35, 
    // Do not change
    margin: { 
      l: 71, 
      r: 10, 
      b: 0, 
      t: 27 
    },
    xaxis: {
      type: "date",
      range: [xMin, xMax],
      side: "top",
      tickmode: "array",
      tickvals: masterTicks.tickVals,
      ticktext: masterTicks.tickText,
      tickangle: 0,
      automargin: false,
      gridcolor: "rgba(0, 0, 0, 0.54)",
      fixedrange: true,
      tickfont: {
        family: "Google Sans, sans-serif",
        size: 12,
        color: "rgb(0, 0, 0)"
      }
    },
    yaxis: { visible: false, fixedrange: true, range: [0, 1] },
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)"
  };

  Plotly.react("globalTimeline", [timelineTrace], layout, { responsive: true, displayModeBar: false });
}

// Sync universal x-axis and bottom plots
function syncThisPlot(plotElement, moduleIdx) {
  plotElement.removeAllListeners('plotly_relayout');
  plotElement.on('plotly_relayout', function(eventdata) {
    if (isSyncing) return;
    if (!(eventdata['xaxis.range[0]'] || eventdata['xaxis.autorange'] || eventdata['xaxis.range'])) return;

    isSyncing = true;
    try {
      let xData = plotXData[moduleIdx] || [];
      let xMin, xMax;

      if (eventdata['xaxis.range[0]']) {
        xMin = new Date(eventdata['xaxis.range[0]']).getTime();
        xMax = new Date(eventdata['xaxis.range[1]']).getTime();
      } else {
        xMin = Math.min(...xData);
        xMax = Math.max(...xData);
      }

      if (isNaN(xMin) || isNaN(xMax)) { isSyncing = false; return; }

      let masterTicks = getGlobalTicks(xMin, xMax, xData);

      // Update Header
      Plotly.relayout('globalTimeline', {
        'xaxis.range': [xMin, xMax],
        'xaxis.tickvals': masterTicks.tickVals,
        'xaxis.ticktext': masterTicks.tickText
      });

      // Update All Plots
      document.querySelectorAll(".plot").forEach(otherPlot => {
        if (otherPlot.classList.contains('js-plotly-plot')) {
          Plotly.relayout(otherPlot, {
            'xaxis.range': [xMin, xMax],
            'xaxis.tickvals': masterTicks.tickVals
          });
        }
      });
    } finally {
      setTimeout(() => { isSyncing = false; }, 20);
    }
  });
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
    let filteredData;
    let yData;
    
    // Special handling for virtual "Volts" reading
    if (sensor === 'Analog' && reading === 'Volts') {
      filteredData = retrievedData.filter(d => d.hasOwnProperty('Analog') && d.Analog.hasOwnProperty('Vbat'));
    } else {
      // Normal handling for other readings
      filteredData = retrievedData.filter(
        d => d.hasOwnProperty(sensor) && d[sensor].hasOwnProperty(reading)
      );
    }

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
      
      // Get yData based on reading type
      if (sensor === 'Analog' && reading === 'Volts') {
        yData = filteredData.map(d => d.Analog.Vbat);
      } else {
        yData = filteredData.map(d => d[sensor][reading]);
      }

      // Prepare Plot Data and Layout
      let xLabels = filteredData.map(d => new Date(fixTimestamp(d.Timestamp.time_local)).toLocaleString('en-US', { 
        year: "2-digit",
        month: "2-digit", 
        day: "2-digit", 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit"
      }));
      
      let hoverTexts = filteredData.map((d, i) => {
        let baseText = `Date: ${xLabels[i]}<br>Value: ${yData[i]}`;

        // Only add Analog data to hover if we're plotting the Analog sensor
        if (sensor === 'Analog' && d.Analog) {
          let vbat = d.Analog.Vbat ? d.Analog.Vbat.toFixed(2) : 'N/A';
          let vbat_mv = d.Analog.Vbat_MV ? d.Analog.Vbat_MV.toFixed(0) : 'N/A';

          return `${baseText}<br>Vbat: ${vbat}V<br>Vbat_MV: ${vbat_mv}mV`;
        }

        return baseText;
      });

      let plotData = [{
        x: xData,
        y: yData,
        type: 'scatter',
        mode: 'lines',
        line: { 
          width: 2, 
          color: 'blue' },
        text: hoverTexts,
        hoverinfo: 'text',
      }];

      let titleBar = m.querySelector('.plot-title-bar');
      let yAxisLabel = m.querySelector('.plot-yaxis-label');

      titleBar.textContent = `${sensorDisplayName(sensor)} - ${reading}`;
      yAxisLabel.textContent = `${reading} Value`;

      titleBar.style.display = 'block';
      yAxisLabel.style.display = 'flex';   // flex to preserve the centering/rotation

      // Create yaxis configuration
      let yAxisConfig = {  
        automargin: true,
        tickfont: {
          family: "Google Sans, sans-serif",
          size: 12,
          color: "rgb(0, 0, 0)"
        },
        ticksuffix: "   ",  // adds spacing to the right of tick labels
        showgrid: true,
        gridcolor: "#E1E1E1",
        gridwidth: 0.01     
      };

      let layout = {
        xaxis: {
          type: "date",
          showticklabels: false, 
          tickmode: "array",     
          showgrid: true,
          gridcolor: "#E1E1E1",  
          gridwidth: 0.1,
          layer: 'below traces'  
        },
        margin: { 
          l: 7, 
          r: 10,
          b: 10, 
          t: 10 
        },
        yaxis: yAxisConfig,
        autosize: true
      };

      // Add CSV button to Plotly's default buttons
      let csvButton = {
        name: 'csvDownload',
        title: 'Download Data as CSV',
        icon: {
          width: 24,
          height: 24,
          path: 'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7ZM14 2v4a2 2 0 0 0 2 2h4M8 13h2M8 17h2M14 13h2M14 17h2',
          color: '#fff'
        },
        click: csvDownload
      };

      // Add config parameter
      let config = {
        responsive: true,
        // Modify button order and inclusion
        modeBarButtons: [
          ['zoom2d', 'pan2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d', csvButton]
        ]
      };

      // Build plot
      Plotly.newPlot(m.querySelector('.plot'), plotData, layout, config);
 
      let currentPlotDiv = m.querySelector('.plot');

      plotXData[moduleIdx] = xData;
      let allTimestamps = Object.values(plotXData).flat();
      
      if (allTimestamps.length > 0) {
        let globalMin = Math.min(...allTimestamps);
        let globalMax = Math.max(...allTimestamps);
    
        let masterTicks = getGlobalTicks(globalMin, globalMax, xData);
    
        buildGlobalTimeline(xData, globalMin, globalMax, masterTicks);
    
        setTimeout(() => {
          document.querySelectorAll(".plot").forEach(p => {
            if (p.classList.contains('js-plotly-plot')) {
              Plotly.relayout(p, { 
                'xaxis.range': [globalMin, globalMax],
                'xaxis.tickmode': 'array',
                'xaxis.tickvals': masterTicks.tickVals 
              });
            }
          });
        }, 100);
      }
      syncThisPlot(currentPlotDiv, moduleIdx);
    }
  }
}


// Extract CSV generation into a reusable helper function
function generateCSV(plotElement, reading, sensor) {
  const traces = plotElement.data;
  if (!traces) return null;

  let csvContent = `Timestamp,${reading} Reading\n`;

  traces.forEach(trace => {
    for (let i = 0; i < trace.x.length; i++) {
      let timestamp = trace.x[i] ?? "";

      if (typeof timestamp === "number") {
        timestamp = new Date(timestamp).toLocaleString("en-US", { 
          year: "2-digit",
          month: "2-digit", 
          day: "2-digit", 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit",
          hour12: true
        }).replace(",", "");
      }

      csvContent += `${timestamp},${trace.y[i]}\n`;
    }
  });

  return csvContent;
}

// Modified single plot CSV download function
function csvDownload(m) {
  const moduleEl = m.closest('.soundModule');
  if (!moduleEl) {
    console.error("Could not find parent module");
    return;
  }

  let reading = moduleEl.parentNode.querySelector('.readings').value;
  let sensor = moduleEl.parentNode.querySelector('.sensors').value;

  const csvContent = generateCSV(m, reading, sensor);
  if (!csvContent) return;

  // Get display name for the sensor
  const displayName = sensorDisplayName(sensor);

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${displayName}_${reading}.csv`;  // Using display name here
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download all plots as ZIP
// Download all plots as ZIP
async function downloadAllPlots() {
  const zip = new JSZip();
  const processed = new Set();
  
  // Use the soundModules array that already tracks all modules
  if (soundModules.length === 0) {
    alert('No plots available to download');
    return;
  }

  soundModules.forEach((moduleEl, index) => {
    // Get the Plotly plot element within this module
    const plotElement = moduleEl.querySelector('.plot');
    if (!plotElement || !plotElement.data) {
      console.log(`Module ${index} has no plot data`);
      return;
    }

    // Get sensor and reading values from THIS module's selects
    const readingSelect = moduleEl.querySelector('.readings');
    const sensorSelect = moduleEl.querySelector('.sensors');
    
    const reading = readingSelect?.value;
    const sensor = sensorSelect?.value;
    
    if (!reading || !sensor) {
      console.log(`Module ${index} missing sensor or reading`);
      return;
    }

    // Create unique key for this sensor/reading pair (using raw sensor name)
    const key = `${sensor}_${reading}`;
    
    // Skip if already processed
    if (processed.has(key)) {
      console.log(`Skipping duplicate: ${key}`);
      return;
    }
    processed.add(key);

    // Generate CSV content
    const csvContent = generateCSV(plotElement, reading, sensor);
    if (csvContent) {
      // Get display name for the sensor
      const displayName = sensorDisplayName(sensor);
      
      // Add to ZIP with descriptive filename using display name
      zip.file(`${displayName}_${reading}.csv`, csvContent);
      console.log(`Added to ZIP: ${displayName}_${reading}.csv`);
    }
  });

  // Check if any files were added
  if (Object.keys(zip.files).length === 0) {
    alert('No data available to download');
    return;
  }

  console.log(`Creating ZIP with ${Object.keys(zip.files).length} files`);

  // Generate ZIP and trigger download
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(zipBlob);
  
  // Use timestamp in filename
  const timestamp = new Date().toISOString().slice(0, 10);
  link.download = `workspace_${timestamp}.zip`;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Add event listener to the download button
document.getElementById('download').addEventListener('click', downloadAllPlots);
// Add a helper function to fix timestamp format
function fixTimestamp(ts) {
  // Remove trailing 'Z' then split on 'T'
  let [datePart, timePart] = ts.replace('Z', '').split('T');
  if (!timePart) return ts; // fallback
  // Split time components and pad if necessary
  let parts = timePart.split(':').map(p => p.padStart(2, '0'));
  return `${datePart}T${parts.join(':')}Z`;
}


async function setDateBoundsForSelection(forceAutofill = false) {
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
      updateDateRangeTextFromValues('', '');
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

    // Autofill values if source changed in date-range mode, or if user has no confirmed custom range.
    if (forceAutofill || !dateRangeConfirmed) {
      startInput.value = minStr;
      endInput.value = maxStr;
    }

    const modalStartTime = document.getElementById('modalStartTime');
    const modalEndTime = document.getElementById('modalEndTime');
    if (modalStartTime && modalEndTime) {
      modalStartTime.min = minStr;
      modalStartTime.max = maxStr;
      modalEndTime.min = minStr;
      modalEndTime.max = maxStr;
      if (forceAutofill || !dateRangeConfirmed) {
        modalStartTime.value = minStr;
        modalEndTime.value = maxStr;
      }
    }

    if (isTimeRangeSelected()) {
      updateDateRangeTextFromValues(startInput.value, endInput.value);
    }

    console.log('Autofilled time range:', { minStr, maxStr });
  } catch (err) {
    console.error('Error fetching date range:', err);
  }
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

async function retrieveMetadata() {
  let db = document.getElementById('databases').value;
  let url = `/metadata?database=${db}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Error: ', error);
    return null;
  }
}
