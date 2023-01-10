// Copyright (c) 2023 Riki Singh Khorana. All rights reserved. MIT License.

import * as dotenv from "dotenv";
import { MailSlurp } from "mailslurp-client";
import { parse } from "node-html-parser";
import puppeteer from "puppeteer";

/**
 * A transaction information that can translate from
 * 楽天ペイアプリご利用内容確認メール to マネーフォワード ME カンタン入力
 */
export interface Transaction {
  date: string;
  amount: string;
  content: string;
};

/**
 * A function that reacts to new transactions.
 */
export type Subscriber = (transaction: Transaction) => void;

/**
 * A class that watches incoming transaction emails.
 */
export class MailWatcher {
  private mailslurp: MailSlurp;
  private inboxId: string;
  private subscribers: Map<string, Subscriber>;

  /**
   * @param apiKey API Key for MailSlurp
   * @param inboxId The Inbox ID of the inbox that receives Rakuten Pay emails.
   */
  constructor(apiKey: string, inboxId: string) {
    this.mailslurp = new MailSlurp({ apiKey });
    this.inboxId = inboxId;
    this.subscribers = new Map();
    this.ping = this.ping.bind(this);

    // First ping
    this.ping();

    // Every 5 minutes hereafter
    setInterval(this.ping, 5 * 60 * 1000);
  }

  subscribe(id: string, fn: Subscriber) {
    this.subscribers.set(id, fn);
  }

  unsubscribe(id: string) {
    this.subscribers.delete(id);
  }

  clear() {
    this.subscribers.clear();
  }

  /**
   * Pings the mail server.
   * If there are new emails, notifies subscribers.
   */
  private async ping() {
    this.printPingTime();
    try {
      (await this.mailslurp.getEmails(this.inboxId))
        .filter((email) => !email.read)
        .forEach(async (email) => {
          const { id } = email;
          const { body } = await this.mailslurp.getEmail(id);
          if (!!body) {
            const transaction = this.parseEmailBody(body);
            if (this.isValidTransaction(transaction)) {
              this.subscribers.forEach((subscriber) => subscriber(transaction));
            }
          }
        });
    } catch (e) {
      console.log("Ping failed");
      console.error(e);
    }
  }

  private printPingTime() {
    const now = new Date();
    console.log(`Ping ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`);
  }

  private parseEmailBody(body: string): Transaction {
    const transaction: Transaction = {
      date: "",
      amount: "",
      content: "",
    };

    const htmlRoot = parse(body);
    htmlRoot.getElementsByTagName("td").forEach((td) => {
      switch (td.textContent.trim()) {
        case "ご利用日時": {
          const date = td.nextElementSibling.textContent.trim().slice(0, 10);
          transaction.date = date;
          break;
        }

        case "ポイント/キャッシュ利用": {
          const amount = td.nextElementSibling.textContent.trim().slice(2);
          transaction.amount = amount;
          break;
        }

        case "ご利用店舗": {
          const content = td.nextElementSibling.textContent.trim();
          transaction.content = `${content} 楽天ポイント/キャッシュ利用`;
          break;
        }

        default: {
          // do nothing
        }
      }
    });

    return transaction;
  }

  private isValidTransaction(transaction: Transaction): boolean {
    return (
      transaction.date !== ""
      && transaction.amount !== ""
      && transaction.content !== ""
    );
  }
}

/**
 * Import the transaction into Money Forward ME.
 */
async function importToMoneyForwardME(
  email: string,
  pw: string,
  transaction: Transaction
) {
  const {
    date,
    amount,
    content,
  } = transaction;

  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  /**
   * Sign in.
   */

  await page.goto("https://id.moneyforward.com/sign_in/email");

  await page.type(".inputItem", email);
  await Promise.all([
    page.click(".submitBtn"),
    page.waitForNavigation(),
  ]);

  await page.type(".inputItem", pw);
  await Promise.all([
    page.click(".submitBtn"),
    page.waitForNavigation(),
  ]);

  await page.goto("https://moneyforward.com/sign_in");
  await Promise.all([
    page.click(".submitBtn"),
    page.waitForNavigation(),
  ]);

  /**
   * Input content.
   */

  // 金額
  await page.type("#js-cf-manual-payment-entry-amount", amount);

  // 内容
  await page.type("#js-cf-manual-payment-entry-content", content);

  // 日付
  await page.$eval("#js-cf-manual-payment-entry-updated-at", (el, val) => {
    (el as HTMLInputElement).value = val;
  }, date);

  // 大項目：未分類 ("0")
  await page.$eval("#user_asset_act_large_category_id", (el) => {
    (el as HTMLInputElement).value = "0";
  });

  // 中項目：未分類 ("0")
  await page.$eval("#user_asset_act_middle_category_id", (el) => {
    (el as HTMLInputElement).value = "0";
  });

  // 支出元：なし ("0")
  await page.select("#user_asset_act_sub_account_id_hash", "0");

  await page.click("#js-cf-manual-payment-entry-submit-button");
  await browser.close();
}

/**********
 * SCRIPT *
 **********/

dotenv.config();

// Load environment variables
const {
  MAILSLURP_API_KEY,
  MAILSLURP_INBOX_ID,
  MONEY_FORWARD_EMAIL,
  MONEY_FORWARD_PW,
} = process.env;

if (
  MAILSLURP_API_KEY
  && MAILSLURP_INBOX_ID
  && MONEY_FORWARD_EMAIL
  && MONEY_FORWARD_PW
) {
  const watcher = new MailWatcher(MAILSLURP_API_KEY, MAILSLURP_INBOX_ID);
  watcher.subscribe("Import to Money Forward ME", async (transaction) => {
    console.log("---");
    console.log(transaction);
    try {
      await importToMoneyForwardME(MONEY_FORWARD_EMAIL, MONEY_FORWARD_PW, transaction);
      console.log("Import to Money Forward ME succeeded");
    } catch (e) {
      console.log("Import to Money Forward ME failed\n");
      console.error(e);
    }

    console.log("---");
  });
}
