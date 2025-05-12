import { AnyActorRef, assign, createActor, fromPromise, setup, fromCallback } from "xstate";
import { speechstate, SpeechStateExternalEvent } from "speechstate";
import { createBrowserInspector } from "@statelyai/inspect";
import { KEY } from "./azure";




const inspector = createBrowserInspector();

const azureCredentials = {
  endpoint:
    "https://northeurope.api.cognitive.microsoft.com/sts/v1.0/issuetoken",
  key: KEY,
};

const settings = {
  azureRegion: "northeurope",
  azureCredentials: azureCredentials,
  asrDefaultCompleteTimeout: 0,
  asrDefaultNoInputTimeout: 5000,
  locale: "el-GR",
  ttsDefaultVoice: "el-GR-AthinaNeural", 
  //ttsDefaultVoice: "en-US-AvaNeural", //"el-GR-AthinaNeural",//"en-US-AvaNeural" // en-US-DavisNeural",
};

interface Frame {
  time: number;
  params: any;
}

interface Animation {
  FrameIndex: number;
  BlendShapes: number[][];
}

/* Grammar definition */
// interface Grammar {
//   [index: string]: { person?: string; day?: string; time?: string };
// }


// interface Move {
//   role: "assistant" | "user";
//   content: string;
// }


// const grammar: Grammar = {
//   vlad: { person: "Vladislav Maraev" },
//   aya: { person: "Nayat Astaiza Soriano" },
//   rasmus: { person: "Rasmus Blanck" },
//   monday: { day: "Monday" },
//   tuesday: { day: "Tuesday" },
//   "10": { time: "10:00" },
//   "11": { time: "11:00" },
// };








/* Helper functions */
// function isInGrammar(utterance: string) {
//   return utterance.toLowerCase() in grammar;
// }

// function getPerson(utterance: string) {
//   return (grammar[utterance.toLowerCase()] || {}).person;
// }


function captureCanvasImage(): string {
  const canvas = document.getElementById("paint") as HTMLCanvasElement;
  if (!canvas) {
      console.error("Canvas element not found!");
      return "";
  }

  
  const imageData = canvas.toDataURL("image/png").split(";base64,")[1]; //CHANGED jpeg to png to check the background 
  if (!imageData) {
      console.error("Image data is empty!");
  }
  return imageData;
}

//ADDITION Initial
// function captureCanvasImage(): string {
//   const canvas = document.getElementById("paint") as HTMLCanvasElement;
//   return canvas.toDataURL("image/jpeg").split(";base64,")[1]; // Convert to base64
// }
interface LabelMap {
  house?: boolean;
  tree?: boolean;
  nextTo?: boolean;
  apple?: boolean;
  table?: boolean;
  under?: boolean;
  box?: boolean;
  sun?: boolean;
  on?: boolean;
  car?: boolean;
  building?: boolean;
  left?: boolean;
  description?: string;
  in? : boolean;
  inFrontOf? : boolean;
  behind? :boolean;
  between? : boolean;
  obj1? : string; 
  obj2? : string; 
  obj3? : string; 
  relation? : string;

}

interface DrawingTask {
  prompt: string;
  english: string;
  labels: LabelMap;
  voice: string;
}



//initial tasks
// const drawingTasks: DrawingTask[] = [
//   { 
//     prompt: "Draw a house next to a tree.", 
//     labels: { house: true, tree: true, nextTo: true }
//   },
//   { 
//     prompt: "Draw an apple under a sun.", 
//     labels: {apple:true, table:true, under:true}
//   },
//   { 
//     prompt: "Draw an apple on a box.", 
//     labels: { apple: true, box: true, on: true }
//   },
//   { 
//     prompt: "Draw a sun to the left of a tree.", 
//     labels: { sun: true, tree: true, left: true }
//   }
// ];


// const drawingTasks2: DrawingTask[] = [
//   { 
//     prompt: "Draw an apple on the box.", 
//     labels: { apple: true, box: true, on: true }
//   },
//   { 
//     prompt: "Draw an apple in the box.", 
//     labels: { apple: true, box: true, in: true }
//   },
//   { 
//     prompt: "Draw an apple in front of the box.", 
//     labels: { apple: true, box: true, inFrontOf: true }
//   },
//   { 
//     prompt: "Draw an apple between the box and the tree.", 
//     labels: { apple: true, box: true, tree: true, between: true }
//   },
//   { 
//     prompt: "Draw an apple next to the box.", 
//     labels: { apple: true, box: true, nextTo: true }
//   },
//   { 
//     prompt: "Draw an apple behind the box.", 
//     labels: { apple: true, box: true, behind: true }
//   },
//   { 
//     prompt: "Draw an apple under the box.", 
//     labels: { apple: true, box: true, under: true }
//   }
// ];




// const drawingTasks: DrawingTask[] = [
//   { 
//     prompt: "ένα μήλο πάνω στο κουτί.", 
//     labels: { apple: true, box: true, on: true }
//   },
//   { 
//     prompt: "ένα μήλο μέσα στο κουτί.", 
//     labels: { apple: true, box: true, in: true }
//   },
//   { 
//     prompt: "ένα μήλο μπροστά από το κουτί.", 
//     labels: { apple: true, box: true, inFrontOf: true }
//   },
//   { 
//     prompt: "ένα μήλο ανάμεσα στο κουτί και το δέντρο.", 
//     labels: { apple: true, box: true, tree: true, between: true }
//   },
//   { 
//     prompt: "ένα μήλο δίπλα στο κουτί.", 
//     labels: { apple: true, box: true, nextTo: true }
//   },
//   { 
//     prompt: "ένα μήλο πίσω από το κουτί.", 
//     labels: { apple: true, box: true, behind: true }
//   },
//   { 
//     prompt: "ένα μήλο κάτω από το κουτί.", 
//     labels: { apple: true, box: true, under: true }
//   }
// ];


const drawingTasks: DrawingTask[] = [
  { 
    prompt: "ένα μήλο πάνω στο κουτί.", 
    english: "an apple on the box",
    labels: { obj1: "apple", obj2: "box", relation: "on" },
    voice: "el-GR-AthinaNeural" // Greek voice
  },
  { 
    prompt: "ένα μήλο μέσα στο κουτί.", 
    english: "an apple in the box",
    labels: { obj1: "apple", obj2: "box", relation: "in" },
    //labels: { apple: true, box: true, in: true },
    voice: "el-GR-AthinaNeural" 
  },
  { 
    prompt: "ένα μήλο μπροστά από το κουτί.", 
    english: "an apple in front of the box",
    labels: { obj1: "apple", obj2: "box", relation: "in front of" },
    //labels: { apple: true, box: true, inFrontOf: true },
    voice: "el-GR-AthinaNeural" 
  },
  { 
    prompt: "ένα μήλο ανάμεσα στο κουτί και το δέντρο.", 
    english: "an apple between the box and the tree",
    labels: { obj1: "apple", obj2: "box", obj3: "tree", relation: "between" },
    //labels: { apple: true, box: true, tree: true, between: true },
    voice: "el-GR-AthinaNeural" 
  },
  { 
    prompt: "ένα μήλο δίπλα στο κουτί.", 
    english: "an apple next to the box",
    labels: { obj1: "apple", obj2: "box", relation: "next to" },
   // labels: { apple: true, box: true, nextTo: true },
    voice: "el-GR-AthinaNeural"
  },
  { 
    prompt: "ένα μήλο πίσω από το κουτί.", 
    english: "an apple behind the box",
    labels: { obj1: "apple", obj2: "box", relation: "behind" },
    //labels: { apple: true, box: true, behind: true },
    voice: "el-GR-AthinaNeural" 
  },
  { 
    prompt: "ένα μήλο κάτω από το κουτί.", 
    english: "an apple under the box",
    labels: { obj1: "apple", obj2: "box", relation: "under" },
    //labels: { apple: true, box: true, under: true },
    voice: "el-GR-AthinaNeural" 
  }
];








// const drawingTasks2 = [
//   {
//     prompt: "Draw a house next to a tree.",
//     elements: {
//       house: true,
//       tree: true,
//       nextTo: true, // Ensure this is properly initialized
//     }
//   },
//   {
//     prompt: "Draw a cat under a table.",
//     elements: {
//       cat: true,
//       table: true,
//       under: true,
//     }
//   },
//   {
//     prompt: "Draw a ball on the box.",
//     elements: {
//       ball: true,
//       box: true,
//       on: true,
//     }
//   },
//   {
//     prompt: "Draw a car to the left of a building.",
//     elements: {
//       car: true,
//       building: true,
//       left: true,
//     }
//   }
// ];



// const dearClient = ["Are you there?", "If you do not want to chat just click X", "Please answer to me", "Do you ignore me?"];
// function randomRepeat(myarray: any) {
//     const randomIndex = Math.floor(Math.random() * myarray.length);
//     return myarray[randomIndex];
// }


const negativeFeedback = [
  "Hmm, I think something is missing. Try again!",
  "You're doing great, but can you check if everything is in the right place?",
  "I love your effort! Let’s try one more time to make it just right!",
  "Hmm, I don’t see everything I expected. Can you add more?",
  "Great start! But let’s try to make it even better!",
  "You're so close! Let’s try again and make it perfect!",
  "Hmm, I don't think this is the correct drawing, try again",
];

function randomRepeat(myarray: any) {
  const randomIndex = Math.floor(Math.random() * myarray.length);
  return myarray[randomIndex];
}


interface MyDMContext extends DMContext {
  noinputCounter: number;
  availableModels?: string[];
  name: string;
  drawingIsValid?: boolean;
  currentTaskIndex: number;
  image64?: string;
  detectedObjects: Record<string, boolean>; // Example, a mapping of objects to true/false
  description: string;
  drawingTasks: { // 
    prompt: string; 
    labels: Record<string, boolean>; 
  }[];
  isCorrect: boolean;
  currentPrompt: string;


  
}

interface DMContext {
  count: number;
  ssRef: AnyActorRef;
  messages: Message[];
  prompt?: string;
  currentTaskIndex: number;
  detectedObjects: Record<string, boolean>; 
  drawingTasks: Array<{ prompt: string, labels: Record<string, boolean> }>;
  isCorrect: boolean;
  currentPrompt: string;


}

interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}

const FURHATURI = "localhost:8181/http://127.0.0.1:54321"    //"192.168.1.11:54321"; //"127.0.0.1:54321"; 

  async function fhSay(text: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(text);
  return fetch(`http://${FURHATURI}/furhat/say?text=${encText}&blocking=true`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  });
}


async function fhVoiceChange(voice: string) {
  const myHeaders = new Headers();
  myHeaders.append("accept", "application/json");
  const encText = encodeURIComponent(voice); 
  return fetch(`http://${FURHATURI}/furhat/voice?name=${encText}`, {
    method: "POST",
    headers: myHeaders,
    body: "",
  })
}


// Function to send logs to Flask API
async function logToAPI(message: string) {
  try {
    const response = await fetch('http://localhost:5000/log-message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message }), // Send message as JSON
    });

    const result = await response.json();
    console.log('Log sent successfully:', result);
  } catch (error) {
    console.error('Error sending log:', error);
  }
}



  const fhFetch = async (frames:any) => {
    return fetch(
      `http://localhost:8181/http://192.168.1.11:54321/furhat/gesture?blocking=false`,    //remote "127.0.0.1:54321"; //real "192.168.1.11:54321";

      {
        method: "POST",
        headers: { accept: "application/json", origin: "localhost" },
        body: JSON.stringify({
          name: "Viseme",
          frames: frames,
          class: "furhatos.gestures.Gesture",
        }),
      }
    );
  };

// interface MyDMContext extends DMContext {
//   noinputCounter: number;
//   availableModels?: string[];
//   name : string;
//   drawingIsValid?: boolean;

//  //currentTaskIndex: number;

// }
// interface DMContext {
//   count: number;
//   ssRef: AnyActorRef;
//   messages: Message[];
//   prompt? : string ;
//   image64?: string;
//   currentTaskIndex: number;
// }

// interface Message {
//   role: "assistant" | "user" | "system";
//   content: string;
// }
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" } | { type: "IMAGE_CAPTURED"; image: string ; } | {type: "PAINT"; image: string} | { type: "FURHAT_BLENDSHAPES"; value: Frame[] };
  },
  
  
  
  /* types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  }, */
  guards: {
    noinputCounterMoreThanOne: ({ context }) => {
      if (context.noinputCounter > 1) {
        return true;
      } else {
        return false;
      }
    },
  },
  actions: {

    encode_image: assign(() => {    //assign(({context})
      console.log("Encoding canvas image...");
      const imageData = captureCanvasImage();
      if (!imageData) {
          console.error("ERROR: Image capture failed, Base64 string is empty.");
      }
      return { image64: imageData };
  }),

//I THINK THIS WORKS 
    // encode_image: assign(() => {
    //   console.log("Encoding whiteboard drawing...");
    //   return { image64: captureCanvasImage() };
    // }),


  /* encode_image: assign(({}) => {
  console.log("base64 encoding image...");
  //PREPEEI NA TO DO AUTO 
  const canvas = <HTMLCanvasElement>document.getElementById("canvas");
  const image = canvas.toDataURL("image/jpeg").split(";base64,")[1];
  return { image64: image };
}), */





    /* define your actions here */
    speechstate_prepare: ({ context }) =>
      context.ssRef.send({ type: "PREPARE" }),
    speechstate_listen: ({ context }) => context.ssRef.send({ type: "LISTEN" }),
    speechstate_speak: ({ context }, params: { value: string; voice?: string; locale?: string; }) =>
      context.ssRef.send({ type: "SPEAK", value: { 
        utterance: params.value,
        voice: params.voice,
        locale: params.locale,
        visemes: true,
      }}),

   // speechstate_speak: ({ context }, params: { value: string }) =>
     // context.ssRef.send({ type: "SPEAK", value: { utterance: params.value } }),
      debug: (event) => console.debug(event),
    assign_noinputCounter: assign(({ context }, params?: { value: number }) => {
      if (!params) {
        return { noinputCounter: context.noinputCounter + 1 };
      }
      return { noinputCounter: context.noinputCounter + params.value };
    }),

    assign_currentTaskIndex: assign(({ context }, params?: { value: number }) => {
      if (!params) {
        return { currentTaskIndex: context.currentTaskIndex + 1 };
      }
      return { currentTaskIndex: context.currentTaskIndex + params.value };
    }),

  },

  

  
  actors: {

    fhBlendShape: fromPromise<any, { frames: Frame[] }>(({ input }) => {
      return fhFetch(input.frames);
    }),


    fhSpeak: fromPromise<any, { text: string}>(async ({ input }) => {
      return Promise.all([
        fhSay(input.text),
      ]);
    }),


    fhChangeVoice: fromPromise<any, {voice: string, character: string}>(async ({input}) => {
      return Promise.all([
       fhVoiceChange(input.voice),
    

      ])
     }),


    



  //   checkObjects: fromPromise<any, { model: string; image: string; currentTaskIndex: number; }>(
  //     async ({ input }) => {
  //         console.log(`Checking individual objects in image using ${input.model}...`);

  //         const currentTask = drawingTasks[input.currentTaskIndex];
  //         const detectedObjects: Record<string, boolean> = {};
  //         for (const keyword of currentTask.) {
  //             const prompt = `Does this drawing contain a ${keyword}? Reply only "true" or "false".`;

  //             const response = await fetch("http://localhost:11434/api/generate", {
  //                 method: "POST",
  //                 headers: { "Content-Type": "application/json" },
  //                 body: JSON.stringify({
  //                     model: "llava:13b",
  //                     prompt: prompt,
  //                     images: [input.image],
  //                 }),
  //             });

  //             const text = await response.text();
  //             const responseText = text.trim().toLowerCase();
  //             detectedObjects[keyword] = responseText.includes("true"); // Store true/false
  //         }

  //         return { detectedObjects };
  //     }
  // ),





// getBinaryClassification: fromPromise<any, { model: string; image: string; currentTaskIndex: number; }>(
//   ({ input }) => {
//     return new Promise((resolve, reject) => {
//       const currentTask = drawingTasks[input.currentTaskIndex];
//       const prompt = `Does this drawing contain ${Object.keys(currentTask.labels).join(", ")}? Reply only "true" or "false".`;

//       fetch("http://localhost:11434/api/generate", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           model: "llava",
//           prompt: prompt,
//           images: [input.image],
//         }),
//       })
//         .then(response => response.text())
//         .then(text => {
//           const responseText = text.trim().toLowerCase();
//           const isMatch = responseText === "true";
//           resolve({ isMatch });
//         })
//         .catch(error => reject(error));
//     });
//   }
// ),


getBinaryClassification: fromPromise<any, { model: string; image: string; currentTaskIndex: number }>(
  ({ input }) => {
    const currentTask = drawingTasks[input.currentTaskIndex];
    const { obj1, obj2, relation, obj3 } = currentTask.labels;

    const prompt = `You will be shown a drawing. Evaluate if it correctly matches the given description. 

Description: "${currentTask.english}"
Respond ONLY with a raw JSON object and nothing else.
Do NOT include any commentary, explanation, or text after the JSON.
Do NOT use code blocks or wrap the JSON in triple backticks.

Answer the following questions:
1. Is the following sentence correctly describing the image: "${currentTask.english}"?
2. Is this correct: the picture contains "${obj1}"?
3. Is this correct: the picture contains "${obj2}"?
4. Is this correct: the picture contains a relation "${relation}" between "${obj1}" and "${obj2}"${obj3 ? ` and "${obj3}"` : ""}?

Please reply with a JSON object:
{
  "sentence": true/false,
  "obj1": true/false,
  "obj2": true/false,
  "relation": true/false
}


`;

    return fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stream: false,
        temperature: 4, 
        model: input.model,
        prompt: prompt,
        images: [input.image],
      }),
    })
      .then((response) => response.json())
      .then((text) => {
        console.log("Raw model response:", text.response);

        const cleaned = text.response
          .replace(/^```json\s*/i, "")
          .replace(/^```/, "")
          .replace(/```$/, "")
          .trim();

        try {
          const result = JSON.parse(cleaned);
          


          fetch("http://127.0.0.1:5000/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
          prompt: currentTask.prompt,  
          log: result                
  })
});


          return result;
        } catch (e) {
          console.error("Invalid JSON response from model:", e);
          return { sentence: false, obj1: false, obj2: false, relation: false };
        }
      })

  }
),




    






getBinaryClassificationworks: fromPromise<any, { model: string; image: string; currentTaskIndex: number }>(
  ({ input }) => {
    const currentTask = drawingTasks[input.currentTaskIndex];
    const prompt = `Does this drawing contain ${currentTask.english}? Reply only "true" or "false".`;
    console.log(`Sending binary classification request with prompt: "${prompt}"`);
   // return fetch("http://mltgpu.flov.gu.se:11434/api/generate", {

  return fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stream: false, 
        model: input.model,
        prompt: prompt,
        images: [input.image],
      }),
    })
      .then((response) => response.json())
      .then((text) => {
        console.log(text)
        const responseText = text.response.trim().toLowerCase();
        console.log("This is the response", responseText)
        return { isMatch: responseText === "true" };
      })
      .catch((error) => {
        console.error("Error classification:", error);
        return { isMatch: false };
      });
  }
),

    setup_image: fromCallback(
      ({ sendBack, input }: { sendBack: any; input: string }) => {
        const element = document.querySelector("#img")!;
        element.innerHTML = `<canvas id="canvas" width="672" height="672"></canvas>`;
        const canvas = <HTMLCanvasElement>document.getElementById("canvas");
        const ctx = canvas.getContext("2d")!;
        const img = new Image();
        img.onload = () => {
          var hRatio = canvas.width / img.width;
          var vRatio = canvas.height / img.height;
          var ratio = Math.min(hRatio, vRatio);
          var centerShift_x = (canvas.width - img.width * ratio) / 2;
          var centerShift_y = (canvas.height - img.height * ratio) / 2;

          ctx.drawImage(
            img,
            0,
            0,
            img.width,
            img.height,
            centerShift_x,
            centerShift_y,
            img.width * ratio,
            img.height * ratio,
          );
          sendBack({ type: "IMAGE_LOADED" });
        };
        img.src = `img/${input}`;
      },
    ),





    getDescription: fromPromise<any, { model: string; image: string; /* currentTaskIndex: number; */ }>(
      async ({ input }) => {
        console.log(`Sending image to ${input.model} for description...`);
       // const currentTask = drawingTasks[input.currentTaskIndex];
        //const { obj1, obj2, relation, obj3 } = currentTask.labels;
        const prompt = `The user will draw something, and you must determine what it resembles. Respond with a sentence starting with 'I think that the drawing is a object1 <relation> object2}.} Keep it really simple, like you're talking to a 5-year-old. BE BRIEF.`;

        console.log(`Sending get description request with prompt: "${prompt}"`);
        const response = await fetch("http://localhost:11434/api/generate", {
          //const response = await fetch("http://mltgpu.flov.gu.se:11434/api/generate", {

          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            temperature: 4,
            model: "llava:34b",//"llava:13b",
            prompt: prompt,
            //prompt:  "Does this drawing show a house next to a tree? ONLY IF THE DRAWING DEPICTS A HOUSE NEXT TO A TREE correctly, use the words 'house', 'tree', and 'next to' together. If it's wrong, just say 'not yet correct'. Keep it really simple, like you're talking to a 5-year-old. BE BRIEF, JUST ANSWER THE QUESTION.",         
            
        //  prompt:"The user will draw something, and you must determine what it resembles. Respond with a sentence starting with 'I think that the drawing is a {object <preposition>object.}  Keep it really simple, like you're talking to a 5-year-old. BE BRIEF.", 
           // Log the actual prompt

            //"The user will draw something, and you must determine what it resembles. Respond with a sentence starting with 'I think that the drawing is a {fill in the gap with the most recognizable object.}, and it is in this position. If there are multiple objects, give the position related to the other object. ",
            //prompt: "In this task, the user is going to draw something and you will give say if it looks like something specific. BE BRIEF. DO NOT FORGET TO BE BRIEF",//"Describe this image in detail as if explaining it to a human.",
            images: [input.image],
          }),
        });
        
        // NDJSON format
        const text = await response.text();
        console.log("Raw NDJSON Response:", text);
        
        const lines = text.trim().split("\n").filter(line => line.trim() !== "");
        const data = lines.map(line => JSON.parse(line)); //JSON => object
        //JOIN ALL THE STRINGS, BECAUSE IN THE BEGINNING i WAS GETTING JUST ONE WORD
        const fullResponse = data.map(Object => Object.response).join("");
        console.log("Full Description:", fullResponse);
        
        // RETURN THE FULL RESPONSE
        return { model: data[0].model, response: fullResponse, done: data[data.length - 1].done };
      }
    ),



    
    
  


    






    get_ollama_models: fromPromise<any, null>(async () => {
      //return fetch("http://mltgpu.flov.gu.se:11434/api/tags").then((response) =>

      return fetch("http://localhost:11434/api/tags").then((response) =>
        response.json()
      );
    }),    
  LMactor : fromPromise<any,{prompt:Message[]}>(async ({input}) => {
      const body = {
        model: "llama3.1",
        stream: false,
        messages : input.prompt,
        temperature : 0.1
      };
     // return fetch("http://mltgpu.flov.gu.se:11434/api/chat", {

    return fetch("http://localhost:11434/api/chat", {
        method: "POST",
        body: JSON.stringify(body),
      }).then((response) => response.json());
    }),
  },
}).createMachine({
  context: ({ spawn }) => ({
    count: 0,
    ssRef: spawn(speechstate, { input: settings }),
    messages: [], //add in prompt
    noinputCounter: 0,
    name: "",
    currentTaskIndex: 0,
    detectedObjects: {},
    description: "",
    isCorrect: false,
    currentPrompt: "",
    // drawingTasks1: [
    //   { prompt: "Draw a house next to a tree.", elements: { house: true, tree: true, nextTo: true, cat: false, table: false } },
    //   { prompt: "Draw a cat under a table.", elements: { cat: true, table: true, under: true, house: false, tree: false } },
    //   { prompt: "Draw a ball on the box.", elements: { ball: true, box: true, on: true, house: false, tree: false } },
    //   { prompt: "Draw a car to the left of a building.", elements: { car: true, building: true, left: true, house: false, tree: false } }
    // ],

    drawingTasks: [],
    
    // moreStuff: {thingOne: 1, thingTwo: 2}
  }),
  id: "DM",
  initial: "Prepare",
  states: {
    Prepare: {
      entry: [{ type: "speechstate_prepare" }],
      on: { ASRTTS_READY: "WaitToStart" },
    },




    // WaitToStart: {
    //   on: {
    //     CLICK: {
    //      // actions: "encode_image",    // CAPTURE BUTTON
    //       target: "Main",   // DESCRIPTION
    //   },
    //     //CLICK: "PromptAndAsk",
    //   },
    // },

    // Main: {
    //   type: "parallel", 
    //   states: {
    //   FurhatGestures: {
    //     initial: "Idle",
    //     on: {
    //       FURHAT_BLENDSHAPES: {
    //         target: ".Animating",
    //         reenter: true,
    //       },
    //     },


    //     states: {
    //       Idle: {},
    //       Animating: {
    //         invoke: {
    //           id: "vis",
    //           src: "fhBlendShape",
    //           input: ({ event }) => ({
    //             frames: (event as any).value,
    //           }),
    //         },
    //       },
    //     },
    //   },
      
    
  
    // PromptAndAsk: {
    //   initial: "Prompt", //"GetDescription", "GreetUser"
    //   on: {
      
    // },
    //   states: {







  
 WaitToStart: {
      on: {
        CLICK: {
         // actions: "encode_image",    // CAPTURE BUTTON
          target: "PromptAndAsk",   // DESCRIPTION
      },
        //CLICK: "PromptAndAsk",
      },
    },
  
    PromptAndAsk: {
      initial: "Prompt", //"GetDescription", "GreetUser"
      on: {
      
    },
      states: {


  
Prompt: {
  invoke: {
    src: "fhSpeak",
    input: ({
      text: `Welcome to our world of drawing and learning. Today, we are going to discuss about prepositions, but first of all tell me your name.`
    }),
    onDone: {
      target: "ListenTheName"
    },
    
  }
},






        PromptWORKS: {
          entry: {
            type: "speechstate_speak",
            params: { 
              value: `<mstts:viseme type="FacialExpression"/> Welcome to our world of drawing and learning. Today, we are going to discuss about prepositions, but first of all tell me your name`, 
              voice: "en-US-AvaNeural",
              locale: "en-US",

            },
          },
          on: { SPEAK_COMPLETE: "ListenTheName" },
        },

   


        ListenTheName: {
          entry: { type: "speechstate_listen" },
          on: {
            RECOGNISED: {
              actions: assign({
                name: ({event}) => event.value[0].utterance.toLowerCase()}),
              target: "Processingname"
            }
          }

        },


        Processingname: {
          on: {
            LISTEN_COMPLETE: {
              target: "GreetUser",
              actions: () => console.log("Listen complete"),
            },
          },
        },


        GreetUser: {
          invoke: {
            src: "fhSpeak",
            input: ({ context }) => ({
              text: `Nice to meet you ${context.name}! Let's start drawing and learning prepositions. You are drawing and I will tell you if it's correct!`
            }),
            onDone: {
              target: "AskUserToDraw"
            },
          
          }
        },
        



        GreetUserWorks: {entry: {
          type: "speechstate_speak",
          params: ({ context }) => ({
          value: `<mstts:viseme type="FacialExpression"/>Nice to meet you ${context.name}! Let's start drawing and learning prepositions. You are drawing and I will tell you if it's correct!.`,
          locale: "en-US",
          voice: "en-US-AvaNeural" ,
          }),
        },
        on: { SPEAK_COMPLETE: "ChangeToGreekVoice"},//"AskUserToDraw"}, //"WaitBeforeCapture1" },
      },



      ChangeToGreekVoice: {
        invoke: {
          src: "fhChangeVoice",
          input: () => ({
            voice: "Dimitris22k_HQ",
            character: "default" // use the correct character name if you have one
          }),
          onDone: { target: "AskUserToDraw" },
        }
      },



      AskUserToDraw: {
  entry: [
    assign(({ context }) => {
      const currentTask = drawingTasks[context.currentTaskIndex];
      return {
        ...context,
        currentPrompt: currentTask.prompt
      };
    }),
    ({ context }) => {
      console.log("Entering AskUserToDraw with task:", context.currentPrompt);
    }
  ],
  invoke: {
    src: "fhSpeak",
    input: ({ context }) => ({
      text: context.currentPrompt
    }),
    onDone: { target: "WaitBeforeCapture1" }
  }
},

      
      

      AskUserToDrawIMPORTANT: {
        entry: ({ context }) => {
          const currentTask = drawingTasks[context.currentTaskIndex];
          console.log("Entering AskUserToDraw with task:", currentTask.prompt);
        },
        invoke: {
          src: "fhSpeak",
          input: ({ context }) => {
            const task = drawingTasks[context.currentTaskIndex];
            return {
              text: task.prompt
            };
          },
          onDone: { target: "WaitBeforeCapture1" },
        }
      },
      



    



      AskUserToDrawWORKS: {
        entry: [
          ({ context }) => {
            const currentTask = drawingTasks[context.currentTaskIndex];
            console.log("Entering AskUserToDraw with task:", currentTask.prompt); 
          },
          {
            
            type: "speechstate_speak",
            params: ({ context }) => {
              const currentTask = drawingTasks[context.currentTaskIndex];

              return {
                value: `<mstts:viseme type="FacialExpression"/>${currentTask.prompt}`,

                //value: currentTask.prompt,
                voice: currentTask.voice ?? "en-US-AvaNeural" 
              };
             //return { value: currentTask.prompt };
            }
          }
        ],
        on: { 
          SPEAK_COMPLETE: "WaitBeforeCapture1" 
        }
      },
      


      WaitBeforeCapture1: {
        after: {
          5000: "EncodeImage",
        },
      },





    
        
        
        EncodeImage: {
          entry: [
            "encode_image", 
            () => {
              //console.log("Encoded image, transitioning to GetDescription...");
            },
          ],
          after:{ 100: "GetBinaryClassification" },
         // after:{ 100: "GetDescription" }, //  DELAY BEFORE TRANSITION
        },



        GetDescription: {
          invoke: {
            src: "getDescription",
            input: ({ context }) => {
              if (!context.image64) {
                console.error("No image captured!"); 
                return { model: "llava:34b", image: "" };  
              }
              console.log("Base64:", context.image64.substring(0, 30) + "..."); 
              return { model: "llava:34b", image: context.image64 };
            },


            //input: ({ context }) => ({ model: "llava", image: context.image64! }),

     //      input: ({ context }) => ({ image: context.image64! }),
            onDone: {
              target: "GetBinaryClassification", //"DescribeDrawing",

              actions: assign(({ event }) => {
                console.log("Event Output:", event.output); 
              
                return {
                  messages: [
                    { 
                      role: "assistant", 
                      content: event.output?.response || "No content received." // CHANGED THIS content: event.output?.message?.content
                    },
                  ],
                };
              }),
            },
          },
        },


        GetBinaryClassification: {
          invoke: {
            src: "getBinaryClassification",
            input: ({ context }) => {
              if (!context.image64 || context.currentTaskIndex === undefined) {
                console.error("No image captured or task index not defined!"); 
                return { model: "llava:13b", image: "", currentTaskIndex: -1 };  
              }
              console.log("Base64:", context.image64.substring(0, 30) + "..."); 
              return { 
                model: "llava:34b", 
                image: context.image64, 
                currentTaskIndex: context.currentTaskIndex 
              };
            },
        
            onDone: {
              target: "DescribeDrawing", 
              actions: assign(({ event }) => {
                const result = event.output;
                
                console.log("Binary Classification Result:", result); 
                
                const isMatch = result?.sentence === true &&
                                result?.obj1 === true &&
                                result?.obj2 === true &&
                                result?.relation === true;
                                (result?.obj3 === undefined || result?.obj3 === true);

        
                return {
                  isCorrect: isMatch, 
                  messages: [
                    { 
                      role: "assistant",
                      // content: isMatch
                      // ? `<speak><mstts:viseme type="FacialExpression"/>I think this is the correct drawing. Well done!</speak>`
                      // : `<speak><mstts:viseme type="FacialExpression"/>${randomRepeat(negativeFeedback)}</speak>`,
                      // locale: "en-US",
                      // voice: "en-US-AvaNeural", 
                      content: isMatch 
                        ? "I think this is the correct drawing. Well done!" 
                        : randomRepeat(negativeFeedback), 
                      locale: "en-US", 
                      voice: "en-US-AvaNeural",
                    },
                  ],
                };
              }),
            },
          },
        },
        





        GetBinaryClassificationWORKS: {
          invoke: {
            src: "getBinaryClassification",
            input: ({ context }) => {
              if (!context.image64 || context.currentTaskIndex === undefined) {
                console.error("No image captured or task index not defined!"); 
                return { model: "llava:13b", image: "", currentTaskIndex: -1 };  
              }
              console.log("Base64:", context.image64.substring(0, 30) + "..."); 
              return { 
                model: "llava:34b",//"llava:13b", 
                image: context.image64, 
                currentTaskIndex: context.currentTaskIndex 
              };
            },
        
            onDone: {
              target: "DescribeDrawing", //"CheckIfCorrect",
              actions: assign(({ event }) => {

                console.log("Binary Classification Result:", event.output?.isMatch);
        
                return {
                  isCorrect: event.output?.isMatch || false,
                  messages: [
                    { 
                      role: "assistant", 
                      content: event.output?.isMatch 
                        ? "I think this is the correct drawing. Well done!" 
                        : randomRepeat(negativeFeedback), //"I don't think this is the correct drawing. Try again!"
                        locale: "en-US", 
                        voice: "en-US-AvaNeural",
                    },
                  ],
                };
              }),
            },
          },
        },


        CheckIfCorrect: {
          always: [
            {
              guard: ({ context }) => context.isCorrect, 
              actions: assign(({ context }) => ({
                currentTaskIndex: context.currentTaskIndex + 1,
              })),
              target: "CheckNextTask",
            },
            {
              guard: ({ context }) => !context.isCorrect, 
              target: "AskUserToDraw",
            }
          ]
        },



        CheckNextTask: {
          always: [
            {
              guard: ({ context }) => context.currentTaskIndex < drawingTasks.length,
              target: "AskUserToDraw", 
            },
            {
              guard: ({ context }) => context.currentTaskIndex >= drawingTasks.length,
              target: "EndSession", 
            }
          ]
        },
        



        
        


        // GetBinaryClassification: {
        //   invoke: {
        //     src: "getBinaryClassification",
        //     input: ({ context }) => {
        //       // Ensure the image exists and get the current task index
        //       if (!context.image64 || context.currentTaskIndex === undefined) {
        //         console.error("No image captured or task index not defined!"); 
        //         return { model: "llava:13b", image: "", currentTaskIndex: -1 };  
        //       }
        //       console.log("Base64:", context.image64.substring(0, 30) + "..."); 
        //       return { 
        //         model: "llava:13b", 
        //         image: context.image64, 
        //         currentTaskIndex: context.currentTaskIndex 
        //       };
        //     },
        
        //     onDone: {
        //       target: "DescribeDrawing",  
        //       actions: assign(({ event }) => {
        //                       console.log("Binary Classification Result:", event.output?.isMatch);
                
        //         return {
        //           messages: [
        //             { 
        //               role: "assistant", 
        //               content: event.output?.isMatch 
        //                 ? "I think this is the correct drawing." 
        //                 : "I don't think this is the correct drawing. Try again!" 
        //             },
        //           ],
        //         };
        //       }),
        //     },
        
        
        //   },
        // },
        

  DescribeDrawing: {
    invoke: {
    src: "fhSpeak",
    input: ({ context }) => ({
      text: context.messages[context.messages.length - 1].content
    }),
    onDone: { target: "CheckIfCorrect" },
  }
},


    DescribeDrawingWORKS: {
      entry: {
        type: "speechstate_speak",
        params: ({ context }) => ({
          value: context.messages[context.messages.length - 1].content,
          locale: "en-US",
          voice: "en-US-AvaNeural",
        }),
      },
      on: { SPEAK_COMPLETE: "CheckIfCorrect"},//"WaitBeforeCapture2" },
    },


    WaitBeforeCapture2: {
      after: {
        20000: "GetDescription", 
      },
    },

        
        
    
        // GenerateFeedback: {
        //   entry: [
        //     ({ context }) => {
        //       console.log('Generating feedback for detected objects:', context.detectedObjects);
        //     },
        //     {
        //       type: 'speechstate_speak',
        //       params: ({ context }: { context: MyDMContext }) => {
        //         const currentTask = drawingTasks[context.currentTaskIndex];
        //         const feedback = [];
    
        //         for (const keyword of currentTask.keywords) {
        //           if (!context.detectedObjects[keyword]) {
        //             feedback.push(` Please add a ${keyword} to your drawing.`);
        //           } else {
        //             feedback.push( `Good! The ${keyword} is present.`);
        //           }
        //         }
    
        //         return { value: feedback.join(' ') };
        //       }
        //     }
        //   ],
        //   on: {
        //     SPEAK_COMPLETE: 'WaitBeforeCapture1',
        //   }
        // },

        











        ValidateDrawing: {
          entry: {
            type: "speechstate_speak",
            params: ({ context }) => ({
              value: context.drawingIsValid 
              ? "Great job! That looks correct!"
              : "I don't think this is quite right yet, try again.",
            }),
          },
          on: {
            SPEAK_COMPLETE: [
              {
                guard: ({ context }) => {
                  return (context.drawingIsValid && context.currentTaskIndex < drawingTasks.length - 1) ? true : false;
                },
                target: "NextDrawing"
              },
              {
                guard: ({ context }) => {
                  return (context.drawingIsValid && context.currentTaskIndex >= drawingTasks.length - 1) ? true : false;
                },
                target: "EndSession"
              },
              {
                guard: ({ context }) => {
                  return !context.drawingIsValid ? true : false;
                },
                target: "AskUserToDraw"
              }
            ]
          }
        },
        


        // ValidateDrawing2: {
        //   entry: [
        //     ({ context }) => {
        //       const currentTask = drawingTasks[context.currentTaskIndex];
        //       const description = context.messages[context.messages.length - 1].content.toLowerCase();
              
        //       const matches = currentTask.labels.every(label => description.includes(label));
              
        //       context.drawingIsValid = matches;
              
        //       console.log("Validating drawing:", { task: currentTask.prompt, description, matches });
        //     },
        //     {
        //       type: "speechstate_speak",
        //       params: ({ context }) => ({
        //         value: context.drawingIsValid
        //           ? `Well done! Your drawing correctly shows '${drawingTasks[context.currentTaskIndex].prompt}'. Let's move to the next one!`
        //           : `Hmm, I don't see all the right elements in your drawing. Try again!`
        //       })
        //     }
        //   ],
        //   on: {

        //     SPEAK_COMPLETE: [
        //       {
        //         guard: ({ context }) => {
        //           return (context.drawingIsValid && context.currentTaskIndex < drawingTasks.length - 1) ? true : false;
        //         },
        //         target: "NextDrawing"
        //       },
        //       {
        //         guard: ({ context }) => {
        //           return (context.drawingIsValid && context.currentTaskIndex >= drawingTasks.length - 1) ? true : false;
        //         },
        //         target: "EndSession"
        //       },
        //       {
        //         guard: ({ context }) => {
        //           return !context.drawingIsValid ? true : false;
        //         },
        //         target: "AskUserToDraw"
        //       }
        //     ]
            
        //   },
        // },

// /* 
//             SPEAK_COMPLETE: [
//               {
//                 guard: ({ context }) => context.drawingIsValid && context.currentTaskIndex < drawingTasks.length - 1 ? true : false,
//                 target: "NextDrawing"
//               },
//               {
//                 guard: ({ context }) => context.drawingIsValid && context.currentTaskIndex >= drawingTasks.length - 1 ? true : false,
//                 target: "EndSession"
//               },
//               {
//                 guard: ({ context }) => !context.drawingIsValid ? true : false,
//                 target: "AskUserToDraw"
//               }
//             ] */
//           }
//         },

NextDrawing: {
  entry: assign({
    currentTaskIndex: ({ context }) => context.currentTaskIndex + 1
  }),
  on: {
    SPEAK_COMPLETE: [
      {
        guard: ({ context }) => {
          return context.currentTaskIndex < context.drawingTasks.length - 1;
        },
        target: "AskUserToDraw"
      },
      {
        target: "EndSession"
      }
    ]
  }
},

        
        
  
        
    
      
    
        EndSession: {
          entry: {
            type: "speechstate_speak",
            params: { value: "Great job! You've completed all the drawing challenges. See you next time!" }
          }
        },







        // ValidateDrawingTrial: {
        //   entry: [
        //     ({ context }) => {
        //       const currentTask = drawingTasks[context.currentTaskIndex];
        //       const description = context.messages[context.messages.length - 1]?.content.toLowerCase() || "";
        
        //       context.drawingIsValid = false;
        
        //       const containsHouse = currentTask.elements.house && description.includes("house");
        //       const containsTree = currentTask.elements.tree && description.includes("tree");
        //       const containsCat = currentTask.elements.cat && description.includes("cat");
        //       const containsTable = currentTask.elements.table && description.includes("table");
        //       const containsBall = currentTask.elements.ball && description.includes("ball");
        //       const containsBox = currentTask.elements.box && description.includes("box");
        //       const containsCar = currentTask.elements.car && description.includes("car");
        //       const containsBuilding = currentTask.elements.building && description.includes("building");
        
        //       const nextTo = currentTask.elements.nextTo && description.includes("next to");
        //       const under = currentTask.elements.under && description.includes("under");
        //       const on = currentTask.elements.on && description.includes("on");
        //       const left = currentTask.elements.left && description.includes("left");
        
        //       context.drawingIsValid =
        //         (containsHouse && containsTree && nextTo) || 
        //         (containsCat && containsTable && under) || 
        //         (containsBall && containsBox && on) || 
        //         (containsCar && containsBuilding && left); 
        
        //       console.log("Validating drawing:", { description, drawingIsValid: context.drawingIsValid });
        //     },
        //     {
        //       type: "speechstate_speak",
        //       params: ({ context }) => {
        //         return {
        //           value: context.drawingIsValid
        //             ? `Great! Your drawing correctly shows '${drawingTasks[context.currentTaskIndex].prompt}'. Let's move to the next one!`
        //             : `I don't see all the right elements in your drawing. Try again!`
        //         };
        //       }
        //     }
        //   ],

        //   on: {
        //     SPEAK_COMPLETE: [
        //       {
        //         // Transition to next task if drawing is valid and it's not the last task
        //         guard: ({ context }) => {
        //           console.log("Current Task Index:", context.currentTaskIndex);
        //           console.log("Drawing Valid:", context.drawingIsValid);
        //           return context.drawingIsValid && context.currentTaskIndex < drawingTasks.length - 1 ? true : false;
        //         },
        //         target: "NextDrawing", // Target the next drawing state
        //         actions: [
        //           assign(({ context }) => ({
        //             currentTaskIndex: context.currentTaskIndex + 1 // Increment task index
        //           }))
        //         ]
        //       },
        //       {
        //         // Transition to end session if it's the last task and drawing is valid
        //         guard: ({ context }) => {
        //           console.log("Current Task Index (End Check):", context.currentTaskIndex);
        //           console.log("Drawing Valid (End Check):", context.drawingIsValid);
        //           return context.drawingIsValid && context.currentTaskIndex >= drawingTasks.length - 1 ? true : false;
        //         },
        //         target: "EndSession" // End the session when all tasks are completed
        //       },
        //       {
        //         // Transition to AskUserToDraw if the drawing is not valid
        //         guard: ({ context }) => {
        //           console.log("Current Task Index (Invalid Drawing):", context.currentTaskIndex);
        //           console.log("Drawing Valid (Invalid Drawing):", context.drawingIsValid);
        //           return !context.drawingIsValid ? true : false; // Always return true or false
        //         },
        //         target: "AskUserToDraw" // Ask user to draw again if invalid
        //       }
        //     ]
        //   }
          
          
          // on: {
          //   SPEAK_COMPLETE: [
          //     {
          //       guard: ({ context }) => {
          //         // Explicitly return a boolean (true or false), not undefined
          //         console.log("Current Task Index:", context.currentTaskIndex);
          //       return context.drawingIsValid && context.currentTaskIndex < drawingTasks.length - 1 ? true : false;

          //       },
          //       target: "NextDrawing"
          //     },
          //     {
          //       guard: ({ context }) => {
          //         // Explicitly return a boolean (true or false), not undefined
          //         return context.drawingIsValid && context.currentTaskIndex >= drawingTasks.length - 1 ? true : false;
          //       },
          //       target: "EndSession"
          //     },
          //     {
          //       guard: ({ context }) => {
          //         // Explicitly return a boolean (true or false), not undefined
          //         return !context.drawingIsValid ? true : false;
          //       },
          //       target: "AskUserToDraw"
          //     }
          //   ]
          // }
        //},
        









        // ValidateDrawingTrial1st: {

        //   entry: [
    
        //     ({ context }) => {
        //       const currentTask = context.drawingTasks[context.currentTaskIndex];
        //       const description = context.messages[context.messages.length - 1]?.content.toLowerCase() || "";
        
        //       // CHECK ELEMENTS
        //       const containsHouse = currentTask.elements.house && description.includes("house");
        //       const containsTree = currentTask.elements.tree && description.includes("tree");
        //       const containsCat = currentTask.elements.cat && description.includes("cat");
        //       const containsTable = currentTask.elements.table && description.includes("table");
        //       const containsBall = currentTask.elements.ball && description.includes("ball");
        //       const containsBox = currentTask.elements.box && description.includes("box");
        //       const containsCar = currentTask.elements.car && description.includes("car");
        //       const containsBuilding = currentTask.elements.building && description.includes("building");
        
        //       // CHECK PREPOSITIONS
        //       const nextTo = currentTask.elements.nextTo && description.includes("next to");
        //       const under = currentTask.elements.under && description.includes("under");
        //       const on = currentTask.elements.on && description.includes("on");
        //       const left = currentTask.elements.left && description.includes("left");
        
        //       //CHECK IF EVERYTHING IS ALL TOGETHER OK
        //       context.drawingIsValid =
        //         (containsHouse && containsTree && nextTo) ||
        //         (containsCat && containsTable && under) ||
        //         (containsBall && containsBox && on) ||
        //         (containsCar && containsBuilding && left);
                
        //       console.log("Validating drawing:", { description, drawingIsValid: context.drawingIsValid });
        //     },
        //     {
        //       type: "speechstate_speak",
        //       params: ({ context }) => {
        //         return {
        //           value: context.drawingIsValid
        //             ? `Great! Your drawing correctly shows '${context.drawingTasks[context.currentTaskIndex].prompt}'. Let's move to the next one!`
        //             : ` I don't see all the right elements in your drawing. Try again!`
        //         };
        //       }
        //     }
        //   ],
        //   on: {
        //     SPEAK_COMPLETE: [
        //       {
        //         guard: ({ context }) => {
        //           return context.drawingIsValid && context.currentTaskIndex < context.drawingTasks.length - 1 ? true : false;
        //         },
        //         target: "NextDrawing"
        //       },
        //       {
        //         guard: ({ context }) => {
        //           return context.drawingIsValid && context.currentTaskIndex >= context.drawingTasks.length - 1 ? true : false;
        //         },
        //         target: "EndSession"
        //       },
        //       {
        //         guard: ({ context }) => {
        //           return !context.drawingIsValid ? true : false;
        //         },
        //         target: "AskUserToDraw"
        //       }
        //     ]
        //   }
        // },
        



        


        
        










        GetDescriptionworks: {
          invoke: {
            src: "getDescription",
            input: ({ context }) => {
              if (!context.image64) {
                console.error("No image captured!"); 
                return { model: "llava", image: "" };  
              }
              console.log("Base64:", context.image64.substring(0, 30) + "..."); 
              return { model: "llava", image: context.image64 };
            },


            //input: ({ context }) => ({ model: "llava", image: context.image64! }),

     //      input: ({ context }) => ({ image: context.image64! }),
            onDone: {
              target: "DescribeDrawing",

              actions: assign(({ event }) => {
                console.log("Event Output:", event.output); 
              
                return {
                  messages: [
                    { 
                      role: "assistant", 
                      content: event.output?.response || "No content received." // CHANGED THIS content: event.output?.message?.content
                    },
                  ],
                };
              }),
            },
          },
        },
        //       actions: assign(({ event }) =>

                
        //         ({
        //         messages: [
        //           { role: "assistant", content: event.output.message.content },
        //         ],
        //       })),
        //     },
        //   },
        // },



       



Listen: {},

  },
},
  }
},
  //}, //για το αρχικο χωρις φερχατ δεν θελει 2 αγκυλες 
//}
);




  
  


const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  console.debug(state.context);
});


// export function setupButton(element: HTMLElement) {
//   element.addEventListener("mousedown", (event) => {
//     if (event.button === 0) {
//       dmActor.send({ type: "CLICK" });
//     }
//   });

//   element.addEventListener("contextmenu", (event) => {
//     event.preventDefault();
//   });

//   dmActor.getSnapshot().context.ssRef.subscribe((snapshot) => {
//     const meta = Object.values(snapshot.getMeta())[0];
//     element.innerHTML = `${(meta as any).view}`;
//   });
// }



export function setupButton(element: HTMLElement) {
  element.addEventListener("click", () => {   
    dmActor.send({ type: "CLICK" });
  });
  dmActor.getSnapshot().context.ssRef.subscribe((snapshot) => {
    const meta = Object.values(snapshot.getMeta())[0];
    element.innerHTML = `${(meta as any).view}`;
  });
} 









export function initWhiteboard() {
  const canvas = document.querySelector("#paint") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;

  if (!canvas || !ctx) return;

  canvas.width = window.innerWidth * 0.8; 
  canvas.height = window.innerHeight * 0.8; 

  let mouse = { x: 0, y: 0 };
  let lastMouse = { x: 0, y: 0 };

  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "blue"; 
  ctx.fillStyle = "white"; 
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let drawingHistory: ImageData[] = [];

  function captureState() {
    const state = ctx.getImageData(0, 0, canvas.width, canvas.height);
    drawingHistory.push(state); 
  }

  function undoLastMove() {
    if (drawingHistory.length > 1) {
      drawingHistory.pop();
      const lastState = drawingHistory[drawingHistory.length - 1];
      ctx.putImageData(lastState, 0, 0); 
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height); 
    }
  }

  canvas.addEventListener("mousemove", (e) => {
    lastMouse.x = mouse.x;
    lastMouse.y = mouse.y;
    mouse.x = e.pageX - canvas.offsetLeft;
    mouse.y = e.pageY - canvas.offsetTop;
  });

  const onPaint = () => {
    ctx.beginPath();
    ctx.moveTo(lastMouse.x, lastMouse.y);
    ctx.lineTo(mouse.x, mouse.y);
    ctx.closePath();
    ctx.stroke();
    captureState(); 
  };

  canvas.addEventListener("mousedown", () => {
    canvas.addEventListener("mousemove", onPaint, false);
  });

  canvas.addEventListener("mouseup", () => {
    canvas.removeEventListener("mousemove", onPaint, false);
  });

  function changeColor(color: string) {
    console.log(`Changing color to: ${color}`);
    ctx.strokeStyle = color;
  }

  function clearCanvas() {
    console.log("Clearing canvas");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingHistory = []; 
  }

  function captureCanvasImage() {
    return canvas.toDataURL("image/png"); 
  }

  document.getElementById("redButton")?.addEventListener("click", () => changeColor("red"));
  document.getElementById("greenButton")?.addEventListener("click", () => changeColor("green"));
  document.getElementById("blueButton")?.addEventListener("click", () => changeColor("blue"));
  document.getElementById("blackButton")?.addEventListener("click", () => changeColor("black"));
  document.getElementById("yellowButton")?.addEventListener("click", () => changeColor("yellow"));
  document.getElementById("brownButton")?.addEventListener("click", () => changeColor("brown"));
  document.getElementById("eraseButton")?.addEventListener("click", () => changeColor("white"));
  document.getElementById("clearButton")?.addEventListener("click", clearCanvas);

  document.getElementById("captureButton")?.addEventListener("click", () => {
    const imageData = captureCanvasImage();
    console.log("Captured Image Base64:", imageData);
  });

  document.getElementById("undoButton")?.addEventListener("click", undoLastMove);
}



window.onload = function () {
  initWhiteboard();
};



// export function initWhiteboard() {

//    // const sketch = document.querySelector("#whiteboard") as HTMLElement; 
//     const canvas = document.querySelector("#paint") as HTMLCanvasElement;
//     const ctx = canvas.getContext("2d")!;


//     if (!canvas || !ctx) return;

    
    
//     canvas.width = window.innerWidth * 0.8; // 80% of window width
//     canvas.height = window.innerHeight * 0.8; // 60% of window height
  
//     let mouse = { x: 0, y: 0 };
//     let lastMouse = { x: 0, y: 0 };
  
//     // drawing properties
//     ctx.lineWidth = 5;
//     ctx.lineJoin = "round";
//     ctx.lineCap = "round";
//     ctx.strokeStyle = "blue"; // DEFAUTL COLOR DRAWING
//     //BACKGROUND WHITE
//     ctx.fillStyle = "white";
//     ctx.fillRect(0, 0, canvas.width, canvas.height);




  
//     // TRACK DRAWING POSITION
//     canvas.addEventListener("mousemove", (e) => {
//       lastMouse.x = mouse.x;
//       lastMouse.y = mouse.y;
//       mouse.x = e.pageX - canvas.offsetLeft;
//       mouse.y = e.pageY - canvas.offsetTop;
//     }); 
  
//     const onPaint = () => {
//       ctx.beginPath();
//       ctx.moveTo(lastMouse.x, lastMouse.y);
//       ctx.lineTo(mouse.x, mouse.y);
//       ctx.closePath();
//       ctx.stroke();
//       dmActor.send({ type: "PAINT", image: captureCanvasImage() });

//     };
  
//     // DRAWING WITH MOUSE DOWN STOP WITH MOUSE UP
//     canvas.addEventListener("mousedown", () => {
//       canvas.addEventListener("mousemove", onPaint, false);
//     });
  
//     canvas.addEventListener("mouseup", () => {
//       canvas.removeEventListener("mousemove", onPaint, false);
//     });
  

//     function changeColor(color: string) {
//       console.log(`Changing color to: ${color}`); // Debugging
//       ctx.strokeStyle = color;
//     }
  
//     function clearCanvas() {
//       console.log("Clearing canvas"); // Debugging
//       ctx.clearRect(0, 0, canvas.width, canvas.height);
//     }



    
//     // COLOR & ERASE BUTTONS
//     document.getElementById("redButton")?.addEventListener("click", () => changeColor("red"));
//     document.getElementById("greenButton")?.addEventListener("click", () => changeColor("green"));
//     document.getElementById("blueButton")?.addEventListener("click", () => changeColor("blue"));
//     document.getElementById("blackButton")?.addEventListener("click", () => changeColor("black"));
//     document.getElementById("yellowButton")?.addEventListener("click", () => changeColor("yellow"));
//     document.getElementById("brownButton")?.addEventListener("click", () => changeColor("brown"));
//     document.getElementById("eraseButton")?.addEventListener("click", () => changeColor("white"));
//     document.getElementById("clearButton")?.addEventListener("click", clearCanvas);

//     document.getElementById("captureButton")?.addEventListener("click", () => {const imageData = captureCanvasImage();
//       console.log("Captured Image Base64:", imageData);

//       document.getElementById("captureButton")?.addEventListener("click", () => {
//         //const imageData = captureCanvasImage();
//         const imageData = captureCanvasImage(); // Capture the image from the canvas
//       console.log("Captured Image Base64:", imageData);
//         dmActor.send({ type: "CLICK" });


        
//       });
      
//     });
  

//   }
  
// //START THE WHITEBOARD
// window.onload = function () {
//   initWhiteboard();
// };


