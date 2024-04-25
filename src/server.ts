import express, { Request, Response } from "express";
import { RawData, WebSocket } from "ws";
import { createServer, Server as HTTPServer } from "http";
import cors from "cors";
import expressWs from "express-ws";
import { TwilioClient } from "./twilio_api";
import { Retell } from "retell-sdk";
import { RegisterCallResponse } from "retell-sdk/resources/call";
import { CustomLlmRequest, CustomLlmResponse } from "./types";
import { FunctionCallingLlmClient } from "./llms/llm_openai_func_call";

export class Server {
  private httpServer: HTTPServer;
  public app: expressWs.Application;
  private retellClient: Retell;
  private twilioClient: TwilioClient;

  constructor() {
    this.app = expressWs(express()).app;
    this.httpServer = createServer(this.app);
    this.app.use(express.json());
    this.app.use(cors());
    this.app.use(express.urlencoded({ extended: true }));

    this.handleRetellLlmWebSocket();
    this.handleRegisterCallAPI();

    this.retellClient = new Retell({
      apiKey: process.env.RETELL_API_KEY,
    });

    this.twilioClient = new TwilioClient(this.retellClient);
 
    this.twilioClient.ListenTwilioVoiceWebhook(this.app);
    this.twilioClient.RegisterPhoneAgent(
      "+48732071474",
      "b80beb271c18b7dcb2d7b84c8e7117b7",
    );
  }

  listen(port: number): void {
    this.app.listen(port);
    console.log("Listening on " + port);
  }

  handleRegisterCallAPI() {
    this.app.post(
      "/register-call-on-your-server",
      async (req: Request, res: Response) => {
        const { agent_id } = req.body;

        try {
          const callResponse: RegisterCallResponse =
            await this.retellClient.call.register({
              agent_id: agent_id,
              audio_websocket_protocol: "web",
              audio_encoding: "s16le",
              sample_rate: 24000,
            });
          res.json(callResponse);
        } catch (error) {
          console.error("Error registering call:", error);
          res.status(500).json({ error: "Failed to register call" });
        }
      },
    );
  }

  handleRetellLlmWebSocket() {
    this.app.ws(
      "/llm-websocket/:call_id",
      async (ws: WebSocket, req: Request) => {
        try {
          const callId = req.params.call_id;
          console.log("Handle llm ws for: ", callId);

          const config: CustomLlmResponse = {
            response_type: "config",
            config: {
              auto_reconnect: true,
              call_details: true,
            },
          };
          ws.send(JSON.stringify(config));

          const llmClient = new FunctionCallingLlmClient();

          ws.on("error", (err) => {
            console.error("Error received in LLM websocket client: ", err);
          });
          ws.on("close", (err) => {
            console.error("Closing llm ws for: ", callId);
          });

          ws.on("message", async (data: RawData, isBinary: boolean) => {
            if (isBinary) {
              console.error("Got binary message instead of text in websocket.");
              ws.close(1002, "Cannot find corresponding Retell LLM.");
            }
            const request: CustomLlmRequest = JSON.parse(data.toString());

            if (request.interaction_type === "call_details") {
              console.log("call details: ", request.call);
              llmClient.BeginMessage(ws);
            } else if (
              request.interaction_type === "reminder_required" ||
              request.interaction_type === "response_required"
            ) {
              console.clear();
              console.log("req", request);
              llmClient.DraftResponse(request, ws);
            } else if (request.interaction_type === "ping_pong") {
              let pingpongResponse: CustomLlmResponse = {
                response_type: "ping_pong",
                timestamp: request.timestamp,
              };
              ws.send(JSON.stringify(pingpongResponse));
            } else if (request.interaction_type === "update_only") {
            }
          });
        } catch (err) {
          console.error("Encountered erorr:", err);
          ws.close(1005, "Encountered erorr: " + err);
        }
      },
    );
  }
}
