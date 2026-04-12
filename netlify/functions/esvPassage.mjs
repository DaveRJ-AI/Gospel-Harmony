import { handleEsvPassageRequest } from "../../server/esvPassageHandler.mjs";

export default async (req) => handleEsvPassageRequest(req.url);
