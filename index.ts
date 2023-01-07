import * as dotenv from "dotenv";
import { MailSlurp } from "mailslurp-client";
import { parse } from "node-html-parser";
import puppeteer from "puppeteer";

/**
 * 楽天ペイアプリご利用内容確認メール
 *
 * ↓ transferable content ↓
 *
 * マネーフォワード ME カンタン入力
 */
export interface PayContent {
  date: string;
  amount: string;
  content: string;
};

/**
 * A function that reacts to new transactions.
 */
export type Subscriber = (payContent: PayContent) => void;

/**
 * A class that watches incoming transaction emails.
 */
export class MailWatcher {
  private mailslurp: MailSlurp;
  private inboxId: string;
  private subscribers: Map<string, Subscriber>;

  constructor(apiKey: string, inboxId: string) {
    this.mailslurp = new MailSlurp({ apiKey });
    this.inboxId = inboxId;
    this.subscribers = new Map();
    this.ping = this.ping.bind(this);
    this.ping();
    setInterval(this.ping, 5 * 60 * 1000) // every 5 minutes
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
    const emails = await this.mailslurp.getEmails(this.inboxId);
    emails
      .filter((email) => !email.read)
      .forEach(async (email) => {
        const { id } = email;
        const { body } = await this.mailslurp.getEmail(id);
        if (!!body) {
          const payContent = this.parseEmailBody(body);
          if (this.isValidPayContent(payContent)) {
            this.subscribers.forEach((subscriber) => {
              subscriber(payContent);
            });
          }
        }
      });
  }

  private parseEmailBody(body: string): PayContent {
    const payContent: PayContent = {
      date: "",
      amount: "",
      content: "",
    };

    const htmlRoot = parse(body);
    htmlRoot.getElementsByTagName("td").forEach((td) => {
      switch (td.textContent.trim()) {
        case "ご利用日時": {
          const date = td.nextElementSibling.textContent.trim().slice(0, 10);
          payContent.date = date;
          break;
        }

        case "決済総額": {
          const amount = td.nextElementSibling.textContent.trim().slice(1);
          payContent.amount = amount;
          break;
        }

        case "ご利用店舗": {
          const content = td.nextElementSibling.textContent.trim();
          payContent.content = `${content} 楽天ペイ`;
          break;
        }

        default: {
          // do nothing
        }
      }
    });

    return payContent;
  }

  private isValidPayContent(payContent: PayContent): boolean {
    return (
      payContent.date !== ""
      && payContent.amount !== ""
      && payContent.content !== ""
    );
  }
}

/**
 * Import the transaction into Money Forward ME.
 */
async function importToMoneyForwardME(
  id: string,
  pw: string,
  payContent: PayContent
) {
  const {
    date,
    amount,
    content,
  } = payContent;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  /**
   * Sign in.
   */

  await page.goto("https://id.moneyforward.com/sign_in/email");

  await page.type(".inputItem", id);
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

  await page.type("#js-cf-manual-payment-entry-amount", amount);
  await page.type("#js-cf-manual-payment-entry-content", content);
  // @ts-ignore - el.value always exists
  await page.$eval("#js-cf-manual-payment-entry-updated-at", (el, val) => el.value = val, date);

  // @ts-ignore - el.value always exists
  await page.$eval("#user_asset_act_large_category_id", (el) => el.value = "0");
  // @ts-ignore - el.value always exists
  await page.$eval("#user_asset_act_middle_category_id", (el) => el.value = "0");
  await page.select("#user_asset_act_sub_account_id_hash", "0"); // select なし

  await page.click("#js-cf-manual-payment-entry-submit-button");
  await browser.close();

  console.log(payContent);
}

/**********
 * SCRIPT *
 **********/

dotenv.config();

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
  watcher.subscribe("import to Money Forward ME", (payContent) => {
    importToMoneyForwardME(MONEY_FORWARD_EMAIL, MONEY_FORWARD_PW, payContent);
  });

  console.log("Started watching...");
}
