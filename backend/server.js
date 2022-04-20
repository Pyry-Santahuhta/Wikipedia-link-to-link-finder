//Pyry Santahuhta 09.04.2022
//Source: Node ver 17.9.0 documentation
const express = require("express");
const cluster = require("cluster");
const { cpus } = require("os");
const fetch = require("node-fetch");
const port = 3001;

//Master branch
if (cluster.isPrimary) {
  // Start workers and listen for messages containing notifyRequest
  const numCPUs = cpus().length;

  console.log(`Number of CPUs is ${numCPUs}`);
  console.log(`Master ${process.pid} is running`);

  // Receive messages from workers
  function messageFromWorker(msg) {
    console.log(msg);
    if (msg.foundResult) {
      console.log(
        "\n**************************************\n" +
          msg.foundResult +
          "***************************************************\n"
      );
      for (var id in cluster.workers) {
        cluster.workers[id].kill();
      }
    }
    endTime = new Date();
    var timeDiff = endTime - startTime; //in ms
    timeDiff /= 1000;
    console.log("Time: " + timeDiff);
  }

  //Fork as many workers as there are cores
  for (let i = 0; i < numCPUs; i++) {
    worker = cluster.fork();
    worker.on("message", messageFromWorker);
  }

  const app = express();

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  //
  app.get("/api/:pageone/:pagetwo", async function (req, res) {
    //Get the links of the first page the user gave
    const links = await queryWikipediaAPI(req.params.pageone);
    startTime = new Date();
    //Solve the trivial case of the pages being linked
    for (let i = 0; i < links.length; i++) {
      if (links[i].title.toUpperCase() == req.params.pagetwo.toUpperCase()) {
        console.log(links[i].title);
        res.send("From " + req.params.pageone + " to " + links[i].title);
      }
    }

    //Split the list of links to chunks for the workers to handle
    const workerChunks = [];
    for (let i = numCPUs; i > 0; i--) {
      workerChunks.push(links.splice(0, Math.ceil(links.length / i)));
    }
    //Send a chunk of the links to each worker
    for (const id in cluster.workers) {
      cluster.workers[id].send({
        searchValue: req.params.pagetwo,
        list: workerChunks[id - 1],
      });
      worker = cluster.workers[id];
    }
  });

  //Listen for frontend requests
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });

  //Worker branch
} else {
  console.log(`Worker ${process.pid} started`);

  process.on("message", function messageFromMaster(msg) {
    if (msg.searchValue && msg.list) {
      var searchValue = msg.searchValue;
      breadthFirstSearch(msg.list, searchValue);
    }
  });

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
    console.log("Let's fork another worker!");
    cluster.fork();
  });
}

async function breadthFirstSearch(startLinks, searchValue) {
  var queue = [];
  let visitedNodes = [];
  var currentLinks = [];
  var depth = 0;
  for (let i = 0; i < startLinks.length; i++) {
    queue.push(startLinks[i].title);
    visitedNodes[startLinks[i]] = true;
  }
  for (let i = 0; i < queue.length; i++) {
    var currentNode = queue.shift();
    if (queue[i] && !visitedNodes[currentNode]) {
      currentLinks = await queryWikipediaAPI(currentNode);
      if (currentLinks === -1) {
        console.log("Something went wrong while querying the API");
        return -1;
      }

      if (currentLinks) {
        for (let i = 0; i < currentLinks.length; i++) {
          if (
            currentLinks[i].title.toUpperCase() === searchValue.toUpperCase()
          ) {
            console.log("WOHHOOO", currentLinks[i].title, depth);
            process.send({ foundResult: currentLinks[i].title });
            return currentLinks[i];
          }
          depth += 1;
          queue.push(i);
        }
      }
      visitedNodes[currentNode] = true;
    }
  }
}

async function queryWikipediaAPI(searchTerm) {
  let url = new URL(
    "http://en.wikipedia.org/w/api.php?origin=*&action=query&titles=" +
      searchTerm +
      "&format=json&prop=links&pllimit=500"
  );
  const response = await fetch(url, {
    method: "GET",
    headers: { "User-Agent": "MY-UA-STRING" },
  });
  if (response.status !== 200) {
    console.log(response);
    console.log("Something went wrong bro, status code " + response.status);
    return -1;
  }
  const data = await response.json();
  if (data.query.pages) {
    for (page in data.query.pages) {
      return data.query.pages[page].links;
    }
  } else {
    return -1;
  }
}
