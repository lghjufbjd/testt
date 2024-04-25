import { RetellWebClient } from "retell-client-js-sdk";
import { convertFloat32ToUint8, convertUint8ToFloat32 } from "./utils";
import anime from "animejs/lib/anime.es.js";

class ConversationCircle {
  constructor(sdk, options) {
    this.sdk = sdk;
    this.options = options;
    this.isActive = false;
    this.movingAnimation = null;
    this.wrapper = this.createCircle();
    this.setupListeners();
    this.audioContext = null;
    this.analyser = null;
    this.dataArray = null;
  }

  applyCss(element, styles) {
    Object.entries(styles).forEach(([key, value]) => {
      element.style[key] = value;
    });
  }
  startAudioContext() {
    this.audioContext = new (window.AudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
  }

  createCircle() {
    const wrapper = document.createElement("div");
    const container = document.createElement("div");
    const circle = document.createElement("div");
    const svg = document.createElement("object");
    const svgFill = "#5dfeca";
    const svgHeight = "30px";
    const svgWidth = "30px";
    svg.innerHTML = `
         <svg
            style="opacity: 0.6"
            xmlns="http://www.w3.org/2000/svg"
            xmlns:xlink="http://www.w3.org/1999/xlink"
            fill="${svgFill}"
            height="${svgHeight}"
            width="${svgWidth}"
            version="1.1"
            id="Layer_1"
            viewBox="0 0 512 512"
            xml:space="preserve"
          >
            <g>
              <g>
                <g>
                  <path
                    d="M448,128c-11.797,0-21.333,9.557-21.333,21.333v85.333c0,94.101-76.565,170.667-170.667,170.667     S85.333,328.768,85.333,234.667v-85.333C85.333,137.557,75.797,128,64,128c-11.797,0-21.333,9.557-21.333,21.333v85.333     c0,110.443,84.352,201.515,192,212.245v43.755c0,11.776,9.536,21.333,21.333,21.333c11.797,0,21.333-9.557,21.333-21.333v-43.755     c107.648-10.731,192-101.803,192-212.245v-85.333C469.333,137.557,459.797,128,448,128z"
                  />
                  <path
                    d="M213.333,234.667h-64c0,58.816,47.851,106.667,106.667,106.667s106.667-47.851,106.667-106.667h-64     c-11.797,0-21.333-9.557-21.333-21.333S286.869,192,298.667,192h64v-42.667h-64c-11.797,0-21.333-9.557-21.333-21.333     s9.536-21.333,21.333-21.333h64C362.667,47.851,314.816,0,256,0S149.333,47.851,149.333,106.667h64     c11.797,0,21.333,9.557,21.333,21.333s-9.536,21.333-21.333,21.333h-64V192h64c11.797,0,21.333,9.557,21.333,21.333     S225.131,234.667,213.333,234.667z"
                  />
                </g>
              </g>
            </g>
          </svg>
    `;
    circle.className = "circle";

    this.applyCss(wrapper, {
      margin: "100px",
      width: "150px",
      height: "150px",
      boxShadow: "rgba(148, 255, 210, 0.2) 0px 20px 50px 40px",
      borderRadius: "9999px",
    });

    this.applyCss(container, {
      overflow: "hidden",
      borderRadius: "9999px",
      position: "relative",
      width: "100%",
      height: "100%",
      background:
        "radial-gradient(54.28% 54.28% at 50% 49.91%, rgba(0, 0, 0, 0.11) 31.5%, rgba(128, 255, 204, 0.1) 83.01%, rgba(128, 255, 204, 0.26) 98%)",
      boxShadow:
        "rgba(128, 255, 204, 0.02) -5.604px -5.604px 280.193px 0px inset",
      backdropFilter: "blur(23.5362px)",
    });

    this.applyCss(circle, {
      cursor: "pointer",
      overflow: "hidden",
      borderRadius: "9999px",
      zIndex: "2",
      width: "100%",
      height: "100%",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundBlendMode: "normal, darken, normal",
      background:
        "radial-gradient(54.75% 54.75% at 50% 50%, rgba(0, 0, 0, 0.22) 70.24%, rgba(93, 254, 202, 0.6) 100%), linear-gradient(135deg, rgba(22, 35, 37, 0.54) 0%, rgba(93, 254, 202, 0) 100%), radial-gradient(50% 50% at 50% 50%, rgba(0, 0, 0, 0.22) 0%, rgba(93, 254, 202, 0.65) 90.5%)",
    });

    circle.appendChild(svg);
    container.appendChild(circle);
    wrapper.appendChild(container);
    document.body.appendChild(wrapper);

    return wrapper;
  }


setupAudioProcessing() {
  this.sdk.on("audio", (audioUint8Array) => {
    const blob = new Blob([audioUint8Array.buffer]);
    const reader = new FileReader();

    reader.onload = () => {
      const audioData = reader.result;
      this.audioContext.decodeAudioData(
        audioData,
        (audioBuffer) => {
          const source = this.audioContext.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(this.audioContext.destination);
          source.start();
          console.log("Audio decoded successfully");
        },
        (error) => {
          console.error("Error decoding audio data", error);
          console.log("Failed audio data:", audioData);
        }
      );
    };

    reader.readAsArrayBuffer(blob);
  });
}


  setupListeners() {
    this.wrapper.addEventListener("click", () => {
      this.startAudioContext();
      this.isActive = !this.isActive;
      if (this.isActive) {
        this.startConversation();
        if (this.movingAnimation) {
          this.movingAnimation.pause();
        }
      } else {
        this.sdk.stopConversation();
        this.moveUpDown();
      }
      this.toggleAnimation(this.isActive);
    });

    this.sdk.on("conversationEnded", () => {
      if (this.movingAnimation) {
        this.movingAnimation.pause();
      }
      this.moveUpDown();
    });
    this.setupAudioProcessing();
  }
  updateBrightness() {
    requestAnimationFrame(() => this.updateBrightness());
    this.analyser.getByteTimeDomainData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      const value = this.dataArray[i] / 128.0 - 1.0; // Normalize and center
      sum += value * value; // Sum of squares
    }
    const rms = Math.sqrt(sum / this.dataArray.length); // Root mean square
    const brightness = 0.8 + 0.2 * rms; // Scale brightness between 0.8 and 1.0
    this.wrapper.style.filter = `brightness(${brightness})`;
  }
  

  toggleAnimation(isActive) {
    this.wrapper.classList.toggle("circle-moving", !isActive);
    this.wrapper.classList.toggle("circle-static", isActive);
  }

  async startConversation() {
    try {
      const response = await fetch(
        `${this.options.addr}/register-call-on-your-server`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agent_id: this.options.agentId }),
        },
      );
      const data = await response.json();
      await this.sdk.startConversation({
        callId: data.call_id,
        sampleRate: data.sample_rate,
        enableUpdate: true,
      });
    } catch (error) {
      console.error("Error starting conversation:", error);
      this.toggleAnimation(true);
    }
  }

  moveUpDown() {
    if (!this.isActive) {
      this.movingAnimation = anime({
        targets: this.wrapper,
        translateY: [
          { value: -10, duration: 2000, easing: "easeInOutSine" },
          { value: 0, duration: 2000, easing: "easeInOutSine" },
        ],
        loop: true,
      });
    }
  }
}

// Usage example:
document.addEventListener("DOMContentLoaded", () => {
  const sdk = new RetellWebClient();
  const circle = new ConversationCircle(sdk, {
    agentId: "b80beb271c18b7dcb2d7b84c8e7117b7",
    addr: "http://localhost:8080",
  });
  circle.moveUpDown();
});
