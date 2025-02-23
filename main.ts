import { initWhiteboard } from './dm';  
import { setupButton } from './dm';     

document.querySelector("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="counter" type="button">Start</button>
    </div>

    <!-- Color and Action Buttons -->
    <div id="select">
      <button id="redButton" style="background-color: red; color: white;">Red</button>
      <button id="greenButton" style="background-color: green; color: white;">Green</button>
      <button id="blueButton" style="background-color: blue; color: white;">Blue</button>
      <button id="blackButton" style="background-color: black; color: white;">Black</button>
      <button id="eraseButton" style="background-color: white; color: black;">Erase</button>
      <button id="clearButton" style="background-color: gray; color: white;">Clear</button>
    </div>

    <!-- Whiteboard Canvas -->
    <canvas id="paint"></canvas>  
  </div>
`;

initWhiteboard();  
setupButton(document.querySelector("#counter") as HTMLElement);

