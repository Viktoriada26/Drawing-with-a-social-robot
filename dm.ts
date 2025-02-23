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
  ttsDefaultVoice: "en-US-DavisNeural",
};

/* Grammar definition */
interface Grammar {
  [index: string]: { person?: string; day?: string; time?: string };
}


interface Move {
  role: "assistant" | "user";
  content: string;
}


const grammar: Grammar = {
  vlad: { person: "Vladislav Maraev" },
  aya: { person: "Nayat Astaiza Soriano" },
  rasmus: { person: "Rasmus Blanck" },
  monday: { day: "Monday" },
  tuesday: { day: "Tuesday" },
  "10": { time: "10:00" },
  "11": { time: "11:00" },
};








/* Helper functions */
function isInGrammar(utterance: string) {
  return utterance.toLowerCase() in grammar;
}

function getPerson(utterance: string) {
  return (grammar[utterance.toLowerCase()] || {}).person;
}




const dearClient = ["Are you there?", "If you do not want to chat just click X", "Please answer to me", "Do you ignore me?"];
function randomRepeat(myarray: any) {
    const randomIndex = Math.floor(Math.random() * myarray.length);
    return myarray[randomIndex];
}

interface MyDMContext extends DMContext {
  noinputCounter: number;
  availableModels?: string[];

}
interface DMContext {
  count: number;
  ssRef: AnyActorRef;
  messages: Message[];
  prompt? : string ;
  image64?: string;
}

interface Message {
  role: "assistant" | "user" | "system";
  content: string;
}
const dmMachine = setup({
  types: {} as {
    context: MyDMContext;
    events: SpeechStateExternalEvent | { type: "CLICK" };
  },
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


  encode_image: assign(({}) => {
  console.log("base64 encoding image...");
  //PREPEEI NA TO DO AUTO 
  const canvas = <HTMLCanvasElement>document.getElementById("canvas");
  const image = canvas.toDataURL("image/jpeg").split(";base64,")[1];
  return { image64: image };
}),





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
  },
  actors: {



    get_ollama_models: fromPromise<any, null>(async () => {
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
        CLICK: "PromptAndAsk",
      },
    },
    PromptAndAsk: {
      initial: "GetModels",
      states: {
        GetModels: {
          invoke: {
            src: "get_ollama_models",
            input: null,
            onDone: {
              target: "Prompt", //changed it to infloop
              actions: assign(({ event }) => {
                console.log(event.output);
                return {
                  availableModels: event.output.models.map((m: any) => m.name),
                };
              }),
            },
            onError: {
              actions: () => console.error("no models available"),
            },
          },
        },
        Prompt: {
          invoke: {
            src: "LMactor",
            input: ({}) => ({prompt: [{role: "user", content: "Hello"}] }),
            onDone: {
              target: "LMAnswer", //needs to be listen? change the Answer to Listen
              actions: [({event}) => console.log(event.output.message.content),
                assign(({context, event}) =>{
                return {
                  messages: [...context.messages,{
                    role: "assistant",
                    content : event.output.message.content,
                  },
                ],
              };
            }),
          ],
        },
      },
    },
    InfLoop: {
      invoke: {
        src: "LMactor",
        input: ({context}) => ({ prompt: context.messages }),
        onDone: {

          target: "LMAnswer",
          actions: [
            ({ event }) => console.log(event.output.message.content),
            assign(({ context, event }) => {
              return {
                messages: [
                  ...context.messages,
                  {
                    role: "assistant",
                    content: event.output.message.content,
                  },
                ],
              };
            }),
          ],
        },
      },
    },




    
        LMAnswer: {
          entry: {
            type: "speechstate_speak",
            params: ({ context }) => {
              const utterance = context.messages[context.messages.length - 1]; 
              return { value: utterance.content  };
            },   
          },
          on: { SPEAK_COMPLETE: "LMListen"},

      },







      //Draw : {},





        LMListen: {
            entry: {
              type: "speechstate_listen"
            },
            on: {
              RECOGNISED: 
              {
                actions: [assign(({ context, event}) => { 
                  return { 
                    messages: [ ...context.messages, { 
                      role: "user", content: event.value[0].utterance
                    }]
                  }
                }), 
              ],
              target: "InfLoop"},

              /*   {guard: ({event}) =>  event.value[0].utterance.toLowerCase().includes("draw"),
                target: "Prompt",
                actions: assign(({ context, event }) => { 
                  return { 
                    messages: [ 
                      ...context.messages, 
                      { role: "user", content: event.value[0].utterance }
                    ]
                  };
                })
              },
              ],  */ 

              


            
              /*  actions: [assign(({ context, event}) => { 
                  return { 
                    messages: [ ...context.messages, { 
                      role: "user", content: event.value[0].utterance
                    }]
                  }
                }), 
              ],
              target: "InfLoop" */ 

              
              ASR_NOINPUT: 
              [{
                  guard: ({ context }) => context.noinputCounter <= 1,
                  target: "Canthear",
                  actions: ({ context }) => context.noinputCounter++
              },
              {
                  guard: ({ context }) => context.noinputCounter > 3,
                  target: "#DM.Done"
              }],


             // ASR_NOINPUT: {
               // target: "Canthear"
             // },
          },
    },




    




  


      Canthear: {
        entry: {
          type: "speechstate_speak",
          params : {value:  randomRepeat(dearClient)},
        }, 
        on: {
            SPEAK_COMPLETE: "LMListen",
        },
      },

    },
  },
  Done: {
    on: {
        CLICK: "PromptAndAsk"
    }
},
}
});



const dmActor = createActor(dmMachine, {
  inspect: inspector.inspect,
}).start();

dmActor.subscribe((state) => {
  /* if you want to log some parts of the state */
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



/* export function initWhiteboard() {
  const canvas = document.querySelector("#paint") as HTMLCanvasElement;
  const ctx = canvas.getContext("2d");

  if (!canvas || !ctx) return;

  // SIZE OF THE CANVAS
  canvas.width = window.innerWidth * 0.8; // 80% of window width
  canvas.height = window.innerHeight * 0.6; // 60% of window height

  let mouse = { x: 0, y: 0 };
  let lastMouse = { x: 0, y: 0 };

  // Set up the drawing properties
  ctx.lineWidth = 5;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "blue";

  // TRACK DRAWING drawing position
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
  };

  // DRAWING WITH MOUSE DOWN STOP WITH MOUSE UP
  canvas.addEventListener("mousedown", () => {
    canvas.addEventListener("mousemove", onPaint, false);
  });

  canvas.addEventListener("mouseup", () => {
    canvas.removeEventListener("mousemove", onPaint, false);
  });
} */






export function initWhiteboard() {

   // const sketch = document.querySelector("#whiteboard") as HTMLElement; 
    const canvas = document.querySelector("#paint") as HTMLCanvasElement;
    const ctx = canvas.getContext("2d")!;


    if (!canvas || !ctx) return;

    //if (!canvas || !ctx|| !sketch) return;
    //const whiteboard = document.querySelector("#whiteboard") as HTMLElement;

    //canvas.width = whiteboard.clientWidth - 20;  
    //canvas.height = whiteboard.clientHeight - 20;
  

    //canvas.width = frameWidth;
    //canvas.height = frameHeight;
    // SIZE OF THE CANVAS
    
    canvas.width = window.innerWidth * 0.8; 
    canvas.height = window.innerHeight * 0.8; 
  
    let mouse = { x: 0, y: 0 };
    let lastMouse = { x: 0, y: 0 };
  
    // Set up the drawing properties
    ctx.lineWidth = 5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = "blue"; 




  
    // TRACK DRAWING POSITION
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
    };
  
    // DRAWING WITH MOUSE DOWN STOP WITH MOUSE UP
    canvas.addEventListener("mousedown", () => {
      canvas.addEventListener("mousemove", onPaint, false);
    });
  
    canvas.addEventListener("mouseup", () => {
      canvas.removeEventListener("mousemove", onPaint, false);
    });
  

    function changeColor(color: string) {
      console.log(`Changing color to: ${color}`); // Debugging
      ctx.strokeStyle = color;
    }
  
    function clearCanvas() {
      console.log("Clearing canvas"); // Debugging
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    // COLOR & ERASE BUTTONS
    document.getElementById("redButton")?.addEventListener("click", () => changeColor("red"));
    document.getElementById("greenButton")?.addEventListener("click", () => changeColor("green"));
    document.getElementById("blueButton")?.addEventListener("click", () => changeColor("blue"));
    document.getElementById("blackButton")?.addEventListener("click", () => changeColor("black"));
    document.getElementById("yellowButton")?.addEventListener("click", () => changeColor("yellow"));
    document.getElementById("eraseButton")?.addEventListener("click", () => changeColor("white"));
    document.getElementById("clearButton")?.addEventListener("click", clearCanvas);
  

  }
  
//START THE WHITEBOARD
window.onload = function () {
  initWhiteboard();
};


