import {WebAudioAPI} from "./WebAudioAPI/build/lib/webAudioAPI";

(function () {

    /**
     * Object representing a mapping between an encoding file type and its unique internal code.
     * @constant {Object.<string, number>}
     */
    const EncodingType = {
        WAV: 1
    };

    let midiDevices = [], midiInstruments = [], audioDevices = [];
    const I32_MAX = 2147483647;

    const audioAPI = new WebAudioAPI();
    audioAPI.createTrack('defaultTrack');
    audioAPI.getAvailableMidiDevices().then(returnMidiDevice, fail);
    audioAPI.getAvailableAudioInputDevices().then(returnAudioDevice, fail);
    audioAPI.getAvailableInstruments('http://localhost:8000/extensions/WebMidi/instruments').then(
        instruments => instruments.forEach(
            instrument => midiInstruments.push(instrument)
        )
    );

    /**
     * Creates a list of all available MIDI devices
     * @param {[String]} devices - available MIDI device.
     */
    function returnMidiDevice(devices) {
        midiDevices = devices;
        console.log(devices);
    }

    /**
     * Creates a list of all available audio-input devices
     * @param {[String]} devices - available audio-input devices.
     */
    function returnAudioDevice(devices) {
        audioDevices = devices;
        console.log(devices);
    }

    /**
     * Runs when the audio API can't return a list of available devices.
     */
    function fail() {
        console.log('something went wrong');
    }

    /**
     * Connects a MIDI device to the WebAudioAPI
     * @param {String} device - Name of the MIDI device being connected.
     */
    function midiConnect(device) {
        if (device != "") {
            audioAPI.connectMidiDeviceToTrack('defaultTrack', device).then(() => {
                console.log('Connected to MIDI device!');
            });
            // audioAPI.registerMidiDeviceCallback(device, midiCallback);
        }
    }

    /**
     * Connects and audio input device to NetsBlox
     * @param {String} device - Name of the audio device being connected.
     */
    function audioConnect(device) {
        if (device != "") {
            audioAPI.connectAudioInputDeviceToTrack('defaultTrack', device).then(() => {
                console.log('Connected to audio device!');
            });
        }
    }

    /**
     * Connects an instrument sample to the WebAudioAPI
     * @param {String} instrument - Name of instrument being loaded.
     */
    function changeInsturment(instrument) {
        audioAPI.start();
        audioAPI.updateInstrument('defaultTrack', instrument).then(() => {
            console.log('Instrument loading complete!');
        });
    }

    /**
     * Exports an AudioClip as an audio file.
     * @async
     * @param {AudioClip} clip - the clip being exported.
     * @param {String} format - the format of the file being created.
     */
    async function exportClip(clip, format) {
        const wavLink = document.getElementById("wav-link");
        const blob = await clip.getEncodedData(EncodingType[format]);
        wavLink.href = URL.createObjectURL(blob, { type: "audio/wav" });
        wavLink.click();
    }

    /**
     * Converts an AudioClip k to a Snap! Sound.
     * @asyn
     * @param {AudioClip} clip - The clip being rendered.
     * @returns A Snap! Sound.
     */
    async function clipToSnap(clip) {
        const blob = await clip.getEncodedData(EncodingType['WAV']);
        const audio = new Audio(URL.createObjectURL(blob, { type: "audio/wav" }));
        return new Sound(audio, 'netsblox-sound');
    }

    class WebMidi extends Extension {
        
        constructor (ide) {
            super('WebMidi');
            this.ide = ide;
        }

        onOpenRole() {}

        getMenu() { return {}; }

        getCategories() {
            return [
                new Extension.Category('midi', new Color(235, 110, 110)),
            ];
        }

        getPalette() {
            const blocks = [
                new Extension.Palette.Block('setAudioDevice'),
                new Extension.Palette.Block('disconnectAudioDevice'),
                new Extension.Palette.Block('startRecordingAudio'),
                new Extension.Palette.Block('recordForDurationAudio'),
                new Extension.Palette.Block('setMidiDevice'),
                new Extension.Palette.Block('disconnectMidiDevice'),
                new Extension.Palette.Block('setInstrument'),
                new Extension.Palette.Block('startRecording'),
                new Extension.Palette.Block('recordForDuration'),
                new Extension.Palette.Block('stopRecording'),
                new Extension.Palette.Block('exportAudio'),
                new Extension.Palette.Block('convertToSnap'),
                new Extension.Palette.Block('playMidiNote'),
            ];
            return [
                new Extension.PaletteCategory('midi', blocks, SpriteMorph),
                new Extension.PaletteCategory('midi', blocks, StageMorph),
            ];
        }

        getBlocks() {
            function block(name, type, category, spec, defaults, action) {
                return new Extension.Block(name, type, category, spec, defaults, action).for(SpriteMorph, StageMorph);
            }
            return [
                block('setAudioDevice', 'command', 'music', 'audio device: %audioDevice', [''], function (device) {
                    audioConnect(device);
                }),
                block('disconnectAudioDevice', 'command', 'music', 'disconnect audio device', [], function () {
                    this.runAsyncFn(async () => {
                        await audioAPI.disconnectAudioInputDeviceFromTrack('defaultTrack');
                    }, { args: [], timeout: I32_MAX });
                }),
                block('startRecordingAudio', 'reporter', 'music', 'start recording audio', [], function () {
                    return audioAPI.recordAudioClip(
                        'defaultTrack', audioAPI.getCurrentTime()
                    );
                }),
                block('recordForDurationAudio', 'reporter', 'music', 'record audio for %n seconds', [0], function (time) {
                    return audioAPI.recordAudioClip(
                        'defaultTrack', audioAPI.getCurrentTime(), time
                    );
                }),
                block('playMidiNote', 'command', 'midi', 'play note', [], function (){
                    this.runAsyncFn(async() => {
                        await audioAPI.playNote('defaultTrack',)
                    })
                }),
                block('setMidiDevice', 'command', 'midi', 'midi device: %webMidiDevice', [''], function(device) {
                    midiConnect(device);
                }),
                block('disconnectMidiDevice', 'command', 'midi', 'disconnect midi device', [], function () {
                    this.runAsyncFn(async () => {
                        await audioAPI.disconnectMidiDeviceFromTrack('defaultTrack');
                    }, { args: [], timeout: I32_MAX });
                }),
                block('setInstrument', 'command', 'midi', 'instrument %webMidiInstrument', [''], function(instrument) {
                    changeInsturment(instrument);
                }),
                block('startRecording', 'reporter', 'midi', 'start recording', [], function() {
                    return audioAPI.recordMidiClip(
                        'defaultTrack', audioAPI.getCurrentTime()
                    );
                }),
                block('recordForDuration', 'reporter', 'midi', 'record for %n seconds', [0], function(time) {
                    return audioAPI.recordMidiClip(
                        'defaultTrack', audioAPI.getCurrentTime(), time
                    );
                }),
                block('stopRecording', 'command', 'midi', 'stop recording %s', ['clip'], function(clip) {
                    this.runAsyncFn(async () => {
                        await clip.finalize();
                    }, { args: [], timeout: I32_MAX });
                }),
                block('exportAudio', 'command', 'midi', 'bounce %s as %fileFormats', ['clip'], function (clip, format) {
                    this.runAsyncFn(async () => {
                        await exportClip(clip, format);
                    }, { args: [], timeout: I32_MAX });
                }),
                block('convertToSnap', 'reporter', 'midi', 'convert %s to Snap! Sound', ['clip'], function (clip) {
                    return this.runAsyncFn(async () => {
                        return await clipToSnap(clip);
                    }, { args: [], timeout: I32_MAX });
                }),
            ];
        }

        getLabelParts() {
            function identityMap(s) {
                const res = {};
                for (const x of s) res[x] = x;
                return res;
            }
            return [
                new Extension.LabelPart('webMidiInstrument', () => new InputSlotMorph(
                    null, // text
                    false, //numeric
                    identityMap(midiInstruments),
                    true, // readonly (no arbitrary text)
                )),
                new Extension.LabelPart('webMidiDevice', () => new InputSlotMorph(
                    null, // text
                    false, //numeric
                    identityMap(midiDevices),
                    true, // readonly (no arbitrary text)
                )),
                new Extension.LabelPart('fileFormats', () => new InputSlotMorph(
                    null, // text
                    false, //numeric
                    identityMap(['WAV']),
                    true, // readonly (no arbitrary text)
                )),
                new Extension.LabelPart('audioDevice', () => new InputSlotMorph(
                    null, // text
                    false, //numeric
                    identityMap(audioDevices),
                    true, // readonly (no arbitrary text)
                )),
            ];
        }
    }

    
    // Music Staff and file export
    var scriptElement = document.createElement('script');
    scriptElement.onload = () => {
        var element = createDialog('WebMidi');
        element.querySelector('content').innerHTML =
            '<div id="output"></div>' +
            '</div > ' +
            '<a id="wav-link" download="netsblox.wav" style="display: none;"></a>';
        setupDialog(element);
        externalVariables['webmidilog'] = element;
    };
    scriptElement.setAttribute('src', 'https://gsteinltu.github.io/PseudoMorphic/script.js');
    document.head.appendChild(scriptElement);

    NetsBloxExtensions.register(WebMidi);
})();