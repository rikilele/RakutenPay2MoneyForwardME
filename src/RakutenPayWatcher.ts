// Copyright (c) 2023-2025 Riki Singh Khorana. All rights reserved. MIT License.

import { parse } from "node-html-parser";

/**
 * testmail.app に送られてくる「楽天ペイアプリご利用内容確認メール」と
 * 「楽天ペイ 注文受付（自動配信メール）」から取引内容を抽出し、
 * それらに対してアクションを起こす関数を管理・通知を飛ばすクラス。
 */
export class RakutenPayWatcher {

  /** testmail.app API Key */
  private apiKey: string;

  /** testmail.app Namespace (required) */
  private namespace: string;

  /** testmail.app Tag that receives Rakuten Pay emails (optional) */
  private tag?: string;

  /** unix timestamp of last ping */
  private lastPing?: string;

  /** List of subscribers to Rakuten Pay transactions */
  private subscribers: RakutenPaySubscriber[];

  /**
   * testmail.app に送られてくる「楽天ペイアプリご利用内容確認メール」と
   * 「楽天ペイ 注文受付（自動配信メール）」から取引内容を抽出し、
   * それらに対してアクションを起こす関数を管理・通知を飛ばすオブジェクトを生成。
   *
   * @param apiKey testmail.app の API キー
   * @param namespace testmail.app で割り当てられた namespace
   * @param tag testmail.app に楽天ペイのメールを転送する際に使用した tag
   * @param pingInterval メールサーバーへの ping 頻度。デフォルト５分
   */
  constructor(
    apiKey: string,
    namespace: string,
    tag?: string,
    pingInterval = 5 * 60 * 1000
  ) {
    this.apiKey = apiKey;
    this.namespace = namespace;
    this.tag = tag;
    this.subscribers = [];

    // set up ping
    this.lastPing = Date.now().toString();
    setInterval(() => this.ping(), pingInterval);
  }

  subscribe(fn: RakutenPaySubscriber) {
    this.subscribers.push(fn);
  }

  /**
   * Pings the mail server.
   * Extracts the transaction information and notifies subscribers on new mail.
   */
  private async ping() {
    const now = new Date();
    const timestamp = now.getTime().toString();
    const timeString = now.toLocaleTimeString();
    try {
      const url = new URL("https://api.testmail.app/api/json");
      url.searchParams.set("apikey", this.apiKey);
      url.searchParams.set("namespace", this.namespace);
      url.searchParams.set("limit", "100");
      this.lastPing && url.searchParams.set("timestamp_from", this.lastPing);
      this.tag && url.searchParams.set("tag", this.tag);
      const res = await fetch(url.toString());
      if (!res.ok) {
        console.log(` ❌ ${timeString} メール取得に失敗しました。${res.status} - ${res.statusText}`);
        return;
      }

      const response: ApiResponse = await res.json();
      if (response.result === "fail") {
        console.log(` ❌ ${timeString} メール取得に失敗しました。${res.status} - ${response.message}`);
        return;
      }

      // ping was successful
      this.lastPing = timestamp;
      const { emails } = response;
      for (const { id, html, downloadUrl } of emails) {
        if (html) {
          const transaction = this.parseEmailBody(html);
          if (
            this.isValidTransaction(transaction)
            && (transaction.pointsUsed > 0 || transaction.cashUsed > 0)
          ) {
            this.subscribers.forEach((subscriber) => subscriber(id, downloadUrl, transaction));
          } else {
            console.log(` ❌ ${timeString} メール内容を正しく読み取れませんでした。${downloadUrl}`);
          }
        }
      }
    } catch {
      console.log(` ❌ ${timeString} サーバーとの通信に失敗しました。`);
    }
  }

  /**
   * Given raw HTML from a Rakuten Pay email, parse out the transaction details.
   */
  private parseEmailBody(body: string): RakutenPayTransaction {
    const result: RakutenPayTransaction = {
      date: "",
      merchant: "",
      totalAmount: 0,
      pointsUsed: 0,
      cashUsed: 0,
      cardUsed: 0,
    };

    const htmlRoot = parse(body);
    htmlRoot.getElementsByTagName("td").forEach((td) => {
      switch (td.textContent.trim()) {

        /**
         * 楽天ペイアプリご利用内容確認メール
         */

        case "ご利用日時": {
          result.date = td.nextElementSibling.textContent.trim().slice(0, 10);
          break;
        }

        case "ご利用店舗": {
          result.merchant = td.nextElementSibling.textContent.trim();
          break;
        }

        case "決済総額": {
          const totalAmount = td.nextElementSibling.textContent.trim().slice(1);
          result.totalAmount = parseInt(totalAmount.replaceAll(",", ""), 10);
          break;
        }

        case "ポイント": {
          const pointsUsed = td.nextElementSibling.textContent.trim();
          result.pointsUsed = parseInt(pointsUsed.replaceAll(",", ""), 10);
          break;
        }

        case "楽天キャッシュ": {
          const amountPaid = td.nextElementSibling.textContent.trim().slice(1);
          result.cashUsed = parseInt(amountPaid.replaceAll(",", ""), 10);
          break;
        }

        case "カード": {
          const amountPaid = td.nextElementSibling.textContent.trim().slice(1);
          result.cardUsed = parseInt(amountPaid.replaceAll(",", ""), 10);
          break;
        }

        /**
         * 楽天ペイ 注文受付（自動配信メール）
         */

        case "ご注文日：": {
          result.date = td.parentNode.nextElementSibling.textContent.trim().slice(0, 10).replaceAll("-", "/");
          break;
        }

        case "ご注文商品名：": {
          result.merchant = td.parentNode.nextElementSibling.textContent.trim();
          break;
        }

        case "ご注文金額：": {
          const totalAmount = td.nextElementSibling.textContent.trim().slice(0, -1);
          result.totalAmount = parseInt(totalAmount.replaceAll(",", ""), 10);
          break;
        }

        case "ポイント/キャッシュ利用：": {
          const amountPaid = td.nextElementSibling.textContent.trim().slice(1, -1);
          result.cashUsed = parseInt(amountPaid.replaceAll(",", ""), 10);
          break;
        }

        case "お支払い金額：": {
          const amountPaid = td.nextElementSibling.textContent.trim().slice(0, -1);
          result.cardUsed = parseInt(amountPaid.replaceAll(",", ""), 10);
          break;
        }

        case "ご利用サイト：": {
          const merchant = td.parentNode.nextElementSibling.textContent.trim();
          result.merchant = merchant + (result.merchant !== "" ? ` ${result.merchant}` : result.merchant);
          break;
        }

        default: { /* do nothing */ }
      }
    });

    return result;
  }

  private isValidTransaction(transaction: RakutenPayTransaction): boolean {
    const {
      date,
      merchant,
      totalAmount,
      pointsUsed,
      cashUsed,
      cardUsed,
    } = transaction;

    return (
      date !== ""
      && merchant !== ""
      && totalAmount !== 0
      && totalAmount === (pointsUsed + cashUsed + cardUsed)
    );
  }
}

interface EmailObject {
  id: string;
  html: string;
  downloadUrl: string;
};

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

/**
 * 「楽天ペイアプリご利用内容確認メール」と「楽天ペイ 注文受付（自動配信メール）」から読み取れる取引内容。
 */
export interface RakutenPayTransaction {
  /** ご利用日時： YYYY/MM/DD */
  date: string;

  /** ご利用店舗 */
  merchant: string;

  /** 決済総額 */
  totalAmount: number;

  /** ポイント */
  pointsUsed: number;

  /** 楽天キャッシュ */
  cashUsed: number;

  /** カード */
  cardUsed: number;
};

/**
 * 新規の楽天ペイ取引内容に対してアクションを実行する関数。
 */
export type RakutenPaySubscriber = (emailId: string, emailUrl: string, transaction: RakutenPayTransaction) => void;
