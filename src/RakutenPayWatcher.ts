// Copyright (c) 2023 Riki Singh Khorana. All rights reserved. MIT License.

import { MailSlurp } from "mailslurp-client";
import { parse } from "node-html-parser";

/**
 * MailSlurp に送られてくる「楽天ペイアプリご利用内容確認メール」から取引内容を抽出し、
 * それらに対してアクションを起こす関数を管理・通知を飛ばすクラス。
 */
export class RakutenPayWatcher {

  /** MailSlurp API Controller */
  private mailslurp: MailSlurp;

  /** The MailSlurp Inbox ID that receives Rakuten Pay emails */
  private inboxId: string;

  /** List of subscribers to Rakuten Pay transactions */
  private subscribers: RakutenPaySubscriber[];

  /**
   * MailSlurp に送られてくる「楽天ペイアプリご利用内容確認メール」から取引内容を抽出し、
   * それらに対してアクションを起こす関数を管理・通知を飛ばすオブジェクトを生成。
   *
   * @param apiKey MailSlurp の API キー
   * @param inboxId 受信トレイの ID
   * @param pingInterval メールサーバーの ping 頻度。デフォルト５分
   */
  constructor(apiKey: string, inboxId: string, pingInterval = 5 * 60 * 1000) {
    this.mailslurp = new MailSlurp({ apiKey });
    this.inboxId = inboxId;
    this.subscribers = [];

    // set up ping
    this.ping();
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
    this.printPingTime();
    try {
      (await this.mailslurp.getEmails(this.inboxId))
        .filter((email) => !email.read)
        .forEach(async (email) => {
          const { id } = email;
          const { body } = await this.mailslurp.getEmail(id);
          if (body) {
            const transaction = this.parseEmailBody(body);
            if (this.isValidTransaction(transaction)) {
              this.subscribers.forEach((subscriber) => subscriber(transaction));
            }
          }
        });
    } catch (e) {
      console.log("\nPing failed\n");
      console.error(e);
    }
  }

  private printPingTime() {
    const now = new Date();
    console.log(`Ping ${now.toDateString()} ${now.toTimeString()}`);
  }

  private parseEmailBody(body: string): RakutenPayTransaction {
    const result: RakutenPayTransaction = {
      date: "",
      merchant: "",
      totalAmount: 0,
      pointsUsed: 0,
      amountPaid: 0,
    };

    const htmlRoot = parse(body);
    htmlRoot.getElementsByTagName("td").forEach((td) => {
      switch (td.textContent.trim()) {
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

        case "ポイント/キャッシュ利用": {
          const pointsUsed = td.nextElementSibling.textContent.trim().slice(2);
          result.pointsUsed = parseInt(pointsUsed.replaceAll(",", ""), 10);
          break;
        }

        case "お支払金額": {
          const amountPaid = td.nextElementSibling.textContent.trim().slice(1);
          result.amountPaid = parseInt(amountPaid.replaceAll(",", ""), 10);
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
      amountPaid,
    } = transaction;

    return (
      date !== ""
      && merchant !== ""
      && totalAmount !== 0
      && totalAmount === (pointsUsed + amountPaid)
    );
  }
}

/**
 * 「楽天ペイアプリご利用内容確認メール」から読み取れる取引内容。
 */
export interface RakutenPayTransaction {

  /** ご利用日時： YYYY/MM/DD */
  date: string;

  /** ご利用店舗 */
  merchant: string;

  /** 決済総額 */
  totalAmount: number;

  /** ポイント/キャッシュ利用 */
  pointsUsed: number;

  /** お支払金額 */
  amountPaid: number;
};

/**
 * 新規の楽天ペイ取引内容に対してアクションを実行する関数。
 */
export type RakutenPaySubscriber = (transaction: RakutenPayTransaction) => void;
