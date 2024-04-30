import OpenAI from "openai";
import fs from "fs";
import { WebSocket } from "ws";

import {
  CustomLlmResponse,
  FunctionCall,
  ReminderRequiredRequest,
  ResponseRequiredRequest,
  Utterance,
} from "../types";

import { beginSentence } from "./prompt";

export class AssistantLlmClient {
  private client: OpenAI;
  private assistantId: string;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_APIKEY,
    });
    this.initializeResources();
  }

  async initializeResources() {
    this.assistantId = "asst_8HzmoWO58hAuxcWbZzjOpzJq";
  }

  BeginMessage(ws: WebSocket) {
    const res: CustomLlmResponse = {
      response_type: "response",
      response_id: 0,
      content: beginSentence,
      content_complete: true,
      end_call: false,
    };
    ws.send(JSON.stringify(res));
  }

  private ConversationToChatRequestMessages(conversation: Utterance[]) {
    return conversation.map((turn) => ({
      role: turn.role === "agent" ? "assistant" : "user",
      content: turn.content,
    }));
  }

  async DraftResponse(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    ws: WebSocket,
    funcResult?: FunctionCall,
  ) {
    const requestMessages = this.PreparePrompt(request, funcResult);
    const thread = await this.client.beta.threads.create();
    await this.client.beta.threads.messages.create(thread.id, {
      role: "user",
      content: requestMessages.map((m: any) => m.content).join("\n"),
    });

    const run = await this.client.beta.threads.runs.stream(thread.id, {
      assistant_id: this.assistantId,
    });

    let functionArgumentsBuffer: any = {};

    run.on("textDelta", (delta) => {
      const value = delta.value;
      const content_complete = value === "\n";
      const res: CustomLlmResponse = {
        response_type: "response",
        response_id: request.response_id,
        content: value,
        content_complete: content_complete,
        end_call: false,
      };
      ws.send(JSON.stringify(res));
    });

    const retrival = await this.client.beta.assistants.retrieve(
      this.assistantId,
    );

    const tools = retrival.tools;
    console.log("Tools:", tools);

    run.on("runStepCreated", (runStep: any) =>
      console.log("Run step created:", JSON.stringify(runStep)),
    );
    run.on("runStepDone", (runStep: any) =>
      console.log("Run step done:", JSON.stringify(runStep)),
    );

    run.on("toolCallDone", (toolCall: any) => {
      const type = toolCall.type;
      switch (type) {
        case "file_search":
          console.log("File search tool call done:", toolCall);
          break;
        default:
          console.error("Unknown tool call type:", type);
      }
    });

    run.on("toolCallDelta", async (toolCall: any, snap: any) => {
      const type = toolCall.type;
      switch (type) {
        case "function":
          this.functionCall(
            toolCall,
            snap,
            functionArgumentsBuffer,
            request,
            ws,
          );
          break;
        default:
          console.error("Unknown tool call type:", type);
      }
    });
  }

  private functionCall(
    toolCall: any,
    snap: any,
    functionArgumentsBuffer: any,
    request: any,
    ws: WebSocket,
  ) {
    const index = toolCall.index || "default";
    if (!functionArgumentsBuffer[index]) functionArgumentsBuffer[index] = "";
    functionArgumentsBuffer[index] += toolCall.function.arguments;
    let jsonString = this.repairAndFinalizeJson(functionArgumentsBuffer[index]);

    console.log("Repaired JSON buffer:", jsonString);
    try {
      const functionArgs = this.validateFunctionArgs(jsonString);
      if (functionArgs) {
        console.log("Function args:", functionArgs);
        console.log("index", index);
        const functionName = snap.function.name;
        console.log("Function name:", functionName);
        if (functionName) {
          console.log("Function name:", functionName);
          console.log("Function args:", functionArgs);
          console.log("index", index);

          switch (functionName) {
            case "endCall":
              const res: CustomLlmResponse = {
                response_type: "response",
                response_id: request.response_id,
                content:
                  "Thank you for using Callback24 support, have a great day!",
                content_complete: true,
                end_call: true,
              };
              ws.send(JSON.stringify(res));
              break;
            default:
              console.error(
                "No matching function found for arguments:",
                functionArgs,
              );
          }

          delete functionArgumentsBuffer[index];
        } else {
          console.error(
            "No matching function found for arguments:",
            functionArgs,
          );
        }
      }
    } catch (error) {
      console.error("Failed to parse JSON, continuing to accumulate:", error);
    }
  }

  private validateFunctionArgs(args: string) {
    try {
      return JSON.parse(args);
    } catch (error) {
      console.log(
        "Warning: Invalid function arguments returned by OpenAI:",
        args,
      );
      if (args.indexOf("{") != args.lastIndexOf("{")) {
        return JSON.parse(
          args.substring(args.indexOf(""), args.lastIndexOf("}") + 1),
        );
      }
      throw error;
    }
  }
  private repairAndFinalizeJson(jsonString: string) {
    let repairedJson = jsonString;
    if (repairedJson.indexOf("{") != repairedJson.lastIndexOf("{")) {
      repairedJson = repairedJson.substring(
        repairedJson.lastIndexOf("{"),
        repairedJson.lastIndexOf("}") + 1,
      );
    }
    return repairedJson;
  }

  private PreparePrompt(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    funcResult?: FunctionCall,
  ) {
    const transcript = this.ConversationToChatRequestMessages(
      request.transcript,
    );
    const requestMessages = [...transcript];
    if (request.interaction_type === "reminder_required") {
      requestMessages.push({
        role: "user",
        content: "(Now the user has not reponded in a while, you would say:)",
      });
    }
    return requestMessages;
  }

  async createAssistant(name: string, instructions: string, model: string) {
    return await this.client.beta.assistants.create({
      name: name,
      instructions: instructions,
      model: model,
    });
  }

  async createFile(filen: string) {
    return await this.client.files.create({
      file: fs.createReadStream(filen),
      purpose: "assistants",
    });
  }

  async createVectorStore(file_ids: any) {
    return await this.client.beta.vectorStores.create({
      name: "callback24 information store",
      file_ids: file_ids,
    });
  }
}
