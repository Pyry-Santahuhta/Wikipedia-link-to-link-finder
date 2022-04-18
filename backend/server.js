//Pyry Santahuhta 09.04.2022
//Source: Node ver 17.9.0 documentation
const express = require("express");
const cluster = require("cluster");
const { cpus } = require("os");
const fetch = require("node-fetch");
const port = 3001;
if (cluster.isPrimary) {
  // Start workers and listen for messages containing notifyRequest
  const numCPUs = cpus().length;
  console.log(`Number of CPUs is ${numCPUs}`);
  console.log(`Master ${process.pid} is running`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Count requests
  function messageHandler(msg) {
    if (msg.cmd && msg.cmd === "notifyRequest") {
      numReqs += 1;
    }
  }

  const app = express();

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });
  app.get("/api/:pageone/:pagetwo", async function (req, res) {
    //Get the links of the first page the user gave
    const links = await queryWikipediaAPI(req.params.pageone);

    //Split the list of links to chunks for the workers to handle
    const workerChunks = [];
    for (let i = numCPUs; i > 0; i--) {
      workerChunks.push(links.splice(0, Math.ceil(links.length / i)));
    }
  });
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });
} else {
  console.log(`Worker ${process.pid} started`);

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    console.log("Let's fork another worker!");
    cluster.fork();
  });
}

async function breadthFirstSearch(currentNode, searchValue) {
  let queue = [];
  let pages = await queryWikipediaAPI(currentNode);
  for (var page in pages) {
    for (var link of pages[page].links) {
      if (searchValue === link.title) {
        console.log("found the fokker");
      } else {
        breadthFirstSearch(link.title, searchValue);
      }
    }
  }
  queue.push(currentNode);
  /*while (queue.length > 0) {
    let currentNode = queue[0];
  }*/
}

async function queryWikipediaAPI(searchTerm) {
  let url = new URL(
    "http://en.wikipedia.org/w/api.php?origin=*&action=query&titles=" +
      searchTerm +
      "&format=json&prop=links&pllimit=400"
  );
  const response = await fetch(url, {
    method: "GET",
  });
  const data = await response.json();
  if (data.query.pages) {
    for (page in data.query.pages) {
      return data.query.pages[page].links;
    }
  } else {
    return null;
  }
}
