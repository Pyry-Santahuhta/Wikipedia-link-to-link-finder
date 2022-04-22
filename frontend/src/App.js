import React, { useState } from "react";
import "./App.css";
import Form from "./components/form";
import Waiting from "./components/waiting";
import Result from "./components/result";

function App() {
  let [result, setResult] = React.useState({});

  let handleResultChange = (result) => {
    setResult(result);
  };

  let renderElement = () => {
    if (!result) {
      return <Waiting />;
    } else if (result.time) {
      return <Result retry={handleResultChange} result={result} />;
    } else {
      return <Form onResultChange={handleResultChange} result={result} />;
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Wikipedia link finder</h1>
        <p>Find out if a Wikipedia page can be reached through links</p>
        {renderElement()}
      </header>
    </div>
  );
}

export default App;
