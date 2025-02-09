// Copyright (c) 2023-2025 Riki Singh Khorana. All rights reserved. MIT License.

import puppeteer from "puppeteer";

/**
 * マネーフォワード ME カンタン入力に取引を登録する関数。
 *
 * @param email マネーフォワード ID に登録されているメールアドレス
 * @param pw マネーフォワード ID に登録されているパスワード
 * @param payment 取引内容
 */
export async function exportToMoneyForwardME(
  email: string,
  pw: string,
  payment: Payment,
) {
  const {
    largeCategory,
    middleCategory,
    date,
    amount,
    source,
    content,
  } = payment;

  const browser = await puppeteer.launch({ headless: false });

  try {
    const page = await browser.newPage();

    /***********
     * Sign in *
     ***********/

    await page.goto("https://id.moneyforward.com/sign_in");

    await page.type("input[type=email]", email);
    await page.type("input[type=password]", pw);
    await Promise.all([
      // page.click("input[type=submit]"),
      page.click("#submitto"),
      page.waitForNavigation(),
    ]);

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

    await page.$eval("#user_asset_act_large_category_id", (el, val) => {
      (el as HTMLInputElement).value = val;
    }, largeCategory);

    await page.$eval("#user_asset_act_middle_category_id", (el, val) => {
      (el as HTMLInputElement).value = val;
    }, middleCategory);

    await page.$eval("#js-cf-manual-payment-entry-updated-at", (el, val) => {
      (el as HTMLInputElement).value = val;
    }, date);

    await page.type("#js-cf-manual-payment-entry-amount", amount.toString());
    await page.select("#user_asset_act_sub_account_id_hash", source);
    content && await page.type("#js-cf-manual-payment-entry-content", content);
    await page.click("#js-cf-manual-payment-entry-submit-button");

    /*********************
     * Verify submission *
     *********************/

    await page.waitForFunction(() => {
      const transaction = document.querySelector("#recent-transactions-table")?.firstElementChild;
      return transaction?.getAttribute("data-row-index") === "4";
    }, {
      timeout: 10_000,
      polling: 1_000,
    });
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
