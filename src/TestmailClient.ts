// Copyright (c) 2023-2025 Riki Singh Khorana. All rights reserved. MIT License.

export class TestmailClient {
    private apiKey: string;
    private namespace: string;
    private tag?: string;

    constructor(apiKey: string, namespace: string, tag?: string) {
      this.apiKey = apiKey;
      this.namespace = namespace;
      this.tag = tag;
    }

    async get(from?: Date) {
      const now = new Date().toLocaleTimeString();
      const url = new URL("https://api.testmail.app/api/json");
      url.searchParams.set("apikey", this.apiKey);
      url.searchParams.set("namespace", this.namespace);
      url.searchParams.set("limit", "100");
      this.tag && url.searchParams.set("tag", this.tag);
      const timestampFrom = from?.getTime().toString();
      timestampFrom && url.searchParams.set("timestamp_from", timestampFrom);
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.log(` ❌ ${now} メール取得に失敗しました。${res.status} - ${res.statusText}`);
        return;
      }

      const response: ApiResponse = await res.json();
      if (response.result === "fail") {
        console.log(` ❌ ${now} メール取得に失敗しました。${res.status} - ${response.message}`);
        return;
      }

      return response.emails;
    }
}

/**
 * https://testmail.app/docs/#json-api-guide
 */
interface ApiResponse {
  result: "success" | "fail";
  message: string | null;
  count: number;
  limit: number;
  offset: number;
  emails: EmailObject[];
};

export interface EmailObject {
  id: string;
  html?: string;
  downloadUrl: string;
};
