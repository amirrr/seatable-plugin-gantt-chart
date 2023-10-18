import React from "react";
import ReactDOM from "react-dom";
import App from "./app";
// import App2 from './app2';
import "./setting";
// import styles from "./index.css"
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

class TaskList {
  static execute() {
    ReactDOM.render(
      <App showDialog={true} isDevelopment={true} />,
      document.getElementById("root")
    );
  }
}

TaskList.execute();

const openBtn = document.getElementById("plugin-controller");
openBtn.addEventListener(
  "click",
  function () {
    TaskList.execute();
  },
  false
);

window.app = window.app ? window.app : {};
window.app.onClosePlugin = function () {};
