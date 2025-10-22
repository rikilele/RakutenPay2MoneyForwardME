// Copyright (c) 2023-2025 Riki Singh Khorana. All rights reserved. MIT License.

import puppeteer from "puppeteer";
import { TestmailClient } from "./TestmailClient";
import { delay } from "./utils";

/**
 * マネーフォワード ME カンタン入力に取引を登録する関数。
 *
 * @param email マネーフォワード ID に登録されているメールアドレス
 * @param pw マネーフォワード ID に登録されているパスワード
 * @param testmailClient testmail.app client オブジェクト
 * @param payments 取引内容の配列
 */
export async function exportToMoneyForwardME(
  email: string,
  pw: string,
  testmailClient: TestmailClient,
  payments: Payment[],
) {
  const now = new Date();
  const browser = await puppeteer.launch({ headless: false });

  try {
    const page = await browser.newPage();

    /*********************
     * Enter credentials *
     *********************/

    await page.goto("https://id.moneyforward.com/sign_in");

    await page.type("input[type=email]", email);
    await Promise.all([
      // page.click("input[type=submit]"),
      page.click("#submitto"),
      page.waitForNavigation(),
    ]);

    await page.type("input[type=password]", pw);
    await Promise.all([
      // page.click("input[type=submit]"),
      page.click("#submitto"),
      page.waitForNavigation(),
    ]);

    /*******************
     * Verify 2FA code *
     *******************/

    await delay(10_000); // Wait 10 seconds for 2FA email to arrive
    const emails = await testmailClient.get(now);
    if (!emails) {
      throw new Error("Failed to retrieve 2FA email");
    }

    const code = emails[0].html?.match(/(\d{6})/)?.[0];
    await page.type("input[inputmode=numeric]", `${code}`);
    await Promise.all([
      // page.click("input[type=submit]"),
      page.click("#submitto"),
      page.waitForNavigation(),
    ]);

    /******************
     * Select account *
     ******************/

    await page.goto("https://moneyforward.com/sign_in");
    const buttons = await page.$$("button");
    for (const button of buttons) {
      const buttonText = await page.evaluate(el => el.innerText, button);
      if (buttonText.includes(email)) {
        await Promise.all([
          button.click(),
          page.waitForNavigation(),
        ]);

        break;
      }
    }

    /*****************
     * Input payment *
     *****************/

    for (const payment of payments) {
      const {
        largeCategory,
        middleCategory,
        date,
        amount,
        source,
        content,
      } = payment;

      const tab = await browser.newPage();
      await tab.goto("https://moneyforward.com");

      await tab.$eval("#user_asset_act_large_category_id", (el, val) => {
        (el as HTMLInputElement).value = val;
      }, largeCategory);

      await tab.$eval("#user_asset_act_middle_category_id", (el, val) => {
        (el as HTMLInputElement).value = val;
      }, middleCategory);

      await tab.$eval("#js-cf-manual-payment-entry-updated-at", (el, val) => {
        (el as HTMLInputElement).value = val;
      }, date);

      await tab.type("#js-cf-manual-payment-entry-amount", amount.toString());
      await tab.select("#user_asset_act_sub_account_id_hash", source);
      content && await tab.type("#js-cf-manual-payment-entry-content", content);
      await tab.click("#js-cf-manual-payment-entry-submit-button");

      await delay(5_000); // Wait 5 seconds for submission to complete
    }
  } catch (err) {
    throw err;
  } finally {
    await browser.close();
  }
}

/**
 * マネーフォワード ME カンタン入力から登録できる取引内容。
 */
export interface Payment {

  /** 大項目 */
  largeCategory: string;

  /** 中項目 */
  middleCategory: string;

  /** 日付 */
  date: string;

  /** 金額 */
  amount: number;

  /** 支出元 */
  source: string;

  /** 内容（任意）*/
  content?: string;
};
