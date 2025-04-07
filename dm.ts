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
  locale: "en-US",
  ttsDefaultVoice: "en-US-AvaNeural", //"el-GR-AthinaNeural",//"en-US-AvaNeural" // en-US-DavisNeural",
};

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
}

interface DrawingTask {
  prompt: string;
  labels: LabelMap;
}




const drawingTasks: DrawingTask[] = [
  { 
    prompt: "Draw a house next to a tree.", 
    labels: { house: true, tree: true, nextTo: true }
  },
  { 
    prompt: "Draw an apple under a sun.", 
    labels: {apple:true, table:true, under:true}
  },
  { 
    prompt: "Draw an apple on a box.", 
    labels: { apple: true, box: true, on: true }
  },
  { 
    prompt: "Draw a sun to the left of a tree.", 
    labels: { sun: true, tree: true, left: true }
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


}

interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}

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
    events: SpeechStateExternalEvent | { type: "CLICK" } | { type: "IMAGE_CAPTURED"; image: string  } | {type: "PAINT"; image: string};
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
    speechstate_speak: ({ context }, params: { value: string }) =>
      context.ssRef.send({ type: "SPEAK", value: { utterance: params.value } }),
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
    const prompt = `Does this drawing contain ${Object.keys(currentTask.labels).join(", ")}? Reply only "true" or "false".`;
    console.log(`Sending binary classification request with prompt: "${prompt}"`);
    return fetch("https://mltgpu.flov.gu.se:11434/api/generate", {

   //return fetch("http://localhost:11434/api/generate", {
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



    getDescription: fromPromise<any, { model: string; image: string }>(
      async ({ input }) => {
        console.log(`Sending image to ${input.model} for description...`);
        const prompt = "The user will draw something, and you must determine what it resembles. Respond with a sentence starting with 'I think that the drawing is a {object <preposition> object.} Keep it really simple, like you're talking to a 5-year-old. BE BRIEF.";

        console.log(`Sending get description request with prompt: "${prompt}"`);
        const response = await fetch("https://mltgpu.flov.gu.se:11434/api/generate", {

          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
      return fetch("https://mltgpu.flov.gu.se:11434/api/tags").then((response) =>

      //return fetch("http://localhost:11434/api/tags").then((response) =>
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
      return fetch("https://mltgpu.flov.gu.se:11434/api/chat", {

     // return fetch("http://localhost:11434/api/chat", {
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
          entry: {
            type: "speechstate_speak",
            params: { value: ` Welcome to our world of drawing and learning. Today, we are going to discuss about prepositions, but first of all tell me your name` },
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





        GreetUser: {entry: {
          type: "speechstate_speak",
          params: ({ context }) => ({
          value: `Nice to meet you ${context.name}! Let's start drawing and learning prepositions. You are drawing and I will tell you if it's correct!.`,
          }),
        },
        on: { SPEAK_COMPLETE: "AskUserToDraw"}, //"WaitBeforeCapture1" },
      },


      AskUserToDraw1: {
        entry: [
          ({ context }) => {
            const currentTask = drawingTasks[context.currentTaskIndex];
            console.log("Entering AskUserToDraw with task:", currentTask.prompt); 
          },
          {
            type: "speechstate_speak",
            params: ({ context }) => {
              const currentTask = drawingTasks[context.currentTaskIndex];
              return { value: currentTask.prompt };
            }
          }
        ],
        on: { SPEAK_COMPLETE: "WaitBeforeCapture1" }
      },
      

      AskUserToDraw: {
        entry: [
          ({ context }) => {
            const currentTask = drawingTasks[context.currentTaskIndex];
            console.log("Entering AskUserToDraw with task:", currentTask.prompt); 
          },
          {
            type: "speechstate_speak",
            params: ({ context }) => {
              const currentTask = drawingTasks[context.currentTaskIndex];
              return { value: currentTask.prompt };
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
              console.log("Encoded image, transitioning to GetDescription...");
            },
          ],
          after:{ 100: "GetDescription" }, //  DELAY BEFORE TRANSITION
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
              target: "AskUserToDraw", // Start next task
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
      entry: {
        type: "speechstate_speak",
        params: ({ context }) => ({
          value: context.messages[context.messages.length - 1].content,
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
});




  
  


const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  console.debug(state.context);
});

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


