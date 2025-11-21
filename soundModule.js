function createSoundModuleTemplate(moduleId) {
  return `
        <div class="soundModule" id="module${moduleId}">
            <!-- LEFT SIDE: All menu options -->
            <div class="leftMenu">
                <!-- X button at top corner -->
                <button class="removeModule" data-module-id="${moduleId}"></button>
                
                <!-- Top options: Volume, Sensor, Reading -->
                <div class="moduleTopOptions">
                    <div class="volumeContainer">
                        <label for="volume">Volume:</label>
                        <input type="range" class="volume" min="-60" max="3" value="-10">
                    </div>
                </div>

                <div class="moduleDataOptions">
                    <div class="sensorsContainer">
                        <label for="sensors">Sensor:</label>
                        <select class="sensors">
                        </select>
                    </div>

                    <div class="readingsContainer">
                        <label for="readings">Reading:</label>
                        <select class="readings">
                        </select>
                    </div>
                </div>
                
                <!-- Collapse button -->
                <button class="collapse-btn">▼</button>
                
                <!-- Bottom options (collapsible) -->
                <div class="moduleBottomOptions" style="display: none;">
                    <div>
                        <label for="sustainNotes">Sustain Notes:</label>
                        <input type="checkbox" class="sustainNotes" checked>
                        
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
                        </select>
                    </div>
                </div>
            </div>
            
            <!-- RIGHT SIDE: Plot -->
            <div class="rightPlot">
                <div class="plot"></div>
            </div>
        </div>`;
}

export { createSoundModuleTemplate };
