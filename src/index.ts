import dotenv from "dotenv";
dotenv.config({ path: `.env.${process.env.NODE_ENV}` });

import { Server } from "./server";

const server = new Server();
server.listen(8080);
