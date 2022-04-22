import React, { useState } from "react";

export const Result = (props) => {
  return (
    <div>
      <p>
        Starting from {props.result.start}, found {props.result.result} in{" "}
        {props.result.time} seconds, it was found from {props.result.lastLink}
      </p>
      <button
        onClick={() => {
          props.retry({});
        }}
      >
        Retry
      </button>
    </div>
  );
};

export default Result;
