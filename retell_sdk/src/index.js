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
    this.audioContext = new window.AudioContext();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 256;
  }

  createCircle() {
    // Base HSL color
    const hslBase = { h: 328.74, s: 82.61, l: 54.9 };

    // Function to generate HSLA colors with transparency
    const generateHSLA = (h, s, l, a) => `hsla(${h}, ${s}%, ${l}%, ${a})`;

    // // Creating color variations with transparency

    const svgFill = generateHSLA(hslBase.h, hslBase.s, hslBase.l, 1); // Fully opaque
    const boxShadowColor = generateHSLA(
      hslBase.h + 10,
      hslBase.s,
      hslBase.l - 10,
      0.4,
    );
    const gradientColorStart = boxShadowColor;
    const gradientColorEnd = svgFill; // Use base color for end of gradient
    const linearGradientStart = generateHSLA(
      hslBase.h - 20,
      hslBase.s - 10,
      30,
      0.54,
    ); // Darker and less saturated with medium opacity
    const radialGradientEnd = generateHSLA(
      hslBase.h,
      hslBase.s,
      hslBase.l,
      0.65,
    ); // Base color with higher opacity

    // Elements creation
    const wrapper = document.createElement("div");
    const container = document.createElement("div");
    const circle = document.createElement("div");
    const svg = document.createElement("object");
    const svgHeight = "30px";
    const svgWidth = "30px";

    svg.innerHTML = `
    <svg width="${svgWidth}" height="${svgHeight}" viewBox="0 0 59 67" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path fill-rule="evenodd" clip-rule="evenodd" d="M23 24C29.6274 24 35 18.6274 35 12C35 5.37258 29.6274 0 23 0C18.6918 0 14.9139 2.27032 12.7973 5.67981C4.99049 12.0049 0 21.6696 0 32.5C0 51.5538 15.4462 67 34.5 67C38.5999 67 42.5328 66.2848 46.1807 64.9725C46.4514 64.9907 46.7246 65 47 65C53.6274 65 59 59.6274 59 53C59 46.3726 53.6274 41 47 41C40.7094 41 35.5493 45.8404 35.0411 52L35 52C23.9543 52 15 43.0457 15 32C15 28.5975 15.8496 25.3935 17.3484 22.5885C19.0325 23.4893 20.9566 24 23 24Z" fill="${svgFill}"/>
    </svg>
    `;
    circle.className = "circle";

    // Apply CSS styles using HSLA colors
    this.applyCss(wrapper, {
      margin: "100px",
      width: "150px",
      height: "150px",
      borderRadius: "9999px",
    });

    this.applyCss(container, {
      overflow: "hidden",
      borderRadius: "9999px",
      position: "relative",
      width: "100%",
      height: "100%",
      background: `radial-gradient(54.28% 54.28% at 50% 49.91%, ${gradientColorStart} 31.5%, ${gradientColorEnd} 98%)`,
      boxShadow: `-5.604px -5.604px 280.193px 0px inset ${gradientColorEnd}, 0px 20px 50px 40px ${boxShadowColor}`,
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
      background: `radial-gradient(54.75% 54.75% at 50% 50%, ${gradientColorStart} 70.24%, ${radialGradientEnd} 100%), linear-gradient(135deg, ${linearGradientStart} 0%, ${gradientColorEnd} 100%), radial-gradient(50% 50% at 50% 50%, ${gradientColorStart} 0%, ${radialGradientEnd} 90.5%)`,
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
          },
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
    return;
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

document.addEventListener("DOMContentLoaded", () => {
  const sdk = new RetellWebClient();
  const circle = new ConversationCircle(sdk, {
    agentId: "0ce0650ec5ea7cc362490d68fdab1699",
    addr: "http://localhost:8080",
  });
  circle.moveUpDown();
});
