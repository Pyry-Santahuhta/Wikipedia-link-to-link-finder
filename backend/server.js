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
  //;
  console.log(`Number of CPUs is ${numCPUs}`);
  console.log(`Master ${process.pid} is running`);

  const app = express();

  app.get("/", (req, res) => {
    res.send("Hello World!");
  });

  //
  app.get("/api/:pageone/:pagetwo", async function (req, res) {
    //Get the links of the first page the user gave
    console.log("Starting search to " + req.params.pagetwo + "...");
    const links = await fetchLinks(req.params.pageone);
    startTime = new Date();
    //Solve the trivial case of the pages being linked
    for (let i = 0; i < links.length; i++) {
      if (links[i].toUpperCase() == req.params.pagetwo.toUpperCase()) {
        endTime = new Date();
        var timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;
        res.send({
          result: links[i],
          time: timeDiff,
          lastLink: req.params.pageone,
        });
        return;
      }
    }
    // Receive messages from workers
    function messageFromWorker(msg) {
      if (msg.foundResult) {
        endTime = new Date();
        let timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;
        res.send({
          result: msg.foundResult,
          time: timeDiff,
          lastLink: msg.lastLink,
        });
        for (let id in cluster.workers) {
          cluster.workers[id].kill();
        }
      }
    }
    //Fork as many workers as there are cores
    for (let i = 0; i < numCPUs; i++) {
      worker = cluster.fork();
      worker.on("message", messageFromWorker);
    }
    //Split the list of links to chunks for the workers to handle
    const workerChunks = [];
    for (let i = numCPUs; i > 0; i--) {
      workerChunks.push(links.splice(0, Math.ceil(links.length / i)));
    }
    //Send a chunk of the links and the searchterm to each worker
    let i = 0;
    for (const id in cluster.workers) {
      cluster.workers[id].send({
        searchValue: req.params.pagetwo,
        list: workerChunks[i],
      });
      i += 1;
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
  //A Queue to manage the nodes that have yet to be visited
  var queue = [];
  //A boolean array indicating whether we have already visited a node
  var visited = [];
  //(The start node is already visited)
  // Keeping the distances (might not be necessary depending on your use case)
  //Adding the nodes to start from
  for (let i = 0; i < startLinks.length; i++) {
    queue.push(startLinks[i]);
    visited[startLinks[i]] = true;
  }
  //While there are nodes left to visit...
  while (queue.length > 0) {
    var node = queue.shift();

    var currentLinks = await fetchLinks(node);
    if (currentLinks) {
      for (const currentLink of currentLinks) {
        if (currentLink.toUpperCase() === searchValue.toUpperCase()) {
          process.send({ foundResult: currentLink, lastLink: node });
          return currentLink;
        }
        if (!visited[currentLink]) {
          visited[currentLink] = true;
          queue.push(currentLink);
        }
      }
    }
  }
  console.log("No more links in queue, exiting");
  process.kill;
  return 0;
}

async function queryWikipediaAPI(url) {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:47.0) Gecko/20100101 Firefox/47.0",
    },
  });
  if (response.status !== 200) {
    console.log("Something went wrong bro, status code " + response.status);
    return null;
  }
  return await response.json();
}

async function fetchLinks(searchTerm) {
  let url = new URL(
    "http://en.wikipedia.org/w/api.php?origin=*&action=query&titles=" +
      searchTerm +
      "&format=json&prop=links&pllimit=max"
  );

  var data = await queryWikipediaAPI(url);
  var resultLinks = [];
  if (data.query.pages) {
    const links = Object.values(data.query.pages)[0].links;
    if (links instanceof Array) {
      for (const link of links) {
        if (link.ns == 0) {
          resultLinks.push(link.title);
        }
      }
    }
    if (data.continue) {
      url += "&plcontinue=" + data["continue"]["plcontinue"];
      var data = await queryWikipediaAPI(url);
      var resultLinks = [];
      if (data.query.pages) {
        const links = Object.values(data.query.pages)[0].links;
        if (links instanceof Array) {
          for (const link of links) {
            if (link.ns == 0) {
              resultLinks.push(link.title);
            }
          }
        }
      }
    }
    return resultLinks;
  }
  return -1;
}
