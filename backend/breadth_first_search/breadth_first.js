export default async function breadthFirstSearch(currentNode, searchValue) {
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
      "&format=json&prop=links&pllimit=500"
  );
  const response = await fetch(url, {
    method: "GET",
  });
  const data = await response.json();
  return data.query.pages;
}
