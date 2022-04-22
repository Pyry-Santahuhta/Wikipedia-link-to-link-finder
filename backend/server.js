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

  const app = express();

  //Api for the frontend
  app.get("/api/:pageone/:pagetwo", async function (req, res) {
    console.log("Starting search to " + req.params.pagetwo + "...");
    //Get the links of the first page the user gave
    const links = await fetchLinks(req.params.pageone);
    //Start the timer
    startTime = new Date();
    //Solve the trivial case of the pages being linked
    for (let i = 0; i < links.length; i++) {
      if (links[i].toUpperCase() == req.params.pagetwo.toUpperCase()) {
        //stop the timer
        endTime = new Date();
        var timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;

        //Respond with the result and time and the link it was found from
        res.send({
          start: req.params.pageone,
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
        //stop the timer
        endTime = new Date();
        let timeDiff = endTime - startTime; //in ms
        timeDiff /= 1000;
        //Kill workers since they aren't needed anymore
        for (let id in cluster.workers) {
          cluster.workers[id].kill();
        }
        //Respond with the result and time and the link it was found from
        res.send({
          start: req.params.pageone,
          result: msg.foundResult,
          time: timeDiff,
          lastLink: msg.lastLink,
        });
      }
    }
    //Inspiration for splitting array
    //https://stackoverflow.com/questions/8188548/splitting-a-js-array-into-n-arrays/51514813#51514813
    if (links.length > 0) {
      //Fork as many workers as there are cores
      for (let i = 0; i < numCPUs; i++) {
        worker = cluster.fork();
        worker.on("message", messageFromWorker);
      }
      const workerChunks = [];

      //Split the list of links to chunks for the workers to handle
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
    } else {
      //The first page yielded no links, so respond with not found.
      res.send({ notFound: true });
    }

    //On worker exit check if all workers have exited, if so, respond with notFound
    cluster.on("exit", (worker, code, signal) => {
      for (let id in cluster.workers) {
        if (!cluster.workers[id].isDead()) {
          break;
        }
        res.send({ notFound: true });
      }
    });
  });

  //Listen for frontend requests
  app.listen(port, () => {
    console.log(`App listening on port ${port}`);
  });

  //Worker branch
} else {
  console.log(`Worker ${process.pid} started`);

  //Receive lists and searchvalues from master
  process.on("message", function messageFromMaster(msg) {
    if (msg.searchValue && msg.list) {
      var searchValue = msg.searchValue;
      breadthFirstSearch(msg.list, searchValue);
    }
  });
}

//BFS inspiration:
//https://www.algorithms-and-technologies.com/bfs/javascript
async function breadthFirstSearch(startLinks, searchValue) {
  //A Queue to manage the nodes that have yet to be visited
  var queue = [];
  //A boolean array indicating whether we have already visited a node
  var visited = [];
  //Keeping the distances (might not be necessary depending on your use case)
  //Adding the nodes to start from
  for (let i = 0; i < startLinks.length; i++) {
    queue.push(startLinks[i]);
    visited[startLinks[i]] = true;
  }
  //While there are nodes left to visit...
  while (queue.length > 0) {
    var node = queue.shift();

    //Fetch the links of the current node
    var currentLinks = await fetchLinks(node);
    if (currentLinks) {
      //Iterate through the links of the current node
      for (const currentLink of currentLinks) {
        //If any of the links match the searchvalue, send message to master
        if (currentLink.toUpperCase() === searchValue.toUpperCase()) {
          process.send({ foundResult: currentLink, lastLink: node });
          return currentLink;
        }
        //If the currentlink isn't visited, mark it as visited
        //Push it to the queue to be fetched for its links later
        if (!visited[currentLink]) {
          visited[currentLink] = true;
          queue.push(currentLink);
        }
      }
    }
  }
  //Queue empty, kill the process
  console.log("No more links in queue, exiting process: " + process.pid);
  process.kill(process.pid);
}

async function queryWikipediaAPI(searchTerm) {
  //URL for wikipedia requests
  let url = new URL(
    "http://en.wikipedia.org/w/api.php?origin=*&action=query&titles=" +
      searchTerm +
      "&format=json&prop=links&pllimit=max"
  );
  //Get from the wikipedia api
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "User-Agent": "Wikipedia link to link finder",
    },
  });
  //Log error
  if (response.status !== 200) {
    console.log("Something went wrong, status code " + response.status);
    return null;
  }
  //Return data as json
  return await response.json();
}

async function fetchLinks(searchTerm) {
  //Fetch data using the queryWikipediaAPI
  var data = await queryWikipediaAPI(searchTerm);
  var resultLinks = [];

  //Extract links from the JSON hierarchy.
  if (data.query.pages) {
    const links = Object.values(data.query.pages)[0].links;
    if (links instanceof Array) {
      for (const link of links) {
        //Only use namespace 0
        if (link.ns == 0) {
          resultLinks.push(link.title);
        }
      }
    }
    //If the links data contains continue, there are more links for the topic. Query for the rest in the while loop
    while (data.continue) {
      searchTerm += "&plcontinue=" + data.continue.plcontinue;
      var data = await queryWikipediaAPI(searchTerm);
      //Extract links from the JSON hierarchy.
      if (data.query.pages) {
        const links = Object.values(data.query.pages)[0].links;
        if (links instanceof Array) {
          for (const link of links) {
            //Only use namespace 0
            if (link.ns == 0) {
              resultLinks.push(link.title);
            }
          }
        }
      }
    }
    return resultLinks;
  }
  return [];
}
