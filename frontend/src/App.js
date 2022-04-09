import React from "react";
import "./App.css";
import breadthFirstSearch from "./breadth_first_search/breadth_first";
function App() {
  const [pageOne, onChangePageOne] = React.useState("");
  const [pageTwo, onChangePageTwo] = React.useState("");
  return (
    <div className="App">
      <header className="App-header">
        <h1>Wikipedia link finder</h1>
        <p>Find out how many links there are</p>
        <p>From</p>
        <input
          type="text"
          value={pageOne}
          onChange={(e) => onChangePageOne(e.target.value)}
        ></input>
        <p>To</p>
        <input
          type="text"
          value={pageTwo}
          onChange={(e) => onChangePageTwo(e.target.value)}
        ></input>
        <button
          onClick={() => {
            let url = "/api/" + pageOne + "/" + pageTwo;
            console.log(url);
            await fetch(url);
          }}
        >
          Search!
        </button>
      </header>
    </div>
  );
}

export default App;
