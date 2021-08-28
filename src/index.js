const WebSocket = require("ws");
var fs = require("fs");

let rawdata = fs.readFileSync("config.json");
let config = JSON.parse(rawdata);
console.log(config);

const ws = new WebSocket("wss://ws.kraken.com");
const tradesStream = fs.createWriteStream("files/trades.txt");
const askSnapshotStream = fs.createWriteStream("files/ask-snapshot.txt");
const bidSnapshotStream = fs.createWriteStream("files/bid-snapshot.txt");
const askOrderbookStream = fs.createWriteStream("files/ask-orderbook.txt");
const bidOrderbookStream = fs.createWriteStream("files/bid-orderbook.txt");

ws.on("open", function open() {
  console.log("Connected to kraken websocket");
  console.log("Requesting XBT/USD order books and trade");

  if (config.trades) {
    ws.send(
      JSON.stringify({
        event: "subscribe",
        pair: config.pair,
        subscription: { name: "trade" },
      })
    );
  }

  if (config.orderBook) {
    ws.send(
      JSON.stringify({
        event: "subscribe",
        pair: config.pair,
        subscription: { name: "book", depth: config.depth },
      })
    );
  }
});

ws.on("message", function incoming(data) {
  const parsedData = JSON.parse(data);

  if (parsedData[2] === "trade") {
    parsedData[1].forEach((trade) =>
      tradesStream.write(
        `${trade[0]};${trade[1]};${trade[2]};${trade[3]};${trade[4]}\n`
      )
    );
  }

  if (parsedData[2] === `book-${config.depth}`) {
    if (parsedData[1].as) {
      parsedData[1].as.forEach((askSnapshot) =>
        askSnapshotStream.write(
          `${askSnapshot[0]};${askSnapshot[1]};${askSnapshot[2]}\n`
        )
      );
    }

    if (parsedData[1].bs) {
      parsedData[1].bs.forEach((bidSnapshot) =>
        bidSnapshotStream.write(
          `${bidSnapshot[0]};${bidSnapshot[1]};${bidSnapshot[2]}\n`
        )
      );
    }

    if (parsedData[1].a) {
      parsedData[1].a.forEach((asks) => {
        askOrderbookStream.write(`${asks[0]};${asks[1]};${asks[2]};`);
        if (asks[3]) {
          askOrderbookStream.write(`${asks[3]}`);
        }
      });
      askOrderbookStream.write("\n");
    }

    if (parsedData[1].b) {
      parsedData[1].b.forEach((bids) => {
        bidOrderbookStream.write(`${bids[0]};${bids[1]};${bids[2]};`);
        if (bids[3]) {
          bidOrderbookStream.write(`${bids[3]}`);
        }
      });
      bidOrderbookStream.write("\n");
    }
  }
});
