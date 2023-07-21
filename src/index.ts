// Copyright (c) 2023 Riki Singh Khorana. All rights reserved. MIT License.

import * as dotenv from "dotenv";
import { RakutenPayWatcher } from "./RakutenPayWatcher";
import { exportToMoneyForwardME } from "./exportToMoneyForwardME";

/**
 * 環境変数の読み込み & チェック。
 */

dotenv.config();

const {
  MAILSLURP_API_KEY,
  MAILSLURP_INBOX_ID,
  MONEY_FORWARD_EMAIL,
  MONEY_FORWARD_PW,
} = process.env;

if (!MAILSLURP_API_KEY) {
  console.log("MAILSLURP_API_KEY env variable missing");
  process.exit(1);
}

if (!MAILSLURP_INBOX_ID) {
  console.log("MAILSLURP_INBOX_ID env variable missing");
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
 * 「楽天ペイアプリご利用内容確認メール」をウォッチ。
 * 取引内容を抽出し、マネーフォワード ME に書き出す。
 */

const watcher = new RakutenPayWatcher(MAILSLURP_API_KEY, MAILSLURP_INBOX_ID);
watcher.subscribe((transaction) => {

  const {
    date,
    merchant,
    pointsUsed,
    cashUsed,
  } = transaction;

  // TODO: Dynamically edit category

  const pointPayment = {
    largeCategory: "0",
    middleCategory: "0",
    date,
    amount: pointsUsed,
    source: "0",
    content: `${merchant} 楽天ポイント利用`,
  };

  const cashPayment = {
    largeCategory: "0",
    middleCategory: "0",
    date,
    amount: cashUsed,
    source: "0",
    content: `${merchant} 楽天キャッシュ利用`,
  };

  [pointPayment, cashPayment].forEach((payment) => {
    if (payment.amount > 0) {
      exportToMoneyForwardME(MONEY_FORWARD_EMAIL, MONEY_FORWARD_PW, payment)
        .then(() => {
          console.log("-----\n");
          console.log(transaction);
          console.log("\nExport to Money Forward ME succeeded");
          console.log("\n-----");
        })
        .catch((e) => {
          console.log("-----\n");
          console.log(transaction);
          console.log("\nExport to Money Forward ME failed\n");
          console.error(e);
          console.log("\n-----");
        });
    }
  });
});
