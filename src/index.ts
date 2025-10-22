// Copyright (c) 2023-2025 Riki Singh Khorana. All rights reserved. MIT License.

import * as dotenv from "dotenv";
import { RakutenPayWatcher } from "./RakutenPayWatcher";
import { exportToMoneyForwardME, Payment } from "./exportToMoneyForwardME";
import { TestmailClient } from "./TestmailClient";

/**
 * 環境変数の読み込み & チェック。
 */

dotenv.config();

const {
  TESTMAIL_API_KEY,
  TESTMAIL_NAMESPACE,
  MONEY_FORWARD_EMAIL,
  MONEY_FORWARD_PW,
} = process.env;

if (!TESTMAIL_API_KEY) {
  console.log("TESTMAIL_API_KEY env variable missing");
  process.exit(1);
}

if (!TESTMAIL_NAMESPACE) {
  console.log("TESTMAIL_NAMESPACE env variable missing");
  process.exit(1);
}

if (!MONEY_FORWARD_EMAIL) {
  console.log("MONEY_FORWARD_EMAIL env variable missing");
  process.exit(1);
}

if (!MONEY_FORWARD_PW) {
  console.log("MONEY_FORWARD_PW env variable missing");
  process.exit(1);
}

/**
 * Splash screen
 */

process.stdout.write("\x1Bc");
console.log("\x1b[1m\x1b[38;5;172m%s\x1b[0m", "\n   RakutenPay2MoneyForwardME 0.2.0\n");

/**
 * 「楽天ペイアプリご利用内容確認メール」と「楽天ペイ 注文受付（自動配信メール）」をウォッチ。
 * 取引内容を抽出し、マネーフォワード ME に書き出す。
 */

const rpTestmailClient = new TestmailClient(TESTMAIL_API_KEY, TESTMAIL_NAMESPACE, "rp");
const mfTestmailClient = new TestmailClient(TESTMAIL_API_KEY, TESTMAIL_NAMESPACE, "mf");
const watcher = new RakutenPayWatcher(rpTestmailClient);
watcher.subscribe((transactions) => {
  const payments: Payment[] = [];
  transactions.forEach((transaction) => {
    const {
      date,
      merchant,
      pointsUsed,
      cashUsed,
    } = transaction;

    // TODO: Dynamically edit category

    if (pointsUsed > 0) {
      console.log(` ⏬ ${date} ${merchant} 楽天ポイント利用 ${pointsUsed}`);
      payments.push({
        largeCategory: "0",
        middleCategory: "0",
        date,
        amount: pointsUsed,
        source: "0",
        content: `${merchant} 楽天ポイント利用`,
      });
    }

    if (cashUsed > 0) {
      console.log(` ⏬ ${date} ${merchant} 楽天キャッシュ利用 ${cashUsed}`);
      payments.push({
        largeCategory: "0",
        middleCategory: "0",
        date,
        amount: cashUsed,
        source: "0",
        content: `${merchant} 楽天キャッシュ利用`,
      });
    }
  });

  if (payments.length > 0) {
    const now = new Date();
    const dateString = now.toISOString().split("T")[0].replaceAll("-", "/");
    const timeString = now.toLocaleTimeString();
    exportToMoneyForwardME(MONEY_FORWARD_EMAIL, MONEY_FORWARD_PW, mfTestmailClient, payments)
      .catch((e) => {
        console.error(`\n ${dateString} ${timeString} ❌ マネーフォワードへの書き出しに失敗しました。`);
        console.error(e);
        console.log();
      });
  }
});
