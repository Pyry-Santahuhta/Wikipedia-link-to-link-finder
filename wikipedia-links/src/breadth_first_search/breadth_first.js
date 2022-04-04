export default function breadthFirstSearch(rootNode, searchValue) {
  let queue = [];
  console.log(queryWikipediaAPI(rootNode));
  queue.push(rootNode);
  /*while (queue.length > 0) {
    let currentNode = queue[0];
  }*/
}

async function queryWikipediaAPI(searchTerm) {
  let url = new URL(
    "https://en.wikipedia.org/w/api.php?action=query&titles=" +
      searchTerm +
      "&format=json&prop=links&pllimit=500"
  );
  const response = await fetch(url, {
    method: "GET",
    mode: "no-cors",
  });
  return response;
}
