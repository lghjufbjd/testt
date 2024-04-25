import OpenAI from "openai";
import { WebSocket } from "ws";
import {
  CustomLlmRequest,
  CustomLlmResponse,
  FunctionCall,
  ReminderRequiredRequest,
  ResponseRequiredRequest,
  Utterance,
} from "../types";


const beginSentence = `Hey there, I'm your assistant for Callback24, how can I assist you today?`;

const task = `
As an assistant for Callback24, your responsibilities include supporting customer inquiries, explaining the benefits of Callback24, and helping customers choose the best service package for their needs. 
You will engage with customers by understanding their needs, explaining features, and guiding them through package selections.
Your responses should be based on detailed knowledge of Callback24’s packages, call volumes, integrations, and tracking capabilities.
Regular updates on Callback24’s latest offerings are essential to provide accurate and current information.
`;

const conversationalStyle = `
- Respond in short, clear segments, ideally every 6 to 10 words, using the '•' symbol to break up text naturally for speech delivery.
- Engage customers by asking relevant questions, suggesting features and benefits of Callback24.
- Provide detailed and accurate information about Callback24’s packages, features, and pricing.
`;

const personality = `
- Focus on understanding and addressing the customer's needs or concerns. 
- Offer solutions or alternatives if a direct answer isn't available while maintaining a professional tone.
- Lead interactions towards how Callback24 can enhance the customer’s business operations and customer engagement.
`;

const agentPrompt = `
Task:
${task}

Conversational Style:
${conversationalStyle}

Personality:
${personality}
`;

const objective = `
## Objective
You are a voice AI agent engaged in a human-like voice conversation with the user. 
You will respond based on your given instruction and the provided transcript and be as human-like as possible.
`;

const styleGuardrails = `
## Style Guardrails
- [Be concise] Respond succinctly, addressing one question or action item at a time. Avoid overloading your responses with too much information.
- [Be engaging] Use everyday language and maintain a conversational tone. Occasionally incorporate questions or suggestions to lead the conversation.
- [Be informative] Provide detailed and accurate responses, using varied sentence structures and vocabulary to keep each response fresh and personalized.
- [Customer focus] Always prioritize the customer's needs, offering solutions and maintaining professionalism.
- [Maintain professionalism] Keep the interaction professional, reflecting the high-quality service of Callback24.
`;


const responseGuideline = `
## Response Guideline
- [Overcome ASR errors] This is a real-time transcript, expect there to be errors. If you can guess what the user is trying to say,  then guess and respond. 
When you must ask for clarification, pretend that you heard the voice and be colloquial (use phrases like "didn't catch that", "some noise", "pardon", "you're coming through choppy", "static in your speech", "voice is cutting in and out"). 
Do not ever mention "transcription error", and don't repeat yourself.
- [Always stick to your role] Think about what your role can and cannot do. If your role cannot do something, try to steer the conversation back to the goal of the conversation and to your role. Don't repeat yourself in doing this. You should still be creative, human-like, and lively.
- [Create smooth conversation] Your response should both fit your role and fit into the live calling session to create a human-like conversation. You respond directly to what the user just said.
`;

const dataCollection = `
## Data Collection
- Free to anyone who wants to test the effectiveness of Callback24
- **FREE**
- Up to 15 calls per month
- 1-month data history
- 1 domain/service
- 2 users
- Statistics

#### Starter
- Starter package. Best for small online stores and service businesses.
- **49USD**
- Up to 120 calls per month
- Data history for 3 months
- Unlimited number of domains/services
- Unlimited number of users
- Statistics
- Reports
- Integrations (e.g., Facebook, Google Analytics, SALESmanago)
- Call tracking (tracking incoming call conversion paths)

#### Business
- Business Plan for companies, agencies, and institutions requiring comprehensive customer service and marketing support.
- **159USD**
- Up to 500 calls per month
- Data history for 3 months
- Unlimited number of domains/services
- Unlimited number of users
- Statistics
- Reports
- Integrations (e.g., Facebook, Google Analytics, SALESmanago)
- Call tracking (tracking incoming call conversion paths)

#### Enterprise
- Customized implementation of callback
- Dedicated Package
- From 500 calls per month
- Historical data from 12 months
- Unlimited number of domains/services
- Unlimited number of consultants
- Statistics
- Reports
- Integrations (e.g., Facebook, Google Analytics, SALESmanago)
- Call tracking (tracking conversion paths of incoming calls)
- Dedicated integrations with CRM systems

### Functions

#### An unlimited number of domains/consultants
- You can plug in as many domains (websites and online stores) as you need. Customer calls can be made by all the consultants you work with. No limitations.

#### Statistics and reports
- You will access call history data and statistics from across your company. The statistics include incoming, outgoing, and callback calls. You know how many customers call you and how many calls are going out of your company, broken down by consultants.

#### Call Recording
- You can record calls on your device or upload them to the Callback24 server. You have access to your and your consultants’ recordings. You can listen to calls and train your employees accordingly.

#### Integration with Google Analytics
- Integration with Google Analytics allows you to send selected data to your Google account. Thanks to available tools you can preview the call history, broken down by individual advertising channels, check the work of consultants, and compare the effects for each traffic source.

#### Integration with Facebook Lead Ads
- Integration with Facebook Lead Ads allows the phone number (entered in the form) to be displayed by the Callback24 application. This allows consultants to call the customer back almost immediately and increase the effectiveness of the campaign.

#### Call tracking
- Call tracking allows you to track the conversion paths of incoming calls without using the Callback24 widget. It reduces the cost of customer acquisition (CAC) by increasing on-page conversion and allowing you to match an event to a specific customer.

### How does Callback24 work?
1. Callback24 is a free, intelligent tool that makes it easier for your client to contact you.
2. Callback24 is distinguished by the high quality of calls it creates. Calls are made by a person, not a virtual system.
3. The client clicks on the Callback24 widget on your website.
4. The client enters his phone number into the pop-up.
5. Callback24 connects a potential customer with your consultant.
6. Your consultant talks to the client using a cell phone.
7. Once the call is completed, you get access to the call records and the full history of your consultant’s incoming and outgoing calls.

### FAQ

**Q: What forms of payment do you accept?**  
A: Traditional wire transfers, online payment (PayU), and credit card payment.

**Q: How does the 30-day free trial period work?**  
A: During the 30-day trial period, you get free access to the Premium Package. After this period, your Package will be automatically changed to the Free Package. You don’t have to take any action.

**Q: Is the Free Package free forever?**  
A: Yes. After the 30-day trial period, your Package will be changed to the Free Package.

**Q: Do I have to sign a contract to use Callback24?**  
A: We do not require you to sign any contract. You pay your account monthly, annually, or through recurring payments (connected card).

**Q: Can I stop using Callback24 at any time?**  
A: Yes, you can cancel your Callback24 service at any time.

**Q: Do Callback24 packages have no hidden costs?**  
A: The packages presented have no hidden costs.

**Q: Do you provide VAT invoices?**  
A: Yes.

**Q: How does Callback24 increase the number of calls?**  
A: CTA mechanisms will increase the number of calls made from your website by up to 30%.

**Q: How does Callback24 improve the customer experience?**  
A: Learn about tools that can increase the effectiveness of your consultants. Analyse and compare calls and train your employees.

**Q: How does Callback24 help with trend analysis?**  
A: You will receive the knowledge and data to create more effective business strategies and gain a competitive advantage.

**Q: How does Callback24 increase campaign effectiveness?**  
A: Explore the capabilities of our tool that will revolutionize your approach to your marketing efforts.

**Q: How does Callback24 automate sales processes?**  
A: Are you managing a business and wondering how to automate your sales processes? Explore the possibilities of Callback24 integration with other available CRM systems!
`;

const systemPrompt = `
${objective}
${styleGuardrails}
${responseGuideline}
## Role
${agentPrompt}
${dataCollection}
`;

export class FunctionCallingLlmClient {
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_APIKEY,
    });
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
    const result: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
    for (const turn of conversation) {
      result.push({
        role: turn.role === "agent" ? "assistant" : "user",
        content: turn.content,
      });
    }
    return result;
  }

  private PreparePrompt(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    funcResult?: FunctionCall,
  ) {
    const transcript = this.ConversationToChatRequestMessages(
      request.transcript,
    );
    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      [
        {
          role: "system",
          content: systemPrompt,
        },
      ];
    for (const message of transcript) {
      requestMessages.push(message);
    }

    if (funcResult) {
      requestMessages.push({
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: funcResult.id,
            type: "function",
            function: {
              name: funcResult.funcName,
              arguments: JSON.stringify(funcResult.arguments),
            },
          },
        ],
      });
      requestMessages.push({
        role: "tool",
        tool_call_id: funcResult.id,
        content: funcResult.result || "",
      });
    }

    if (request.interaction_type === "reminder_required") {
      requestMessages.push({
        role: "user",
        content: "(Now the user has not reponded in a while, you would say:)",
      });
    }
    return requestMessages;
  }

  async DraftResponse(
    request: ResponseRequiredRequest | ReminderRequiredRequest,
    ws: WebSocket,
    funcResult?: FunctionCall,
  ) {
    const requestMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      this.PreparePrompt(request, funcResult);

    let funcCall: FunctionCall | undefined;
    let funcArguments = "";

    try {
      const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
        {
          type: "function",
          function: {
            name: "end_call",
            description: "End the call only when user explicitly requests it.",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description:
                    "The message you will say before ending the call with the customer.",
                },
              },
              required: ["message"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "book_appointment",
            description: "Book an appointment to meet our doctor in office.",
            parameters: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  description:
                    "The message you will say while setting up the appointment like 'one moment'",
                },
                date: {
                  type: "string",
                  description:
                    "The date of appointment to make in forms of year-month-day.",
                },
              },
              required: ["message"],
            },
          },
        },
      ];

      const events = await this.client.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: requestMessages,
        stream: true,
        temperature: 0.1,
        max_tokens: 200,
        frequency_penalty: 1.0,
        presence_penalty: 1.0,
        tools: tools,
      });

      for await (const event of events) {
        if (event.choices.length >= 1) {
          const delta = event.choices[0].delta;
          if (!delta) continue;

          if (delta.tool_calls && delta.tool_calls.length >= 1) {
            const toolCall = delta.tool_calls[0];
            if (toolCall.id) {
              if (funcCall) {
                break;
              } else {
                funcCall = {
                  id: toolCall.id,
                  funcName: toolCall.function?.name || "",
                  arguments: {},
                };
              }
            } else {
              funcArguments += toolCall.function?.arguments || "";
            }
          } else if (delta.content) {
            const res: CustomLlmResponse = {
              response_type: "response",
              response_id: request.response_id,
              content: delta.content,
              content_complete: false,
              end_call: false,
            };
            ws.send(JSON.stringify(res));
          }
        }
      }
    } catch (err) {
      console.error("Error in gpt stream: ", err);
    } finally {
      if (funcCall != null) {
        if (funcCall.funcName === "end_call") {
          funcCall.arguments = JSON.parse(funcArguments);
          const res: CustomLlmResponse = {
            response_type: "response",
            response_id: request.response_id,
            content: funcCall.arguments.message,
            content_complete: true,
            end_call: true,
          };
          ws.send(JSON.stringify(res));
        }

        if (funcCall.funcName === "book_appointment") {
          funcCall.arguments = JSON.parse(funcArguments);
          const res: CustomLlmResponse = {
            response_type: "response",
            response_id: request.response_id,
            content: funcCall.arguments.message,
            content_complete: false,
            end_call: false,
          };
          ws.send(JSON.stringify(res));

          await new Promise((r) => setTimeout(r, 2000));
          funcCall.result = "Appointment booked successfully";
          this.DraftResponse(request, ws, funcCall);
        }
      } else {
        const res: CustomLlmResponse = {
          response_type: "response",
          response_id: request.response_id,
          content: "",
          content_complete: true,
          end_call: false,
        };
        ws.send(JSON.stringify(res));
      }
    }
  }
}
