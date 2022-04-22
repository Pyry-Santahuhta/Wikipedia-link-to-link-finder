import React, { useState } from "react";

export const Form = (props) => {
  const [pageOne, onChangePageOne] = React.useState("");
  const [pageTwo, onChangePageTwo] = React.useState("");
  let [result, setResult] = React.useState();
  return (
    <div>
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
        onClick={async () => {
          if (pageOne && pageTwo) {
            let url = "/api/" + pageOne + "/" + pageTwo;
            props.onResultChange(false);
            let data = await fetch(url);
            result = await data.json();
            props.onResultChange(result);
          }
        }}
      >
        Search!
      </button>
    </div>
  );
};

export default Form;
