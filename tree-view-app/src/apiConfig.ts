/**
 * Global API config mapping tabs and chat buttons to backend API endpoints.
 */

export type ApiConfig = {
  [tabName: string]: {
    [buttonName: string]: string;
  };
};

export const apiConfig: ApiConfig = {
  Conversion: {
    "Ask ChatGPT": "/api/ask-chatgpt",
    Streamed: "/api/ask-chatgpt_streamed_general",
  },
  "No Image": {
    "Ask ChatGPT": "/api/ask-chatgpt",
    Streamed: "/api/ask-chatgpt_streamed_noimage",
  },
  General: {
    "Ask ChatGPT": "/api/ask-chatgpt_general",
    Streamed: "/api/ask-chatgpt_streamed_general",
  },
};
