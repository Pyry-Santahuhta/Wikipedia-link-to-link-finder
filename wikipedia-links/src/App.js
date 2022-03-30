import React from "react";
import "./App.css";

function App() {
  const [pageOne, onChangePageOne] = React.useState("");
  const [pageTwo, onChangePageTwo] = React.useState("");

  return (
    <div className="App">
      <header className="App-header">
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
        <button>Search!</button>
      </header>
    </div>
  );
}

export default App;
