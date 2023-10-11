import React from "react";
import PropTypes from "prop-types";
import { Modal, ModalHeader, ModalBody } from "reactstrap";
import DTable from "dtable-sdk";
import intl from "react-intl-universal";
import { getStartEndDateForProject, initTasks } from "./helper";
import "./locale/index.js";

import "./assets/css/plugin-layout.css";

import "./assets/css/app.css";

import {
  Gantt,
  Task,
  EventOption,
  StylingOption,
  ViewMode,
  DisplayOption,
} from "gantt-task-react";
import "gantt-task-react/dist/index.css";

const propTypes = {
  isDevelopment: PropTypes.bool,
  showDialog: PropTypes.bool,
  row: PropTypes.object, // If the plugin is opened with a button, it will have a row parameter
};

class App extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      showDialog: props.showDialog || false,
      tasks: initTasks(),
    };
    this.dtable = new DTable();
  }

  componentDidMount() {
    this.initPluginDTableData();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({ showDialog: nextProps.showDialog });
  }

  componentWillUnmount() {
    this.unsubscribeLocalDtableChanged();
    this.unsubscribeRemoteDtableChanged();
  }

  async initPluginDTableData() {
    const { isDevelopment } = this.props;
    if (isDevelopment) {
      // local develop
      await this.dtable.init(window.dtablePluginConfig);
      await this.dtable.syncWithServer();
      this.dtable.subscribe("dtable-connect", () => {
        this.onDTableConnect();
      });
    } else {
      // integrated to dtable app
      this.dtable.initInBrowser(window.app.dtableStore);
    }
    this.unsubscribeLocalDtableChanged = this.dtable.subscribe(
      "local-dtable-changed",
      () => {
        this.onDTableChanged();
      }
    );
    this.unsubscribeRemoteDtableChanged = this.dtable.subscribe(
      "remote-dtable-changed",
      () => {
        this.onDTableChanged();
      }
    );
    this.resetData();
  }

  onDTableConnect = () => {
    this.resetData();
  };

  onDTableChanged = () => {
    this.resetData();
  };

  resetData = () => {
    this.setState({ isLoading: false });
  };

  onPluginToggle = () => {
    this.setState({ showDialog: false });
    window.app.onClosePlugin();
  };

  handleExpanderClick = (task) => {
    this.setState({ tasks: tasks.map((t) => (t.id === task.id ? task : t)) });
    console.log("On expander click Id:" + task.id);
  };

  render() {
    let { isLoading, showDialog, tasks } = this.state;
    if (isLoading) {
      return "";
    }

    let subtables = this.dtable.getTables();
    let collaborators = this.dtable.getRelatedUsers();

    return (
      <div className="dtable-plugin plugin-timeline">
        <Modal
          isOpen={showDialog}
          toggle={this.onPluginToggle}
          className="dtable-plugin plugin-container"
          size="lg"
        >
          {console.log(subtables)}
          <ModalHeader className="plugin-header" toggle={this.onPluginToggle}>
            {"Plugin"}
          </ModalHeader>
          <ModalBody className="test-plugin-content">
            <Gantt
              tasks={tasks}
              onExpanderClick={this.handleExpanderClick}
              listCellWidth={"155px"}
              columnWidth={30}
              barBackgroundColor="blue"
              rowHeight={40}
              fontSize={12}
            />
            <div>{`'dtable-subtables: '${JSON.stringify(subtables)}`}</div>
            <br></br>
            <div>{`'dtable-collaborators: '${JSON.stringify(
              collaborators
            )}`}</div>
          </ModalBody>
        </Modal>
      </div>
    );

    // return (
    //   <div
    //     className="dtable-plugin plugin-timeline"
    //     ref={(ref) => (this.plugin = ref)}
    //     onClick={this.onTimelineClick}
    //   >
    //     <div className="plugin-header">
    //       <div className="plugin-logo">
    //         <img className="plugin-logo-icon" src="" alt="timeline" />
    //         <span>hee</span>
    //       </div>

    //       <div className="timeline-operators">
    //         <span className="timeline-operator dtable-font dtable-icon-download btn-export-image">
    //           D
    //         </span>
    //         <span className="timeline-operator dtable-font dtable-icon-set-up btn-settings">
    //           S
    //         </span>
    //         <span className="timeline-operator dtable-font dtable-icon-x btn-close">
    //           X
    //         </span>
    //       </div>
    //     </div>

    //     <h1 className="text-3xl font-bold underline">Hello world!</h1>
    //   </div>
    // );
  }
}

App.propTypes = propTypes;

export default App;
